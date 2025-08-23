using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Audit log entry for role-based access attempts.
/// Tracks all authorization decisions for security and compliance purposes.
/// </summary>
[Table("RoleAccessAudits")]
public class RoleAccessAudit
{
    /// <summary>
    /// Unique identifier for the audit entry
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// ID of the user who attempted access
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// User's role at the time of access attempt
    /// </summary>
    [Required]
    public UserRole UserRole { get; set; }

    /// <summary>
    /// Resource being accessed (HTTP method + path)
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Resource { get; set; } = string.Empty;

    /// <summary>
    /// HTTP method used for the request
    /// </summary>
    [Required]
    [MaxLength(10)]
    public string HttpMethod { get; set; } = string.Empty;

    /// <summary>
    /// Whether access was granted or denied
    /// </summary>
    [Required]
    public bool AccessGranted { get; set; }

    /// <summary>
    /// Organization context for the access attempt (if applicable)
    /// </summary>
    public Guid? OrganizationId { get; set; }

    /// <summary>
    /// IP address of the user making the request
    /// </summary>
    [MaxLength(45)] // IPv6 addresses can be up to 45 characters
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent string from the request
    /// </summary>
    [MaxLength(1000)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// Additional details about the access attempt or denial reason
    /// </summary>
    [MaxLength(2000)]
    public string? Details { get; set; }

    /// <summary>
    /// Timestamp when the access attempt occurred
    /// </summary>
    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Session ID associated with the request (if available)
    /// </summary>
    [MaxLength(100)]
    public string? SessionId { get; set; }

    /// <summary>
    /// Navigation property for the user who made the access attempt
    /// </summary>
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Navigation property for the organization context (if applicable)
    /// </summary>
    [ForeignKey(nameof(OrganizationId))]
    public virtual Organization? Organization { get; set; }
}