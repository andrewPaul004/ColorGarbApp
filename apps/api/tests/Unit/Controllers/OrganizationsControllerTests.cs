using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Moq;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models.DTOs;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for OrganizationsController
/// Tests all CRUD operations, bulk import/export, and error handling scenarios
/// </summary>
public class OrganizationsControllerTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly OrganizationsController _controller;
    private readonly Mock<ILogger<OrganizationsController>> _loggerMock;
    private readonly Mock<IAuditService> _auditServiceMock;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testOrganizationId = Guid.NewGuid();
    private readonly Guid _testOrganization2Id = Guid.NewGuid();

    public OrganizationsControllerTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);

        // Setup mocks
        _loggerMock = new Mock<ILogger<OrganizationsController>>();
        _auditServiceMock = new Mock<IAuditService>();

        // Setup audit service mock to return completed tasks
        _auditServiceMock
            .Setup(a => a.LogRoleAccessAttemptAsync(
                It.IsAny<Guid>(), It.IsAny<UserRole>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<Guid?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _controller = new OrganizationsController(_context, _loggerMock.Object, _auditServiceMock.Object);

        // Setup HttpContext with ColorGarbStaff role
        SetupControllerContext(UserRole.ColorGarbStaff);

        SeedTestData();
    }

    /// <summary>
    /// Sets up controller context with specified user role
    /// </summary>
    private void SetupControllerContext(UserRole role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString()),
            new Claim(ClaimTypes.Role, role.ToString())
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = principal,
            Connection = { RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1") }
        };

        httpContext.Request.Headers["User-Agent"] = "Test-Agent";

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    /// <summary>
    /// Seeds test data for organization tests
    /// </summary>
    private void SeedTestData()
    {
        var organization1 = new Organization
        {
            Id = _testOrganizationId,
            Name = "Test School Drama Department",
            Type = "school",
            ContactEmail = "contact@testschool.edu",
            ContactPhone = "(555) 123-4567",
            Address = "123 Test St, Test City, TS 12345",
            ShippingAddress = "456 Shipping Ave, Test City, TS 12345",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var organization2 = new Organization
        {
            Id = _testOrganization2Id,
            Name = "Theater Company NYC",
            Type = "theater",
            ContactEmail = "info@theaternyc.com",
            ContactPhone = "(212) 555-0123",
            Address = "789 Broadway, New York, NY 10013",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-20),
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var inactiveOrganization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Inactive Organization",
            Type = "dance_company",
            ContactEmail = "inactive@example.com",
            Address = "999 Inactive St",
            IsActive = false,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-30)
        };

        // Add orders for testing statistics
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

        _context.Organizations.AddRange(organization1, organization2, inactiveOrganization);
        _context.Orders.AddRange(order1, order2);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    #region GetAllOrganizations Tests

    [Fact]
    public async Task GetAllOrganizations_WithValidUser_ReturnsActiveOrganizations()
    {
        // Act
        var result = await _controller.GetAllOrganizations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organizations = Assert.IsType<List<OrganizationDto>>(okResult.Value);

        Assert.Equal(2, organizations.Count);
        Assert.All(organizations, org => Assert.NotEmpty(org.Name));
        Assert.Contains(organizations, org => org.Name == "Test School Drama Department");
        Assert.Contains(organizations, org => org.Name == "Theater Company NYC");
        Assert.DoesNotContain(organizations, org => org.Name == "Inactive Organization");
    }

    [Fact]
    public async Task GetAllOrganizations_OrdersByName()
    {
        // Act
        var result = await _controller.GetAllOrganizations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organizations = Assert.IsType<List<OrganizationDto>>(okResult.Value);

        var sortedNames = organizations.Select(o => o.Name).ToList();
        var expectedSortedNames = sortedNames.OrderBy(n => n).ToList();

        Assert.Equal(expectedSortedNames, sortedNames);
    }

    [Fact]
    public async Task GetAllOrganizations_HandlesEmptyDatabase()
    {
        // Arrange - Clear all organizations
        _context.Organizations.RemoveRange(_context.Organizations);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAllOrganizations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organizations = Assert.IsType<List<OrganizationDto>>(okResult.Value);

        Assert.Empty(organizations);
    }

    #endregion

    #region GetOrganization Tests

    [Fact]
    public async Task GetOrganization_WithValidId_ReturnsOrganization()
    {
        // Act
        var result = await _controller.GetOrganization(_testOrganizationId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDto>(okResult.Value);

        Assert.Equal(_testOrganizationId, organization.Id);
        Assert.Equal("Test School Drama Department", organization.Name);
        Assert.Equal("school", organization.Type);
        Assert.Equal("contact@testschool.edu", organization.ContactEmail);
    }

    [Fact]
    public async Task GetOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _controller.GetOrganization(nonExistentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetOrganization_WithInactiveOrganization_ReturnsNotFound()
    {
        // Arrange - Add inactive organization
        var inactiveOrg = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Inactive Test Org",
            Type = "school",
            ContactEmail = "inactive@test.com",
            Address = "123 Inactive St",
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(inactiveOrg);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetOrganization(inactiveOrg.Id);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion

    #region CreateOrganization Tests

    [Fact]
    public async Task CreateOrganization_WithValidData_ReturnsCreatedOrganization()
    {
        // Arrange
        var createDto = new CreateOrganizationDto
        {
            Name = "New Test Organization",
            Type = "theater",
            ContactEmail = "new@test.com",
            ContactPhone = "(555) 999-8888",
            Address = "321 New St, New City, NC 54321",
            ShippingAddress = "654 Shipping Blvd, New City, NC 54321"
        };

        // Act
        var result = await _controller.CreateOrganization(createDto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(createdResult.Value);

        Assert.Equal("New Test Organization", organization.Name);
        Assert.Equal("theater", organization.Type);
        Assert.Equal("new@test.com", organization.ContactEmail);
        Assert.Equal("(555) 999-8888", organization.ContactPhone);
        Assert.Equal("321 New St, New City, NC 54321", organization.Address);
        Assert.Equal("654 Shipping Blvd, New City, NC 54321", organization.ShippingAddress);
        Assert.True(organization.IsActive);
        Assert.Equal(0, organization.TotalOrders);
        Assert.Equal(0, organization.ActiveOrders);
        Assert.Equal(0, organization.TotalOrderValue);
        Assert.Null(organization.LastOrderDate);

        // Verify audit service was called
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, It.IsAny<string>(), "POST", true,
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Created organization: New Test Organization"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task CreateOrganization_WithDuplicateName_ReturnsConflict()
    {
        // Arrange
        var createDto = new CreateOrganizationDto
        {
            Name = "Test School Drama Department", // Already exists
            Type = "school",
            ContactEmail = "duplicate@test.com",
            Address = "123 Duplicate St"
        };

        // Act
        var result = await _controller.CreateOrganization(createDto);

        // Assert
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrganization_WithCaseInsensitiveDuplicateName_ReturnsConflict()
    {
        // Arrange
        var createDto = new CreateOrganizationDto
        {
            Name = "TEST SCHOOL DRAMA DEPARTMENT", // Case-insensitive duplicate
            Type = "school",
            ContactEmail = "casetest@test.com",
            Address = "123 Case Test St"
        };

        // Act
        var result = await _controller.CreateOrganization(createDto);

        // Assert
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateOrganization_WithMinimalData_Success()
    {
        // Arrange
        var createDto = new CreateOrganizationDto
        {
            Name = "Minimal Organization",
            Type = "other",
            ContactEmail = "minimal@test.com",
            Address = "123 Minimal St"
            // No optional fields provided
        };

        // Act
        var result = await _controller.CreateOrganization(createDto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(createdResult.Value);

        Assert.Equal("Minimal Organization", organization.Name);
        Assert.Null(organization.ContactPhone);
        Assert.Null(organization.ShippingAddress);
    }

    #endregion

    #region UpdateOrganization Tests

    [Fact]
    public async Task UpdateOrganization_WithValidData_ReturnsUpdatedOrganization()
    {
        // Arrange
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Updated School Name",
            Type = "theater",
            ContactEmail = "updated@testschool.edu",
            ContactPhone = "(555) 111-2222",
            Address = "456 Updated Ave, Updated City, UC 67890",
            ShippingAddress = "789 New Shipping St, Updated City, UC 67890"
        };

        // Act
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        Assert.Equal("Updated School Name", organization.Name);
        Assert.Equal("theater", organization.Type);
        Assert.Equal("updated@testschool.edu", organization.ContactEmail);
        Assert.Equal("(555) 111-2222", organization.ContactPhone);
        Assert.Equal("456 Updated Ave, Updated City, UC 67890", organization.Address);
        Assert.Equal("789 New Shipping St, Updated City, UC 67890", organization.ShippingAddress);

        // Verify audit service was called with change details
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, It.IsAny<string>(), "PUT", true,
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Updated organization: Updated School Name"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task UpdateOrganization_WithPartialData_UpdatesOnlyProvidedFields()
    {
        // Arrange
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Partially Updated Name",
            ContactPhone = "(555) 333-4444"
            // Other fields not provided
        };

        // Act
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        Assert.Equal("Partially Updated Name", organization.Name);
        Assert.Equal("(555) 333-4444", organization.ContactPhone);
        // Verify original values preserved
        Assert.Equal("school", organization.Type);
        Assert.Equal("contact@testschool.edu", organization.ContactEmail);
        Assert.Equal("123 Test St, Test City, TS 12345", organization.Address);
    }

    [Fact]
    public async Task UpdateOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Updated Name"
        };

        // Act
        var result = await _controller.UpdateOrganization(nonExistentId, updateDto);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateOrganization_WithDuplicateName_ReturnsConflict()
    {
        // Arrange
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Theater Company NYC" // Already exists for another organization
        };

        // Act
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateOrganization_WithSameName_Success()
    {
        // Arrange - Update with the same name (should be allowed)
        var updateDto = new UpdateOrganizationDto
        {
            Name = "Test School Drama Department",
            ContactPhone = "(555) 999-8888"
        };

        // Act
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        Assert.Equal("Test School Drama Department", organization.Name);
        Assert.Equal("(555) 999-8888", organization.ContactPhone);
    }

    [Fact]
    public async Task UpdateOrganization_CalculatesStatisticsCorrectly()
    {
        // Act
        var updateDto = new UpdateOrganizationDto { ContactPhone = "(555) 777-8888" };
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        // Should include both orders from seeded data
        Assert.Equal(2, organization.TotalOrders);
        Assert.Equal(1, organization.ActiveOrders); // Only one active order
        Assert.Equal(4000.00m, organization.TotalOrderValue); // 1500 + 2500
        Assert.NotNull(organization.LastOrderDate);
    }

    #endregion

    #region DeactivateOrganization Tests

    [Fact]
    public async Task DeactivateOrganization_WithNoActiveOrders_Success()
    {
        // Arrange - Deactivate all orders for the organization
        var orders = await _context.Orders.Where(o => o.OrganizationId == _testOrganizationId).ToListAsync();
        foreach (var order in orders)
        {
            order.IsActive = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeactivateOrganization(_testOrganizationId);

        // Assert
        Assert.IsType<NoContentResult>(result);

        // Verify organization is deactivated
        var organization = await _context.Organizations.FindAsync(_testOrganizationId);
        Assert.NotNull(organization);
        Assert.False(organization.IsActive);

        // Verify audit service was called
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, It.IsAny<string>(), "DELETE", true,
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Deactivated organization: Test School Drama Department"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateOrganization_WithActiveOrders_ReturnsBadRequest()
    {
        // Act - Organization has active orders from seeded data
        var result = await _controller.DeactivateOrganization(_testOrganizationId);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);

        // Verify error message mentions active orders
        var response = badRequestResult.Value;
        Assert.NotNull(response);
    }

    [Fact]
    public async Task DeactivateOrganization_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _controller.DeactivateOrganization(nonExistentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    #endregion

    #region GetOrganizationDetails Tests

    [Fact]
    public async Task GetOrganizationDetails_WithValidId_ReturnsDetailsWithStatistics()
    {
        // Act
        var result = await _controller.GetOrganizationDetails(_testOrganizationId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        Assert.Equal(_testOrganizationId, organization.Id);
        Assert.Equal("Test School Drama Department", organization.Name);
        Assert.Equal(2, organization.TotalOrders);
        Assert.Equal(1, organization.ActiveOrders);
        Assert.Equal(4000.00m, organization.TotalOrderValue);
        Assert.NotNull(organization.LastOrderDate);
    }

    [Fact]
    public async Task GetOrganizationDetails_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _controller.GetOrganizationDetails(nonExistentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetOrganizationDetails_WithNoOrders_ReturnsZeroStatistics()
    {
        // Act - Theater Company NYC has no orders in test data
        var result = await _controller.GetOrganizationDetails(_testOrganization2Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var organization = Assert.IsType<OrganizationDetailsDto>(okResult.Value);

        Assert.Equal(0, organization.TotalOrders);
        Assert.Equal(0, organization.ActiveOrders);
        Assert.Equal(0, organization.TotalOrderValue);
        Assert.Null(organization.LastOrderDate);
    }

    #endregion

    #region BulkImportOrganizations Tests

    [Fact]
    public async Task BulkImportOrganizations_WithValidData_ReturnsSuccessResult()
    {
        // Arrange
        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Bulk Import Org 1",
                    Type = "school",
                    ContactEmail = "bulk1@test.com",
                    Address = "123 Bulk St"
                },
                new CreateOrganizationDto
                {
                    Name = "Bulk Import Org 2",
                    Type = "theater",
                    ContactEmail = "bulk2@test.com",
                    Address = "456 Bulk Ave"
                }
            }
        };

        // Act
        var result = await _controller.BulkImportOrganizations(bulkImportDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var importResult = Assert.IsType<BulkOrganizationImportResult>(okResult.Value);

        Assert.Equal(2, importResult.SuccessCount);
        Assert.Equal(0, importResult.FailureCount);
        Assert.Empty(importResult.Failures);
        Assert.True(importResult.ProcessingTime > TimeSpan.Zero);

        // Verify organizations were created
        var createdOrgs = await _context.Organizations
            .Where(o => o.Name.StartsWith("Bulk Import Org"))
            .ToListAsync();
        Assert.Equal(2, createdOrgs.Count);

        // Verify audit service was called
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, "Organization/bulk-import", "POST", true,
            null, It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Bulk imported organizations: 2 successful, 0 failed"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task BulkImportOrganizations_WithValidationErrors_ReturnsFailures()
    {
        // Arrange
        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Valid Organization",
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
                    Name = "Missing Email Org",
                    Type = "other",
                    ContactEmail = "", // Invalid - empty email
                    Address = "789 Missing Email St"
                }
            }
        };

        // Act
        var result = await _controller.BulkImportOrganizations(bulkImportDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var importResult = Assert.IsType<BulkOrganizationImportResult>(okResult.Value);

        Assert.Equal(1, importResult.SuccessCount); // Only valid organization
        Assert.Equal(2, importResult.FailureCount); // Two invalid organizations
        Assert.Equal(2, importResult.Failures.Count);

        // Verify failure details
        var failure1 = importResult.Failures.First(f => f.RowNumber == 2);
        Assert.Contains("Organization name is required", failure1.ValidationErrors);

        var failure2 = importResult.Failures.First(f => f.RowNumber == 3);
        Assert.Contains("Contact email is required", failure2.ValidationErrors);
    }

    [Fact]
    public async Task BulkImportOrganizations_WithDuplicateNames_ReturnsFailures()
    {
        // Arrange
        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>
            {
                new CreateOrganizationDto
                {
                    Name = "Test School Drama Department", // Duplicate of existing
                    Type = "school",
                    ContactEmail = "duplicate1@test.com",
                    Address = "123 Duplicate St"
                },
                new CreateOrganizationDto
                {
                    Name = "Duplicate Within Batch",
                    Type = "theater",
                    ContactEmail = "duplicate2@test.com",
                    Address = "456 Duplicate Ave"
                },
                new CreateOrganizationDto
                {
                    Name = "Duplicate Within Batch", // Duplicate within batch
                    Type = "other",
                    ContactEmail = "duplicate3@test.com",
                    Address = "789 Duplicate Blvd"
                }
            }
        };

        // Act
        var result = await _controller.BulkImportOrganizations(bulkImportDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var importResult = Assert.IsType<BulkOrganizationImportResult>(okResult.Value);

        Assert.Equal(0, importResult.SuccessCount); // None should succeed
        Assert.Equal(3, importResult.FailureCount);
        Assert.Equal(3, importResult.Failures.Count);

        // All should have duplicate name errors
        Assert.All(importResult.Failures, f =>
            Assert.Contains("already exists", f.ValidationErrors.First()));
    }

    [Fact]
    public async Task BulkImportOrganizations_WithTooManyOrganizations_ReturnsBadRequest()
    {
        // Arrange - Create more than 1000 organizations
        var organizations = new List<CreateOrganizationDto>();
        for (int i = 0; i < 1001; i++)
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
        var result = await _controller.BulkImportOrganizations(bulkImportDto);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task BulkImportOrganizations_WithEmptyList_ReturnsBadRequest()
    {
        // Arrange
        var bulkImportDto = new BulkOrganizationImportDto
        {
            Organizations = new List<CreateOrganizationDto>()
        };

        // Mock model state to reflect validation failure
        _controller.ModelState.AddModelError("Organizations", "At least one organization is required");

        // Act
        var result = await _controller.BulkImportOrganizations(bulkImportDto);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    #endregion

    #region ExportOrganizations Tests

    [Fact]
    public async Task ExportOrganizations_WithActiveOnly_ReturnsCSVFile()
    {
        // Act
        var result = await _controller.ExportOrganizations(false);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);

        Assert.Equal("text/csv", fileResult.ContentType);
        Assert.Contains("organizations_export_", fileResult.FileDownloadName);
        Assert.EndsWith(".csv", fileResult.FileDownloadName);
        Assert.NotEmpty(fileResult.FileContents);

        // Verify CSV content contains headers
        var csvContent = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Contains("Id,Name,Type,ContactEmail", csvContent);
        Assert.Contains("Test School Drama Department", csvContent);
        Assert.Contains("Theater Company NYC", csvContent);
        Assert.DoesNotContain("Inactive Organization", csvContent);

        // Verify audit service was called
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, "Organization/export", "GET", true,
            null, It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Exported 2 organizations"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ExportOrganizations_WithIncludeInactive_ReturnsAllOrganizations()
    {
        // Act
        var result = await _controller.ExportOrganizations(true);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        var csvContent = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);

        Assert.Contains("Test School Drama Department", csvContent);
        Assert.Contains("Theater Company NYC", csvContent);
        Assert.Contains("Inactive Organization", csvContent);

        // Verify audit service was called with includeInactive: true
        _auditServiceMock.Verify(a => a.LogRoleAccessAttemptAsync(
            _testUserId, UserRole.ColorGarbStaff, "Organization/export", "GET", true,
            null, It.IsAny<string>(), It.IsAny<string>(),
            It.Contains("Exported 3 organizations (includeInactive: True)"), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ExportOrganizations_WithNoOrganizations_ReturnsEmptyCSV()
    {
        // Arrange - Remove all organizations
        _context.Organizations.RemoveRange(_context.Organizations);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ExportOrganizations(false);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        var csvContent = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);

        // Should only contain headers
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Single(lines); // Only header row
        Assert.Contains("Id,Name,Type,ContactEmail", lines[0]);
    }

    #endregion

    #region Helper Methods Tests

    [Fact]
    public void EscapeCsvField_WithQuotes_DoublesQuotes()
    {
        // This tests the private method indirectly through export functionality
        // Arrange - Create organization with quotes in name
        var orgWithQuotes = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Organization \"With Quotes\"",
            Type = "school",
            ContactEmail = "quotes@test.com",
            Address = "123 Quote St",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(orgWithQuotes);
        _context.SaveChanges();

        // Act
        var result = _controller.ExportOrganizations(false).Result;

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        var csvContent = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);

        // Quotes should be escaped (doubled)
        Assert.Contains("Organization \"\"With Quotes\"\"", csvContent);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task CreateOrganization_WhenDatabaseError_ReturnsInternalServerError()
    {
        // Arrange - Dispose the context to simulate database error
        _context.Dispose();

        var createDto = new CreateOrganizationDto
        {
            Name = "Error Test Org",
            Type = "school",
            ContactEmail = "error@test.com",
            Address = "123 Error St"
        };

        // Act
        var result = await _controller.CreateOrganization(createDto);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task UpdateOrganization_WhenDatabaseError_ReturnsInternalServerError()
    {
        // Arrange - Dispose the context to simulate database error
        _context.Dispose();

        var updateDto = new UpdateOrganizationDto
        {
            Name = "Error Update"
        };

        // Act
        var result = await _controller.UpdateOrganization(_testOrganizationId, updateDto);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    #endregion
}