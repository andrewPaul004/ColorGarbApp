using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents audit trail properties for message tracking.
/// Tracks IP addresses, user agents, and edit history for compliance.
/// </summary>
/// <since>3.4.0</since>
[Table("MessageAuditTrails")]
public class MessageAuditTrail
{
    /// <summary>
    /// Unique identifier for the audit trail entry
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the message this audit trail belongs to
    /// </summary>
    [Required]
    public Guid MessageId { get; set; }

    /// <summary>
    /// IP address of the user when the message was created/edited
    /// </summary>
    [StringLength(45)] // IPv6 max length
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent string from the browser/client
    /// </summary>
    [StringLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// When this audit record was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated message
    /// </summary>
    [ForeignKey(nameof(MessageId))]
    public virtual Message Message { get; set; } = null!;

    /// <summary>
    /// Navigation property for message edit history
    /// </summary>
    public virtual ICollection<MessageEdit> EditHistory { get; set; } = new List<MessageEdit>();
}

/// <summary>
/// Represents a single edit to a message for audit purposes.
/// Tracks what changed, when, and why.
/// </summary>
/// <since>3.4.0</since>
[Table("MessageEdits")]
public class MessageEdit
{
    /// <summary>
    /// Unique identifier for the message edit
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the message audit trail this edit belongs to
    /// </summary>
    [Required]
    public Guid MessageAuditTrailId { get; set; }

    /// <summary>
    /// When the edit was made
    /// </summary>
    [Required]
    public DateTime EditedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// User who made the edit
    /// </summary>
    [Required]
    public Guid EditedBy { get; set; }

    /// <summary>
    /// Content of the message before this edit
    /// </summary>
    [Required]
    [StringLength(5000)]
    public string PreviousContent { get; set; } = string.Empty;

    /// <summary>
    /// Reason provided for the edit (optional)
    /// </summary>
    [StringLength(500)]
    public string? ChangeReason { get; set; }

    /// <summary>
    /// Navigation property to the message audit trail
    /// </summary>
    [ForeignKey(nameof(MessageAuditTrailId))]
    public virtual MessageAuditTrail MessageAuditTrail { get; set; } = null!;

    /// <summary>
    /// Navigation property to the user who made the edit
    /// </summary>
    [ForeignKey(nameof(EditedBy))]
    public virtual User Editor { get; set; } = null!;
}