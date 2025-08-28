using System.Globalization;
using System.Text;
using ColorGarbApi.Controllers;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;
using iTextSharp.text;
using iTextSharp.text.pdf;
using Document = iTextSharp.text.Document;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for exporting communication audit data in various formats.
/// Provides CSV, Excel, and PDF export capabilities with async processing for large datasets.
/// </summary>
/// <since>3.4.0</since>
public class CommunicationExportService : ICommunicationExportService
{
    private readonly ICommunicationAuditService _auditService;
    private readonly ILogger<CommunicationExportService> _logger;
    private readonly IConfiguration _configuration;

    // In-memory storage for demo - in production, use Redis or database
    private static readonly Dictionary<string, ExportJob> _exportJobs = new();
    private static readonly Dictionary<string, byte[]> _exportFiles = new();

    public CommunicationExportService(
        ICommunicationAuditService auditService,
        ILogger<CommunicationExportService> logger,
        IConfiguration configuration)
    {
        _auditService = auditService;
        _logger = logger;
        _configuration = configuration;
        
        // Set EPPlus license context (required for non-commercial use)
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportToCsvAsync(ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogDebug("Starting CSV export with criteria: Organization={OrganizationId}, DateRange={DateFrom}-{DateTo}",
                request.SearchCriteria.OrganizationId, request.SearchCriteria.DateFrom, request.SearchCriteria.DateTo);

            // Configure search request for export
            var searchRequest = request.SearchCriteria;
            searchRequest.IncludeContent = request.IncludeContent;
            searchRequest.PageSize = Math.Min(request.MaxRecords, 50000); // Process in batches
            searchRequest.Page = 1;

            var csvBuilder = new StringBuilder();
            
            // Add CSV header
            AddCsvHeader(csvBuilder, request.IncludeContent, request.IncludeMetadata);

            var totalRecords = 0;
            var hasMoreData = true;
            
            while (hasMoreData && totalRecords < request.MaxRecords)
            {
                var results = await _auditService.SearchCommunicationLogsAsync(searchRequest);
                
                if (!results.Logs.Any())
                {
                    break;
                }

                // Add data rows
                foreach (var log in results.Logs)
                {
                    if (totalRecords >= request.MaxRecords)
                        break;
                        
                    AddCsvRow(csvBuilder, log, request.IncludeContent, request.IncludeMetadata);
                    totalRecords++;
                }

                // Check if we need to fetch more pages
                hasMoreData = results.HasNextPage;
                searchRequest.Page++;
                
                _logger.LogDebug("CSV export progress: {ProcessedRecords}/{MaxRecords}", totalRecords, request.MaxRecords);
            }

            var csvData = Encoding.UTF8.GetBytes(csvBuilder.ToString());
            
            _logger.LogInformation("CSV export completed: {RecordCount} records, {SizeBytes} bytes", 
                totalRecords, csvData.Length);
                
            return csvData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating CSV export");
            throw new InvalidOperationException("CSV export failed", ex);
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportToExcelAsync(ExportCommunicationRequest request)
    {
        try
        {
            _logger.LogDebug("Starting Excel export with criteria: Organization={OrganizationId}, DateRange={DateFrom}-{DateTo}",
                request.SearchCriteria.OrganizationId, request.SearchCriteria.DateFrom, request.SearchCriteria.DateTo);

            using var package = new ExcelPackage();
            
            // Create main data worksheet
            var dataWorksheet = package.Workbook.Worksheets.Add("Communication Audit");
            
            // Configure search request for export
            var searchRequest = request.SearchCriteria;
            searchRequest.IncludeContent = request.IncludeContent;
            searchRequest.PageSize = Math.Min(request.MaxRecords, 10000); // Process in batches for Excel
            searchRequest.Page = 1;

            var totalRecords = 0;
            var currentRow = 2; // Start after header

            // Add headers
            AddExcelHeaders(dataWorksheet, request.IncludeContent, request.IncludeMetadata);

            var hasMoreData = true;
            while (hasMoreData && totalRecords < request.MaxRecords)
            {
                var results = await _auditService.SearchCommunicationLogsAsync(searchRequest);
                
                if (!results.Logs.Any())
                    break;

                // Add data rows
                foreach (var log in results.Logs)
                {
                    if (totalRecords >= request.MaxRecords)
                        break;
                        
                    AddExcelDataRow(dataWorksheet, currentRow, log, request.IncludeContent, request.IncludeMetadata);
                    currentRow++;
                    totalRecords++;
                }

                hasMoreData = results.HasNextPage;
                searchRequest.Page++;
                
                _logger.LogDebug("Excel export progress: {ProcessedRecords}/{MaxRecords}", totalRecords, request.MaxRecords);
            }

            // Apply formatting
            FormatExcelWorksheet(dataWorksheet, currentRow - 1, request.IncludeContent, request.IncludeMetadata);

            // Create summary worksheet if we have data
            if (totalRecords > 0)
            {
                await CreateSummaryWorksheet(package, request);
            }

            // Generate the Excel file
            var excelData = package.GetAsByteArray();
            
            _logger.LogInformation("Excel export completed: {RecordCount} records, {SizeBytes} bytes", 
                totalRecords, excelData.Length);
                
            return excelData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Excel export");
            throw new InvalidOperationException("Excel export failed", ex);
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateCompliancePdfAsync(ComplianceReportRequest request)
    {
        try
        {
            _logger.LogDebug("Starting PDF compliance report generation for Organization={OrganizationId}", 
                request.OrganizationId);

            // Get summary data for the report
            var summary = await _auditService.GetDeliveryStatusSummaryAsync(
                request.OrganizationId, 
                new DateTimeOffset(request.DateFrom), 
                new DateTimeOffset(request.DateTo));

            using var memoryStream = new MemoryStream();
            using var document = new Document(PageSize.A4, 50, 50, 50, 50);
            var writer = PdfWriter.GetInstance(document, memoryStream);
            
            document.Open();

            // Define fonts
            var titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 18, BaseColor.BLACK);
            var headingFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 14, BaseColor.BLACK);
            var normalFont = FontFactory.GetFont(FontFactory.HELVETICA, 12, BaseColor.BLACK);
            var smallFont = FontFactory.GetFont(FontFactory.HELVETICA, 10, BaseColor.GRAY);

            // Title
            var reportTitle = request.ReportTitle ?? "Communication Compliance Report";
            var titleParagraph = new Paragraph(reportTitle, titleFont)
            {
                Alignment = Element.ALIGN_CENTER,
                SpacingAfter = 20
            };
            document.Add(titleParagraph);

            // Report metadata
            var metaTable = new PdfPTable(2) { WidthPercentage = 100 };
            metaTable.SetWidths(new float[] { 30, 70 });
            
            metaTable.AddCell(CreateCell("Organization ID:", normalFont, BaseColor.LIGHT_GRAY));
            metaTable.AddCell(CreateCell(request.OrganizationId.ToString(), normalFont));
            
            metaTable.AddCell(CreateCell("Report Period:", normalFont, BaseColor.LIGHT_GRAY));
            metaTable.AddCell(CreateCell($"{request.DateFrom:yyyy-MM-dd} to {request.DateTo:yyyy-MM-dd}", normalFont));
            
            metaTable.AddCell(CreateCell("Generated:", normalFont, BaseColor.LIGHT_GRAY));
            metaTable.AddCell(CreateCell(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"), normalFont));
            
            metaTable.AddCell(CreateCell("Total Communications:", normalFont, BaseColor.LIGHT_GRAY));
            metaTable.AddCell(CreateCell(summary.TotalCommunications.ToString(), normalFont));

            metaTable.SpacingAfter = 20;
            document.Add(metaTable);

            // Delivery Summary Section
            var deliveryHeading = new Paragraph("Delivery Summary", headingFont)
            {
                SpacingBefore = 10,
                SpacingAfter = 10
            };
            document.Add(deliveryHeading);

            // Status breakdown table
            if (summary.StatusCounts.Any())
            {
                var statusTable = new PdfPTable(3) { WidthPercentage = 100 };
                statusTable.SetWidths(new float[] { 40, 30, 30 });

                // Headers
                statusTable.AddCell(CreateCell("Status", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));
                statusTable.AddCell(CreateCell("Count", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));
                statusTable.AddCell(CreateCell("Percentage", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));

                foreach (var status in summary.StatusCounts.OrderByDescending(x => x.Value))
                {
                    var percentage = summary.TotalCommunications > 0 
                        ? (status.Value * 100.0 / summary.TotalCommunications).ToString("F1")
                        : "0.0";

                    var bgColor = status.Key.ToLower() switch
                    {
                        "delivered" => BaseColor.LIGHT_GRAY,
                        "failed" or "bounced" => new BaseColor(255, 230, 230),
                        _ => BaseColor.WHITE
                    };

                    statusTable.AddCell(CreateCell(status.Key, normalFont, bgColor));
                    statusTable.AddCell(CreateCell(status.Value.ToString(), normalFont, bgColor));
                    statusTable.AddCell(CreateCell($"{percentage}%", normalFont, bgColor));
                }

                statusTable.SpacingAfter = 15;
                document.Add(statusTable);
            }

            // Communication Type Breakdown
            if (summary.TypeCounts.Any())
            {
                var typeHeading = new Paragraph("Communication Type Breakdown", headingFont)
                {
                    SpacingBefore = 10,
                    SpacingAfter = 10
                };
                document.Add(typeHeading);

                var typeTable = new PdfPTable(3) { WidthPercentage = 100 };
                typeTable.SetWidths(new float[] { 40, 30, 30 });

                // Headers
                typeTable.AddCell(CreateCell("Type", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));
                typeTable.AddCell(CreateCell("Count", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));
                typeTable.AddCell(CreateCell("Percentage", headingFont, BaseColor.DARK_GRAY, BaseColor.WHITE));

                foreach (var type in summary.TypeCounts.OrderByDescending(x => x.Value))
                {
                    var percentage = summary.TotalCommunications > 0 
                        ? (type.Value * 100.0 / summary.TotalCommunications).ToString("F1")
                        : "0.0";

                    typeTable.AddCell(CreateCell(type.Key, normalFont));
                    typeTable.AddCell(CreateCell(type.Value.ToString(), normalFont));
                    typeTable.AddCell(CreateCell($"{percentage}%", normalFont));
                }

                typeTable.SpacingAfter = 15;
                document.Add(typeTable);
            }

            // Failure Analysis
            if (request.IncludeFailureAnalysis)
            {
                var failureHeading = new Paragraph("Failure Analysis", headingFont)
                {
                    SpacingBefore = 15,
                    SpacingAfter = 10
                };
                document.Add(failureHeading);

                var failedCount = summary.StatusCounts.GetValueOrDefault("Failed", 0) + 
                                 summary.StatusCounts.GetValueOrDefault("Bounced", 0);
                var successRate = summary.TotalCommunications > 0 
                    ? ((summary.TotalCommunications - failedCount) * 100.0 / summary.TotalCommunications)
                    : 100.0;

                var analysisTable = new PdfPTable(2) { WidthPercentage = 100 };
                analysisTable.SetWidths(new float[] { 50, 50 });

                var successColor = successRate >= 95 ? new BaseColor(230, 255, 230) : 
                                  successRate >= 85 ? new BaseColor(255, 255, 230) : 
                                  new BaseColor(255, 230, 230);

                analysisTable.AddCell(CreateCell("Success Rate:", normalFont, BaseColor.LIGHT_GRAY));
                analysisTable.AddCell(CreateCell($"{successRate:F2}%", normalFont, successColor));
                
                analysisTable.AddCell(CreateCell("Failed Communications:", normalFont, BaseColor.LIGHT_GRAY));
                analysisTable.AddCell(CreateCell(failedCount.ToString(), normalFont));

                document.Add(analysisTable);
            }

            // Footer
            var footerParagraph = new Paragraph($"Report generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC", smallFont)
            {
                Alignment = Element.ALIGN_CENTER,
                SpacingBefore = 30
            };
            document.Add(footerParagraph);

            document.Close();
            var pdfData = memoryStream.ToArray();

            _logger.LogInformation("PDF compliance report completed: {SizeBytes} bytes", pdfData.Length);
            return pdfData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF compliance report");
            throw new InvalidOperationException("PDF report generation failed", ex);
        }
    }

    /// <inheritdoc />
    public async Task<int> EstimateRecordCountAsync(CommunicationAuditSearchRequest searchCriteria)
    {
        try
        {
            // Create a search request with minimal data to get just the count
            var countRequest = new CommunicationAuditSearchRequest
            {
                OrganizationId = searchCriteria.OrganizationId,
                OrderId = searchCriteria.OrderId,
                CommunicationType = searchCriteria.CommunicationType,
                SenderId = searchCriteria.SenderId,
                RecipientId = searchCriteria.RecipientId,
                DeliveryStatus = searchCriteria.DeliveryStatus,
                DateFrom = searchCriteria.DateFrom,
                DateTo = searchCriteria.DateTo,
                SearchTerm = searchCriteria.SearchTerm,
                Page = 1,
                PageSize = 1, // We only need the total count
                IncludeContent = false
            };

            var results = await _auditService.SearchCommunicationLogsAsync(countRequest);
            return results.TotalCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error estimating record count");
            return 0;
        }
    }

    /// <inheritdoc />
    public async Task<ExportCommunicationResult> QueueExportAsync(ExportCommunicationRequest request, string format)
    {
        try
        {
            var jobId = Guid.NewGuid().ToString("N");
            var estimatedCount = await EstimateRecordCountAsync(request.SearchCriteria);
            
            var exportJob = new ExportJob
            {
                JobId = jobId,
                Format = format,
                Request = request,
                Status = "Processing",
                CreatedAt = DateTime.UtcNow,
                EstimatedRecords = estimatedCount
            };

            _exportJobs[jobId] = exportJob;

            // Start background processing (in production, use Hangfire or similar)
            _ = Task.Run(async () => await ProcessExportJobAsync(jobId));

            _logger.LogInformation("Export job queued: {JobId}, Format={Format}, EstimatedRecords={EstimatedRecords}", 
                jobId, format, estimatedCount);

            return new ExportCommunicationResult
            {
                JobId = jobId,
                Status = "Processing",
                EstimatedSize = estimatedCount * 200, // Rough estimate
                RecordCount = estimatedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error queueing export job");
            throw new InvalidOperationException("Failed to queue export job", ex);
        }
    }

    /// <inheritdoc />
    public Task<ExportCommunicationResult?> GetExportStatusAsync(string jobId)
    {
        if (_exportJobs.TryGetValue(jobId, out var job))
        {
            return Task.FromResult<ExportCommunicationResult?>(new ExportCommunicationResult
            {
                JobId = job.JobId,
                Status = job.Status,
                RecordCount = job.ActualRecords ?? job.EstimatedRecords,
                EstimatedSize = job.FileSizeBytes ?? 0,
                DownloadUrl = job.Status == "Completed" ? $"/api/communication-reports/export/download/{jobId}" : null,
                ErrorMessage = job.ErrorMessage
            });
        }

        return Task.FromResult<ExportCommunicationResult?>(null);
    }

    /// <inheritdoc />
    public Task<ExportFileInfo?> GetExportFileAsync(string jobId)
    {
        if (_exportJobs.TryGetValue(jobId, out var job) && 
            job.Status == "Completed" && 
            _exportFiles.TryGetValue(jobId, out var fileData))
        {
            var contentType = job.Format.ToLower() switch
            {
                "csv" => "text/csv",
                "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            var fileName = $"communication-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.{job.Format.ToLower()}";
            
            return Task.FromResult<ExportFileInfo?>(new ExportFileInfo
            {
                Data = fileData,
                ContentType = contentType,
                FileName = fileName
            });
        }

        return Task.FromResult<ExportFileInfo?>(null);
    }

    /// <inheritdoc />
    public Task<int> CleanupExpiredExportsAsync(int retentionDays = 7)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
        var expiredJobs = _exportJobs.Where(kvp => kvp.Value.CreatedAt < cutoffDate).ToList();
        
        var cleanupCount = 0;
        foreach (var expiredJob in expiredJobs)
        {
            _exportJobs.Remove(expiredJob.Key);
            _exportFiles.Remove(expiredJob.Key);
            cleanupCount++;
        }

        if (cleanupCount > 0)
        {
            _logger.LogInformation("Cleaned up {CleanupCount} expired export jobs", cleanupCount);
        }

        return Task.FromResult(cleanupCount);
    }

    /// <summary>
    /// Processes an export job in the background.
    /// </summary>
    /// <param name="jobId">Job identifier to process</param>
    private async Task ProcessExportJobAsync(string jobId)
    {
        if (!_exportJobs.TryGetValue(jobId, out var job))
            return;

        try
        {
            _logger.LogDebug("Processing export job: {JobId}", jobId);

            byte[] exportData = job.Format.ToLower() switch
            {
                "csv" => await ExportToCsvAsync(job.Request),
                "excel" => await ExportToExcelAsync(job.Request),
                _ => throw new NotSupportedException($"Export format {job.Format} not supported for async processing")
            };

            // Store the result
            _exportFiles[jobId] = exportData;
            
            // Update job status
            job.Status = "Completed";
            job.FileSizeBytes = exportData.Length;
            job.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("Export job completed: {JobId}, Size={SizeBytes}", jobId, exportData.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Export job failed: {JobId}", jobId);
            
            job.Status = "Failed";
            job.ErrorMessage = ex.Message;
        }
    }

    /// <summary>
    /// Adds CSV header row based on export options.
    /// </summary>
    private static void AddCsvHeader(StringBuilder csvBuilder, bool includeContent, bool includeMetadata)
    {
        var headers = new List<string>
        {
            "Id", "OrderId", "CommunicationType", "SenderId", "RecipientEmail", "RecipientPhone",
            "Subject", "DeliveryStatus", "ExternalMessageId", "SentAt", "DeliveredAt", "ReadAt", "FailureReason"
        };

        if (includeContent)
        {
            headers.Insert(7, "Content"); // Insert after Subject
            headers.Insert(8, "TemplateUsed");
        }

        if (includeMetadata)
        {
            headers.Add("Metadata");
        }

        csvBuilder.AppendLine(string.Join(",", headers.Select(CsvEscape)));
    }

    /// <summary>
    /// Adds a data row to the CSV output.
    /// </summary>
    private static void AddCsvRow(StringBuilder csvBuilder, CommunicationLog log, bool includeContent, bool includeMetadata)
    {
        var values = new List<string>
        {
            log.Id.ToString(),
            log.OrderId.ToString(),
            log.CommunicationType,
            log.SenderId.ToString(),
            log.RecipientEmail ?? "",
            log.RecipientPhone ?? "",
            log.Subject ?? "",
            log.DeliveryStatus,
            log.ExternalMessageId ?? "",
            log.SentAt.ToString("yyyy-MM-dd HH:mm:ss"),
            log.DeliveredAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "",
            log.ReadAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "",
            log.FailureReason ?? ""
        };

        if (includeContent)
        {
            values.Insert(7, log.Content);
            values.Insert(8, log.TemplateUsed ?? "");
        }

        if (includeMetadata)
        {
            values.Add(log.Metadata ?? "");
        }

        csvBuilder.AppendLine(string.Join(",", values.Select(CsvEscape)));
    }

    /// <summary>
    /// Escapes a value for CSV format.
    /// </summary>
    private static string CsvEscape(string value)
    {
        if (string.IsNullOrEmpty(value))
            return "\"\"";

        if (value.Contains("\"") || value.Contains(",") || value.Contains("\n") || value.Contains("\r"))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        return "\"" + value + "\"";
    }

    /// <summary>
    /// Adds headers to Excel worksheet.
    /// </summary>
    private static void AddExcelHeaders(ExcelWorksheet worksheet, bool includeContent, bool includeMetadata)
    {
        var headers = new List<string>
        {
            "Communication ID", "Order ID", "Communication Type", "Sender ID", "Recipient Email", 
            "Recipient Phone", "Subject", "Delivery Status", "External Message ID", 
            "Sent At", "Delivered At", "Read At", "Failure Reason"
        };

        if (includeContent)
        {
            headers.Insert(7, "Content");
            headers.Insert(8, "Template Used");
        }

        if (includeMetadata)
        {
            headers.Add("Metadata");
        }

        for (int i = 0; i < headers.Count; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        // Format header row
        using var headerRange = worksheet.Cells[1, 1, 1, headers.Count];
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.PatternType = ExcelFillStyle.Solid;
        headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
        headerRange.Style.Border.BorderAround(ExcelBorderStyle.Thick);
    }

    /// <summary>
    /// Adds a data row to Excel worksheet.
    /// </summary>
    private static void AddExcelDataRow(ExcelWorksheet worksheet, int row, CommunicationLog log, 
        bool includeContent, bool includeMetadata)
    {
        var col = 1;
        
        worksheet.Cells[row, col++].Value = log.Id.ToString();
        worksheet.Cells[row, col++].Value = log.OrderId.ToString();
        worksheet.Cells[row, col++].Value = log.CommunicationType;
        worksheet.Cells[row, col++].Value = log.SenderId.ToString();
        worksheet.Cells[row, col++].Value = log.RecipientEmail ?? "";
        worksheet.Cells[row, col++].Value = log.RecipientPhone ?? "";
        worksheet.Cells[row, col++].Value = log.Subject ?? "";

        if (includeContent)
        {
            worksheet.Cells[row, col++].Value = log.Content;
            worksheet.Cells[row, col++].Value = log.TemplateUsed ?? "";
        }

        worksheet.Cells[row, col++].Value = log.DeliveryStatus;
        worksheet.Cells[row, col++].Value = log.ExternalMessageId ?? "";
        worksheet.Cells[row, col++].Value = log.SentAt.ToString("yyyy-MM-dd HH:mm:ss");
        worksheet.Cells[row, col++].Value = log.DeliveredAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";
        worksheet.Cells[row, col++].Value = log.ReadAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";
        worksheet.Cells[row, col++].Value = log.FailureReason ?? "";

        if (includeMetadata)
        {
            worksheet.Cells[row, col++].Value = log.Metadata ?? "";
        }

        // Apply conditional formatting based on delivery status
        var statusCell = worksheet.Cells[row, includeContent ? 9 : 8];
        switch (log.DeliveryStatus.ToLower())
        {
            case "delivered":
                statusCell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                statusCell.Style.Fill.BackgroundColor.SetColor(Color.LightGreen);
                break;
            case "failed":
            case "bounced":
                statusCell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                statusCell.Style.Fill.BackgroundColor.SetColor(Color.LightPink);
                break;
            case "sent":
                statusCell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                statusCell.Style.Fill.BackgroundColor.SetColor(Color.LightYellow);
                break;
        }
    }

    /// <summary>
    /// Formats the Excel worksheet with borders, column widths, and filters.
    /// </summary>
    private static void FormatExcelWorksheet(ExcelWorksheet worksheet, int totalRows, bool includeContent, bool includeMetadata)
    {
        var columnCount = includeContent && includeMetadata ? 15 : includeContent ? 14 : includeMetadata ? 13 : 12;
        
        // Auto-fit columns
        worksheet.Cells.AutoFitColumns();

        // Add borders to all data
        using var dataRange = worksheet.Cells[1, 1, totalRows, columnCount];
        dataRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
        dataRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
        dataRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;
        dataRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;

        // Add auto filter to header row
        worksheet.Cells[1, 1, totalRows, columnCount].AutoFilter = true;

        // Freeze the header row
        worksheet.View.FreezePanes(2, 1);

        // Set column widths for better readability
        worksheet.Column(1).Width = 15; // Communication ID
        worksheet.Column(2).Width = 15; // Order ID
        worksheet.Column(3).Width = 18; // Communication Type
        
        if (includeContent)
        {
            worksheet.Column(8).Width = 30; // Content column
            worksheet.Column(9).Width = 15; // Template Used
        }
    }

    /// <summary>
    /// Creates a summary worksheet with charts and statistics.
    /// </summary>
    private async Task CreateSummaryWorksheet(ExcelPackage package, ExportCommunicationRequest request)
    {
        try
        {
            var summaryWorksheet = package.Workbook.Worksheets.Add("Summary");
            
            // Get summary data if organization is specified
            if (request.SearchCriteria.OrganizationId.HasValue)
            {
                var dateFrom = request.SearchCriteria.DateFrom ?? DateTime.UtcNow.AddDays(-30);
                var dateTo = request.SearchCriteria.DateTo ?? DateTime.UtcNow;
                
                var summary = await _auditService.GetDeliveryStatusSummaryAsync(
                    request.SearchCriteria.OrganizationId.Value,
                    new DateTimeOffset(dateFrom),
                    new DateTimeOffset(dateTo));

                // Add summary information
                summaryWorksheet.Cells[1, 1].Value = "Communication Audit Summary";
                summaryWorksheet.Cells[1, 1].Style.Font.Size = 16;
                summaryWorksheet.Cells[1, 1].Style.Font.Bold = true;

                summaryWorksheet.Cells[3, 1].Value = "Report Period:";
                summaryWorksheet.Cells[3, 2].Value = $"{dateFrom:yyyy-MM-dd} to {dateTo:yyyy-MM-dd}";

                summaryWorksheet.Cells[4, 1].Value = "Total Communications:";
                summaryWorksheet.Cells[4, 2].Value = summary.TotalCommunications;

                // Status breakdown
                summaryWorksheet.Cells[6, 1].Value = "Status Breakdown";
                summaryWorksheet.Cells[6, 1].Style.Font.Bold = true;

                var row = 7;
                foreach (var status in summary.StatusCounts)
                {
                    summaryWorksheet.Cells[row, 1].Value = status.Key;
                    summaryWorksheet.Cells[row, 2].Value = status.Value;
                    
                    if (summary.TotalCommunications > 0)
                    {
                        var percentage = (status.Value * 100.0 / summary.TotalCommunications);
                        summaryWorksheet.Cells[row, 3].Value = $"{percentage:F1}%";
                    }
                    row++;
                }

                // Type breakdown  
                row += 2;
                summaryWorksheet.Cells[row, 1].Value = "Communication Type Breakdown";
                summaryWorksheet.Cells[row, 1].Style.Font.Bold = true;
                row++;

                foreach (var type in summary.TypeCounts)
                {
                    summaryWorksheet.Cells[row, 1].Value = type.Key;
                    summaryWorksheet.Cells[row, 2].Value = type.Value;
                    
                    if (summary.TotalCommunications > 0)
                    {
                        var percentage = (type.Value * 100.0 / summary.TotalCommunications);
                        summaryWorksheet.Cells[row, 3].Value = $"{percentage:F1}%";
                    }
                    row++;
                }

                // Auto-fit columns in summary
                summaryWorksheet.Cells.AutoFitColumns();
            }
            else
            {
                summaryWorksheet.Cells[1, 1].Value = "Summary data available when filtering by organization";
                summaryWorksheet.Cells[1, 1].Style.Font.Italic = true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create summary worksheet");
            // Continue without summary worksheet
        }
    }

    /// <summary>
    /// Creates a PDF table cell with specified styling.
    /// </summary>
    private static PdfPCell CreateCell(string content, iTextSharp.text.Font font, 
        BaseColor? backgroundColor = null, BaseColor? textColor = null)
    {
        var cell = new PdfPCell(new Phrase(content, font))
        {
            Padding = 8,
            Border = PdfPCell.BOX,
            BorderWidth = 0.5f,
            BorderColor = BaseColor.GRAY
        };

        if (backgroundColor != null)
        {
            cell.BackgroundColor = backgroundColor;
        }

        if (textColor != null)
        {
            var coloredFont = new iTextSharp.text.Font(font.BaseFont, font.Size, font.Style, textColor);
            cell.Phrase = new Phrase(content, coloredFont);
        }

        return cell;
    }
}

/// <summary>
/// Internal class for tracking export jobs.
/// </summary>
internal class ExportJob
{
    public string JobId { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public ExportCommunicationRequest Request { get; set; } = new();
    public string Status { get; set; } = "Processing";
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int EstimatedRecords { get; set; }
    public int? ActualRecords { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? ErrorMessage { get; set; }
}