using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Controllers;
using System;
using System.Threading.Tasks;
using System.Net;
using System.Linq;

namespace ColorGarbApi.Tests.Integration
{
    /// <summary>
    /// Integration tests for SMS notification system end-to-end workflows.
    /// Tests complete phone verification and SMS notification delivery flows.
    /// </summary>
    public class SmsNotificationIntegrationTests : IClassFixture<TestWebApplicationFactory<Program>>
    {
        private readonly TestWebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;

        public SmsNotificationIntegrationTests(TestWebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _client = _factory.CreateClient();
        }

        [Fact]
        public async Task PhoneVerificationFlow_EndToEnd_ShouldWork()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var phoneNumber = "+15551234567";

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            // Create user preferences
            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EmailEnabled = true,
                SmsEnabled = false,
                PhoneVerified = false,
                IsActive = true,
                Frequency = "Immediate"
            };
            context.NotificationPreferences.Add(preferences);
            await context.SaveChangesAsync();

            // Step 1: Send verification code
            var verificationRequest = new PhoneVerificationRequest
            {
                PhoneNumber = phoneNumber
            };

            var verificationJson = JsonSerializer.Serialize(verificationRequest);
            var verificationContent = new StringContent(verificationJson, Encoding.UTF8, "application/json");

            var verificationResponse = await _client.PostAsync($"/api/notifications/users/{userId}/phone/verify", verificationContent);

            // Assert verification code was sent
            Assert.Equal(HttpStatusCode.OK, verificationResponse.StatusCode);

            // Get the verification token from database (in real scenario, user would receive it via SMS)
            var verification = await context.PhoneVerifications
                .Where(pv => pv.UserId == userId && pv.PhoneNumber == phoneNumber)
                .OrderByDescending(pv => pv.CreatedAt)
                .FirstOrDefaultAsync();

            Assert.NotNull(verification);
            Assert.Equal(6, verification.VerificationToken.Length);
            Assert.False(verification.IsVerified);

            // Step 2: Verify phone number with token
            var verifyRequest = new VerifyPhoneRequest
            {
                VerificationToken = verification.VerificationToken
            };

            var verifyJson = JsonSerializer.Serialize(verifyRequest);
            var verifyContent = new StringContent(verifyJson, Encoding.UTF8, "application/json");

            var verifyResponse = await _client.PutAsync($"/api/notifications/users/{userId}/phone/verify", verifyContent);

            // Assert phone number was verified
            Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

            var verifyResponseData = await verifyResponse.Content.ReadAsStringAsync();
            var verifyResult = JsonSerializer.Deserialize<VerifyPhoneResponse>(verifyResponseData, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.True(verifyResult.Success);
            Assert.Equal(phoneNumber, verifyResult.PhoneNumber);

            // Verify database was updated
            var updatedPreferences = await context.NotificationPreferences.FindAsync(preferences.Id);
            Assert.Equal(phoneNumber, updatedPreferences.PhoneNumber);
            Assert.True(updatedPreferences.PhoneVerified);
            Assert.NotNull(updatedPreferences.PhoneVerifiedAt);

            var updatedVerification = await context.PhoneVerifications.FindAsync(verification.Id);
            Assert.True(updatedVerification.IsVerified);
            Assert.NotNull(updatedVerification.VerifiedAt);
        }

        [Fact]
        public async Task PhoneVerificationFlow_WithInvalidToken_ShouldFail()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Try to verify with invalid token
            var verifyRequest = new VerifyPhoneRequest
            {
                VerificationToken = "999999"
            };

            var verifyJson = JsonSerializer.Serialize(verifyRequest);
            var verifyContent = new StringContent(verifyJson, Encoding.UTF8, "application/json");

            // Act
            var verifyResponse = await _client.PutAsync($"/api/notifications/users/{userId}/phone/verify", verifyContent);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, verifyResponse.StatusCode);
        }

        [Fact]
        public async Task PhoneVerificationFlow_RateLimitExceeded_ShouldFail()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var phoneNumber = "+15551234567";

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            // Add 3 recent verification attempts to exceed rate limit
            for (int i = 0; i < 3; i++)
            {
                var verification = new PhoneVerification
                {
                    UserId = userId,
                    PhoneNumber = phoneNumber,
                    VerificationToken = $"12345{i}",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i * 10),
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10)
                };
                context.PhoneVerifications.Add(verification);
            }
            await context.SaveChangesAsync();

            // Try to send another verification
            var verificationRequest = new PhoneVerificationRequest
            {
                PhoneNumber = phoneNumber
            };

            var verificationJson = JsonSerializer.Serialize(verificationRequest);
            var verificationContent = new StringContent(verificationJson, Encoding.UTF8, "application/json");

            // Act
            var verificationResponse = await _client.PostAsync($"/api/notifications/users/{userId}/phone/verify", verificationContent);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, verificationResponse.StatusCode);
        }

        [Fact]
        public async Task SmsHistory_WithValidUser_ShouldReturnHistory()
        {
            // Arrange
            var userId = Guid.NewGuid();

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            // Add test SMS notifications
            for (int i = 0; i < 5; i++)
            {
                var notification = new SmsNotification
                {
                    UserId = userId,
                    PhoneNumber = "+15551234567",
                    Message = $"Test SMS {i}",
                    Status = "delivered",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                    DeliveredAt = DateTime.UtcNow.AddMinutes(-i + 1)
                };
                context.SmsNotifications.Add(notification);
            }
            await context.SaveChangesAsync();

            // Act
            var response = await _client.GetAsync($"/api/notifications/users/{userId}/sms-history?page=1&pageSize=3");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var responseData = await response.Content.ReadAsStringAsync();
            var smsHistory = JsonSerializer.Deserialize<SmsNotificationResponse[]>(responseData, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Equal(3, smsHistory.Length);
            Assert.Equal("Test SMS 0", smsHistory[0].Message); // Most recent first
            Assert.Equal("delivered", smsHistory[0].Status);
        }

        [Fact]
        public async Task SmsDeliveryWebhook_WithValidRequest_ShouldUpdateStatus()
        {
            // Arrange
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            var notification = new SmsNotification
            {
                UserId = Guid.NewGuid(),
                PhoneNumber = "+15551234567",
                Message = "Test SMS",
                Status = "sent",
                TwilioMessageSid = "SM123456789"
            };
            context.SmsNotifications.Add(notification);
            await context.SaveChangesAsync();

            // Create webhook request
            var webhookRequest = new TwilioSmsWebhookRequest
            {
                MessageSid = "SM123456789",
                MessageStatus = "delivered"
            };

            var webhookJson = JsonSerializer.Serialize(webhookRequest);
            var webhookContent = new StringContent(webhookJson, Encoding.UTF8, "application/json");

            // Act
            var response = await _client.PostAsync("/api/notifications/webhook/sms-status", webhookContent);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            var updatedNotification = await context.SmsNotifications.FindAsync(notification.Id);
            Assert.Equal("delivered", updatedNotification.Status);
            Assert.NotNull(updatedNotification.DeliveredAt);
        }

        [Fact]
        public async Task SmsInboundWebhook_WithStopMessage_ShouldOptOutUser()
        {
            // Arrange
            var phoneNumber = "+15551234567";

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                PhoneNumber = phoneNumber,
                SmsEnabled = true,
                PhoneVerified = true,
                EmailEnabled = true,
                IsActive = true,
                Frequency = "Immediate"
            };
            context.NotificationPreferences.Add(preferences);
            await context.SaveChangesAsync();

            // Create inbound SMS webhook request
            var inboundRequest = new TwilioInboundSmsRequest
            {
                From = phoneNumber,
                Body = "STOP",
                MessageSid = "SM987654321"
            };

            var inboundJson = JsonSerializer.Serialize(inboundRequest);
            var inboundContent = new StringContent(inboundJson, Encoding.UTF8, "application/json");

            // Act
            var response = await _client.PostAsync("/api/notifications/webhook/sms-inbound", inboundContent);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            var updatedPreferences = await context.NotificationPreferences.FindAsync(preferences.Id);
            Assert.False(updatedPreferences.SmsEnabled);
        }
    }

    // Request/Response models for testing
    public class PhoneVerificationRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public class VerifyPhoneRequest
    {
        public string VerificationToken { get; set; } = string.Empty;
    }

    public class VerifyPhoneResponse
    {
        public bool Success { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime VerifiedAt { get; set; }
    }

    public class SmsNotificationResponse
    {
        public Guid Id { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
    }

    public class TwilioSmsWebhookRequest
    {
        public string MessageSid { get; set; } = string.Empty;
        public string MessageStatus { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    public class TwilioInboundSmsRequest
    {
        public string From { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string MessageSid { get; set; } = string.Empty;
    }
}