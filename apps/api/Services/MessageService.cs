using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for message business logic operations.
/// Handles message creation, retrieval, search, and file attachment processing.
/// </summary>
public class MessageService : IMessageService
{
    private readonly IMessageRepository _messageRepository;
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<MessageService> _logger;

    // File validation constants
    private static readonly string[] AllowedContentTypes = 
    {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "text/csv"
    };

    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB
    private const int MaxAttachmentsPerMessage = 5;

    public MessageService(
        IMessageRepository messageRepository,
        ColorGarbDbContext context,
        ILogger<MessageService> logger)
    {
        _messageRepository = messageRepository;
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<MessageSearchResult> GetOrderMessagesAsync(Guid orderId, MessageSearchRequest searchRequest)
    {
        try
        {
            _logger.LogDebug("Getting messages for order {OrderId}", orderId);

            searchRequest.OrderId = orderId;
            var messages = await _messageRepository.SearchMessagesAsync(searchRequest);
            var totalCount = await _messageRepository.GetMessageCountAsync(orderId, searchRequest);

            var result = new MessageSearchResult
            {
                Messages = messages,
                TotalCount = totalCount,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize,
                HasNextPage = (searchRequest.Page * searchRequest.PageSize) < totalCount
            };

            _logger.LogDebug("Retrieved {Count} messages for order {OrderId}", messages.Count(), orderId);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting messages for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageResult> SendMessageAsync(
        Guid orderId, 
        Guid senderId, 
        string content, 
        string messageType = "General",
        string recipientRole = "All",
        Guid? replyToMessageId = null,
        List<IFormFile>? attachments = null)
    {
        try
        {
            _logger.LogInformation("Sending message for order {OrderId} from user {SenderId}", orderId, senderId);

            // Validate user access to order
            if (!await ValidateUserOrderAccessAsync(senderId, orderId))
            {
                throw new MessageAccessDeniedException($"User {senderId} does not have access to order {orderId}");
            }

            // Get sender information
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderId);
            if (sender == null)
            {
                throw new MessageNotFoundException($"Sender with ID {senderId} not found");
            }

            // Validate attachments
            var attachmentErrors = new Dictionary<string, string>();
            if (attachments != null && attachments.Any())
            {
                ValidateAttachments(attachments, attachmentErrors);
                if (attachmentErrors.Any())
                {
                    return new MessageResult
                    {
                        Success = false,
                        ErrorMessage = "Attachment validation failed",
                        AttachmentErrors = attachmentErrors
                    };
                }
            }

            // Create message
            var message = new Message
            {
                OrderId = orderId,
                SenderId = senderId,
                SenderRole = sender.Role.GetRoleString(),
                SenderName = sender.Name,
                RecipientRole = recipientRole,
                Content = content,
                MessageType = messageType,
                ReplyToMessageId = replyToMessageId
            };

            var createdMessage = await _messageRepository.CreateMessageAsync(message);

            // Process attachments
            var createdAttachments = new List<MessageAttachment>();
            if (attachments != null && attachments.Any())
            {
                foreach (var file in attachments)
                {
                    try
                    {
                        var attachment = await ProcessAttachmentAsync(createdMessage.Id, file, senderId);
                        createdAttachments.Add(attachment);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to process attachment {FileName} for message {MessageId}", 
                            file.FileName, createdMessage.Id);
                        attachmentErrors[file.FileName] = $"Upload failed: {ex.Message}";
                    }
                }
            }

            _logger.LogInformation("Successfully sent message {MessageId} for order {OrderId}", 
                createdMessage.Id, orderId);

            return new MessageResult
            {
                Message = createdMessage,
                Attachments = createdAttachments,
                Success = true,
                AttachmentErrors = attachmentErrors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Message?> GetMessageByIdAsync(Guid messageId, Guid userId)
    {
        try
        {
            var message = await _messageRepository.GetMessageByIdAsync(messageId);
            if (message == null)
            {
                return null;
            }

            // Validate user access to the order
            if (!await ValidateUserOrderAccessAsync(userId, message.OrderId))
            {
                throw new MessageAccessDeniedException($"User {userId} does not have access to message {messageId}");
            }

            return message;
        }
        catch (MessageAccessDeniedException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> MarkMessageAsReadAsync(Guid messageId, Guid userId)
    {
        try
        {
            var message = await GetMessageByIdAsync(messageId, userId);
            if (message == null)
            {
                return false;
            }

            if (!message.IsRead)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
                await _messageRepository.UpdateMessageAsync(message);
                
                _logger.LogDebug("Marked message {MessageId} as read by user {UserId}", messageId, userId);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking message {MessageId} as read", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> MarkMessagesAsReadAsync(IEnumerable<Guid> messageIds, Guid userId)
    {
        try
        {
            var messageIdsList = messageIds.ToList();
            var validMessageIds = new List<Guid>();

            // Validate user access to each message
            foreach (var messageId in messageIdsList)
            {
                try
                {
                    var message = await _messageRepository.GetMessageByIdAsync(messageId);
                    if (message != null && await ValidateUserOrderAccessAsync(userId, message.OrderId))
                    {
                        validMessageIds.Add(messageId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not validate access for message {MessageId}", messageId);
                }
            }

            if (validMessageIds.Any())
            {
                var markedCount = await _messageRepository.MarkMessagesAsReadAsync(validMessageIds, DateTime.UtcNow);
                _logger.LogInformation("Marked {Count} messages as read by user {UserId}", markedCount, userId);
                return markedCount;
            }

            return 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking messages as read for user {UserId}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<MessageAttachment>> GetMessageAttachmentsAsync(Guid messageId, Guid userId)
    {
        try
        {
            // Validate user access to the message
            var message = await GetMessageByIdAsync(messageId, userId);
            if (message == null)
            {
                return Enumerable.Empty<MessageAttachment>();
            }

            return await _messageRepository.GetMessageAttachmentsAsync(messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting attachments for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<AttachmentDownloadResult?> DownloadAttachmentAsync(Guid attachmentId, Guid userId)
    {
        try
        {
            var attachment = await _messageRepository.GetAttachmentByIdAsync(attachmentId);
            if (attachment == null)
            {
                return null;
            }

            // Validate user access to the message's order
            if (!await ValidateUserOrderAccessAsync(userId, attachment.Message.OrderId))
            {
                throw new MessageAccessDeniedException($"User {userId} does not have access to attachment {attachmentId}");
            }

            // For now, we'll simulate file storage by returning a basic implementation
            // In a real implementation, this would download from Azure Blob Storage
            _logger.LogInformation("User {UserId} downloading attachment {AttachmentId}: {FileName}", 
                userId, attachmentId, attachment.OriginalFileName);

            // This is a placeholder - in real implementation, you would:
            // 1. Download from Azure Blob Storage using attachment.BlobUrl
            // 2. Return the actual file stream
            var emptyStream = new MemoryStream();
            
            return new AttachmentDownloadResult
            {
                FileStream = emptyStream,
                FileName = attachment.OriginalFileName,
                ContentType = attachment.ContentType,
                FileSize = attachment.FileSize
            };
        }
        catch (MessageAccessDeniedException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading attachment {AttachmentId}", attachmentId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> GetUnreadMessageCountAsync(Guid orderId, Guid userId)
    {
        try
        {
            if (!await ValidateUserOrderAccessAsync(userId, orderId))
            {
                return 0;
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return 0;
            }

            var userRole = user.Role.GetRoleString();
            return await _messageRepository.GetUnreadMessageCountAsync(orderId, userRole);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread message count for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> ValidateUserOrderAccessAsync(Guid userId, Guid orderId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return false;
            }

            // ColorGarb staff can access all orders
            if (user.Role == UserRole.ColorGarbStaff)
            {
                return true;
            }

            // Organization users can only access their own organization's orders
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null)
            {
                return false;
            }

            return user.OrganizationId == order.OrganizationId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating user {UserId} access to order {OrderId}", userId, orderId);
            return false;
        }
    }

    /// <summary>
    /// Validates file attachments against security and size constraints.
    /// </summary>
    private static void ValidateAttachments(List<IFormFile> attachments, Dictionary<string, string> errors)
    {
        if (attachments.Count > MaxAttachmentsPerMessage)
        {
            errors["_general"] = $"Maximum {MaxAttachmentsPerMessage} attachments allowed per message";
            return;
        }

        foreach (var file in attachments)
        {
            if (file.Length == 0)
            {
                errors[file.FileName] = "File is empty";
                continue;
            }

            if (file.Length > MaxFileSize)
            {
                errors[file.FileName] = $"File size exceeds {MaxFileSize / (1024 * 1024)}MB limit";
                continue;
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                errors[file.FileName] = "File type not allowed";
                continue;
            }

            if (string.IsNullOrWhiteSpace(file.FileName))
            {
                errors[file.FileName] = "File name is required";
            }
        }
    }

    /// <summary>
    /// Processes and stores a file attachment.
    /// </summary>
    private async Task<MessageAttachment> ProcessAttachmentAsync(Guid messageId, IFormFile file, Guid uploadedBy)
    {
        // Generate secure filename
        var fileExtension = Path.GetExtension(file.FileName);
        var secureFileName = $"{Guid.NewGuid()}{fileExtension}";

        // In a real implementation, this would:
        // 1. Upload the file to Azure Blob Storage
        // 2. Get the blob URL
        // 3. Perform virus scanning
        // 4. Generate thumbnails for images if needed

        var blobUrl = $"https://storage.azure.com/containers/message-attachments/{secureFileName}";

        var attachment = new MessageAttachment
        {
            MessageId = messageId,
            FileName = secureFileName,
            OriginalFileName = file.FileName,
            FileSize = file.Length,
            ContentType = file.ContentType,
            BlobUrl = blobUrl,
            UploadedBy = uploadedBy
        };

        return await _messageRepository.CreateAttachmentAsync(attachment);
    }
}