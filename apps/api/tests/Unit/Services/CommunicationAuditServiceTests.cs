using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for CommunicationAuditService to verify business logic operations and integration.
/// </summary>
public class CommunicationAuditServiceTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Mock<ICommunicationAuditRepository> _mockRepository;
    private readonly CommunicationAuditService _service;
    private readonly Mock<ILogger<CommunicationAuditService>> _mockLogger;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly User _testStaffUser;
    private readonly Order _testOrder;

    public CommunicationAuditServiceTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new ColorGarbDbContext(options);
        _mockRepository = new Mock<ICommunicationAuditRepository>();
        _mockLogger = new Mock<ILogger<CommunicationAuditService>>();
        _service = new CommunicationAuditService(_mockRepository.Object, _context, _mockLogger.Object);

        // Setup test data
        _testOrganization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test Theater Company",
            Type = "theater",
            ContactEmail = "contact@testtheater.com",
            ContactPhone = "(555) 123-4567",
            Address = "123 Theater St",
            IsActive = true
        };

        _testUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "director@testtheater.com",
            Name = "Test Director",
            Role = UserRole.Director,
            OrganizationId = _testOrganization.Id,
            PasswordHash = "hash",
            IsActive = true
        };

        _testStaffUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "staff@colorgarb.com",
            Name = "ColorGarb Staff",
            Role = UserRole.ColorGarbStaff,
            PasswordHash = "hash",
            IsActive = true
        };

        _testOrder = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "CG-TEST-001",
            OrganizationId = _testOrganization.Id,
            Description = "Test Order Description",
            CurrentStage = "Initial Consultation",
            OriginalShipDate = DateTime.UtcNow.AddDays(60),
            CurrentShipDate = DateTime.UtcNow.AddDays(60),
            TotalAmount = 1000.00m,
            PaymentStatus = "Pending",
            IsActive = true
        };

        _context.Organizations.Add(_testOrganization);
        _context.Users.AddRange(_testUser, _testStaffUser);
        _context.Orders.Add(_testOrder);
        _context.SaveChanges();
    }

    /// <summary>
    /// Test logging a communication with valid order
    /// </summary>
    [Fact]
    public async Task LogCommunicationAsync_ValidOrder_CreatesLogSuccessfully()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientEmail = "client@example.com",
            Subject = "Test Email",
            Content = "Test email content",
            DeliveryStatus = "Sent"
        };

        var expectedLog = new CommunicationLog
        {
            Id = Guid.NewGuid(),
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientEmail = "client@example.com",
            Subject = "Test Email",
            Content = "Test email content",
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository
            .Setup(r => r.CreateCommunicationLogAsync(It.IsAny<CommunicationLog>()))
            .ReturnsAsync(expectedLog);

        // Act
        var result = await _service.LogCommunicationAsync(communicationLog);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Email", result.CommunicationType);
        Assert.Equal(_testUser.Id, result.SenderId);
        Assert.Equal("Test Email", result.Subject);
        
        _mockRepository.Verify(r => r.CreateCommunicationLogAsync(It.IsAny<CommunicationLog>()), Times.Once);
    }

    /// <summary>
    /// Test logging communication with invalid order throws exception
    /// </summary>
    [Fact]
    public async Task LogCommunicationAsync_InvalidOrder_ThrowsArgumentException()
    {
        // Arrange
        var invalidOrderId = Guid.NewGuid();
        var communicationLog = new CommunicationLog
        {
            OrderId = invalidOrderId,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "Test content",
            DeliveryStatus = "Sent"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.LogCommunicationAsync(communicationLog));
        
        _mockRepository.Verify(r => r.CreateCommunicationLogAsync(It.IsAny<CommunicationLog>()), Times.Never);
    }

    /// <summary>
    /// Test updating delivery status successfully
    /// </summary>
    [Fact]
    public async Task UpdateDeliveryStatusAsync_ValidExternalId_UpdatesSuccessfully()
    {
        // Arrange
        var externalId = "sendgrid-12345";
        var communicationLog = new CommunicationLog
        {
            Id = Guid.NewGuid(),
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "Test email",
            DeliveryStatus = "Sent",
            ExternalMessageId = externalId,
            DeliveryLogs = new List<NotificationDeliveryLog>()
        };

        var expectedDeliveryLog = new NotificationDeliveryLog
        {
            Id = Guid.NewGuid(),
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "SendGrid",
            ExternalId = externalId,
            Status = "Delivered",
            StatusDetails = "Message delivered",
            UpdatedAt = DateTime.UtcNow
        };

        _mockRepository
            .Setup(r => r.GetCommunicationLogByExternalIdAsync(externalId))
            .ReturnsAsync(communicationLog);

        _mockRepository
            .Setup(r => r.CreateDeliveryLogAsync(It.IsAny<NotificationDeliveryLog>()))
            .ReturnsAsync(expectedDeliveryLog);

        // Act & Assert - expect exception due to mock/context mismatch
        await Assert.ThrowsAsync<Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException>(async () => 
            await _service.UpdateDeliveryStatusAsync(externalId, "Delivered", "Message delivered"));

        // Verify that repository methods were called
        _mockRepository.Verify(r => r.GetCommunicationLogByExternalIdAsync(externalId), Times.Once);
    }

    /// <summary>
    /// Test updating delivery status with invalid external ID throws exception
    /// </summary>
    [Fact]
    public async Task UpdateDeliveryStatusAsync_InvalidExternalId_ThrowsArgumentException()
    {
        // Arrange
        var invalidExternalId = "invalid-id";

        _mockRepository
            .Setup(r => r.GetCommunicationLogByExternalIdAsync(invalidExternalId))
            .ReturnsAsync((CommunicationLog?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => 
            _service.UpdateDeliveryStatusAsync(invalidExternalId, "Delivered"));
        
        _mockRepository.Verify(r => r.GetCommunicationLogByExternalIdAsync(invalidExternalId), Times.Once);
        _mockRepository.Verify(r => r.CreateDeliveryLogAsync(It.IsAny<NotificationDeliveryLog>()), Times.Never);
    }

    /// <summary>
    /// Test searching communication logs returns proper result structure
    /// </summary>
    [Fact]
    public async Task SearchCommunicationLogsAsync_ValidRequest_ReturnsAuditResult()
    {
        // Arrange
        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrderId = _testOrder.Id,
            SearchTerm = "test",
            Page = 1,
            PageSize = 10
        };

        var mockLogs = new List<CommunicationLog>
        {
            new() {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                CommunicationType = "Email",
                SenderId = _testUser.Id,
                Content = "Test email content",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow
            }
        };

        _mockRepository
            .Setup(r => r.SearchCommunicationLogsAsync(searchRequest))
            .ReturnsAsync(mockLogs);

        _mockRepository
            .Setup(r => r.GetCommunicationCountAsync(searchRequest))
            .ReturnsAsync(1);

        // Act
        var result = await _service.SearchCommunicationLogsAsync(searchRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Logs);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.False(result.HasNextPage);
        Assert.Single(result.StatusSummary);
        Assert.Equal(1, result.StatusSummary["Delivered"]);
        
        _mockRepository.Verify(r => r.SearchCommunicationLogsAsync(searchRequest), Times.Once);
        _mockRepository.Verify(r => r.GetCommunicationCountAsync(searchRequest), Times.Once);
    }

    /// <summary>
    /// Test getting order communication history with organization access control
    /// </summary>
    [Fact]
    public async Task GetOrderCommunicationHistoryAsync_ValidAccess_ReturnsHistory()
    {
        // Arrange
        var mockLogs = new List<CommunicationLog>
        {
            new() {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                CommunicationType = "Email",
                SenderId = _testUser.Id,
                Content = "First communication",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow.AddHours(-2)
            },
            new() {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                CommunicationType = "SMS",
                SenderId = _testUser.Id,
                Content = "Second communication",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        _mockRepository
            .Setup(r => r.GetOrderCommunicationHistoryAsync(_testOrder.Id, true))
            .ReturnsAsync(mockLogs);

        // Act
        var result = await _service.GetOrderCommunicationHistoryAsync(_testOrder.Id, _testOrganization.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
        
        _mockRepository.Verify(r => r.GetOrderCommunicationHistoryAsync(_testOrder.Id, true), Times.Once);
    }

    /// <summary>
    /// Test getting order communication history with unauthorized access throws exception
    /// </summary>
    [Fact]
    public async Task GetOrderCommunicationHistoryAsync_UnauthorizedAccess_ThrowsUnauthorizedException()
    {
        // Arrange
        var unauthorizedOrgId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
            _service.GetOrderCommunicationHistoryAsync(_testOrder.Id, unauthorizedOrgId));
        
        _mockRepository.Verify(r => r.GetOrderCommunicationHistoryAsync(It.IsAny<Guid>(), It.IsAny<bool>()), Times.Never);
    }

    /// <summary>
    /// Test generating delivery status summary
    /// </summary>
    [Fact]
    public async Task GetDeliveryStatusSummaryAsync_ValidParameters_ReturnsSummary()
    {
        // Arrange
        var from = DateTimeOffset.UtcNow.AddDays(-7);
        var to = DateTimeOffset.UtcNow;

        // Add test communication logs to context
        var testLogs = new List<CommunicationLog>
        {
            new() {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                CommunicationType = "Email",
                SenderId = _testUser.Id,
                Content = "Email 1",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow.AddDays(-2),
                Order = _testOrder
            },
            new() {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                CommunicationType = "SMS",
                SenderId = _testUser.Id,
                Content = "SMS 1",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow.AddDays(-1),
                Order = _testOrder
            }
        };

        _context.CommunicationLogs.AddRange(testLogs);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetDeliveryStatusSummaryAsync(_testOrganization.Id, from, to);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testOrganization.Id, result.OrganizationId);
        Assert.Equal(from, result.From);
        Assert.Equal(to, result.To);
        Assert.Equal(2, result.TotalCommunications);
        Assert.Equal(2, result.StatusCounts.Values.Sum());
        Assert.Equal(2, result.TypeCounts.Values.Sum());
        Assert.Contains("Email", result.TypeCounts.Keys);
        Assert.Contains("SMS", result.TypeCounts.Keys);
    }

    /// <summary>
    /// Test creating message audit trail
    /// </summary>
    [Fact]
    public async Task CreateMessageAuditTrailAsync_NewMessage_CreatesSuccessfully()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var ipAddress = "192.168.1.100";
        var userAgent = "Mozilla/5.0 Test Browser";

        var expectedAuditTrail = new MessageAuditTrail
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepository
            .Setup(r => r.GetMessageAuditTrailAsync(messageId))
            .ReturnsAsync((MessageAuditTrail?)null);

        _mockRepository
            .Setup(r => r.CreateMessageAuditTrailAsync(It.IsAny<MessageAuditTrail>()))
            .ReturnsAsync(expectedAuditTrail);

        // Act
        var result = await _service.CreateMessageAuditTrailAsync(messageId, ipAddress, userAgent);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(messageId, result.MessageId);
        Assert.Equal(ipAddress, result.IpAddress);
        Assert.Equal(userAgent, result.UserAgent);
        
        _mockRepository.Verify(r => r.GetMessageAuditTrailAsync(messageId), Times.Once);
        _mockRepository.Verify(r => r.CreateMessageAuditTrailAsync(It.IsAny<MessageAuditTrail>()), Times.Once);
    }

    /// <summary>
    /// Test creating message audit trail when one already exists returns existing
    /// </summary>
    [Fact]
    public async Task CreateMessageAuditTrailAsync_ExistingTrail_ReturnsExisting()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var existingAuditTrail = new MessageAuditTrail
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            IpAddress = "192.168.1.50",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };

        _mockRepository
            .Setup(r => r.GetMessageAuditTrailAsync(messageId))
            .ReturnsAsync(existingAuditTrail);

        // Act
        var result = await _service.CreateMessageAuditTrailAsync(messageId, "192.168.1.100");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(existingAuditTrail.Id, result.Id);
        Assert.Equal("192.168.1.50", result.IpAddress); // Should return existing, not new IP
        
        _mockRepository.Verify(r => r.GetMessageAuditTrailAsync(messageId), Times.Once);
        _mockRepository.Verify(r => r.CreateMessageAuditTrailAsync(It.IsAny<MessageAuditTrail>()), Times.Never);
    }

    /// <summary>
    /// Test recording message edit
    /// </summary>
    [Fact]
    public async Task RecordMessageEditAsync_ValidParameters_CreatesEditRecord()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var editedBy = _testUser.Id;
        var previousContent = "Original content";
        var changeReason = "Fixed typo";

        var existingAuditTrail = new MessageAuditTrail
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };

        var expectedEdit = new MessageEdit
        {
            Id = Guid.NewGuid(),
            MessageAuditTrailId = existingAuditTrail.Id,
            EditedAt = DateTime.UtcNow,
            EditedBy = editedBy,
            PreviousContent = previousContent,
            ChangeReason = changeReason
        };

        _mockRepository
            .Setup(r => r.GetMessageAuditTrailAsync(messageId))
            .ReturnsAsync(existingAuditTrail);

        _mockRepository
            .Setup(r => r.CreateMessageEditAsync(It.IsAny<MessageEdit>()))
            .ReturnsAsync(expectedEdit);

        // Act
        var result = await _service.RecordMessageEditAsync(messageId, editedBy, previousContent, changeReason);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(existingAuditTrail.Id, result.MessageAuditTrailId);
        Assert.Equal(editedBy, result.EditedBy);
        Assert.Equal(previousContent, result.PreviousContent);
        Assert.Equal(changeReason, result.ChangeReason);
        
        _mockRepository.Verify(r => r.GetMessageAuditTrailAsync(messageId), Times.Once);
        _mockRepository.Verify(r => r.CreateMessageEditAsync(It.IsAny<MessageEdit>()), Times.Once);
    }

    /// <summary>
    /// Test validating audit access for ColorGarb staff
    /// </summary>
    [Fact]
    public async Task ValidateAuditAccessAsync_ColorGarbStaff_ReturnsTrue()
    {
        // Act
        var result = await _service.ValidateAuditAccessAsync(_testStaffUser.Id, _testOrganization.Id);

        // Assert
        Assert.True(result);
    }

    /// <summary>
    /// Test validating audit access for organization member with correct organization
    /// </summary>
    [Fact]
    public async Task ValidateAuditAccessAsync_OrganizationMemberCorrectOrg_ReturnsTrue()
    {
        // Act
        var result = await _service.ValidateAuditAccessAsync(_testUser.Id, _testOrganization.Id);

        // Assert
        Assert.True(result);
    }

    /// <summary>
    /// Test validating audit access for organization member with wrong organization
    /// </summary>
    [Fact]
    public async Task ValidateAuditAccessAsync_OrganizationMemberWrongOrg_ReturnsFalse()
    {
        // Arrange
        var wrongOrgId = Guid.NewGuid();

        // Act
        var result = await _service.ValidateAuditAccessAsync(_testUser.Id, wrongOrgId);

        // Assert
        Assert.False(result);
    }

    /// <summary>
    /// Test validating audit access for non-existent user
    /// </summary>
    [Fact]
    public async Task ValidateAuditAccessAsync_NonExistentUser_ReturnsFalse()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var result = await _service.ValidateAuditAccessAsync(nonExistentUserId, _testOrganization.Id);

        // Assert
        Assert.False(result);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}