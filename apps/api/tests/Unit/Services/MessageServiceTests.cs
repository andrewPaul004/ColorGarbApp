using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for MessageService to verify business logic functionality.
/// </summary>
public class MessageServiceTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Mock<IMessageRepository> _mockRepository;
    private readonly Mock<ILogger<MessageService>> _mockLogger;
    private readonly MessageService _messageService;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly User _staffUser;
    private readonly Order _testOrder;

    public MessageServiceTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new ColorGarbDbContext(options);
        _mockRepository = new Mock<IMessageRepository>();
        _mockLogger = new Mock<ILogger<MessageService>>();

        _messageService = new MessageService(_mockRepository.Object, _context, _mockLogger.Object);

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

        _staffUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "staff@colorgarb.com",
            Name = "ColorGarb Staff",
            Role = UserRole.ColorGarbStaff,
            OrganizationId = null,
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
        _context.Users.AddRange(_testUser, _staffUser);
        _context.Orders.Add(_testOrder);
        _context.SaveChanges();
    }

    /// <summary>
    /// Test getting messages for an order with valid access
    /// </summary>
    [Fact]
    public async Task GetOrderMessagesAsync_ValidAccess_ReturnsMessages()
    {
        // Arrange
        var searchRequest = new MessageSearchRequest
        {
            OrderId = _testOrder.Id,
            Page = 1,
            PageSize = 10
        };

        var expectedMessages = new List<Message>
        {
            new Message
            {
                Id = Guid.NewGuid(),
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                Content = "Test message"
            }
        };

        _mockRepository.Setup(r => r.SearchMessagesAsync(It.IsAny<MessageSearchRequest>()))
            .ReturnsAsync(expectedMessages);
        _mockRepository.Setup(r => r.GetMessageCountAsync(It.IsAny<Guid>(), It.IsAny<MessageSearchRequest>()))
            .ReturnsAsync(1);

        // Act
        var result = await _messageService.GetOrderMessagesAsync(_testOrder.Id, searchRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Messages);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.False(result.HasNextPage);
    }

    /// <summary>
    /// Test sending a message with valid user access
    /// </summary>
    [Fact]
    public async Task SendMessageAsync_ValidUser_CreatesMessage()
    {
        // Arrange
        var content = "Test message content";
        var messageType = "Question";
        var expectedMessage = new Message
        {
            Id = Guid.NewGuid(),
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = content
        };

        _mockRepository.Setup(r => r.CreateMessageAsync(It.IsAny<Message>()))
            .ReturnsAsync(expectedMessage);

        // Act
        var result = await _messageService.SendMessageAsync(
            _testOrder.Id, _testUser.Id, content, messageType);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(expectedMessage.Id, result.Message.Id);
        Assert.Empty(result.AttachmentErrors);

        // Verify repository was called correctly
        _mockRepository.Verify(r => r.CreateMessageAsync(It.Is<Message>(m => 
            m.OrderId == _testOrder.Id && 
            m.SenderId == _testUser.Id && 
            m.Content == content &&
            m.MessageType == messageType)), Times.Once);
    }

    /// <summary>
    /// Test sending message with unauthorized user
    /// </summary>
    [Fact]
    public async Task SendMessageAsync_UnauthorizedUser_ThrowsException()
    {
        // Arrange
        var unauthorizedUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "unauthorized@example.com",
            Name = "Unauthorized User",
            Role = UserRole.Director,
            OrganizationId = Guid.NewGuid(), // Different organization
            PasswordHash = "hash",
            IsActive = true
        };

        _context.Users.Add(unauthorizedUser);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<MessageAccessDeniedException>(() => 
            _messageService.SendMessageAsync(_testOrder.Id, unauthorizedUser.Id, "Test content"));
    }

    /// <summary>
    /// Test getting message by ID with valid access
    /// </summary>
    [Fact]
    public async Task GetMessageByIdAsync_ValidAccess_ReturnsMessage()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var expectedMessage = new Message
        {
            Id = messageId,
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = "Test message"
        };

        _mockRepository.Setup(r => r.GetMessageByIdAsync(messageId))
            .ReturnsAsync(expectedMessage);

        // Act
        var result = await _messageService.GetMessageByIdAsync(messageId, _testUser.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(messageId, result.Id);
        Assert.Equal(_testOrder.Id, result.OrderId);
    }

    /// <summary>
    /// Test getting message by ID with unauthorized access
    /// </summary>
    [Fact]
    public async Task GetMessageByIdAsync_UnauthorizedAccess_ThrowsException()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var message = new Message
        {
            Id = messageId,
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = "Test message"
        };

        var unauthorizedUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "unauthorized@example.com",
            Name = "Unauthorized User",
            Role = UserRole.Director,
            OrganizationId = Guid.NewGuid(),
            PasswordHash = "hash",
            IsActive = true
        };

        _context.Users.Add(unauthorizedUser);
        await _context.SaveChangesAsync();

        _mockRepository.Setup(r => r.GetMessageByIdAsync(messageId))
            .ReturnsAsync(message);

        // Act & Assert
        await Assert.ThrowsAsync<MessageAccessDeniedException>(() => 
            _messageService.GetMessageByIdAsync(messageId, unauthorizedUser.Id));
    }

    /// <summary>
    /// Test marking message as read
    /// </summary>
    [Fact]
    public async Task MarkMessageAsReadAsync_ValidMessage_MarksAsRead()
    {
        // Arrange
        var messageId = Guid.NewGuid();
        var message = new Message
        {
            Id = messageId,
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = "Test message",
            IsRead = false
        };

        _mockRepository.Setup(r => r.GetMessageByIdAsync(messageId))
            .ReturnsAsync(message);
        _mockRepository.Setup(r => r.UpdateMessageAsync(It.IsAny<Message>()))
            .ReturnsAsync((Message m) => m);

        // Act
        var result = await _messageService.MarkMessageAsReadAsync(messageId, _testUser.Id);

        // Assert
        Assert.True(result);
        _mockRepository.Verify(r => r.UpdateMessageAsync(It.Is<Message>(m => 
            m.Id == messageId && m.IsRead && m.ReadAt.HasValue)), Times.Once);
    }

    /// <summary>
    /// Test getting unread message count for valid user
    /// </summary>
    [Fact]
    public async Task GetUnreadMessageCountAsync_ValidUser_ReturnsCount()
    {
        // Arrange
        var expectedCount = 5;
        _mockRepository.Setup(r => r.GetUnreadMessageCountAsync(_testOrder.Id, "Director"))
            .ReturnsAsync(expectedCount);

        // Act
        var result = await _messageService.GetUnreadMessageCountAsync(_testOrder.Id, _testUser.Id);

        // Assert
        Assert.Equal(expectedCount, result);
    }

    /// <summary>
    /// Test validating user order access for organization user
    /// </summary>
    [Fact]
    public async Task ValidateUserOrderAccessAsync_OrganizationUser_ValidatesCorrectly()
    {
        // Act - Valid access (same organization)
        var validAccess = await _messageService.ValidateUserOrderAccessAsync(_testUser.Id, _testOrder.Id);

        // Create unauthorized user
        var unauthorizedUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "unauthorized@example.com",
            Name = "Unauthorized User",
            Role = UserRole.Director,
            OrganizationId = Guid.NewGuid(),
            PasswordHash = "hash",
            IsActive = true
        };

        _context.Users.Add(unauthorizedUser);
        await _context.SaveChangesAsync();

        // Act - Invalid access (different organization)
        var invalidAccess = await _messageService.ValidateUserOrderAccessAsync(unauthorizedUser.Id, _testOrder.Id);

        // Assert
        Assert.True(validAccess);
        Assert.False(invalidAccess);
    }

    /// <summary>
    /// Test validating user order access for ColorGarb staff
    /// </summary>
    [Fact]
    public async Task ValidateUserOrderAccessAsync_ColorGarbStaff_AlwaysAllowed()
    {
        // Act
        var hasAccess = await _messageService.ValidateUserOrderAccessAsync(_staffUser.Id, _testOrder.Id);

        // Assert
        Assert.True(hasAccess);
    }

    /// <summary>
    /// Test marking multiple messages as read
    /// </summary>
    [Fact]
    public async Task MarkMessagesAsReadAsync_ValidMessages_MarksMultipleAsRead()
    {
        // Arrange
        var messageIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var messages = messageIds.Select(id => new Message
        {
            Id = id,
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = "Test message"
        }).ToList();

        foreach (var message in messages)
        {
            _mockRepository.Setup(r => r.GetMessageByIdAsync(message.Id))
                .ReturnsAsync(message);
        }

        _mockRepository.Setup(r => r.MarkMessagesAsReadAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<DateTime>()))
            .ReturnsAsync(2);

        // Act
        var result = await _messageService.MarkMessagesAsReadAsync(messageIds, _testUser.Id);

        // Assert
        Assert.Equal(2, result);
        _mockRepository.Verify(r => r.MarkMessagesAsReadAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<DateTime>()), Times.Once);
    }

    /// <summary>
    /// Test downloading attachment with valid access
    /// </summary>
    [Fact]
    public async Task DownloadAttachmentAsync_ValidAccess_ReturnsDownloadResult()
    {
        // Arrange
        var attachmentId = Guid.NewGuid();
        var message = new Message
        {
            Id = Guid.NewGuid(),
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            Content = "Message with attachment"
        };

        var attachment = new MessageAttachment
        {
            Id = attachmentId,
            MessageId = message.Id,
            Message = message,
            OriginalFileName = "test-file.pdf",
            FileName = "secure-filename.pdf",
            ContentType = "application/pdf",
            FileSize = 1024,
            BlobUrl = "https://storage.azure.com/test/file.pdf",
            UploadedBy = _testUser.Id
        };

        _mockRepository.Setup(r => r.GetAttachmentByIdAsync(attachmentId))
            .ReturnsAsync(attachment);

        // Act
        var result = await _messageService.DownloadAttachmentAsync(attachmentId, _testUser.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-file.pdf", result.FileName);
        Assert.Equal("application/pdf", result.ContentType);
        Assert.Equal(1024, result.FileSize);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}