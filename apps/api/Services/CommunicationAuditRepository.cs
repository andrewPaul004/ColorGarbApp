using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Repository implementation for communication audit trail data access operations.
/// Provides comprehensive logging, searching, and tracking capabilities with organization isolation.
/// </summary>
public class CommunicationAuditRepository : ICommunicationAuditRepository
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<CommunicationAuditRepository> _logger;

    public CommunicationAuditRepository(ColorGarbDbContext context, ILogger<CommunicationAuditRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<CommunicationLog> CreateCommunicationLogAsync(CommunicationLog log)
    {
        try
        {
            _logger.LogDebug("Creating communication log for order {OrderId}, type {CommunicationType}", 
                log.OrderId, log.CommunicationType);

            _context.CommunicationLogs.Add(log);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created communication log {LogId} for order {OrderId}", 
                log.Id, log.OrderId);
            return log;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating communication log for order {OrderId}", log.OrderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<NotificationDeliveryLog> CreateDeliveryLogAsync(NotificationDeliveryLog deliveryLog)
    {
        try
        {
            _logger.LogDebug("Creating delivery log for communication {CommunicationLogId}, provider {Provider}", 
                deliveryLog.CommunicationLogId, deliveryLog.DeliveryProvider);

            _context.NotificationDeliveryLogs.Add(deliveryLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created delivery log {DeliveryLogId} for communication {CommunicationLogId}", 
                deliveryLog.Id, deliveryLog.CommunicationLogId);
            return deliveryLog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating delivery log for communication {CommunicationLogId}", 
                deliveryLog.CommunicationLogId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<NotificationDeliveryLog> UpdateDeliveryLogAsync(NotificationDeliveryLog deliveryLog)
    {
        try
        {
            _logger.LogDebug("Updating delivery log {DeliveryLogId} status to {Status}", 
                deliveryLog.Id, deliveryLog.Status);

            _context.NotificationDeliveryLogs.Update(deliveryLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated delivery log {DeliveryLogId} status to {Status}", 
                deliveryLog.Id, deliveryLog.Status);
            return deliveryLog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating delivery log {DeliveryLogId}", deliveryLog.Id);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<CommunicationLog>> SearchCommunicationLogsAsync(CommunicationAuditSearchRequest searchRequest)
    {
        try
        {
            _logger.LogDebug("Searching communication logs with search term '{SearchTerm}', page {Page}", 
                searchRequest.SearchTerm, searchRequest.Page);

            var query = _context.CommunicationLogs
                .Include(c => c.Order)
                .Include(c => c.Sender)
                .Include(c => c.Recipient)
                .AsQueryable();

            if (searchRequest.IncludeContent)
            {
                query = query.Include(c => c.DeliveryLogs);
            }

            // Organization isolation
            if (searchRequest.OrganizationId.HasValue)
            {
                query = query.Where(c => c.Order.OrganizationId == searchRequest.OrganizationId.Value);
            }

            // Order filter
            if (searchRequest.OrderId.HasValue)
            {
                query = query.Where(c => c.OrderId == searchRequest.OrderId.Value);
            }

            // Communication type filter
            if (searchRequest.CommunicationType?.Any() == true)
            {
                var communicationTypes = searchRequest.CommunicationType.ToList();
                query = query.Where(c => communicationTypes.Contains(c.CommunicationType));
            }

            // Sender filter
            if (searchRequest.SenderId.HasValue)
            {
                query = query.Where(c => c.SenderId == searchRequest.SenderId.Value);
            }

            // Recipient filter
            if (searchRequest.RecipientId.HasValue)
            {
                query = query.Where(c => c.RecipientId == searchRequest.RecipientId.Value);
            }

            // Delivery status filter
            if (searchRequest.DeliveryStatus?.Any() == true)
            {
                var statuses = searchRequest.DeliveryStatus.ToList();
                query = query.Where(c => statuses.Contains(c.DeliveryStatus));
            }

            // Date range filters
            if (searchRequest.DateFrom.HasValue)
            {
                query = query.Where(c => c.SentAt >= searchRequest.DateFrom.Value);
            }

            if (searchRequest.DateTo.HasValue)
            {
                var dateTo = searchRequest.DateTo.Value.Date.AddDays(1); // Include entire day
                query = query.Where(c => c.SentAt < dateTo);
            }

            // Full-text search
            if (!string.IsNullOrWhiteSpace(searchRequest.SearchTerm))
            {
                var searchTerm = searchRequest.SearchTerm.ToLower();
                query = query.Where(c => 
                    c.Content.ToLower().Contains(searchTerm) ||
                    (c.Subject != null && c.Subject.ToLower().Contains(searchTerm)) ||
                    (c.RecipientEmail != null && c.RecipientEmail.ToLower().Contains(searchTerm)) ||
                    (c.RecipientPhone != null && c.RecipientPhone.Contains(searchTerm)));
            }

            // Sorting
            query = searchRequest.SortBy.ToLower() switch
            {
                "deliveredat" => searchRequest.SortDirection.ToLower() == "desc" 
                    ? query.OrderByDescending(c => c.DeliveredAt)
                    : query.OrderBy(c => c.DeliveredAt),
                "readat" => searchRequest.SortDirection.ToLower() == "desc"
                    ? query.OrderByDescending(c => c.ReadAt)
                    : query.OrderBy(c => c.ReadAt),
                _ => searchRequest.SortDirection.ToLower() == "desc"
                    ? query.OrderByDescending(c => c.SentAt)
                    : query.OrderBy(c => c.SentAt)
            };

            // Pagination
            var logs = await query
                .Skip((searchRequest.Page - 1) * searchRequest.PageSize)
                .Take(searchRequest.PageSize)
                .ToListAsync();

            _logger.LogDebug("Found {Count} communication logs matching search criteria", logs.Count);
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching communication logs");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> GetCommunicationCountAsync(CommunicationAuditSearchRequest searchRequest)
    {
        try
        {
            var query = _context.CommunicationLogs.AsQueryable();

            // Apply the same filters as SearchCommunicationLogsAsync
            if (searchRequest.OrganizationId.HasValue)
            {
                query = query.Where(c => c.Order.OrganizationId == searchRequest.OrganizationId.Value);
            }

            if (searchRequest.OrderId.HasValue)
            {
                query = query.Where(c => c.OrderId == searchRequest.OrderId.Value);
            }

            if (searchRequest.CommunicationType?.Any() == true)
            {
                var communicationTypes = searchRequest.CommunicationType.ToList();
                query = query.Where(c => communicationTypes.Contains(c.CommunicationType));
            }

            if (searchRequest.SenderId.HasValue)
            {
                query = query.Where(c => c.SenderId == searchRequest.SenderId.Value);
            }

            if (searchRequest.RecipientId.HasValue)
            {
                query = query.Where(c => c.RecipientId == searchRequest.RecipientId.Value);
            }

            if (searchRequest.DeliveryStatus?.Any() == true)
            {
                var statuses = searchRequest.DeliveryStatus.ToList();
                query = query.Where(c => statuses.Contains(c.DeliveryStatus));
            }

            if (searchRequest.DateFrom.HasValue)
            {
                query = query.Where(c => c.SentAt >= searchRequest.DateFrom.Value);
            }

            if (searchRequest.DateTo.HasValue)
            {
                var dateTo = searchRequest.DateTo.Value.Date.AddDays(1);
                query = query.Where(c => c.SentAt < dateTo);
            }

            if (!string.IsNullOrWhiteSpace(searchRequest.SearchTerm))
            {
                var searchTerm = searchRequest.SearchTerm.ToLower();
                query = query.Where(c => 
                    c.Content.ToLower().Contains(searchTerm) ||
                    (c.Subject != null && c.Subject.ToLower().Contains(searchTerm)) ||
                    (c.RecipientEmail != null && c.RecipientEmail.ToLower().Contains(searchTerm)) ||
                    (c.RecipientPhone != null && c.RecipientPhone.Contains(searchTerm)));
            }

            var count = await query.CountAsync();
            _logger.LogDebug("Found {Count} total communication logs matching criteria", count);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting communication logs");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<CommunicationLog>> GetOrderCommunicationHistoryAsync(Guid orderId, bool includeDeliveryLogs = true)
    {
        try
        {
            _logger.LogDebug("Retrieving communication history for order {OrderId}", orderId);

            var query = _context.CommunicationLogs
                .Include(c => c.Sender)
                .Include(c => c.Recipient)
                .Where(c => c.OrderId == orderId);

            if (includeDeliveryLogs)
            {
                query = query.Include(c => c.DeliveryLogs);
            }

            var logs = await query
                .OrderByDescending(c => c.SentAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} communication logs for order {OrderId}", logs.Count, orderId);
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication history for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<CommunicationLog?> GetCommunicationLogByIdAsync(Guid logId)
    {
        try
        {
            _logger.LogDebug("Retrieving communication log {LogId}", logId);

            var log = await _context.CommunicationLogs
                .Include(c => c.Order)
                .Include(c => c.Sender)
                .Include(c => c.Recipient)
                .Include(c => c.DeliveryLogs)
                .FirstOrDefaultAsync(c => c.Id == logId);

            if (log == null)
            {
                _logger.LogWarning("Communication log {LogId} not found", logId);
            }

            return log;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication log {LogId}", logId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<CommunicationLog?> GetCommunicationLogByExternalIdAsync(string externalMessageId)
    {
        try
        {
            _logger.LogDebug("Retrieving communication log by external ID {ExternalId}", externalMessageId);

            var log = await _context.CommunicationLogs
                .Include(c => c.DeliveryLogs)
                .FirstOrDefaultAsync(c => c.ExternalMessageId == externalMessageId);

            if (log == null)
            {
                _logger.LogWarning("Communication log with external ID {ExternalId} not found", externalMessageId);
            }

            return log;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication log by external ID {ExternalId}", externalMessageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<NotificationDeliveryLog>> GetDeliveryLogsAsync(Guid communicationLogId)
    {
        try
        {
            _logger.LogDebug("Retrieving delivery logs for communication {CommunicationLogId}", communicationLogId);

            var logs = await _context.NotificationDeliveryLogs
                .Where(d => d.CommunicationLogId == communicationLogId)
                .OrderBy(d => d.UpdatedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} delivery logs for communication {CommunicationLogId}", 
                logs.Count, communicationLogId);
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving delivery logs for communication {CommunicationLogId}", 
                communicationLogId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageAuditTrail> CreateMessageAuditTrailAsync(MessageAuditTrail auditTrail)
    {
        try
        {
            _logger.LogDebug("Creating message audit trail for message {MessageId}", auditTrail.MessageId);

            _context.MessageAuditTrails.Add(auditTrail);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created message audit trail {AuditId} for message {MessageId}", 
                auditTrail.Id, auditTrail.MessageId);
            return auditTrail;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating message audit trail for message {MessageId}", auditTrail.MessageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageEdit> CreateMessageEditAsync(MessageEdit messageEdit)
    {
        try
        {
            _logger.LogDebug("Creating message edit record for audit trail {AuditTrailId}", 
                messageEdit.MessageAuditTrailId);

            _context.MessageEdits.Add(messageEdit);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created message edit {EditId} for audit trail {AuditTrailId}", 
                messageEdit.Id, messageEdit.MessageAuditTrailId);
            return messageEdit;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating message edit for audit trail {AuditTrailId}", 
                messageEdit.MessageAuditTrailId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageAuditTrail?> GetMessageAuditTrailAsync(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving message audit trail for message {MessageId}", messageId);

            var auditTrail = await _context.MessageAuditTrails
                .Include(a => a.Message)
                .Include(a => a.EditHistory)
                .ThenInclude(e => e.Editor)
                .FirstOrDefaultAsync(a => a.MessageId == messageId);

            if (auditTrail == null)
            {
                _logger.LogWarning("Message audit trail for message {MessageId} not found", messageId);
            }

            return auditTrail;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving message audit trail for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<MessageEdit>> GetMessageEditHistoryAsync(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving message edit history for message {MessageId}", messageId);

            var edits = await _context.MessageEdits
                .Include(e => e.Editor)
                .Include(e => e.MessageAuditTrail)
                .Where(e => e.MessageAuditTrail.MessageId == messageId)
                .OrderBy(e => e.EditedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} message edits for message {MessageId}", edits.Count, messageId);
            return edits;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving message edit history for message {MessageId}", messageId);
            throw;
        }
    }
}