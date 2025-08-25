namespace ColorGarbApi.Services;

/// <summary>
/// Interface for integrating with external production tracking systems.
/// Provides synchronization between ColorGarb and existing production workflows.
/// </summary>
public interface IProductionTrackingService
{
    /// <summary>
    /// Synchronizes order stage update with external production tracking system.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="orderNumber">Human-readable order number</param>
    /// <param name="previousStage">Previous manufacturing stage</param>
    /// <param name="newStage">New manufacturing stage</param>
    /// <param name="updatedBy">User ID who made the update</param>
    /// <returns>Production tracking sync result</returns>
    Task<ProductionSyncResult> SyncOrderStageUpdateAsync(
        Guid orderId,
        string orderNumber,
        string previousStage,
        string newStage,
        string updatedBy);

    /// <summary>
    /// Synchronizes ship date update with external production tracking system.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="orderNumber">Human-readable order number</param>
    /// <param name="previousShipDate">Previous ship date</param>
    /// <param name="newShipDate">New ship date</param>
    /// <param name="reason">Reason for the ship date change</param>
    /// <param name="updatedBy">User ID who made the update</param>
    /// <returns>Production tracking sync result</returns>
    Task<ProductionSyncResult> SyncShipDateUpdateAsync(
        Guid orderId,
        string orderNumber,
        DateTime previousShipDate,
        DateTime newShipDate,
        string reason,
        string updatedBy);

    /// <summary>
    /// Checks the health of the external production tracking system.
    /// </summary>
    /// <returns>Health check result</returns>
    Task<ProductionSystemHealthResult> CheckSystemHealthAsync();

    /// <summary>
    /// Retrieves production status from external system for verification.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <returns>External production status information</returns>
    Task<ExternalProductionStatus?> GetExternalProductionStatusAsync(Guid orderId);
}

/// <summary>
/// Result of synchronizing data with external production tracking system.
/// </summary>
public class ProductionSyncResult
{
    /// <summary>
    /// Whether the synchronization was successful
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// Error message if synchronization failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// External system response details
    /// </summary>
    public string? ExternalResponse { get; set; }

    /// <summary>
    /// Timestamp when synchronization was attempted
    /// </summary>
    public DateTime SyncAttemptTime { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// External system's unique identifier for this order (if available)
    /// </summary>
    public string? ExternalOrderId { get; set; }

    /// <summary>
    /// Whether this operation should be retried
    /// </summary>
    public bool ShouldRetry { get; set; }

    /// <summary>
    /// Creates a successful sync result
    /// </summary>
    public static ProductionSyncResult Success(string? externalResponse = null, string? externalOrderId = null)
    {
        return new ProductionSyncResult
        {
            IsSuccess = true,
            ExternalResponse = externalResponse,
            ExternalOrderId = externalOrderId
        };
    }

    /// <summary>
    /// Creates a failed sync result
    /// </summary>
    public static ProductionSyncResult Failure(string errorMessage, bool shouldRetry = false, string? externalResponse = null)
    {
        return new ProductionSyncResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage,
            ShouldRetry = shouldRetry,
            ExternalResponse = externalResponse
        };
    }
}

/// <summary>
/// Health status of the external production tracking system.
/// </summary>
public class ProductionSystemHealthResult
{
    /// <summary>
    /// Whether the external system is healthy and accessible
    /// </summary>
    public bool IsHealthy { get; set; }

    /// <summary>
    /// Response time in milliseconds
    /// </summary>
    public int ResponseTimeMs { get; set; }

    /// <summary>
    /// System status message
    /// </summary>
    public string StatusMessage { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp of the health check
    /// </summary>
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Additional system information
    /// </summary>
    public Dictionary<string, string> SystemInfo { get; set; } = new();
}

/// <summary>
/// Production status information from external system.
/// </summary>
public class ExternalProductionStatus
{
    /// <summary>
    /// External system's order identifier
    /// </summary>
    public string ExternalOrderId { get; set; } = string.Empty;

    /// <summary>
    /// Current stage in external system
    /// </summary>
    public string ExternalStage { get; set; } = string.Empty;

    /// <summary>
    /// Ship date in external system
    /// </summary>
    public DateTime? ExternalShipDate { get; set; }

    /// <summary>
    /// Last update timestamp in external system
    /// </summary>
    public DateTime LastUpdatedAt { get; set; }

    /// <summary>
    /// Whether external and internal systems are synchronized
    /// </summary>
    public bool IsInSync { get; set; }

    /// <summary>
    /// Additional metadata from external system
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();
}