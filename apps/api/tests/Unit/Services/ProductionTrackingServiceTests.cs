using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text;
using Xunit;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for ProductionTrackingService to verify external system integration.
/// </summary>
public class ProductionTrackingServiceTests : IDisposable
{
    private readonly Mock<ILogger<ProductionTrackingService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<HttpMessageHandler> _mockHttpMessageHandler;
    private readonly HttpClient _httpClient;
    private readonly ProductionTrackingService _service;

    public ProductionTrackingServiceTests()
    {
        _mockLogger = new Mock<ILogger<ProductionTrackingService>>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockHttpMessageHandler = new Mock<HttpMessageHandler>();

        // Setup configuration
        _mockConfiguration.Setup(x => x["ProductionTracking:BaseUrl"])
            .Returns("https://api.test-production.local");
        _mockConfiguration.Setup(x => x["ProductionTracking:ApiKey"])
            .Returns("test-api-key-123");

        _httpClient = new HttpClient(_mockHttpMessageHandler.Object);
        _service = new ProductionTrackingService(_httpClient, _mockLogger.Object, _mockConfiguration.Object);
    }

    /// <summary>
    /// Test successful order stage sync
    /// </summary>
    [Fact]
    public async Task SyncOrderStageUpdateAsync_SuccessfulResponse_ReturnsSuccess()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var orderNumber = "CG-TEST-001";
        var previousStage = "Initial Consultation";
        var newStage = "Design Proposal";
        var updatedBy = "test-user";

        var responseContent = "{\"externalOrderId\":\"EXT-123\",\"status\":\"updated\"}";
        SetupHttpResponse(HttpStatusCode.OK, responseContent);

        // Act
        var result = await _service.SyncOrderStageUpdateAsync(orderId, orderNumber, previousStage, newStage, updatedBy);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("EXT-123", result.ExternalOrderId);
        Assert.Equal(responseContent, result.ExternalResponse);
        Assert.False(result.ShouldRetry);

        // Verify HTTP request was made correctly
        VerifyHttpRequest("POST", "https://api.test-production.local/api/orders/stage-update");
    }

    /// <summary>
    /// Test successful ship date sync
    /// </summary>
    [Fact]
    public async Task SyncShipDateUpdateAsync_SuccessfulResponse_ReturnsSuccess()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var orderNumber = "CG-TEST-001";
        var previousShipDate = DateTime.Now.AddDays(60);
        var newShipDate = DateTime.Now.AddDays(70);
        var reason = "Production delay";
        var updatedBy = "test-user";

        var responseContent = "{\"externalOrderId\":\"EXT-123\",\"status\":\"updated\"}";
        SetupHttpResponse(HttpStatusCode.OK, responseContent);

        // Act
        var result = await _service.SyncShipDateUpdateAsync(orderId, orderNumber, previousShipDate, newShipDate, reason, updatedBy);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("EXT-123", result.ExternalOrderId);
        Assert.Equal(responseContent, result.ExternalResponse);
        Assert.False(result.ShouldRetry);

        // Verify HTTP request was made correctly
        VerifyHttpRequest("POST", "https://api.test-production.local/api/orders/ship-date-update");
    }

    /// <summary>
    /// Test handling of HTTP error responses
    /// </summary>
    [Fact]
    public async Task SyncOrderStageUpdateAsync_HttpError_ReturnsFailure()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var orderNumber = "CG-TEST-001";
        var previousStage = "Initial Consultation";
        var newStage = "Design Proposal";
        var updatedBy = "test-user";

        var errorContent = "{\"error\":\"Order not found\"}";
        SetupHttpResponse(HttpStatusCode.NotFound, errorContent);

        // Act
        var result = await _service.SyncOrderStageUpdateAsync(orderId, orderNumber, previousStage, newStage, updatedBy);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("HTTP NotFound", result.ErrorMessage);
        Assert.Contains(errorContent, result.ErrorMessage);
        Assert.False(result.ShouldRetry); // 404 is not retryable
        Assert.Equal(errorContent, result.ExternalResponse);
    }

    /// <summary>
    /// Test handling of retryable HTTP errors
    /// </summary>
    [Fact]
    public async Task SyncOrderStageUpdateAsync_RetryableError_SetsRetryFlag()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var orderNumber = "CG-TEST-001";
        var previousStage = "Initial Consultation";
        var newStage = "Design Proposal";
        var updatedBy = "test-user";

        SetupHttpResponse(HttpStatusCode.InternalServerError, "Internal server error");

        // Act
        var result = await _service.SyncOrderStageUpdateAsync(orderId, orderNumber, previousStage, newStage, updatedBy);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.True(result.ShouldRetry); // 500 is retryable
    }

    /// <summary>
    /// Test system health check success
    /// </summary>
    [Fact]
    public async Task CheckSystemHealthAsync_HealthyResponse_ReturnsHealthy()
    {
        // Arrange
        var healthResponse = "{\"status\":\"healthy\",\"version\":\"1.0.0\"}";
        SetupHttpResponse(HttpStatusCode.OK, healthResponse);

        // Act
        var result = await _service.CheckSystemHealthAsync();

        // Assert
        Assert.True(result.IsHealthy);
        Assert.Equal("System is healthy", result.StatusMessage);
        Assert.True(result.ResponseTimeMs >= 0); // Accept 0 for very fast mocked responses
        Assert.Contains("OK", result.SystemInfo["httpStatus"]);
        Assert.Equal(healthResponse, result.SystemInfo["responseContent"]);

        // Verify HTTP request was made correctly
        VerifyHttpRequest("GET", "https://api.test-production.local/api/health");
    }

    /// <summary>
    /// Test system health check failure
    /// </summary>
    [Fact]
    public async Task CheckSystemHealthAsync_UnhealthyResponse_ReturnsUnhealthy()
    {
        // Arrange
        SetupHttpResponse(HttpStatusCode.ServiceUnavailable, "Service unavailable");

        // Act
        var result = await _service.CheckSystemHealthAsync();

        // Assert
        Assert.False(result.IsHealthy);
        Assert.Contains("ServiceUnavailable", result.StatusMessage);
        Assert.True(result.ResponseTimeMs >= 0); // Accept 0 for very fast mocked responses
        Assert.Contains("ServiceUnavailable", result.SystemInfo["httpStatus"]);
    }

    /// <summary>
    /// Test getting external production status
    /// </summary>
    [Fact]
    public async Task GetExternalProductionStatusAsync_ValidResponse_ReturnsStatus()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var statusResponse = """
            {
                "externalOrderId": "EXT-456",
                "currentStage": "Production Planning",
                "shipDate": "2024-12-01",
                "lastUpdatedAt": "2024-08-25T10:00:00Z",
                "metadata": {
                    "priority": "high",
                    "assignedTeam": "team-alpha"
                }
            }
            """;

        SetupHttpResponse(HttpStatusCode.OK, statusResponse);

        // Act
        var result = await _service.GetExternalProductionStatusAsync(orderId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("EXT-456", result.ExternalOrderId);
        Assert.Equal("Production Planning", result.ExternalStage);
        Assert.NotNull(result.ExternalShipDate);
        Assert.Equal(DateTime.Parse("2024-12-01"), result.ExternalShipDate);
        Assert.Equal(DateTime.Parse("2024-08-25T10:00:00Z"), result.LastUpdatedAt);
        Assert.Contains("priority", result.Metadata);
        Assert.Equal("high", result.Metadata["priority"]);

        // Verify HTTP request was made correctly
        VerifyHttpRequest("GET", $"https://api.test-production.local/api/orders/{orderId}/status");
    }

    /// <summary>
    /// Test getting external production status when order not found
    /// </summary>
    [Fact]
    public async Task GetExternalProductionStatusAsync_NotFound_ReturnsNull()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        SetupHttpResponse(HttpStatusCode.NotFound, "Order not found");

        // Act
        var result = await _service.GetExternalProductionStatusAsync(orderId);

        // Assert
        Assert.Null(result);
    }

    /// <summary>
    /// Test handling of network exceptions
    /// </summary>
    [Fact]
    public async Task SyncOrderStageUpdateAsync_NetworkException_ReturnsFailureWithRetry()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var orderNumber = "CG-TEST-001";
        var previousStage = "Initial Consultation";
        var newStage = "Design Proposal";
        var updatedBy = "test-user";

        _mockHttpMessageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network unreachable"));

        // Act
        var result = await _service.SyncOrderStageUpdateAsync(orderId, orderNumber, previousStage, newStage, updatedBy);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Network unreachable", result.ErrorMessage);
        Assert.True(result.ShouldRetry); // Network errors are retryable
    }

    /// <summary>
    /// Helper method to setup HTTP response for mocked HttpClient
    /// </summary>
    private void SetupHttpResponse(HttpStatusCode statusCode, string content)
    {
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(content, Encoding.UTF8, "application/json")
        };

        _mockHttpMessageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }

    /// <summary>
    /// Helper method to verify HTTP request was made correctly
    /// </summary>
    private void VerifyHttpRequest(string method, string expectedUrl)
    {
        _mockHttpMessageHandler.Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method.ToString().Equals(method, StringComparison.OrdinalIgnoreCase) &&
                    req.RequestUri != null &&
                    req.RequestUri.ToString() == expectedUrl),
                ItExpr.IsAny<CancellationToken>());
    }

    /// <summary>
    /// Cleanup test resources
    /// </summary>
    public void Dispose()
    {
        _httpClient.Dispose();
    }
}