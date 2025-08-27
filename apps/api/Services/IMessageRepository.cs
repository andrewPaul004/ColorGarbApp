using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Repository interface for message data access operations.
/// Provides CRUD operations and search capabilities with organization isolation.
/// </summary>
public interface IMessageRepository
{
    /// <summary>
    /// Retrieves messages for a specific order with pagination support.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="pageSize">Number of messages per page</param>
    /// <returns>Collection of messages for the order</returns>
    Task<IEnumerable<Message>> GetOrderMessagesAsync(Guid orderId, int page = 1, int pageSize = 50);

    /// <summary>
    /// Creates a new message in the database.
    /// </summary>
    /// <param name="message">Message entity to create</param>
    /// <returns>Created message with generated ID</returns>
    Task<Message> CreateMessageAsync(Message message);

    /// <summary>
    /// Retrieves a specific message by its ID.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <returns>Message if found, null otherwise</returns>
    Task<Message?> GetMessageByIdAsync(Guid messageId);

    /// <summary>
    /// Updates an existing message.
    /// </summary>
    /// <param name="message">Message with updated properties</param>
    /// <returns>Updated message</returns>
    Task<Message> UpdateMessageAsync(Message message);

    /// <summary>
    /// Creates a new message attachment in the database.
    /// </summary>
    /// <param name="attachment">Attachment entity to create</param>
    /// <returns>Created attachment with generated ID</returns>
    Task<MessageAttachment> CreateAttachmentAsync(MessageAttachment attachment);

    /// <summary>
    /// Retrieves all attachments for a specific message.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <returns>Collection of message attachments</returns>
    Task<IEnumerable<MessageAttachment>> GetMessageAttachmentsAsync(Guid messageId);

    /// <summary>
    /// Retrieves a specific attachment by its ID.
    /// </summary>
    /// <param name="attachmentId">Unique identifier of the attachment</param>
    /// <returns>Attachment if found, null otherwise</returns>
    Task<MessageAttachment?> GetAttachmentByIdAsync(Guid attachmentId);

    /// <summary>
    /// Searches messages based on specified criteria.
    /// </summary>
    /// <param name="searchRequest">Search parameters and filters</param>
    /// <returns>Collection of messages matching the search criteria</returns>
    Task<IEnumerable<Message>> SearchMessagesAsync(MessageSearchRequest searchRequest);

    /// <summary>
    /// Gets the total count of messages matching the search criteria.
    /// </summary>
    /// <param name="orderId">Order ID to count messages for</param>
    /// <param name="searchRequest">Search parameters for filtering</param>
    /// <returns>Total number of messages matching the criteria</returns>
    Task<int> GetMessageCountAsync(Guid orderId, MessageSearchRequest? searchRequest = null);

    /// <summary>
    /// Gets the count of unread messages for a specific order and user role.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="userRole">Role of the user to check unread messages for</param>
    /// <returns>Number of unread messages</returns>
    Task<int> GetUnreadMessageCountAsync(Guid orderId, string userRole);

    /// <summary>
    /// Marks multiple messages as read for a specific user.
    /// </summary>
    /// <param name="messageIds">Collection of message IDs to mark as read</param>
    /// <param name="readAt">Timestamp when messages were read</param>
    /// <returns>Number of messages marked as read</returns>
    Task<int> MarkMessagesAsReadAsync(IEnumerable<Guid> messageIds, DateTime readAt);
}

/// <summary>
/// Search request parameters for filtering and searching messages.
/// </summary>
public class MessageSearchRequest
{
    /// <summary>
    /// Order ID to search messages within
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Search term to match against message content
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by specific sender ID
    /// </summary>
    public Guid? SenderId { get; set; }

    /// <summary>
    /// Filter by message type (General, Question, Update, Urgent)
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
    /// Page number for pagination (1-based)
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of messages per page
    /// </summary>
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// Search result containing messages and pagination information.
/// </summary>
public class MessageSearchResult
{
    /// <summary>
    /// Messages matching the search criteria
    /// </summary>
    public IEnumerable<Message> Messages { get; set; } = Enumerable.Empty<Message>();

    /// <summary>
    /// Total number of messages matching the search (before pagination)
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
}