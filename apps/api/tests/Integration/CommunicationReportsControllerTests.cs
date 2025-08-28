using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Controllers;
using ColorGarbApi.Models.Entities;
using Moq;
using System.Net;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Integration tests for CommunicationReportsController to verify export and reporting functionality.
/// Tests CSV/Excel/PDF exports, search, and compliance reporting with various scenarios.
/// </summary>
public class CommunicationReportsControllerTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly Mock<ICommunicationAuditService> _mockAuditService;
    private readonly Mock<ICommunicationExportService> _mockExportService;

    public CommunicationReportsControllerTests(WebApplicationFactory<Program> factory)
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        _mockExportService = new Mock<ICommunicationExportService>();
        
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace services with mocks for testing
                services.AddScoped(_ => _mockAuditService.Object);
                services.AddScoped(_ => _mockExportService.Object);
            });
        });
        
        _client = _factory.CreateClient();
        
        // Add authorization header for tests
        _client.DefaultRequestHeaders.Add("Authorization", "Bearer test-token");
    }

    [Fact]
    public async Task ExportToCsv_WithSmallDataset_ReturnsFileDirectly()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest
            {
                OrganizationId = Guid.NewGuid(),
                DateFrom = DateTime.UtcNow.AddDays(-7),
                DateTo = DateTime.UtcNow
            },
            Format = "CSV",
            IncludeContent = false,
            MaxRecords = 1000
        };

        var csvData = Encoding.UTF8.GetBytes("Communication ID,Order ID,Type\ntest-123,order-456,Email");
        
        _mockExportService.Setup(x => x.EstimateRecordCountAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(500);
        
        _mockExportService.Setup(x => x.ExportToCsvAsync(It.IsAny<ExportCommunicationRequest>()))
            .ReturnsAsync(csvData);

        var json = JsonSerializer.Serialize(exportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/export/csv", content);

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        
        var responseData = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(csvData, responseData);
    }

    [Fact]
    public async Task ExportToCsv_WithLargeDataset_ReturnsAsyncJobReference()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = "CSV",
            MaxRecords = 50000
        };

        var jobResult = new ExportCommunicationResult
        {
            JobId = "job-12345",
            Status = "Processing",
            RecordCount = 25000,
            EstimatedSize = 2500000
        };

        _mockExportService.Setup(x => x.EstimateRecordCountAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(25000);
        
        _mockExportService.Setup(x => x.ExportToCsvAsync(It.IsAny<ExportCommunicationRequest>()))
            .ReturnsAsync(jobResult);

        var json = JsonSerializer.Serialize(exportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/export/csv", content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal("job-12345", result.GetProperty("jobId").GetString());
        Assert.Equal("Processing", result.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ExportToExcel_WithValidRequest_ReturnsExcelFile()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = "Excel",
            IncludeContent = true,
            MaxRecords = 1000
        };

        var excelData = new byte[] { 0x50, 0x4B, 0x03, 0x04 }; // ZIP header (Excel is ZIP-based)
        
        _mockExportService.Setup(x => x.EstimateRecordCountAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(300);
        
        _mockExportService.Setup(x => x.ExportToExcelAsync(It.IsAny<ExportCommunicationRequest>()))
            .ReturnsAsync(excelData);

        var json = JsonSerializer.Serialize(exportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/export/excel", content);

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            response.Content.Headers.ContentType?.MediaType);
        
        var responseData = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(excelData, responseData);
    }

    [Fact]
    public async Task GenerateComplianceReport_WithValidRequest_ReturnsPdfFile()
    {
        // Arrange
        var reportRequest = new ComplianceReportRequest
        {
            OrganizationId = Guid.NewGuid(),
            DateFrom = DateTime.UtcNow.AddDays(-30),
            DateTo = DateTime.UtcNow,
            IncludeFailureAnalysis = true,
            IncludeCharts = true,
            ReportTitle = "Monthly Compliance Report"
        };

        var pdfData = Encoding.UTF8.GetBytes("%PDF-1.4\n%Test PDF Content");
        
        _mockExportService.Setup(x => x.GenerateCompliancePdfAsync(It.IsAny<ComplianceReportRequest>()))
            .ReturnsAsync(pdfData);

        var json = JsonSerializer.Serialize(reportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/reports/compliance-pdf", content);

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        
        var responseData = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(pdfData, responseData);
    }

    [Fact]
    public async Task GetExportStatus_WithValidJobId_ReturnsJobStatus()
    {
        // Arrange
        var jobId = "test-job-123";
        var jobStatus = new ExportCommunicationResult
        {
            JobId = jobId,
            Status = "Completed",
            RecordCount = 1000,
            EstimatedSize = 125000,
            DownloadUrl = $"/api/communication-reports/export/download/{jobId}"
        };

        _mockExportService.Setup(x => x.GetExportStatusAsync(jobId))
            .ReturnsAsync(jobStatus);

        // Act
        var response = await _client.GetAsync($"/api/communication-reports/export/status/{jobId}");

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal(jobId, result.GetProperty("jobId").GetString());
        Assert.Equal("Completed", result.GetProperty("status").GetString());
        Assert.Equal(1000, result.GetProperty("recordCount").GetInt32());
    }

    [Fact]
    public async Task GetExportStatus_WithInvalidJobId_ReturnsNotFound()
    {
        // Arrange
        var jobId = "invalid-job-id";
        
        _mockExportService.Setup(x => x.GetExportStatusAsync(jobId))
            .ReturnsAsync((ExportCommunicationResult?)null);

        // Act
        var response = await _client.GetAsync($"/api/communication-reports/export/status/{jobId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DownloadExport_WithValidJobId_ReturnsFile()
    {
        // Arrange
        var jobId = "download-test-123";
        var fileData = Encoding.UTF8.GetBytes("test,export,data\n1,2,3");
        var exportFile = new ExportFileInfo
        {
            Data = fileData,
            ContentType = "text/csv",
            FileName = "export-test.csv"
        };

        _mockExportService.Setup(x => x.GetExportFileAsync(jobId))
            .ReturnsAsync(exportFile);

        // Act
        var response = await _client.GetAsync($"/api/communication-reports/export/download/{jobId}");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        
        var responseData = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(fileData, responseData);
    }

    [Fact]
    public async Task DownloadExport_WithInvalidJobId_ReturnsNotFound()
    {
        // Arrange
        var jobId = "nonexistent-job";
        
        _mockExportService.Setup(x => x.GetExportFileAsync(jobId))
            .ReturnsAsync((ExportFileInfo?)null);

        // Act
        var response = await _client.GetAsync($"/api/communication-reports/export/download/{jobId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithValidParameters_ReturnsSummary()
    {
        // Arrange
        var organizationId = Guid.NewGuid();
        var fromDate = DateTimeOffset.UtcNow.AddDays(-30);
        var toDate = DateTimeOffset.UtcNow;

        var summary = new DeliveryStatusSummary
        {
            OrganizationId = organizationId,
            From = fromDate,
            To = toDate,
            TotalCommunications = 1500,
            StatusCounts = new Dictionary<string, int>
            {
                { "Delivered", 1200 },
                { "Failed", 200 },
                { "Sent", 100 }
            },
            TypeCounts = new Dictionary<string, int>
            {
                { "Email", 1000 },
                { "SMS", 500 }
            }
        };

        _mockAuditService.Setup(x => x.GetDeliveryStatusSummaryAsync(organizationId, fromDate, toDate))
            .ReturnsAsync(summary);

        // Act
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?organizationId={organizationId}&from={fromDate:O}&to={toDate:O}");

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal(1500, result.GetProperty("totalCommunications").GetInt32());
        Assert.Equal(organizationId.ToString(), result.GetProperty("organizationId").GetString());
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithInvalidDateRange_ReturnsBadRequest()
    {
        // Arrange
        var organizationId = Guid.NewGuid();
        var fromDate = DateTimeOffset.UtcNow;
        var toDate = DateTimeOffset.UtcNow.AddDays(-1); // Invalid: to date before from date

        // Act
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?organizationId={organizationId}&from={fromDate:O}&to={toDate:O}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithValidCriteria_ReturnsResults()
    {
        // Arrange
        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrganizationId = Guid.NewGuid(),
            DateFrom = DateTime.UtcNow.AddDays(-7),
            DateTo = DateTime.UtcNow,
            Page = 1,
            PageSize = 25
        };

        var searchResult = new CommunicationAuditResult
        {
            Logs = new List<CommunicationLog>
            {
                new CommunicationLog
                {
                    Id = Guid.NewGuid(),
                    OrderId = Guid.NewGuid(),
                    CommunicationType = "Email",
                    SenderId = Guid.NewGuid(),
                    RecipientEmail = "test@example.com",
                    Subject = "Test Email",
                    Content = "Test content",
                    DeliveryStatus = "Delivered",
                    SentAt = DateTime.UtcNow.AddHours(-2),
                    CreatedAt = DateTime.UtcNow.AddHours(-2)
                }
            },
            TotalCount = 1,
            Page = 1,
            PageSize = 25,
            HasNextPage = false,
            StatusSummary = new Dictionary<string, int> { { "Delivered", 1 } }
        };

        _mockAuditService.Setup(x => x.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(searchResult);

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal(1, result.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, result.GetProperty("logs").GetArrayLength());
    }

    [Theory]
    [InlineData("CSV", "text/csv")]
    [InlineData("Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    public async Task ExportEndpoints_WithDifferentFormats_ReturnCorrectContentType(string format, string expectedContentType)
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = format,
            MaxRecords = 100
        };

        var testData = new byte[] { 1, 2, 3, 4, 5 };
        
        _mockExportService.Setup(x => x.EstimateRecordCountAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(50);

        if (format == "CSV")
        {
            _mockExportService.Setup(x => x.ExportToCsvAsync(It.IsAny<ExportCommunicationRequest>()))
                .ReturnsAsync(testData);
        }
        else
        {
            _mockExportService.Setup(x => x.ExportToExcelAsync(It.IsAny<ExportCommunicationRequest>()))
                .ReturnsAsync(testData);
        }

        var json = JsonSerializer.Serialize(exportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var endpoint = format.ToLower() == "csv" ? "csv" : "excel";
        var response = await _client.PostAsync($"/api/communication-reports/export/{endpoint}", content);

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal(expectedContentType, response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task ExportEndpoints_WithServiceException_ReturnInternalServerError()
    {
        // Arrange
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest(),
            Format = "CSV"
        };

        _mockExportService.Setup(x => x.EstimateRecordCountAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(100);
        
        _mockExportService.Setup(x => x.ExportToCsvAsync(It.IsAny<ExportCommunicationRequest>()))
            .ThrowsAsync(new Exception("Export service failed"));

        var json = JsonSerializer.Serialize(exportRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/export/csv", content);

        // Assert
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    }

    [Fact]
    public async Task ExportEndpoints_WithInvalidRequest_ReturnBadRequest()
    {
        // Arrange - Invalid JSON
        var invalidJson = "{ invalid json }";
        var content = new StringContent(invalidJson, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/export/csv", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public void Dispose()
    {
        _client?.Dispose();
    }
}

/// <summary>
/// Helper classes for testing that match the controller models
/// </summary>
public class ExportCommunicationRequest
{
    public CommunicationAuditSearchRequest SearchCriteria { get; set; } = new();
    public string Format { get; set; } = "CSV";
    public bool? IncludeContent { get; set; }
    public bool? IncludeMetadata { get; set; }
    public int MaxRecords { get; set; } = 10000;
}

public class ExportCommunicationResult
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = "Processing";
    public string? DownloadUrl { get; set; }
    public long EstimatedSize { get; set; }
    public int RecordCount { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ExportFileInfo
{
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}

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

public class ComplianceReportRequest
{
    public Guid OrganizationId { get; set; }
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public bool? IncludeFailureAnalysis { get; set; }
    public bool? IncludeCharts { get; set; }
    public string? ReportTitle { get; set; }
}