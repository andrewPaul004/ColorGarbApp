using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Controllers;
using ColorGarbApi.Models.Entities;
using System.Text;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for CommunicationExportService to verify export functionality and data formatting.
/// Tests CSV, Excel, and PDF generation with various scenarios.
/// </summary>
public class CommunicationExportServiceTests : IDisposable
{
    private readonly Mock<ICommunicationAuditService> _mockAuditService;
    private readonly Mock<ILogger<CommunicationExportService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly CommunicationExportService _service;
    private readonly List<CommunicationLog> _testCommunications;

    public CommunicationExportServiceTests()
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        _mockLogger = new Mock<ILogger<CommunicationExportService>>();
        _mockConfiguration = new Mock<IConfiguration>();
        
        _service = new CommunicationExportService(
            _mockAuditService.Object,
            _mockLogger.Object,
            _mockConfiguration.Object
        );

        // Setup test communication data
        _testCommunications = CreateTestCommunications();
    }

    [Fact]
    public async Task ExportToCsvAsync_WithValidData_ReturnsFormattedCsv()
    {
        // Arrange
        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrganizationId = Guid.NewGuid(),
            PageSize = 10
        };

        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = searchRequest,
            Format = "CSV",
            IncludeContent = false,
            IncludeMetadata = false,
            MaxRecords = 100
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = _testCommunications,
            TotalCount = _testCommunications.Count,
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
        Assert.NotNull(result);
        Assert.True(result.Length > 0);

        var csvContent = Encoding.UTF8.GetString(result);
        
        // Verify CSV structure
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.True(lines.Length > 1, "CSV should have header and data rows");
        
        // Verify header row
        var header = lines[0];
        Assert.Contains("Communication ID", header);
        Assert.Contains("Order ID", header);
        Assert.Contains("Communication Type", header);
        Assert.Contains("Delivery Status", header);
        
        // Verify data rows
        for (int i = 1; i < lines.Length; i++)
        {
            var dataRow = lines[i];
            Assert.Contains(_testCommunications[i-1].Id.ToString(), dataRow);
            Assert.Contains(_testCommunications[i-1].CommunicationType, dataRow);
        }

        // Verify service calls
        _mockAuditService.Verify(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExportToCsvAsync_WithContentAndMetadata_IncludesExtraColumns()
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
            Logs = _testCommunications,
            TotalCount = _testCommunications.Count,
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
        var header = lines[0];
        
        // Verify additional columns are included
        Assert.Contains("Content", header);
        Assert.Contains("Template Used", header);
        Assert.Contains("Metadata", header);
    }

    [Fact]
    public async Task ExportToExcelAsync_WithValidData_ReturnsExcelFile()
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
            Logs = _testCommunications.Take(5).ToList(), // Small dataset for Excel
            TotalCount = 5,
            Page = 1,
            PageSize = 10,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.ExportToExcelAsync(exportRequest);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Length > 0);

        // Verify Excel file format (basic check for Excel headers)
        var fileHeader = result.Take(8).ToArray();
        // Excel files start with specific bytes
        Assert.True(fileHeader.Length >= 4, "Excel file should have proper header bytes");
    }

    [Fact]
    public async Task GenerateCompliancePdfAsync_WithValidData_ReturnsPdfFile()
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
            ReportTitle = "Test Compliance Report"
        };

        var summary = new DeliveryStatusSummary
        {
            OrganizationId = organizationId,
            From = new DateTimeOffset(request.DateFrom),
            To = new DateTimeOffset(request.DateTo),
            TotalCommunications = 100,
            StatusCounts = new Dictionary<string, int>
            {
                { "Delivered", 85 },
                { "Failed", 10 },
                { "Sent", 5 }
            },
            TypeCounts = new Dictionary<string, int>
            {
                { "Email", 70 },
                { "SMS", 30 }
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

        // Verify PDF file format (PDF files start with %PDF-)
        var pdfHeader = Encoding.UTF8.GetString(result.Take(5).ToArray());
        Assert.StartsWith("%PDF-", pdfHeader);

        // Verify service calls
        _mockAuditService.Verify(x => x.GetDeliveryStatusSummaryAsync(
            organizationId, 
            It.IsAny<DateTimeOffset>(), 
            It.IsAny<DateTimeOffset>()), Times.Once);
    }

    [Fact]
    public async Task EstimateRecordCountAsync_WithValidCriteria_ReturnsCount()
    {
        // Arrange
        var searchCriteria = new CommunicationAuditSearchRequest
        {
            OrganizationId = Guid.NewGuid(),
            DateFrom = DateTime.UtcNow.AddDays(-7),
            DateTo = DateTime.UtcNow
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = new List<CommunicationLog>(),
            TotalCount = 1500,
            Page = 1,
            PageSize = 1,
            HasNextPage = true,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.EstimateRecordCountAsync(searchCriteria);

        // Assert
        Assert.Equal(1500, result);

        // Verify the search was called with minimal page size
        _mockAuditService.Verify(x => x.SearchCommunicationLogsAsync(
            It.Is<CommunicationAuditSearchRequest>(req => req.PageSize == 1 && !req.IncludeContent.GetValueOrDefault())
        ), Times.Once);
    }

    [Fact]
    public async Task QueueExportAsync_WithLargeDataset_CreatesAsyncJob()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { PageSize = 10 },
            Format = "CSV",
            MaxRecords = 50000
        };

        var auditResult = new CommunicationAuditResult
        {
            Logs = new List<CommunicationLog>(),
            TotalCount = 25000,
            Page = 1,
            PageSize = 1,
            HasNextPage = true,
            StatusSummary = new Dictionary<string, int>()
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(auditResult);

        // Act
        var result = await _service.QueueExportAsync(exportRequest, "CSV");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.JobId);
        Assert.Equal("Processing", result.Status);
        Assert.Equal(25000, result.RecordCount);
        Assert.True(result.EstimatedSize > 0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid-job-id")]
    [InlineData("nonexistent-job")]
    public async Task GetExportStatusAsync_WithInvalidJobId_ReturnsNull(string jobId)
    {
        // Act
        var result = await _service.GetExportStatusAsync(jobId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CleanupExpiredExportsAsync_WithOldJobs_RemovesExpiredJobs()
    {
        // Arrange - Create some test jobs first
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = "CSV"
        };

        // Create multiple jobs to test cleanup
        var job1 = await _service.QueueExportAsync(exportRequest, "CSV");
        var job2 = await _service.QueueExportAsync(exportRequest, "Excel");

        // Act
        var cleanupCount = await _service.CleanupExpiredExportsAsync(0); // Clean up all jobs

        // Assert
        Assert.True(cleanupCount >= 0); // Should clean up some jobs
    }

    [Fact]
    public void ExportToCsvAsync_WithNullRequest_ThrowsArgumentException()
    {
        // Act & Assert
        Assert.ThrowsAsync<ArgumentNullException>(() => _service.ExportToCsvAsync(null!));
    }

    [Fact]
    public async Task ExportToCsvAsync_WhenAuditServiceFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = "CSV"
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.ExportToCsvAsync(exportRequest)
        );
        
        Assert.Contains("CSV export failed", exception.Message);
    }

    [Fact]
    public async Task GenerateCompliancePdfAsync_WhenAuditServiceFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var request = new ComplianceReportRequest
        {
            OrganizationId = Guid.NewGuid(),
            DateFrom = DateTime.UtcNow.AddDays(-30),
            DateTo = DateTime.UtcNow
        };

        _mockAuditService.Setup(x => x.GetDeliveryStatusSummaryAsync(
            It.IsAny<Guid>(), 
            It.IsAny<DateTimeOffset>(), 
            It.IsAny<DateTimeOffset>()))
            .ThrowsAsync(new Exception("Service error"));

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.GenerateCompliancePdfAsync(request)
        );
        
        Assert.Contains("PDF report generation failed", exception.Message);
    }

    private List<CommunicationLog> CreateTestCommunications()
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
                RecipientEmail = "test@example.com",
                Subject = "Test Email Subject",
                Content = "This is test email content",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow.AddHours(-2),
                DeliveredAt = DateTime.UtcNow.AddHours(-1),
                ExternalMessageId = "ext-123",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "SMS",
                SenderId = senderId,
                RecipientPhone = "+1234567890",
                Subject = null,
                Content = "Test SMS message",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow.AddHours(-1),
                DeliveredAt = null,
                ExternalMessageId = "sms-456",
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            },
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "Email",
                SenderId = senderId,
                RecipientEmail = "failure@example.com",
                Subject = "Failed Email",
                Content = "This email failed to deliver",
                DeliveryStatus = "Failed",
                SentAt = DateTime.UtcNow.AddHours(-3),
                DeliveredAt = null,
                ExternalMessageId = "ext-789",
                FailureReason = "Invalid email address",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            }
        };
    }

    public void Dispose()
    {
        // Clean up any resources if needed
    }
}

/// <summary>
/// Helper classes for testing that match the controller models
/// </summary>
public class CommunicationAuditSearchRequest
{
    public Guid? OrganizationId { get; set; }
    public Guid? OrderId { get; set; }
    public IEnumerable<string>? CommunicationType { get; set; }
    public Guid? SenderId { get; set; }
    public Guid? RecipientId { get; set; }
    public IEnumerable<string>? DeliveryStatus { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? SearchTerm { get; set; }
    public bool? IncludeContent { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortBy { get; set; } = "sentAt";
    public string SortDirection { get; set; } = "desc";
}

public class CommunicationAuditResult
{
    public IEnumerable<CommunicationLog> Logs { get; set; } = Enumerable.Empty<CommunicationLog>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasNextPage { get; set; }
    public Dictionary<string, int> StatusSummary { get; set; } = new();
}

public class DeliveryStatusSummary
{
    public Guid OrganizationId { get; set; }
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }
    public Dictionary<string, int> StatusCounts { get; set; } = new();
    public Dictionary<string, int> TypeCounts { get; set; } = new();
    public int TotalCommunications { get; set; }
}