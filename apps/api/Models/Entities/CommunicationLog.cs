using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents a comprehensive audit trail entry for all communications.
/// Tracks emails, SMS, messages, and system notifications for compliance and service quality.
/// </summary>
/// <since>3.4.0</since>
[Table("CommunicationLogs")]
public class CommunicationLog
{
    /// <summary>
    /// Unique identifier for the communication log entry
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the order this communication relates to
    /// </summary>
    [Required]
    public Guid OrderId { get; set; }

    /// <summary>
    /// Type of communication that occurred
    /// </summary>
    [Required]
    [StringLength(50)]
    public string CommunicationType { get; set; } = string.Empty; // Email, SMS, Message, SystemNotification

    /// <summary>
    /// Reference to the user who initiated this communication
    /// </summary>
    [Required]
    public Guid SenderId { get; set; }

    /// <summary>
    /// Reference to the specific recipient user (if applicable)
    /// </summary>
    public Guid? RecipientId { get; set; }

    /// <summary>
    /// Email address of the recipient (for email communications)
    /// </summary>
    [StringLength(255)]
    public string? RecipientEmail { get; set; }

    /// <summary>
    /// Phone number of the recipient (for SMS communications)
    /// </summary>
    [StringLength(20)]
    public string? RecipientPhone { get; set; }

    /// <summary>
    /// Subject line for email communications
    /// </summary>
    [StringLength(200)]
    public string? Subject { get; set; }

    /// <summary>
    /// Full content of the communication
    /// </summary>
    [Required]
    [StringLength(10000)]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Name of the template used for this communication (if applicable)
    /// </summary>
    [StringLength(100)]
    public string? TemplateUsed { get; set; }

    /// <summary>
    /// Current delivery status of the communication
    /// </summary>
    [Required]
    [StringLength(20)]
    public string DeliveryStatus { get; set; } = "Sent"; // Sent, Delivered, Read, Failed, Bounced

    /// <summary>
    /// External message identifier from service provider (SendGrid, Twilio, etc.)
    /// </summary>
    [StringLength(255)]
    public string? ExternalMessageId { get; set; }

    /// <summary>
    /// Timestamp when the communication was sent
    /// </summary>
    [Required]
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the communication was delivered to the recipient
    /// </summary>
    public DateTime? DeliveredAt { get; set; }

    /// <summary>
    /// Timestamp when the recipient read/opened the communication
    /// </summary>
    public DateTime? ReadAt { get; set; }

    /// <summary>
    /// Reason for delivery failure (if applicable)
    /// </summary>
    [StringLength(500)]
    public string? FailureReason { get; set; }

    /// <summary>
    /// Additional metadata stored as JSON for extensibility
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? Metadata { get; set; }

    /// <summary>
    /// When this audit record was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated order
    /// </summary>
    [ForeignKey(nameof(OrderId))]
    public virtual Order Order { get; set; } = null!;

    /// <summary>
    /// Navigation property to the user who sent this communication
    /// </summary>
    [ForeignKey(nameof(SenderId))]
    public virtual User Sender { get; set; } = null!;

    /// <summary>
    /// Navigation property to the recipient user (if applicable)
    /// </summary>
    [ForeignKey(nameof(RecipientId))]
    public virtual User? Recipient { get; set; }

    /// <summary>
    /// Navigation property for notification delivery logs
    /// </summary>
    public virtual ICollection<NotificationDeliveryLog> DeliveryLogs { get; set; } = new List<NotificationDeliveryLog>();
}