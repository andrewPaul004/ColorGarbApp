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
/// Unit tests for CommunicationAuditRepository to verify data access operations and search functionality.
/// </summary>
public class CommunicationAuditRepositoryTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly CommunicationAuditRepository _repository;
    private readonly Mock<ILogger<CommunicationAuditRepository>> _mockLogger;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly User _testRecipient;
    private readonly Order _testOrder;

    public CommunicationAuditRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new ColorGarbDbContext(options);
        _mockLogger = new Mock<ILogger<CommunicationAuditRepository>>();
        _repository = new CommunicationAuditRepository(_context, _mockLogger.Object);

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

        _testRecipient = new User
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
        _context.Users.AddRange(_testUser, _testRecipient);
        _context.Orders.Add(_testOrder);
        _context.SaveChanges();
    }

    /// <summary>
    /// Test creating a communication log with valid properties
    /// </summary>
    [Fact]
    public async Task CreateCommunicationLogAsync_ValidLog_CreatesSuccessfully()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientId = _testRecipient.Id,
            RecipientEmail = "staff@colorgarb.com",
            Subject = "Test Email Subject",
            Content = "Test email content for audit trail",
            TemplateUsed = "order-update-template",
            DeliveryStatus = "Sent",
            ExternalMessageId = "sendgrid-12345",
            SentAt = DateTime.UtcNow
        };

        // Act
        var result = await _repository.CreateCommunicationLogAsync(communicationLog);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(_testOrder.Id, result.OrderId);
        Assert.Equal("Email", result.CommunicationType);
        Assert.Equal(_testUser.Id, result.SenderId);
        Assert.Equal("staff@colorgarb.com", result.RecipientEmail);
        Assert.Equal("Test Email Subject", result.Subject);
        Assert.Equal("sendgrid-12345", result.ExternalMessageId);
        Assert.True(result.CreatedAt > DateTime.MinValue);

        // Verify it was saved to the database
        var savedLog = await _context.CommunicationLogs.FindAsync(result.Id);
        Assert.NotNull(savedLog);
        Assert.Equal("Test email content for audit trail", savedLog.Content);
    }

    /// <summary>
    /// Test creating and updating a notification delivery log
    /// </summary>
    [Fact]
    public async Task CreateAndUpdateDeliveryLogAsync_ValidOperations_WorkCorrectly()
    {
        // Arrange - Create communication log first
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            RecipientPhone = "+15551234567",
            Content = "SMS with delivery tracking",
            DeliveryStatus = "Sent",
            ExternalMessageId = "twilio-abc123",
            SentAt = DateTime.UtcNow
        };

        await _repository.CreateCommunicationLogAsync(communicationLog);

        var deliveryLog = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "Twilio",
            ExternalId = "twilio-abc123",
            Status = "Queued",
            UpdatedAt = DateTime.UtcNow
        };

        // Act - Create delivery log
        var createdLog = await _repository.CreateDeliveryLogAsync(deliveryLog);

        // Assert - Creation
        Assert.NotNull(createdLog);
        Assert.NotEqual(Guid.Empty, createdLog.Id);
        Assert.Equal(communicationLog.Id, createdLog.CommunicationLogId);
        Assert.Equal("Twilio", createdLog.DeliveryProvider);
        Assert.Equal("Queued", createdLog.Status);

        // Act - Update delivery log
        createdLog.Status = "Delivered";
        createdLog.StatusDetails = "Message delivered successfully";
        createdLog.UpdatedAt = DateTime.UtcNow;

        var updatedLog = await _repository.UpdateDeliveryLogAsync(createdLog);

        // Assert - Update
        Assert.Equal("Delivered", updatedLog.Status);
        Assert.Equal("Message delivered successfully", updatedLog.StatusDetails);

        // Verify in database
        var savedLog = await _context.NotificationDeliveryLogs.FindAsync(updatedLog.Id);
        Assert.NotNull(savedLog);
        Assert.Equal("Delivered", savedLog.Status);
    }

    /// <summary>
    /// Test searching communication logs with various filters
    /// </summary>
    [Fact]
    public async Task SearchCommunicationLogsAsync_WithFilters_ReturnsCorrectResults()
    {
        // Arrange - Create multiple communication logs
        var emailLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientEmail = "client@example.com",
            Subject = "Order Update",
            Content = "Your order has been updated",
            DeliveryStatus = "Delivered",
            SentAt = DateTime.UtcNow.AddHours(-2)
        };

        var smsLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            RecipientPhone = "+15551234567",
            Content = "SMS notification about order",
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow.AddHours(-1)
        };

        await _repository.CreateCommunicationLogAsync(emailLog);
        await _repository.CreateCommunicationLogAsync(smsLog);

        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrderId = _testOrder.Id,
            CommunicationType = new[] { "Email" },
            SearchTerm = "order",
            Page = 1,
            PageSize = 10
        };

        // Act
        var results = await _repository.SearchCommunicationLogsAsync(searchRequest);

        // Assert
        var resultsList = results.ToList();
        Assert.Single(resultsList);
        Assert.Equal("Email", resultsList.First().CommunicationType);
        Assert.Contains("order", resultsList.First().Content.ToLower());
    }

    /// <summary>
    /// Test getting communication count with search criteria
    /// </summary>
    [Fact]
    public async Task GetCommunicationCountAsync_WithSearchCriteria_ReturnsCorrectCount()
    {
        // Arrange - Create multiple communication logs with different types
        var communications = new List<CommunicationLog>
        {
            new() {
                OrderId = _testOrder.Id,
                CommunicationType = "Email",
                SenderId = _testUser.Id,
                Content = "Email content 1",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow
            },
            new() {
                OrderId = _testOrder.Id,
                CommunicationType = "Email",
                SenderId = _testUser.Id,
                Content = "Email content 2",
                DeliveryStatus = "Delivered",
                SentAt = DateTime.UtcNow
            },
            new() {
                OrderId = _testOrder.Id,
                CommunicationType = "SMS",
                SenderId = _testUser.Id,
                Content = "SMS content",
                DeliveryStatus = "Sent",
                SentAt = DateTime.UtcNow
            }
        };

        foreach (var comm in communications)
        {
            await _repository.CreateCommunicationLogAsync(comm);
        }

        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrderId = _testOrder.Id,
            CommunicationType = new[] { "Email" }
        };

        // Act
        var count = await _repository.GetCommunicationCountAsync(searchRequest);

        // Assert
        Assert.Equal(2, count);
    }

    /// <summary>
    /// Test retrieving order communication history
    /// </summary>
    [Fact]
    public async Task GetOrderCommunicationHistoryAsync_ValidOrder_ReturnsOrderedHistory()
    {
        // Arrange - Create communications at different times
        var firstComm = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "First communication",
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow.AddHours(-3)
        };

        var secondComm = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            Content = "Second communication",
            DeliveryStatus = "Delivered",
            SentAt = DateTime.UtcNow.AddHours(-1)
        };

        await _repository.CreateCommunicationLogAsync(firstComm);
        await _repository.CreateCommunicationLogAsync(secondComm);

        // Act
        var history = await _repository.GetOrderCommunicationHistoryAsync(_testOrder.Id);

        // Assert
        var historyList = history.ToList();
        Assert.Equal(2, historyList.Count);
        
        // Should be ordered by SentAt descending (most recent first)
        Assert.Equal("Second communication", historyList.First().Content);
        Assert.Equal("First communication", historyList.Last().Content);
    }

    /// <summary>
    /// Test retrieving communication log by external ID
    /// </summary>
    [Fact]
    public async Task GetCommunicationLogByExternalIdAsync_ValidExternalId_ReturnsCorrectLog()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "Email with external ID",
            DeliveryStatus = "Sent",
            ExternalMessageId = "sendgrid-unique-123",
            SentAt = DateTime.UtcNow
        };

        await _repository.CreateCommunicationLogAsync(communicationLog);

        // Act
        var result = await _repository.GetCommunicationLogByExternalIdAsync("sendgrid-unique-123");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("sendgrid-unique-123", result.ExternalMessageId);
        Assert.Equal("Email with external ID", result.Content);
    }

    /// <summary>
    /// Test creating and retrieving message audit trail
    /// </summary>
    [Fact]
    public async Task MessageAuditTrail_CreateAndRetrieve_WorksCorrectly()
    {
        // Arrange - Create a test message first
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Test message for audit trail"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var auditTrail = new MessageAuditTrail
        {
            MessageId = message.Id,
            IpAddress = "192.168.1.100",
            UserAgent = "Mozilla/5.0 Test Browser",
            CreatedAt = DateTime.UtcNow
        };

        // Act - Create audit trail
        var createdTrail = await _repository.CreateMessageAuditTrailAsync(auditTrail);

        // Assert - Creation
        Assert.NotNull(createdTrail);
        Assert.Equal(message.Id, createdTrail.MessageId);
        Assert.Equal("192.168.1.100", createdTrail.IpAddress);

        // Act - Retrieve audit trail
        var retrievedTrail = await _repository.GetMessageAuditTrailAsync(message.Id);

        // Assert - Retrieval
        Assert.NotNull(retrievedTrail);
        Assert.Equal(createdTrail.Id, retrievedTrail.Id);
        Assert.NotNull(retrievedTrail.Message);
        Assert.Equal("Test message for audit trail", retrievedTrail.Message.Content);
    }

    /// <summary>
    /// Test creating and retrieving message edit history
    /// </summary>
    [Fact]
    public async Task MessageEdit_CreateAndGetHistory_WorksCorrectly()
    {
        // Arrange - Create message and audit trail
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Original message content"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var auditTrail = new MessageAuditTrail
        {
            MessageId = message.Id,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.CreateMessageAuditTrailAsync(auditTrail);

        // Create multiple edits
        var edit1 = new MessageEdit
        {
            MessageAuditTrailId = auditTrail.Id,
            EditedAt = DateTime.UtcNow.AddMinutes(-10),
            EditedBy = _testUser.Id,
            PreviousContent = "Original content",
            ChangeReason = "Fixed typo"
        };

        var edit2 = new MessageEdit
        {
            MessageAuditTrailId = auditTrail.Id,
            EditedAt = DateTime.UtcNow.AddMinutes(-5),
            EditedBy = _testUser.Id,
            PreviousContent = "First edited content",
            ChangeReason = "Added more details"
        };

        // Act - Create edits
        await _repository.CreateMessageEditAsync(edit1);
        await _repository.CreateMessageEditAsync(edit2);

        // Retrieve edit history
        var editHistory = await _repository.GetMessageEditHistoryAsync(message.Id);

        // Assert
        var historyList = editHistory.ToList();
        Assert.Equal(2, historyList.Count);

        // Should be ordered by EditedAt ascending (chronological order)
        Assert.Equal("Original content", historyList.First().PreviousContent);
        Assert.Equal("Fixed typo", historyList.First().ChangeReason);
        Assert.Equal("First edited content", historyList.Last().PreviousContent);
        Assert.Equal("Added more details", historyList.Last().ChangeReason);

        // Verify navigation properties are loaded
        Assert.NotNull(historyList.First().Editor);
        Assert.Equal(_testUser.Name, historyList.First().Editor.Name);
    }

    /// <summary>
    /// Test search functionality with date range filtering
    /// </summary>
    [Fact]
    public async Task SearchCommunicationLogsAsync_WithDateRange_FiltersCorrectly()
    {
        // Arrange - Create communications with different dates
        var oldComm = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "Old communication",
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow.AddDays(-7)
        };

        var recentComm = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            Content = "Recent communication",
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow.AddHours(-1)
        };

        await _repository.CreateCommunicationLogAsync(oldComm);
        await _repository.CreateCommunicationLogAsync(recentComm);

        var searchRequest = new CommunicationAuditSearchRequest
        {
            OrderId = _testOrder.Id,
            DateFrom = DateTime.UtcNow.AddDays(-2),
            DateTo = DateTime.UtcNow.AddDays(1)
        };

        // Act
        var results = await _repository.SearchCommunicationLogsAsync(searchRequest);

        // Assert
        var resultsList = results.ToList();
        Assert.Single(resultsList);
        Assert.Equal("Recent communication", resultsList.First().Content);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}