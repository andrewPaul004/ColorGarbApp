using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Services;
using Moq;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for OrdersController to verify organization-based data isolation,
/// role-based access control, and proper error handling.
/// </summary>
public class OrdersControllerTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly OrdersController _controller;
    private readonly ILogger<OrdersController> _logger;
    private readonly Mock<IAuditService> _mockAuditService;
    private readonly Mock<IProductionTrackingService> _mockProductionTrackingService;
    private readonly Mock<IEmailService> _mockEmailService;

    public OrdersControllerTests()
    {
        // Create in-memory database for testing
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);
        _logger = new LoggerFactory().CreateLogger<OrdersController>();
        _mockAuditService = new Mock<IAuditService>();
        _mockProductionTrackingService = new Mock<IProductionTrackingService>();
        _mockEmailService = new Mock<IEmailService>();

        // Setup production tracking service to return successful results by default
        _mockProductionTrackingService
            .Setup(x => x.SyncOrderStageUpdateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(ProductionSyncResult.Success());

        _mockProductionTrackingService
            .Setup(x => x.SyncShipDateUpdateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(ProductionSyncResult.Success());

        // Setup email service to return successful results by default
        _mockEmailService
            .Setup(x => x.SendOrderStageUpdateEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .ReturnsAsync(true);

        _mockEmailService
            .Setup(x => x.SendShipDateChangeEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _controller = new OrdersController(_context, _logger, _mockAuditService.Object, _mockProductionTrackingService.Object, _mockEmailService.Object);

        // Seed test data
        SeedTestData();
    }

    /// <summary>
    /// Seeds test database with sample organizations and orders for testing
    /// </summary>
    private void SeedTestData()
    {
        var org1 = new Organization
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Test School",
            Type = "school",
            ContactEmail = "contact@testschool.edu",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var org2 = new Organization
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Another Theater",
            Type = "theater",
            ContactEmail = "contact@theater.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.AddRange(org1, org2);

        var order1 = new Order
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            OrderNumber = "CG-2023-001",
            OrganizationId = org1.Id,
            Description = "Spring Musical Costumes",
            CurrentStage = "Initial Consultation",
            OriginalShipDate = DateTime.Today.AddDays(30),
            CurrentShipDate = DateTime.Today.AddDays(30),
            TotalAmount = 5000.00m,
            PaymentStatus = "Pending",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var order2 = new Order
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            OrderNumber = "CG-2023-002",
            OrganizationId = org2.Id,
            Description = "Winter Play Costumes",
            CurrentStage = "Measurements",
            OriginalShipDate = DateTime.Today.AddDays(45),
            CurrentShipDate = DateTime.Today.AddDays(45),
            TotalAmount = 3500.00m,
            PaymentStatus = "Partial",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var order3 = new Order
        {
            Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            OrderNumber = "CG-2023-003",
            OrganizationId = org1.Id,
            Description = "Completed Fall Show",
            CurrentStage = "Shipped",
            OriginalShipDate = DateTime.Today.AddDays(-10),
            CurrentShipDate = DateTime.Today.AddDays(-10),
            TotalAmount = 2500.00m,
            PaymentStatus = "Paid",
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Orders.AddRange(order1, order2, order3);
        _context.SaveChanges();
    }

    /// <summary>
    /// Sets up controller with mock user claims for testing
    /// </summary>
    /// <param name="organizationId">Organization ID for the mock user</param>
    /// <param name="role">Role for the mock user</param>
    /// <param name="userId">User ID for the mock user</param>
    private void SetupUserClaims(string? organizationId, string role, string userId = "test-user-id")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role)
        };

        if (!string.IsNullOrEmpty(organizationId))
        {
            claims.Add(new Claim("organizationId", organizationId));
        }

        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = principal
            }
        };
    }

    [Fact]
    public async Task GetOrders_WithValidOrganizationUser_ReturnsOnlyOrganizationOrders()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        // Act
        var result = await _controller.GetOrders();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);
        
        Assert.Single(orders); // Should only return 1 active order for org1
        Assert.Equal("CG-2023-001", orders[0].OrderNumber);
        Assert.Equal("Test School", orders[0].OrganizationName);
    }

    [Fact]
    public async Task GetOrders_WithDifferentOrganization_ReturnsOnlyTheirOrders()
    {
        // Arrange
        SetupUserClaims("22222222-2222-2222-2222-222222222222", "Director");

        // Act
        var result = await _controller.GetOrders();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);
        
        Assert.Single(orders); // Should only return 1 active order for org2
        Assert.Equal("CG-2023-002", orders[0].OrderNumber);
        Assert.Equal("Another Theater", orders[0].OrganizationName);
    }

    [Fact]
    public async Task GetOrders_WithColorGarbStaff_ReturnsAllOrders()
    {
        // Arrange
        SetupUserClaims(null, "ColorGarbStaff");

        // Act
        var result = await _controller.GetOrders();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);
        
        Assert.Equal(2, orders.Count); // Should return all active orders from both organizations
        Assert.Contains(orders, o => o.OrderNumber == "CG-2023-001");
        Assert.Contains(orders, o => o.OrderNumber == "CG-2023-002");
    }

    [Fact]
    public async Task GetOrders_WithNoOrganizationAndNonStaff_ReturnsForbid()
    {
        // Arrange
        SetupUserClaims(null, "Director");

        // Act
        var result = await _controller.GetOrders();

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetOrders_WithStatusFilter_ReturnsFilteredResults()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        // Act - Request inactive orders
        var result = await _controller.GetOrders(status: "Inactive");

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);
        
        Assert.Single(orders); // Should return 1 inactive order for org1
        Assert.Equal("CG-2023-003", orders[0].OrderNumber);
        Assert.False(orders[0].IsActive);
    }

    [Fact]
    public async Task GetOrders_WithStageFilter_ReturnsFilteredResults()
    {
        // Arrange
        SetupUserClaims("22222222-2222-2222-2222-222222222222", "Finance");

        // Act
        var result = await _controller.GetOrders(stage: "Measurements");

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);
        
        Assert.Single(orders);
        Assert.Equal("Measurements", orders[0].CurrentStage);
        Assert.Equal("CG-2023-002", orders[0].OrderNumber);
    }

    [Fact]
    public async Task GetOrder_WithValidIdAndAccess_ReturnsOrder()
    {
        // Arrange
        var orderId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        // Act
        var result = await _controller.GetOrder(orderId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var order = Assert.IsType<OrderDto>(okResult.Value);
        
        Assert.Equal(orderId, order.Id);
        Assert.Equal("CG-2023-001", order.OrderNumber);
        Assert.Equal("Spring Musical Costumes", order.Description);
    }

    [Fact]
    public async Task GetOrder_WithCrossOrganizationAccess_ReturnsNotFound()
    {
        // Arrange - User from org2 trying to access org1's order
        var orderId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        SetupUserClaims("22222222-2222-2222-2222-222222222222", "Director");

        // Act
        var result = await _controller.GetOrder(orderId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetOrder_WithColorGarbStaff_CanAccessAnyOrder()
    {
        // Arrange
        var orderId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        SetupUserClaims(null, "ColorGarbStaff");

        // Act
        var result = await _controller.GetOrder(orderId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var order = Assert.IsType<OrderDto>(okResult.Value);
        
        Assert.Equal(orderId, order.Id);
        Assert.Equal("CG-2023-001", order.OrderNumber);
    }

    [Fact]
    public async Task GetOrder_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        // Act
        var result = await _controller.GetOrder(nonExistentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetOrder_WithNoOrganizationAndNonStaff_ReturnsForbid()
    {
        // Arrange
        var orderId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        SetupUserClaims(null, "Director");

        // Act
        var result = await _controller.GetOrder(orderId);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetOrders_DefaultFilter_ReturnsOnlyActiveOrders()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        // Act
        var result = await _controller.GetOrders();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var orders = Assert.IsAssignableFrom<List<OrderDto>>(okResult.Value);

        // Should only return active orders by default
        Assert.All(orders, order => Assert.True(order.IsActive));
    }

    #region CreateOrder Tests - Story 9A.3

    [Fact]
    public async Task CreateOrder_WithValidRequest_CreatesOrderSuccessfully()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Test Order for Director",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = true,
            Notes = "Test notes for the order"
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        Assert.Equal(request.Description, order.Description);
        Assert.Equal("Design Proposal", order.CurrentStage);
        Assert.Equal("Pending Design Approval", order.PaymentStatus);
        Assert.True(order.IsActive);
        Assert.Null(order.TotalAmount);
        Assert.StartsWith("CG-", order.OrderNumber);

        // Verify order was created in database
        var dbOrder = await _context.Orders.FirstOrDefaultAsync(o => o.Id == order.Id);
        Assert.NotNull(dbOrder);
        Assert.Equal(request.Description, dbOrder.Description);
    }

    [Fact]
    public async Task CreateOrder_WithFinanceRole_CreatesOrderSuccessfully()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Finance");

        var request = new CreateOrderRequest
        {
            Description = "Test Order for Finance",
            MeasurementDate = DateTime.UtcNow.AddDays(5),
            DeliveryDate = DateTime.UtcNow.AddDays(25),
            NeedsSample = false,
            Notes = null
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        Assert.Equal(request.Description, order.Description);
        Assert.Equal("Design Proposal", order.CurrentStage);
        Assert.Equal("Pending Design Approval", order.PaymentStatus);
    }

    [Fact]
    public async Task CreateOrder_WithInvalidDeliveryDate_ReturnsBadRequest()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(15),
            DeliveryDate = DateTime.UtcNow.AddDays(10), // Before measurement date
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var response = badRequestResult.Value;
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateOrder_WithPastMeasurementDate_ReturnsBadRequest()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(-1), // Past date
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var response = badRequestResult.Value;
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateOrder_WithPastDeliveryDate_ReturnsBadRequest()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(-1), // Past date
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var response = badRequestResult.Value;
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateOrder_WithoutOrganization_ReturnsBadRequest()
    {
        // Arrange
        SetupUserClaims(null, "Director"); // No organization

        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var response = badRequestResult.Value;
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateOrder_GeneratesUniqueOrderNumbers()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request1 = new CreateOrderRequest
        {
            Description = "First Order",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        var request2 = new CreateOrderRequest
        {
            Description = "Second Order",
            MeasurementDate = DateTime.UtcNow.AddDays(15),
            DeliveryDate = DateTime.UtcNow.AddDays(35),
            NeedsSample = true
        };

        // Act
        var result1 = await _controller.CreateOrder(request1);
        var result2 = await _controller.CreateOrder(request2);

        // Assert
        var order1 = Assert.IsType<OrderDto>(((CreatedAtActionResult)result1).Value);
        var order2 = Assert.IsType<OrderDto>(((CreatedAtActionResult)result2).Value);

        Assert.NotEqual(order1.OrderNumber, order2.OrderNumber);
        Assert.StartsWith("CG-", order1.OrderNumber);
        Assert.StartsWith("CG-", order2.OrderNumber);
    }

    [Fact]
    public async Task CreateOrder_CreatesStageHistoryEntry()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Test Order with History",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        // Verify stage history entry was created
        var stageHistory = await _context.OrderStageHistory
            .FirstOrDefaultAsync(sh => sh.OrderId == order.Id);

        Assert.NotNull(stageHistory);
        Assert.Equal("Design Proposal", stageHistory.Stage);
        Assert.Equal("Initial order creation", stageHistory.ChangeReason);
    }

    [Fact]
    public async Task CreateOrder_BuildsNotesCorrectly()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var measurementDate = DateTime.UtcNow.AddDays(10);
        var deliveryDate = DateTime.UtcNow.AddDays(30);

        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = measurementDate,
            DeliveryDate = deliveryDate,
            NeedsSample = true,
            Notes = "Custom notes for this order"
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        Assert.Contains($"Measurements scheduled for: {measurementDate:yyyy-MM-dd}", order.Notes);
        Assert.Contains($"Delivery needed by: {deliveryDate:yyyy-MM-dd}", order.Notes);
        Assert.Contains("Sample requested prior to production", order.Notes);
        Assert.Contains("Additional Notes: Custom notes for this order", order.Notes);
    }

    [Fact]
    public async Task CreateOrder_CallsAuditService()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var request = new CreateOrderRequest
        {
            Description = "Audit Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);

        // Verify audit service was called
        _mockAuditService.Verify(x => x.LogRoleAccessAttemptAsync(
            It.IsAny<Guid>(),
            It.IsAny<UserRole>(),
            "POST /api/orders",
            "POST",
            true,
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task CreateOrder_WithMaxLengthDescription_CreatesSuccessfully()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var maxDescription = new string('A', 500); // Max 500 characters
        var request = new CreateOrderRequest
        {
            Description = maxDescription,
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        Assert.Equal(maxDescription, order.Description);
    }

    [Fact]
    public async Task CreateOrder_WithMaxLengthNotes_CreatesSuccessfully()
    {
        // Arrange
        SetupUserClaims("11111111-1111-1111-1111-111111111111", "Director");

        var maxNotes = new string('B', 2000); // Max 2000 characters
        var request = new CreateOrderRequest
        {
            Description = "Test Order",
            MeasurementDate = DateTime.UtcNow.AddDays(10),
            DeliveryDate = DateTime.UtcNow.AddDays(30),
            NeedsSample = false,
            Notes = maxNotes
        };

        // Act
        var result = await _controller.CreateOrder(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var order = Assert.IsType<OrderDto>(createdResult.Value);

        Assert.Contains(maxNotes, order.Notes);
    }

    #endregion

    public void Dispose()
    {
        _context.Dispose();
    }
}