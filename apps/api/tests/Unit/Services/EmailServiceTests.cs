using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for EmailService to verify notification functionality.
/// </summary>
public class EmailServiceTests
{
    private readonly Mock<ILogger<EmailService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly EmailService _emailService;

    public EmailServiceTests()
    {
        _mockLogger = new Mock<ILogger<EmailService>>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Setup configuration
        _mockConfiguration.Setup(x => x["Frontend:BaseUrl"])
            .Returns("https://portal.colorgarb.com");

        _emailService = new EmailService(_mockLogger.Object, _mockConfiguration.Object);
    }

    /// <summary>
    /// Test sending order stage update email
    /// </summary>
    [Fact]
    public async Task SendOrderStageUpdateEmailAsync_ValidInputs_ReturnsTrue()
    {
        // Arrange
        var email = "test@theater.com";
        var organizationName = "Lincoln High School Drama";
        var orderNumber = "CG-2025-001";
        var orderDescription = "Hamilton Costumes";
        var previousStage = "Initial Consultation";
        var newStage = "Design Proposal";
        var currentShipDate = DateTime.Now.AddDays(60);

        // Act
        var result = await _emailService.SendOrderStageUpdateEmailAsync(
            email, organizationName, orderNumber, orderDescription, 
            previousStage, newStage, currentShipDate);

        // Assert
        Assert.True(result);

        // Verify logging was called with expected information
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Order stage update email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Test sending ship date change email for delay
    /// </summary>
    [Fact]
    public async Task SendShipDateChangeEmailAsync_DelayedShipDate_ReturnsTrue()
    {
        // Arrange
        var email = "director@school.edu";
        var organizationName = "University Theater";
        var orderNumber = "CG-2025-002";
        var orderDescription = "Romeo and Juliet Costumes";
        var previousShipDate = DateTime.Now.AddDays(30);
        var newShipDate = DateTime.Now.AddDays(45); // 15 days later
        var reason = "Production complexity requires additional time";

        // Act
        var result = await _emailService.SendShipDateChangeEmailAsync(
            email, organizationName, orderNumber, orderDescription,
            previousShipDate, newShipDate, reason);

        // Assert
        Assert.True(result);

        // Verify logging was called with expected information
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Ship date change email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Test sending ship date change email for early completion
    /// </summary>
    [Fact]
    public async Task SendShipDateChangeEmailAsync_EarlyShipDate_ReturnsTrue()
    {
        // Arrange
        var email = "contact@dancecompany.org";
        var organizationName = "Elite Dance Academy";
        var orderNumber = "CG-2025-003";
        var orderDescription = "Nutcracker Performance Costumes";
        var previousShipDate = DateTime.Now.AddDays(45);
        var newShipDate = DateTime.Now.AddDays(35); // 10 days earlier
        var reason = "Production ahead of schedule";

        // Act
        var result = await _emailService.SendShipDateChangeEmailAsync(
            email, organizationName, orderNumber, orderDescription,
            previousShipDate, newShipDate, reason);

        // Assert
        Assert.True(result);

        // Verify logging was called
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Ship date change email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Test password reset email functionality
    /// </summary>
    [Fact]
    public async Task SendPasswordResetEmailAsync_ValidInputs_ReturnsTrue()
    {
        // Arrange
        var email = "user@example.com";
        var resetToken = "secure-reset-token-12345";
        var userName = "John Doe";

        // Act
        var result = await _emailService.SendPasswordResetEmailAsync(email, resetToken, userName);

        // Assert
        Assert.True(result);

        // Verify logging was called
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Password reset email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Test account lockout email functionality
    /// </summary>
    [Fact]
    public async Task SendAccountLockoutEmailAsync_ValidInputs_ReturnsTrue()
    {
        // Arrange
        var email = "locked@example.com";
        var lockoutExpiryTime = DateTime.UtcNow.AddMinutes(30);
        var userName = "Jane Smith";

        // Act
        var result = await _emailService.SendAccountLockoutEmailAsync(email, lockoutExpiryTime, userName);

        // Assert
        Assert.True(result);

        // Verify logging was called
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Account lockout email would be sent")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Test email service handles exceptions gracefully
    /// </summary>
    [Fact]
    public async Task SendOrderStageUpdateEmailAsync_LoggerThrows_ReturnsFalse()
    {
        // Arrange
        var mockBadLogger = new Mock<ILogger<EmailService>>();
        
        // Set up the first call (LogInformation) to succeed
        mockBadLogger.Setup(x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()));

        // Set up subsequent calls to throw an exception
        var callCount = 0;
        mockBadLogger.Setup(x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()))
            .Callback(() => 
            {
                callCount++;
                if (callCount == 1) // First LogDebug call will throw
                    throw new InvalidOperationException("Logger error");
            });

        var badEmailService = new EmailService(mockBadLogger.Object, _mockConfiguration.Object);

        var email = "test@theater.com";
        var organizationName = "Test Theater";
        var orderNumber = "CG-TEST-001";
        var orderDescription = "Test Order";
        var previousStage = "Stage A";
        var newStage = "Stage B";
        var currentShipDate = DateTime.Now.AddDays(30);

        // Act
        var result = await badEmailService.SendOrderStageUpdateEmailAsync(
            email, organizationName, orderNumber, orderDescription,
            previousStage, newStage, currentShipDate);

        // Assert
        Assert.False(result);
    }
}