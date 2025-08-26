using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using StackExchange.Redis;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using Twilio.Rest.Api.V2010.Account;

namespace ColorGarbApi.Tests.Unit.Services
{
    /// <summary>
    /// Unit tests for SMS service functionality including critical notifications and rate limiting.
    /// Tests validate message sending, phone verification, and compliance features.
    /// </summary>
    public class SmsServiceTests : IDisposable
    {
        private readonly Mock<TwilioSmsProvider> _mockSmsProvider;
        private readonly Mock<INotificationPreferenceService> _mockNotificationService;
        private readonly Mock<IDatabase> _mockRedis;
        private readonly Mock<ILogger<SmsService>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly ColorGarbDbContext _context;
        private readonly SmsService _smsService;

        public SmsServiceTests()
        {
            // Setup in-memory database
            var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            
            _context = new ColorGarbDbContext(options);
            
            // Setup mocks
            _mockSmsProvider = new Mock<TwilioSmsProvider>(
                Mock.Of<ILogger<TwilioSmsProvider>>(),
                Mock.Of<IConfiguration>()
            );
            _mockNotificationService = new Mock<INotificationPreferenceService>();
            _mockRedis = new Mock<IDatabase>();
            _mockLogger = new Mock<ILogger<SmsService>>();
            _mockConfiguration = new Mock<IConfiguration>();

            // Setup configuration defaults
            _mockConfiguration.Setup(c => c["Portal:BaseUrl"]).Returns("https://portal.colorgarb.com");
            _mockConfiguration.Setup(c => c["Portal:ShortBaseUrl"]).Returns("colorgarb.com");

            _smsService = new SmsService(
                _context,
                _mockSmsProvider.Object,
                _mockNotificationService.Object,
                _mockRedis.Object,
                _mockLogger.Object,
                _mockConfiguration.Object
            );
        }

        [Fact]
        public async Task SendSmsAsync_WithValidInput_ShouldCreateNotificationRecord()
        {
            // Arrange
            var phoneNumber = "+15551234567";
            var message = "Test SMS message";
            var orderId = Guid.NewGuid().ToString();

            var mockTwilioMessage = Mock.Of<MessageResource>(m => 
                m.Sid == "SM123456" && 
                m.Status == MessageResource.StatusEnum.Sent &&
                m.Price == "-0.0075"
            );

            _mockSmsProvider.Setup(x => x.SendSmsAsync(phoneNumber, message))
                .ReturnsAsync(mockTwilioMessage);

            // Act
            var result = await _smsService.SendSmsAsync(phoneNumber, message, orderId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(phoneNumber, result.PhoneNumber);
            Assert.Equal(message, result.Message);
            Assert.Equal("SM123456", result.TwilioMessageSid);
            Assert.Equal("Sent", result.Status);
            Assert.Equal(0.0075m, result.Cost);

            // Verify database record was created
            var savedRecord = await _context.SmsNotifications.FindAsync(result.Id);
            Assert.NotNull(savedRecord);
            Assert.Equal(phoneNumber, savedRecord.PhoneNumber);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task SendSmsAsync_WithInvalidPhoneNumber_ShouldThrowArgumentException(string phoneNumber)
        {
            // Arrange
            var message = "Test message";

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => 
                _smsService.SendSmsAsync(phoneNumber, message));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task SendSmsAsync_WithInvalidMessage_ShouldThrowArgumentException(string message)
        {
            // Arrange
            var phoneNumber = "+15551234567";

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => 
                _smsService.SendSmsAsync(phoneNumber, message));
        }

        [Fact]
        public async Task SendSmsAsync_WithMessageTooLong_ShouldThrowArgumentException()
        {
            // Arrange
            var phoneNumber = "+15551234567";
            var message = new string('A', 1601); // Exceeds 1600 character limit

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => 
                _smsService.SendSmsAsync(phoneNumber, message));
            
            Assert.Contains("1600 characters", exception.Message);
        }

        [Fact]
        public async Task SendSmsAsync_WithInvalidPhoneFormat_ShouldThrowArgumentException()
        {
            // Arrange
            var phoneNumber = "invalid-phone";
            var message = "Test message";

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _smsService.SendSmsAsync(phoneNumber, message));
        }

        [Fact]
        public async Task SendCriticalNotificationAsync_WithSmsDisabled_ShouldReturnNull()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var orderId = Guid.NewGuid().ToString();
            var notificationType = "Shipping";

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Parse(userId),
                SmsEnabled = false,
                PhoneVerified = true,
                PhoneNumber = "+15551234567"
            };

            _mockNotificationService.Setup(x => x.GetByUserIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync(preferences);

            // Act
            var result = await _smsService.SendCriticalNotificationAsync(userId, orderId, notificationType);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task SendCriticalNotificationAsync_WithPhoneNotVerified_ShouldReturnNull()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var orderId = Guid.NewGuid().ToString();
            var notificationType = "PaymentDue";

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Parse(userId),
                SmsEnabled = true,
                PhoneVerified = false,
                PhoneNumber = "+15551234567"
            };

            _mockNotificationService.Setup(x => x.GetByUserIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync(preferences);

            // Act
            var result = await _smsService.SendCriticalNotificationAsync(userId, orderId, notificationType);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task SendCriticalNotificationAsync_WithRateLimitExceeded_ShouldReturnNull()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var orderId = Guid.NewGuid().ToString();
            var notificationType = "UrgentIssue";

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Parse(userId),
                SmsEnabled = true,
                PhoneVerified = true,
                PhoneNumber = "+15551234567"
            };

            _mockNotificationService.Setup(x => x.GetByUserIdAsync(It.IsAny<Guid>()))
                .ReturnsAsync(preferences);

            // Setup rate limit exceeded
            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:user:{userId}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(1);

            // Act
            var result = await _smsService.SendCriticalNotificationAsync(userId, orderId, notificationType);

            // Assert
            Assert.Null(result);
        }

        [Theory]
        [InlineData("Shipping")]
        [InlineData("PaymentDue")]
        [InlineData("UrgentIssue")]
        public async Task SendCriticalNotificationAsync_WithValidInput_ShouldSendSms(string notificationType)
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var orderId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);
            var orderGuid = Guid.Parse(orderId);

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userGuid,
                SmsEnabled = true,
                PhoneVerified = true,
                PhoneNumber = "+15551234567"
            };

            var order = new ColorGarbApi.Models.Order
            {
                Id = orderGuid,
                OrderNumber = "CG-2023-001",
                OrganizationId = Guid.NewGuid(),
                Description = "Test Order",
                CurrentStage = "Production",
                OriginalShipDate = DateTime.UtcNow.AddDays(30),
                CurrentShipDate = DateTime.UtcNow.AddDays(30),
                TotalAmount = 1000.00m,
                PaymentStatus = "Pending"
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            _mockNotificationService.Setup(x => x.GetByUserIdAsync(userGuid))
                .ReturnsAsync(preferences);

            // Setup rate limiting to allow sending
            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:user:{userId}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(RedisValue.Null);
            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:phone:{preferences.PhoneNumber}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(2);

            var mockTwilioMessage = Mock.Of<MessageResource>(m => 
                m.Sid == "SM123456" && 
                m.Status == MessageResource.StatusEnum.Queued
            );

            _mockSmsProvider.Setup(x => x.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(mockTwilioMessage);

            // Act
            var result = await _smsService.SendCriticalNotificationAsync(userId, orderId, notificationType);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(userGuid, result.UserId);
            Assert.Equal(orderGuid, result.OrderId);
            Assert.Contains("CG-2023-001", result.Message);
            Assert.Contains("Reply STOP to opt out", result.Message);
        }

        [Fact]
        public async Task UpdateDeliveryStatusAsync_WithValidMessageId_ShouldUpdateStatus()
        {
            // Arrange
            var messageId = "SM123456";
            var status = "delivered";
            
            var notification = new SmsNotification
            {
                UserId = Guid.NewGuid(),
                PhoneNumber = "+15551234567",
                Message = "Test message",
                TwilioMessageSid = messageId,
                Status = "sent"
            };

            _context.SmsNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // Act
            var result = await _smsService.UpdateDeliveryStatusAsync(messageId, status);

            // Assert
            Assert.True(result);
            
            var updatedNotification = await _context.SmsNotifications.FindAsync(notification.Id);
            Assert.Equal(status, updatedNotification.Status);
            Assert.NotNull(updatedNotification.DeliveredAt);
        }

        [Fact]
        public async Task UpdateDeliveryStatusAsync_WithNonExistentMessageId_ShouldReturnFalse()
        {
            // Arrange
            var messageId = "SM-NONEXISTENT";
            var status = "delivered";

            // Act
            var result = await _smsService.UpdateDeliveryStatusAsync(messageId, status);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task GetSmsHistoryAsync_WithValidUserId_ShouldReturnPaginatedResults()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);

            // Add test notifications
            for (int i = 0; i < 10; i++)
            {
                var notification = new SmsNotification
                {
                    UserId = userGuid,
                    PhoneNumber = "+15551234567",
                    Message = $"Test message {i}",
                    Status = "delivered",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i)
                };
                _context.SmsNotifications.Add(notification);
            }
            await _context.SaveChangesAsync();

            // Act
            var result = await _smsService.GetSmsHistoryAsync(userId, page: 1, pageSize: 5);

            // Assert
            Assert.Equal(5, result.Count);
            Assert.Equal("Test message 0", result.First().Message); // Most recent first
        }

        [Theory]
        [InlineData("STOP")]
        [InlineData("UNSUBSCRIBE")]
        public async Task ProcessInboundSmsAsync_WithOptOutKeyword_ShouldOptOutUser(string keyword)
        {
            // Arrange
            var phoneNumber = "+15551234567";
            var messageId = "SM123456";

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                PhoneNumber = phoneNumber,
                SmsEnabled = true,
                PhoneVerified = true
            };

            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();

            // Act
            var result = await _smsService.ProcessInboundSmsAsync(phoneNumber, keyword, messageId);

            // Assert
            Assert.True(result);
            
            var updatedPreferences = await _context.NotificationPreferences.FindAsync(preferences.Id);
            Assert.False(updatedPreferences.SmsEnabled);
        }

        [Theory]
        [InlineData("START")]
        [InlineData("SUBSCRIBE")]
        public async Task ProcessInboundSmsAsync_WithOptInKeyword_ShouldOptInUser(string keyword)
        {
            // Arrange
            var phoneNumber = "+15551234567";
            var messageId = "SM123456";

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                PhoneNumber = phoneNumber,
                SmsEnabled = false,
                PhoneVerified = true
            };

            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();

            // Act
            var result = await _smsService.ProcessInboundSmsAsync(phoneNumber, keyword, messageId);

            // Assert
            Assert.True(result);
            
            var updatedPreferences = await _context.NotificationPreferences.FindAsync(preferences.Id);
            Assert.True(updatedPreferences.SmsEnabled);
        }

        [Fact]
        public async Task IsWithinRateLimitAsync_WithExceededUserLimit_ShouldReturnFalse()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var phoneNumber = "+15551234567";

            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:user:{userId}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(1);

            // Act
            var result = await _smsService.IsWithinRateLimitAsync(userId, phoneNumber);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task IsWithinRateLimitAsync_WithExceededPhoneLimit_ShouldReturnFalse()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var phoneNumber = "+15551234567";

            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:user:{userId}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(RedisValue.Null);
            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:phone:{phoneNumber}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(3);

            // Act
            var result = await _smsService.IsWithinRateLimitAsync(userId, phoneNumber);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task IsWithinRateLimitAsync_WithinLimits_ShouldReturnTrue()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var phoneNumber = "+15551234567";

            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:user:{userId}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(RedisValue.Null);
            _mockRedis.Setup(x => x.StringGetAsync($"sms_rate_limit:phone:{phoneNumber}", It.IsAny<CommandFlags>()))
                .ReturnsAsync(2);

            // Act
            var result = await _smsService.IsWithinRateLimitAsync(userId, phoneNumber);

            // Assert
            Assert.True(result);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}