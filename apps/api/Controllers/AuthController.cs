using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Authentication controller handling user login, logout, and token management.
/// Provides secure JWT-based authentication with account lockout protection.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ColorGarbDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;
    private readonly IEmailService _emailService;

    /// <summary>
    /// Maximum failed login attempts before account lockout
    /// </summary>
    private const int MaxFailedAttempts = 5;

    /// <summary>
    /// Account lockout duration in minutes
    /// </summary>
    private const int LockoutDurationMinutes = 15;

    public AuthController(
        ColorGarbDbContext context,
        IConfiguration configuration,
        ILogger<AuthController> logger,
        IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _emailService = emailService;
    }

    /// <summary>
    /// Authenticates user with email and password credentials.
    /// Returns JWT token with user information on successful authentication.
    /// Implements account lockout protection against brute force attacks.
    /// </summary>
    /// <param name="request">Login credentials containing email and password</param>
    /// <returns>Authentication token and user information</returns>
    /// <response code="200">Login successful, returns token and user data</response>
    /// <response code="400">Invalid request format or missing credentials</response>
    /// <response code="401">Invalid email or password</response>
    /// <response code="403">Account is locked due to too many failed attempts</response>
    /// <response code="429">Too many login attempts, rate limiting applied</response>
    [HttpPost("login")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            // Normalize email by trimming whitespace
            var normalizedEmail = request.Email.Trim();

            // Find user by email
            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail.ToLower());

            if (user == null)
            {
                _logger.LogWarning("Login attempt with non-existent email: {Email}", request.Email);
                await Task.Delay(1000); // Prevent timing attacks
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Check if account is locked
            if (await IsAccountLocked(normalizedEmail))
            {
                var remainingTime = await GetLockoutRemainingTime(normalizedEmail);
                await RecordLoginAttempt(normalizedEmail, false, "Account locked");

                _logger.LogWarning("Login attempt on locked account: {Email}", request.Email);
                return StatusCode(403, new
                {
                    message = $"Account is temporarily locked due to multiple failed login attempts. Please try again in {remainingTime} minutes.",
                    lockoutTime = remainingTime
                });
            }

            // Verify password (assuming PasswordHash contains BCrypt hash)
            if (!VerifyPassword(request.Password, user.PasswordHash))
            {
                await RecordLoginAttempt(normalizedEmail, false, "Invalid password");
                _logger.LogWarning("Failed login attempt for user: {UserId}", user.Id);
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Check if user account is active
            if (!user.IsActive)
            {
                _logger.LogWarning("Login attempt on inactive account: {UserId}", user.Id);
                return StatusCode(403, new { message = "Account is disabled. Please contact support." });
            }

            // Record successful login attempt
            await RecordLoginAttempt(normalizedEmail, true, "Login successful");

            // Update last login timestamp
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Clean up old login attempts periodically
            if (new Random().Next(100) < 5) // 5% chance to run cleanup
            {
                _ = Task.Run(() => CleanupOldLoginAttempts());
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);

            _logger.LogInformation("Successful login for user: {UserId}", user.Id);

            return Ok(new AuthTokenResponse
            {
                AccessToken = token,
                TokenType = "Bearer",
                ExpiresIn = 3600, // 1 hour
                User = new UserInfo
                {
                    Id = user.Id.ToString(),
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role.GetRoleString(),
                    OrganizationId = user.OrganizationId?.ToString()
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login attempt for email: {Email}", request.Email);
            return StatusCode(500, new { message = $"An error occurred during login: {ex.Message}" });
        }
    }

    /// <summary>
    /// Initiates password reset process by sending reset email.
    /// Creates a secure reset token and sends it via email.
    /// </summary>
    /// <param name="request">Password reset request containing user email</param>
    /// <returns>Success confirmation (always returns success to prevent email enumeration)</returns>
    /// <response code="200">Reset email sent (or would be sent if email exists)</response>
    /// <response code="400">Invalid request format</response>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] PasswordResetRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            // Normalize email by trimming whitespace
            var normalizedEmail = request.Email.Trim();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail.ToLower());

            if (user != null && user.IsActive)
            {
                // Generate secure reset token
                var resetToken = GenerateSecureToken();
                var tokenHash = BCrypt.Net.BCrypt.HashPassword(resetToken, 12);
                var expiryTime = DateTime.UtcNow.AddHours(1); // Token expires in 1 hour

                // Store reset token in database with expiry
                var passwordResetToken = new PasswordResetToken
                {
                    Id = Guid.NewGuid(),
                    TokenHash = tokenHash,
                    UserId = user.Id,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = expiryTime,
                    RequestIpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };

                _context.PasswordResetTokens.Add(passwordResetToken);
                await _context.SaveChangesAsync();

                // Send reset email with token
                await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken, user.Name);

                _logger.LogInformation("Password reset requested for user: {UserId}", user.Id);
            }

            // Always return success to prevent email enumeration attacks
            return Ok(new { message = "If the email exists, a password reset link has been sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset request for email: {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred processing your request" });
        }
    }

    /// <summary>
    /// Completes password reset process using secure token.
    /// Validates token and updates user password if valid.
    /// </summary>
    /// <param name="request">Password reset completion request containing token and new password</param>
    /// <returns>Success confirmation</returns>
    /// <response code="200">Password reset successful</response>
    /// <response code="400">Invalid request format or token</response>
    /// <response code="401">Invalid or expired token</response>
    [HttpPost("reset-password")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "Token and new password are required" });
            }

            // Validate password strength
            if (request.NewPassword.Length < 8)
            {
                return BadRequest(new { message = "Password must be at least 8 characters long" });
            }

            // Find all valid, non-expired tokens and verify in memory
            var validTokens = await _context.PasswordResetTokens
                .Include(t => t.User)
                .Where(t => t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            var resetToken = validTokens.FirstOrDefault(t => BCrypt.Net.BCrypt.Verify(request.Token, t.TokenHash));

            if (resetToken == null)
            {
                _logger.LogWarning("Invalid or expired password reset token used");
                return Unauthorized(new { message = "Invalid or expired reset token" });
            }

            // Update user password
            resetToken.User.PasswordHash = HashPassword(request.NewPassword);
            resetToken.User.UpdatedAt = DateTime.UtcNow;

            // Mark token as used by removing it
            _context.PasswordResetTokens.Remove(resetToken);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password successfully reset for user: {UserId}", resetToken.User.Id);

            return Ok(new { message = "Password has been reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return StatusCode(500, new { message = "An error occurred during password reset" });
        }
    }

    /// <summary>
    /// Registers a new user with automatic role assignment based on organization type.
    /// Creates user account with appropriate default role and organization association.
    /// </summary>
    /// <param name="request">Registration details including user and organization information</param>
    /// <returns>Authentication token and user information for newly created user</returns>
    /// <response code="201">User registered successfully</response>
    /// <response code="400">Invalid request format or validation errors</response>
    /// <response code="409">Email already exists</response>
    /// <response code="500">Server error during registration</response>
    [HttpPost("register")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new { message = "Registration data is required" });
            }

            // Validate required fields
            var validationErrors = ValidateRegistrationRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(new { message = "Validation failed", errors = validationErrors });
            }

            // Normalize email
            var normalizedEmail = request.Email.Trim();

            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail.ToLower());

            if (existingUser != null)
            {
                _logger.LogWarning("Registration attempt with existing email: {Email}", request.Email);
                return Conflict(new { message = "Email address is already registered" });
            }

            // Find or create organization
            var organization = await FindOrCreateOrganization(request);

            // Determine default role based on organization type
            var defaultRole = DetermineDefaultRole(organization.Type, request.RequestedRole);

            // Create new user with default role
            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = HashPassword(request.Password),
                Role = defaultRole,
                OrganizationId = organization.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New user registered: {UserId} with role {Role} for organization {OrganizationId}",
                user.Id, user.Role, organization.Id);

            // Generate JWT token for immediate login
            var token = GenerateJwtToken(user);

            return StatusCode(201, new AuthTokenResponse
            {
                AccessToken = token,
                TokenType = "Bearer",
                ExpiresIn = 3600,
                User = new UserInfo
                {
                    Id = user.Id.ToString(),
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role.GetRoleString(),
                    OrganizationId = user.OrganizationId?.ToString()
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration for email: {Email}", request?.Email);
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }

    /// <summary>
    /// Refreshes an existing JWT token.
    /// Validates current token and issues a new one with extended expiry.
    /// </summary>
    /// <returns>New authentication token</returns>
    /// <response code="200">Token refreshed successfully</response>
    /// <response code="401">Invalid or expired token</response>
    [HttpPost("refresh")]
    [Authorize]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            var user = await _context.Users
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "User not found or inactive" });
            }

            // Generate new JWT token
            var token = GenerateJwtToken(user);

            _logger.LogInformation("Token refreshed for user: {UserId}", user.Id);

            return Ok(new AuthTokenResponse
            {
                AccessToken = token,
                TokenType = "Bearer",
                ExpiresIn = 3600, // 1 hour
                User = new UserInfo
                {
                    Id = user.Id.ToString(),
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role.GetRoleString(),
                    OrganizationId = user.OrganizationId?.ToString()
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return StatusCode(500, new { message = "An error occurred during token refresh" });
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

    /// <summary>
    /// Verifies password against stored hash using BCrypt
    /// </summary>
    /// <param name="password">Plain text password</param>
    /// <param name="hash">Stored password hash</param>
    /// <returns>True if password matches hash</returns>
    private bool VerifyPassword(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Hashes password using BCrypt with secure salt rounds
    /// </summary>
    /// <param name="password">Plain text password</param>
    /// <returns>BCrypt hashed password</returns>
    public static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, 12); // 12 rounds for strong security
    }

    /// <summary>
    /// Checks if email address is currently locked due to failed login attempts
    /// </summary>
    /// <param name="email">Email address to check</param>
    /// <returns>True if email is locked</returns>
    private async Task<bool> IsAccountLocked(string email)
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-LockoutDurationMinutes);

        // Get failed attempts within the lockout window
        var failedAttempts = await _context.LoginAttempts
            .Where(la => la.Email.ToLower() == email.ToLower()
                        && !la.IsSuccessful
                        && la.AttemptedAt > cutoffTime)
            .CountAsync();

        return failedAttempts >= MaxFailedAttempts;
    }

    /// <summary>
    /// Records a login attempt for security tracking
    /// </summary>
    /// <param name="email">Email address of the attempt</param>
    /// <param name="isSuccessful">Whether the attempt was successful</param>
    /// <param name="details">Additional details about the attempt</param>
    private async Task RecordLoginAttempt(string email, bool isSuccessful, string? details = null)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var loginAttempt = new LoginAttempt
        {
            Email = email,
            IpAddress = ipAddress,
            IsSuccessful = isSuccessful,
            UserAgent = userAgent,
            Details = details,
            AttemptedAt = DateTime.UtcNow
        };

        _context.LoginAttempts.Add(loginAttempt);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Gets remaining lockout time for email address
    /// </summary>
    /// <param name="email">Email address to check</param>
    /// <returns>Remaining lockout time in minutes</returns>
    private async Task<int> GetLockoutRemainingTime(string email)
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-LockoutDurationMinutes);

        var latestFailedAttempt = await _context.LoginAttempts
            .Where(la => la.Email.ToLower() == email.ToLower()
                        && !la.IsSuccessful
                        && la.AttemptedAt > cutoffTime)
            .OrderByDescending(la => la.AttemptedAt)
            .FirstOrDefaultAsync();

        if (latestFailedAttempt == null) return 0;

        var unlockTime = latestFailedAttempt.AttemptedAt.AddMinutes(LockoutDurationMinutes);
        var remainingMinutes = (unlockTime - DateTime.UtcNow).TotalMinutes;

        return Math.Max(0, (int)Math.Ceiling(remainingMinutes));
    }

    /// <summary>
    /// Cleans up old login attempts (older than 24 hours)
    /// </summary>
    private async Task CleanupOldLoginAttempts()
    {
        var cutoffDate = DateTime.UtcNow.AddHours(-24);

        var oldAttempts = _context.LoginAttempts
            .Where(la => la.AttemptedAt < cutoffDate);

        _context.LoginAttempts.RemoveRange(oldAttempts);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Generates a cryptographically secure random token
    /// </summary>
    /// <returns>Secure token string</returns>
    private string GenerateSecureToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    /// <summary>
    /// Validates registration request data
    /// </summary>
    /// <param name="request">Registration request to validate</param>
    /// <returns>List of validation errors</returns>
    private List<string> ValidateRegistrationRequest(RegisterRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Name))
            errors.Add("Name is required");

        if (string.IsNullOrWhiteSpace(request.Email))
            errors.Add("Email is required");
        else if (!IsValidEmail(request.Email))
            errors.Add("Email format is invalid");

        if (string.IsNullOrWhiteSpace(request.Password))
            errors.Add("Password is required");
        else if (request.Password.Length < 8)
            errors.Add("Password must be at least 8 characters long");

        if (string.IsNullOrWhiteSpace(request.OrganizationName))
            errors.Add("Organization name is required");

        if (string.IsNullOrWhiteSpace(request.OrganizationType))
            errors.Add("Organization type is required");
        else if (!IsValidOrganizationType(request.OrganizationType))
            errors.Add("Invalid organization type. Allowed values: school, theater, dance_company, other");

        return errors;
    }

    /// <summary>
    /// Validates email format
    /// </summary>
    /// <param name="email">Email to validate</param>
    /// <returns>True if email format is valid</returns>
    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Validates organization type
    /// </summary>
    /// <param name="type">Organization type to validate</param>
    /// <returns>True if organization type is valid</returns>
    private bool IsValidOrganizationType(string type)
    {
        var validTypes = new[] { "school", "theater", "dance_company", "other" };
        return validTypes.Contains(type.ToLowerInvariant());
    }

    /// <summary>
    /// Finds existing organization or creates a new one
    /// </summary>
    /// <param name="request">Registration request containing organization details</param>
    /// <returns>Organization entity</returns>
    private async Task<Organization> FindOrCreateOrganization(RegisterRequest request)
    {
        // First, try to find existing organization by name and type
        var existingOrg = await _context.Organizations
            .FirstOrDefaultAsync(o => o.Name.ToLower() == request.OrganizationName.Trim().ToLower()
                                   && o.Type.ToLower() == request.OrganizationType.ToLowerInvariant());

        if (existingOrg != null)
        {
            return existingOrg;
        }

        // Create new organization
        var newOrganization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.OrganizationName.Trim(),
            Type = request.OrganizationType.ToLowerInvariant(),
            ContactEmail = request.Email.Trim(),
            ContactPhone = request.OrganizationPhone?.Trim(),
            Address = request.OrganizationAddress?.Trim() ?? "Address not provided",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(newOrganization);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New organization created: {OrganizationId} - {OrganizationName}",
            newOrganization.Id, newOrganization.Name);

        return newOrganization;
    }

    /// <summary>
    /// Determines default role based on organization type and requested role
    /// </summary>
    /// <param name="organizationType">Type of organization</param>
    /// <param name="requestedRole">Role requested by user (optional)</param>
    /// <returns>Appropriate default role</returns>
    private UserRole DetermineDefaultRole(string organizationType, string? requestedRole)
    {
        // Default role assignment logic based on organization type
        var defaultRole = organizationType.ToLowerInvariant() switch
        {
            "school" => UserRole.Director,     // Schools typically need director-level access for drama departments
            "theater" => UserRole.Director,    // Theater companies need full order management
            "dance_company" => UserRole.Director, // Dance companies need full order management
            "other" => UserRole.Finance,       // Default to more restricted role for unknown organization types
            _ => UserRole.Finance
        };

        // If a specific role was requested, validate it against business rules
        if (!string.IsNullOrWhiteSpace(requestedRole) && Enum.TryParse<UserRole>(requestedRole, true, out var parsedRole))
        {
            // Only allow Director or Finance roles for organization users
            // ColorGarb staff roles can only be assigned by existing ColorGarb staff
            if (parsedRole == UserRole.Director || parsedRole == UserRole.Finance)
            {
                return parsedRole;
            }
        }

        return defaultRole;
    }
}

/// <summary>
/// Login request model
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Password reset request model
/// </summary>
public class PasswordResetRequest
{
    /// <summary>
    /// Email address for password reset
    /// </summary>
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// Password reset completion request model
/// </summary>
public class ResetPasswordRequest
{
    /// <summary>
    /// Reset token from email
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// New password to set
    /// </summary>
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>
/// User registration request model
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// User's full name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Organization name
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>
    /// Organization type (school, theater, dance_company, other)
    /// </summary>
    public string OrganizationType { get; set; } = string.Empty;

    /// <summary>
    /// Organization phone number (optional)
    /// </summary>
    public string? OrganizationPhone { get; set; }

    /// <summary>
    /// Organization address (optional)
    /// </summary>
    public string? OrganizationAddress { get; set; }

    /// <summary>
    /// Requested user role (optional, defaults based on organization type)
    /// </summary>
    public string? RequestedRole { get; set; }
}

/// <summary>
/// Authentication token response model
/// </summary>
public class AuthTokenResponse
{
    /// <summary>
    /// JWT access token
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Token type (typically "Bearer")
    /// </summary>
    public string TokenType { get; set; } = string.Empty;

    /// <summary>
    /// Token expiration in seconds
    /// </summary>
    public int ExpiresIn { get; set; }

    /// <summary>
    /// Authenticated user information
    /// </summary>
    public UserInfo User { get; set; } = new();
}

/// <summary>
/// User information model for authentication responses
/// </summary>
public class UserInfo
{
    /// <summary>
    /// User's unique identifier
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's full name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// User's role in the system
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// User's organization ID (if applicable)
    /// </summary>
    public string? OrganizationId { get; set; }
}