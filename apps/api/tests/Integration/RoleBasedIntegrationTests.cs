using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using ColorGarbApi.Controllers;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Comprehensive integration tests for role-based access control.
/// Tests authentication, authorization, and cross-organization data isolation.
/// </summary>
public class RoleBasedIntegrationTests : IClassFixture<TestWebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    // Test user IDs from seeded data
    private readonly Guid _clientUserId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private readonly Guid _adminUserId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private readonly Guid _org1Id = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private readonly Guid _org2Id = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private readonly Guid _order1Id = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private readonly Guid _order2Id = Guid.Parse("66666666-6666-6666-6666-666666666666");

    public RoleBasedIntegrationTests(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    #region Helper Methods

    /// <summary>
    /// Creates a JWT token for testing with specified role and organization
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="email">User email</param>
    /// <param name="role">User role</param>
    /// <param name="organizationId">Organization ID (optional)</param>
    /// <returns>JWT token string</returns>
    private string CreateTestJwtToken(Guid userId, string email, string role, Guid? organizationId = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-for-integration-testing-purposes-must-be-long-enough"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role),
            new("userId", userId.ToString()),
            new("email", email)
        };

        if (organizationId.HasValue)
        {
            claims.Add(new Claim("organizationId", organizationId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: "TestIssuer",
            audience: "TestAudience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Sets the authorization header with a JWT token
    /// </summary>
    /// <param name="token">JWT token</param>
    private void SetAuthorizationHeader(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Clears the authorization header
    /// </summary>
    private void ClearAuthorizationHeader()
    {
        _client.DefaultRequestHeaders.Authorization = null;
    }

    #endregion

    #region Authentication Tests

    [Fact]
    public async Task GetOrders_WithoutToken_Returns401()
    {
        // Arrange
        ClearAuthorizationHeader();

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetOrders_WithValidToken_Returns200()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrders_WithInvalidToken_Returns401()
    {
        // Arrange
        SetAuthorizationHeader("invalid-token");

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    #endregion

    #region Organization Data Isolation Tests

    [Fact]
    public async Task GetOrders_ClientUser_OnlySeesOwnOrganizationOrders()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        var orders = JsonSerializer.Deserialize<OrderDto[]>(content, _jsonOptions);
        
        Assert.NotNull(orders);
        Assert.All(orders, order => Assert.Equal("Test High School", order.OrganizationName));
    }

    [Fact]
    public async Task GetOrder_ClientUser_CanAccessOwnOrganizationOrder()
    {
        // Arrange - Order1 belongs to Org1, user belongs to Org1
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/orders/{_order1Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrder_ClientUser_CannotAccessOtherOrganizationOrder()
    {
        // Arrange - Order2 belongs to Org2, user belongs to Org1
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/orders/{_order2Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    #endregion

    #region Admin Role Authorization Tests

    [Fact]
    public async Task GetAdminOrders_WithClientRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders/admin/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAdminOrders_WithAdminRole_Returns200()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders/admin/orders");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAdminOrders_AdminUser_CanSeeAllOrganizationOrders()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders/admin/orders");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        var adminResponse = JsonSerializer.Deserialize<AdminOrdersResponse>(content, _jsonOptions);
        
        Assert.NotNull(adminResponse);
        Assert.NotNull(adminResponse.Orders);
        Assert.True(adminResponse.Orders.Count >= 2); // Should see orders from both organizations
        
        var orgNames = adminResponse.Orders.Select(o => o.OrganizationName).Distinct().ToList();
        Assert.Contains("Test High School", orgNames);
        Assert.Contains("Test Theater Company", orgNames);
    }

    [Fact]
    public async Task UpdateOrderStage_WithClientRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        var updateRequest = new UpdateOrderStageRequest
        {
            Stage = "Cutting",
            Reason = "Test update"
        };

        var json = JsonSerializer.Serialize(updateRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PatchAsync($"/api/orders/{_order1Id}/admin", content);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateOrderStage_WithAdminRole_Returns204()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var updateRequest = new UpdateOrderStageRequest
        {
            Stage = "Cutting",
            Reason = "Test admin update"
        };

        var json = JsonSerializer.Serialize(updateRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PatchAsync($"/api/orders/{_order1Id}/admin", content);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task BulkUpdateOrders_WithClientRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        var bulkRequest = new BulkUpdateRequest
        {
            OrderIds = new List<Guid> { _order1Id },
            Stage = "QualityControl",
            Reason = "Test bulk update"
        };

        var json = JsonSerializer.Serialize(bulkRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/orders/admin/orders/bulk-update", content);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BulkUpdateOrders_WithAdminRole_Returns200()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var bulkRequest = new BulkUpdateRequest
        {
            OrderIds = new List<Guid> { _order1Id },
            Stage = "QualityControl",
            Reason = "Test admin bulk update"
        };

        var json = JsonSerializer.Serialize(bulkRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/orders/admin/orders/bulk-update", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    #endregion

    #region Stage History Integration Tests

    [Fact]
    public async Task GetOrder_ReturnsStageHistoryData()
    {
        // Arrange
        var token = CreateTestJwtToken(_clientUserId, "client@school.edu", "Director", _org1Id);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/orders/{_order1Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        var order = JsonSerializer.Deserialize<OrderDetailDto>(content, _jsonOptions);
        
        Assert.NotNull(order);
        Assert.NotNull(order.StageHistory);
        Assert.True(order.StageHistory.Count >= 2); // Should have seeded stage history
        
        var designStage = order.StageHistory.FirstOrDefault(sh => sh.Stage == "DesignProposal");
        Assert.NotNull(designStage);
        Assert.Equal("Test Admin", designStage.UpdatedBy);
    }

    [Fact]
    public async Task UpdateOrderStage_CreatesStageHistoryEntry()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // First, get the order to check current stage history count
        var initialResponse = await _client.GetAsync($"/api/orders/{_order1Id}");
        var initialContent = await initialResponse.Content.ReadAsStringAsync();
        var initialOrder = JsonSerializer.Deserialize<OrderDetailDto>(initialContent, _jsonOptions);
        var initialHistoryCount = initialOrder?.StageHistory?.Count ?? 0;

        var updateRequest = new UpdateOrderStageRequest
        {
            Stage = "Finishing",
            Reason = "Integration test stage update"
        };

        var json = JsonSerializer.Serialize(updateRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act - Update the order stage
        var updateResponse = await _client.PatchAsync($"/api/orders/{_order1Id}/admin", content);
        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);

        // Get the updated order to verify stage history was created
        var finalResponse = await _client.GetAsync($"/api/orders/{_order1Id}");
        var finalContent = await finalResponse.Content.ReadAsStringAsync();
        var finalOrder = JsonSerializer.Deserialize<OrderDetailDto>(finalContent, _jsonOptions);

        // Assert
        Assert.NotNull(finalOrder);
        Assert.NotNull(finalOrder.StageHistory);
        Assert.Equal(initialHistoryCount + 1, finalOrder.StageHistory.Count);
        
        var newStageEntry = finalOrder.StageHistory.FirstOrDefault(sh => sh.Stage == "Finishing");
        Assert.NotNull(newStageEntry);
        Assert.Equal("Test Admin", newStageEntry.UpdatedBy);
        Assert.Contains("Integration test stage update", newStageEntry.Notes);
    }

    #endregion

    #region Cross-Organization Admin Access Tests

    [Fact]
    public async Task AdminUser_CanUpdateOrdersFromAnyOrganization()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var updateRequest = new UpdateOrderStageRequest
        {
            Stage = "FinalInspection",
            Reason = "Cross-organization admin update"
        };

        var json = JsonSerializer.Serialize(updateRequest, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act - Update order from Org2 (admin user has no organization restriction)
        var response = await _client.PatchAsync($"/api/orders/{_order2Id}/admin", content);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task AdminUser_CanFilterOrdersByOrganization()
    {
        // Arrange
        var token = CreateTestJwtToken(_adminUserId, "admin@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act - Filter orders by Org1
        var response = await _client.GetAsync($"/api/orders/admin/orders?organizationId={_org1Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        var adminResponse = JsonSerializer.Deserialize<AdminOrdersResponse>(content, _jsonOptions);
        
        Assert.NotNull(adminResponse);
        Assert.NotNull(adminResponse.Orders);
        Assert.All(adminResponse.Orders, order => 
            Assert.Equal(_org1Id.ToString(), order.OrganizationId.ToString()));
    }

    #endregion
}

#region DTOs for Testing

public class OrderDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CurrentStage { get; set; } = string.Empty;
    public DateTime OriginalShipDate { get; set; }
    public DateTime CurrentShipDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
}

public class OrderDetailDto : OrderDto
{
    public List<StageHistoryDto> StageHistory { get; set; } = new();
}

public class StageHistoryDto
{
    public Guid Id { get; set; }
    public string Stage { get; set; } = string.Empty;
    public DateTime EnteredAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? PreviousShipDate { get; set; }
    public DateTime? NewShipDate { get; set; }
    public string? ChangeReason { get; set; }
}

public class AdminOrderDto : OrderDto
{
    public Guid OrganizationId { get; set; }
}

public class AdminOrdersResponse
{
    public List<AdminOrderDto> Orders { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class UpdateOrderStageRequest
{
    public string Stage { get; set; } = string.Empty;
    public DateTime? ShipDate { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class BulkUpdateRequest
{
    public List<Guid> OrderIds { get; set; } = new();
    public string? Stage { get; set; }
    public DateTime? ShipDate { get; set; }
    public string Reason { get; set; } = string.Empty;
}

#endregion