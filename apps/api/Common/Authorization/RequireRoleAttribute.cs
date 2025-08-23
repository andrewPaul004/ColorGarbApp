using Microsoft.AspNetCore.Authorization;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Common.Authorization;

/// <summary>
/// Authorization attribute that requires specific user roles for access.
/// Supports multiple roles and organization-scoped access control.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireRoleAttribute : AuthorizeAttribute
{
    /// <summary>
    /// Creates a new RequireRole attribute for a single role.
    /// </summary>
    /// <param name="role">The required user role</param>
    public RequireRoleAttribute(UserRole role)
    {
        RequiredRoles = new[] { role };
        Policy = $"RequireRole_{role}";
    }

    /// <summary>
    /// Creates a new RequireRole attribute for multiple roles (user needs ANY of these roles).
    /// </summary>
    /// <param name="roles">Array of acceptable user roles</param>
    public RequireRoleAttribute(params UserRole[] roles)
    {
        RequiredRoles = roles;
        Policy = $"RequireRoles_{string.Join("_", roles.Select(r => r.ToString()))}";
    }

    /// <summary>
    /// The required user roles for access.
    /// </summary>
    public UserRole[] RequiredRoles { get; }

    /// <summary>
    /// Whether to require organization context for this endpoint.
    /// When true, users must have access to the specific organization.
    /// </summary>
    public bool RequireOrganization { get; set; } = true;

    /// <summary>
    /// Whether to allow ColorGarb staff to bypass organization restrictions.
    /// When true, ColorGarb staff can access any organization's data.
    /// </summary>
    public bool AllowCrossOrganization { get; set; } = true;
}

/// <summary>
/// Shorthand attribute for requiring Director role access.
/// </summary>
public class RequireDirectorAttribute : RequireRoleAttribute
{
    public RequireDirectorAttribute() : base(UserRole.Director) { }
}

/// <summary>
/// Shorthand attribute for requiring Finance role access.
/// </summary>
public class RequireFinanceAttribute : RequireRoleAttribute
{
    public RequireFinanceAttribute() : base(UserRole.Finance) { }
}

/// <summary>
/// Shorthand attribute for requiring ColorGarb Staff role access.
/// </summary>
public class RequireColorGarbStaffAttribute : RequireRoleAttribute
{
    public RequireColorGarbStaffAttribute() : base(UserRole.ColorGarbStaff)
    {
        RequireOrganization = false; // Staff can access across organizations
    }
}

/// <summary>
/// Attribute for endpoints that require either Director or Finance role.
/// </summary>
public class RequireOrganizationAccessAttribute : RequireRoleAttribute
{
    public RequireOrganizationAccessAttribute() : base(UserRole.Director, UserRole.Finance) { }
}