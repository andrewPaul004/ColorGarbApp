using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for admin-specific OrdersController endpoints.
/// Tests cross-organization access, bulk operations, and audit logging.
/// </summary>
public class AdminOrdersControllerTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Mock<ILogger<OrdersController>> _mockLogger;
    private readonly Mock<IAuditService> _mockAuditService;
    private readonly Mock<IProductionTrackingService> _mockProductionTrackingService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly OrdersController _controller;

    /// <summary>
    /// Test setup with in-memory database and mocked dependencies
    /// </summary>
    public AdminOrdersControllerTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);
        _mockLogger = new Mock<ILogger<OrdersController>>();
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

        _controller = new OrdersController(_context, _mockLogger.Object, _mockAuditService.Object, _mockProductionTrackingService.Object, _mockEmailService.Object);

        // Setup ColorGarb staff user context
        SetupAdminUserContext();
    }

    /// <summary>
    /// Test that admin can retrieve orders from all organizations
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_AsColorGarbStaff_ReturnsAllOrders()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, null, null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Equal(2, response.Orders.Count); // Both test orders
        Assert.Equal(2, response.TotalCount);
        Assert.Equal(1, response.Page);
        Assert.Equal(50, response.PageSize);
        Assert.Single(response.Organizations); // One test organization

        // Verify audit logging was called
        _mockAuditService.Verify(x => x.LogRoleAccessAttemptAsync(
            It.IsAny<Guid>(),
            UserRole.ColorGarbStaff,
            "GET /api/orders/admin/orders",
            "GET",
            true,
            It.IsAny<Guid?>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    /// <summary>
    /// Test that admin can filter orders by organization
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithOrganizationFilter_ReturnsFilteredOrders()
    {
        // Arrange
        await SeedTestData();
        var orgId = GetTestOrganizationId();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(orgId, null, null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Equal(2, response.Orders.Count); // All orders are from same org in test data
        Assert.All(response.Orders, order => Assert.Equal(orgId, order.OrganizationId));
    }

    /// <summary>
    /// Test that admin can filter orders by Active status
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithActiveStatusFilter_ReturnsActiveOrders()
    {
        // Arrange
        await SeedTestDataWithMultipleStatuses();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, "Active", null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Equal(2, response.Orders.Count); // Only active orders
        Assert.All(response.Orders, order => Assert.True(order.IsActive));
    }

    /// <summary>
    /// Test that admin can filter orders by Completed status
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithCompletedStatusFilter_ReturnsCompletedOrders()
    {
        // Arrange
        await SeedTestDataWithMultipleStatuses();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, "Completed", null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Single(response.Orders); // Only completed orders
        var completedOrder = response.Orders.First();
        Assert.False(completedOrder.IsActive);
        Assert.Equal("Delivery", completedOrder.CurrentStage);
    }

    /// <summary>
    /// Test that admin can filter orders by Cancelled status
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithCancelledStatusFilter_ReturnsCancelledOrders()
    {
        // Arrange
        await SeedTestDataWithMultipleStatuses();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, "Cancelled", null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Single(response.Orders); // Only cancelled orders
        var cancelledOrder = response.Orders.First();
        Assert.False(cancelledOrder.IsActive);
        Assert.NotEqual("Delivery", cancelledOrder.CurrentStage);
        Assert.NotEqual("Ship Order", cancelledOrder.CurrentStage);
    }

    /// <summary>
    /// Test that admin can filter orders by legacy Inactive status
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithInactiveStatusFilter_ReturnsInactiveOrders()
    {
        // Arrange
        await SeedTestDataWithMultipleStatuses();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, "Inactive", null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Equal(2, response.Orders.Count); // Both completed and cancelled orders
        Assert.All(response.Orders, order => Assert.False(order.IsActive));
    }

    /// <summary>
    /// Test that no status filter defaults to Active orders only
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithoutStatusFilter_ReturnsActiveOrdersOnly()
    {
        // Arrange
        await SeedTestDataWithMultipleStatuses();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, null, null, 1, 50);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);
        
        Assert.Equal(2, response.Orders.Count); // Only active orders by default
        Assert.All(response.Orders, order => Assert.True(order.IsActive));
    }

    /// <summary>
    /// Test that admin can update order stage with proper validation
    /// </summary>
    [Fact]
    public async Task UpdateOrderStageAdmin_ValidTransition_ReturnsNoContent()
    {
        // Arrange
        await SeedTestData();
        var orderId = GetTestOrderId();
        var request = new UpdateOrderStageRequest
        {
            Stage = "Design Proposal",
            ShipDate = DateTime.UtcNow.AddDays(30),
            Reason = "Client approved initial consultation"
        };

        // Act
        var result = await _controller.UpdateOrderStageAdmin(orderId, request);

        // Assert
        Assert.IsType<NoContentResult>(result);

        // Verify the order was updated
        var updatedOrder = await _context.Orders.FindAsync(orderId);
        Assert.NotNull(updatedOrder);
        Assert.Equal("Design Proposal", updatedOrder.CurrentStage);

        // Verify audit logging was called for successful update
        _mockAuditService.Verify(x => x.LogRoleAccessAttemptAsync(
            It.IsAny<Guid>(),
            UserRole.ColorGarbStaff,
            It.Is<string>(s => s.Contains($"/api/orders/{orderId}/admin")),
            "PATCH",
            true,
            It.IsAny<Guid?>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    /// <summary>
    /// Test that invalid stage transitions are rejected
    /// </summary>
    [Fact]
    public async Task UpdateOrderStageAdmin_InvalidTransition_ReturnsBadRequest()
    {
        // Arrange
        await SeedTestData();
        var orderId = GetTestOrderId();
        var request = new UpdateOrderStageRequest
        {
            Stage = "Delivery", // Invalid jump from Initial Consultation
            Reason = "Invalid test transition"
        };

        // Act
        var result = await _controller.UpdateOrderStageAdmin(orderId, request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var errorMessage = Assert.IsAssignableFrom<object>(badRequestResult.Value);
        Assert.Contains("Invalid stage transition", errorMessage.ToString());

        // Verify audit logging was called for failed attempt
        _mockAuditService.Verify(x => x.LogRoleAccessAttemptAsync(
            It.IsAny<Guid>(),
            UserRole.ColorGarbStaff,
            It.Is<string>(s => s.Contains($"/api/orders/{orderId}/admin")),
            "PATCH",
            false,
            It.IsAny<Guid?>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    /// <summary>
    /// Test that non-existent order returns NotFound
    /// </summary>
    [Fact]
    public async Task UpdateOrderStageAdmin_OrderNotFound_ReturnsNotFound()
    {
        // Arrange
        var nonExistentOrderId = Guid.NewGuid();
        var request = new UpdateOrderStageRequest
        {
            Stage = "Design Proposal",
            Reason = "Test update"
        };

        // Act
        var result = await _controller.UpdateOrderStageAdmin(nonExistentOrderId, request);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Contains("Order not found", notFoundResult.Value?.ToString());

        // Verify audit logging was called for failed attempt
        _mockAuditService.Verify(x => x.LogRoleAccessAttemptAsync(
            It.IsAny<Guid>(),
            UserRole.ColorGarbStaff,
            It.Is<string>(s => s.Contains($"/api/orders/{nonExistentOrderId}/admin")),
            "PATCH",
            false,
            null,
            It.IsAny<string>(),
            It.IsAny<string>(),
            "Order not found",
            It.IsAny<string>()
        ), Times.Once);
    }

    /// <summary>
    /// Test bulk update with mixed success and failure scenarios
    /// </summary>
    [Fact]
    public async Task BulkUpdateOrders_MixedResults_ReturnsPartialSuccess()
    {
        // Arrange
        await SeedTestData();
        var validOrderId = GetTestOrderId();
        var invalidOrderId = Guid.NewGuid(); // Non-existent order

        var request = new BulkUpdateRequest
        {
            OrderIds = new List<Guid> { validOrderId, invalidOrderId },
            Stage = "Design Proposal",
            Reason = "Bulk update test"
        };

        // Act
        var result = await _controller.BulkUpdateOrders(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<BulkUpdateResponse>(okResult.Value);

        Assert.Single(response.Successful);
        Assert.Single(response.Failed);
        Assert.Equal(validOrderId.ToString(), response.Successful.First());
        Assert.Equal(invalidOrderId.ToString(), response.Failed.First().OrderId);
        Assert.Equal("Order not found", response.Failed.First().Error);

        // Verify successful order was updated
        var updatedOrder = await _context.Orders.FindAsync(validOrderId);
        Assert.NotNull(updatedOrder);
        Assert.Equal("Design Proposal", updatedOrder.CurrentStage);
    }

    /// <summary>
    /// Test bulk update with empty order list returns BadRequest
    /// </summary>
    [Fact]
    public async Task BulkUpdateOrders_EmptyOrderList_ReturnsBadRequest()
    {
        // Arrange
        var request = new BulkUpdateRequest
        {
            OrderIds = new List<Guid>(),
            Stage = "Design Proposal",
            Reason = "Empty test"
        };

        // Act
        var result = await _controller.BulkUpdateOrders(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("At least one order ID is required", badRequestResult.Value?.ToString());
    }

    /// <summary>
    /// Test pagination functionality
    /// </summary>
    [Fact]
    public async Task GetAllOrdersForAdmin_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _controller.GetAllOrdersForAdmin(null, null, null, 1, 1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AdminOrdersResponse>(okResult.Value);

        Assert.Single(response.Orders);
        Assert.Equal(2, response.TotalCount); // Total count should still be 2
        Assert.Equal(1, response.Page);
        Assert.Equal(1, response.PageSize);
    }

    /// <summary>
    /// Sets up ColorGarb staff user context for testing admin endpoints
    /// </summary>
    private void SetupAdminUserContext()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "11111111-1111-1111-1111-111111111111"),
            new(ClaimTypes.Role, "ColorGarbStaff"),
            new("organizationId", Guid.NewGuid().ToString())
        };

        var identity = new ClaimsIdentity(claims, "test");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        // Mock HTTP context for audit logging
        _controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = 
            System.Net.IPAddress.Parse("127.0.0.1");
        _controller.ControllerContext.HttpContext.Request.Headers["User-Agent"] = "Test Agent";
    }

    /// <summary>
    /// Seeds test data for admin endpoint testing
    /// </summary>
    private async Task SeedTestData()
    {
        var orgId = GetTestOrganizationId();

        // Create test organization
        var organization = new Organization
        {
            Id = orgId,
            Name = "Test Theater Company",
            Type = "theater",
            ContactEmail = "test@theater.com",
            ContactPhone = "(555) 123-4567",
            Address = "123 Theater St",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(organization);

        // Create test orders
        var order1 = new Order
        {
            Id = GetTestOrderId(),
            OrderNumber = "CG-TEST-001",
            OrganizationId = orgId,
            Description = "Test Order 1",
            CurrentStage = "Initial Consultation",
            OriginalShipDate = DateTime.UtcNow.AddDays(60),
            CurrentShipDate = DateTime.UtcNow.AddDays(60),
            TotalAmount = 1000.00m,
            PaymentStatus = "Pending",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var order2 = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "CG-TEST-002",
            OrganizationId = orgId,
            Description = "Test Order 2",
            CurrentStage = "Initial Consultation",
            OriginalShipDate = DateTime.UtcNow.AddDays(90),
            CurrentShipDate = DateTime.UtcNow.AddDays(90),
            TotalAmount = 1500.00m,
            PaymentStatus = "Pending",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Orders.AddRange(order1, order2);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Gets a consistent test organization ID for testing
    /// </summary>
    private static Guid GetTestOrganizationId() => Guid.Parse("44444444-4444-4444-4444-444444444444");

    /// <summary>
    /// Gets a consistent test order ID for testing
    /// </summary>
    private static Guid GetTestOrderId() => Guid.Parse("55555555-5555-5555-5555-555555555555");

    /// <summary>
    /// Seeds test data with orders in different statuses for status filtering tests
    /// </summary>
    private async Task SeedTestDataWithMultipleStatuses()
    {
        var orgId = GetTestOrganizationId();

        // Create test organization
        var organization = new Organization
        {
            Id = orgId,
            Name = "Test Theater Company",
            Type = "theater",
            ContactEmail = "test@theater.com",
            ContactPhone = "(555) 123-4567",
            Address = "123 Theater St",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(organization);

        // Create active orders
        var activeOrder1 = new Order
        {
            Id = GetTestOrderId(),
            OrderNumber = "CG-ACTIVE-001",
            OrganizationId = orgId,
            Description = "Active Order 1",
            CurrentStage = "Production Planning",
            OriginalShipDate = DateTime.UtcNow.AddDays(60),
            CurrentShipDate = DateTime.UtcNow.AddDays(60),
            TotalAmount = 1000.00m,
            PaymentStatus = "Pending",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var activeOrder2 = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "CG-ACTIVE-002",
            OrganizationId = orgId,
            Description = "Active Order 2",
            CurrentStage = "Sewing",
            OriginalShipDate = DateTime.UtcNow.AddDays(90),
            CurrentShipDate = DateTime.UtcNow.AddDays(90),
            TotalAmount = 1500.00m,
            PaymentStatus = "Paid",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create completed order (inactive with final stage)
        var completedOrder = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "CG-COMPLETED-001",
            OrganizationId = orgId,
            Description = "Completed Order",
            CurrentStage = "Delivery",
            OriginalShipDate = DateTime.UtcNow.AddDays(-30),
            CurrentShipDate = DateTime.UtcNow.AddDays(-30),
            TotalAmount = 2000.00m,
            PaymentStatus = "Paid",
            IsActive = false,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-30)
        };

        // Create cancelled order (inactive without final stage)
        var cancelledOrder = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "CG-CANCELLED-001",
            OrganizationId = orgId,
            Description = "Cancelled Order",
            CurrentStage = "Design Proposal",
            OriginalShipDate = DateTime.UtcNow.AddDays(-15),
            CurrentShipDate = DateTime.UtcNow.AddDays(-15),
            TotalAmount = 800.00m,
            PaymentStatus = "Refunded",
            IsActive = false,
            CreatedAt = DateTime.UtcNow.AddDays(-45),
            UpdatedAt = DateTime.UtcNow.AddDays(-15)
        };

        _context.Orders.AddRange(activeOrder1, activeOrder2, completedOrder, cancelledOrder);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Cleanup test database
    /// </summary>
    public void Dispose()
    {
        _context.Dispose();
    }
}