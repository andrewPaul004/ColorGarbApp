using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ColorGarbApi.Services;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Messages controller handling order-specific communication between clients and ColorGarb staff.
/// Provides secure access to message threads with organization isolation and file attachment support.
/// </summary>
[ApiController]
[Route("api/orders/{orderId:guid}/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly ILogger<MessagesController> _logger;

    public MessagesController(IMessageService messageService, ILogger<MessagesController> logger)
    {
        _messageService = messageService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves messages for a specific order with pagination and search capabilities.
    /// Users can only access messages for orders within their organization.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="searchTerm">Optional search term to filter message content and attachments</param>
    /// <param name="messageType">Optional filter by message type (General, Question, Update, Urgent)</param>
    /// <param name="senderRole">Optional filter by sender role (Client, ColorGarbStaff, All)</param>
    /// <param name="dateFrom">Optional filter for messages from this date (ISO format)</param>
    /// <param name="dateTo">Optional filter for messages to this date (ISO format)</param>
    /// <param name="includeAttachments">Optional filter for messages with/without attachments</param>
    /// <param name="page">Page number for pagination (default: 1)</param>
    /// <param name="pageSize">Number of messages per page (default: 50, max: 100)</param>
    /// <returns>Paginated list of messages with search and filter results</returns>
    /// <response code="200">Successfully retrieved messages</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to this order</response>
    /// <response code="404">Order not found</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet]
    [ProducesResponseType(typeof(MessageSearchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOrderMessages(
        Guid orderId,
        [FromQuery] string? searchTerm = null,
        [FromQuery] string? messageType = null,
        [FromQuery] string? senderRole = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] bool? includeAttachments = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var userId = GetUserId();
            
            // Validate user access to order
            if (!await _messageService.ValidateUserOrderAccessAsync(userId, orderId))
            {
                _logger.LogWarning("User {UserId} attempted to access messages for order {OrderId} without permission", 
                    userId, orderId);
                return Forbid("Access denied to this order");
            }

            // Create search request
            var searchRequest = new MessageSearchRequest
            {
                OrderId = orderId,
                SearchTerm = searchTerm,
                MessageType = messageType,
                SenderRole = senderRole,
                DateFrom = dateFrom,
                DateTo = dateTo,
                IncludeAttachments = includeAttachments,
                Page = page,
                PageSize = pageSize
            };

            // Get messages
            var result = await _messageService.GetOrderMessagesAsync(orderId, searchRequest);

            // Convert to DTOs
            var messageDtos = result.Messages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = m.SenderName,
                SenderRole = m.SenderRole,
                RecipientRole = m.RecipientRole,
                Content = m.Content,
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                ReadAt = m.ReadAt,
                ReplyToMessageId = m.ReplyToMessageId,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                AttachmentCount = m.Attachments?.Count() ?? 0,
                Attachments = m.Attachments?.Select(a => new MessageAttachmentDto
                {
                    Id = a.Id,
                    OriginalFileName = a.OriginalFileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    UploadedAt = a.UploadedAt,
                    UploadedByName = a.UploadedByUser?.Name ?? "Unknown User"
                }).ToList() ?? new List<MessageAttachmentDto>()
            }).ToList();

            var response = new MessageSearchResponse
            {
                Messages = messageDtos,
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
                UnreadCount = await _messageService.GetUnreadMessageCountAsync(orderId, userId)
            };

            _logger.LogInformation("Retrieved {Count} messages for order {OrderId} by user {UserId}", 
                messageDtos.Count, orderId, userId);

            return Ok(response);
        }
        catch (MessageAccessDeniedException)
        {
            return Forbid("Access denied to this order");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving messages for order {OrderId} by user {UserId}", orderId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving messages" });
        }
    }

    /// <summary>
    /// Sends a new message to an order thread with optional file attachments.
    /// Creates audit trail and handles role-based message routing.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="request">Message content and metadata</param>
    /// <returns>Created message information</returns>
    /// <response code="201">Message sent successfully</response>
    /// <response code="400">Invalid request data or validation failure</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to this order</response>
    /// <response code="404">Order not found</response>
    /// <response code="413">File attachments too large</response>
    /// <response code="500">Server error occurred</response>
    [HttpPost]
    [ProducesResponseType(typeof(MessageCreationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SendMessage(Guid orderId, [FromForm] SendMessageRequest request)
    {
        try
        {
            // Validate request
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Message content is required" });
            }

            if (request.Content.Length > 5000)
            {
                return BadRequest(new { message = "Message content cannot exceed 5000 characters" });
            }

            var userId = GetUserId();

            // Send message
            var result = await _messageService.SendMessageAsync(
                orderId,
                userId,
                request.Content.Trim(),
                request.MessageType ?? "General",
                request.RecipientRole ?? "All",
                request.ReplyToMessageId,
                request.Attachments?.ToList());

            if (!result.Success)
            {
                if (result.AttachmentErrors.Any())
                {
                    return BadRequest(new 
                    { 
                        message = result.ErrorMessage ?? "Message sending failed",
                        attachmentErrors = result.AttachmentErrors
                    });
                }
                
                return BadRequest(new { message = result.ErrorMessage ?? "Message sending failed" });
            }

            // Convert to DTO
            var messageDto = new MessageDto
            {
                Id = result.Message.Id,
                SenderId = result.Message.SenderId,
                SenderName = result.Message.SenderName,
                SenderRole = result.Message.SenderRole,
                RecipientRole = result.Message.RecipientRole,
                Content = result.Message.Content,
                MessageType = result.Message.MessageType,
                IsRead = result.Message.IsRead,
                ReadAt = result.Message.ReadAt,
                ReplyToMessageId = result.Message.ReplyToMessageId,
                CreatedAt = result.Message.CreatedAt,
                UpdatedAt = result.Message.UpdatedAt,
                AttachmentCount = result.Attachments.Count(),
                Attachments = result.Attachments.Select(a => new MessageAttachmentDto
                {
                    Id = a.Id,
                    OriginalFileName = a.OriginalFileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    UploadedAt = a.UploadedAt,
                    UploadedByName = a.UploadedByUser?.Name ?? "Unknown User"
                }).ToList()
            };

            var response = new MessageCreationResponse
            {
                Message = messageDto,
                AttachmentWarnings = result.AttachmentErrors
            };

            _logger.LogInformation("Message {MessageId} sent for order {OrderId} by user {UserId}", 
                result.Message.Id, orderId, userId);

            return CreatedAtAction(nameof(GetMessage), new { orderId, messageId = result.Message.Id }, response);
        }
        catch (MessageAccessDeniedException)
        {
            return Forbid("Access denied to this order");
        }
        catch (MessageNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (AttachmentValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message for order {OrderId} by user {UserId}", orderId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while sending the message" });
        }
    }

    /// <summary>
    /// Retrieves a specific message by ID with access control validation.
    /// Includes full message details and attachment information.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <returns>Message details with attachments</returns>
    /// <response code="200">Message retrieved successfully</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to this message</response>
    /// <response code="404">Message or order not found</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet("{messageId:guid}")]
    [ProducesResponseType(typeof(MessageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetMessage(Guid orderId, Guid messageId)
    {
        try
        {
            var userId = GetUserId();
            var message = await _messageService.GetMessageByIdAsync(messageId, userId);

            if (message == null)
            {
                return NotFound(new { message = "Message not found" });
            }

            // Ensure message belongs to the specified order
            if (message.OrderId != orderId)
            {
                return BadRequest(new { message = "Message does not belong to the specified order" });
            }

            var messageDto = new MessageDto
            {
                Id = message.Id,
                SenderId = message.SenderId,
                SenderName = message.SenderName,
                SenderRole = message.SenderRole,
                RecipientRole = message.RecipientRole,
                Content = message.Content,
                MessageType = message.MessageType,
                IsRead = message.IsRead,
                ReadAt = message.ReadAt,
                ReplyToMessageId = message.ReplyToMessageId,
                CreatedAt = message.CreatedAt,
                UpdatedAt = message.UpdatedAt,
                AttachmentCount = message.Attachments?.Count() ?? 0,
                Attachments = message.Attachments?.Select(a => new MessageAttachmentDto
                {
                    Id = a.Id,
                    OriginalFileName = a.OriginalFileName,
                    FileSize = a.FileSize,
                    ContentType = a.ContentType,
                    UploadedAt = a.UploadedAt,
                    UploadedByName = a.UploadedByUser?.Name ?? "Unknown User"
                }).ToList() ?? new List<MessageAttachmentDto>()
            };

            return Ok(messageDto);
        }
        catch (MessageAccessDeniedException)
        {
            return Forbid("Access denied to this message");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving message {MessageId} for order {OrderId} by user {UserId}", 
                messageId, orderId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving the message" });
        }
    }

    /// <summary>
    /// Marks a specific message as read by the current user.
    /// Updates read status and timestamp for audit purposes.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <returns>No content on success</returns>
    /// <response code="204">Message marked as read successfully</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to this message</response>
    /// <response code="404">Message or order not found</response>
    /// <response code="500">Server error occurred</response>
    [HttpPut("{messageId:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> MarkMessageAsRead(Guid orderId, Guid messageId)
    {
        try
        {
            var userId = GetUserId();
            var success = await _messageService.MarkMessageAsReadAsync(messageId, userId);

            if (!success)
            {
                return NotFound(new { message = "Message not found or access denied" });
            }

            _logger.LogDebug("Message {MessageId} marked as read by user {UserId}", messageId, userId);
            return NoContent();
        }
        catch (MessageAccessDeniedException)
        {
            return Forbid("Access denied to this message");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking message {MessageId} as read by user {UserId}", messageId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while marking the message as read" });
        }
    }

    /// <summary>
    /// Marks multiple messages as read by the current user in a single operation.
    /// Useful for bulk operations when catching up on message threads.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="request">List of message IDs to mark as read</param>
    /// <returns>Number of messages successfully marked as read</returns>
    /// <response code="200">Messages marked as read successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to some messages</response>
    /// <response code="500">Server error occurred</response>
    [HttpPut("mark-read")]
    [ProducesResponseType(typeof(BulkReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> MarkMessagesAsRead(Guid orderId, [FromBody] BulkReadRequest request)
    {
        try
        {
            if (request.MessageIds == null || !request.MessageIds.Any())
            {
                return BadRequest(new { message = "At least one message ID is required" });
            }

            var userId = GetUserId();
            var markedCount = await _messageService.MarkMessagesAsReadAsync(request.MessageIds, userId);

            var response = new BulkReadResponse
            {
                MarkedAsReadCount = markedCount,
                TotalRequested = request.MessageIds.Count()
            };

            _logger.LogInformation("Marked {Count} out of {Total} messages as read for user {UserId}", 
                markedCount, request.MessageIds.Count(), userId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking multiple messages as read by user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while marking messages as read" });
        }
    }

    /// <summary>
    /// Downloads a specific message attachment with security validation.
    /// Validates user access to the message and attachment before serving the file.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <param name="attachmentId">Unique identifier of the attachment</param>
    /// <returns>File stream with appropriate content headers</returns>
    /// <response code="200">File download initiated successfully</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks access to this attachment</response>
    /// <response code="404">Attachment, message, or order not found</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet("{messageId:guid}/attachments/{attachmentId:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DownloadAttachment(Guid orderId, Guid messageId, Guid attachmentId)
    {
        try
        {
            var userId = GetUserId();
            var downloadResult = await _messageService.DownloadAttachmentAsync(attachmentId, userId);

            if (downloadResult == null)
            {
                return NotFound(new { message = "Attachment not found or access denied" });
            }

            _logger.LogInformation("User {UserId} downloading attachment {AttachmentId} from message {MessageId}", 
                userId, attachmentId, messageId);

            return File(
                downloadResult.FileStream, 
                downloadResult.ContentType, 
                downloadResult.FileName);
        }
        catch (MessageAccessDeniedException)
        {
            return Forbid("Access denied to this attachment");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading attachment {AttachmentId} by user {UserId}", attachmentId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while downloading the attachment" });
        }
    }

    /// <summary>
    /// Gets the current user's ID from JWT claims
    /// </summary>
    /// <returns>User ID GUID</returns>
    private Guid GetUserId()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (Guid.TryParse(userIdString, out var userId))
        {
            return userId;
        }
        throw new InvalidOperationException("Invalid user ID in token claims");
    }

    /// <summary>
    /// Gets the current user's role from JWT claims
    /// </summary>
    /// <returns>User role string</returns>
    private string GetUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
}

// Data Transfer Objects

/// <summary>
/// Request object for sending a new message with optional attachments.
/// </summary>
public class SendMessageRequest
{
    /// <summary>
    /// Content of the message (required, max 5000 characters)
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Type of message (General, Question, Update, Urgent). Defaults to General.
    /// </summary>
    public string? MessageType { get; set; }

    /// <summary>
    /// Target recipient role (Client, ColorGarbStaff, All). Defaults to All.
    /// </summary>
    public string? RecipientRole { get; set; }

    /// <summary>
    /// Optional ID of message being replied to
    /// </summary>
    public Guid? ReplyToMessageId { get; set; }

    /// <summary>
    /// Optional file attachments (max 5 files, 10MB each)
    /// </summary>
    public IFormFile[]? Attachments { get; set; }
}

/// <summary>
/// Request object for marking multiple messages as read.
/// </summary>
public class BulkReadRequest
{
    /// <summary>
    /// List of message IDs to mark as read
    /// </summary>
    public IEnumerable<Guid> MessageIds { get; set; } = Enumerable.Empty<Guid>();
}

/// <summary>
/// Response object for message search and retrieval operations.
/// </summary>
public class MessageSearchResponse
{
    /// <summary>
    /// Messages matching the search criteria for current page
    /// </summary>
    public List<MessageDto> Messages { get; set; } = new();

    /// <summary>
    /// Total number of messages matching search criteria (before pagination)
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of messages per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Whether there are more pages available
    /// </summary>
    public bool HasNextPage { get; set; }

    /// <summary>
    /// Number of unread messages for the current user in this order
    /// </summary>
    public int UnreadCount { get; set; }
}

/// <summary>
/// Response object for successful message creation.
/// </summary>
public class MessageCreationResponse
{
    /// <summary>
    /// The created message
    /// </summary>
    public MessageDto Message { get; set; } = null!;

    /// <summary>
    /// Any warnings about attachment processing
    /// </summary>
    public Dictionary<string, string> AttachmentWarnings { get; set; } = new();
}

/// <summary>
/// Response object for bulk read operations.
/// </summary>
public class BulkReadResponse
{
    /// <summary>
    /// Number of messages successfully marked as read
    /// </summary>
    public int MarkedAsReadCount { get; set; }

    /// <summary>
    /// Total number of messages requested to be marked as read
    /// </summary>
    public int TotalRequested { get; set; }
}

/// <summary>
/// Data transfer object for message information in API responses.
/// </summary>
public class MessageDto
{
    /// <summary>
    /// Unique identifier for the message
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ID of the user who sent this message
    /// </summary>
    public Guid SenderId { get; set; }

    /// <summary>
    /// Display name of the message sender
    /// </summary>
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// Role of the message sender
    /// </summary>
    public string SenderRole { get; set; } = string.Empty;

    /// <summary>
    /// Intended recipient role for the message
    /// </summary>
    public string RecipientRole { get; set; } = string.Empty;

    /// <summary>
    /// Content of the message
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Type/category of the message
    /// </summary>
    public string MessageType { get; set; } = string.Empty;

    /// <summary>
    /// Whether the message has been read
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Timestamp when the message was marked as read
    /// </summary>
    public DateTime? ReadAt { get; set; }

    /// <summary>
    /// ID of the message this is a reply to (if applicable)
    /// </summary>
    public Guid? ReplyToMessageId { get; set; }

    /// <summary>
    /// When this message was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When this message was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Number of attachments on this message
    /// </summary>
    public int AttachmentCount { get; set; }

    /// <summary>
    /// List of message attachments
    /// </summary>
    public List<MessageAttachmentDto> Attachments { get; set; } = new();
}

/// <summary>
/// Data transfer object for message attachment information.
/// </summary>
public class MessageAttachmentDto
{
    /// <summary>
    /// Unique identifier for the attachment
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Original filename as uploaded by the user
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Size of the file in bytes
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// MIME type of the file
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// When this attachment was uploaded
    /// </summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>
    /// Name of the user who uploaded this attachment
    /// </summary>
    public string UploadedByName { get; set; } = string.Empty;
}