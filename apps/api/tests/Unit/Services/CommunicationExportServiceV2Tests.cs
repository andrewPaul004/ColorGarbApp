using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for CommunicationExportServiceV2 to verify export functionality and data formatting.
/// </summary>
public class CommunicationExportServiceV2Tests
{
    private readonly Mock<ICommunicationAuditService> _mockAuditService;
    private readonly Mock<ILogger<CommunicationExportServiceV2>> _mockLogger;
    private readonly CommunicationExportServiceV2 _exportService;

    public CommunicationExportServiceV2Tests()
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        _mockLogger = new Mock<ILogger<CommunicationExportServiceV2>>();
        _exportService = new CommunicationExportServiceV2(_mockAuditService.Object, _mockLogger.Object);
    }

    /// <summary>
    /// Test CSV export with basic communication data
    /// </summary>
    [Fact]
    public async Task ExportToCsvAsync_WithValidData_GeneratesCsvFile()
    {
        // Arrange
        var mockCommunications = new List<CommunicationLog>
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = Guid.NewGuid(),
                CommunicationType = "Email",
                Subject = "Order Update",
                Content = "Your order has been updated",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                SenderId = Guid.NewGuid()
            }
        };

        var mockResult = new CommunicationAuditResult
        {
            Logs = mockCommunications,
            TotalCount = 1
        };

        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            IncludeContent = true,
            MaxRecords = 1000
        };

        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);

        // Act
        var csvData = await _exportService.ExportToCsvAsync(exportRequest);

        // Assert
        Assert.NotNull(csvData);
        Assert.True(csvData.Length > 0);

        var csvContent = System.Text.Encoding.UTF8.GetString(csvData);
        Assert.Contains("ID,Order ID,Communication Type", csvContent);
        Assert.Contains("Email", csvContent);
        Assert.Contains("Order Update", csvContent);
    }

    /// <summary>
    /// Test Excel export generates valid Excel data
    /// </summary>
    [Fact]
    public async Task ExportToExcelAsync_WithValidData_GeneratesExcelFile()
    {
        // Arrange
        var mockCommunications = new List<CommunicationLog>
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = Guid.NewGuid(),
                CommunicationType = "Email",
                Subject = "Excel Test",
                Content = "Excel export content",
                DeliveryStatus = "Delivered",
                RecipientEmail = "test@example.com",
                SentAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                SenderId = Guid.NewGuid()
            }
        };

        var mockResult = new CommunicationAuditResult
        {
            Logs = mockCommunications,
            TotalCount = 1,
            StatusSummary = new Dictionary<string, int> { { "Delivered", 1 } },
            TypeSummary = new Dictionary<string, int> { { "Email", 1 } }
        };

        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            IncludeContent = true,
            MaxRecords = 1000
        };

        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);

        // Act
        var excelData = await _exportService.ExportToExcelAsync(exportRequest);

        // Assert
        Assert.NotNull(excelData);
        Assert.True(excelData.Length > 0);
        
        // Excel files start with PK (ZIP signature)
        Assert.Equal(0x50, excelData[0]); // 'P'
        Assert.Equal(0x4B, excelData[1]); // 'K'
    }

    /// <summary>
    /// Test compliance PDF generation
    /// </summary>
    [Fact]
    public async Task GenerateCompliancePdfAsync_WithValidRequest_GeneratesPdfContent()
    {
        // Arrange
        var complianceRequest = new ComplianceReportRequest
        {
            OrganizationId = Guid.NewGuid(),
            From = DateTimeOffset.UtcNow.AddDays(-30),
            To = DateTimeOffset.UtcNow,
            ReportTitle = "Monthly Compliance Report"
        };

        var mockResult = new CommunicationAuditResult
        {
            Logs = new List<CommunicationLog>
            {
                new CommunicationLog
                {
                    Id = Guid.NewGuid(),
                    CommunicationType = "Email",
                    DeliveryStatus = "Delivered",
                    SentAt = DateTime.UtcNow.AddDays(-15),
                    CreatedAt = DateTime.UtcNow.AddDays(-15),
                    SenderId = Guid.NewGuid(),
                    OrderId = Guid.NewGuid(),
                    Content = "Test content"
                }
            },
            TotalCount = 1
        };

        var mockSummary = new DeliveryStatusSummary
        {
            OrganizationId = complianceRequest.OrganizationId,
            TotalCommunications = 1,
            DeliverySuccessRate = 100.0,
            StatusCounts = new Dictionary<string, int> { { "Delivered", 1 } },
            TypeCounts = new Dictionary<string, int> { { "Email", 1 } }
        };

        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);
        _mockAuditService.Setup(s => s.GetDeliveryStatusSummaryAsync(
            complianceRequest.OrganizationId, complianceRequest.From, complianceRequest.To))
            .ReturnsAsync(mockSummary);

        // Act
        var pdfData = await _exportService.GenerateCompliancePdfAsync(complianceRequest);

        // Assert
        Assert.NotNull(pdfData);
        Assert.True(pdfData.Length > 0);

        var pdfContent = System.Text.Encoding.UTF8.GetString(pdfData);
        Assert.Contains("COMMUNICATION COMPLIANCE REPORT", pdfContent);
        Assert.Contains("Total Communications: 1", pdfContent);
        Assert.Contains("Delivery Success Rate: 100", pdfContent);
    }

    /// <summary>
    /// Test record count estimation
    /// </summary>
    [Fact]
    public async Task EstimateRecordCountAsync_WithSearchCriteria_ReturnsEstimatedCount()
    {
        // Arrange
        var searchCriteria = new CommunicationAuditSearchRequest
        {
            CommunicationType = new[] { "Email" },
            DeliveryStatus = new[] { "Delivered" }
        };

        var mockResult = new CommunicationAuditResult { TotalCount = 150 };

        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);

        // Act
        var estimatedCount = await _exportService.EstimateRecordCountAsync(searchCriteria);

        // Assert
        Assert.Equal(150, estimatedCount);
    }

    /// <summary>
    /// Test large export queueing
    /// </summary>
    [Fact]
    public async Task QueueLargeExportAsync_WithValidRequest_ReturnsJobInfo()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            MaxRecords = 50000
        };

        var mockResult = new CommunicationAuditResult { TotalCount = 25000 };

        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);

        // Act
        var jobResult = await _exportService.QueueLargeExportAsync(exportRequest, "CSV");

        // Assert
        Assert.NotNull(jobResult);
        Assert.NotNull(jobResult.JobId);
        Assert.Equal("Processing", jobResult.Status);
        Assert.Equal(25000, jobResult.RecordCount);
        Assert.True(jobResult.EstimatedSize > 0);
    }
}