namespace ColorGarbApi.Models;

/// <summary>
/// Information model for completed export files available for download.
/// Contains file metadata and access information for export retrieval.
/// </summary>
/// <since>3.4.0</since>
public class ExportFileInfo
{
    /// <summary>
    /// Unique identifier for the export job
    /// </summary>
    public string JobId { get; set; } = string.Empty;

    /// <summary>
    /// File name of the export
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// MIME content type of the export file
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// URL for downloading the file
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;

    /// <summary>
    /// When the export file was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the export file will expire and be deleted
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Export format (CSV, Excel, PDF)
    /// </summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>
    /// Number of records in the export
    /// </summary>
    public int RecordCount { get; set; }

    /// <summary>
    /// User who initiated the export
    /// </summary>
    public string? InitiatedBy { get; set; }

    /// <summary>
    /// Export description or purpose
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Binary data of the export file
    /// </summary>
    public byte[] Data { get; set; } = Array.Empty<byte>();

    /// <summary>
    /// Whether the file is still available for download
    /// </summary>
    public bool IsAvailable => DateTime.UtcNow < ExpiresAt;

    /// <summary>
    /// Human-readable file size
    /// </summary>
    public string FormattedFileSize
    {
        get
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            double len = FileSizeBytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }
    }
}