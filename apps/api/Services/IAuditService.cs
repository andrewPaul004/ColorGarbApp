using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for audit logging operations.
/// Handles tracking of role-based access attempts and other security events.
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Logs a role-based access attempt for audit purposes.
    /// </summary>
    /// <param name="userId">ID of the user attempting access</param>
    /// <param name="userRole">User's role at the time of access</param>
    /// <param name="resource">Resource being accessed</param>
    /// <param name="httpMethod">HTTP method used</param>
    /// <param name="accessGranted">Whether access was granted</param>
    /// <param name="organizationId">Organization context (if applicable)</param>
    /// <param name="ipAddress">User's IP address</param>
    /// <param name="userAgent">User agent string</param>
    /// <param name="details">Additional details about the access attempt</param>
    /// <param name="sessionId">Session ID (if available)</param>
    /// <returns>Task representing the audit logging operation</returns>
    Task LogRoleAccessAttemptAsync(
        Guid userId,
        UserRole userRole,
        string resource,
        string httpMethod,
        bool accessGranted,
        Guid? organizationId = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? details = null,
        string? sessionId = null);

    /// <summary>
    /// Retrieves audit log entries for a specific user.
    /// </summary>
    /// <param name="userId">User ID to retrieve audit logs for</param>
    /// <param name="startDate">Start date for the audit log query (optional)</param>
    /// <param name="endDate">End date for the audit log query (optional)</param>
    /// <param name="accessGrantedFilter">Filter by access granted status (optional)</param>
    /// <param name="pageNumber">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of items per page</param>
    /// <returns>Paginated list of audit log entries</returns>
    Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetUserAuditLogsAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        int pageNumber = 1,
        int pageSize = 50);

    /// <summary>
    /// Retrieves audit log entries for a specific organization.
    /// </summary>
    /// <param name="organizationId">Organization ID to retrieve audit logs for</param>
    /// <param name="startDate">Start date for the audit log query (optional)</param>
    /// <param name="endDate">End date for the audit log query (optional)</param>
    /// <param name="accessGrantedFilter">Filter by access granted status (optional)</param>
    /// <param name="pageNumber">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of items per page</param>
    /// <returns>Paginated list of audit log entries</returns>
    Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetOrganizationAuditLogsAsync(
        Guid organizationId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        int pageNumber = 1,
        int pageSize = 50);

    /// <summary>
    /// Retrieves all audit log entries (ColorGarb staff only).
    /// </summary>
    /// <param name="startDate">Start date for the audit log query (optional)</param>
    /// <param name="endDate">End date for the audit log query (optional)</param>
    /// <param name="accessGrantedFilter">Filter by access granted status (optional)</param>
    /// <param name="userRole">Filter by user role (optional)</param>
    /// <param name="pageNumber">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of items per page</param>
    /// <returns>Paginated list of audit log entries</returns>
    Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetAllAuditLogsAsync(
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        UserRole? userRole = null,
        int pageNumber = 1,
        int pageSize = 50);

    /// <summary>
    /// Gets audit statistics for security monitoring.
    /// </summary>
    /// <param name="organizationId">Organization to get stats for (null for all)</param>
    /// <param name="startDate">Start date for statistics (optional)</param>
    /// <param name="endDate">End date for statistics (optional)</param>
    /// <returns>Audit statistics</returns>
    Task<AuditStatistics> GetAuditStatisticsAsync(
        Guid? organizationId = null,
        DateTime? startDate = null,
        DateTime? endDate = null);

    /// <summary>
    /// Logs a user role change for audit purposes.
    /// </summary>
    /// <param name="userId">ID of the user whose role was changed</param>
    /// <param name="changedByUserId">ID of the user who made the change</param>
    /// <param name="previousRole">Previous role</param>
    /// <param name="newRole">New role</param>
    /// <param name="reason">Reason for the change</param>
    /// <returns>Task representing the audit logging operation</returns>
    Task LogRoleChangeAsync(
        string userId,
        string changedByUserId,
        string previousRole,
        string newRole,
        string? reason = null);

    /// <summary>
    /// Logs a user status change for audit purposes.
    /// </summary>
    /// <param name="userId">ID of the user whose status was changed</param>
    /// <param name="changedByUserId">ID of the user who made the change</param>
    /// <param name="previousStatus">Previous active status</param>
    /// <param name="newStatus">New active status</param>
    /// <param name="reason">Reason for the change</param>
    /// <returns>Task representing the audit logging operation</returns>
    Task LogStatusChangeAsync(
        string userId,
        string changedByUserId,
        bool previousStatus,
        bool newStatus,
        string? reason = null);
}

/// <summary>
/// Audit statistics for security monitoring and reporting.
/// </summary>
public class AuditStatistics
{
    /// <summary>
    /// Total number of access attempts
    /// </summary>
    public int TotalAttempts { get; set; }

    /// <summary>
    /// Number of successful access attempts
    /// </summary>
    public int SuccessfulAttempts { get; set; }

    /// <summary>
    /// Number of failed access attempts
    /// </summary>
    public int FailedAttempts { get; set; }

    /// <summary>
    /// Success rate as a percentage
    /// </summary>
    public double SuccessRate => TotalAttempts > 0 ? (SuccessfulAttempts / (double)TotalAttempts) * 100 : 0;

    /// <summary>
    /// Number of unique users who made access attempts
    /// </summary>
    public int UniqueUsers { get; set; }

    /// <summary>
    /// Access attempts grouped by role
    /// </summary>
    public Dictionary<UserRole, int> AttemptsByRole { get; set; } = new();

    /// <summary>
    /// Access attempts grouped by hour of day
    /// </summary>
    public Dictionary<int, int> AttemptsByHour { get; set; } = new();

    /// <summary>
    /// Most frequently accessed resources
    /// </summary>
    public Dictionary<string, int> TopResources { get; set; } = new();

    /// <summary>
    /// Date range for the statistics
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// End date for the statistics
    /// </summary>
    public DateTime? EndDate { get; set; }
}