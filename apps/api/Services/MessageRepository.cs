using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Repository implementation for message data access operations.
/// Provides CRUD operations and search capabilities with organization isolation.
/// </summary>
public class MessageRepository : IMessageRepository
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<MessageRepository> _logger;

    public MessageRepository(ColorGarbDbContext context, ILogger<MessageRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Message>> GetOrderMessagesAsync(Guid orderId, int page = 1, int pageSize = 50)
    {
        try
        {
            _logger.LogDebug("Retrieving messages for order {OrderId}, page {Page}, pageSize {PageSize}", 
                orderId, page, pageSize);

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Attachments)
                .Include(m => m.Replies)
                .Where(m => m.OrderId == orderId)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} messages for order {OrderId}", messages.Count, orderId);
            return messages;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving messages for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Message> CreateMessageAsync(Message message)
    {
        try
        {
            _logger.LogDebug("Creating new message for order {OrderId} from sender {SenderId}", 
                message.OrderId, message.SenderId);

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created message {MessageId} for order {OrderId}", 
                message.Id, message.OrderId);
            return message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating message for order {OrderId}", message.OrderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Message?> GetMessageByIdAsync(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving message {MessageId}", messageId);

            var message = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Order)
                .Include(m => m.Attachments)
                .Include(m => m.ReplyToMessage)
                .Include(m => m.Replies)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null)
            {
                _logger.LogWarning("Message {MessageId} not found", messageId);
            }

            return message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Message> UpdateMessageAsync(Message message)
    {
        try
        {
            _logger.LogDebug("Updating message {MessageId}", message.Id);

            _context.Messages.Update(message);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated message {MessageId}", message.Id);
            return message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating message {MessageId}", message.Id);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageAttachment> CreateAttachmentAsync(MessageAttachment attachment)
    {
        try
        {
            _logger.LogDebug("Creating attachment for message {MessageId}: {FileName}", 
                attachment.MessageId, attachment.OriginalFileName);

            _context.MessageAttachments.Add(attachment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created attachment {AttachmentId} for message {MessageId}", 
                attachment.Id, attachment.MessageId);
            return attachment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating attachment for message {MessageId}", attachment.MessageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<MessageAttachment>> GetMessageAttachmentsAsync(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving attachments for message {MessageId}", messageId);

            var attachments = await _context.MessageAttachments
                .Include(a => a.UploadedByUser)
                .Where(a => a.MessageId == messageId)
                .OrderBy(a => a.UploadedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} attachments for message {MessageId}", 
                attachments.Count, messageId);
            return attachments;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving attachments for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageAttachment?> GetAttachmentByIdAsync(Guid attachmentId)
    {
        try
        {
            _logger.LogDebug("Retrieving attachment {AttachmentId}", attachmentId);

            var attachment = await _context.MessageAttachments
                .Include(a => a.Message)
                .Include(a => a.UploadedByUser)
                .FirstOrDefaultAsync(a => a.Id == attachmentId);

            if (attachment == null)
            {
                _logger.LogWarning("Attachment {AttachmentId} not found", attachmentId);
            }

            return attachment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving attachment {AttachmentId}", attachmentId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Message>> SearchMessagesAsync(MessageSearchRequest searchRequest)
    {
        try
        {
            _logger.LogDebug("Searching messages for order {OrderId} with term '{SearchTerm}'", 
                searchRequest.OrderId, searchRequest.SearchTerm);

            var query = _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Attachments)
                .Where(m => m.OrderId == searchRequest.OrderId);

            // Apply search term filter
            if (!string.IsNullOrWhiteSpace(searchRequest.SearchTerm))
            {
                // Use Contains for compatibility with InMemory database in tests
                // In production with SQL Server, this would use full-text search
                query = query.Where(m => 
                    m.Content.Contains(searchRequest.SearchTerm) ||
                    m.Attachments.Any(a => a.OriginalFileName.Contains(searchRequest.SearchTerm)));
            }

            // Apply sender filter
            if (searchRequest.SenderId.HasValue)
            {
                query = query.Where(m => m.SenderId == searchRequest.SenderId.Value);
            }

            // Apply message type filter
            if (!string.IsNullOrWhiteSpace(searchRequest.MessageType))
            {
                query = query.Where(m => m.MessageType == searchRequest.MessageType);
            }

            // Apply sender role filter
            if (!string.IsNullOrWhiteSpace(searchRequest.SenderRole))
            {
                query = query.Where(m => m.SenderRole == searchRequest.SenderRole);
            }

            // Apply date range filters
            if (searchRequest.DateFrom.HasValue)
            {
                query = query.Where(m => m.CreatedAt >= searchRequest.DateFrom.Value);
            }

            if (searchRequest.DateTo.HasValue)
            {
                var dateTo = searchRequest.DateTo.Value.Date.AddDays(1); // Include entire day
                query = query.Where(m => m.CreatedAt < dateTo);
            }

            // Apply attachment filter
            if (searchRequest.IncludeAttachments.HasValue)
            {
                if (searchRequest.IncludeAttachments.Value)
                {
                    query = query.Where(m => m.Attachments.Any());
                }
                else
                {
                    query = query.Where(m => !m.Attachments.Any());
                }
            }

            // Apply pagination and ordering
            var messages = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((searchRequest.Page - 1) * searchRequest.PageSize)
                .Take(searchRequest.PageSize)
                .ToListAsync();

            _logger.LogDebug("Found {Count} messages matching search criteria", messages.Count);
            return messages;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching messages for order {OrderId}", searchRequest.OrderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> GetMessageCountAsync(Guid orderId, MessageSearchRequest? searchRequest = null)
    {
        try
        {
            var query = _context.Messages.Where(m => m.OrderId == orderId);

            if (searchRequest != null)
            {
                // Apply the same filters as SearchMessagesAsync
                if (!string.IsNullOrWhiteSpace(searchRequest.SearchTerm))
                {
                    query = query.Where(m => 
                        m.Content.Contains(searchRequest.SearchTerm) ||
                        m.Attachments.Any(a => a.OriginalFileName.Contains(searchRequest.SearchTerm)));
                }

                if (searchRequest.SenderId.HasValue)
                {
                    query = query.Where(m => m.SenderId == searchRequest.SenderId.Value);
                }

                if (!string.IsNullOrWhiteSpace(searchRequest.MessageType))
                {
                    query = query.Where(m => m.MessageType == searchRequest.MessageType);
                }

                if (!string.IsNullOrWhiteSpace(searchRequest.SenderRole))
                {
                    query = query.Where(m => m.SenderRole == searchRequest.SenderRole);
                }

                if (searchRequest.DateFrom.HasValue)
                {
                    query = query.Where(m => m.CreatedAt >= searchRequest.DateFrom.Value);
                }

                if (searchRequest.DateTo.HasValue)
                {
                    var dateTo = searchRequest.DateTo.Value.Date.AddDays(1);
                    query = query.Where(m => m.CreatedAt < dateTo);
                }

                if (searchRequest.IncludeAttachments.HasValue)
                {
                    if (searchRequest.IncludeAttachments.Value)
                    {
                        query = query.Where(m => m.Attachments.Any());
                    }
                    else
                    {
                        query = query.Where(m => !m.Attachments.Any());
                    }
                }
            }

            var count = await query.CountAsync();
            _logger.LogDebug("Found {Count} total messages for order {OrderId}", count, orderId);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting messages for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> GetUnreadMessageCountAsync(Guid orderId, string userRole)
    {
        try
        {
            _logger.LogDebug("Getting unread message count for order {OrderId} and role {UserRole}", 
                orderId, userRole);

            var count = await _context.Messages
                .Where(m => m.OrderId == orderId && 
                           !m.IsRead && 
                           (m.RecipientRole == userRole || m.RecipientRole == "All"))
                .CountAsync();

            _logger.LogDebug("Found {Count} unread messages for order {OrderId} and role {UserRole}", 
                count, orderId, userRole);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread message count for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> MarkMessagesAsReadAsync(IEnumerable<Guid> messageIds, DateTime readAt)
    {
        try
        {
            var messageIdsList = messageIds.ToList();
            _logger.LogDebug("Marking {Count} messages as read", messageIdsList.Count);

            var messages = await _context.Messages
                .Where(m => messageIdsList.Contains(m.Id))
                .ToListAsync();

            foreach (var message in messages)
            {
                message.IsRead = true;
                message.ReadAt = readAt;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Marked {Count} messages as read", messages.Count);
            return messages.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking messages as read");
            throw;
        }
    }
}