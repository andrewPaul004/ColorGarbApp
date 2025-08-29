using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for communication audit trail business logic operations.
/// Provides high-level operations for logging, searching, and reporting on communications.
/// </summary>
public interface ICommunicationAuditService
{
    /// <summary>
    /// Logs a communication event with comprehensive audit tracking.
    /// </summary>
    /// <param name="log">Communication log details</param>
    /// <returns>Created communication log with audit trail</returns>
    Task<CommunicationLog> LogCommunicationAsync(CommunicationLog log);

    /// <summary>
    /// Updates the delivery status of a communication based on external provider webhook.
    /// </summary>
    /// <param name="externalId">External provider message identifier</param>
    /// <param name="status">New delivery status</param>
    /// <param name="statusDetails">Additional status information</param>
    /// <param name="webhookData">Raw webhook data from provider</param>
    /// <returns>Updated notification delivery log</returns>
    Task<NotificationDeliveryLog> UpdateDeliveryStatusAsync(string externalId, string status, 
        string? statusDetails = null, string? webhookData = null);

    /// <summary>
    /// Searches communication logs with advanced filtering and organization isolation.
    /// </summary>
    /// <param name="searchRequest">Search parameters and filters</param>
    /// <returns>Paginated search results with audit trail data</returns>
    Task<CommunicationAuditResult> SearchCommunicationLogsAsync(CommunicationAuditSearchRequest searchRequest);

    /// <summary>
    /// Retrieves complete communication history for a specific order.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="organizationId">Organization ID for access control</param>
    /// <returns>Complete communication timeline for the order</returns>
    Task<IEnumerable<CommunicationLog>> GetOrderCommunicationHistoryAsync(Guid orderId, Guid? organizationId = null);

    /// <summary>
    /// Generates delivery status summary for reporting purposes.
    /// </summary>
    /// <param name="organizationId">Organization ID for the summary</param>
    /// <param name="from">Start date for the report</param>
    /// <param name="to">End date for the report</param>
    /// <returns>Aggregated delivery status statistics</returns>
    Task<DeliveryStatusSummary> GetDeliveryStatusSummaryAsync(Guid organizationId, DateTimeOffset from, DateTimeOffset to);

    /// <summary>
    /// Creates a message audit trail with IP address and user agent tracking.
    /// </summary>
    /// <param name="messageId">Message identifier</param>
    /// <param name="ipAddress">Client IP address</param>
    /// <param name="userAgent">Client user agent string</param>
    /// <returns>Created message audit trail</returns>
    Task<MessageAuditTrail> CreateMessageAuditTrailAsync(Guid messageId, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// Records a message edit event for audit purposes.
    /// </summary>
    /// <param name="messageId">Message identifier</param>
    /// <param name="editedBy">User who made the edit</param>
    /// <param name="previousContent">Content before the edit</param>
    /// <param name="changeReason">Reason for the edit (optional)</param>
    /// <returns>Created message edit record</returns>
    Task<MessageEdit> RecordMessageEditAsync(Guid messageId, Guid editedBy, string previousContent, string? changeReason = null);

    /// <summary>
    /// Retrieves complete edit history for a message.
    /// </summary>
    /// <param name="messageId">Message identifier</param>
    /// <returns>Chronological list of message edits</returns>
    Task<IEnumerable<MessageEdit>> GetMessageEditHistoryAsync(Guid messageId);

    /// <summary>
    /// Validates user access to communication audit data based on role and organization.
    /// </summary>
    /// <param name="userId">User requesting access</param>
    /// <param name="organizationId">Organization context for the request</param>
    /// <returns>True if access is authorized</returns>
    Task<bool> ValidateAuditAccessAsync(Guid userId, Guid? organizationId = null);
}

