using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Models.Entities;
using Moq;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Integration tests for WebhooksController to verify webhook endpoint functionality.
/// Tests SendGrid and Twilio webhook processing with various scenarios.
/// </summary>
public class WebhooksControllerTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly Mock<ICommunicationAuditService> _mockAuditService;

    public WebhooksControllerTests(WebApplicationFactory<Program> factory)
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace the real audit service with mock for testing
                services.AddScoped(_ => _mockAuditService.Object);
            });
        });
        
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task SendGridWebhook_WithValidEvent_ReturnsOk()
    {
        // Arrange
        var sendGridEvent = new[]
        {
            new
            {
                @event = "delivered",
                sg_message_id = "test-message-123",
                email = "recipient@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                response = "250 OK"
            }
        };

        var json = JsonSerializer.Serialize(sendGridEvent);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            "test-message-123", 
            "Delivered", 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        response.EnsureSuccessStatusCode();
        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<dynamic>(responseContent);
        
        // Verify the audit service was called
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "test-message-123", 
            "Delivered", 
            It.IsAny<string>(), 
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task SendGridWebhook_WithMultipleEvents_ProcessesAll()
    {
        // Arrange
        var sendGridEvents = new[]
        {
            new
            {
                @event = "delivered",
                sg_message_id = "msg-001",
                email = "user1@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            },
            new
            {
                @event = "bounce",
                sg_message_id = "msg-002", 
                email = "user2@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                reason = "Invalid email address"
            },
            new
            {
                @event = "open",
                sg_message_id = "msg-003",
                email = "user3@example.com", 
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        var json = JsonSerializer.Serialize(sendGridEvents);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Verify all events were processed
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "msg-001", "Delivered", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "msg-002", "Bounced", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "msg-003", "Opened", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task SendGridWebhook_WithInvalidEvent_ContinuesProcessing()
    {
        // Arrange - Include one invalid event mixed with valid ones
        var sendGridEvents = new[]
        {
            new
            {
                @event = "delivered",
                sg_message_id = "valid-message",
                email = "valid@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            },
            new
            {
                @event = "invalid-event",
                // Missing sg_message_id to cause validation error
                email = "test@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            },
            new
            {
                @event = "bounce",
                sg_message_id = "another-valid",
                email = "bounce@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        var json = JsonSerializer.Serialize(sendGridEvents);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Should process valid events despite invalid one
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "valid-message", "Delivered", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "another-valid", "Bounced", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task TwilioWebhook_WithValidEvent_ReturnsXmlResponse()
    {
        // Arrange
        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", "twilio-msg-123"),
            new KeyValuePair<string, string>("MessageStatus", "delivered"),
            new KeyValuePair<string, string>("From", "+1234567890"),
            new KeyValuePair<string, string>("To", "+0987654321"),
        });

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            "twilio-msg-123", 
            "Delivered", 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/twilio", formData);

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("<?xml", responseContent);
        Assert.Contains("<Response>", responseContent);
        
        // Verify content type
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);
        
        // Verify the audit service was called
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "twilio-msg-123", 
            "Delivered", 
            It.IsAny<string>(), 
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task TwilioWebhook_WithFailedStatus_ProcessesErrorInfo()
    {
        // Arrange
        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", "failed-msg-456"),
            new KeyValuePair<string, string>("MessageStatus", "failed"),
            new KeyValuePair<string, string>("ErrorCode", "30008"),
            new KeyValuePair<string, string>("ErrorMessage", "Unknown error"),
            new KeyValuePair<string, string>("From", "+1234567890"),
            new KeyValuePair<string, string>("To", "+0987654321"),
        });

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            "failed-msg-456", 
            "Failed", 
            "Error 30008: Unknown error", 
            It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/twilio", formData);

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Verify the audit service was called with error details
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            "failed-msg-456", 
            "Failed", 
            "Error 30008: Unknown error", 
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task TwilioWebhook_WithMissingRequiredFields_ReturnsBadRequest()
    {
        // Arrange - Missing MessageSid
        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageStatus", "delivered"),
            new KeyValuePair<string, string>("From", "+1234567890"),
        });

        // Act
        var response = await _client.PostAsync("/api/webhooks/twilio", formData);

        // Assert
        // Should handle gracefully and return success (as per Twilio requirements)
        // but not call the audit service
        response.EnsureSuccessStatusCode();
        
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SendGridWebhook_WithEmptyEventArray_ReturnsOk()
    {
        // Arrange
        var emptyEvents = new object[0];
        var json = JsonSerializer.Serialize(emptyEvents);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        // Should not call audit service with no events
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task WebhookHealth_ReturnsHealthyStatus()
    {
        // Act
        var response = await _client.GetAsync("/api/webhooks/health");

        // Assert
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var healthResult = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal("healthy", healthResult.GetProperty("status").GetString());
        Assert.True(healthResult.GetProperty("endpoints").GetArrayLength() > 0);
        Assert.True(healthResult.TryGetProperty("timestamp", out _));
    }

    [Fact]
    public async Task SendGridWebhook_WithServiceException_ReturnsError()
    {
        // Arrange
        var sendGridEvent = new[]
        {
            new
            {
                @event = "delivered",
                sg_message_id = "error-test-123",
                email = "test@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        var json = JsonSerializer.Serialize(sendGridEvent);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Setup mock to throw exception
        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        // Should still return OK for webhook (to prevent retries) but log the error
        response.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("delivered", "Delivered")]
    [InlineData("bounce", "Bounced")]
    [InlineData("dropped", "Failed")]
    [InlineData("deferred", "Deferred")]
    [InlineData("open", "Opened")]
    [InlineData("click", "Clicked")]
    [InlineData("spamreport", "SpamReport")]
    [InlineData("unsubscribe", "Unsubscribed")]
    public async Task SendGridWebhook_MapsEventTypesCorrectly(string sendGridEventType, string expectedStatus)
    {
        // Arrange
        var sendGridEvent = new[]
        {
            new
            {
                @event = sendGridEventType,
                sg_message_id = $"test-{sendGridEventType}-123",
                email = "test@example.com",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        var json = JsonSerializer.Serialize(sendGridEvent);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), expectedStatus, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/sendgrid", content);

        // Assert
        response.EnsureSuccessStatusCode();
        
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            $"test-{sendGridEventType}-123", expectedStatus, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Theory]
    [InlineData("queued", "Queued")]
    [InlineData("sent", "Sent")]
    [InlineData("delivered", "Delivered")]
    [InlineData("undelivered", "Failed")]
    [InlineData("failed", "Failed")]
    [InlineData("received", "Delivered")]
    public async Task TwilioWebhook_MapsStatusTypesCorrectly(string twilioStatus, string expectedStatus)
    {
        // Arrange
        var formData = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", $"test-{twilioStatus}-123"),
            new KeyValuePair<string, string>("MessageStatus", twilioStatus),
            new KeyValuePair<string, string>("From", "+1234567890"),
            new KeyValuePair<string, string>("To", "+0987654321"),
        });

        _mockAuditService.Setup(x => x.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), expectedStatus, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var response = await _client.PostAsync("/api/webhooks/twilio", formData);

        // Assert
        response.EnsureSuccessStatusCode();
        
        _mockAuditService.Verify(x => x.UpdateDeliveryStatusAsync(
            $"test-{twilioStatus}-123", expectedStatus, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    public void Dispose()
    {
        _client?.Dispose();
    }
}