using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models;

/// <summary>
/// Represents a historical record of order stage progression.
/// Tracks when an order moved through each stage of the manufacturing process.
/// </summary>
[Table("OrderStageHistory")]
public class OrderStageHistory
{
    /// <summary>
    /// Unique identifier for the stage history entry
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// ID of the order this stage history belongs to
    /// </summary>
    [Required]
    public Guid OrderId { get; set; }

    /// <summary>
    /// The stage that was entered
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Stage { get; set; } = string.Empty;

    /// <summary>
    /// Date and time when this stage was entered
    /// </summary>
    public DateTime EnteredAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// ID or name of the user/system that updated the stage
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string UpdatedBy { get; set; } = string.Empty;

    /// <summary>
    /// Optional notes about the stage progression
    /// </summary>
    [MaxLength(1000)]
    public string? Notes { get; set; }

    /// <summary>
    /// Previous ship date before this stage (if changed)
    /// </summary>
    public DateTime? PreviousShipDate { get; set; }

    /// <summary>
    /// New ship date set during this stage (if changed)
    /// </summary>
    public DateTime? NewShipDate { get; set; }

    /// <summary>
    /// Reason for ship date change (if applicable)
    /// </summary>
    [MaxLength(500)]
    public string? ChangeReason { get; set; }

    /// <summary>
    /// Navigation property for the order this stage history belongs to
    /// </summary>
    [ForeignKey(nameof(OrderId))]
    public virtual Order Order { get; set; } = null!;
}