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
                    Role = user.Role,
                    OrganizationId = user.OrganizationId?.ToString()
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login attempt for email: {Email}", request.Email);
            return StatusCode(500, new { message = "An error occurred during login" });
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
                    Role = user.Role,
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
            new Claim(ClaimTypes.Role, user.Role),
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