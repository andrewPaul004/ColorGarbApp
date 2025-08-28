using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ColorGarbApi.Services;
using ColorGarbApi.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ColorGarbApi.Controllers;

/// <summary>
/// API endpoints for exporting and generating reports from communication audit trail data.
/// Supports CSV, Excel, and PDF exports with filtering, searching, and compliance reporting.
/// </summary>
/// <since>3.4.0</since>
[ApiController]
[Route("api/communication-reports")]
[Authorize]
public class CommunicationReportsController : ControllerBase
{
    private readonly ICommunicationAuditService _auditService;
    private readonly ICommunicationExportService _exportService;
    private readonly ILogger<CommunicationReportsController> _logger;

    public CommunicationReportsController(
        ICommunicationAuditService auditService,
        ICommunicationExportService exportService,
        ILogger<CommunicationReportsController> logger)
    {
        _auditService = auditService;
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Exports communication audit data to CSV format.
    /// Supports filtering, searching, and pagination for large datasets.
    /// </summary>
    /// <param name="request">Export request parameters including search criteria</param>
    /// <returns>CSV file download or async job reference for large exports</returns>
    [HttpPost("export/csv")]
    [ProducesResponseType(typeof(FileResult), 200)]
    [ProducesResponseType(typeof(ExportCommunicationResult), 202)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ExportToCsv([FromBody] ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("CSV export requested with criteria: Organization={OrganizationId}, DateRange={DateFrom}-{DateTo}", 
                request.SearchCriteria.OrganizationId, request.SearchCriteria.DateFrom, request.SearchCriteria.DateTo);

            // Validate export request
            var validationResult = await ValidateExportRequest(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new { errors = validationResult.Errors });
            }

            // For small exports, return file directly
            if (await _exportService.EstimateRecordCountAsync(request.SearchCriteria) <= 1000)
            {
                var csvData = await _exportService.ExportToCsvAsync(request);
                var fileName = $"communication-audit-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
                
                return File(csvData, "text/csv", fileName);
            }
            
            // For large exports, queue asynchronous processing
            var exportJob = await _exportService.QueueExportAsync(request, "CSV");
            return Accepted(new { jobId = exportJob.JobId, status = exportJob.Status });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting communication data to CSV");
            return StatusCode(500, "Export failed");
        }
    }

    /// <summary>
    /// Exports communication audit data to Excel format with formatting and charts.
    /// </summary>
    /// <param name="request">Export request parameters</param>
    /// <returns>Excel file download or async job reference</returns>
    [HttpPost("export/excel")]
    [ProducesResponseType(typeof(FileResult), 200)]
    [ProducesResponseType(typeof(ExportCommunicationResult), 202)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ExportToExcel([FromBody] ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("Excel export requested with criteria: Organization={OrganizationId}", 
                request.SearchCriteria.OrganizationId);

            var validationResult = await ValidateExportRequest(request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new { errors = validationResult.Errors });
            }

            // For small exports, return file directly
            if (await _exportService.EstimateRecordCountAsync(request.SearchCriteria) <= 500)
            {
                var excelData = await _exportService.ExportToExcelAsync(request);
                var fileName = $"communication-audit-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
                
                return File(excelData, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            
            var exportJob = await _exportService.QueueExportAsync(request, "Excel");
            return Accepted(new { jobId = exportJob.JobId, status = exportJob.Status });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting communication data to Excel");
            return StatusCode(500, "Export failed");
        }
    }

    /// <summary>
    /// Generates a compliance report in PDF format with delivery statistics and audit summary.
    /// </summary>
    /// <param name="request">Report generation request</param>
    /// <returns>PDF file download</returns>
    [HttpPost("reports/compliance-pdf")]
    [ProducesResponseType(typeof(FileResult), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> GenerateComplianceReport([FromBody] ComplianceReportRequest request)
    {
        try
        {
            _logger.LogInformation("Compliance PDF report requested for Organization={OrganizationId}, Period={DateFrom}-{DateTo}", 
                request.OrganizationId, request.DateFrom, request.DateTo);

            // Validate organization access
            if (!await _auditService.ValidateAuditAccessAsync(GetCurrentUserId(), request.OrganizationId))
            {
                return Forbid("Access denied to organization audit data");
            }

            var pdfData = await _exportService.GenerateCompliancePdfAsync(request);
            var fileName = $"communication-compliance-{request.OrganizationId}-{DateTime.UtcNow:yyyyMMdd}.pdf";
            
            return File(pdfData, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance PDF report");
            return StatusCode(500, "Report generation failed");
        }
    }

    /// <summary>
    /// Gets the status and download URL for an asynchronous export job.
    /// </summary>
    /// <param name="jobId">Export job identifier</param>
    /// <returns>Job status and download information</returns>
    [HttpGet("export/status/{jobId}")]
    [ProducesResponseType(typeof(ExportCommunicationResult), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetExportStatus([Required] string jobId)
    {
        try
        {
            var jobStatus = await _exportService.GetExportStatusAsync(jobId);
            if (jobStatus == null)
            {
                return NotFound($"Export job {jobId} not found");
            }

            return Ok(jobStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving export status for job {JobId}", jobId);
            return StatusCode(500, "Status retrieval failed");
        }
    }

    /// <summary>
    /// Downloads a completed export file by job ID.
    /// </summary>
    /// <param name="jobId">Export job identifier</param>
    /// <returns>Export file download</returns>
    [HttpGet("export/download/{jobId}")]
    [ProducesResponseType(typeof(FileResult), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DownloadExport([Required] string jobId)
    {
        try
        {
            var exportFile = await _exportService.GetExportFileAsync(jobId);
            if (exportFile == null)
            {
                return NotFound($"Export file for job {jobId} not found or expired");
            }

            return File(exportFile.Data, exportFile.ContentType, exportFile.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading export file for job {JobId}", jobId);
            return StatusCode(500, "Download failed");
        }
    }

    /// <summary>
    /// Gets delivery status summary and statistics for a date range.
    /// </summary>
    /// <param name="organizationId">Organization ID for the summary</param>
    /// <param name="from">Start date (ISO format)</param>
    /// <param name="to">End date (ISO format)</param>
    /// <returns>Delivery status summary with charts data</returns>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DeliveryStatusSummary), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> GetDeliveryStatusSummary(
        [FromQuery] Guid organizationId,
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        try
        {
            if (to <= from)
            {
                return BadRequest("End date must be after start date");
            }

            if ((to - from).TotalDays > 365)
            {
                return BadRequest("Date range cannot exceed 365 days");
            }

            // Validate organization access
            if (!await _auditService.ValidateAuditAccessAsync(GetCurrentUserId(), organizationId))
            {
                return Forbid("Access denied to organization audit data");
            }

            var summary = await _auditService.GetDeliveryStatusSummaryAsync(organizationId, from, to);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating delivery status summary");
            return StatusCode(500, "Summary generation failed");
        }
    }

    /// <summary>
    /// Searches communication audit logs with advanced filtering.
    /// </summary>
    /// <param name="request">Search and filtering criteria</param>
    /// <returns>Paginated communication logs matching criteria</returns>
    [HttpPost("search")]
    [ProducesResponseType(typeof(CommunicationAuditResult), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SearchCommunicationLogs([FromBody] CommunicationAuditSearchRequest request)
    {
        try
        {
            // Enforce organization isolation for non-staff users
            var userId = GetCurrentUserId();
            if (request.OrganizationId == null)
            {
                // TODO: Get user's organization ID from user service
                // request.OrganizationId = await GetUserOrganizationId(userId);
            }

            var results = await _auditService.SearchCommunicationLogsAsync(request);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching communication logs");
            return StatusCode(500, "Search failed");
        }
    }

    /// <summary>
    /// Validates an export request for security and resource constraints.
    /// </summary>
    /// <param name="request">Export request to validate</param>
    /// <returns>Validation result with error messages if invalid</returns>
    private async Task<ValidationResult> ValidateExportRequest(ExportCommunicationRequest request)
    {
        var result = new ValidationResult { IsValid = true, Errors = new List<string>() };

        // Validate organization access
        var userId = GetCurrentUserId();
        if (request.SearchCriteria.OrganizationId != null)
        {
            if (!await _auditService.ValidateAuditAccessAsync(userId, request.SearchCriteria.OrganizationId))
            {
                result.IsValid = false;
                result.Errors.Add("Access denied to organization audit data");
                return result;
            }
        }

        // Validate date range
        if (request.SearchCriteria.DateFrom != null && request.SearchCriteria.DateTo != null)
        {
            if (request.SearchCriteria.DateTo <= request.SearchCriteria.DateFrom)
            {
                result.IsValid = false;
                result.Errors.Add("End date must be after start date");
            }

            var daysDiff = (request.SearchCriteria.DateTo.Value - request.SearchCriteria.DateFrom.Value).TotalDays;
            if (daysDiff > 365)
            {
                result.IsValid = false;
                result.Errors.Add("Date range cannot exceed 365 days for exports");
            }
        }

        // Validate record limits
        if (request.MaxRecords > 100000)
        {
            result.IsValid = false;
            result.Errors.Add("Maximum export limit is 100,000 records");
        }

        return result;
    }

    /// <summary>
    /// Gets the current user's ID from the JWT token or authentication context.
    /// </summary>
    /// <returns>Current user's GUID</returns>
    private Guid GetCurrentUserId()
    {
        // TODO: Extract from JWT claims or authentication context
        // For now, return a placeholder - implement based on your auth system
        var userIdClaim = User.FindFirst("userId")?.Value 
                         ?? User.FindFirst("sub")?.Value 
                         ?? User.FindFirst("id")?.Value;
        
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        
        throw new UnauthorizedAccessException("Unable to determine current user ID");
    }
}

/// <summary>
/// Request model for generating compliance reports.
/// </summary>
public class ComplianceReportRequest
{
    /// <summary>
    /// Organization ID for the compliance report
    /// </summary>
    [Required]
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Start date for the compliance period
    /// </summary>
    [Required]
    public DateTime DateFrom { get; set; }

    /// <summary>
    /// End date for the compliance period
    /// </summary>
    [Required]
    public DateTime DateTo { get; set; }

    /// <summary>
    /// Include detailed failure analysis in the report
    /// </summary>
    public bool IncludeFailureAnalysis { get; set; } = true;

    /// <summary>
    /// Include delivery trend charts
    /// </summary>
    public bool IncludeCharts { get; set; } = true;

    /// <summary>
    /// Report title for customization
    /// </summary>
    public string? ReportTitle { get; set; }
}

/// <summary>
/// Validation result for export requests.
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}

