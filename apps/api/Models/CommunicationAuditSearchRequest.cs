using System.ComponentModel.DataAnnotations;

namespace ColorGarbApi.Models;

/// <summary>
/// Request model for searching communication audit logs with advanced filtering capabilities.
/// Supports organization isolation, date range filtering, and full-text search.
/// </summary>
/// <since>3.4.0</since>
public class CommunicationAuditSearchRequest
{
    /// <summary>
    /// Organization ID to filter communications (enforced for non-staff users)
    /// </summary>
    public Guid? OrganizationId { get; set; }

    /// <summary>
    /// Specific order ID to filter communications
    /// </summary>
    public Guid? OrderId { get; set; }

    /// <summary>
    /// Communication types to include (Email, SMS, Message, SystemNotification)
    /// </summary>
    public string[]? CommunicationType { get; set; }

    /// <summary>
    /// User ID of the communication sender
    /// </summary>
    public Guid? SenderId { get; set; }

    /// <summary>
    /// User ID of the communication recipient
    /// </summary>
    public Guid? RecipientId { get; set; }

    /// <summary>
    /// Delivery status values to filter by (Sent, Delivered, Read, Failed, Bounced)
    /// </summary>
    public string[]? DeliveryStatus { get; set; }

    /// <summary>
    /// Start date for filtering communications (inclusive)
    /// </summary>
    public DateTime? DateFrom { get; set; }

    /// <summary>
    /// End date for filtering communications (inclusive)
    /// </summary>
    public DateTime? DateTo { get; set; }

    /// <summary>
    /// Full-text search term for communication content and subjects
    /// </summary>
    [StringLength(200)]
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Include full message content in results (default: false for performance)
    /// </summary>
    public bool IncludeContent { get; set; } = false;

    /// <summary>
    /// Page number for pagination (1-based)
    /// </summary>
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page (maximum 100)
    /// </summary>
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Field to sort results by
    /// </summary>
    public string SortBy { get; set; } = "sentAt";

    /// <summary>
    /// Sort direction (asc or desc)
    /// </summary>
    public string SortDirection { get; set; } = "desc";

    /// <summary>
    /// Validates the search request parameters.
    /// </summary>
    /// <returns>List of validation errors if any</returns>
    public IEnumerable<string> Validate()
    {
        var errors = new List<string>();

        // Validate date range
        if (DateFrom.HasValue && DateTo.HasValue && DateFrom.Value > DateTo.Value)
        {
            errors.Add("DateFrom cannot be greater than DateTo");
        }

        // Validate date range is not too large (max 1 year)
        if (DateFrom.HasValue && DateTo.HasValue && (DateTo.Value - DateFrom.Value).TotalDays > 365)
        {
            errors.Add("Date range cannot exceed 365 days");
        }

        // Validate sort field
        var validSortFields = new[] { "sentAt", "deliveredAt", "readAt", "createdAt" };
        if (!validSortFields.Contains(SortBy.ToLower()))
        {
            errors.Add($"Invalid sort field. Valid options: {string.Join(", ", validSortFields)}");
        }

        // Validate sort direction
        var validSortDirections = new[] { "asc", "desc" };
        if (!validSortDirections.Contains(SortDirection.ToLower()))
        {
            errors.Add("Sort direction must be 'asc' or 'desc'");
        }

        // Validate communication types
        if (CommunicationType?.Any() == true)
        {
            var validTypes = new[] { "Email", "SMS", "Message", "SystemNotification" };
            var invalidTypes = CommunicationType.Except(validTypes).ToArray();
            if (invalidTypes.Any())
            {
                errors.Add($"Invalid communication types: {string.Join(", ", invalidTypes)}");
            }
        }

        // Validate delivery status values
        if (DeliveryStatus?.Any() == true)
        {
            var validStatuses = new[] { "Sent", "Delivered", "Read", "Failed", "Bounced" };
            var invalidStatuses = DeliveryStatus.Except(validStatuses).ToArray();
            if (invalidStatuses.Any())
            {
                errors.Add($"Invalid delivery statuses: {string.Join(", ", invalidStatuses)}");
            }
        }

        return errors;
    }
}