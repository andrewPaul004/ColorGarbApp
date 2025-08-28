using Microsoft.EntityFrameworkCore;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Entities;

/// <summary>
/// Unit tests for communication audit trail entities to verify relationships and constraints.
/// Tests CommunicationLog, NotificationDeliveryLog, MessageAuditTrail, and MessageEdit entities.
/// </summary>
public class CommunicationAuditTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly User _testRecipient;
    private readonly Order _testOrder;
    private readonly Message _testMessage;

    public CommunicationAuditTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new ColorGarbDbContext(options);

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

        _testMessage = new Message
        {
            Id = Guid.NewGuid(),
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Test message for audit trail"
        };

        _context.Organizations.Add(_testOrganization);
        _context.Users.AddRange(_testUser, _testRecipient);
        _context.Orders.Add(_testOrder);
        _context.Messages.Add(_testMessage);
        _context.SaveChanges();
    }

    /// <summary>
    /// Test creating a CommunicationLog with valid properties
    /// </summary>
    [Fact]
    public async Task CreateCommunicationLog_ValidProperties_CreatesSuccessfully()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientId = _testRecipient.Id,
            RecipientEmail = "staff@colorgarb.com",
            Subject = "Order Status Update",
            Content = "Your order has been updated to the next stage.",
            TemplateUsed = "stage-update-template",
            DeliveryStatus = "Sent",
            ExternalMessageId = "sendgrid-12345",
            SentAt = DateTime.UtcNow
        };

        // Act
        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        // Assert
        var savedLog = await _context.CommunicationLogs
            .FirstOrDefaultAsync(c => c.Id == communicationLog.Id);
        
        Assert.NotNull(savedLog);
        Assert.Equal(_testOrder.Id, savedLog.OrderId);
        Assert.Equal("Email", savedLog.CommunicationType);
        Assert.Equal(_testUser.Id, savedLog.SenderId);
        Assert.Equal(_testRecipient.Id, savedLog.RecipientId);
        Assert.Equal("staff@colorgarb.com", savedLog.RecipientEmail);
        Assert.Equal("Order Status Update", savedLog.Subject);
        Assert.Equal("Your order has been updated to the next stage.", savedLog.Content);
        Assert.Equal("stage-update-template", savedLog.TemplateUsed);
        Assert.Equal("Sent", savedLog.DeliveryStatus);
        Assert.Equal("sendgrid-12345", savedLog.ExternalMessageId);
        Assert.True(savedLog.CreatedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test CommunicationLog navigation properties work correctly
    /// </summary>
    [Fact]
    public async Task CommunicationLog_NavigationProperties_LoadCorrectly()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            RecipientId = _testRecipient.Id,
            RecipientPhone = "+15551234567",
            Content = "SMS notification about order update",
            DeliveryStatus = "Delivered",
            SentAt = DateTime.UtcNow
        };

        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        // Act
        var logWithIncludes = await _context.CommunicationLogs
            .Include(c => c.Order)
            .Include(c => c.Sender)
            .Include(c => c.Recipient)
            .FirstOrDefaultAsync(c => c.Id == communicationLog.Id);

        // Assert
        Assert.NotNull(logWithIncludes);
        Assert.NotNull(logWithIncludes.Order);
        Assert.NotNull(logWithIncludes.Sender);
        Assert.NotNull(logWithIncludes.Recipient);
        Assert.Equal(_testOrder.OrderNumber, logWithIncludes.Order.OrderNumber);
        Assert.Equal(_testUser.Email, logWithIncludes.Sender.Email);
        Assert.Equal(_testRecipient.Email, logWithIncludes.Recipient.Email);
    }

    /// <summary>
    /// Test creating a NotificationDeliveryLog with valid properties
    /// </summary>
    [Fact]
    public async Task CreateNotificationDeliveryLog_ValidProperties_CreatesSuccessfully()
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
            DeliveryStatus = "Sent",
            ExternalMessageId = "sendgrid-abc123",
            SentAt = DateTime.UtcNow
        };

        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        var deliveryLog = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "SendGrid",
            ExternalId = "sendgrid-abc123",
            Status = "Delivered",
            StatusDetails = "Message delivered to recipient inbox",
            UpdatedAt = DateTime.UtcNow,
            WebhookData = "{\"event\":\"delivered\",\"timestamp\":\"2025-08-27T20:54:36.000Z\"}"
        };

        // Act
        _context.NotificationDeliveryLogs.Add(deliveryLog);
        await _context.SaveChangesAsync();

        // Assert
        var savedDeliveryLog = await _context.NotificationDeliveryLogs
            .FirstOrDefaultAsync(d => d.Id == deliveryLog.Id);

        Assert.NotNull(savedDeliveryLog);
        Assert.Equal(communicationLog.Id, savedDeliveryLog.CommunicationLogId);
        Assert.Equal("SendGrid", savedDeliveryLog.DeliveryProvider);
        Assert.Equal("sendgrid-abc123", savedDeliveryLog.ExternalId);
        Assert.Equal("Delivered", savedDeliveryLog.Status);
        Assert.Equal("Message delivered to recipient inbox", savedDeliveryLog.StatusDetails);
        Assert.Contains("delivered", savedDeliveryLog.WebhookData);
        Assert.True(savedDeliveryLog.UpdatedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test NotificationDeliveryLog navigation property to CommunicationLog
    /// </summary>
    [Fact]
    public async Task NotificationDeliveryLog_NavigationProperty_LoadsCorrectly()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            RecipientPhone = "+15551234567",
            Content = "SMS with delivery tracking",
            DeliveryStatus = "Sent",
            ExternalMessageId = "twilio-xyz789",
            SentAt = DateTime.UtcNow
        };

        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        var deliveryLog = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "Twilio",
            ExternalId = "twilio-xyz789",
            Status = "Delivered",
            UpdatedAt = DateTime.UtcNow
        };

        _context.NotificationDeliveryLogs.Add(deliveryLog);
        await _context.SaveChangesAsync();

        // Act
        var deliveryLogWithCommunication = await _context.NotificationDeliveryLogs
            .Include(d => d.CommunicationLog)
            .FirstOrDefaultAsync(d => d.Id == deliveryLog.Id);

        var communicationLogWithDeliveries = await _context.CommunicationLogs
            .Include(c => c.DeliveryLogs)
            .FirstOrDefaultAsync(c => c.Id == communicationLog.Id);

        // Assert
        Assert.NotNull(deliveryLogWithCommunication);
        Assert.NotNull(deliveryLogWithCommunication.CommunicationLog);
        Assert.Equal("SMS with delivery tracking", deliveryLogWithCommunication.CommunicationLog.Content);

        Assert.NotNull(communicationLogWithDeliveries);
        Assert.Single(communicationLogWithDeliveries.DeliveryLogs);
        Assert.Equal("Twilio", communicationLogWithDeliveries.DeliveryLogs.First().DeliveryProvider);
    }

    /// <summary>
    /// Test creating a MessageAuditTrail with valid properties
    /// </summary>
    [Fact]
    public async Task CreateMessageAuditTrail_ValidProperties_CreatesSuccessfully()
    {
        // Arrange
        var auditTrail = new MessageAuditTrail
        {
            MessageId = _testMessage.Id,
            IpAddress = "192.168.1.100",
            UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        _context.MessageAuditTrails.Add(auditTrail);
        await _context.SaveChangesAsync();

        // Assert
        var savedAuditTrail = await _context.MessageAuditTrails
            .FirstOrDefaultAsync(a => a.Id == auditTrail.Id);

        Assert.NotNull(savedAuditTrail);
        Assert.Equal(_testMessage.Id, savedAuditTrail.MessageId);
        Assert.Equal("192.168.1.100", savedAuditTrail.IpAddress);
        Assert.Contains("Mozilla/5.0", savedAuditTrail.UserAgent);
        Assert.True(savedAuditTrail.CreatedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test MessageAuditTrail one-to-one relationship with Message
    /// </summary>
    [Fact]
    public async Task MessageAuditTrail_OneToOneRelationship_WorksCorrectly()
    {
        // Arrange
        var auditTrail = new MessageAuditTrail
        {
            MessageId = _testMessage.Id,
            IpAddress = "10.0.0.1",
            UserAgent = "Test User Agent",
            CreatedAt = DateTime.UtcNow
        };

        _context.MessageAuditTrails.Add(auditTrail);
        await _context.SaveChangesAsync();

        // Act
        var messageWithAudit = await _context.Messages
            .Include(m => m.AuditTrail)
            .FirstOrDefaultAsync(m => m.Id == _testMessage.Id);

        var auditWithMessage = await _context.MessageAuditTrails
            .Include(a => a.Message)
            .FirstOrDefaultAsync(a => a.Id == auditTrail.Id);

        // Assert
        Assert.NotNull(messageWithAudit);
        Assert.NotNull(messageWithAudit.AuditTrail);
        Assert.Equal(auditTrail.Id, messageWithAudit.AuditTrail.Id);
        Assert.Equal("10.0.0.1", messageWithAudit.AuditTrail.IpAddress);

        Assert.NotNull(auditWithMessage);
        Assert.NotNull(auditWithMessage.Message);
        Assert.Equal(_testMessage.Content, auditWithMessage.Message.Content);
    }

    /// <summary>
    /// Test creating a MessageEdit with valid properties
    /// </summary>
    [Fact]
    public async Task CreateMessageEdit_ValidProperties_CreatesSuccessfully()
    {
        // Arrange
        var auditTrail = new MessageAuditTrail
        {
            MessageId = _testMessage.Id,
            IpAddress = "172.16.0.1",
            CreatedAt = DateTime.UtcNow
        };

        _context.MessageAuditTrails.Add(auditTrail);
        await _context.SaveChangesAsync();

        var messageEdit = new MessageEdit
        {
            MessageAuditTrailId = auditTrail.Id,
            EditedAt = DateTime.UtcNow,
            EditedBy = _testUser.Id,
            PreviousContent = "Original message content before edit",
            ChangeReason = "Fixed typo in message"
        };

        // Act
        _context.MessageEdits.Add(messageEdit);
        await _context.SaveChangesAsync();

        // Assert
        var savedEdit = await _context.MessageEdits
            .FirstOrDefaultAsync(e => e.Id == messageEdit.Id);

        Assert.NotNull(savedEdit);
        Assert.Equal(auditTrail.Id, savedEdit.MessageAuditTrailId);
        Assert.Equal(_testUser.Id, savedEdit.EditedBy);
        Assert.Equal("Original message content before edit", savedEdit.PreviousContent);
        Assert.Equal("Fixed typo in message", savedEdit.ChangeReason);
        Assert.True(savedEdit.EditedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test MessageEdit navigation properties
    /// </summary>
    [Fact]
    public async Task MessageEdit_NavigationProperties_LoadCorrectly()
    {
        // Arrange
        var auditTrail = new MessageAuditTrail
        {
            MessageId = _testMessage.Id,
            IpAddress = "192.168.100.1",
            CreatedAt = DateTime.UtcNow
        };

        _context.MessageAuditTrails.Add(auditTrail);
        await _context.SaveChangesAsync();

        var editBaseTime = DateTime.UtcNow;
        
        var messageEdit1 = new MessageEdit
        {
            MessageAuditTrailId = auditTrail.Id,
            EditedAt = editBaseTime.AddHours(-2),
            EditedBy = _testUser.Id,
            PreviousContent = "First version of message",
            ChangeReason = "Initial edit"
        };

        var messageEdit2 = new MessageEdit
        {
            MessageAuditTrailId = auditTrail.Id,
            EditedAt = editBaseTime,
            EditedBy = _testUser.Id,
            PreviousContent = "Second version of message",
            ChangeReason = "Final edit"
        };

        _context.MessageEdits.AddRange(messageEdit1, messageEdit2);
        await _context.SaveChangesAsync();

        // Act
        var auditTrailWithEdits = await _context.MessageAuditTrails
            .Include(a => a.EditHistory)
            .ThenInclude(e => e.Editor)
            .FirstOrDefaultAsync(a => a.Id == auditTrail.Id);

        var editWithRelations = await _context.MessageEdits
            .Include(e => e.MessageAuditTrail)
            .Include(e => e.Editor)
            .FirstOrDefaultAsync(e => e.Id == messageEdit1.Id);

        // Assert
        Assert.NotNull(auditTrailWithEdits);
        Assert.Equal(2, auditTrailWithEdits.EditHistory.Count);
        
        var edits = auditTrailWithEdits.EditHistory.OrderBy(e => e.EditedAt).ToList();
        
        // Verify we have both edits
        Assert.Contains(edits, e => e.PreviousContent == "First version of message" && e.ChangeReason == "Initial edit");
        Assert.Contains(edits, e => e.PreviousContent == "Second version of message" && e.ChangeReason == "Final edit");
        
        // Verify edit properties
        var firstEdit = edits.First(e => e.PreviousContent == "First version of message");
        var secondEdit = edits.First(e => e.PreviousContent == "Second version of message");
        Assert.Equal(_testUser.Id, firstEdit.EditedBy);
        Assert.Equal(_testUser.Id, secondEdit.EditedBy);

        Assert.NotNull(editWithRelations);
        Assert.NotNull(editWithRelations.MessageAuditTrail);
        Assert.NotNull(editWithRelations.Editor);
        Assert.Equal(_testMessage.Id, editWithRelations.MessageAuditTrail.MessageId);
        Assert.Equal(_testUser.Name, editWithRelations.Editor.Name);
    }

    /// <summary>
    /// Test CommunicationLog with SMS communication type
    /// </summary>
    [Fact]
    public async Task CommunicationLog_SmsType_HandlesSmsSpecificFields()
    {
        // Arrange
        var smsLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "SMS",
            SenderId = _testUser.Id,
            RecipientPhone = "+15551234567",
            Content = "Your order CG-TEST-001 has been updated to Production Planning stage.",
            DeliveryStatus = "Delivered",
            ExternalMessageId = "twilio-msg-123",
            SentAt = DateTime.UtcNow,
            DeliveredAt = DateTime.UtcNow.AddMinutes(1),
            Metadata = "{\"twilioSid\":\"twilio-msg-123\",\"segments\":1}"
        };

        // Act
        _context.CommunicationLogs.Add(smsLog);
        await _context.SaveChangesAsync();

        // Assert
        var savedSmsLog = await _context.CommunicationLogs
            .FirstOrDefaultAsync(c => c.Id == smsLog.Id);

        Assert.NotNull(savedSmsLog);
        Assert.Equal("SMS", savedSmsLog.CommunicationType);
        Assert.Equal("+15551234567", savedSmsLog.RecipientPhone);
        Assert.Null(savedSmsLog.RecipientEmail);
        Assert.Null(savedSmsLog.Subject); // SMS doesn't have subject
        Assert.Contains("Production Planning", savedSmsLog.Content);
        Assert.Equal("Delivered", savedSmsLog.DeliveryStatus);
        Assert.NotNull(savedSmsLog.DeliveredAt);
        Assert.Contains("twilioSid", savedSmsLog.Metadata);
    }

    /// <summary>
    /// Test CommunicationLog content length validation
    /// </summary>
    [Fact]
    public async Task CommunicationLog_ValidContentLength_CreatesSuccessfully()
    {
        // Arrange - Test maximum allowed content length
        var longContent = new string('x', 9999); // Within 10000 character limit
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Message",
            SenderId = _testUser.Id,
            Content = longContent,
            DeliveryStatus = "Sent",
            SentAt = DateTime.UtcNow
        };

        // Act
        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        // Assert
        var savedLog = await _context.CommunicationLogs
            .FirstOrDefaultAsync(c => c.Id == communicationLog.Id);

        Assert.NotNull(savedLog);
        Assert.Equal(9999, savedLog.Content.Length);
    }

    /// <summary>
    /// Test multiple delivery logs for a single communication
    /// </summary>
    [Fact]
    public async Task CommunicationLog_MultipleDeliveryLogs_HandlesStatusUpdates()
    {
        // Arrange
        var communicationLog = new CommunicationLog
        {
            OrderId = _testOrder.Id,
            CommunicationType = "Email",
            SenderId = _testUser.Id,
            RecipientEmail = "test@example.com",
            Subject = "Test Email with Multiple Status Updates",
            Content = "Email content for delivery tracking test",
            DeliveryStatus = "Sent",
            ExternalMessageId = "sendgrid-multi-123",
            SentAt = DateTime.UtcNow
        };

        _context.CommunicationLogs.Add(communicationLog);
        await _context.SaveChangesAsync();

        var baseTime = DateTime.UtcNow;
        
        var deliveryLog1 = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "SendGrid",
            ExternalId = "sendgrid-multi-123",
            Status = "Queued",
            UpdatedAt = baseTime.AddHours(-3)
        };

        var deliveryLog2 = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "SendGrid",
            ExternalId = "sendgrid-multi-123",
            Status = "Delivered",
            UpdatedAt = baseTime.AddHours(-1)
        };

        var deliveryLog3 = new NotificationDeliveryLog
        {
            CommunicationLogId = communicationLog.Id,
            DeliveryProvider = "SendGrid",
            ExternalId = "sendgrid-multi-123",
            Status = "Opened",
            UpdatedAt = baseTime
        };

        // Act
        _context.NotificationDeliveryLogs.AddRange(deliveryLog1, deliveryLog2, deliveryLog3);
        await _context.SaveChangesAsync();

        // Assert
        var communicationWithDeliveries = await _context.CommunicationLogs
            .Include(c => c.DeliveryLogs)
            .FirstOrDefaultAsync(c => c.Id == communicationLog.Id);

        Assert.NotNull(communicationWithDeliveries);
        Assert.Equal(3, communicationWithDeliveries.DeliveryLogs.Count);

        var deliveries = communicationWithDeliveries.DeliveryLogs.ToList();
        
        // Verify we have all three statuses
        Assert.Contains(deliveries, d => d.Status == "Queued");
        Assert.Contains(deliveries, d => d.Status == "Delivered");
        Assert.Contains(deliveries, d => d.Status == "Opened");
        
        // Verify delivery properties
        var queuedDelivery = deliveries.First(d => d.Status == "Queued");
        var deliveredDelivery = deliveries.First(d => d.Status == "Delivered");
        var openedDelivery = deliveries.First(d => d.Status == "Opened");
        
        Assert.Equal("SendGrid", queuedDelivery.DeliveryProvider);
        Assert.Equal("SendGrid", deliveredDelivery.DeliveryProvider);
        Assert.Equal("SendGrid", openedDelivery.DeliveryProvider);
        Assert.Equal("sendgrid-multi-123", queuedDelivery.ExternalId);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}