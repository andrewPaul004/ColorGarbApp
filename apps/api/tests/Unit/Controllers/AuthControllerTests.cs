using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using ColorGarbApi.Controllers;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Services;

namespace ColorGarbApi.Tests.Unit.Controllers;

/// <summary>
/// Unit tests for AuthController
/// Tests authentication endpoints, security features, and error handling
/// </summary>
public class AuthControllerTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly AuthController _controller;
    private readonly Mock<ILogger<AuthController>> _loggerMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly Mock<IEmailService> _emailServiceMock;

    public AuthControllerTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);

        // Setup mocks
        _loggerMock = new Mock<ILogger<AuthController>>();
        _configMock = new Mock<IConfiguration>();
        _emailServiceMock = new Mock<IEmailService>();

        // Setup configuration values
        _configMock.Setup(c => c["Jwt:Key"]).Returns("test-secret-key-for-unit-testing-purposes");
        _configMock.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");
        _configMock.Setup(c => c["Jwt:Audience"]).Returns("TestAudience");
        _configMock.Setup(c => c["Frontend:BaseUrl"]).Returns("http://localhost:5173");

        // Setup email service mock
        _emailServiceMock.Setup(e => e.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                        .ReturnsAsync(true);

        _controller = new AuthController(_context, _configMock.Object, _loggerMock.Object, _emailServiceMock.Object);

        // Setup HttpContext
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        SeedTestData();
    }

    /// <summary>
    /// Seeds test data for authentication tests
    /// </summary>
    private void SeedTestData()
    {
        var organization = new Organization
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Test School",
            Type = "school",
            ContactEmail = "contact@testschool.edu",
            Address = "123 Test St",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var user = new User
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Email = "test@testschool.edu",
            Name = "Test User",
            Role = "client",
            OrganizationId = organization.Id,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(organization);
        _context.Users.Add(user);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsOkWithToken()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = okResult.Value;
        
        Assert.NotNull(response);
        
        // Use reflection to check properties since we're dealing with anonymous objects
        var responseType = response.GetType();
        var accessTokenProperty = responseType.GetProperty("AccessToken");
        var userProperty = responseType.GetProperty("User");
        
        Assert.NotNull(accessTokenProperty?.GetValue(response));
        Assert.NotNull(userProperty?.GetValue(response));
    }

    [Fact]
    public async Task Login_WithInvalidEmail_ReturnsUnauthorized()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "wrongpassword"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithEmptyEmail_ReturnsBadRequest()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var response = badRequestResult.Value;
        
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Login_WithEmptyPassword_ReturnsBadRequest()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = ""
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithNullRequest_ReturnsBadRequest()
    {
        // Act
        var result = await _controller.Login(null!);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Login_RecordsSuccessfulAttempt()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<OkObjectResult>(result);

        var loginAttempt = await _context.LoginAttempts
            .FirstOrDefaultAsync(la => la.Email == "test@testschool.edu" && la.IsSuccessful);
        
        Assert.NotNull(loginAttempt);
        Assert.True(loginAttempt.IsSuccessful);
        Assert.Equal("Login successful", loginAttempt.Details);
    }

    [Fact]
    public async Task Login_RecordsFailedAttempt()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "wrongpassword"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);

        var loginAttempt = await _context.LoginAttempts
            .FirstOrDefaultAsync(la => la.Email == "test@testschool.edu" && !la.IsSuccessful);
        
        Assert.NotNull(loginAttempt);
        Assert.False(loginAttempt.IsSuccessful);
        Assert.Equal("Invalid password", loginAttempt.Details);
    }

    [Fact]
    public async Task Login_WithInactiveUser_ReturnsForbidden()
    {
        // Arrange
        var user = await _context.Users.FirstAsync(u => u.Email == "test@testschool.edu");
        user.IsActive = false;
        await _context.SaveChangesAsync();

        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task Login_AfterMultipleFailedAttempts_ReturnsLockedAccount()
    {
        // Arrange - Create 5 failed attempts within lockout window
        var email = "test@testschool.edu";
        var cutoffTime = DateTime.UtcNow.AddMinutes(-10); // 10 minutes ago

        for (int i = 0; i < 5; i++)
        {
            _context.LoginAttempts.Add(new LoginAttempt
            {
                Email = email,
                IsSuccessful = false,
                AttemptedAt = cutoffTime.AddMinutes(i),
                Details = "Test failed attempt"
            });
        }
        await _context.SaveChangesAsync();

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_WithValidEmail_ReturnsOk()
    {
        // Arrange
        var request = new PasswordResetRequest
        {
            Email = "test@testschool.edu"
        };

        // Act
        var result = await _controller.ForgotPassword(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_WithNonexistentEmail_ReturnsOk()
    {
        // Arrange - Should return OK to prevent email enumeration
        var request = new PasswordResetRequest
        {
            Email = "nonexistent@example.com"
        };

        // Act
        var result = await _controller.ForgotPassword(request);

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_WithEmptyEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new PasswordResetRequest
        {
            Email = ""
        };

        // Act
        var result = await _controller.ForgotPassword(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_WithNullRequest_ReturnsBadRequest()
    {
        // Act
        var result = await _controller.ForgotPassword(null!);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Theory]
    [InlineData("plaintext")]
    [InlineData("short")]
    [InlineData("nouppercase123")]
    [InlineData("NOLOWERCASE123")]
    [InlineData("NoNumbers")]
    public void HashPassword_WithVariousPasswords_ReturnsValidBCryptHash(string password)
    {
        // Act
        var hashedPassword = AuthController.HashPassword(password);

        // Assert
        Assert.NotNull(hashedPassword);
        Assert.StartsWith("$2a$", hashedPassword); // BCrypt hash format
        Assert.True(BCrypt.Net.BCrypt.Verify(password, hashedPassword));
    }

    [Fact]
    public void HashPassword_WithSamePassword_ReturnsDifferentHashes()
    {
        // Arrange
        var password = "testpassword123";

        // Act
        var hash1 = AuthController.HashPassword(password);
        var hash2 = AuthController.HashPassword(password);

        // Assert
        Assert.NotEqual(hash1, hash2); // Salts should make hashes different
        Assert.True(BCrypt.Net.BCrypt.Verify(password, hash1));
        Assert.True(BCrypt.Net.BCrypt.Verify(password, hash2));
    }

    [Fact]
    public async Task Login_UpdatesLastLoginTimestamp()
    {
        // Arrange
        var user = await _context.Users.FirstAsync(u => u.Email == "test@testschool.edu");
        var originalLastLogin = user.LastLoginAt;

        var loginRequest = new LoginRequest
        {
            Email = "test@testschool.edu",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        Assert.IsType<OkObjectResult>(result);

        // Refresh user from database
        await _context.Entry(user).ReloadAsync();
        
        Assert.NotNull(user.LastLoginAt);
        Assert.NotEqual(originalLastLogin, user.LastLoginAt);
    }

    [Fact]
    public async Task Login_WithWhitespaceInEmail_HandlesCorrectly()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "  test@testschool.edu  ",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        // Should handle whitespace and still find the user
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Login_WithMixedCaseEmail_HandlesCorrectly()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "TEST@TESTSCHOOL.EDU",
            Password = "password123"
        };

        // Act
        var result = await _controller.Login(loginRequest);

        // Assert
        // Should handle case insensitivity
        Assert.IsType<OkObjectResult>(result);
    }
}