using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents an SMS notification sent to a user with delivery tracking information.
/// Includes Twilio integration details and delivery confirmation status.
/// </summary>
/// <since>3.2.0</since>
public class SmsNotification
{
    /// <summary>
    /// Unique identifier for the SMS notification
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the user who received this SMS
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Reference to the order this SMS is about (if applicable)
    /// </summary>
    public Guid? OrderId { get; set; }

    /// <summary>
    /// Phone number the SMS was sent to (E.164 format)
    /// </summary>
    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Content of the SMS message sent
    /// </summary>
    [Required]
    [StringLength(1600)]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Twilio Message SID for delivery tracking
    /// </summary>
    [StringLength(50)]
    public string? TwilioMessageSid { get; set; }

    /// <summary>
    /// Current delivery status of the SMS
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Number of delivery attempts made
    /// </summary>
    [Required]
    public int DeliveryAttempts { get; set; } = 0;

    /// <summary>
    /// Timestamp of the last delivery attempt
    /// </summary>
    public DateTime? LastAttemptAt { get; set; }

    /// <summary>
    /// Timestamp when the SMS was successfully delivered
    /// </summary>
    public DateTime? DeliveredAt { get; set; }

    /// <summary>
    /// Error message from Twilio if delivery failed
    /// </summary>
    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Cost of sending this SMS in USD cents
    /// </summary>
    public decimal? Cost { get; set; }

    /// <summary>
    /// When this SMS notification record was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated user
    /// </summary>
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Navigation property to the associated order (optional)
    /// </summary>
    [ForeignKey(nameof(OrderId))]
    public virtual Order? Order { get; set; }
}