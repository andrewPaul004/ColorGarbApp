using System.ComponentModel;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Enum representing the different user roles in the ColorGarb system.
/// Each role has specific permissions and access levels.
/// </summary>
public enum UserRole
{
    /// <summary>
    /// Director role - Full access to organization's orders and data.
    /// Can view, modify, and manage all aspects of their organization.
    /// </summary>
    [Description("Director - Full access to organization data and operations")]
    Director = 1,

    /// <summary>
    /// Finance role - Limited access focused on payment and financial operations.
    /// Can view orders and manage payment-related activities.
    /// </summary>
    [Description("Finance User - Access to financial and payment operations")]
    Finance = 2,

    /// <summary>
    /// ColorGarb Staff role - Cross-organization access for order management.
    /// Can access and manage orders across all organizations.
    /// </summary>
    [Description("ColorGarb Staff - Cross-organization order management access")]
    ColorGarbStaff = 3
}

/// <summary>
/// Extension methods for UserRole enum to provide additional functionality.
/// </summary>
public static class UserRoleExtensions
{
    /// <summary>
    /// Gets the string representation of the user role.
    /// </summary>
    /// <param name="role">The user role enum value</param>
    /// <returns>String representation of the role</returns>
    public static string GetRoleString(this UserRole role)
    {
        return role switch
        {
            UserRole.Director => "Director",
            UserRole.Finance => "Finance",
            UserRole.ColorGarbStaff => "ColorGarbStaff",
            _ => throw new ArgumentOutOfRangeException(nameof(role), role, null)
        };
    }

    /// <summary>
    /// Checks if the user role has organization-level access.
    /// </summary>
    /// <param name="role">The user role to check</param>
    /// <returns>True if role is organization-scoped, false if system-wide</returns>
    public static bool IsOrganizationScoped(this UserRole role)
    {
        return role is UserRole.Director or UserRole.Finance;
    }

    /// <summary>
    /// Checks if the user role has cross-organization access.
    /// </summary>
    /// <param name="role">The user role to check</param>
    /// <returns>True if role can access multiple organizations</returns>
    public static bool HasCrossOrganizationAccess(this UserRole role)
    {
        return role == UserRole.ColorGarbStaff;
    }

    /// <summary>
    /// Gets the description attribute value for the role.
    /// </summary>
    /// <param name="role">The user role enum value</param>
    /// <returns>Description of the role</returns>
    public static string GetDescription(this UserRole role)
    {
        var field = role.GetType().GetField(role.ToString());
        var attribute = field?.GetCustomAttributes(typeof(DescriptionAttribute), false)
                              .FirstOrDefault() as DescriptionAttribute;
        return attribute?.Description ?? role.ToString();
    }
}