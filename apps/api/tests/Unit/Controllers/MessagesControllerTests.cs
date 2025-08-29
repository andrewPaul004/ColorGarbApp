using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Services;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for MessagesController to verify API endpoint functionality and security.
/// </summary>
public class MessagesControllerTests : IDisposable
{
    private readonly Mock<IMessageService> _mockMessageService;
    private readonly Mock<ILogger<MessagesController>> _mockLogger;
    private readonly MessagesController _controller;
    private readonly Guid _testOrderId = Guid.NewGuid();
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testMessageId = Guid.NewGuid();

    public MessagesControllerTests()
    {
        _mockMessageService = new Mock<IMessageService>();
        _mockLogger = new Mock<ILogger<MessagesController>>();
        _controller = new MessagesController(_mockMessageService.Object, _mockLogger.Object);

        // Setup user context
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString()),
            new Claim(ClaimTypes.Role, "Director")
        };

        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = claimsPrincipal
            }
        };
    }

    /// <summary>
    /// Test getting order messages with valid access
    /// </summary>
    [Fact]
    public async Task GetOrderMessages_ValidAccess_ReturnsMessages()
    {
        // Arrange
        var expectedMessages = new List<Message>
        {
            new Message
            {
                Id = _testMessageId,
                OrderId = _testOrderId,
                SenderId = _testUserId,
                SenderName = "Test User",
                SenderRole = "Director",
                Content = "Test message",
                CreatedAt = DateTime.UtcNow,
                Attachments = new List<MessageAttachment>()
            }
        };

        var expectedResult = new MessageSearchResult
        {
            Messages = expectedMessages,
            TotalCount = 1,
            Page = 1,
            PageSize = 50,
            HasNextPage = false
        };

        _mockMessageService.Setup(s => s.ValidateUserOrderAccessAsync(_testUserId, _testOrderId))
            .ReturnsAsync(true);
        _mockMessageService.Setup(s => s.GetOrderMessagesAsync(_testOrderId, It.IsAny<MessageSearchRequest>()))
            .ReturnsAsync(expectedResult);
        _mockMessageService.Setup(s => s.GetUnreadMessageCountAsync(_testOrderId, _testUserId))
            .ReturnsAsync(2);

        // Act
        var result = await _controller.GetOrderMessages(_testOrderId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<MessageSearchResponse>(okResult.Value);
        
        Assert.Single(response.Messages);
        Assert.Equal(1, response.TotalCount);
        Assert.Equal(2, response.UnreadCount);
        Assert.False(response.HasNextPage);
    }

    /// <summary>
    /// Test getting order messages with unauthorized access
    /// </summary>
    [Fact]
    public async Task GetOrderMessages_UnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        _mockMessageService.Setup(s => s.ValidateUserOrderAccessAsync(_testUserId, _testOrderId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.GetOrderMessages(_testOrderId);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    /// <summary>
    /// Test getting order messages with search filters
    /// </summary>
    [Fact]
    public async Task GetOrderMessages_WithSearchFilters_AppliesFiltersCorrectly()
    {
        // Arrange
        var searchTerm = "urgent";
        var messageType = "Question";
        var senderRole = "Director";

        _mockMessageService.Setup(s => s.ValidateUserOrderAccessAsync(_testUserId, _testOrderId))
            .ReturnsAsync(true);
        _mockMessageService.Setup(s => s.GetOrderMessagesAsync(_testOrderId, It.IsAny<MessageSearchRequest>()))
            .ReturnsAsync(new MessageSearchResult());
        _mockMessageService.Setup(s => s.GetUnreadMessageCountAsync(_testOrderId, _testUserId))
            .ReturnsAsync(0);

        // Act
        var result = await _controller.GetOrderMessages(
            _testOrderId, searchTerm, messageType, senderRole);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        
        // Verify the search request was constructed correctly
        _mockMessageService.Verify(s => s.GetOrderMessagesAsync(_testOrderId, 
            It.Is<MessageSearchRequest>(r => 
                r.SearchTerm == searchTerm && 
                r.MessageType == messageType && 
                r.SenderRole == senderRole)), Times.Once);
    }

    /// <summary>
    /// Test sending a message with valid data
    /// </summary>
    [Fact]
    public async Task SendMessage_ValidData_CreatesMessage()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            Content = "Test message content",
            MessageType = "Question",
            RecipientRole = "ColorGarbStaff"
        };

        var expectedMessage = new Message
        {
            Id = _testMessageId,
            OrderId = _testOrderId,
            SenderId = _testUserId,
            SenderName = "Test User",
            SenderRole = "Director",
            Content = request.Content,
            MessageType = request.MessageType,
            CreatedAt = DateTime.UtcNow,
            Attachments = new List<MessageAttachment>()
        };

        var expectedResult = new MessageResult
        {
            Message = expectedMessage,
            Attachments = new List<MessageAttachment>(),
            Success = true
        };

        _mockMessageService.Setup(s => s.SendMessageAsync(
            _testOrderId, _testUserId, request.Content, request.MessageType, request.RecipientRole, null, null))
            .ReturnsAsync(expectedResult);

        // Act
        var result = await _controller.SendMessage(_testOrderId, request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<MessageCreationResponse>(createdResult.Value);
        
        Assert.NotNull(response.Message);
        Assert.Equal(request.Content, response.Message.Content);
        Assert.Equal(request.MessageType, response.Message.MessageType);
        Assert.Empty(response.AttachmentWarnings);
    }

    /// <summary>
    /// Test sending a message with empty content
    /// </summary>
    [Fact]
    public async Task SendMessage_EmptyContent_ReturnsBadRequest()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            Content = ""
        };

        // Act
        var result = await _controller.SendMessage(_testOrderId, request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var errorResponse = Assert.IsAssignableFrom<object>(badRequestResult.Value);
        Assert.NotNull(errorResponse);
    }

    /// <summary>
    /// Test sending a message with content too long
    /// </summary>
    [Fact]
    public async Task SendMessage_ContentTooLong_ReturnsBadRequest()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            Content = new string('x', 5001) // Exceeds 5000 character limit
        };

        // Act
        var result = await _controller.SendMessage(_testOrderId, request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var errorResponse = Assert.IsAssignableFrom<object>(badRequestResult.Value);
        Assert.NotNull(errorResponse);
    }

    /// <summary>
    /// Test sending a message with unauthorized access
    /// </summary>
    [Fact]
    public async Task SendMessage_UnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            Content = "Test message"
        };

        _mockMessageService.Setup(s => s.SendMessageAsync(
            It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<List<IFormFile>>()))
            .ThrowsAsync(new MessageAccessDeniedException("Access denied"));

        // Act
        var result = await _controller.SendMessage(_testOrderId, request);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    /// <summary>
    /// Test getting a specific message by ID
    /// </summary>
    [Fact]
    public async Task GetMessage_ValidMessage_ReturnsMessage()
    {
        // Arrange
        var expectedMessage = new Message
        {
            Id = _testMessageId,
            OrderId = _testOrderId,
            SenderId = _testUserId,
            SenderName = "Test User",
            SenderRole = "Director",
            Content = "Test message content",
            CreatedAt = DateTime.UtcNow,
            Attachments = new List<MessageAttachment>()
        };

        _mockMessageService.Setup(s => s.GetMessageByIdAsync(_testMessageId, _testUserId))
            .ReturnsAsync(expectedMessage);

        // Act
        var result = await _controller.GetMessage(_testOrderId, _testMessageId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var messageDto = Assert.IsType<MessageDto>(okResult.Value);
        
        Assert.Equal(_testMessageId, messageDto.Id);
        Assert.Equal(expectedMessage.Content, messageDto.Content);
    }

    /// <summary>
    /// Test getting a message that doesn't exist
    /// </summary>
    [Fact]
    public async Task GetMessage_MessageNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockMessageService.Setup(s => s.GetMessageByIdAsync(_testMessageId, _testUserId))
            .ReturnsAsync((Message?)null);

        // Act
        var result = await _controller.GetMessage(_testOrderId, _testMessageId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    /// <summary>
    /// Test getting a message from wrong order
    /// </summary>
    [Fact]
    public async Task GetMessage_WrongOrder_ReturnsBadRequest()
    {
        // Arrange
        var wrongOrderId = Guid.NewGuid();
        var message = new Message
        {
            Id = _testMessageId,
            OrderId = _testOrderId, // Different from the requested order
            SenderId = _testUserId,
            Content = "Test message"
        };

        _mockMessageService.Setup(s => s.GetMessageByIdAsync(_testMessageId, _testUserId))
            .ReturnsAsync(message);

        // Act
        var result = await _controller.GetMessage(wrongOrderId, _testMessageId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    /// <summary>
    /// Test marking a message as read
    /// </summary>
    [Fact]
    public async Task MarkMessageAsRead_ValidMessage_ReturnsNoContent()
    {
        // Arrange
        _mockMessageService.Setup(s => s.MarkMessageAsReadAsync(_testMessageId, _testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.MarkMessageAsRead(_testOrderId, _testMessageId);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    /// <summary>
    /// Test marking non-existent message as read
    /// </summary>
    [Fact]
    public async Task MarkMessageAsRead_MessageNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockMessageService.Setup(s => s.MarkMessageAsReadAsync(_testMessageId, _testUserId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.MarkMessageAsRead(_testOrderId, _testMessageId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    /// <summary>
    /// Test marking multiple messages as read
    /// </summary>
    [Fact]
    public async Task MarkMessagesAsRead_ValidMessages_ReturnsCount()
    {
        // Arrange
        var messageIds = new[] { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        var request = new BulkReadRequest
        {
            MessageIds = messageIds
        };

        _mockMessageService.Setup(s => s.MarkMessagesAsReadAsync(messageIds, _testUserId))
            .ReturnsAsync(2); // 2 out of 3 were successfully marked

        // Act
        var result = await _controller.MarkMessagesAsRead(_testOrderId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<BulkReadResponse>(okResult.Value);
        
        Assert.Equal(2, response.MarkedAsReadCount);
        Assert.Equal(3, response.TotalRequested);
    }

    /// <summary>
    /// Test marking messages as read with empty request
    /// </summary>
    [Fact]
    public async Task MarkMessagesAsRead_EmptyRequest_ReturnsBadRequest()
    {
        // Arrange
        var request = new BulkReadRequest
        {
            MessageIds = new List<Guid>()
        };

        // Act
        var result = await _controller.MarkMessagesAsRead(_testOrderId, request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    /// <summary>
    /// Test downloading an attachment with valid access
    /// </summary>
    [Fact]
    public async Task DownloadAttachment_ValidAccess_ReturnsFile()
    {
        // Arrange
        var attachmentId = Guid.NewGuid();
        var fileStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("Test file content"));
        var downloadResult = new AttachmentDownloadResult
        {
            FileStream = fileStream,
            FileName = "test-file.pdf",
            ContentType = "application/pdf",
            FileSize = fileStream.Length
        };

        _mockMessageService.Setup(s => s.DownloadAttachmentAsync(attachmentId, _testUserId))
            .ReturnsAsync(downloadResult);

        // Act
        var result = await _controller.DownloadAttachment(_testOrderId, _testMessageId, attachmentId);

        // Assert
        var fileResult = Assert.IsType<FileStreamResult>(result);
        Assert.Equal("test-file.pdf", fileResult.FileDownloadName);
        Assert.Equal("application/pdf", fileResult.ContentType);
    }

    /// <summary>
    /// Test downloading non-existent attachment
    /// </summary>
    [Fact]
    public async Task DownloadAttachment_AttachmentNotFound_ReturnsNotFound()
    {
        // Arrange
        var attachmentId = Guid.NewGuid();
        
        _mockMessageService.Setup(s => s.DownloadAttachmentAsync(attachmentId, _testUserId))
            .ReturnsAsync((AttachmentDownloadResult?)null);

        // Act
        var result = await _controller.DownloadAttachment(_testOrderId, _testMessageId, attachmentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    /// <summary>
    /// Test downloading attachment with unauthorized access
    /// </summary>
    [Fact]
    public async Task DownloadAttachment_UnauthorizedAccess_ReturnsForbid()
    {
        // Arrange
        var attachmentId = Guid.NewGuid();
        
        _mockMessageService.Setup(s => s.DownloadAttachmentAsync(attachmentId, _testUserId))
            .ThrowsAsync(new MessageAccessDeniedException("Access denied"));

        // Act
        var result = await _controller.DownloadAttachment(_testOrderId, _testMessageId, attachmentId);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    /// <summary>
    /// Test pagination parameters validation
    /// </summary>
    [Fact]
    public async Task GetOrderMessages_InvalidPagination_CorrectsParameters()
    {
        // Arrange
        _mockMessageService.Setup(s => s.ValidateUserOrderAccessAsync(_testUserId, _testOrderId))
            .ReturnsAsync(true);
        _mockMessageService.Setup(s => s.GetOrderMessagesAsync(_testOrderId, It.IsAny<MessageSearchRequest>()))
            .ReturnsAsync(new MessageSearchResult());
        _mockMessageService.Setup(s => s.GetUnreadMessageCountAsync(_testOrderId, _testUserId))
            .ReturnsAsync(0);

        // Act - Pass invalid pagination parameters
        var result = await _controller.GetOrderMessages(_testOrderId, page: -1, pageSize: 200);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        
        // Verify the corrected parameters were used
        _mockMessageService.Verify(s => s.GetOrderMessagesAsync(_testOrderId, 
            It.Is<MessageSearchRequest>(r => r.Page == 1 && r.PageSize == 50)), Times.Once);
    }

    /// <summary>
    /// Test error handling for service exceptions
    /// </summary>
    [Fact]
    public async Task GetOrderMessages_ServiceException_ReturnsInternalServerError()
    {
        // Arrange
        _mockMessageService.Setup(s => s.ValidateUserOrderAccessAsync(_testUserId, _testOrderId))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _controller.GetOrderMessages(_testOrderId);

        // Assert
        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusCodeResult.StatusCode);
    }

    public void Dispose()
    {
        // Clean up resources - controller doesn't need explicit disposal
    }
}