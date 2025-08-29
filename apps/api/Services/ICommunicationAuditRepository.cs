using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Repository interface for communication audit trail data access operations.
/// Provides comprehensive logging, searching, and tracking capabilities with organization isolation.
/// </summary>
public interface ICommunicationAuditRepository
{
    /// <summary>
    /// Creates a new communication log entry in the database.
    /// </summary>
    /// <param name="log">Communication log entity to create</param>
    /// <returns>Created communication log with generated ID</returns>
    Task<CommunicationLog> CreateCommunicationLogAsync(CommunicationLog log);

    /// <summary>
    /// Creates a new notification delivery log entry in the database.
    /// </summary>
    /// <param name="deliveryLog">Delivery log entity to create</param>
    /// <returns>Created delivery log with generated ID</returns>
    Task<NotificationDeliveryLog> CreateDeliveryLogAsync(NotificationDeliveryLog deliveryLog);

    /// <summary>
    /// Updates an existing notification delivery log entry.
    /// </summary>
    /// <param name="deliveryLog">Delivery log with updated properties</param>
    /// <returns>Updated delivery log</returns>
    Task<NotificationDeliveryLog> UpdateDeliveryLogAsync(NotificationDeliveryLog deliveryLog);

    /// <summary>
    /// Searches communication logs based on specified criteria.
    /// </summary>
    /// <param name="searchRequest">Search parameters and filters</param>
    /// <returns>Collection of communication logs matching the search criteria</returns>
    Task<IEnumerable<CommunicationLog>> SearchCommunicationLogsAsync(CommunicationAuditSearchRequest searchRequest);

    /// <summary>
    /// Gets the total count of communication logs matching the search criteria.
    /// </summary>
    /// <param name="searchRequest">Search parameters for filtering</param>
    /// <returns>Total number of logs matching the criteria</returns>
    Task<int> GetCommunicationCountAsync(CommunicationAuditSearchRequest searchRequest);

    /// <summary>
    /// Retrieves communication logs for a specific order.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="includeDeliveryLogs">Whether to include delivery status logs</param>
    /// <returns>Collection of communication logs for the order</returns>
    Task<IEnumerable<CommunicationLog>> GetOrderCommunicationHistoryAsync(Guid orderId, bool includeDeliveryLogs = true);

    /// <summary>
    /// Retrieves a specific communication log by its ID.
    /// </summary>
    /// <param name="logId">Unique identifier of the communication log</param>
    /// <returns>Communication log if found, null otherwise</returns>
    Task<CommunicationLog?> GetCommunicationLogByIdAsync(Guid logId);

    /// <summary>
    /// Retrieves communication log by external message ID.
    /// </summary>
    /// <param name="externalMessageId">External provider message identifier</param>
    /// <returns>Communication log if found, null otherwise</returns>
    Task<CommunicationLog?> GetCommunicationLogByExternalIdAsync(string externalMessageId);

    /// <summary>
    /// Retrieves delivery logs for a specific communication.
    /// </summary>
    /// <param name="communicationLogId">Communication log identifier</param>
    /// <returns>Collection of delivery status logs</returns>
    Task<IEnumerable<NotificationDeliveryLog>> GetDeliveryLogsAsync(Guid communicationLogId);

    /// <summary>
    /// Creates a message audit trail entry.
    /// </summary>
    /// <param name="auditTrail">Message audit trail entity to create</param>
    /// <returns>Created audit trail with generated ID</returns>
    Task<MessageAuditTrail> CreateMessageAuditTrailAsync(MessageAuditTrail auditTrail);

    /// <summary>
    /// Creates a message edit record.
    /// </summary>
    /// <param name="messageEdit">Message edit entity to create</param>
    /// <returns>Created message edit with generated ID</returns>
    Task<MessageEdit> CreateMessageEditAsync(MessageEdit messageEdit);

    /// <summary>
    /// Retrieves message audit trail by message ID.
    /// </summary>
    /// <param name="messageId">Message identifier</param>
    /// <returns>Message audit trail if found, null otherwise</returns>
    Task<MessageAuditTrail?> GetMessageAuditTrailAsync(Guid messageId);

    /// <summary>
    /// Retrieves edit history for a specific message.
    /// </summary>
    /// <param name="messageId">Message identifier</param>
    /// <returns>Collection of message edit records ordered by edit date</returns>
    Task<IEnumerable<MessageEdit>> GetMessageEditHistoryAsync(Guid messageId);
}