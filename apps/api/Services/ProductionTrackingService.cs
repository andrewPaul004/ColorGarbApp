using System.Text;
using System.Text.Json;

namespace ColorGarbApi.Services;

/// <summary>
/// Implementation of production tracking integration service.
/// Handles synchronization with external production tracking systems.
/// </summary>
public class ProductionTrackingService : IProductionTrackingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ProductionTrackingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly string _baseUrl;
    private readonly string _apiKey;

    public ProductionTrackingService(
        HttpClient httpClient,
        ILogger<ProductionTrackingService> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;

        // Get configuration for external production system
        _baseUrl = _configuration["ProductionTracking:BaseUrl"] ?? "https://api.production-system.local";
        _apiKey = _configuration["ProductionTracking:ApiKey"] ?? string.Empty;

        // Configure HTTP client with timeout and headers
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
        }
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ColorGarb-OrderSystem/1.0");
    }

    /// <inheritdoc />
    public async Task<ProductionSyncResult> SyncOrderStageUpdateAsync(
        Guid orderId,
        string orderNumber,
        string previousStage,
        string newStage,
        string updatedBy)
    {
        try
        {
            _logger.LogInformation("Syncing order stage update to production system: {OrderNumber} {PreviousStage} -> {NewStage}",
                orderNumber, previousStage, newStage);

            var payload = new
            {
                orderId = orderId.ToString(),
                orderNumber,
                previousStage,
                newStage,
                updatedBy,
                updatedAt = DateTime.UtcNow,
                source = "ColorGarb"
            };

            var response = await PostToProductionSystemAsync("api/orders/stage-update", payload);

            if (response.IsSuccess)
            {
                _logger.LogInformation("Successfully synced order stage update: {OrderNumber}", orderNumber);
                return ProductionSyncResult.Success(response.ExternalResponse, response.ExternalOrderId);
            }
            else
            {
                _logger.LogWarning("Failed to sync order stage update: {OrderNumber}, Error: {Error}",
                    orderNumber, response.ErrorMessage);
                return response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while syncing order stage update: {OrderNumber}", orderNumber);
            return ProductionSyncResult.Failure(
                $"Exception during sync: {ex.Message}",
                shouldRetry: IsRetryableException(ex));
        }
    }

    /// <inheritdoc />
    public async Task<ProductionSyncResult> SyncShipDateUpdateAsync(
        Guid orderId,
        string orderNumber,
        DateTime previousShipDate,
        DateTime newShipDate,
        string reason,
        string updatedBy)
    {
        try
        {
            _logger.LogInformation("Syncing ship date update to production system: {OrderNumber} {PreviousDate} -> {NewDate}",
                orderNumber, previousShipDate.ToString("yyyy-MM-dd"), newShipDate.ToString("yyyy-MM-dd"));

            var payload = new
            {
                orderId = orderId.ToString(),
                orderNumber,
                previousShipDate = previousShipDate.ToString("yyyy-MM-dd"),
                newShipDate = newShipDate.ToString("yyyy-MM-dd"),
                reason,
                updatedBy,
                updatedAt = DateTime.UtcNow,
                source = "ColorGarb"
            };

            var response = await PostToProductionSystemAsync("api/orders/ship-date-update", payload);

            if (response.IsSuccess)
            {
                _logger.LogInformation("Successfully synced ship date update: {OrderNumber}", orderNumber);
                return ProductionSyncResult.Success(response.ExternalResponse, response.ExternalOrderId);
            }
            else
            {
                _logger.LogWarning("Failed to sync ship date update: {OrderNumber}, Error: {Error}",
                    orderNumber, response.ErrorMessage);
                return response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while syncing ship date update: {OrderNumber}", orderNumber);
            return ProductionSyncResult.Failure(
                $"Exception during sync: {ex.Message}",
                shouldRetry: IsRetryableException(ex));
        }
    }

    /// <inheritdoc />
    public async Task<ProductionSystemHealthResult> CheckSystemHealthAsync()
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            _logger.LogDebug("Checking production system health");

            var response = await _httpClient.GetAsync($"{_baseUrl}/api/health");
            stopwatch.Stop();

            var healthResult = new ProductionSystemHealthResult
            {
                ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds,
                CheckedAt = DateTime.UtcNow
            };

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                healthResult.IsHealthy = true;
                healthResult.StatusMessage = "System is healthy";
                healthResult.SystemInfo["httpStatus"] = response.StatusCode.ToString();
                healthResult.SystemInfo["responseContent"] = content;

                _logger.LogDebug("Production system health check passed in {ResponseTime}ms",
                    healthResult.ResponseTimeMs);
            }
            else
            {
                healthResult.IsHealthy = false;
                healthResult.StatusMessage = $"HTTP {response.StatusCode}: {response.ReasonPhrase}";
                healthResult.SystemInfo["httpStatus"] = response.StatusCode.ToString();

                _logger.LogWarning("Production system health check failed: {StatusCode} {ReasonPhrase}",
                    response.StatusCode, response.ReasonPhrase);
            }

            return healthResult;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            var healthResult = new ProductionSystemHealthResult
            {
                IsHealthy = false,
                ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds,
                StatusMessage = $"Health check failed: {ex.Message}",
                CheckedAt = DateTime.UtcNow
            };

            healthResult.SystemInfo["exceptionType"] = ex.GetType().Name;
            healthResult.SystemInfo["exceptionMessage"] = ex.Message;

            _logger.LogError(ex, "Exception occurred during production system health check");
            return healthResult;
        }
    }

    /// <inheritdoc />
    public async Task<ExternalProductionStatus?> GetExternalProductionStatusAsync(Guid orderId)
    {
        try
        {
            _logger.LogDebug("Retrieving external production status for order: {OrderId}", orderId);

            var response = await _httpClient.GetAsync($"{_baseUrl}/api/orders/{orderId}/status");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var statusData = JsonSerializer.Deserialize<JsonElement>(content);

                var externalStatus = new ExternalProductionStatus
                {
                    ExternalOrderId = statusData.GetProperty("externalOrderId").GetString() ?? orderId.ToString(),
                    ExternalStage = statusData.GetProperty("currentStage").GetString() ?? "Unknown",
                    LastUpdatedAt = statusData.TryGetProperty("lastUpdatedAt", out var lastUpdated)
                        ? DateTime.Parse(lastUpdated.GetString() ?? DateTime.UtcNow.ToString())
                        : DateTime.UtcNow
                };

                if (statusData.TryGetProperty("shipDate", out var shipDate) && shipDate.ValueKind != JsonValueKind.Null)
                {
                    externalStatus.ExternalShipDate = DateTime.Parse(shipDate.GetString() ?? DateTime.UtcNow.ToString());
                }

                // Add any additional metadata
                if (statusData.TryGetProperty("metadata", out var metadata))
                {
                    foreach (var prop in metadata.EnumerateObject())
                    {
                        externalStatus.Metadata[prop.Name] = prop.Value.ToString() ?? "";
                    }
                }

                _logger.LogDebug("Retrieved external production status for order: {OrderId}", orderId);
                return externalStatus;
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogDebug("Order not found in external production system: {OrderId}", orderId);
                return null;
            }
            else
            {
                _logger.LogWarning("Failed to retrieve external production status: {StatusCode} {ReasonPhrase}",
                    response.StatusCode, response.ReasonPhrase);
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while retrieving external production status for order: {OrderId}", orderId);
            return null;
        }
    }

    /// <summary>
    /// Posts data to the external production tracking system.
    /// </summary>
    /// <param name="endpoint">API endpoint to post to</param>
    /// <param name="payload">Data payload to send</param>
    /// <returns>Production sync result</returns>
    private async Task<ProductionSyncResult> PostToProductionSystemAsync(string endpoint, object payload)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{_baseUrl}/{endpoint}", content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();

                // Try to extract external order ID from response
                string? externalOrderId = null;
                try
                {
                    var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (responseData.TryGetProperty("externalOrderId", out var idElement))
                    {
                        externalOrderId = idElement.GetString();
                    }
                }
                catch (JsonException)
                {
                    // Response wasn't JSON, that's okay
                }

                return ProductionSyncResult.Success(responseContent, externalOrderId);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                var shouldRetry = IsRetryableHttpStatusCode(response.StatusCode);

                return ProductionSyncResult.Failure(
                    $"HTTP {response.StatusCode}: {response.ReasonPhrase}. Response: {errorContent}",
                    shouldRetry,
                    errorContent);
            }
        }
        catch (HttpRequestException ex)
        {
            return ProductionSyncResult.Failure(
                $"HTTP request failed: {ex.Message}",
                shouldRetry: true);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            return ProductionSyncResult.Failure(
                "Request timed out",
                shouldRetry: true);
        }
        catch (JsonException ex)
        {
            return ProductionSyncResult.Failure(
                $"JSON serialization failed: {ex.Message}",
                shouldRetry: false);
        }
    }

    /// <summary>
    /// Determines if an exception indicates the operation should be retried.
    /// </summary>
    /// <param name="ex">Exception to evaluate</param>
    /// <returns>True if the operation should be retried</returns>
    private static bool IsRetryableException(Exception ex)
    {
        return ex is HttpRequestException ||
               ex is TaskCanceledException ||
               ex is TimeoutException ||
               ex is System.Net.Sockets.SocketException;
    }

    /// <summary>
    /// Determines if an HTTP status code indicates the operation should be retried.
    /// </summary>
    /// <param name="statusCode">HTTP status code</param>
    /// <returns>True if the operation should be retried</returns>
    private static bool IsRetryableHttpStatusCode(System.Net.HttpStatusCode statusCode)
    {
        return statusCode == System.Net.HttpStatusCode.InternalServerError ||
               statusCode == System.Net.HttpStatusCode.BadGateway ||
               statusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
               statusCode == System.Net.HttpStatusCode.GatewayTimeout ||
               statusCode == System.Net.HttpStatusCode.RequestTimeout;
    }
}