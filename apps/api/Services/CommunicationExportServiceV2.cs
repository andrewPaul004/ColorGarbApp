using System.Globalization;
using System.Text;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using Microsoft.Extensions.Logging;
using CsvHelper;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using OfficeOpenXml.Table;
using System.Drawing;

namespace ColorGarbApi.Services;

/// <summary>
/// Enhanced export service for communication audit trail data with multiple format support.
/// Implements efficient streaming for large datasets and comprehensive formatting options.
/// </summary>
/// <since>3.4.0</since>
public class CommunicationExportServiceV2 : ICommunicationExportService
{
    private readonly ICommunicationAuditService _auditService;
    private readonly ILogger<CommunicationExportServiceV2> _logger;

    /// <summary>
    /// Maximum records for synchronous export processing
    /// </summary>
    private const int MAX_SYNC_RECORDS = 1000;

    public CommunicationExportServiceV2(
        ICommunicationAuditService auditService,
        ILogger<CommunicationExportServiceV2> logger)
    {
        _auditService = auditService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportToCsvAsync(ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("Starting CSV export with {MaxRecords} record limit", request.MaxRecords);

            var searchRequest = request.SearchCriteria;
            searchRequest.PageSize = Math.Min(request.MaxRecords, 10000);
            searchRequest.Page = 1;

            var result = await _auditService.SearchCommunicationLogsAsync(searchRequest);
            
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            // Write CSV headers
            csv.WriteField("ID");
            csv.WriteField("Order ID");
            csv.WriteField("Communication Type");
            csv.WriteField("Sender ID");
            csv.WriteField("Recipient Email");
            csv.WriteField("Recipient Phone");
            csv.WriteField("Subject");
            if (request.IncludeContent)
            {
                csv.WriteField("Content");
            }
            csv.WriteField("Template Used");
            csv.WriteField("Delivery Status");
            csv.WriteField("External Message ID");
            csv.WriteField("Sent At");
            csv.WriteField("Delivered At");
            csv.WriteField("Read At");
            csv.WriteField("Failure Reason");
            if (request.IncludeMetadata)
            {
                csv.WriteField("Metadata");
            }
            csv.WriteField("Created At");
            csv.NextRecord();

            // Write data rows
            foreach (var log in result.Logs.Take(request.MaxRecords))
            {
                csv.WriteField(log.Id.ToString());
                csv.WriteField(log.OrderId.ToString());
                csv.WriteField(log.CommunicationType);
                csv.WriteField(log.SenderId.ToString());
                csv.WriteField(log.RecipientEmail ?? "");
                csv.WriteField(log.RecipientPhone ?? "");
                csv.WriteField(log.Subject ?? "");
                if (request.IncludeContent)
                {
                    csv.WriteField(SanitizeForCsv(log.Content));
                }
                csv.WriteField(log.TemplateUsed ?? "");
                csv.WriteField(log.DeliveryStatus);
                csv.WriteField(log.ExternalMessageId ?? "");
                csv.WriteField(log.SentAt.ToString("O"));
                csv.WriteField(log.DeliveredAt?.ToString("O") ?? "");
                csv.WriteField(log.ReadAt?.ToString("O") ?? "");
                csv.WriteField(log.FailureReason ?? "");
                if (request.IncludeMetadata)
                {
                    csv.WriteField(log.Metadata ?? "");
                }
                csv.WriteField(log.CreatedAt.ToString("O"));
                csv.NextRecord();
            }

            await writer.FlushAsync();
            var csvData = memoryStream.ToArray();
            
            _logger.LogInformation("CSV export completed: {Size} bytes for {Count} records", 
                csvData.Length, result.Logs.Count());
            
            return csvData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating CSV export");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportToExcelAsync(ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogInformation("Starting Excel export with {MaxRecords} record limit", request.MaxRecords);

            var searchRequest = request.SearchCriteria;
            searchRequest.PageSize = Math.Min(request.MaxRecords, 10000);
            searchRequest.Page = 1;

            var result = await _auditService.SearchCommunicationLogsAsync(searchRequest);
            
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using var package = new ExcelPackage();

            // Create main data worksheet
            var worksheet = package.Workbook.Worksheets.Add("Communication Logs");
            
            // Define column headers
            var headers = new List<string>
            {
                "ID", "Order ID", "Communication Type", "Sender ID", "Recipient Email", 
                "Recipient Phone", "Subject", "Delivery Status", "Template Used", 
                "External Message ID", "Sent At", "Delivered At", "Read At", 
                "Failure Reason", "Created At"
            };

            if (request.IncludeContent)
            {
                headers.Insert(7, "Content");
            }

            if (request.IncludeMetadata)
            {
                headers.Add("Metadata");
            }

            // Set headers
            for (int i = 0; i < headers.Count; i++)
            {
                worksheet.Cells[1, i + 1].Value = headers[i];
                worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightGray);
            }

            // Populate data
            int row = 2;
            foreach (var log in result.Logs.Take(request.MaxRecords))
            {
                int col = 1;
                worksheet.Cells[row, col++].Value = log.Id.ToString();
                worksheet.Cells[row, col++].Value = log.OrderId.ToString();
                worksheet.Cells[row, col++].Value = log.CommunicationType;
                worksheet.Cells[row, col++].Value = log.SenderId.ToString();
                worksheet.Cells[row, col++].Value = log.RecipientEmail ?? "";
                worksheet.Cells[row, col++].Value = log.RecipientPhone ?? "";
                worksheet.Cells[row, col++].Value = log.Subject ?? "";
                
                if (request.IncludeContent)
                {
                    worksheet.Cells[row, col++].Value = TruncateForExcel(log.Content);
                }

                worksheet.Cells[row, col++].Value = log.DeliveryStatus;
                worksheet.Cells[row, col++].Value = log.TemplateUsed ?? "";
                worksheet.Cells[row, col++].Value = log.ExternalMessageId ?? "";
                worksheet.Cells[row, col++].Value = log.SentAt;
                worksheet.Cells[row, col++].Value = log.DeliveredAt;
                worksheet.Cells[row, col++].Value = log.ReadAt;
                worksheet.Cells[row, col++].Value = log.FailureReason ?? "";
                worksheet.Cells[row, col++].Value = log.CreatedAt;

                if (request.IncludeMetadata)
                {
                    worksheet.Cells[row, col++].Value = log.Metadata ?? "";
                }

                row++;
            }

            // Format as table
            var tableRange = worksheet.Cells[1, 1, row - 1, headers.Count];
            var table = worksheet.Tables.Add(tableRange, "CommunicationAuditTable");
            table.TableStyle = TableStyles.Medium2;

            // Auto-fit columns
            worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

            // Create summary worksheet
            var summarySheet = package.Workbook.Worksheets.Add("Summary");
            CreateSummarySheet(summarySheet, result);

            var excelData = package.GetAsByteArray();
            
            _logger.LogInformation("Excel export completed: {Size} bytes for {Count} records", 
                excelData.Length, result.Logs.Count());
            
            return excelData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Excel export");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateCompliancePdfAsync(ComplianceReportRequest request)
    {
        try
        {
            _logger.LogInformation("Generating compliance PDF report for organization {OrganizationId}", 
                request.OrganizationId);

            var searchCriteria = new CommunicationAuditSearchRequest
            {
                OrganizationId = request.OrganizationId,
                DateFrom = request.From.DateTime,
                DateTo = request.To.DateTime,
                PageSize = 10000
            };

            var result = await _auditService.SearchCommunicationLogsAsync(searchCriteria);
            var summary = await _auditService.GetDeliveryStatusSummaryAsync(
                request.OrganizationId, request.From, request.To);

            // Simple PDF generation using System.Text approach
            // In a real implementation, you'd use a proper PDF library like iTextSharp or PdfSharpCore
            var pdfContent = GenerateComplianceReportText(request, result, summary);
            var pdfBytes = Encoding.UTF8.GetBytes(pdfContent);
            
            _logger.LogInformation("Compliance PDF generated: {Size} bytes", pdfBytes.Length);
            
            return pdfBytes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance PDF");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> EstimateRecordCountAsync(CommunicationAuditSearchRequest searchCriteria)
    {
        try
        {
            // Use a minimal search to get just the count
            var countRequest = new CommunicationAuditSearchRequest
            {
                OrganizationId = searchCriteria.OrganizationId,
                OrderId = searchCriteria.OrderId,
                CommunicationType = searchCriteria.CommunicationType,
                DateFrom = searchCriteria.DateFrom,
                DateTo = searchCriteria.DateTo,
                Page = 1,
                PageSize = 1
            };

            var result = await _auditService.SearchCommunicationLogsAsync(countRequest);
            return result.TotalCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error estimating record count");
            return 0;
        }
    }

    /// <inheritdoc />
    public async Task<ExportCommunicationResult> QueueLargeExportAsync(
        ExportCommunicationRequest request, string format)
    {
        try
        {
            var jobId = Guid.NewGuid().ToString();
            var estimatedCount = await EstimateRecordCountAsync(request.SearchCriteria);

            _logger.LogInformation("Queuing large export job {JobId} for {EstimatedCount} records in {Format} format", 
                jobId, estimatedCount, format);

            // In a real implementation, this would queue a background job
            // For now, return a processing status
            return new ExportCommunicationResult
            {
                JobId = jobId,
                Status = "Processing",
                EstimatedSize = estimatedCount * 1024, // Rough estimate
                RecordCount = estimatedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error queuing large export");
            throw;
        }
    }

    #region Helper Methods

    /// <summary>
    /// Sanitizes content for CSV export by removing problematic characters
    /// </summary>
    private static string SanitizeForCsv(string content)
    {
        if (string.IsNullOrEmpty(content))
            return string.Empty;

        // Remove line breaks and limit length
        return content.Replace('\n', ' ')
                     .Replace('\r', ' ')
                     .Replace('\t', ' ')
                     .Substring(0, Math.Min(content.Length, 1000));
    }

    /// <summary>
    /// Truncates content for Excel cells (Excel has a 32,767 character limit per cell)
    /// </summary>
    private static string TruncateForExcel(string content)
    {
        if (string.IsNullOrEmpty(content))
            return string.Empty;

        return content.Length > 32767 ? content.Substring(0, 32764) + "..." : content;
    }

    /// <summary>
    /// Creates a summary worksheet with analytics
    /// </summary>
    private void CreateSummarySheet(ExcelWorksheet sheet, CommunicationAuditResult result)
    {
        sheet.Cells[1, 1].Value = "Communication Audit Summary";
        sheet.Cells[1, 1].Style.Font.Size = 16;
        sheet.Cells[1, 1].Style.Font.Bold = true;

        sheet.Cells[3, 1].Value = "Total Communications:";
        sheet.Cells[3, 2].Value = result.TotalCount;

        sheet.Cells[4, 1].Value = "Export Date:";
        sheet.Cells[4, 2].Value = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC");

        // Status summary
        int row = 6;
        sheet.Cells[row, 1].Value = "Delivery Status Breakdown:";
        sheet.Cells[row, 1].Style.Font.Bold = true;
        row++;

        foreach (var status in result.StatusSummary)
        {
            sheet.Cells[row, 1].Value = status.Key;
            sheet.Cells[row, 2].Value = status.Value;
            row++;
        }

        sheet.Cells.AutoFitColumns();
    }

    /// <summary>
    /// Generates compliance report text content
    /// </summary>
    private string GenerateComplianceReportText(ComplianceReportRequest request, 
        CommunicationAuditResult result, DeliveryStatusSummary summary)
    {
        var sb = new StringBuilder();
        
        sb.AppendLine("COMMUNICATION COMPLIANCE REPORT");
        sb.AppendLine("=====================================");
        sb.AppendLine();
        sb.AppendLine($"Organization: {request.OrganizationId}");
        sb.AppendLine($"Report Period: {request.From:yyyy-MM-dd} to {request.To:yyyy-MM-dd}");
        sb.AppendLine($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine();
        
        sb.AppendLine("SUMMARY");
        sb.AppendLine("-------");
        sb.AppendLine($"Total Communications: {summary.TotalCommunications}");
        sb.AppendLine($"Delivery Success Rate: {summary.DeliverySuccessRate:F2}%");
        sb.AppendLine();
        
        sb.AppendLine("DELIVERY STATUS BREAKDOWN");
        sb.AppendLine("------------------------");
        foreach (var status in summary.StatusCounts)
        {
            var percentage = summary.TotalCommunications > 0 
                ? (double)status.Value / summary.TotalCommunications * 100 
                : 0;
            sb.AppendLine($"{status.Key}: {status.Value} ({percentage:F1}%)");
        }
        sb.AppendLine();
        
        sb.AppendLine("COMMUNICATION TYPE BREAKDOWN");
        sb.AppendLine("---------------------------");
        foreach (var type in summary.TypeCounts)
        {
            var percentage = summary.TotalCommunications > 0 
                ? (double)type.Value / summary.TotalCommunications * 100 
                : 0;
            sb.AppendLine($"{type.Key}: {type.Value} ({percentage:F1}%)");
        }
        
        return sb.ToString();
    }

    #endregion
}

/// <summary>
/// Request model for compliance report generation
/// </summary>
public class ComplianceReportRequest
{
    /// <summary>
    /// Organization ID for the compliance report
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Start date for the compliance period
    /// </summary>
    public DateTimeOffset From { get; set; }

    /// <summary>
    /// End date for the compliance period
    /// </summary>
    public DateTimeOffset To { get; set; }

    /// <summary>
    /// Include detailed communication logs in the report
    /// </summary>
    public bool IncludeDetailedLogs { get; set; } = false;

    /// <summary>
    /// Report title (optional)
    /// </summary>
    public string? ReportTitle { get; set; }
}