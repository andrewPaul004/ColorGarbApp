using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Common.Authorization;
using ColorGarbApi.Services;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace ColorGarbApi.Controllers;

/// <summary>
/// User management controller for administrative operations.
/// Provides endpoints for managing user roles, status, and organization assignments.
/// All endpoints require ColorGarb staff authorization.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<UsersController> _logger;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;

    public UsersController(
        ColorGarbDbContext context,
        ILogger<UsersController> logger,
        IAuditService auditService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
        _configuration = configuration;
    }

    /// <summary>
    /// Retrieves all users with their organization information.
    /// Only accessible by ColorGarb staff members.
    /// </summary>
    /// <returns>List of all users in the system</returns>
    /// <response code="200">Users retrieved successfully</response>
    /// <response code="403">Access denied - ColorGarb staff role required</response>
    [HttpGet]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _context.Users
                .Include(u => u.Organization)
                .Select(u => new UserDetailsDto
                {
                    Id = u.Id.ToString(),
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.GetRoleString(),
                    OrganizationId = u.OrganizationId != null ? u.OrganizationId.ToString() : null,
                    OrganizationName = u.Organization != null ? u.Organization.Name : null,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .OrderBy(u => u.Name)
                .ToListAsync();

            _logger.LogInformation("Retrieved {UserCount} users", users.Count);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users");
            return StatusCode(500, new { message = "An error occurred while retrieving users" });
        }
    }

    /// <summary>
    /// Updates a user's role assignment.
    /// Only ColorGarb staff can assign roles to users.
    /// Includes audit logging for role changes.
    /// </summary>
    /// <param name="userId">ID of the user to update</param>
    /// <param name="request">Role update request containing new role</param>
    /// <returns>Updated user information</returns>
    /// <response code="200">Role updated successfully</response>
    /// <response code="400">Invalid role or request data</response>
    /// <response code="403">Access denied - ColorGarb staff role required</response>
    /// <response code="404">User not found</response>
    [HttpPatch("{userId:guid}/role")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateUserRoleRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Role))
            {
                return BadRequest(new { message = "Role is required" });
            }

            // Validate role enum
            if (!Enum.TryParse<UserRole>(request.Role, true, out var newRole))
            {
                return BadRequest(new { message = "Invalid role specified" });
            }

            // Find user
            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Prevent self-role changes for security
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == userId.ToString())
            {
                return BadRequest(new { message = "Cannot modify your own role" });
            }

            var previousRole = user.Role;

            // Update role
            user.Role = newRole;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log role change for audit
            await _auditService.LogRoleChangeAsync(
                userId.ToString(),
                currentUserId!,
                previousRole.GetRoleString(),
                newRole.GetRoleString(),
                request.Reason
            );

            _logger.LogInformation("User {UserId} role changed from {PreviousRole} to {NewRole} by {AdminUserId}",
                userId, previousRole, newRole, currentUserId);

            return Ok(new UserDetailsDto
            {
                Id = user.Id.ToString(),
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.GetRoleString(),
                OrganizationId = user.OrganizationId?.ToString(),
                OrganizationName = user.Organization?.Name,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user role for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while updating user role" });
        }
    }

    /// <summary>
    /// Toggles a user's active status (enable/disable account).
    /// Only ColorGarb staff can change user status.
    /// Includes audit logging for status changes.
    /// </summary>
    /// <param name="userId">ID of the user to update</param>
    /// <param name="request">Status update request</param>
    /// <returns>Updated user information</returns>
    /// <response code="200">Status updated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="403">Access denied - ColorGarb staff role required</response>
    /// <response code="404">User not found</response>
    [HttpPatch("{userId:guid}/status")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus(Guid userId, [FromBody] UpdateUserStatusRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Status update data is required" });
            }

            // Find user
            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Prevent self-status changes for security
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == userId.ToString())
            {
                return BadRequest(new { message = "Cannot modify your own account status" });
            }

            var previousStatus = user.IsActive;

            // Update status
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log status change for audit
            await _auditService.LogStatusChangeAsync(
                userId.ToString(),
                currentUserId!,
                previousStatus,
                request.IsActive,
                request.Reason
            );

            _logger.LogInformation("User {UserId} status changed from {PreviousStatus} to {NewStatus} by {AdminUserId}",
                userId, previousStatus ? "Active" : "Inactive", request.IsActive ? "Active" : "Inactive", currentUserId);

            return Ok(new UserDetailsDto
            {
                Id = user.Id.ToString(),
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.GetRoleString(),
                OrganizationId = user.OrganizationId?.ToString(),
                OrganizationName = user.Organization?.Name,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user status for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while updating user status" });
        }
    }

    /// <summary>
    /// Retrieves users by organization ID.
    /// Directors and Finance users can only see users from their own organization.
    /// ColorGarb staff can see users from any organization.
    /// </summary>
    /// <param name="organizationId">ID of the organization</param>
    /// <returns>List of users in the specified organization</returns>
    /// <response code="200">Users retrieved successfully</response>
    /// <response code="403">Access denied</response>
    /// <response code="404">Organization not found</response>
    [HttpGet("organization/{organizationId:guid}")]
    [RequireRole(UserRole.Director, UserRole.Finance, UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUsersByOrganization(Guid organizationId)
    {
        try
        {
            // Verify organization exists
            var organization = await _context.Organizations
                .FirstOrDefaultAsync(o => o.Id == organizationId);

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found" });
            }

            // Check authorization - users can only see their own organization unless they're ColorGarb staff
            var currentUserRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var currentUserOrgId = User.FindFirst("OrganizationId")?.Value;

            if (currentUserRole != UserRole.ColorGarbStaff.GetRoleString() &&
                currentUserOrgId != organizationId.ToString())
            {
                return Forbid();
            }

            var users = await _context.Users
                .Where(u => u.OrganizationId == organizationId)
                .Select(u => new UserDetailsDto
                {
                    Id = u.Id.ToString(),
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.GetRoleString(),
                    OrganizationId = u.OrganizationId != null ? u.OrganizationId.ToString() : null,
                    OrganizationName = organization.Name,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .OrderBy(u => u.Name)
                .ToListAsync();

            _logger.LogInformation("Retrieved {UserCount} users for organization {OrganizationId}",
                users.Count, organizationId);

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users for organization {OrganizationId}", organizationId);
            return StatusCode(500, new { message = "An error occurred while retrieving users" });
        }
    }

    /// <summary>
    /// Updates the current user's profile information.
    /// Users can update their own name and email address.
    /// </summary>
    /// <param name="request">Profile update request containing new information</param>
    /// <returns>Updated user information with new JWT token</returns>
    /// <response code="200">Profile updated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="404">User not found</response>
    [HttpPut("profile")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Profile data is required" });
            }

            // Get current user ID from JWT claims
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserIdString) || !Guid.TryParse(currentUserIdString, out var currentUserId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Find user
            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == currentUserId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Update profile fields
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                user.Name = request.Name.Trim();
            }

            // Note: Email updates might require verification in a real system
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                // Check if email is already taken by another user
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.Email && u.Id != currentUserId);

                if (existingUser != null)
                {
                    return BadRequest(new { message = "Email address is already in use" });
                }

                user.Email = request.Email.Trim().ToLowerInvariant();
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} updated their profile", currentUserId);

            // Return updated user data with a new JWT token containing updated information
            var authResponse = new ColorGarbApi.Controllers.AuthTokenResponse
            {
                AccessToken = GenerateJwtToken(user), // You'll need to implement this or inject a service
                User = new ColorGarbApi.Controllers.UserInfo
                {
                    Id = user.Id.ToString(),
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.GetRoleString(),
                    OrganizationId = user.OrganizationId?.ToString()
                }
            };

            return Ok(authResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user");
            return StatusCode(500, new { message = "An error occurred while updating profile" });
        }
    }

    /// <summary>
    /// Generates a JWT token for the authenticated user
    /// </summary>
    /// <param name="user">User to generate token for</param>
    /// <returns>JWT token string</returns>
    private string GenerateJwtToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? "dev-secret-key-that-should-be-changed-in-production";
        var issuer = _configuration["Jwt:Issuer"] ?? "ColorGarbApi";
        var audience = _configuration["Jwt:Audience"] ?? "ColorGarbClient";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.GetRoleString()),
            new Claim("organizationId", user.OrganizationId?.ToString() ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>
/// Request model for updating user profile
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>
    /// Updated name for the user
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Updated email address for the user
    /// </summary>
    public string? Email { get; set; }
}

/// <summary>
/// Request model for updating user role
/// </summary>
public class UpdateUserRoleRequest
{
    /// <summary>
    /// New role to assign to the user
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Reason for the role change (for audit purposes)
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// Request model for updating user status
/// </summary>
public class UpdateUserStatusRequest
{
    /// <summary>
    /// New active status for the user
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Reason for the status change (for audit purposes)
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// Data transfer object for user details
/// </summary>
public class UserDetailsDto
{
    /// <summary>
    /// User's unique identifier
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// User's full name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's role in the system
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// User's organization ID
    /// </summary>
    public string? OrganizationId { get; set; }

    /// <summary>
    /// User's organization name
    /// </summary>
    public string? OrganizationName { get; set; }

    /// <summary>
    /// Whether the user account is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Last login timestamp
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Account creation timestamp
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}