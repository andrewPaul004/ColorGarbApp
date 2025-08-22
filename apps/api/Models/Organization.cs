using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models;

/// <summary>
/// Represents a client organization in the ColorGarb system.
/// Organizations can be schools, theaters, dance companies, or other entities that order costumes.
/// </summary>
[Table("Organizations")]
public class Organization
{
    /// <summary>
    /// Unique identifier for the organization
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Organization name (e.g., "Lincoln High School Drama Department")
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of organization for categorization and specific workflows
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // school, theater, dance_company, other

    /// <summary>
    /// Primary contact email for the organization
    /// </summary>
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string ContactEmail { get; set; } = string.Empty;

    /// <summary>
    /// Organization phone number for urgent communications
    /// </summary>
    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Full mailing address for shipping and billing
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// Indicates if the organization account is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Date and time when the organization was created in the system
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date and time when the organization was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for orders placed by this organization
    /// </summary>
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    /// <summary>
    /// Navigation property for users associated with this organization
    /// </summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}