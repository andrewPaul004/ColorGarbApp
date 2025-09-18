using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ColorGarbApi.Services;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Admin Messages controller for unified message inbox across all orders.
/// Provides ColorGarb staff with centralized access to all client messages.
/// </summary>
[ApiController]
[Route("api/admin/messages")]
[Authorize]
public class AdminMessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly ILogger<AdminMessagesController> _logger;

    public AdminMessagesController(IMessageService messageService, ILogger<AdminMessagesController> logger)
    {
        _messageService = messageService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all messages across all orders for admin users with pagination and search capabilities.
    /// Only accessible by users with ColorGarbStaff role for unified inbox functionality.
    /// </summary>
    /// <param name="searchTerm">Optional search term to filter message content</param>
    /// <param name="clientName">Optional filter by client name</param>
    /// <param name="organizationId">Optional filter by organization</param>
    /// <param name="orderNumber">Optional filter by order number</param>
    /// <param name="messageType">Optional filter by message type (General, Question, Update, Urgent)</param>
    /// <param name="senderRole">Optional filter by sender role (Client, ColorGarbStaff)</param>
    /// <param name="dateFrom">Optional filter for messages from this date (ISO format)</param>
    /// <param name="dateTo">Optional filter for messages to this date (ISO format)</param>
    /// <param name="includeAttachments">Optional filter for messages with/without attachments</param>
    /// <param name="unreadOnly">Optional filter for unread messages only</param>
    /// <param name="page">Page number for pagination (default: 1)</param>
    /// <param name="pageSize">Number of messages per page (default: 50, max: 100)</param>
    /// <returns>Paginated list of messages across all orders with organization and order context</returns>
    /// <response code="200">Successfully retrieved admin messages</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks ColorGarbStaff role access</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet]
    [ProducesResponseType(typeof(AdminMessageSearchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAllMessages(
        [FromQuery] string? searchTerm = null,
        [FromQuery] string? clientName = null,
        [FromQuery] Guid? organizationId = null,
        [FromQuery] string? orderNumber = null,
        [FromQuery] string? messageType = null,
        [FromQuery] string? senderRole = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] bool? includeAttachments = null,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var userId = GetUserId();

            // Create search request
            var searchRequest = new AdminMessageSearchRequest
            {
                SearchTerm = searchTerm,
                ClientName = clientName,
                OrganizationId = organizationId,
                OrderNumber = orderNumber,
                MessageType = messageType,
                SenderRole = senderRole,
                DateFrom = dateFrom,
                DateTo = dateTo,
                IncludeAttachments = includeAttachments,
                UnreadOnly = unreadOnly,
                Page = page,
                PageSize = pageSize
            };

            // Get messages
            var result = await _messageService.GetAllMessagesForAdminAsync(searchRequest, userId);

            // Convert to DTOs
            var messageDtos = result.Messages.Select(m => new AdminMessageDto
            {
                Id = m.Id,
                OrderId = m.OrderId,
                OrderNumber = m.OrderNumber,
                OrderDescription = m.OrderDescription,
                OrganizationName = m.OrganizationName,
                SenderId = m.SenderId,
                SenderName = m.SenderName,
                SenderRole = m.SenderRole,
                RecipientRole = m.RecipientRole,
                Content = m.Content,
                ContentPreview = m.ContentPreview,
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                ReadAt = m.ReadAt,
                ReplyToMessageId = m.ReplyToMessageId,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                AttachmentCount = m.AttachmentCount,
                IsUrgent = m.IsUrgent
            }).ToList();

            var response = new AdminMessageSearchResponse
            {
                Messages = messageDtos,
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
                UnreadCount = result.UnreadCount
            };

            _logger.LogInformation("Retrieved {Count} admin messages for user {UserId} (page {Page}, total {Total})", 
                messageDtos.Count, userId, page, result.TotalCount);

            return Ok(response);
        }
        catch (MessageAccessDeniedException)
        {
            _logger.LogWarning("User {UserId} attempted to access admin messages without ColorGarbStaff role", GetUserId());
            return Forbid("Access denied. ColorGarb staff role required.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin messages for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving admin messages" });
        }
    }

    /// <summary>
    /// Gets the total count of unread messages across all orders for the current admin user.
    /// Used for displaying unread count badge in navigation.
    /// </summary>
    /// <returns>Total number of unread messages for the admin user</returns>
    /// <response code="200">Successfully retrieved unread count</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks ColorGarbStaff role access</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(AdminUnreadCountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUnreadCount()
    {
        try
        {
            var userId = GetUserId();
            var unreadCount = await _messageService.GetAdminUnreadMessageCountAsync(userId);

            var response = new AdminUnreadCountResponse
            {
                UnreadCount = unreadCount
            };

            _logger.LogDebug("Admin user {UserId} has {UnreadCount} unread messages", userId, unreadCount);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting admin unread count for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving unread count" });
        }
    }

    /// <summary>
    /// Marks multiple messages as read for the admin user.
    /// Supports bulk operations from the admin message inbox.
    /// </summary>
    /// <param name="request">List of message IDs to mark as read</param>
    /// <returns>Number of messages successfully marked as read</returns>
    /// <response code="200">Messages marked as read successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks ColorGarbStaff role access</response>
    /// <response code="500">Server error occurred</response>
    [HttpPut("mark-read")]
    [ProducesResponseType(typeof(AdminBulkReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> MarkMessagesAsRead([FromBody] AdminBulkReadRequest request)
    {
        try
        {
            if (request.MessageIds == null || !request.MessageIds.Any())
            {
                return BadRequest(new { message = "At least one message ID is required" });
            }

            var userId = GetUserId();
            var markedCount = await _messageService.MarkMessagesAsReadAsync(request.MessageIds, userId);

            var response = new AdminBulkReadResponse
            {
                MarkedAsReadCount = markedCount,
                TotalRequested = request.MessageIds.Count()
            };

            _logger.LogInformation("Marked {Count} out of {Total} admin messages as read for user {UserId}", 
                markedCount, request.MessageIds.Count(), userId);

            return Ok(response);
        }
        catch (MessageAccessDeniedException)
        {
            _logger.LogWarning("User {UserId} attempted to mark admin messages as read without ColorGarbStaff role", GetUserId());
            return Forbid("Access denied. ColorGarb staff role required.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking admin messages as read for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while marking messages as read" });
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
}

// Data Transfer Objects

/// <summary>
/// Response object for admin message search operations.
/// </summary>
public class AdminMessageSearchResponse
{
    /// <summary>
    /// Messages matching the search criteria for current page
    /// </summary>
    public List<AdminMessageDto> Messages { get; set; } = new();

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
    /// Total number of unread messages for the admin user across all orders
    /// </summary>
    public int UnreadCount { get; set; }
}

/// <summary>
/// Data transfer object for admin message information.
/// </summary>
public class AdminMessageDto
{
    /// <summary>
    /// Unique identifier for the message
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Order ID that this message belongs to
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Order number for display
    /// </summary>
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>
    /// Order description/title
    /// </summary>
    public string OrderDescription { get; set; } = string.Empty;

    /// <summary>
    /// Organization name
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;

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
    /// Message preview (first 100 characters)
    /// </summary>
    public string ContentPreview { get; set; } = string.Empty;

    /// <summary>
    /// Type/category of the message
    /// </summary>
    public string MessageType { get; set; } = string.Empty;

    /// <summary>
    /// Whether the message has been read by the current admin user
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Timestamp when the message was marked as read by the current admin user
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
    /// Whether this message is marked as urgent/priority
    /// </summary>
    public bool IsUrgent { get; set; }
}

/// <summary>
/// Response object for admin unread count request.
/// </summary>
public class AdminUnreadCountResponse
{
    /// <summary>
    /// Total number of unread messages for the admin user
    /// </summary>
    public int UnreadCount { get; set; }
}

/// <summary>
/// Request object for marking multiple admin messages as read.
/// </summary>
public class AdminBulkReadRequest
{
    /// <summary>
    /// List of message IDs to mark as read
    /// </summary>
    public IEnumerable<Guid> MessageIds { get; set; } = Enumerable.Empty<Guid>();
}

/// <summary>
/// Response object for bulk read operations on admin messages.
/// </summary>
public class AdminBulkReadResponse
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