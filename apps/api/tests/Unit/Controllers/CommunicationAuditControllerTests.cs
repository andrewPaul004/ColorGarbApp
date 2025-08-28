using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using Microsoft.AspNetCore.Http;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for CommunicationAuditController to verify API endpoint operations and authorization.
/// </summary>
public class CommunicationAuditControllerTests
{
    private readonly Mock<ICommunicationAuditService> _mockAuditService;
    private readonly Mock<ILogger<CommunicationAuditController>> _mockLogger;
    private readonly CommunicationAuditController _controller;
    private readonly ClaimsPrincipal _staffUser;
    private readonly ClaimsPrincipal _regularUser;

    public CommunicationAuditControllerTests()
    {
        _mockAuditService = new Mock<ICommunicationAuditService>();
        _mockLogger = new Mock<ILogger<CommunicationAuditController>>();
        _controller = new CommunicationAuditController(_mockAuditService.Object, _mockLogger.Object);

        // Setup staff user claims
        _staffUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "ColorGarbStaff"),
            new Claim("organization_id", Guid.NewGuid().ToString())
        }, "mock"));

        // Setup regular user claims
        _regularUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "Director"),
            new Claim("organization_id", Guid.NewGuid().ToString())
        }, "mock"));

        // Setup HTTP context
        var httpContext = new DefaultHttpContext();
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    /// <summary>
    /// Test retrieving communication logs with valid staff user permissions
    /// </summary>
    [Fact]
    public async Task GetCommunicationLogs_StaffUser_ReturnsResults()
    {
        // Arrange
        var request = new CommunicationAuditSearchRequest
        {
            Page = 1,
            PageSize = 20
        };

        var mockResult = new CommunicationAuditResult
        {
            Logs = new List<CommunicationLog>
            {
                new CommunicationLog
                {
                    Id = Guid.NewGuid(),
                    CommunicationType = "Email",
                    Subject = "Test Email",
                    DeliveryStatus = "Sent"
                }
            },
            TotalCount = 1,
            Page = 1,
            PageSize = 20
        };

        _controller.ControllerContext.HttpContext.User = _staffUser;
        _mockAuditService.Setup(s => s.ValidateAuditAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(true);
        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ReturnsAsync(mockResult);

        // Act
        var result = await _controller.GetCommunicationLogs(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var auditResult = Assert.IsType<CommunicationAuditResult>(okResult.Value);
        Assert.Single(auditResult.Logs);
        Assert.Equal("Email", auditResult.Logs.First().CommunicationType);
    }

    /// <summary>
    /// Test retrieving communication logs with unauthorized user returns Forbid
    /// </summary>
    [Fact]
    public async Task GetCommunicationLogs_UnauthorizedUser_ReturnsForbid()
    {
        // Arrange
        var request = new CommunicationAuditSearchRequest
        {
            Page = 1,
            PageSize = 20
        };

        _controller.ControllerContext.HttpContext.User = _regularUser;
        _mockAuditService.Setup(s => s.ValidateAuditAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.GetCommunicationLogs(request);

        // Assert
        Assert.IsType<ForbidResult>(result.Result);
    }

    /// <summary>
    /// Test retrieving order communication history with valid access
    /// </summary>
    [Fact]
    public async Task GetOrderCommunicationHistory_ValidAccess_ReturnsHistory()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var mockHistory = new List<CommunicationLog>
        {
            new CommunicationLog
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                CommunicationType = "Email",
                Subject = "Order Update",
                DeliveryStatus = "Delivered"
            }
        };

        _controller.ControllerContext.HttpContext.User = _staffUser;
        _mockAuditService.Setup(s => s.GetOrderCommunicationHistoryAsync(orderId, It.IsAny<Guid?>()))
            .ReturnsAsync(mockHistory);

        // Act
        var result = await _controller.GetOrderCommunicationHistory(orderId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<CommunicationLog>>(okResult.Value);
        Assert.Single(history);
        Assert.Equal("Email", history.First().CommunicationType);
    }

    /// <summary>
    /// Test retrieving order communication history with unauthorized access returns Forbid
    /// </summary>
    [Fact]
    public async Task GetOrderCommunicationHistory_UnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        var orderId = Guid.NewGuid();

        _controller.ControllerContext.HttpContext.User = _regularUser;
        _mockAuditService.Setup(s => s.GetOrderCommunicationHistoryAsync(orderId, It.IsAny<Guid?>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        // Act
        var result = await _controller.GetOrderCommunicationHistory(orderId);

        // Assert
        Assert.IsType<ForbidResult>(result.Result);
    }

    /// <summary>
    /// Test retrieving delivery status summary with valid parameters
    /// </summary>
    [Fact]
    public async Task GetDeliveryStatusSummary_ValidParameters_ReturnsSummary()
    {
        // Arrange
        var organizationId = Guid.NewGuid();
        var from = DateTimeOffset.UtcNow.AddDays(-7);
        var to = DateTimeOffset.UtcNow;

        var mockSummary = new DeliveryStatusSummary
        {
            OrganizationId = organizationId,
            From = from,
            To = to,
            TotalCommunications = 10,
            StatusCounts = new Dictionary<string, int> { { "Delivered", 8 }, { "Failed", 2 } }
        };

        _controller.ControllerContext.HttpContext.User = _staffUser;
        _mockAuditService.Setup(s => s.ValidateAuditAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(true);
        _mockAuditService.Setup(s => s.GetDeliveryStatusSummaryAsync(organizationId, from, to))
            .ReturnsAsync(mockSummary);

        // Act
        var result = await _controller.GetDeliveryStatusSummary(organizationId, from, to);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var summary = Assert.IsType<DeliveryStatusSummary>(okResult.Value);
        Assert.Equal(10, summary.TotalCommunications);
        Assert.Equal(8, summary.StatusCounts["Delivered"]);
    }

    /// <summary>
    /// Test retrieving delivery status summary with invalid date range returns BadRequest
    /// </summary>
    [Fact]
    public async Task GetDeliveryStatusSummary_InvalidDateRange_ReturnsBadRequest()
    {
        // Arrange
        var organizationId = Guid.NewGuid();
        var from = DateTimeOffset.UtcNow;
        var to = DateTimeOffset.UtcNow.AddDays(-7); // Invalid: to is before from

        _controller.ControllerContext.HttpContext.User = _staffUser;

        // Act
        var result = await _controller.GetDeliveryStatusSummary(organizationId, from, to);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    /// <summary>
    /// Test retrieving message edit history returns correct data
    /// </summary>
    [Fact]
    public async Task GetMessageEditHistory_ValidMessageId_ReturnsHistory()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var mockEditHistory = new List<MessageEdit>
        {
            new MessageEdit
            {
                Id = Guid.NewGuid(),
                EditedAt = DateTime.UtcNow.AddHours(-1),
                PreviousContent = "Original content",
                ChangeReason = "Fixed typo"
            }
        };

        _controller.ControllerContext.HttpContext.User = _staffUser;
        _mockAuditService.Setup(s => s.GetMessageEditHistoryAsync(messageId))
            .ReturnsAsync(mockEditHistory);

        // Act
        var result = await _controller.GetMessageEditHistory(messageId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var editHistory = Assert.IsType<List<MessageEdit>>(okResult.Value);
        Assert.Single(editHistory);
        Assert.Equal("Fixed typo", editHistory.First().ChangeReason);
    }

    /// <summary>
    /// Test processing SendGrid webhook events successfully
    /// </summary>
    [Fact]
    public async Task ProcessSendGridWebhook_ValidEvents_ReturnsNoContent()
    {
        // Arrange
        var events = new[]
        {
            new SendGridEvent
            {
                Event = "delivered",
                SgMessageId = "sendgrid-12345",
                Email = "test@example.com",
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };

        _mockAuditService.Setup(s => s.UpdateDeliveryStatusAsync(
            "sendgrid-12345", "Delivered", It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var result = await _controller.ProcessSendGridWebhook(events);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _mockAuditService.Verify(s => s.UpdateDeliveryStatusAsync(
            "sendgrid-12345", "Delivered", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    /// <summary>
    /// Test processing SendGrid webhook with missing message ID skips event
    /// </summary>
    [Fact]
    public async Task ProcessSendGridWebhook_MissingMessageId_SkipsEvent()
    {
        // Arrange
        var events = new[]
        {
            new SendGridEvent
            {
                Event = "delivered",
                SgMessageId = "", // Missing message ID
                Email = "test@example.com"
            }
        };

        // Act
        var result = await _controller.ProcessSendGridWebhook(events);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _mockAuditService.Verify(s => s.UpdateDeliveryStatusAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    /// <summary>
    /// Test processing Twilio webhook events successfully
    /// </summary>
    [Fact]
    public async Task ProcessTwilioWebhook_ValidRequest_ReturnsNoContent()
    {
        // Arrange
        var request = new TwilioWebhookRequest
        {
            MessageSid = "SM12345",
            MessageStatus = "delivered",
            To = "+1234567890",
            From = "+0987654321"
        };

        _mockAuditService.Setup(s => s.UpdateDeliveryStatusAsync(
            "SM12345", "Delivered", It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new NotificationDeliveryLog());

        // Act
        var result = await _controller.ProcessTwilioWebhook(request);

        // Assert
        Assert.IsType<NoContentResult>(result);
        _mockAuditService.Verify(s => s.UpdateDeliveryStatusAsync(
            "SM12345", "Delivered", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    /// <summary>
    /// Test processing Twilio webhook with missing MessageSid returns BadRequest
    /// </summary>
    [Fact]
    public async Task ProcessTwilioWebhook_MissingMessageSid_ReturnsBadRequest()
    {
        // Arrange
        var request = new TwilioWebhookRequest
        {
            MessageSid = "", // Missing MessageSid
            MessageStatus = "delivered"
        };

        // Act
        var result = await _controller.ProcessTwilioWebhook(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    /// <summary>
    /// Test service exception handling returns BadRequest
    /// </summary>
    [Fact]
    public async Task GetCommunicationLogs_ServiceException_ReturnsBadRequest()
    {
        // Arrange
        var request = new CommunicationAuditSearchRequest();

        _controller.ControllerContext.HttpContext.User = _staffUser;
        _mockAuditService.Setup(s => s.ValidateAuditAccessAsync(It.IsAny<Guid>(), It.IsAny<Guid?>()))
            .ReturnsAsync(true);
        _mockAuditService.Setup(s => s.SearchCommunicationLogsAsync(It.IsAny<CommunicationAuditSearchRequest>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _controller.GetCommunicationLogs(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}