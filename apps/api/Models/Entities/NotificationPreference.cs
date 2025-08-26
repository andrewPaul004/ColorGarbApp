using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents user-specific email notification preferences for order milestones.
/// Enables customizable notification delivery based on milestone types and frequency settings.
/// </summary>
/// <since>3.1.0</since>
public class NotificationPreference
{
    /// <summary>
    /// Unique identifier for the notification preference
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the user who owns these preferences
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Global email notification toggle for this user
    /// </summary>
    [Required]
    public bool EmailEnabled { get; set; } = true;

    /// <summary>
    /// Global SMS notification toggle for this user
    /// </summary>
    [Required]
    public bool SmsEnabled { get; set; } = false;

    /// <summary>
    /// Verified phone number for SMS notifications (E.164 format)
    /// </summary>
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Indicates if the phone number has been verified
    /// </summary>
    [Required]
    public bool PhoneVerified { get; set; } = false;

    /// <summary>
    /// Verification token for phone number verification
    /// </summary>
    [StringLength(100)]
    public string? PhoneVerificationToken { get; set; }

    /// <summary>
    /// Timestamp when the phone number was verified
    /// </summary>
    public DateTime? PhoneVerifiedAt { get; set; }

    /// <summary>
    /// JSON-serialized array of NotificationMilestone objects for milestone-specific settings
    /// </summary>
    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string MilestonesJson { get; set; } = "[]";

    /// <summary>
    /// Notification delivery frequency preference
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Frequency { get; set; } = "Immediate";

    /// <summary>
    /// Indicates if this preference record is currently active
    /// </summary>
    [Required]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Unique token for unsubscribe functionality
    /// </summary>
    [StringLength(100)]
    public string? UnsubscribeToken { get; set; }

    /// <summary>
    /// When this preference record was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this preference record was last updated
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated user
    /// </summary>
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}