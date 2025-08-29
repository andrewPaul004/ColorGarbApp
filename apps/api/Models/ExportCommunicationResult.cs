namespace ColorGarbApi.Models;

/// <summary>
/// Result model for communication export operations with job status and metadata.
/// Used for tracking both synchronous and asynchronous export processing.
/// </summary>
/// <since>3.4.0</since>
public class ExportCommunicationResult
{
    /// <summary>
    /// Unique identifier for the export job
    /// </summary>
    public string JobId { get; set; } = string.Empty;

    /// <summary>
    /// Current status of the export job
    /// </summary>
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// Estimated or actual size of the export file in bytes
    /// </summary>
    public long EstimatedSize { get; set; }

    /// <summary>
    /// Number of records included in the export
    /// </summary>
    public int RecordCount { get; set; }

    /// <summary>
    /// Export format used (CSV, Excel, PDF)
    /// </summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>
    /// URL for downloading the completed export file
    /// </summary>
    public string? DownloadUrl { get; set; }

    /// <summary>
    /// When the export job was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the export job was completed (if applicable)
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Export progress percentage (0-100)
    /// </summary>
    public int ProgressPercentage { get; set; } = 0;

    /// <summary>
    /// Error message if the export failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// User who initiated the export
    /// </summary>
    public string? InitiatedBy { get; set; }

    /// <summary>
    /// When the export file will expire and be deleted
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// File name of the generated export
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// Additional export metadata
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
}