using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ColorGarbApi.Services;
using ColorGarbApi.Models;
using System.Security.Claims;

namespace ColorGarbApi.Controllers;

/// <summary>
/// API controller for exporting communication audit data in various formats.
/// Supports CSV, Excel, and PDF exports with role-based access control.
/// </summary>
/// <since>3.4.0</since>
[ApiController]
[Route("api/communication-export")]
[Authorize]
public class CommunicationExportController : ControllerBase
{
    private readonly ICommunicationExportService _exportService;
    private readonly ICommunicationAuditService _auditService;
    private readonly ILogger<CommunicationExportController> _logger;

    public CommunicationExportController(
        ICommunicationExportService exportService,
        ICommunicationAuditService auditService,
        ILogger<CommunicationExportController> logger)
    {
        _exportService = exportService;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Exports communication audit data to CSV format.
    /// Supports filtering, pagination, and content inclusion options.
    /// </summary>
    /// <param name="request">Export request parameters</param>
    /// <returns>CSV file download</returns>
    /// <response code="200">CSV file generated successfully</response>
    /// <response code="400">Invalid export parameters</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpPost("csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportToCsv([FromBody] ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("CSV export requested by user {UserId}", GetCurrentUserId());

            // Validate access permissions
            if (!await ValidateExportAccessAsync(request.SearchCriteria.OrganizationId))
            {
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            ApplyOrganizationIsolation(request.SearchCriteria);

            // Validate request parameters
            var validationErrors = ValidateExportRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(string.Join("; ", validationErrors));
            }

            var csvData = await _exportService.ExportToCsvAsync(request);
            
            var fileName = $"communication-audit-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            
            _logger.LogInformation("CSV export completed: {FileName} ({Size} bytes)", 
                fileName, csvData.Length);
            
            return File(csvData, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing CSV export request");
            return BadRequest("Export generation failed");
        }
    }

    /// <summary>
    /// Exports communication audit data to Excel format with charts and formatting.
    /// Includes summary statistics and data visualization.
    /// </summary>
    /// <param name="request">Export request parameters</param>
    /// <returns>Excel file download</returns>
    /// <response code="200">Excel file generated successfully</response>
    /// <response code="400">Invalid export parameters</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpPost("excel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportToExcel([FromBody] ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("Excel export requested by user {UserId}", GetCurrentUserId());

            // Validate access permissions
            if (!await ValidateExportAccessAsync(request.SearchCriteria.OrganizationId))
            {
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            ApplyOrganizationIsolation(request.SearchCriteria);

            // Validate request parameters
            var validationErrors = ValidateExportRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(string.Join("; ", validationErrors));
            }

            var excelData = await _exportService.ExportToExcelAsync(request);
            
            var fileName = $"communication-audit-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            
            _logger.LogInformation("Excel export completed: {FileName} ({Size} bytes)", 
                fileName, excelData.Length);
            
            return File(excelData, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Excel export request");
            return BadRequest("Export generation failed");
        }
    }

    /// <summary>
    /// Generates a compliance report in PDF format.
    /// Includes delivery statistics, failure analysis, and regulatory compliance data.
    /// </summary>
    /// <param name="request">Compliance report parameters</param>
    /// <returns>PDF compliance report download</returns>
    /// <response code="200">PDF report generated successfully</response>
    /// <response code="400">Invalid report parameters</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpPost("compliance-report")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GenerateComplianceReport([FromBody] ComplianceReportRequest request)
    {
        try
        {
            _logger.LogInformation("Compliance report requested for organization {OrganizationId} by user {UserId}", 
                request.OrganizationId, GetCurrentUserId());

            // Validate access permissions
            if (!await ValidateExportAccessAsync(request.OrganizationId))
            {
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            if (!IsColorGarbStaff())
            {
                request.OrganizationId = GetCurrentOrganizationId() ?? request.OrganizationId;
            }

            // Validate date range
            if (request.From >= request.To)
            {
                return BadRequest("Invalid date range: From date must be before To date");
            }

            if ((request.To - request.From).TotalDays > 365)
            {
                return BadRequest("Date range cannot exceed 365 days");
            }

            var pdfData = await _exportService.GenerateCompliancePdfAsync(request);
            
            var fileName = $"compliance-report-{request.OrganizationId}-{DateTime.UtcNow:yyyyMMdd}.pdf";
            
            _logger.LogInformation("Compliance report completed: {FileName} ({Size} bytes)", 
                fileName, pdfData.Length);
            
            return File(pdfData, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance report");
            return BadRequest("Report generation failed");
        }
    }

    /// <summary>
    /// Estimates the size and processing time for a large export request.
    /// Used to determine if async processing is recommended.
    /// </summary>
    /// <param name="searchCriteria">Search criteria for the export</param>
    /// <returns>Export estimation data</returns>
    /// <response code="200">Export estimation completed</response>
    /// <response code="400">Invalid search criteria</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpPost("estimate")]
    [ProducesResponseType(typeof(ExportEstimation), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ExportEstimation>> EstimateExport([FromBody] CommunicationAuditSearchRequest searchCriteria)
    {
        try
        {
            _logger.LogDebug("Export estimation requested by user {UserId}", GetCurrentUserId());

            // Validate access permissions
            if (!await ValidateExportAccessAsync(searchCriteria.OrganizationId))
            {
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            ApplyOrganizationIsolation(searchCriteria);

            var recordCount = await _exportService.EstimateRecordCountAsync(searchCriteria);
            
            var estimation = new ExportEstimation
            {
                EstimatedRecords = recordCount,
                EstimatedSizeKB = recordCount * 2, // Rough estimate: 2KB per record
                RecommendedFormat = recordCount > 10000 ? "CSV" : "Excel",
                RequiresAsyncProcessing = recordCount > 1000,
                EstimatedProcessingMinutes = Math.Max(1, recordCount / 1000)
            };

            return Ok(estimation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error estimating export size");
            return BadRequest("Estimation failed");
        }
    }

    /// <summary>
    /// Queues a large export for background processing.
    /// Returns a job ID for tracking progress.
    /// </summary>
    /// <param name="request">Large export request</param>
    /// <param name="format">Export format (CSV, Excel, PDF)</param>
    /// <returns>Export job information</returns>
    /// <response code="202">Export job queued successfully</response>
    /// <response code="400">Invalid export parameters</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpPost("queue/{format}")]
    [ProducesResponseType(typeof(ExportCommunicationResult), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ExportCommunicationResult>> QueueLargeExport(
        [FromBody] ExportCommunicationRequest request, 
        [FromRoute] string format)
    {
        try
        {
            _logger.LogInformation("Large export queued: format={Format}, user={UserId}", 
                format, GetCurrentUserId());

            // Validate access permissions
            if (!await ValidateExportAccessAsync(request.SearchCriteria.OrganizationId))
            {
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            ApplyOrganizationIsolation(request.SearchCriteria);

            // Validate format
            var validFormats = new[] { "csv", "excel", "pdf" };
            if (!validFormats.Contains(format.ToLower()))
            {
                return BadRequest($"Invalid format. Supported formats: {string.Join(", ", validFormats)}");
            }

            // Validate request parameters
            var validationErrors = ValidateExportRequest(request);
            if (validationErrors.Any())
            {
                return BadRequest(string.Join("; ", validationErrors));
            }

            var result = await _exportService.QueueLargeExportAsync(request, format);
            
            return Accepted(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error queuing large export");
            return BadRequest("Failed to queue export job");
        }
    }

    #region Helper Methods

    /// <summary>
    /// Gets the current user ID from JWT claims
    /// </summary>
    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Gets the current user's organization ID from JWT claims
    /// </summary>
    private Guid? GetCurrentOrganizationId()
    {
        var orgClaim = User.FindFirst("organization_id")?.Value;
        return Guid.TryParse(orgClaim, out var orgId) ? orgId : null;
    }

    /// <summary>
    /// Determines if the current user is ColorGarb staff
    /// </summary>
    private bool IsColorGarbStaff()
    {
        return User.IsInRole("ColorGarbStaff");
    }

    /// <summary>
    /// Validates export access permissions for the specified organization
    /// </summary>
    private async Task<bool> ValidateExportAccessAsync(Guid? organizationId)
    {
        var currentUserId = GetCurrentUserId();
        var currentOrgId = GetCurrentOrganizationId();

        // ColorGarb staff have full access
        if (IsColorGarbStaff())
        {
            return true;
        }

        // Regular users can only export their own organization's data
        if (organizationId.HasValue && currentOrgId.HasValue)
        {
            return organizationId.Value == currentOrgId.Value;
        }

        // Use audit service validation as fallback
        return await _auditService.ValidateAuditAccessAsync(currentUserId, organizationId);
    }

    /// <summary>
    /// Applies organization isolation to search criteria for non-staff users
    /// </summary>
    private void ApplyOrganizationIsolation(CommunicationAuditSearchRequest searchCriteria)
    {
        if (!IsColorGarbStaff())
        {
            searchCriteria.OrganizationId = GetCurrentOrganizationId();
        }
    }

    /// <summary>
    /// Validates export request parameters
    /// </summary>
    private List<string> ValidateExportRequest(ExportCommunicationRequest request)
    {
        var errors = new List<string>();

        // Validate max records limit
        if (request.MaxRecords > 50000)
        {
            errors.Add("Maximum records limit is 50,000 for direct export");
        }

        // Validate search criteria
        var searchErrors = request.SearchCriteria.Validate();
        errors.AddRange(searchErrors);

        return errors;
    }

    #endregion
}

/// <summary>
/// Export estimation result model
/// </summary>
public class ExportEstimation
{
    /// <summary>
    /// Estimated number of records to be exported
    /// </summary>
    public int EstimatedRecords { get; set; }

    /// <summary>
    /// Estimated file size in KB
    /// </summary>
    public int EstimatedSizeKB { get; set; }

    /// <summary>
    /// Recommended export format based on data size
    /// </summary>
    public string RecommendedFormat { get; set; } = "CSV";

    /// <summary>
    /// Whether async processing is recommended for this export size
    /// </summary>
    public bool RequiresAsyncProcessing { get; set; }

    /// <summary>
    /// Estimated processing time in minutes
    /// </summary>
    public int EstimatedProcessingMinutes { get; set; }

    /// <summary>
    /// Additional recommendations or warnings
    /// </summary>
    public List<string> Recommendations { get; set; } = new List<string>();
}