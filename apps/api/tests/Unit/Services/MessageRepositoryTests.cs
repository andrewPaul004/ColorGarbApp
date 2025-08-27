using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using ColorGarbApi.Services;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for MessageRepository to verify data access functionality.
/// </summary>
public class MessageRepositoryTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Mock<ILogger<MessageRepository>> _mockLogger;
    private readonly MessageRepository _messageRepository;
    private readonly Organization _testOrganization;
    private readonly User _testUser;
    private readonly Order _testOrder;

    public MessageRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new ColorGarbDbContext(options);
        _mockLogger = new Mock<ILogger<MessageRepository>>();
        _messageRepository = new MessageRepository(_context, _mockLogger.Object);

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
    /// Test creating a message successfully
    /// </summary>
    [Fact]
    public async Task CreateMessageAsync_ValidMessage_CreatesSuccessfully()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Test message content",
            MessageType = "Question"
        };

        // Act
        var result = await _messageRepository.CreateMessageAsync(message);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(_testOrder.Id, result.OrderId);
        Assert.Equal(_testUser.Id, result.SenderId);
        Assert.Equal("Test message content", result.Content);

        // Verify it was saved to database
        var savedMessage = await _context.Messages.FirstOrDefaultAsync(m => m.Id == result.Id);
        Assert.NotNull(savedMessage);
    }

    /// <summary>
    /// Test getting order messages with pagination
    /// </summary>
    [Fact]
    public async Task GetOrderMessagesAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var messages = new List<Message>();
        for (int i = 0; i < 15; i++)
        {
            var message = new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = $"Message {i + 1}",
                CreatedAt = DateTime.UtcNow.AddMinutes(-i) // Newer messages first
            };
            messages.Add(message);
        }

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        // Act - Get first page (10 items)
        var firstPage = await _messageRepository.GetOrderMessagesAsync(_testOrder.Id, page: 1, pageSize: 10);

        // Act - Get second page (5 items)
        var secondPage = await _messageRepository.GetOrderMessagesAsync(_testOrder.Id, page: 2, pageSize: 10);

        // Assert
        Assert.Equal(10, firstPage.Count());
        Assert.Equal(5, secondPage.Count());

        // Verify ordering (newest first)
        var firstPageList = firstPage.ToList();
        Assert.Equal("Message 15", firstPageList[0].Content); // Most recent (created with -0 minutes)
        Assert.Equal("Message 6", firstPageList[9].Content);   // 10th most recent
    }

    /// <summary>
    /// Test getting message by ID with includes
    /// </summary>
    [Fact]
    public async Task GetMessageByIdAsync_WithIncludes_LoadsRelatedData()
    {
        // Arrange
        var message = new Message
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id,
            SenderRole = "Director",
            SenderName = "Test Director",
            Content = "Test message with relations"
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act
        var result = await _messageRepository.GetMessageByIdAsync(message.Id);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Sender);
        Assert.NotNull(result.Order);
        Assert.Equal(_testUser.Name, result.Sender.Name);
        Assert.Equal(_testOrder.OrderNumber, result.Order.OrderNumber);
    }

    /// <summary>
    /// Test searching messages with content filter
    /// </summary>
    [Fact]
    public async Task SearchMessagesAsync_WithContentFilter_ReturnsMatchingMessages()
    {
        // Arrange
        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Question about costume design"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Update on measurements"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "General information"
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        var searchRequest = new MessageSearchRequest
        {
            OrderId = _testOrder.Id,
            SearchTerm = "costume"
        };

        // Act
        var results = await _messageRepository.SearchMessagesAsync(searchRequest);

        // Assert
        Assert.Single(results);
        Assert.Contains("costume design", results.First().Content);
    }

    /// <summary>
    /// Test searching messages with sender filter
    /// </summary>
    [Fact]
    public async Task SearchMessagesAsync_WithSenderFilter_ReturnsMatchingMessages()
    {
        // Arrange
        var anotherUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "staff@colorgarb.com",
            Name = "ColorGarb Staff",
            Role = UserRole.ColorGarbStaff,
            PasswordHash = "hash",
            IsActive = true
        };

        _context.Users.Add(anotherUser);
        await _context.SaveChangesAsync();

        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Message from director"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = anotherUser.Id,
                SenderRole = "ColorGarbStaff",
                SenderName = "ColorGarb Staff",
                Content = "Message from staff"
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        var searchRequest = new MessageSearchRequest
        {
            OrderId = _testOrder.Id,
            SenderId = _testUser.Id
        };

        // Act
        var results = await _messageRepository.SearchMessagesAsync(searchRequest);

        // Assert
        Assert.Single(results);
        Assert.Equal(_testUser.Id, results.First().SenderId);
    }

    /// <summary>
    /// Test searching messages with date range filter
    /// </summary>
    [Fact]
    public async Task SearchMessagesAsync_WithDateFilter_ReturnsMatchingMessages()
    {
        // Arrange
        var baseDate = DateTime.UtcNow.AddHours(-12); // Use relative time to avoid timestamp override issues
        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Old message"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Recent message"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Future message"
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        // Manually update the timestamps after save to avoid DbContext override
        messages[0].CreatedAt = baseDate.AddDays(-5);
        messages[1].CreatedAt = baseDate;
        messages[2].CreatedAt = baseDate.AddDays(5);
        
        _context.Messages.UpdateRange(messages);
        await _context.SaveChangesAsync();

        var searchRequest = new MessageSearchRequest
        {
            OrderId = _testOrder.Id,
            DateFrom = baseDate.AddDays(-1),
            DateTo = baseDate.AddDays(1)
        };

        // Act
        var results = await _messageRepository.SearchMessagesAsync(searchRequest);

        // Assert
        Assert.Single(results);
        Assert.Contains("Recent message", results.First().Content);
    }

    /// <summary>
    /// Test getting message count with filters
    /// </summary>
    [Fact]
    public async Task GetMessageCountAsync_WithFilters_ReturnsCorrectCount()
    {
        // Arrange
        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Question about design",
                MessageType = "Question"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "General update",
                MessageType = "Update"
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Another question",
                MessageType = "Question"
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        var searchRequest = new MessageSearchRequest
        {
            OrderId = _testOrder.Id,
            MessageType = "Question"
        };

        // Act
        var count = await _messageRepository.GetMessageCountAsync(_testOrder.Id, searchRequest);

        // Assert
        Assert.Equal(2, count);
    }

    /// <summary>
    /// Test getting unread message count
    /// </summary>
    [Fact]
    public async Task GetUnreadMessageCountAsync_ForRole_ReturnsCorrectCount()
    {
        // Arrange
        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Unread message 1",
                RecipientRole = "ColorGarbStaff",
                IsRead = false
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Read message",
                RecipientRole = "ColorGarbStaff",
                IsRead = true
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Unread message 2",
                RecipientRole = "All",
                IsRead = false
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        // Act
        var count = await _messageRepository.GetUnreadMessageCountAsync(_testOrder.Id, "ColorGarbStaff");

        // Assert
        Assert.Equal(2, count); // One for ColorGarbStaff + one for All
    }

    /// <summary>
    /// Test creating message attachment
    /// </summary>
    [Fact]
    public async Task CreateAttachmentAsync_ValidAttachment_CreatesSuccessfully()
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
            FileName = "secure-filename.pdf",
            OriginalFileName = "document.pdf",
            FileSize = 1024000,
            ContentType = "application/pdf",
            BlobUrl = "https://storage.azure.com/containers/file.pdf",
            UploadedBy = _testUser.Id
        };

        // Act
        var result = await _messageRepository.CreateAttachmentAsync(attachment);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(message.Id, result.MessageId);
        Assert.Equal("document.pdf", result.OriginalFileName);

        // Verify it was saved to database
        var savedAttachment = await _context.MessageAttachments.FirstOrDefaultAsync(a => a.Id == result.Id);
        Assert.NotNull(savedAttachment);
    }

    /// <summary>
    /// Test marking multiple messages as read
    /// </summary>
    [Fact]
    public async Task MarkMessagesAsReadAsync_MultipleMessages_MarksAllAsRead()
    {
        // Arrange
        var messages = new[]
        {
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Unread message 1",
                IsRead = false
            },
            new Message
            {
                OrderId = _testOrder.Id,
                SenderId = _testUser.Id,
                SenderRole = "Director",
                SenderName = "Test Director",
                Content = "Unread message 2",
                IsRead = false
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        var messageIds = messages.Select(m => m.Id).ToList();
        var readTime = DateTime.UtcNow;

        // Act
        var result = await _messageRepository.MarkMessagesAsReadAsync(messageIds, readTime);

        // Assert
        Assert.Equal(2, result);

        // Verify messages are marked as read
        var updatedMessages = await _context.Messages
            .Where(m => messageIds.Contains(m.Id))
            .ToListAsync();

        Assert.All(updatedMessages, m =>
        {
            Assert.True(m.IsRead);
            Assert.NotNull(m.ReadAt);
        });
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}