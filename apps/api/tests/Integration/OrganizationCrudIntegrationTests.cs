using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models.DTOs;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Integration tests for Organization CRUD operations.
/// Tests complete workflows from HTTP request to database operations.
/// </summary>
public class OrganizationCrudIntegrationTests : IClassFixture<TestWebApplicationFactory<Program>>, IAsyncDisposable
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory<Program> _factory;
    private readonly ColorGarbDbContext _context;

    // Test data
    private readonly Guid _staffUserId = Guid.NewGuid();
    private readonly Guid _directorUserId = Guid.NewGuid();
    private readonly Guid _testOrganizationId = Guid.NewGuid();
    private readonly Guid _testOrganization2Id = Guid.NewGuid();

    public OrganizationCrudIntegrationTests(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

        // Get database context
        using var scope = factory.Services.CreateScope();
        _context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

        // Seed test data
        SeedTestData().Wait();
    }

    public async ValueTask DisposeAsync()
    {
        await CleanupTestData();
        _client?.Dispose();
    }

    /// <summary>
    /// Seeds initial test data for integration tests
    /// </summary>
    private async Task SeedTestData()
    {
        // Create test organizations
        var organization1 = new Organization
        {
            Id = _testOrganizationId,
            Name = "Integration Test School",
            Type = "school",
            ContactEmail = "test@school.edu",
            ContactPhone = "(555) 123-4567",
            Address = "123 Integration St, Test City, TC 12345",
            ShippingAddress = "456 Shipping Ave, Test City, TC 12345",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var organization2 = new Organization
        {
            Id = _testOrganization2Id,
            Name = "Integration Theater Company",
            Type = "theater",
            ContactEmail = "info@theater.com",
            Address = "789 Theater Blvd, Drama City, DC 67890",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-20),
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        };

        // Create test orders for statistics
        var order1 = new Order
        {
            Id = Guid.NewGuid(),
            OrganizationId = _testOrganizationId,
            TotalAmount = 1500.00m,
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var order2 = new Order
        {
            Id = Guid.NewGuid(),
            OrganizationId = _testOrganizationId,
            TotalAmount = 2500.00m,
            IsActive = false,
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };

        _context.Organizations.AddRange(organization1, organization2);
        _context.Orders.AddRange(order1, order2);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Cleans up test data after tests complete
    /// </summary>
    private async Task CleanupTestData()
    {
        var organizations = await _context.Organizations
            .Where(o => o.Name.Contains("Integration") || o.Name.Contains("Test") || o.Name.Contains("Bulk"))
            .ToListAsync();

        _context.Organizations.RemoveRange(organizations);

        var orders = await _context.Orders
            .Where(o => organizations.Select(org => org.Id).Contains(o.OrganizationId))
            .ToListAsync();

        _context.Orders.RemoveRange(orders);

        await _context.SaveChangesAsync();
    }

    #region Helper Methods

    /// <summary>
    /// Creates a JWT token for testing with specified role
    /// </summary>
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
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Sets authorization header for HTTP client
    /// </summary>
    private void SetAuthorizationHeader(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Creates HTTP content from object
    /// </summary>
    private static StringContent CreateJsonContent(object obj)
    {
        var json = JsonSerializer.Serialize(obj, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        return new StringContent(json, Encoding.UTF8, "application/json");
    }

    /// <summary>
    /// Deserializes HTTP response content
    /// </summary>
    private static async Task<T> DeserializeResponse<T>(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(content, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        })!;
    }

    #endregion

    #region GET /api/organizations Tests

    [Fact]
    public async Task GetAllOrganizations_WithColorGarbStaff_ReturnsAllActiveOrganizations()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organizations = await DeserializeResponse<List<OrganizationDto>>(response);
        Assert.NotNull(organizations);
        Assert.True(organizations.Count >= 2);
        Assert.Contains(organizations, o => o.Name == "Integration Test School");
        Assert.Contains(organizations, o => o.Name == "Integration Theater Company");
    }

    [Fact]
    public async Task GetAllOrganizations_WithDirectorRole_ReturnsForbidden()
    {
        // Arrange
        var token = CreateTestJwtToken(_directorUserId, "director@school.edu", "Director", _testOrganizationId);
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOrganizations_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange - Remove authorization header
        _client.DefaultRequestHeaders.Authorization = null;

        // Act
        var response = await _client.GetAsync("/api/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    #endregion

    #region GET /api/organizations/{id} Tests

    [Fact]
    public async Task GetOrganization_WithValidId_ReturnsOrganization()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/organizations/{_testOrganizationId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDto>(response);
        Assert.NotNull(organization);
        Assert.Equal(_testOrganizationId, organization.Id);
        Assert.Equal("Integration Test School", organization.Name);
        Assert.Equal("school", organization.Type);
        Assert.Equal("test@school.edu", organization.ContactEmail);
    }

    [Fact]
    public async Task GetOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/organizations/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    #endregion

    #region POST /api/organizations Tests

    [Fact]
    public async Task CreateOrganization_WithValidData_ReturnsCreatedOrganization()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var createDto = new CreateOrganizationDto
        {
            Name = "Integration Test New Organization",
            Type = "theater",
            ContactEmail = "new@integration.com",
            ContactPhone = "(555) 999-8888",
            Address = "321 New St, Integration City, IC 54321",
            ShippingAddress = "654 Ship Ave, Integration City, IC 54321"
        };

        // Act
        var response = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.NotNull(organization);
        Assert.Equal("Integration Test New Organization", organization.Name);
        Assert.Equal("theater", organization.Type);
        Assert.Equal("new@integration.com", organization.ContactEmail);
        Assert.Equal("(555) 999-8888", organization.ContactPhone);
        Assert.Equal("321 New St, Integration City, IC 54321", organization.Address);
        Assert.Equal("654 Ship Ave, Integration City, IC 54321", organization.ShippingAddress);
        Assert.True(organization.IsActive);
        Assert.Equal(0, organization.TotalOrders);
        Assert.Equal(0, organization.ActiveOrders);
        Assert.Equal(0, organization.TotalOrderValue);

        // Verify organization was created in database
        var dbOrganization = await _context.Organizations.FindAsync(organization.Id);
        Assert.NotNull(dbOrganization);
        Assert.Equal(createDto.Name, dbOrganization.Name);
    }

    [Fact]
    public async Task CreateOrganization_WithDuplicateName_ReturnsConflict()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var createDto = new CreateOrganizationDto
        {
            Name = "Integration Test School", // Already exists
            Type = "school",
            ContactEmail = "duplicate@test.com",
            Address = "123 Duplicate St"
        };

        // Act
        var response = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_WithInvalidData_ReturnsBadRequest()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var createDto = new CreateOrganizationDto
        {
            Name = "", // Invalid - empty name
            Type = "school",
            ContactEmail = "invalid-email", // Invalid email format
            Address = "123 Test St"
        };

        // Act
        var response = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_WithMinimalValidData_Success()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var createDto = new CreateOrganizationDto
        {
            Name = "Integration Minimal Org",
            Type = "other",
            ContactEmail = "minimal@test.com",
            Address = "123 Minimal St"
            // No optional fields
        };

        // Act
        var response = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.Equal("Integration Minimal Org", organization.Name);
        Assert.Null(organization.ContactPhone);
        Assert.Null(organization.ShippingAddress);
    }

    #endregion

    #region PUT /api/organizations/{id} Tests

    [Fact]
    public async Task UpdateOrganization_WithValidData_ReturnsUpdatedOrganization()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var updateDto = new UpdateOrganizationDto
        {
            Name = "Updated Integration School",
            Type = "theater",
            ContactEmail = "updated@school.edu",
            ContactPhone = "(555) 111-2222",
            Address = "456 Updated Ave, Updated City, UC 67890",
            ShippingAddress = "789 New Ship St, Updated City, UC 67890"
        };

        // Act
        var response = await _client.PutAsync($"/api/organizations/{_testOrganizationId}", CreateJsonContent(updateDto));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.Equal("Updated Integration School", organization.Name);
        Assert.Equal("theater", organization.Type);
        Assert.Equal("updated@school.edu", organization.ContactEmail);
        Assert.Equal("(555) 111-2222", organization.ContactPhone);

        // Verify statistics are calculated correctly
        Assert.Equal(2, organization.TotalOrders);
        Assert.Equal(1, organization.ActiveOrders);
        Assert.Equal(4000.00m, organization.TotalOrderValue);

        // Verify database was updated
        var dbOrganization = await _context.Organizations.FindAsync(_testOrganizationId);
        Assert.Equal("Updated Integration School", dbOrganization!.Name);
    }

    [Fact]
    public async Task UpdateOrganization_WithPartialData_UpdatesOnlyProvidedFields()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var updateDto = new UpdateOrganizationDto
        {
            Name = "Partially Updated School",
            ContactPhone = "(555) 333-4444"
            // Other fields not provided
        };

        // Act
        var response = await _client.PutAsync($"/api/organizations/{_testOrganizationId}", CreateJsonContent(updateDto));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.Equal("Partially Updated School", organization.Name);
        Assert.Equal("(555) 333-4444", organization.ContactPhone);
        // Original values should be preserved
        Assert.Equal("school", organization.Type);
        Assert.Equal("test@school.edu", organization.ContactEmail);
    }

    [Fact]
    public async Task UpdateOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);
        var nonExistentId = Guid.NewGuid();

        var updateDto = new UpdateOrganizationDto
        {
            Name = "Updated Name"
        };

        // Act
        var response = await _client.PutAsync($"/api/organizations/{nonExistentId}", CreateJsonContent(updateDto));

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateOrganization_WithDuplicateName_ReturnsConflict()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var updateDto = new UpdateOrganizationDto
        {
            Name = "Integration Theater Company" // Already exists for another organization
        };

        // Act
        var response = await _client.PutAsync($"/api/organizations/{_testOrganizationId}", CreateJsonContent(updateDto));

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    #endregion

    #region DELETE /api/organizations/{id} Tests

    [Fact]
    public async Task DeactivateOrganization_WithNoActiveOrders_Success()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Deactivate all orders for the test organization
        var orders = await _context.Orders.Where(o => o.OrganizationId == _testOrganizationId).ToListAsync();
        foreach (var order in orders)
        {
            order.IsActive = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var response = await _client.DeleteAsync($"/api/organizations/{_testOrganizationId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify organization is deactivated in database
        var dbOrganization = await _context.Organizations.FindAsync(_testOrganizationId);
        Assert.NotNull(dbOrganization);
        Assert.False(dbOrganization.IsActive);
    }

    [Fact]
    public async Task DeactivateOrganization_WithActiveOrders_ReturnsBadRequest()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Ensure organization has active orders
        var activeOrder = await _context.Orders.FirstAsync(o => o.OrganizationId == _testOrganizationId && o.IsActive);
        Assert.NotNull(activeOrder);

        // Act
        var response = await _client.DeleteAsync($"/api/organizations/{_testOrganizationId}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var errorContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Cannot deactivate organization with", errorContent);
        Assert.Contains("active orders", errorContent);

        // Verify organization remains active
        var dbOrganization = await _context.Organizations.FindAsync(_testOrganizationId);
        Assert.True(dbOrganization!.IsActive);
    }

    [Fact]
    public async Task DeactivateOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/api/organizations/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    #endregion

    #region GET /api/organizations/{id}/details Tests

    [Fact]
    public async Task GetOrganizationDetails_WithValidId_ReturnsDetailsWithStatistics()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/organizations/{_testOrganizationId}/details");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.NotNull(organization);
        Assert.Equal(_testOrganizationId, organization.Id);
        Assert.Equal("Integration Test School", organization.Name);

        // Verify statistics
        Assert.Equal(2, organization.TotalOrders);
        Assert.Equal(1, organization.ActiveOrders);
        Assert.Equal(4000.00m, organization.TotalOrderValue);
        Assert.NotNull(organization.LastOrderDate);
    }

    [Fact]
    public async Task GetOrganizationDetails_WithOrganizationWithoutOrders_ReturnsZeroStatistics()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/api/organizations/{_testOrganization2Id}/details");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var organization = await DeserializeResponse<OrganizationDetailsDto>(response);
        Assert.Equal(0, organization.TotalOrders);
        Assert.Equal(0, organization.ActiveOrders);
        Assert.Equal(0, organization.TotalOrderValue);
        Assert.Null(organization.LastOrderDate);
    }

    #endregion

    #region POST /api/organizations/bulk-import Tests

    [Fact]
    public async Task BulkImportOrganizations_WithValidData_ReturnsSuccessResult()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Bulk Import Test Org 1",
                    Type = "school",
                    ContactEmail = "bulk1@test.com",
                    Address = "123 Bulk St"
                },
                new CreateOrganizationDto
                {
                    Name = "Bulk Import Test Org 2",
                    Type = "theater",
                    ContactEmail = "bulk2@test.com",
                    Address = "456 Bulk Ave"
                }
            }
        };

        // Act
        var response = await _client.PostAsync("/api/organizations/bulk-import", CreateJsonContent(bulkImportDto));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await DeserializeResponse<BulkOrganizationImportResult>(response);
        Assert.Equal(2, result.SuccessCount);
        Assert.Equal(0, result.FailureCount);
        Assert.Empty(result.Failures);
        Assert.True(result.ProcessingTime.TotalMilliseconds > 0);

        // Verify organizations were created in database
        var createdOrgs = await _context.Organizations
            .Where(o => o.Name.StartsWith("Bulk Import Test Org"))
            .ToListAsync();
        Assert.Equal(2, createdOrgs.Count);
    }

    [Fact]
    public async Task BulkImportOrganizations_WithValidationErrors_ReturnsPartialSuccess()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Valid Bulk Organization",
                    Type = "school",
                    ContactEmail = "valid@test.com",
                    Address = "123 Valid St"
                },
                new CreateOrganizationDto
                {
                    Name = "", // Invalid - empty name
                    Type = "theater",
                    ContactEmail = "invalid@test.com",
                    Address = "456 Invalid Ave"
                },
                new CreateOrganizationDto
                {
                    Name = "Integration Test School", // Duplicate of existing
                    Type = "school",
                    ContactEmail = "duplicate@test.com",
                    Address = "789 Duplicate St"
                }
            }
        };

        // Act
        var response = await _client.PostAsync("/api/organizations/bulk-import", CreateJsonContent(bulkImportDto));

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await DeserializeResponse<BulkOrganizationImportResult>(response);
        Assert.Equal(1, result.SuccessCount); // Only valid organization
        Assert.Equal(2, result.FailureCount); // Two invalid organizations
        Assert.Equal(2, result.Failures.Count);

        // Verify failure details
        Assert.Contains(result.Failures, f => f.RowNumber == 2);
        Assert.Contains(result.Failures, f => f.RowNumber == 3);
    }

    [Fact]
    public async Task BulkImportOrganizations_WithTooManyOrganizations_ReturnsBadRequest()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        var organizations = new List<CreateOrganizationDto>();
        for (int i = 0; i < 1001; i++) // Exceed the 1000 limit
        {
            organizations.Add(new CreateOrganizationDto
            {
                Name = $"Bulk Org {i}",
                Type = "school",
                ContactEmail = $"bulk{i}@test.com",
                Address = $"{i} Bulk St"
            });
        }

        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = organizations
        };

        // Act
        var response = await _client.PostAsync("/api/organizations/bulk-import", CreateJsonContent(bulkImportDto));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    #endregion

    #region GET /api/organizations/export Tests

    [Fact]
    public async Task ExportOrganizations_WithActiveOnly_ReturnsCSVFile()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/api/organizations/export?includeInactive=false");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var csvContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Id,Name,Type,ContactEmail", csvContent);
        Assert.Contains("Integration Test School", csvContent);
        Assert.Contains("Integration Theater Company", csvContent);

        // Verify Content-Disposition header for file download
        var contentDisposition = response.Content.Headers.ContentDisposition;
        Assert.NotNull(contentDisposition);
        Assert.Contains("organizations_export_", contentDisposition.FileName);
        Assert.EndsWith(".csv", contentDisposition.FileName);
    }

    [Fact]
    public async Task ExportOrganizations_WithIncludeInactive_ReturnsAllOrganizations()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Create an inactive organization first
        var inactiveOrg = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Integration Inactive Organization",
            Type = "dance_company",
            ContactEmail = "inactive@test.com",
            Address = "999 Inactive St",
            IsActive = false,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-30)
        };

        _context.Organizations.Add(inactiveOrg);
        await _context.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync("/api/organizations/export?includeInactive=true");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var csvContent = await response.Content.ReadAsStringAsync();
        Assert.Contains("Integration Test School", csvContent);
        Assert.Contains("Integration Theater Company", csvContent);
        Assert.Contains("Integration Inactive Organization", csvContent);
    }

    #endregion

    #region Authorization Tests

    [Fact]
    public async Task AllOrganizationEndpoints_WithNonStaffRole_ReturnForbidden()
    {
        // Arrange
        var directorToken = CreateTestJwtToken(_directorUserId, "director@school.edu", "Director", _testOrganizationId);

        var endpoints = new[]
        {
            HttpMethod.Get,
            HttpMethod.Post,
            HttpMethod.Put,
            HttpMethod.Delete
        };

        foreach (var method in endpoints)
        {
            SetAuthorizationHeader(directorToken);

            HttpResponseMessage response;

            switch (method.Method)
            {
                case "GET":
                    response = await _client.GetAsync("/api/organizations");
                    break;
                case "POST":
                    var createDto = new CreateOrganizationDto
                    {
                        Name = "Test",
                        Type = "school",
                        ContactEmail = "test@test.com",
                        Address = "123 Test St"
                    };
                    response = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));
                    break;
                case "PUT":
                    var updateDto = new UpdateOrganizationDto { Name = "Updated" };
                    response = await _client.PutAsync($"/api/organizations/{_testOrganizationId}", CreateJsonContent(updateDto));
                    break;
                case "DELETE":
                    response = await _client.DeleteAsync($"/api/organizations/{_testOrganizationId}");
                    break;
                default:
                    continue;
            }

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    #endregion

    #region End-to-End Workflow Tests

    [Fact]
    public async Task CompleteOrganizationWorkflow_CreateUpdateDeactivate_Success()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Step 1: Create Organization
        var createDto = new CreateOrganizationDto
        {
            Name = "End-to-End Test Organization",
            Type = "theater",
            ContactEmail = "e2e@test.com",
            ContactPhone = "(555) 999-0000",
            Address = "100 E2E Test Blvd, Test City, TC 10000"
        };

        var createResponse = await _client.PostAsync("/api/organizations", CreateJsonContent(createDto));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var createdOrg = await DeserializeResponse<OrganizationDetailsDto>(createResponse);
        var organizationId = createdOrg.Id;

        // Step 2: Verify Organization Exists
        var getResponse = await _client.GetAsync($"/api/organizations/{organizationId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        // Step 3: Update Organization
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Updated E2E Test Organization",
            ContactPhone = "(555) 888-7777",
            ShippingAddress = "200 Updated Shipping St, Test City, TC 10000"
        };

        var updateResponse = await _client.PutAsync($"/api/organizations/{organizationId}", CreateJsonContent(updateDto));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updatedOrg = await DeserializeResponse<OrganizationDetailsDto>(updateResponse);
        Assert.Equal("Updated E2E Test Organization", updatedOrg.Name);
        Assert.Equal("(555) 888-7777", updatedOrg.ContactPhone);
        Assert.Equal("200 Updated Shipping St, Test City, TC 10000", updatedOrg.ShippingAddress);

        // Step 4: Get Organization Details
        var detailsResponse = await _client.GetAsync($"/api/organizations/{organizationId}/details");
        Assert.Equal(HttpStatusCode.OK, detailsResponse.StatusCode);

        var detailedOrg = await DeserializeResponse<OrganizationDetailsDto>(detailsResponse);
        Assert.Equal(0, detailedOrg.TotalOrders);
        Assert.Equal(0, detailedOrg.ActiveOrders);

        // Step 5: Deactivate Organization (no orders, so should succeed)
        var deactivateResponse = await _client.DeleteAsync($"/api/organizations/{organizationId}");
        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        // Step 6: Verify Organization is Deactivated
        var dbOrganization = await _context.Organizations.FindAsync(organizationId);
        Assert.NotNull(dbOrganization);
        Assert.False(dbOrganization.IsActive);
    }

    [Fact]
    public async Task BulkImportAndExportWorkflow_Success()
    {
        // Arrange
        var token = CreateTestJwtToken(_staffUserId, "staff@colorgarb.com", "ColorGarbStaff");
        SetAuthorizationHeader(token);

        // Step 1: Bulk Import Organizations
        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Bulk Workflow Org 1",
                    Type = "school",
                    ContactEmail = "bulk1@workflow.com",
                    Address = "123 Workflow St"
                },
                new CreateOrganizationDto
                {
                    Name = "Bulk Workflow Org 2",
                    Type = "dance_company",
                    ContactEmail = "bulk2@workflow.com",
                    Address = "456 Workflow Ave"
                }
            }
        };

        var importResponse = await _client.PostAsync("/api/organizations/bulk-import", CreateJsonContent(bulkImportDto));
        Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

        var importResult = await DeserializeResponse<BulkOrganizationImportResult>(importResponse);
        Assert.Equal(2, importResult.SuccessCount);

        // Step 2: Verify Organizations Were Created
        var allOrgsResponse = await _client.GetAsync("/api/organizations");
        Assert.Equal(HttpStatusCode.OK, allOrgsResponse.StatusCode);

        var allOrgs = await DeserializeResponse<List<OrganizationDto>>(allOrgsResponse);
        Assert.Contains(allOrgs, o => o.Name == "Bulk Workflow Org 1");
        Assert.Contains(allOrgs, o => o.Name == "Bulk Workflow Org 2");

        // Step 3: Export Organizations
        var exportResponse = await _client.GetAsync("/api/organizations/export");
        Assert.Equal(HttpStatusCode.OK, exportResponse.StatusCode);

        var csvContent = await exportResponse.Content.ReadAsStringAsync();
        Assert.Contains("Bulk Workflow Org 1", csvContent);
        Assert.Contains("Bulk Workflow Org 2", csvContent);
        Assert.Contains("bulk1@workflow.com", csvContent);
        Assert.Contains("bulk2@workflow.com", csvContent);
    }

    #endregion
}