using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models;

/// <summary>
/// Represents a costume order through the complete manufacturing process.
/// Includes timeline tracking, measurement data, and payment information.
/// </summary>
[Table("Orders")]
public class Order
{
    /// <summary>
    /// Unique identifier for the order
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Human-readable order number (e.g., "CG-2023-001")
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>
    /// ID of the client organization that owns this order
    /// </summary>
    [Required]
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Brief description of the costume order
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Current stage in the 13-step manufacturing process
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string CurrentStage { get; set; } = "Initial Consultation";

    /// <summary>
    /// Original promised ship date
    /// </summary>
    public DateTime OriginalShipDate { get; set; }

    /// <summary>
    /// Current ship date (may be revised)
    /// </summary>
    public DateTime CurrentShipDate { get; set; }

    /// <summary>
    /// Total order value in USD
    /// </summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Current payment status
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "Pending"; // Pending, Partial, Paid, Refunded

    /// <summary>
    /// Additional notes or special instructions for the order
    /// </summary>
    [MaxLength(2000)]
    public string? Notes { get; set; }

    /// <summary>
    /// Indicates if the order is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Date and time when the order was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date and time when the order was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for the organization that owns this order
    /// </summary>
    [ForeignKey(nameof(OrganizationId))]
    public virtual Organization Organization { get; set; } = null!;
}