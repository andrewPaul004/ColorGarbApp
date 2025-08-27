using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents a file attachment associated with a message.
/// Stores metadata and Azure Blob Storage references for uploaded files.
/// </summary>
/// <since>3.3.0</since>
[Table("MessageAttachments")]
public class MessageAttachment
{
    /// <summary>
    /// Unique identifier for the attachment
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the message this attachment belongs to
    /// </summary>
    [Required]
    public Guid MessageId { get; set; }

    /// <summary>
    /// Secure filename used for storage (generated for security)
    /// </summary>
    [Required]
    [StringLength(255)]
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Original filename as uploaded by the user
    /// </summary>
    [Required]
    [StringLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Size of the file in bytes
    /// </summary>
    [Required]
    public long FileSize { get; set; }

    /// <summary>
    /// MIME type of the uploaded file
    /// </summary>
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Azure Blob Storage URL for the file
    /// </summary>
    [Required]
    [StringLength(500)]
    public string BlobUrl { get; set; } = string.Empty;

    /// <summary>
    /// Reference to the user who uploaded this attachment
    /// </summary>
    [Required]
    public Guid UploadedBy { get; set; }

    /// <summary>
    /// When this attachment was uploaded
    /// </summary>
    [Required]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated message
    /// </summary>
    [ForeignKey(nameof(MessageId))]
    public virtual Message Message { get; set; } = null!;

    /// <summary>
    /// Navigation property to the user who uploaded this attachment
    /// </summary>
    [ForeignKey(nameof(UploadedBy))]
    public virtual User UploadedByUser { get; set; } = null!;
}