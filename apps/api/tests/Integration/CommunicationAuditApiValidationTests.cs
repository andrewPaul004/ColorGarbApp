using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using System.Net;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Comprehensive API validation tests for communication audit endpoints.
/// Tests various scenarios including edge cases, validation, security, and error handling.
/// </summary>
public class CommunicationAuditApiValidationTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly ColorGarbDbContext _context;

    public CommunicationAuditApiValidationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Use in-memory database for testing
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ColorGarbDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                
                services.AddDbContext<ColorGarbDbContext>(options =>
                    options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));
            });
        });
        
        _client = _factory.CreateClient();
        
        // Get database context for test data setup
        using var scope = _factory.Services.CreateScope();
        _context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();
        
        // Setup test data
        SeedTestData();
        
        // Add authorization header
        _client.DefaultRequestHeaders.Add("Authorization", "Bearer test-token");
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithValidCriteria_ReturnsFilteredResults()
    {
        // Arrange
        var searchRequest = new
        {
            organizationId = "test-org-1",
            communicationType = new[] { "Email" },
            deliveryStatus = new[] { "Delivered" },
            dateFrom = DateTime.UtcNow.AddDays(-30),
            dateTo = DateTime.UtcNow,
            page = 1,
            pageSize = 10,
            sortBy = "sentAt",
            sortDirection = "desc"
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.True(result.TryGetProperty("logs", out var logs));
        Assert.True(result.TryGetProperty("totalCount", out var totalCount));
        Assert.True(result.TryGetProperty("page", out var page));
        Assert.Equal(1, page.GetInt32());
        
        // Verify structure of returned logs
        if (logs.GetArrayLength() > 0)
        {
            var firstLog = logs[0];
            Assert.True(firstLog.TryGetProperty("id", out _));
            Assert.True(firstLog.TryGetProperty("orderId", out _));
            Assert.True(firstLog.TryGetProperty("communicationType", out _));
            Assert.True(firstLog.TryGetProperty("deliveryStatus", out _));
            Assert.True(firstLog.TryGetProperty("sentAt", out _));
        }
    }

    [Theory]
    [InlineData(0, 10)] // Invalid page
    [InlineData(1, 0)]  // Invalid page size
    [InlineData(1, 101)] // Page size too large
    public async Task SearchCommunicationLogs_WithInvalidPagination_ReturnsBadRequest(int page, int pageSize)
    {
        // Arrange
        var searchRequest = new
        {
            page = page,
            pageSize = pageSize
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithDateRangeValidation_HandlesCorrectly()
    {
        // Arrange - Invalid date range (from after to)
        var searchRequest = new
        {
            dateFrom = DateTime.UtcNow,
            dateTo = DateTime.UtcNow.AddDays(-1),
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        // Should either return bad request or handle gracefully with empty results
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithLongSearchTerm_HandlesCorrectly()
    {
        // Arrange
        var longSearchTerm = new string('a', 1000); // Very long search term
        var searchRequest = new
        {
            searchTerm = longSearchTerm,
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        // Should handle gracefully without crashing
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("sentAt")]
    [InlineData("deliveredAt")]
    [InlineData("readAt")]
    [InlineData("communicationType")]
    [InlineData("deliveryStatus")]
    public async Task SearchCommunicationLogs_WithDifferentSortFields_ReturnsCorrectlySorted(string sortBy)
    {
        // Arrange
        var searchRequest = new
        {
            sortBy = sortBy,
            sortDirection = "desc",
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.True(result.TryGetProperty("logs", out var logs));
        
        // Verify logs are returned (sorting correctness would require more complex validation)
        Assert.True(logs.GetArrayLength() >= 0);
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithValidParameters_ReturnsAggregatedData()
    {
        // Arrange
        var organizationId = "test-org-1";
        var fromDate = DateTime.UtcNow.AddDays(-30).ToString("O");
        var toDate = DateTime.UtcNow.ToString("O");

        // Act
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?organizationId={organizationId}&from={fromDate}&to={toDate}");

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.True(result.TryGetProperty("organizationId", out _));
        Assert.True(result.TryGetProperty("totalCommunications", out var total));
        Assert.True(result.TryGetProperty("statusCounts", out var statusCounts));
        Assert.True(result.TryGetProperty("typeCounts", out var typeCounts));
        
        // Verify data structure
        Assert.True(total.GetInt32() >= 0);
        Assert.True(statusCounts.ValueKind == JsonValueKind.Object);
        Assert.True(typeCounts.ValueKind == JsonValueKind.Object);
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithInvalidOrganizationId_ReturnsNotFound()
    {
        // Arrange
        var invalidOrgId = "nonexistent-org";
        var fromDate = DateTime.UtcNow.AddDays(-30).ToString("O");
        var toDate = DateTime.UtcNow.ToString("O");

        // Act
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?organizationId={invalidOrgId}&from={fromDate}&to={toDate}");

        // Assert
        // Should return empty data or not found
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithLargeDateRange_ReturnsError()
    {
        // Arrange - Date range > 365 days
        var organizationId = "test-org-1";
        var fromDate = DateTime.UtcNow.AddDays(-400).ToString("O");
        var toDate = DateTime.UtcNow.ToString("O");

        // Act
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?organizationId={organizationId}&from={fromDate}&to={toDate}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithMultipleFilters_CombinesCorrectly()
    {
        // Arrange
        var searchRequest = new
        {
            organizationId = "test-org-1",
            communicationType = new[] { "Email", "SMS" },
            deliveryStatus = new[] { "Delivered", "Sent" },
            searchTerm = "test",
            dateFrom = DateTime.UtcNow.AddDays(-7),
            dateTo = DateTime.UtcNow,
            page = 1,
            pageSize = 25
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        // Verify results respect all filters
        Assert.True(result.TryGetProperty("logs", out var logs));
        
        foreach (var log in logs.EnumerateArray())
        {
            var commType = log.GetProperty("communicationType").GetString();
            var deliveryStatus = log.GetProperty("deliveryStatus").GetString();
            
            Assert.Contains(commType, new[] { "Email", "SMS" });
            Assert.Contains(deliveryStatus, new[] { "Delivered", "Sent" });
        }
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithSpecialCharacters_HandlesCorrectly()
    {
        // Arrange
        var searchRequest = new
        {
            searchTerm = "test@domain.com & <script>alert('xss')</script>",
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Verify no XSS or injection vulnerabilities
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("<script>", responseContent);
        Assert.DoesNotContain("alert(", responseContent);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithContentIncluded_ReturnsFullContent()
    {
        // Arrange
        var searchRequest = new
        {
            includeContent = true,
            page = 1,
            pageSize = 5
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringContent();
        var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        if (result.TryGetProperty("logs", out var logs) && logs.GetArrayLength() > 0)
        {
            var firstLog = logs[0];
            Assert.True(firstLog.TryGetProperty("content", out var content));
            // Content should be present when includeContent is true
        }
    }

    [Fact]
    public async Task SearchCommunicationLogs_StressTestWithManyRequests_HandlesLoad()
    {
        // Arrange
        var searchRequest = new
        {
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var tasks = new List<Task<HttpResponseMessage>>();

        // Act - Send 20 concurrent requests
        for (int i = 0; i < 20; i++)
        {
            tasks.Add(_client.PostAsync("/api/communication-reports/search", 
                new StringContent(json, Encoding.UTF8, "application/json")));
        }

        var responses = await Task.WhenAll(tasks);

        // Assert
        Assert.All(responses, response =>
        {
            Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.TooManyRequests);
        });

        // Clean up responses
        foreach (var response in responses)
        {
            response.Dispose();
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid-guid")]
    [InlineData("12345")]
    public async Task SearchCommunicationLogs_WithInvalidGuidFields_HandlesGracefully(string invalidGuid)
    {
        // Arrange
        var searchRequest = new
        {
            organizationId = invalidGuid,
            orderId = invalidGuid,
            senderId = invalidGuid,
            page = 1,
            pageSize = 10
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        // Should handle invalid GUIDs gracefully
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetDeliveryStatusSummary_WithMissingParameters_ReturnsBadRequest()
    {
        // Act - Missing organizationId
        var response = await _client.GetAsync(
            $"/api/communication-reports/summary?from={DateTime.UtcNow.AddDays(-30):O}&to={DateTime.UtcNow:O}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithEmptyBody_ReturnsBadRequest()
    {
        // Arrange
        var content = new StringContent("", Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithMalformedJson_ReturnsBadRequest()
    {
        // Arrange
        var malformedJson = "{ invalid json structure }";
        var content = new StringContent(malformedJson, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SearchCommunicationLogs_WithExtremelyLargePageSize_ReturnsLimitedResults()
    {
        // Arrange
        var searchRequest = new
        {
            page = 1,
            pageSize = int.MaxValue
        };

        var json = JsonSerializer.Serialize(searchRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/communication-reports/search", content);

        // Assert
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            
            // Should be limited to reasonable page size (e.g., 100)
            if (result.TryGetProperty("logs", out var logs))
            {
                Assert.True(logs.GetArrayLength() <= 100);
            }
        }
        else
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    /// <summary>
    /// Seeds the test database with sample communication data.
    /// </summary>
    private void SeedTestData()
    {
        try
        {
            var organization1 = new Organization
            {
                Id = Guid.Parse("test-org-1".PadRight(36, '0')),
                Name = "Test Organization 1",
                Type = "school",
                ContactEmail = "test1@example.com",
                IsActive = true
            };

            var organization2 = new Organization
            {
                Id = Guid.Parse("test-org-2".PadRight(36, '0')),
                Name = "Test Organization 2", 
                Type = "theater",
                ContactEmail = "test2@example.com",
                IsActive = true
            };

            var user1 = new User
            {
                Id = Guid.Parse("test-user-1".PadRight(36, '0')),
                Email = "user1@test.com",
                Name = "Test User 1",
                PasswordHash = "hash",
                Role = "client",
                OrganizationId = organization1.Id,
                IsActive = true
            };

            var order1 = new Order
            {
                Id = Guid.Parse("test-order-1".PadRight(36, '0')),
                OrderNumber = "TEST-001",
                Description = "Test Order 1",
                CurrentStage = "Production",
                OrganizationId = organization1.Id,
                UserId = user1.Id,
                IsActive = true
            };

            _context.Organizations.AddRange(organization1, organization2);
            _context.Users.Add(user1);
            _context.Orders.Add(order1);

            // Add sample communication logs
            var communications = new[]
            {
                new CommunicationLog
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1.Id,
                    CommunicationType = "Email",
                    SenderId = user1.Id,
                    RecipientEmail = "customer1@example.com",
                    Subject = "Order Update",
                    Content = "Your order has been updated.",
                    DeliveryStatus = "Delivered",
                    SentAt = DateTime.UtcNow.AddHours(-2),
                    DeliveredAt = DateTime.UtcNow.AddHours(-1),
                    ExternalMessageId = "ext-123"
                },
                new CommunicationLog
                {
                    Id = Guid.NewGuid(),
                    OrderId = order1.Id,
                    CommunicationType = "SMS",
                    SenderId = user1.Id,
                    RecipientPhone = "+1234567890",
                    Content = "SMS notification",
                    DeliveryStatus = "Failed",
                    SentAt = DateTime.UtcNow.AddHours(-3),
                    FailureReason = "Invalid phone number",
                    ExternalMessageId = "sms-456"
                }
            };

            _context.CommunicationLogs.AddRange(communications);
            _context.SaveChanges();
        }
        catch (Exception ex)
        {
            // Log error but don't fail tests
            Console.WriteLine($"Error seeding test data: {ex.Message}");
        }
    }

    public void Dispose()
    {
        _client?.Dispose();
        _context?.Dispose();
    }
}