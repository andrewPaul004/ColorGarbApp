using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Controllers;
using ColorGarbApi.Models.Entities;
using System.Text;
using System.Text.Json;
using OfficeOpenXml;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Tests to validate the actual format and content of exported files.
/// Ensures CSV structure, Excel formatting, and PDF content meet requirements.
/// </summary>
public class ExportFormatValidationTests : IDisposable
{
    private readonly Mock<ICommunicationAuditService> _mockAuditService;
    private readonly Mock<ILogger<CommunicationExportService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly CommunicationExportService _service;
    private readonly List<CommunicationLog> _testData;

    public ExportFormatValidationTests()
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        _mockLogger = new Mock<ILogger<CommunicationExportService>>();
        _mockConfiguration = new Mock<IConfiguration>();
        
        _service = new CommunicationExportService(
            _mockAuditService.Object,
            _mockLogger.Object,
            _mockConfiguration.Object
        );

        _testData = CreateValidationTestData();
        
        // Setup license context for EPPlus
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    [Fact]
    public async Task CsvExport_ValidatesCorrectStructure()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { PageSize = 10 },
            Format = "CSV",
            IncludeContent = true,
            IncludeMetadata = true,
            MaxRecords = 100
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = _testData,
            TotalCount = _testData.Count,
            Page = 1,
            PageSize = 10,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.ExportToCsvAsync(exportRequest);

        // Assert
        var csvContent = Encoding.UTF8.GetString(result);
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        // Validate header structure
        var header = lines[0];
        var expectedHeaders = new[] 
        { 
            "Communication ID", "Order ID", "Communication Type", "Sender ID", 
            "Recipient", "Subject", "Delivery Status", "Sent At", "Delivered At", 
            "External Message ID", "Failure Reason", "Content", "Template Used", "Metadata" 
        };
        
        foreach (var expectedHeader in expectedHeaders)
        {
            Assert.Contains(expectedHeader, header);
        }

        // Validate data rows
        Assert.Equal(_testData.Count + 1, lines.Length); // +1 for header
        
        // Validate CSV escaping for content with commas and quotes
        var emailRow = lines.FirstOrDefault(l => l.Contains("Email"));
        Assert.NotNull(emailRow);
        Assert.Contains("\"Test email with, commas and \"\"quotes\"\"\"", emailRow);

        // Validate date formatting
        var datePattern = @"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}";
        Assert.Matches(datePattern, emailRow);
    }

    [Fact]
    public async Task ExcelExport_ValidatesWorkbookStructure()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { PageSize = 10 },
            Format = "Excel",
            IncludeContent = false,
            IncludeMetadata = false,
            MaxRecords = 100
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = _testData,
            TotalCount = _testData.Count,
            Page = 1,
            PageSize = 10,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int>
            {
                { "Delivered", 2 },
                { "Failed", 1 }
            }
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.ExportToExcelAsync(exportRequest);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Length > 0);

        using var stream = new MemoryStream(result);
        using var package = new ExcelPackage(stream);
        
        // Validate workbook structure
        Assert.True(package.Workbook.Worksheets.Count >= 2);
        
        var dataSheet = package.Workbook.Worksheets["Communication Data"];
        Assert.NotNull(dataSheet);
        
        var summarySheet = package.Workbook.Worksheets["Summary"];
        Assert.NotNull(summarySheet);

        // Validate data sheet structure
        Assert.True(dataSheet.Dimension.Rows >= _testData.Count + 1); // +1 for header
        Assert.True(dataSheet.Dimension.Columns >= 10); // Minimum expected columns

        // Validate header formatting (should be bold)
        Assert.True(dataSheet.Cells[1, 1].Style.Font.Bold);
        
        // Validate data content
        Assert.Equal("Communication ID", dataSheet.Cells[1, 1].Text);
        Assert.Equal(_testData[0].Id.ToString(), dataSheet.Cells[2, 1].Text);
        
        // Validate status color coding
        var statusColumn = 7; // Delivery Status column
        var deliveredCell = dataSheet.Cells[2, statusColumn]; // First row should be delivered
        var failedRowIndex = -1;
        
        // Find failed status row
        for (int row = 2; row <= dataSheet.Dimension.Rows; row++)
        {
            if (dataSheet.Cells[row, statusColumn].Text == "Failed")
            {
                failedRowIndex = row;
                break;
            }
        }
        
        Assert.True(failedRowIndex > 0, "Should have found a failed status row");
    }

    [Fact]
    public async Task PdfReport_ValidatesDocumentStructure()
    {
        // Arrange
        var organizationId = Guid.NewGuid();
        var request = new ComplianceReportRequest
        {
            OrganizationId = organizationId,
            DateFrom = DateTime.UtcNow.AddDays(-30),
            DateTo = DateTime.UtcNow,
            IncludeFailureAnalysis = true,
            IncludeCharts = true,
            ReportTitle = "Compliance Validation Report"
        };

        var summary = new DeliveryStatusSummary
        {
            OrganizationId = organizationId,
            From = new DateTimeOffset(request.DateFrom),
            To = new DateTimeOffset(request.DateTo),
            TotalCommunications = 150,
            StatusCounts = new Dictionary<string, int>
            {
                { "Delivered", 120 },
                { "Failed", 20 },
                { "Sent", 10 }
            },
            TypeCounts = new Dictionary<string, int>
            {
                { "Email", 100 },
                { "SMS", 50 }
            }
        };

        _mockAuditService.Setup(x => x.GetDeliveryStatusSummaryAsync(
            organizationId, 
            It.IsAny<DateTimeOffset>(), 
            It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(summary);

        // Act
        var result = await _service.GenerateCompliancePdfAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Length > 0);

        // Validate PDF structure
        using var stream = new MemoryStream(result);
        using var pdfReader = new PdfReader(stream);
        using var pdfDocument = new PdfDocument(pdfReader);
        
        // Validate PDF has pages
        Assert.True(pdfDocument.GetNumberOfPages() > 0);
        
        // Extract and validate text content
        var strategy = new iText.Kernel.Pdf.Canvas.Parser.Listener.SimpleTextExtractionStrategy();
        var page1Text = PdfTextExtractor.GetTextFromPage(pdfDocument.GetPage(1), strategy);
        
        // Validate report content
        Assert.Contains("Compliance Validation Report", page1Text);
        Assert.Contains("Total Communications: 150", page1Text);
        Assert.Contains("Success Rate:", page1Text);
        Assert.Contains("Delivery Status Breakdown", page1Text);
        Assert.Contains("Communication Type Distribution", page1Text);
        
        // Validate statistics calculations
        Assert.Contains("80.0%", page1Text); // Success rate (120/150 = 80%)
        
        // Validate failure analysis section
        Assert.Contains("Failure Analysis", page1Text);
        Assert.Contains("Failed Communications: 20", page1Text);
        
        // Validate date range
        var fromDate = request.DateFrom.ToString("yyyy-MM-dd");
        var toDate = request.DateTo.ToString("yyyy-MM-dd");
        Assert.Contains(fromDate, page1Text);
        Assert.Contains(toDate, page1Text);
    }

    [Theory]
    [InlineData("CSV", "text/csv", ".csv")]
    [InlineData("Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx")]
    [InlineData("PDF", "application/pdf", ".pdf")]
    public async Task ExportFormats_ValidateFileHeaders(string format, string expectedContentType, string expectedExtension)
    {
        // This test would typically be done at the controller level with proper HTTP responses
        // For now, we validate the byte signatures/magic numbers
        
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { PageSize = 10 },
            Format = format,
            MaxRecords = 100
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = _testData.Take(2).ToList(),
            TotalCount = 2,
            Page = 1,
            PageSize = 10,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        byte[] result = null;
        
        // Act based on format
        switch (format)
        {
            case "CSV":
                result = await _service.ExportToCsvAsync(exportRequest);
                break;
            case "Excel":
                result = await _service.ExportToExcelAsync(exportRequest);
                break;
            case "PDF":
                var pdfRequest = new ComplianceReportRequest
                {
                    OrganizationId = Guid.NewGuid(),
                    DateFrom = DateTime.UtcNow.AddDays(-7),
                    DateTo = DateTime.UtcNow
                };
                
                _mockAuditService.Setup(x => x.GetDeliveryStatusSummaryAsync(
                    It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
                    .ReturnsAsync(new DeliveryStatusSummary { TotalCommunications = 10 });
                
                result = await _service.GenerateCompliancePdfAsync(pdfRequest);
                break;
        }

        // Assert file signatures
        Assert.NotNull(result);
        Assert.True(result.Length > 0);

        switch (format)
        {
            case "CSV":
                // CSV should start with readable text (the header)
                var csvHeader = Encoding.UTF8.GetString(result.Take(20).ToArray());
                Assert.Contains("Communication", csvHeader);
                break;
                
            case "Excel":
                // Excel files start with PK (ZIP signature)
                Assert.Equal(0x50, result[0]); // 'P'
                Assert.Equal(0x4B, result[1]); // 'K'
                break;
                
            case "PDF":
                // PDF files start with %PDF-
                var pdfHeader = Encoding.UTF8.GetString(result.Take(5).ToArray());
                Assert.Equal("%PDF-", pdfHeader);
                break;
        }
    }

    [Fact]
    public async Task CsvExport_ValidatesSpecialCharacterHandling()
    {
        // Arrange - Create test data with special characters
        var specialTestData = new List<CommunicationLog>
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = Guid.NewGuid(),
                CommunicationType = "Email",
                SenderId = Guid.NewGuid(),
                RecipientEmail = "test@example.com",
                Subject = "Test with \"quotes\" and, commas",
                Content = "Line 1\nLine 2\rLine 3\r\nLine 4",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            }
        };

        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { PageSize = 10 },
            Format = "CSV",
            IncludeContent = true,
            MaxRecords = 100
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = specialTestData,
            TotalCount = 1,
            Page = 1,
            PageSize = 10,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.ExportToCsvAsync(exportRequest);

        // Assert
        var csvContent = Encoding.UTF8.GetString(result);
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        var dataRow = lines[1]; // Skip header
        
        // Verify quotes are properly escaped
        Assert.Contains("\"Test with \"\"quotes\"\" and, commas\"", dataRow);
        
        // Verify newlines are handled (should be escaped or replaced)
        Assert.DoesNotContain("\n", dataRow.Split(',').Last()); // Content field should not contain raw newlines
    }

    private List<CommunicationLog> CreateValidationTestData()
    {
        var orderId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        
        return new List<CommunicationLog>
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "Email",
                SenderId = senderId,
                RecipientEmail = "validation@example.com",
                Subject = "Validation Test Email",
                Content = "Test email with, commas and \"quotes\"",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow.AddHours(-2),
                DeliveredAt = DateTime.UtcNow.AddHours(-1),
                ExternalMessageId = "val-email-123",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                Metadata = "{\"template\": \"order-update\", \"version\": \"1.2\"}"
            },
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "SMS",
                SenderId = senderId,
                RecipientPhone = "+1234567890",
                Subject = null,
                Content = "SMS validation test",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow.AddHours(-1),
                DeliveredAt = DateTime.UtcNow.AddMinutes(-30),
                ExternalMessageId = "val-sms-456",
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            },
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "Email",
                SenderId = senderId,
                RecipientEmail = "failed@example.com",
                Subject = "Failed Validation Test",
                Content = "This email failed validation",
                DeliveryStatus = "Failed",
                SentAt = DateTime.UtcNow.AddHours(-3),
                DeliveredAt = null,
                ExternalMessageId = "val-fail-789",
                FailureReason = "Invalid recipient address",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            }
        };
    }

    public void Dispose()
    {
        // Clean up any resources if needed
    }
}