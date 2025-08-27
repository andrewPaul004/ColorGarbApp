using Microsoft.EntityFrameworkCore;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Entities;

/// <summary>
/// Unit tests for Message and MessageAttachment entities to verify relationships and constraints.
/// </summary>
public class MessageTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly Order _testOrder;

    public MessageTests()
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
        _context.Users.Add(_testUser);
        _context.Orders.Add(_testOrder);
        _context.SaveChanges();
    }

    /// <summary>
    /// Test creating a message with valid properties
    /// </summary>
    [Fact]
    public async Task CreateMessage_ValidProperties_CreatesSuccessfully()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            RecipientRole = "ColorGarbStaff",
            Content = "This is a test message about the order.",
            MessageType = "Question"
        };

        // Act
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Assert
        var savedMessage = await _context.Messages
            .FirstOrDefaultAsync(m => m.Id == message.Id);
        
        Assert.NotNull(savedMessage);
        Assert.Equal(_testOrder.Id, savedMessage.OrderId);
        Assert.Equal(_testUser.Id, savedMessage.SenderId);
        Assert.Equal("Director", savedMessage.SenderRole);
        Assert.Equal("Test Director", savedMessage.SenderName);
        Assert.Equal("ColorGarbStaff", savedMessage.RecipientRole);
        Assert.Equal("This is a test message about the order.", savedMessage.Content);
        Assert.Equal("Question", savedMessage.MessageType);
        Assert.False(savedMessage.IsRead);
        Assert.Null(savedMessage.ReadAt);
        Assert.True(savedMessage.CreatedAt > DateTime.MinValue);
        Assert.True(savedMessage.UpdatedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test message navigation properties work correctly
    /// </summary>
    [Fact]
    public async Task Message_NavigationProperties_LoadCorrectly()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Test message with navigation properties"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act
        var messageWithIncludes = await _context.Messages
            .Include(m => m.Order)
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        // Assert
        Assert.NotNull(messageWithIncludes);
        Assert.NotNull(messageWithIncludes.Order);
        Assert.NotNull(messageWithIncludes.Sender);
        Assert.Equal(_testOrder.OrderNumber, messageWithIncludes.Order.OrderNumber);
        Assert.Equal(_testUser.Email, messageWithIncludes.Sender.Email);
    }

    /// <summary>
    /// Test message reply functionality
    /// </summary>
    [Fact]
    public async Task Message_ReplyToMessage_CreatesCorrectRelationship()
    {
        // Arrange
        var parentMessage = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Original message"
        };

        _context.Messages.Add(parentMessage);
        await _context.SaveChangesAsync();

        var replyMessage = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Reply to the original message",
            ReplyToMessageId = parentMessage.Id
        };

        // Act
        _context.Messages.Add(replyMessage);
        await _context.SaveChangesAsync();

        // Assert
        var parentWithReplies = await _context.Messages
            .Include(m => m.Replies)
            .FirstOrDefaultAsync(m => m.Id == parentMessage.Id);

        var replyWithParent = await _context.Messages
            .Include(m => m.ReplyToMessage)
            .FirstOrDefaultAsync(m => m.Id == replyMessage.Id);

        Assert.NotNull(parentWithReplies);
        Assert.Single(parentWithReplies.Replies);
        Assert.Equal(replyMessage.Id, parentWithReplies.Replies.First().Id);

        Assert.NotNull(replyWithParent);
        Assert.NotNull(replyWithParent.ReplyToMessage);
        Assert.Equal(parentMessage.Id, replyWithParent.ReplyToMessage.Id);
    }

    /// <summary>
    /// Test creating message attachment with valid properties
    /// </summary>
    [Fact]
    public async Task CreateMessageAttachment_ValidProperties_CreatesSuccessfully()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Message with attachment"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var attachment = new MessageAttachment
        {
            MessageId = message.Id,
            FileName = "secure-filename-123.jpg",
            OriginalFileName = "costume-design.jpg",
            FileSize = 1024000,
            ContentType = "image/jpeg",
            BlobUrl = "https://storage.azure.com/containers/message-attachments/secure-filename-123.jpg",
            UploadedBy = _testUser.Id
        };

        // Act
        _context.MessageAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        // Assert
        var savedAttachment = await _context.MessageAttachments
            .FirstOrDefaultAsync(a => a.Id == attachment.Id);

        Assert.NotNull(savedAttachment);
        Assert.Equal(message.Id, savedAttachment.MessageId);
        Assert.Equal("secure-filename-123.jpg", savedAttachment.FileName);
        Assert.Equal("costume-design.jpg", savedAttachment.OriginalFileName);
        Assert.Equal(1024000, savedAttachment.FileSize);
        Assert.Equal("image/jpeg", savedAttachment.ContentType);
        Assert.Equal(_testUser.Id, savedAttachment.UploadedBy);
        Assert.True(savedAttachment.UploadedAt > DateTime.MinValue);
    }

    /// <summary>
    /// Test message attachment navigation properties
    /// </summary>
    [Fact]
    public async Task MessageAttachment_NavigationProperties_LoadCorrectly()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Message with attachment navigation test"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var attachment = new MessageAttachment
        {
            MessageId = message.Id,
            FileName = "test-file.pdf",
            OriginalFileName = "test-document.pdf",
            FileSize = 500000,
            ContentType = "application/pdf",
            BlobUrl = "https://storage.azure.com/containers/test-file.pdf",
            UploadedBy = _testUser.Id
        };

        _context.MessageAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        // Act
        var attachmentWithIncludes = await _context.MessageAttachments
            .Include(a => a.Message)
            .Include(a => a.UploadedByUser)
            .FirstOrDefaultAsync(a => a.Id == attachment.Id);

        var messageWithAttachments = await _context.Messages
            .Include(m => m.Attachments)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        // Assert
        Assert.NotNull(attachmentWithIncludes);
        Assert.NotNull(attachmentWithIncludes.Message);
        Assert.NotNull(attachmentWithIncludes.UploadedByUser);
        Assert.Equal(message.Content, attachmentWithIncludes.Message.Content);
        Assert.Equal(_testUser.Name, attachmentWithIncludes.UploadedByUser.Name);

        Assert.NotNull(messageWithAttachments);
        Assert.Single(messageWithAttachments.Attachments);
        Assert.Equal(attachment.OriginalFileName, messageWithAttachments.Attachments.First().OriginalFileName);
    }

    /// <summary>
    /// Test order messages navigation property
    /// </summary>
    [Fact]
    public async Task Order_MessagesNavigationProperty_LoadsCorrectly()
    {
        // Arrange
        var message1 = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "First message"
        };

        var message2 = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director", 
            SenderName = "Test Director",
            Content = "Second message"
        };

        _context.Messages.AddRange(message1, message2);
        await _context.SaveChangesAsync();

        // Act
        var orderWithMessages = await _context.Orders
            .Include(o => o.Messages)
            .FirstOrDefaultAsync(o => o.Id == _testOrder.Id);

        // Assert
        Assert.NotNull(orderWithMessages);
        Assert.Equal(2, orderWithMessages.Messages.Count);
        Assert.Contains(orderWithMessages.Messages, m => m.Content == "First message");
        Assert.Contains(orderWithMessages.Messages, m => m.Content == "Second message");
    }

    /// <summary>
    /// Test message content within valid length
    /// </summary>
    [Fact]
    public async Task Message_ValidContentLength_CreatesSuccessfully()
    {
        // Arrange
        var validContent = new string('x', 4999); // Within 5000 character limit
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = validContent
        };

        // Act
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Assert
        var savedMessage = await _context.Messages
            .FirstOrDefaultAsync(m => m.Id == message.Id);
            
        Assert.NotNull(savedMessage);
        Assert.Equal(4999, savedMessage.Content.Length);
    }

    /// <summary>
    /// Test marking message as read functionality
    /// </summary>
    [Fact]
    public async Task Message_MarkAsRead_UpdatesCorrectly()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Message to be marked as read"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act
        message.IsRead = true;
        message.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Assert
        var updatedMessage = await _context.Messages
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        Assert.NotNull(updatedMessage);
        Assert.True(updatedMessage.IsRead);
        Assert.NotNull(updatedMessage.ReadAt);
        Assert.True(updatedMessage.ReadAt.Value > DateTime.MinValue);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}