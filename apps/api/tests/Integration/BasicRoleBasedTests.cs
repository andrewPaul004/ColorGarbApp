using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Basic integration tests for role-based access control functionality.
/// Tests core authentication and authorization scenarios without complex database setup.
/// </summary>
public class BasicRoleBasedTests : IClassFixture<SimpleTestWebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public BasicRoleBasedTests(SimpleTestWebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    #region Helper Methods

    /// <summary>
    /// Creates a JWT token for testing with specified role
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
    public async Task GetOrders_WithInvalidToken_Returns401()
    {
        // Arrange
        SetAuthorizationHeader("invalid-token");

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetOrders_WithValidClientToken_ReturnsSuccessOrNotFound()
    {
        // Arrange
        var token = CreateTestJwtToken(
            Guid.NewGuid(), 
            "client@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        // Should either return 200 with empty results or 404, both are valid for role-based access
        Assert.True(response.StatusCode == HttpStatusCode.OK || 
                   response.StatusCode == HttpStatusCode.NotFound,
                   $"Expected 200 or 404, got {response.StatusCode}");
    }

    #endregion

    #region Admin Role Authorization Tests

    [Fact]
    public async Task GetAdminOrders_WithoutAdminRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(
            Guid.NewGuid(), 
            "client@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders/admin/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAdminOrders_WithAdminRole_ReturnsSuccessOrEmpty()
    {
        // Arrange
        var token = CreateTestJwtToken(
            Guid.NewGuid(), 
            "admin@colorgarb.com", 
            "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/orders/admin/orders");

        // Assert
        // Should return 200 (may be empty results) for admin user
        Assert.True(response.StatusCode == HttpStatusCode.OK,
                   $"Expected 200, got {response.StatusCode}");
    }

    [Fact]
    public async Task UpdateOrderStage_WithoutAdminRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(
            Guid.NewGuid(), 
            "client@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(token);

        var updateRequest = new
        {
            stage = "Cutting",
            reason = "Test update"
        };

        var json = System.Text.Json.JsonSerializer.Serialize(updateRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PatchAsync($"/api/orders/{Guid.NewGuid()}/admin", content);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task BulkUpdateOrders_WithoutAdminRole_Returns403()
    {
        // Arrange
        var token = CreateTestJwtToken(
            Guid.NewGuid(), 
            "client@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(token);

        var bulkRequest = new
        {
            orderIds = new[] { Guid.NewGuid() },
            stage = "QualityControl",
            reason = "Test bulk update"
        };

        var json = System.Text.Json.JsonSerializer.Serialize(bulkRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await _client.PostAsync("/api/orders/admin/orders/bulk-update", content);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region JWT Token Validation Tests

    [Fact]
    public async Task API_RejectsExpiredTokens()
    {
        // Arrange - Create expired token
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-secret-key-for-integration-testing-purposes-must-be-long-enough"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "Director")
        };

        var expiredToken = new JwtSecurityToken(
            issuer: "TestIssuer",
            audience: "TestAudience",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(-1), // Expired token
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(expiredToken);
        SetAuthorizationHeader(tokenString);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task API_RejectsTokensWithWrongSignature()
    {
        // Arrange - Create token with different signing key
        var wrongKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("wrong-secret-key-for-testing-different-signature"));
        var creds = new SigningCredentials(wrongKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "Director")
        };

        var wrongSignedToken = new JwtSecurityToken(
            issuer: "TestIssuer",
            audience: "TestAudience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(wrongSignedToken);
        SetAuthorizationHeader(tokenString);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task API_AcceptsValidTokensWithDifferentRoles()
    {
        // Test Director role
        var directorToken = CreateTestJwtToken(
            Guid.NewGuid(), 
            "director@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(directorToken);

        var directorResponse = await _client.GetAsync("/api/orders");
        Assert.True(directorResponse.StatusCode == HttpStatusCode.OK || 
                   directorResponse.StatusCode == HttpStatusCode.NotFound);

        // Test Finance role
        var financeToken = CreateTestJwtToken(
            Guid.NewGuid(), 
            "finance@school.edu", 
            "Finance", 
            Guid.NewGuid());
        SetAuthorizationHeader(financeToken);

        var financeResponse = await _client.GetAsync("/api/orders");
        Assert.True(financeResponse.StatusCode == HttpStatusCode.OK || 
                   financeResponse.StatusCode == HttpStatusCode.NotFound);

        // Test ColorGarbStaff role
        var adminToken = CreateTestJwtToken(
            Guid.NewGuid(), 
            "admin@colorgarb.com", 
            "ColorGarbStaff");
        SetAuthorizationHeader(adminToken);

        var adminResponse = await _client.GetAsync("/api/orders");
        Assert.True(adminResponse.StatusCode == HttpStatusCode.OK || 
                   adminResponse.StatusCode == HttpStatusCode.NotFound);
    }

    #endregion

    #region Cross-Organization Access Tests

    [Fact]
    public async Task AdminUsers_CanAccessCrossOrganizationEndpoints()
    {
        // Arrange
        var adminToken = CreateTestJwtToken(
            Guid.NewGuid(), 
            "admin@colorgarb.com", 
            "ColorGarbStaff");
        SetAuthorizationHeader(adminToken);

        // Act & Assert - Admin endpoints should be accessible
        var adminOrdersResponse = await _client.GetAsync("/api/orders/admin/orders");
        Assert.Equal(HttpStatusCode.OK, adminOrdersResponse.StatusCode);

        // Admin can filter by organization
        var filteredResponse = await _client.GetAsync($"/api/orders/admin/orders?organizationId={Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.OK, filteredResponse.StatusCode);

        // Admin can access orders endpoint (though may be empty)
        var ordersResponse = await _client.GetAsync("/api/orders");
        Assert.True(ordersResponse.StatusCode == HttpStatusCode.OK || 
                   ordersResponse.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ClientUsers_CannotAccessCrossOrganizationEndpoints()
    {
        // Arrange
        var clientToken = CreateTestJwtToken(
            Guid.NewGuid(), 
            "client@school.edu", 
            "Director", 
            Guid.NewGuid());
        SetAuthorizationHeader(clientToken);

        // Act & Assert - Admin endpoints should be forbidden
        var adminOrdersResponse = await _client.GetAsync("/api/orders/admin/orders");
        Assert.Equal(HttpStatusCode.Forbidden, adminOrdersResponse.StatusCode);

        var filteredResponse = await _client.GetAsync($"/api/orders/admin/orders?organizationId={Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Forbidden, filteredResponse.StatusCode);
    }

    #endregion
}