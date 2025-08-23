using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Data;
using ColorGarbApi.Models;

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

    public OrdersControllerTests()
    {
        // Create in-memory database for testing
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);
        _logger = new LoggerFactory().CreateLogger<OrdersController>();
        _controller = new OrdersController(_context, _logger);

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

    public void Dispose()
    {
        _context.Dispose();
    }
}