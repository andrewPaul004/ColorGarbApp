using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents an email notification record for delivery tracking and audit purposes.
/// Tracks the lifecycle of email notifications from creation to delivery confirmation.
/// </summary>
/// <since>3.1.0</since>
public class EmailNotification
{
    /// <summary>
    /// Unique identifier for the email notification
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the user receiving the notification
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Reference to the order this notification relates to
    /// </summary>
    [Required]
    public Guid OrderId { get; set; }

    /// <summary>
    /// Name of the email template used for this notification
    /// </summary>
    [Required]
    [StringLength(100)]
    public string TemplateName { get; set; } = string.Empty;

    /// <summary>
    /// Email subject line sent to the recipient
    /// </summary>
    [Required]
    [StringLength(200)]
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Email address of the recipient
    /// </summary>
    [Required]
    [StringLength(255)]
    public string Recipient { get; set; } = string.Empty;

    /// <summary>
    /// Current delivery status of the email notification
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Number of delivery attempts made for this notification
    /// </summary>
    [Required]
    public int DeliveryAttempts { get; set; } = 0;

    /// <summary>
    /// Timestamp of the most recent delivery attempt
    /// </summary>
    public DateTime? LastAttemptAt { get; set; }

    /// <summary>
    /// Timestamp when the email was successfully delivered
    /// </summary>
    public DateTime? DeliveredAt { get; set; }

    /// <summary>
    /// Error message from failed delivery attempts
    /// </summary>
    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// When this notification record was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated user
    /// </summary>
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Navigation property to the associated order
    /// </summary>
    [ForeignKey(nameof(OrderId))]
    public virtual Order Order { get; set; } = null!;
}