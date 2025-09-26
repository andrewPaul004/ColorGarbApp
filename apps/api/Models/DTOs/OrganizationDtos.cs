using System.ComponentModel.DataAnnotations;

namespace ColorGarbApi.Models.DTOs;

/// <summary>
/// Data transfer object for creating a new organization.
/// Contains all required fields for organization creation with validation.
/// </summary>
public class CreateOrganizationDto
{
    /// <summary>
    /// Organization name (e.g., "Lincoln High School Drama Department")
    /// </summary>
    [Required(ErrorMessage = "Organization name is required")]
    [MaxLength(200, ErrorMessage = "Organization name cannot exceed 200 characters")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of organization for categorization and specific workflows
    /// </summary>
    [Required(ErrorMessage = "Organization type is required")]
    [MaxLength(50, ErrorMessage = "Organization type cannot exceed 50 characters")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Primary contact email for the organization
    /// </summary>
    [Required(ErrorMessage = "Contact email is required")]
    [EmailAddress(ErrorMessage = "Please provide a valid email address")]
    [MaxLength(255, ErrorMessage = "Email cannot exceed 255 characters")]
    public string ContactEmail { get; set; } = string.Empty;

    /// <summary>
    /// Organization phone number for urgent communications
    /// </summary>
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Complete billing address
    /// </summary>
    [Required(ErrorMessage = "Address is required")]
    [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// Optional shipping address (if different from billing)
    /// </summary>
    [MaxLength(500, ErrorMessage = "Shipping address cannot exceed 500 characters")]
    public string? ShippingAddress { get; set; }
}

/// <summary>
/// Data transfer object for updating an existing organization.
/// All fields are optional for partial updates.
/// </summary>
public class UpdateOrganizationDto
{
    /// <summary>
    /// Organization name (e.g., "Lincoln High School Drama Department")
    /// </summary>
    [MaxLength(200, ErrorMessage = "Organization name cannot exceed 200 characters")]
    public string? Name { get; set; }

    /// <summary>
    /// Type of organization for categorization and specific workflows
    /// </summary>
    [MaxLength(50, ErrorMessage = "Organization type cannot exceed 50 characters")]
    public string? Type { get; set; }

    /// <summary>
    /// Primary contact email for the organization
    /// </summary>
    [EmailAddress(ErrorMessage = "Please provide a valid email address")]
    [MaxLength(255, ErrorMessage = "Email cannot exceed 255 characters")]
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Organization phone number for urgent communications
    /// </summary>
    [MaxLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Complete billing address
    /// </summary>
    [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
    public string? Address { get; set; }

    /// <summary>
    /// Optional shipping address (if different from billing)
    /// </summary>
    [MaxLength(500, ErrorMessage = "Shipping address cannot exceed 500 characters")]
    public string? ShippingAddress { get; set; }
}

/// <summary>
/// Data transfer object for complete organization details including order statistics.
/// Used for detailed views and organization management interfaces.
/// </summary>
public class OrganizationDetailsDto
{
    /// <summary>
    /// Unique identifier for the organization
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Organization name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Organization type (school, theater, etc.)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Primary contact email for the organization
    /// </summary>
    public string ContactEmail { get; set; } = string.Empty;

    /// <summary>
    /// Organization phone number for urgent communications
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Complete billing address
    /// </summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>
    /// Optional shipping address
    /// </summary>
    public string? ShippingAddress { get; set; }

    /// <summary>
    /// Indicates if the organization account is currently active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Date and time when the organization was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Date and time when the organization was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Total number of orders placed by this organization
    /// </summary>
    public int TotalOrders { get; set; }

    /// <summary>
    /// Number of active orders
    /// </summary>
    public int ActiveOrders { get; set; }

    /// <summary>
    /// Total value of all orders
    /// </summary>
    public decimal TotalOrderValue { get; set; }

    /// <summary>
    /// Date of the most recent order
    /// </summary>
    public DateTime? LastOrderDate { get; set; }
}

/// <summary>
/// Data transfer object for bulk organization import from CSV.
/// Contains validation for batch processing.
/// </summary>
public class BulkOrganizationImportDto
{
    /// <summary>
    /// List of organizations to import
    /// </summary>
    [Required(ErrorMessage = "Organizations list is required")]
    [MinLength(1, ErrorMessage = "At least one organization is required")]
    [MaxLength(1000, ErrorMessage = "Cannot import more than 1000 organizations at once")]
    public List<CreateOrganizationDto> Organizations { get; set; } = new();
}

/// <summary>
/// Result of bulk organization import operation.
/// Contains success count, failures, and detailed error information.
/// </summary>
public class BulkOrganizationImportResult
{
    /// <summary>
    /// Number of organizations successfully imported
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of organizations that failed to import
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// List of organizations that failed to import with error details
    /// </summary>
    public List<OrganizationImportFailure> Failures { get; set; } = new();

    /// <summary>
    /// Total processing time for the import operation
    /// </summary>
    public TimeSpan ProcessingTime { get; set; }
}

/// <summary>
/// Details of a failed organization import.
/// </summary>
public class OrganizationImportFailure
{
    /// <summary>
    /// Row number in the CSV file (1-based)
    /// </summary>
    public int RowNumber { get; set; }

    /// <summary>
    /// Organization name from the failed import
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>
    /// Error message describing why the import failed
    /// </summary>
    public string Error { get; set; } = string.Empty;

    /// <summary>
    /// Detailed validation errors if applicable
    /// </summary>
    public List<string> ValidationErrors { get; set; } = new();
}