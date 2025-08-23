using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for audit logging operations.
/// Handles tracking of role-based access attempts and other security events.
/// </summary>
public class AuditService : IAuditService
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(ColorGarbDbContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task LogRoleAccessAttemptAsync(
        Guid userId,
        UserRole userRole,
        string resource,
        string httpMethod,
        bool accessGranted,
        Guid? organizationId = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? details = null,
        string? sessionId = null)
    {
        try
        {
            var auditEntry = new RoleAccessAudit
            {
                UserId = userId,
                UserRole = userRole,
                Resource = resource,
                HttpMethod = httpMethod,
                AccessGranted = accessGranted,
                OrganizationId = organizationId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Details = details,
                SessionId = sessionId,
                Timestamp = DateTime.UtcNow
            };

            _context.RoleAccessAudits.Add(auditEntry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Audit entry logged for user {UserId}: {Resource} - {AccessResult}",
                userId, resource, accessGranted ? "GRANTED" : "DENIED");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log audit entry for user {UserId}: {Resource}", userId, resource);
            // Don't throw - audit logging failures shouldn't break the main operation
        }
    }

    /// <inheritdoc />
    public async Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetUserAuditLogsAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        int pageNumber = 1,
        int pageSize = 50)
    {
        var query = _context.RoleAccessAudits
            .Where(a => a.UserId == userId);

        query = ApplyFilters(query, startDate, endDate, accessGrantedFilter);

        var totalCount = await query.CountAsync();

        var audits = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Include(a => a.User)
            .Include(a => a.Organization)
            .ToListAsync();

        return (audits, totalCount);
    }

    /// <inheritdoc />
    public async Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetOrganizationAuditLogsAsync(
        Guid organizationId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        int pageNumber = 1,
        int pageSize = 50)
    {
        var query = _context.RoleAccessAudits
            .Where(a => a.OrganizationId == organizationId);

        query = ApplyFilters(query, startDate, endDate, accessGrantedFilter);

        var totalCount = await query.CountAsync();

        var audits = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Include(a => a.User)
            .Include(a => a.Organization)
            .ToListAsync();

        return (audits, totalCount);
    }

    /// <inheritdoc />
    public async Task<(IEnumerable<RoleAccessAudit> audits, int totalCount)> GetAllAuditLogsAsync(
        DateTime? startDate = null,
        DateTime? endDate = null,
        bool? accessGrantedFilter = null,
        UserRole? userRole = null,
        int pageNumber = 1,
        int pageSize = 50)
    {
        var query = _context.RoleAccessAudits.AsQueryable();

        query = ApplyFilters(query, startDate, endDate, accessGrantedFilter);

        if (userRole.HasValue)
        {
            query = query.Where(a => a.UserRole == userRole.Value);
        }

        var totalCount = await query.CountAsync();

        var audits = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Include(a => a.User)
            .Include(a => a.Organization)
            .ToListAsync();

        return (audits, totalCount);
    }

    /// <inheritdoc />
    public async Task<AuditStatistics> GetAuditStatisticsAsync(
        Guid? organizationId = null,
        DateTime? startDate = null,
        DateTime? endDate = null)
    {
        var query = _context.RoleAccessAudits.AsQueryable();

        if (organizationId.HasValue)
        {
            query = query.Where(a => a.OrganizationId == organizationId.Value);
        }

        query = ApplyFilters(query, startDate, endDate, null);

        var audits = await query.ToListAsync();

        var statistics = new AuditStatistics
        {
            TotalAttempts = audits.Count,
            SuccessfulAttempts = audits.Count(a => a.AccessGranted),
            FailedAttempts = audits.Count(a => !a.AccessGranted),
            UniqueUsers = audits.Select(a => a.UserId).Distinct().Count(),
            StartDate = startDate,
            EndDate = endDate
        };

        // Group by role
        statistics.AttemptsByRole = audits
            .GroupBy(a => a.UserRole)
            .ToDictionary(g => g.Key, g => g.Count());

        // Group by hour of day
        statistics.AttemptsByHour = audits
            .GroupBy(a => a.Timestamp.Hour)
            .ToDictionary(g => g.Key, g => g.Count());

        // Top resources
        statistics.TopResources = audits
            .GroupBy(a => a.Resource)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .ToDictionary(g => g.Key, g => g.Count());

        return statistics;
    }

    /// <summary>
    /// Applies common filters to audit log queries.
    /// </summary>
    /// <param name="query">Base query to filter</param>
    /// <param name="startDate">Start date filter</param>
    /// <param name="endDate">End date filter</param>
    /// <param name="accessGrantedFilter">Access granted filter</param>
    /// <returns>Filtered query</returns>
    private static IQueryable<RoleAccessAudit> ApplyFilters(
        IQueryable<RoleAccessAudit> query,
        DateTime? startDate,
        DateTime? endDate,
        bool? accessGrantedFilter)
    {
        if (startDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= endDate.Value);
        }

        if (accessGrantedFilter.HasValue)
        {
            query = query.Where(a => a.AccessGranted == accessGrantedFilter.Value);
        }

        return query;
    }

    /// <inheritdoc />
    public async Task LogRoleChangeAsync(
        string userId,
        string changedByUserId,
        string previousRole,
        string newRole,
        string? reason = null)
    {
        try
        {
            var auditEntry = new RoleAccessAudit
            {
                UserId = Guid.Parse(userId),
                UserRole = UserRole.ColorGarbStaff, // The person making the change (admin)
                Resource = $"User Role Change - User {userId}",
                HttpMethod = "ADMIN_ACTION",
                AccessGranted = true,
                Details = $"Role changed from {previousRole} to {newRole} by {changedByUserId}. Reason: {reason ?? "No reason provided"}",
                IpAddress = null, // Could be enhanced to capture admin's IP
                UserAgent = "Admin Interface",
                SessionId = changedByUserId,
                Timestamp = DateTime.UtcNow
            };

            _context.RoleAccessAudits.Add(auditEntry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Role change audit logged for user {UserId}: {PreviousRole} -> {NewRole} by {ChangedByUserId}",
                userId, previousRole, newRole, changedByUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log role change audit for user {UserId}", userId);
            // Don't throw - audit logging should not break the main operation
        }
    }

    /// <inheritdoc />
    public async Task LogStatusChangeAsync(
        string userId,
        string changedByUserId,
        bool previousStatus,
        bool newStatus,
        string? reason = null)
    {
        try
        {
            var auditEntry = new RoleAccessAudit
            {
                UserId = Guid.Parse(userId),
                UserRole = UserRole.ColorGarbStaff, // The person making the change (admin)
                Resource = $"User Status Change - User {userId}",
                HttpMethod = "ADMIN_ACTION",
                AccessGranted = true,
                Details = $"Status changed from {(previousStatus ? "Active" : "Inactive")} to {(newStatus ? "Active" : "Inactive")} by {changedByUserId}. Reason: {reason ?? "No reason provided"}",
                IpAddress = null, // Could be enhanced to capture admin's IP
                UserAgent = "Admin Interface",
                SessionId = changedByUserId,
                Timestamp = DateTime.UtcNow
            };

            _context.RoleAccessAudits.Add(auditEntry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Status change audit logged for user {UserId}: {PreviousStatus} -> {NewStatus} by {ChangedByUserId}",
                userId, previousStatus ? "Active" : "Inactive", newStatus ? "Active" : "Inactive", changedByUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log status change audit for user {UserId}", userId);
            // Don't throw - audit logging should not break the main operation
        }
    }
}