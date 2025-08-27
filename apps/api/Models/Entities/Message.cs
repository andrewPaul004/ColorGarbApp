using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents a message in an order-specific conversation thread.
/// Provides communication channel between client organizations and ColorGarb staff.
/// </summary>
/// <since>3.3.0</since>
[Table("Messages")]
public class Message
{
    /// <summary>
    /// Unique identifier for the message
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the order this message belongs to
    /// </summary>
    [Required]
    public Guid OrderId { get; set; }

    /// <summary>
    /// Reference to the user who sent this message
    /// </summary>
    [Required]
    public Guid SenderId { get; set; }

    /// <summary>
    /// Role of the message sender for display purposes
    /// </summary>
    [Required]
    [StringLength(20)]
    public string SenderRole { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the message sender
    /// </summary>
    [Required]
    [StringLength(100)]
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// Intended recipient role for the message
    /// </summary>
    [Required]
    [StringLength(20)]
    public string RecipientRole { get; set; } = "All";

    /// <summary>
    /// Content of the message
    /// </summary>
    [Required]
    [StringLength(5000)]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Type/category of the message for prioritization and filtering
    /// </summary>
    [Required]
    [StringLength(20)]
    public string MessageType { get; set; } = "General";

    /// <summary>
    /// Indicates if the message has been read by the recipient
    /// </summary>
    public bool IsRead { get; set; } = false;

    /// <summary>
    /// Timestamp when the message was marked as read
    /// </summary>
    public DateTime? ReadAt { get; set; }

    /// <summary>
    /// Reference to the message this is a reply to (if applicable)
    /// </summary>
    public Guid? ReplyToMessageId { get; set; }

    /// <summary>
    /// When this message was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this message was last updated
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated order
    /// </summary>
    [ForeignKey(nameof(OrderId))]
    public virtual Order Order { get; set; } = null!;

    /// <summary>
    /// Navigation property to the user who sent this message
    /// </summary>
    [ForeignKey(nameof(SenderId))]
    public virtual User Sender { get; set; } = null!;

    /// <summary>
    /// Navigation property to the parent message (if this is a reply)
    /// </summary>
    [ForeignKey(nameof(ReplyToMessageId))]
    public virtual Message? ReplyToMessage { get; set; }

    /// <summary>
    /// Navigation property for message attachments
    /// </summary>
    public virtual ICollection<MessageAttachment> Attachments { get; set; } = new List<MessageAttachment>();

    /// <summary>
    /// Navigation property for replies to this message
    /// </summary>
    [InverseProperty(nameof(ReplyToMessage))]
    public virtual ICollection<Message> Replies { get; set; } = new List<Message>();
}