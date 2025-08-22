using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models;

/// <summary>
/// Represents a login attempt record for account security tracking.
/// Used to implement account lockout protection against brute force attacks.
/// </summary>
[Table("LoginAttempts")]
public class LoginAttempt
{
    /// <summary>
    /// Unique identifier for the login attempt
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Email address of the login attempt
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// IP address of the login attempt
    /// </summary>
    [MaxLength(45)] // IPv6 addresses can be up to 45 characters
    public string? IpAddress { get; set; }

    /// <summary>
    /// Whether the login attempt was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Timestamp of the login attempt
    /// </summary>
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// User agent string from the request
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// Additional details about the attempt (failure reason, etc.)
    /// </summary>
    [MaxLength(1000)]
    public string? Details { get; set; }
}