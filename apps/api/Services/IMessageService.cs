using Microsoft.AspNetCore.Http;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for message business logic operations.
/// Handles message creation, retrieval, search, and file attachment processing.
/// </summary>
public interface IMessageService
{
    /// <summary>
    /// Retrieves messages for a specific order with pagination and search support.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="searchRequest">Search and filter parameters</param>
    /// <returns>Search result containing messages and pagination info</returns>
    Task<MessageSearchResult> GetOrderMessagesAsync(Guid orderId, MessageSearchRequest searchRequest);

    /// <summary>
    /// Sends a new message with optional file attachments.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="senderId">ID of the user sending the message</param>
    /// <param name="content">Message content</param>
    /// <param name="messageType">Type of message (General, Question, Update, Urgent)</param>
    /// <param name="recipientRole">Target recipient role (Client, ColorGarbStaff, All)</param>
    /// <param name="replyToMessageId">Optional ID of message being replied to</param>
    /// <param name="attachments">Optional file attachments</param>
    /// <returns>Created message with attachment information</returns>
    Task<MessageResult> SendMessageAsync(
        Guid orderId, 
        Guid senderId, 
        string content, 
        string messageType = "General",
        string recipientRole = "All",
        Guid? replyToMessageId = null,
        List<IFormFile>? attachments = null);

    /// <summary>
    /// Retrieves a specific message by ID with authorization checks.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <param name="userId">ID of the user requesting the message</param>
    /// <returns>Message if found and authorized, null otherwise</returns>
    Task<Message?> GetMessageByIdAsync(Guid messageId, Guid userId);

    /// <summary>
    /// Marks a message as read by the current user.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <param name="userId">ID of the user marking the message as read</param>
    /// <returns>True if successfully marked as read</returns>
    Task<bool> MarkMessageAsReadAsync(Guid messageId, Guid userId);

    /// <summary>
    /// Marks multiple messages as read for the current user.
    /// </summary>
    /// <param name="messageIds">Collection of message IDs to mark as read</param>
    /// <param name="userId">ID of the user marking messages as read</param>
    /// <returns>Number of messages successfully marked as read</returns>
    Task<int> MarkMessagesAsReadAsync(IEnumerable<Guid> messageIds, Guid userId);

    /// <summary>
    /// Retrieves all attachments for a specific message with authorization checks.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <param name="userId">ID of the user requesting attachments</param>
    /// <returns>Collection of message attachments</returns>
    Task<IEnumerable<MessageAttachment>> GetMessageAttachmentsAsync(Guid messageId, Guid userId);

    /// <summary>
    /// Downloads a specific attachment file with security validation.
    /// </summary>
    /// <param name="attachmentId">Unique identifier of the attachment</param>
    /// <param name="userId">ID of the user requesting the download</param>
    /// <returns>File stream and content information</returns>
    Task<AttachmentDownloadResult?> DownloadAttachmentAsync(Guid attachmentId, Guid userId);

    /// <summary>
    /// Gets the count of unread messages for a specific order and user.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="userId">ID of the user to check unread messages for</param>
    /// <returns>Number of unread messages</returns>
    Task<int> GetUnreadMessageCountAsync(Guid orderId, Guid userId);

    /// <summary>
    /// Validates that a user has access to messages for a specific order.
    /// </summary>
    /// <param name="userId">ID of the user to validate</param>
    /// <param name="orderId">ID of the order to check access for</param>
    /// <returns>True if user has access, false otherwise</returns>
    Task<bool> ValidateUserOrderAccessAsync(Guid userId, Guid orderId);

    /// <summary>
    /// Retrieves all messages across all orders for admin users with pagination and search support.
    /// Only accessible by users with ColorGarbStaff role.
    /// </summary>
    /// <param name="searchRequest">Search and filter parameters for admin message inbox</param>
    /// <param name="userId">ID of the admin user making the request</param>
    /// <returns>Search result containing messages across all orders with organization context</returns>
    Task<AdminMessageSearchResult> GetAllMessagesForAdminAsync(AdminMessageSearchRequest searchRequest, Guid userId);

    /// <summary>
    /// Gets the total count of unread messages across all orders for admin users.
    /// Only accessible by users with ColorGarbStaff role.
    /// </summary>
    /// <param name="userId">ID of the admin user to check unread messages for</param>
    /// <returns>Total number of unread messages across all orders</returns>
    Task<int> GetAdminUnreadMessageCountAsync(Guid userId);
}

/// <summary>
/// Result of sending a message operation.
/// </summary>
public class MessageResult
{
    /// <summary>
    /// The created message
    /// </summary>
    public Message Message { get; set; } = null!;

    /// <summary>
    /// Attachments that were successfully uploaded
    /// </summary>
    public IEnumerable<MessageAttachment> Attachments { get; set; } = Enumerable.Empty<MessageAttachment>();

    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Attachment upload errors (if any)
    /// </summary>
    public Dictionary<string, string> AttachmentErrors { get; set; } = new();
}

/// <summary>
/// Result of downloading an attachment.
/// </summary>
public class AttachmentDownloadResult
{
    /// <summary>
    /// File stream containing the attachment data
    /// </summary>
    public Stream FileStream { get; set; } = null!;

    /// <summary>
    /// Original filename of the attachment
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// MIME content type of the file
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Size of the file in bytes
    /// </summary>
    public long FileSize { get; set; }
}

/// <summary>
/// Exception thrown when a user attempts to access a message they don't have permission for.
/// </summary>
public class MessageAccessDeniedException : Exception
{
    public MessageAccessDeniedException(string message) : base(message) { }
    public MessageAccessDeniedException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Exception thrown when a message or attachment is not found.
/// </summary>
public class MessageNotFoundException : Exception
{
    public MessageNotFoundException(string message) : base(message) { }
    public MessageNotFoundException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Exception thrown when file attachment validation fails.
/// </summary>
public class AttachmentValidationException : Exception
{
    public AttachmentValidationException(string message) : base(message) { }
    public AttachmentValidationException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Search request for admin message inbox across all orders.
/// </summary>
public class AdminMessageSearchRequest
{
    /// <summary>
    /// Search term to match against message content
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by specific client name
    /// </summary>
    public string? ClientName { get; set; }

    /// <summary>
    /// Filter by organization ID
    /// </summary>
    public Guid? OrganizationId { get; set; }

    /// <summary>
    /// Filter by order number
    /// </summary>
    public string? OrderNumber { get; set; }

    /// <summary>
    /// Filter by message type
    /// </summary>
    public string? MessageType { get; set; }

    /// <summary>
    /// Filter by sender role
    /// </summary>
    public string? SenderRole { get; set; }

    /// <summary>
    /// Filter messages from this date (inclusive)
    /// </summary>
    public DateTime? DateFrom { get; set; }

    /// <summary>
    /// Filter messages to this date (inclusive)
    /// </summary>
    public DateTime? DateTo { get; set; }

    /// <summary>
    /// Include only messages with attachments
    /// </summary>
    public bool? IncludeAttachments { get; set; }

    /// <summary>
    /// Filter by unread status
    /// </summary>
    public bool? UnreadOnly { get; set; }

    /// <summary>
    /// Page number for pagination (1-based)
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of messages per page
    /// </summary>
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// Result of admin message search across all orders.
/// </summary>
public class AdminMessageSearchResult
{
    /// <summary>
    /// Messages matching the search criteria for current page
    /// </summary>
    public IEnumerable<AdminMessage> Messages { get; set; } = Enumerable.Empty<AdminMessage>();

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
/// Message with additional context for admin message inbox.
/// </summary>
public class AdminMessage
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