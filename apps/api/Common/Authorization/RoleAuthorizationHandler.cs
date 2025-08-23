using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Common.Authorization;

/// <summary>
/// Authorization handler that validates role-based access requirements.
/// Implements organization-scoped security and cross-organization access for ColorGarb staff.
/// </summary>
public class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    private readonly ILogger<RoleAuthorizationHandler> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RoleAuthorizationHandler(
        ILogger<RoleAuthorizationHandler> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Handles role-based authorization requirements.
    /// </summary>
    /// <param name="context">Authorization context</param>
    /// <param name="requirement">Role requirement to validate</param>
    /// <returns>Task representing the authorization operation</returns>
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            _logger.LogWarning("No HTTP context available for authorization");
            context.Fail();
            return Task.CompletedTask;
        }

        // Get user claims
        var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRoleClaim = context.User?.FindFirst(ClaimTypes.Role)?.Value;
        var userOrgIdClaim = context.User?.FindFirst("OrganizationId")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(userRoleClaim))
        {
            _logger.LogWarning("User authentication claims missing for user {UserId}", userIdClaim);
            context.Fail();
            return Task.CompletedTask;
        }

        // Parse user role
        if (!Enum.TryParse<UserRole>(userRoleClaim, out var userRole))
        {
            _logger.LogWarning("Invalid user role {Role} for user {UserId}", userRoleClaim, userIdClaim);
            context.Fail();
            return Task.CompletedTask;
        }

        // Check if user has any of the required roles
        if (!requirement.RequiredRoles.Contains(userRole))
        {
            // Special case: Directors can access Finance-level resources
            if (userRole == UserRole.Director && requirement.RequiredRoles.Contains(UserRole.Finance))
            {
                // Allow Director to access Finance resources - continue to organization check
            }
            else
            {
                _logger.LogWarning("User {UserId} with role {UserRole} denied access to resource requiring roles {RequiredRoles}",
                    userIdClaim, userRole, string.Join(", ", requirement.RequiredRoles));

                // Log audit entry for failed access attempt
                LogAccessAttempt(userIdClaim, userRole, userOrgIdClaim, httpContext, false, "Insufficient role privileges");
                context.Fail();
                return Task.CompletedTask;
            }
        }

        // ColorGarb staff has cross-organization access
        if (userRole == UserRole.ColorGarbStaff)
        {
            _logger.LogInformation("ColorGarb staff user {UserId} granted cross-organization access", userIdClaim);
            LogAccessAttempt(userIdClaim, userRole, userOrgIdClaim, httpContext, true, "ColorGarb staff access");
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // For organization-scoped roles, validate organization access
        if (requirement.RequireOrganization)
        {
            var organizationAccessGranted = ValidateOrganizationAccess(
                userOrgIdClaim,
                httpContext,
                requirement.AllowCrossOrganization && userRole == UserRole.ColorGarbStaff);

            if (!organizationAccessGranted)
            {
                _logger.LogWarning("User {UserId} denied organization access", userIdClaim);
                LogAccessAttempt(userIdClaim, userRole, userOrgIdClaim, httpContext, false, "Organization access denied");
                context.Fail();
                return Task.CompletedTask;
            }
        }

        _logger.LogInformation("User {UserId} with role {UserRole} granted access", userIdClaim, userRole);
        LogAccessAttempt(userIdClaim, userRole, userOrgIdClaim, httpContext, true, "Access granted");
        context.Succeed(requirement);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Validates organization-level access for the current request.
    /// </summary>
    /// <param name="userOrgId">User's organization ID</param>
    /// <param name="httpContext">Current HTTP context</param>
    /// <param name="allowCrossOrganization">Whether to allow cross-organization access</param>
    /// <returns>True if organization access is granted</returns>
    private bool ValidateOrganizationAccess(string? userOrgId, HttpContext httpContext, bool allowCrossOrganization)
    {
        // Extract organization ID from route parameters or query string
        var requestedOrgId = GetRequestedOrganizationId(httpContext);

        // If no specific organization is being accessed, allow access
        if (string.IsNullOrEmpty(requestedOrgId))
        {
            return true;
        }

        // If user has no organization (shouldn't happen for org-scoped roles), deny access
        if (string.IsNullOrEmpty(userOrgId))
        {
            return false;
        }

        // Check if user is accessing their own organization's data
        if (userOrgId.Equals(requestedOrgId, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Check if cross-organization access is allowed
        return allowCrossOrganization;
    }

    /// <summary>
    /// Extracts the organization ID being accessed from the current request.
    /// </summary>
    /// <param name="httpContext">Current HTTP context</param>
    /// <returns>Organization ID if found, null otherwise</returns>
    private string? GetRequestedOrganizationId(HttpContext httpContext)
    {
        // Check route parameters
        if (httpContext.Request.RouteValues.TryGetValue("organizationId", out var routeOrgId))
        {
            return routeOrgId?.ToString();
        }

        // Check query parameters
        if (httpContext.Request.Query.TryGetValue("organizationId", out var queryOrgId))
        {
            return queryOrgId.FirstOrDefault();
        }

        // For requests that modify data, check request body for organization context
        // This would be handled by middleware that sets the organization context

        return null;
    }

    /// <summary>
    /// Logs an access attempt for audit purposes.
    /// </summary>
    /// <param name="userId">User ID attempting access</param>
    /// <param name="userRole">User's role</param>
    /// <param name="userOrgId">User's organization ID</param>
    /// <param name="httpContext">HTTP context</param>
    /// <param name="accessGranted">Whether access was granted</param>
    /// <param name="details">Additional details about the access attempt</param>
    private void LogAccessAttempt(
        string userId,
        UserRole userRole,
        string? userOrgId,
        HttpContext httpContext,
        bool accessGranted,
        string details)
    {
        var auditEntry = new
        {
            UserId = userId,
            UserRole = userRole.ToString(),
            UserOrganizationId = userOrgId,
            Resource = $"{httpContext.Request.Method} {httpContext.Request.Path}",
            AccessGranted = accessGranted,
            Details = details,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            Timestamp = DateTime.UtcNow
        };

        if (accessGranted)
        {
            _logger.LogInformation("Role-based access granted: {@AuditEntry}", auditEntry);
        }
        else
        {
            _logger.LogWarning("Role-based access denied: {@AuditEntry}", auditEntry);
        }
    }
}

/// <summary>
/// Authorization requirement for role-based access control.
/// </summary>
public class RoleRequirement : IAuthorizationRequirement
{
    /// <summary>
    /// Creates a new role requirement.
    /// </summary>
    /// <param name="requiredRoles">Required user roles</param>
    /// <param name="requireOrganization">Whether organization context is required</param>
    /// <param name="allowCrossOrganization">Whether cross-organization access is allowed</param>
    public RoleRequirement(
        UserRole[] requiredRoles,
        bool requireOrganization = true,
        bool allowCrossOrganization = true)
    {
        RequiredRoles = requiredRoles ?? throw new ArgumentNullException(nameof(requiredRoles));
        RequireOrganization = requireOrganization;
        AllowCrossOrganization = allowCrossOrganization;
    }

    /// <summary>
    /// Required user roles for access.
    /// </summary>
    public UserRole[] RequiredRoles { get; }

    /// <summary>
    /// Whether organization context is required.
    /// </summary>
    public bool RequireOrganization { get; }

    /// <summary>
    /// Whether cross-organization access is allowed for ColorGarb staff.
    /// </summary>
    public bool AllowCrossOrganization { get; }
}