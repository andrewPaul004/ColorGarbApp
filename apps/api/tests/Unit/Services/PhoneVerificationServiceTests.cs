using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using System;
using System.Threading.Tasks;
using System.Linq;
using Twilio.Rest.Api.V2010.Account;

namespace ColorGarbApi.Tests.Unit.Services
{
    /// <summary>
    /// Unit tests for phone verification service functionality including code generation and validation.
    /// Tests validate phone number formatting, verification workflows, and rate limiting.
    /// </summary>
    public class PhoneVerificationServiceTests : IDisposable
    {
        private readonly Mock<TwilioSmsProvider> _mockSmsProvider;
        private readonly Mock<ILogger<PhoneVerificationService>> _mockLogger;
        private readonly ColorGarbDbContext _context;
        private readonly PhoneVerificationService _phoneVerificationService;

        public PhoneVerificationServiceTests()
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
            _mockLogger = new Mock<ILogger<PhoneVerificationService>>();

            _phoneVerificationService = new PhoneVerificationService(
                _context,
                _mockSmsProvider.Object,
                _mockLogger.Object
            );
        }

        [Fact]
        public async Task SendVerificationCodeAsync_WithValidInput_ShouldCreateVerificationRecord()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var phoneNumber = "(555) 123-4567";

            var mockTwilioMessage = Mock.Of<MessageResource>(m => 
                m.Sid == "SM123456" && 
                m.Status == MessageResource.StatusEnum.Queued
            );

            _mockSmsProvider.Setup(x => x.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(mockTwilioMessage);

            // Act
            var result = await _phoneVerificationService.SendVerificationCodeAsync(userId, phoneNumber);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(Guid.Parse(userId), result.UserId);
            Assert.Equal("+15551234567", result.PhoneNumber); // Should be formatted to E.164
            Assert.Equal(6, result.VerificationToken.Length);
            Assert.True(result.VerificationToken.All(char.IsDigit));
            Assert.True(result.ExpiresAt > DateTime.UtcNow);
            Assert.False(result.IsVerified);

            // Verify SMS was sent
            _mockSmsProvider.Verify(x => x.SendSmsAsync(
                "+15551234567", 
                It.Is<string>(s => s.Contains("ColorGarb verification code:"))), 
                Times.Once);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task SendVerificationCodeAsync_WithInvalidUserId_ShouldThrowArgumentException(string userId)
        {
            // Arrange
            var phoneNumber = "+15551234567";

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => 
                _phoneVerificationService.SendVerificationCodeAsync(userId, phoneNumber));
        }

        [Fact]
        public async Task SendVerificationCodeAsync_WithInvalidUserIdFormat_ShouldThrowArgumentException()
        {
            // Arrange
            var userId = "invalid-guid";
            var phoneNumber = "+15551234567";

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => 
                _phoneVerificationService.SendVerificationCodeAsync(userId, phoneNumber));
            
            Assert.Contains("Invalid user ID format", exception.Message);
        }

        [Fact]
        public async Task SendVerificationCodeAsync_WithRateLimitExceeded_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var phoneNumber = "+15551234567";

            // Add 3 recent verification attempts (exceeds rate limit)
            for (int i = 0; i < 3; i++)
            {
                var verification = new PhoneVerification
                {
                    UserId = Guid.Parse(userId),
                    PhoneNumber = phoneNumber,
                    VerificationToken = "123456",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-i * 10),
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10)
                };
                _context.PhoneVerifications.Add(verification);
            }
            await _context.SaveChangesAsync();

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _phoneVerificationService.SendVerificationCodeAsync(userId, phoneNumber));
            
            Assert.Contains("Rate limit exceeded", exception.Message);
        }

        [Theory]
        [InlineData("5551234567", "+15551234567")]  // US number without country code
        [InlineData("15551234567", "+15551234567")] // US number with country code
        [InlineData("+15551234567", "+15551234567")] // Already formatted E.164
        [InlineData("(555) 123-4567", "+15551234567")] // Formatted US number
        [InlineData("555-123-4567", "+15551234567")] // Dashed US number
        public async Task ValidateAndFormatPhoneNumberAsync_WithVariousFormats_ShouldFormatCorrectly(string input, string expected)
        {
            // Act
            var result = await _phoneVerificationService.ValidateAndFormatPhoneNumberAsync(input);

            // Assert
            Assert.Equal(expected, result);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("123")]
        [InlineData("12345678901234567890")]
        [InlineData("invalid-phone")]
        public async Task ValidateAndFormatPhoneNumberAsync_WithInvalidInput_ShouldThrowArgumentException(string phoneNumber)
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _phoneVerificationService.ValidateAndFormatPhoneNumberAsync(phoneNumber));
        }

        [Fact]
        public async Task VerifyPhoneNumberAsync_WithValidToken_ShouldVerifyAndUpdatePreferences()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);
            var verificationToken = "123456";
            var phoneNumber = "+15551234567";

            // Create verification record
            var verification = new PhoneVerification
            {
                UserId = userGuid,
                PhoneNumber = phoneNumber,
                VerificationToken = verificationToken,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsVerified = false
            };
            _context.PhoneVerifications.Add(verification);

            // Create notification preferences
            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userGuid,
                EmailEnabled = true,
                SmsEnabled = false,
                PhoneVerified = false
            };
            _context.NotificationPreferences.Add(preferences);
            
            await _context.SaveChangesAsync();

            // Act
            var result = await _phoneVerificationService.VerifyPhoneNumberAsync(userId, verificationToken);

            // Assert
            Assert.True(result);

            // Verify verification record was updated
            var updatedVerification = await _context.PhoneVerifications.FindAsync(verification.Id);
            Assert.True(updatedVerification.IsVerified);
            Assert.NotNull(updatedVerification.VerifiedAt);

            // Verify preferences were updated
            var updatedPreferences = await _context.NotificationPreferences.FindAsync(preferences.Id);
            Assert.Equal(phoneNumber, updatedPreferences.PhoneNumber);
            Assert.True(updatedPreferences.PhoneVerified);
            Assert.NotNull(updatedPreferences.PhoneVerifiedAt);
        }

        [Fact]
        public async Task VerifyPhoneNumberAsync_WithExpiredToken_ShouldReturnFalse()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);
            var verificationToken = "123456";

            // Create expired verification record
            var verification = new PhoneVerification
            {
                UserId = userGuid,
                PhoneNumber = "+15551234567",
                VerificationToken = verificationToken,
                CreatedAt = DateTime.UtcNow.AddMinutes(-20),
                ExpiresAt = DateTime.UtcNow.AddMinutes(-10), // Expired
                IsVerified = false
            };
            _context.PhoneVerifications.Add(verification);
            await _context.SaveChangesAsync();

            // Act
            var result = await _phoneVerificationService.VerifyPhoneNumberAsync(userId, verificationToken);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task VerifyPhoneNumberAsync_WithInvalidToken_ShouldReturnFalse()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var verificationToken = "999999"; // Wrong token

            // Act
            var result = await _phoneVerificationService.VerifyPhoneNumberAsync(userId, verificationToken);

            // Assert
            Assert.False(result);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("12345")]   // Too short
        [InlineData("1234567")] // Too long
        [InlineData("abcdef")]  // Non-numeric
        public async Task VerifyPhoneNumberAsync_WithInvalidTokenFormat_ShouldThrowArgumentException(string token)
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => 
                _phoneVerificationService.VerifyPhoneNumberAsync(userId, token));
        }

        [Fact]
        public async Task IsPhoneNumberVerifiedAsync_WithVerifiedPhone_ShouldReturnTrue()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userGuid,
                PhoneNumber = "+15551234567",
                PhoneVerified = true,
                EmailEnabled = true,
                SmsEnabled = true
            };
            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();

            // Act
            var result = await _phoneVerificationService.IsPhoneNumberVerifiedAsync(userId);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task IsPhoneNumberVerifiedAsync_WithUnverifiedPhone_ShouldReturnFalse()
        {
            // Arrange
            var userId = Guid.NewGuid().ToString();
            var userGuid = Guid.Parse(userId);

            var preferences = new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userGuid,
                PhoneNumber = "+15551234567",
                PhoneVerified = false,
                EmailEnabled = true,
                SmsEnabled = false
            };
            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();

            // Act
            var result = await _phoneVerificationService.IsPhoneNumberVerifiedAsync(userId);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task CleanupExpiredVerificationsAsync_WithExpiredRecords_ShouldRemoveThem()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Add expired verification
            var expiredVerification = new PhoneVerification
            {
                UserId = userId,
                PhoneNumber = "+15551234567",
                VerificationToken = "123456",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
            };

            // Add active verification
            var activeVerification = new PhoneVerification
            {
                UserId = userId,
                PhoneNumber = "+15551234568",
                VerificationToken = "654321",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(5)
            };

            _context.PhoneVerifications.AddRange(expiredVerification, activeVerification);
            await _context.SaveChangesAsync();

            // Act
            var removedCount = await _phoneVerificationService.CleanupExpiredVerificationsAsync();

            // Assert
            Assert.Equal(1, removedCount);
            
            var remainingVerifications = await _context.PhoneVerifications.ToListAsync();
            Assert.Single(remainingVerifications);
            Assert.Equal(activeVerification.Id, remainingVerifications[0].Id);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}