using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents detailed delivery status tracking for notifications.
/// Tracks webhooks and status updates from external providers like SendGrid and Twilio.
/// </summary>
/// <since>3.4.0</since>
[Table("NotificationDeliveryLogs")]
public class NotificationDeliveryLog
{
    /// <summary>
    /// Unique identifier for the delivery log entry
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the parent communication log entry
    /// </summary>
    [Required]
    public Guid CommunicationLogId { get; set; }

    /// <summary>
    /// External delivery service provider
    /// </summary>
    [Required]
    [StringLength(50)]
    public string DeliveryProvider { get; set; } = string.Empty; // SendGrid, Twilio, Internal

    /// <summary>
    /// External identifier from the delivery provider
    /// </summary>
    [Required]
    [StringLength(255)]
    public string ExternalId { get; set; } = string.Empty;

    /// <summary>
    /// Current delivery status from the provider
    /// </summary>
    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "Queued"; // Queued, Sent, Delivered, Opened, Clicked, Failed, Bounced

    /// <summary>
    /// Additional status details or error information
    /// </summary>
    [StringLength(500)]
    public string? StatusDetails { get; set; }

    /// <summary>
    /// When this status update was received
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Raw webhook data from the provider stored as JSON
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? WebhookData { get; set; }

    /// <summary>
    /// Navigation property to the parent communication log
    /// </summary>
    [ForeignKey(nameof(CommunicationLogId))]
    public virtual CommunicationLog CommunicationLog { get; set; } = null!;
}