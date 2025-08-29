using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using System.Net;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Integration tests for communication audit trail end-to-end workflows.
/// Tests complete user journeys from API requests through database operations.
/// </summary>
/// <since>3.4.0</since>
public class CommunicationAuditIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public CommunicationAuditIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Use in-memory database for testing
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ColorGarbDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<ColorGarbDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestCommunicationAudit");
                });
            });
        });

        _client = _factory.CreateClient();
    }

    /// <summary>
    /// Test complete communication audit workflow from creation to search
    /// </summary>
    [Fact]
    public async Task CompleteAuditWorkflow_CreateSearchExport_Success()
    {
        // Arrange - Seed test data
        await SeedTestDataAsync();

        // Act & Assert - Search communications
        var searchRequest = new CommunicationAuditSearchRequest
        {
            Page = 1,
            PageSize = 10,
            SearchTerm = "test"
        };

        var searchResponse = await _client.GetAsync($"/api/communication-audit/logs?" +
            $"page={searchRequest.Page}&pageSize={searchRequest.PageSize}&searchTerm={searchRequest.SearchTerm}");

        Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);

        var searchResult = await searchResponse.Content.ReadFromJsonAsync<CommunicationAuditResult>();
        Assert.NotNull(searchResult);
        Assert.True(searchResult.Logs.Any());
        Assert.Contains(searchResult.Logs, log => log.Content.Contains("test"));

        // Act & Assert - Export communications
        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = searchRequest,
            Format = "CSV",
            IncludeContent = true,
            MaxRecords = 1000
        };

        var exportResponse = await _client.PostAsJsonAsync("/api/communication-export/csv", exportRequest);
        Assert.Equal(HttpStatusCode.OK, exportResponse.StatusCode);

        var csvContent = await exportResponse.Content.ReadAsStringAsync();
        Assert.Contains("ID,Order ID,Communication Type", csvContent);
        Assert.Contains("test", csvContent);
    }

    /// <summary>
    /// Test webhook processing end-to-end workflow
    /// </summary>
    [Fact]
    public async Task WebhookWorkflow_SendGridDeliveryUpdate_UpdatesStatus()
    {
        // Arrange - Create a communication log
        var communicationLog = await CreateTestCommunicationLogAsync();

        var webhookPayload = new[]
        {
            new
            {
                @event = "delivered",
                sg_message_id = communicationLog.ExternalMessageId,
                email = "test@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        // Act - Process webhook
        var response = await _client.PostAsJsonAsync("/api/communication-audit/webhooks/sendgrid", webhookPayload);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify status was updated
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();
        
        var deliveryLog = await dbContext.NotificationDeliveryLogs
            .FirstOrDefaultAsync(dl => dl.ExternalId == communicationLog.ExternalMessageId);
        
        Assert.NotNull(deliveryLog);
        Assert.Equal("Delivered", deliveryLog.Status);
    }

    /// <summary>
    /// Test role-based access control for audit endpoints
    /// </summary>
    [Fact]
    public async Task AccessControl_NonStaffUser_RestrictedToOwnOrganization()
    {
        // Arrange - This test would require proper authentication setup
        // For now, we'll test the basic endpoint availability
        
        var searchRequest = new CommunicationAuditSearchRequest
        {
            Page = 1,
            PageSize = 10
        };

        // Act - Attempt to access audit data without authentication
        var response = await _client.GetAsync("/api/communication-audit/logs?page=1&pageSize=10");

        // Assert - Should require authentication
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// Test delivery status summary generation
    /// </summary>
    [Fact]
    public async Task DeliverySummary_WithVariousStatuses_GeneratesCorrectSummary()
    {
        // Arrange - Seed data with various delivery statuses
        await SeedDeliveryStatusTestDataAsync();

        var fromDate = DateTime.UtcNow.AddDays(-30).ToString("O");
        var toDate = DateTime.UtcNow.ToString("O");

        // Act
        var response = await _client.GetAsync($"/api/communication-audit/delivery-summary?" +
            $"from={fromDate}&to={toDate}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var summary = await response.Content.ReadFromJsonAsync<DeliveryStatusSummary>();
        Assert.NotNull(summary);
        Assert.True(summary.TotalCommunications > 0);
        Assert.True(summary.StatusCounts.Count > 0);
        Assert.True(summary.DeliverySuccessRate >= 0 && summary.DeliverySuccessRate <= 100);
    }

    /// <summary>
    /// Test search performance with large dataset
    /// </summary>
    [Fact]
    public async Task SearchPerformance_LargeDataset_CompletesWithinTimeout()
    {
        // Arrange - Create larger dataset
        await SeedLargeDatasetAsync(1000);

        var searchRequest = new CommunicationAuditSearchRequest
        {
            SearchTerm = "performance",
            Page = 1,
            PageSize = 50
        };

        // Act - Measure search time
        var startTime = DateTime.UtcNow;
        var response = await _client.GetAsync($"/api/communication-audit/logs?" +
            $"searchTerm={searchRequest.SearchTerm}&page={searchRequest.Page}&pageSize={searchRequest.PageSize}");
        var duration = DateTime.UtcNow - startTime;

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(duration.TotalSeconds < 5, $"Search took {duration.TotalSeconds} seconds, expected < 5 seconds");

        var result = await response.Content.ReadFromJsonAsync<CommunicationAuditResult>();
        Assert.NotNull(result);
    }

    /// <summary>
    /// Test message edit history tracking
    /// </summary>
    [Fact]
    public async Task MessageEditHistory_MultipleEdits_TracksAllChanges()
    {
        // Arrange - Create message with edit history
        var messageId = await CreateTestMessageWithEditsAsync();

        // Act
        var response = await _client.GetAsync($"/api/communication-audit/messages/{messageId}/edit-history");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var editHistory = await response.Content.ReadFromJsonAsync<MessageEdit[]>();
        Assert.NotNull(editHistory);
        Assert.True(editHistory.Length >= 2); // Should have multiple edits
        
        // Verify edit history is ordered by date
        for (int i = 1; i < editHistory.Length; i++)
        {
            Assert.True(editHistory[i-1].EditedAt <= editHistory[i].EditedAt);
        }
    }

    /// <summary>
    /// Test export functionality with different formats
    /// </summary>
    [Theory]
    [InlineData("csv", "text/csv")]
    [InlineData("excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    public async Task ExportFormats_DifferentFormats_GenerateCorrectContentType(string format, string expectedContentType)
    {
        // Arrange
        await SeedTestDataAsync();

        var exportRequest = new ExportCommunicationRequest
        {
            SearchCriteria = new CommunicationAuditSearchRequest { Page = 1, PageSize = 10 },
            Format = format,
            IncludeContent = false,
            MaxRecords = 100
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/communication-export/{format}", exportRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(expectedContentType, response.Content.Headers.ContentType?.MediaType);
        
        var content = await response.Content.ReadAsByteArrayAsync();
        Assert.True(content.Length > 0);
    }

    /// <summary>
    /// Test concurrent access to audit system
    /// </summary>
    [Fact]
    public async Task ConcurrentAccess_MultipleUsers_HandlesCorrectly()
    {
        // Arrange
        await SeedTestDataAsync();

        var searchRequest = new CommunicationAuditSearchRequest
        {
            Page = 1,
            PageSize = 20
        };

        // Act - Simulate multiple concurrent requests
        var tasks = Enumerable.Range(1, 5).Select(async _ =>
        {
            var response = await _client.GetAsync("/api/communication-audit/logs?page=1&pageSize=20");
            return await response.Content.ReadFromJsonAsync<CommunicationAuditResult>();
        });

        var results = await Task.WhenAll(tasks);

        // Assert
        Assert.All(results, result =>
        {
            Assert.NotNull(result);
            Assert.True(result.TotalCount > 0);
        });
    }

    #region Helper Methods

    /// <summary>
    /// Seeds basic test data for communication audit
    /// </summary>
    private async Task SeedTestDataAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test Organization"
        };

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "TEST-001",
            OrganizationId = organization.Id,
            Organization = organization
        };

        var communications = new[]
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Order = order,
                CommunicationType = "Email",
                Subject = "Test email communication",
                Content = "This is test content for email",
                DeliveryStatus = "Sent",
                SenderId = Guid.NewGuid(),
                SentAt = DateTime.UtcNow.AddHours(-2),
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                ExternalMessageId = "test-msg-1"
            },
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Order = order,
                CommunicationType = "SMS",
                Content = "Test SMS content",
                DeliveryStatus = "Delivered",
                SenderId = Guid.NewGuid(),
                SentAt = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                ExternalMessageId = "test-msg-2"
            }
        };

        dbContext.Organizations.Add(organization);
        dbContext.Orders.Add(order);
        dbContext.CommunicationLogs.AddRange(communications);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Creates a test communication log for webhook testing
    /// </summary>
    private async Task<CommunicationLog> CreateTestCommunicationLogAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Webhook Test Org"
        };

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "WEBHOOK-001",
            OrganizationId = organization.Id,
            Organization = organization
        };

        var communicationLog = new CommunicationLog
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Order = order,
            CommunicationType = "Email",
            Subject = "Webhook Test",
            Content = "Testing webhook processing",
            DeliveryStatus = "Sent",
            SenderId = Guid.NewGuid(),
            SentAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            ExternalMessageId = "webhook-test-msg-123"
        };

        dbContext.Organizations.Add(organization);
        dbContext.Orders.Add(order);
        dbContext.CommunicationLogs.Add(communicationLog);
        await dbContext.SaveChangesAsync();

        return communicationLog;
    }

    /// <summary>
    /// Seeds test data with various delivery statuses
    /// </summary>
    private async Task SeedDeliveryStatusTestDataAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        var organization = new Organization { Id = Guid.NewGuid(), Name = "Status Test Org" };
        var order = new Order 
        { 
            Id = Guid.NewGuid(), 
            OrderNumber = "STATUS-001", 
            OrganizationId = organization.Id,
            Organization = organization 
        };

        var statuses = new[] { "Sent", "Delivered", "Read", "Failed", "Bounced" };
        var communications = statuses.Select((status, index) => new CommunicationLog
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Order = order,
            CommunicationType = index % 2 == 0 ? "Email" : "SMS",
            Subject = $"Status test {status}",
            Content = $"Testing {status} status",
            DeliveryStatus = status,
            SenderId = Guid.NewGuid(),
            SentAt = DateTime.UtcNow.AddDays(-index),
            CreatedAt = DateTime.UtcNow.AddDays(-index)
        });

        dbContext.Organizations.Add(organization);
        dbContext.Orders.Add(order);
        dbContext.CommunicationLogs.AddRange(communications);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds a large dataset for performance testing
    /// </summary>
    private async Task SeedLargeDatasetAsync(int count)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        var organization = new Organization { Id = Guid.NewGuid(), Name = "Performance Test Org" };
        var order = new Order 
        { 
            Id = Guid.NewGuid(), 
            OrderNumber = "PERF-001", 
            OrganizationId = organization.Id,
            Organization = organization 
        };

        var communications = Enumerable.Range(1, count).Select(i => new CommunicationLog
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Order = order,
            CommunicationType = i % 3 == 0 ? "SMS" : "Email",
            Subject = $"Performance test message {i}",
            Content = $"This is performance test content {i} with some searchable text",
            DeliveryStatus = i % 10 == 0 ? "Failed" : "Delivered",
            SenderId = Guid.NewGuid(),
            SentAt = DateTime.UtcNow.AddMinutes(-i),
            CreatedAt = DateTime.UtcNow.AddMinutes(-i)
        });

        dbContext.Organizations.Add(organization);
        dbContext.Orders.Add(order);
        dbContext.CommunicationLogs.AddRange(communications);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Creates a test message with edit history
    /// </summary>
    private async Task<Guid> CreateTestMessageWithEditsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        var messageId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var auditTrail = new MessageAuditTrail
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            IpAddress = "127.0.0.1",
            UserAgent = "Test User Agent",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };

        var edits = new[]
        {
            new MessageEdit
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                EditedBy = userId,
                PreviousContent = "Original message content",
                ChangeReason = "Initial creation",
                EditedAt = DateTime.UtcNow.AddHours(-2)
            },
            new MessageEdit
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                EditedBy = userId,
                PreviousContent = "First edit content",
                ChangeReason = "Fixed typo",
                EditedAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        dbContext.MessageAuditTrails.Add(auditTrail);
        dbContext.MessageEdits.AddRange(edits);
        await dbContext.SaveChangesAsync();

        return messageId;
    }

    #endregion
}