using System.ComponentModel.DataAnnotations;

namespace ColorGarbApi.Models;

/// <summary>
/// Request model for exporting communication audit data with formatting and content options.
/// Supports CSV, Excel, and PDF export formats with configurable content inclusion.
/// </summary>
/// <since>3.4.0</since>
public class ExportCommunicationRequest
{
    /// <summary>
    /// Search criteria for filtering communications to export
    /// </summary>
    [Required]
    public CommunicationAuditSearchRequest SearchCriteria { get; set; } = new();

    /// <summary>
    /// Export format: CSV, Excel, or PDF
    /// </summary>
    [Required]
    [RegularExpression("^(CSV|Excel|PDF)$", ErrorMessage = "Format must be CSV, Excel, or PDF")]
    public string Format { get; set; } = "CSV";

    /// <summary>
    /// Include full communication content in the export
    /// </summary>
    public bool IncludeContent { get; set; } = false;

    /// <summary>
    /// Include metadata information in the export
    /// </summary>
    public bool IncludeMetadata { get; set; } = false;

    /// <summary>
    /// Maximum number of records to include in the export
    /// </summary>
    [Range(1, 100000, ErrorMessage = "MaxRecords must be between 1 and 100,000")]
    public int MaxRecords { get; set; } = 10000;

    /// <summary>
    /// Custom filename for the export (without extension)
    /// </summary>
    public string? CustomFilename { get; set; }

    /// <summary>
    /// Include delivery status tracking information
    /// </summary>
    public bool IncludeDeliveryStatus { get; set; } = true;

    /// <summary>
    /// Time zone for date formatting in exports
    /// </summary>
    public string TimeZone { get; set; } = "UTC";

    /// <summary>
    /// Export description or purpose (for audit trail)
    /// </summary>
    public string? Description { get; set; }
}