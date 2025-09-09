using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents a request from Director/Finance users for ColorGarb staff to create an order.
/// Contains all order details provided by the client for staff review and approval.
/// </summary>
/// <since>1.0.0</since>
[Table("OrderRequests")]
public class OrderRequest
{
    /// <summary>
    /// Unique identifier for the order request
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the organization requesting the order
    /// </summary>
    [Required]
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Reference to the user who submitted the order request
    /// </summary>
    [Required]
    public Guid RequesterId { get; set; }

    /// <summary>
    /// Name of the person requesting the order
    /// </summary>
    [Required]
    [StringLength(100)]
    public string RequesterName { get; set; } = string.Empty;

    /// <summary>
    /// Email of the person requesting the order
    /// </summary>
    [Required]
    [StringLength(255)]
    public string RequesterEmail { get; set; } = string.Empty;

    /// <summary>
    /// Brief description of the costume order
    /// </summary>
    [Required]
    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Detailed notes about the order requirements
    /// </summary>
    [StringLength(2000)]
    public string? Notes { get; set; }

    /// <summary>
    /// Number of performers/costumes needed
    /// </summary>
    [Required]
    [Range(1, 10000)]
    public int PerformerCount { get; set; }

    /// <summary>
    /// Client's preferred completion date
    /// </summary>
    [Required]
    public DateTime PreferredCompletionDate { get; set; }

    /// <summary>
    /// Estimated budget for the order
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedBudget { get; set; }

    /// <summary>
    /// Priority level of the order request
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Priority { get; set; } = "Normal";

    /// <summary>
    /// Current status of the order request
    /// </summary>
    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Reference to the created order (if approved and created)
    /// </summary>
    public Guid? CreatedOrderId { get; set; }

    /// <summary>
    /// Reference to the ColorGarb staff member who processed the request
    /// </summary>
    public Guid? ProcessedByUserId { get; set; }

    /// <summary>
    /// When the request was processed (approved/rejected)
    /// </summary>
    public DateTime? ProcessedAt { get; set; }

    /// <summary>
    /// Staff notes about the order request processing
    /// </summary>
    [StringLength(1000)]
    public string? ProcessingNotes { get; set; }

    /// <summary>
    /// When this order request was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this order request was last updated
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the requesting organization
    /// </summary>
    [ForeignKey(nameof(OrganizationId))]
    public virtual Organization Organization { get; set; } = null!;

    /// <summary>
    /// Navigation property to the user who made the request
    /// </summary>
    [ForeignKey(nameof(RequesterId))]
    public virtual User Requester { get; set; } = null!;

    /// <summary>
    /// Navigation property to the created order (if approved)
    /// </summary>
    [ForeignKey(nameof(CreatedOrderId))]
    public virtual Order? CreatedOrder { get; set; }

    /// <summary>
    /// Navigation property to the staff member who processed the request
    /// </summary>
    [ForeignKey(nameof(ProcessedByUserId))]
    public virtual User? ProcessedByUser { get; set; }
}