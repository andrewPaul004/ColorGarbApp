using System.ComponentModel.DataAnnotations;

namespace ColorGarbApi.Models;

/// <summary>
/// Represents a password reset token with expiration and usage tracking.
/// Ensures secure password reset workflow with time-limited tokens.
/// </summary>
public class PasswordResetToken
{
    /// <summary>
    /// Unique identifier for the reset token record
    /// </summary>
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Secure reset token string (hashed for storage)
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// ID of the user this token belongs to
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Navigation property to the user
    /// </summary>
    public User User { get; set; } = null!;

    /// <summary>
    /// When the token was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the token expires (typically 1 hour from creation)
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Whether the token has been used to reset the password
    /// </summary>
    public bool IsUsed { get; set; }

    /// <summary>
    /// When the token was used (if applicable)
    /// </summary>
    public DateTime? UsedAt { get; set; }

    /// <summary>
    /// IP address from which the reset was requested
    /// </summary>
    [MaxLength(45)] // IPv6 length
    public string? RequestIpAddress { get; set; }

    /// <summary>
    /// Checks if the token is valid (not expired and not used)
    /// </summary>
    public bool IsValid => !IsUsed && DateTime.UtcNow < ExpiresAt;
}