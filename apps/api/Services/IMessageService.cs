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