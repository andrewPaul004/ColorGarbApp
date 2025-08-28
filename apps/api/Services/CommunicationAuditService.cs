using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for communication audit trail business logic operations.
/// Provides high-level operations for logging, searching, and reporting on communications.
/// </summary>
public class CommunicationAuditService : ICommunicationAuditService
{
    private readonly ICommunicationAuditRepository _auditRepository;
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<CommunicationAuditService> _logger;

    public CommunicationAuditService(
        ICommunicationAuditRepository auditRepository,
        ColorGarbDbContext context,
        ILogger<CommunicationAuditService> logger)
    {
        _auditRepository = auditRepository;
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<CommunicationLog> LogCommunicationAsync(CommunicationLog log)
    {
        try
        {
            _logger.LogDebug("Logging communication for order {OrderId}, type {CommunicationType}", 
                log.OrderId, log.CommunicationType);

            // Validate that the order exists and user has access
            var order = await _context.Orders
                .Include(o => o.Organization)
                .FirstOrDefaultAsync(o => o.Id == log.OrderId);

            if (order == null)
            {
                throw new ArgumentException($"Order {log.OrderId} not found");
            }

            // Set timestamps
            if (log.SentAt == default)
            {
                log.SentAt = DateTime.UtcNow;
            }

            // Generate unique ID if not set
            if (log.Id == default)
            {
                log.Id = Guid.NewGuid();
            }

            // Save communication log
            var savedLog = await _auditRepository.CreateCommunicationLogAsync(log);
            
            _logger.LogInformation("Communication logged: {LogId} Type: {Type} Order: {OrderId} Status: {Status}", 
                savedLog.Id, savedLog.CommunicationType, savedLog.OrderId, savedLog.DeliveryStatus);
            
            return savedLog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging communication for order {OrderId}", log.OrderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<NotificationDeliveryLog> UpdateDeliveryStatusAsync(string externalId, string status, 
        string? statusDetails = null, string? webhookData = null)
    {
        try
        {
            _logger.LogDebug("Updating delivery status for external ID {ExternalId} to {Status}", externalId, status);

            // Find the communication log by external ID
            var communicationLog = await _auditRepository.GetCommunicationLogByExternalIdAsync(externalId);
            if (communicationLog == null)
            {
                throw new ArgumentException($"Communication with external ID {externalId} not found");
            }

            // Update the main communication log status
            communicationLog.DeliveryStatus = status;
            
            // Set delivery timestamps based on status
            switch (status.ToLower())
            {
                case "delivered":
                    communicationLog.DeliveredAt = DateTime.UtcNow;
                    break;
                case "read":
                case "opened":
                    communicationLog.ReadAt = DateTime.UtcNow;
                    if (communicationLog.DeliveredAt == null)
                    {
                        communicationLog.DeliveredAt = DateTime.UtcNow;
                    }
                    break;
                case "failed":
                case "bounced":
                    communicationLog.FailureReason = statusDetails;
                    break;
            }

            _context.CommunicationLogs.Update(communicationLog);

            // Create or update delivery log entry
            var existingDeliveryLog = communicationLog.DeliveryLogs?
                .FirstOrDefault(d => d.ExternalId == externalId);

            NotificationDeliveryLog deliveryLog;
            
            if (existingDeliveryLog != null)
            {
                // Update existing delivery log
                existingDeliveryLog.Status = status;
                existingDeliveryLog.StatusDetails = statusDetails;
                existingDeliveryLog.UpdatedAt = DateTime.UtcNow;
                existingDeliveryLog.WebhookData = webhookData;
                
                deliveryLog = await _auditRepository.UpdateDeliveryLogAsync(existingDeliveryLog);
            }
            else
            {
                // Create new delivery log
                deliveryLog = new NotificationDeliveryLog
                {
                    CommunicationLogId = communicationLog.Id,
                    DeliveryProvider = DetermineProviderFromExternalId(externalId),
                    ExternalId = externalId,
                    Status = status,
                    StatusDetails = statusDetails,
                    UpdatedAt = DateTime.UtcNow,
                    WebhookData = webhookData
                };
                
                deliveryLog = await _auditRepository.CreateDeliveryLogAsync(deliveryLog);
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated delivery status for {ExternalId}: {Status}", externalId, status);
            return deliveryLog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating delivery status for external ID {ExternalId}", externalId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<CommunicationAuditResult> SearchCommunicationLogsAsync(CommunicationAuditSearchRequest searchRequest)
    {
        try
        {
            _logger.LogDebug("Searching communication logs with criteria: {SearchTerm}, Page: {Page}", 
                searchRequest.SearchTerm, searchRequest.Page);

            // Get logs and total count concurrently
            var logsTask = _auditRepository.SearchCommunicationLogsAsync(searchRequest);
            var countTask = _auditRepository.GetCommunicationCountAsync(searchRequest);

            await Task.WhenAll(logsTask, countTask);

            var logs = await logsTask;
            var totalCount = await countTask;

            // Generate status summary
            var statusSummary = logs
                .GroupBy(l => l.DeliveryStatus)
                .ToDictionary(g => g.Key, g => g.Count());

            var result = new CommunicationAuditResult
            {
                Logs = logs,
                TotalCount = totalCount,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize,
                HasNextPage = (searchRequest.Page * searchRequest.PageSize) < totalCount,
                StatusSummary = statusSummary
            };

            _logger.LogDebug("Communication search returned {Count} logs out of {Total} total", 
                logs.Count(), totalCount);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching communication logs");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<CommunicationLog>> GetOrderCommunicationHistoryAsync(Guid orderId, Guid? organizationId = null)
    {
        try
        {
            _logger.LogDebug("Retrieving communication history for order {OrderId}", orderId);

            // Validate organization access if specified
            if (organizationId.HasValue)
            {
                var order = await _context.Orders
                    .FirstOrDefaultAsync(o => o.Id == orderId && o.OrganizationId == organizationId.Value);
                
                if (order == null)
                {
                    throw new UnauthorizedAccessException($"Access denied to order {orderId}");
                }
            }

            var logs = await _auditRepository.GetOrderCommunicationHistoryAsync(orderId, includeDeliveryLogs: true);
            
            _logger.LogDebug("Retrieved {Count} communication logs for order {OrderId}", logs.Count(), orderId);
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication history for order {OrderId}", orderId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<DeliveryStatusSummary> GetDeliveryStatusSummaryAsync(Guid organizationId, DateTimeOffset from, DateTimeOffset to)
    {
        try
        {
            _logger.LogDebug("Generating delivery status summary for organization {OrganizationId} from {From} to {To}", 
                organizationId, from, to);

            var logs = await _context.CommunicationLogs
                .Include(c => c.Order)
                .Where(c => c.Order.OrganizationId == organizationId &&
                           c.SentAt >= from.DateTime &&
                           c.SentAt <= to.DateTime)
                .ToListAsync();

            var statusCounts = logs
                .GroupBy(l => l.DeliveryStatus)
                .ToDictionary(g => g.Key, g => g.Count());

            var typeCounts = logs
                .GroupBy(l => l.CommunicationType)
                .ToDictionary(g => g.Key, g => g.Count());

            var summary = new DeliveryStatusSummary
            {
                OrganizationId = organizationId,
                From = from,
                To = to,
                StatusCounts = statusCounts,
                TypeCounts = typeCounts,
                TotalCommunications = logs.Count
            };

            _logger.LogDebug("Generated summary for {Count} communications", logs.Count);
            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating delivery status summary for organization {OrganizationId}", organizationId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageAuditTrail> CreateMessageAuditTrailAsync(Guid messageId, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            _logger.LogDebug("Creating message audit trail for message {MessageId}", messageId);

            // Check if audit trail already exists
            var existingTrail = await _auditRepository.GetMessageAuditTrailAsync(messageId);
            if (existingTrail != null)
            {
                _logger.LogDebug("Message audit trail already exists for message {MessageId}", messageId);
                return existingTrail;
            }

            var auditTrail = new MessageAuditTrail
            {
                MessageId = messageId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow
            };

            var createdTrail = await _auditRepository.CreateMessageAuditTrailAsync(auditTrail);
            
            _logger.LogInformation("Created message audit trail {AuditId} for message {MessageId}", 
                createdTrail.Id, messageId);
            
            return createdTrail;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating message audit trail for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MessageEdit> RecordMessageEditAsync(Guid messageId, Guid editedBy, string previousContent, string? changeReason = null)
    {
        try
        {
            _logger.LogDebug("Recording message edit for message {MessageId} by user {EditedBy}", messageId, editedBy);

            // Get or create audit trail
            var auditTrail = await _auditRepository.GetMessageAuditTrailAsync(messageId);
            if (auditTrail == null)
            {
                auditTrail = await CreateMessageAuditTrailAsync(messageId);
            }

            var messageEdit = new MessageEdit
            {
                MessageAuditTrailId = auditTrail.Id,
                EditedAt = DateTime.UtcNow,
                EditedBy = editedBy,
                PreviousContent = previousContent,
                ChangeReason = changeReason
            };

            var createdEdit = await _auditRepository.CreateMessageEditAsync(messageEdit);
            
            _logger.LogInformation("Recorded message edit {EditId} for message {MessageId}", 
                createdEdit.Id, messageId);
            
            return createdEdit;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording message edit for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<MessageEdit>> GetMessageEditHistoryAsync(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving edit history for message {MessageId}", messageId);

            var edits = await _auditRepository.GetMessageEditHistoryAsync(messageId);
            
            _logger.LogDebug("Retrieved {Count} message edits for message {MessageId}", edits.Count(), messageId);
            return edits;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving edit history for message {MessageId}", messageId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> ValidateAuditAccessAsync(Guid userId, Guid? organizationId = null)
    {
        try
        {
            _logger.LogDebug("Validating audit access for user {UserId}, organization {OrganizationId}", 
                userId, organizationId);

            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for audit access validation", userId);
                return false;
            }

            // ColorGarb staff have full access
            if (user.Role == UserRole.ColorGarbStaff)
            {
                _logger.LogDebug("ColorGarb staff user {UserId} granted full audit access", userId);
                return true;
            }

            // Organization members can only access their own organization's data
            if (organizationId.HasValue && user.OrganizationId == organizationId.Value)
            {
                _logger.LogDebug("User {UserId} granted access to organization {OrganizationId} audit data", 
                    userId, organizationId);
                return true;
            }

            _logger.LogWarning("User {UserId} denied audit access to organization {OrganizationId}", 
                userId, organizationId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating audit access for user {UserId}", userId);
            return false;
        }
    }

    /// <summary>
    /// Determines the delivery provider based on external message ID format.
    /// </summary>
    /// <param name="externalId">External message identifier</param>
    /// <returns>Provider name</returns>
    private static string DetermineProviderFromExternalId(string externalId)
    {
        if (externalId.StartsWith("sendgrid-") || externalId.StartsWith("sg-"))
        {
            return "SendGrid";
        }
        
        if (externalId.StartsWith("twilio-") || externalId.StartsWith("SM"))
        {
            return "Twilio";
        }
        
        if (externalId.StartsWith("internal-"))
        {
            return "Internal";
        }

        return "Unknown";
    }
}