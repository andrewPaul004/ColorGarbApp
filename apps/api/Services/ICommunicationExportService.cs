using ColorGarbApi.Controllers;
using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for exporting communication audit data in various formats.
/// Supports CSV, Excel, and PDF exports with asynchronous processing for large datasets.
/// </summary>
/// <since>3.4.0</since>
public interface ICommunicationExportService
{
    /// <summary>
    /// Exports communication data to CSV format.
    /// </summary>
    /// <param name="request">Export request with search criteria and formatting options</param>
    /// <returns>CSV data as byte array</returns>
    /// <exception cref="ArgumentException">Thrown when export criteria are invalid</exception>
    Task<byte[]> ExportToCsvAsync(ExportCommunicationRequest request);

    /// <summary>
    /// Exports communication data to Excel format with formatting and charts.
    /// </summary>
    /// <param name="request">Export request with search criteria and formatting options</param>
    /// <returns>Excel file data as byte array</returns>
    /// <exception cref="ArgumentException">Thrown when export criteria are invalid</exception>
    Task<byte[]> ExportToExcelAsync(ExportCommunicationRequest request);

    /// <summary>
    /// Generates a compliance report in PDF format.
    /// </summary>
    /// <param name="request">Compliance report parameters</param>
    /// <returns>PDF report data as byte array</returns>
    /// <exception cref="ArgumentException">Thrown when report parameters are invalid</exception>
    Task<byte[]> GenerateCompliancePdfAsync(ComplianceReportRequest request);

    /// <summary>
    /// Estimates the number of records that would be included in an export.
    /// Used to determine if async processing is needed.
    /// </summary>
    /// <param name="searchCriteria">Search criteria to estimate against</param>
    /// <returns>Estimated record count</returns>
    Task<int> EstimateRecordCountAsync(CommunicationAuditSearchRequest searchCriteria);

    /// <summary>
    /// Queues a large export for asynchronous background processing.
    /// </summary>
    /// <param name="request">Export request</param>
    /// <param name="format">Export format (CSV, Excel, PDF)</param>
    /// <returns>Export job information</returns>
    Task<ExportCommunicationResult> QueueExportAsync(ExportCommunicationRequest request, string format);

    /// <summary>
    /// Gets the current status of an asynchronous export job.
    /// </summary>
    /// <param name="jobId">Export job identifier</param>
    /// <returns>Job status and progress information, null if job not found</returns>
    Task<ExportCommunicationResult?> GetExportStatusAsync(string jobId);

    /// <summary>
    /// Retrieves a completed export file for download.
    /// </summary>
    /// <param name="jobId">Export job identifier</param>
    /// <returns>Export file information, null if not found or expired</returns>
    Task<ExportFileInfo?> GetExportFileAsync(string jobId);

    /// <summary>
    /// Cleans up completed export jobs and temporary files older than specified retention period.
    /// </summary>
    /// <param name="retentionDays">Number of days to retain completed exports</param>
    /// <returns>Number of jobs cleaned up</returns>
    Task<int> CleanupExpiredExportsAsync(int retentionDays = 7);
}