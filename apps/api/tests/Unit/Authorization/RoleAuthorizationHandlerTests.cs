using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using ColorGarbApi.Common.Authorization;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Tests.Unit.Authorization;

/// <summary>
/// Comprehensive unit tests for RoleAuthorizationHandler.
/// Tests all authorization scenarios including role validation, organization access,
/// cross-organization permissions, and audit logging.
/// </summary>
public class RoleAuthorizationHandlerTests
{
    private readonly Mock<ILogger<RoleAuthorizationHandler>> _mockLogger;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<HttpContext> _mockHttpContext;
    private readonly Mock<HttpRequest> _mockHttpRequest;
    private readonly Mock<ConnectionInfo> _mockConnection;
    private readonly Mock<IHeaderDictionary> _mockHeaders;
    private readonly RoleAuthorizationHandler _handler;

    public RoleAuthorizationHandlerTests()
    {
        _mockLogger = new Mock<ILogger<RoleAuthorizationHandler>>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockHttpContext = new Mock<HttpContext>();
        _mockHttpRequest = new Mock<HttpRequest>();
        _mockConnection = new Mock<ConnectionInfo>();
        _mockHeaders = new Mock<IHeaderDictionary>();

        // Setup HTTP context mocks
        _mockHttpContext.Setup(x => x.Request).Returns(_mockHttpRequest.Object);
        _mockHttpContext.Setup(x => x.Connection).Returns(_mockConnection.Object);
        _mockHttpRequest.Setup(x => x.Headers).Returns(_mockHeaders.Object);
        _mockHttpRequest.Setup(x => x.Method).Returns("GET");
        _mockHttpRequest.Setup(x => x.Path).Returns("/api/test");
        _mockConnection.Setup(x => x.RemoteIpAddress).Returns(System.Net.IPAddress.Parse("127.0.0.1"));
        _mockHeaders.Setup(x => x.UserAgent).Returns("Test-Agent");
        
        // Setup empty route values and query by default
        _mockHttpRequest.Setup(x => x.RouteValues).Returns(new Microsoft.AspNetCore.Routing.RouteValueDictionary());
        _mockHttpRequest.Setup(x => x.Query).Returns(new QueryCollection());

        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(_mockHttpContext.Object);
        
        _handler = new RoleAuthorizationHandler(_mockLogger.Object, _mockHttpContextAccessor.Object);
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenNoHttpContext_ShouldFailAuthorization()
    {
        // Arrange
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var context = CreateAuthorizationContext();
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning("No HTTP context available for authorization");
    }

    [Theory]
    [InlineData(null, "Director")]
    [InlineData("user123", null)]
    [InlineData("", "Director")]
    [InlineData("user123", "")]
    public async Task HandleRequirementAsync_WhenMissingUserClaims_ShouldFailAuthorization(
        string? userId, string? userRole)
    {
        // Arrange
        var context = CreateAuthorizationContext(userId, userRole);
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning($"User authentication claims missing for user {userId}");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenInvalidUserRole_ShouldFailAuthorization()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "InvalidRole");
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning("Invalid user role InvalidRole for user user123");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenUserLacksRequiredRole_ShouldFailAuthorization()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Finance", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning("User user123 with role Finance denied access to resource requiring roles Director");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenDirectorAccessingFinanceResource_ShouldSucceed()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Finance });
        SetupRouteValues("organizationId", "org456");

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("User user123 with role Director granted access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenColorGarbStaff_ShouldGrantCrossOrganizationAccess()
    {
        // Arrange
        var context = CreateAuthorizationContext("staff123", "ColorGarbStaff", null);
        var requirement = new RoleRequirement(new[] { UserRole.ColorGarbStaff });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("ColorGarb staff user staff123 granted cross-organization access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenUserAccessingOwnOrganization_ShouldSucceed()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: true);
        SetupRouteValues("organizationId", "org456");

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("User user123 with role Director granted access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenUserAccessingDifferentOrganization_ShouldFailAuthorization()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: true, allowCrossOrganization: false);
        SetupRouteValues("organizationId", "org789");

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning("User user123 denied organization access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenNoOrganizationRequired_ShouldSucceed()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: false);

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("User user123 with role Director granted access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenNoOrganizationInRequest_ShouldSucceed()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: true);
        // No organizationId in route or query

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("User user123 with role Director granted access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenUserHasNoOrganization_ShouldFailOrganizationCheck()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", null);
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: true);
        SetupRouteValues("organizationId", "org456");

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        VerifyLogWarning("User user123 denied organization access");
    }

    [Fact]
    public async Task HandleRequirementAsync_WithQueryStringOrganizationId_ShouldValidateCorrectly()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Director", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director }, requireOrganization: true);
        SetupQueryParameters("organizationId", "org456");

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        Assert.False(context.HasFailed);
        VerifyLogInformation("User user123 with role Director granted access");
    }

    [Theory]
    [InlineData("Director")]
    [InlineData("Finance")]
    [InlineData("ColorGarbStaff")]
    public async Task HandleRequirementAsync_WhenValidRole_ShouldLogAuditEntry(string roleName)
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", roleName, "org456");
        var requirement = new RoleRequirement(new[] { Enum.Parse<UserRole>(roleName) });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.True(context.HasSucceeded);
        // Verify audit logging occurred (check that info log was called)
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("granted access")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task HandleRequirementAsync_WhenAccessDenied_ShouldLogFailureAudit()
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", "Finance", "org456");
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.False(context.HasSucceeded);
        Assert.True(context.HasFailed);
        
        // Verify warning log was called for access denied
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("access denied")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Theory]
    [InlineData(UserRole.Director, new[] { UserRole.Director }, true)]
    [InlineData(UserRole.Finance, new[] { UserRole.Finance }, true)]
    [InlineData(UserRole.ColorGarbStaff, new[] { UserRole.ColorGarbStaff }, true)]
    [InlineData(UserRole.Director, new[] { UserRole.Finance }, true)] // Director can access Finance resources
    [InlineData(UserRole.Finance, new[] { UserRole.Director }, false)]
    [InlineData(UserRole.ColorGarbStaff, new[] { UserRole.Director }, false)]
    public async Task HandleRequirementAsync_RoleHierarchy_ShouldRespectPermissions(
        UserRole userRole, UserRole[] requiredRoles, bool shouldSucceed)
    {
        // Arrange
        var context = CreateAuthorizationContext("user123", userRole.ToString(), "org456");
        var requirement = new RoleRequirement(requiredRoles, requireOrganization: false);

        // Act
        await InvokeHandlerAsync(context, requirement);

        // Assert
        Assert.Equal(shouldSucceed, context.HasSucceeded);
        Assert.Equal(!shouldSucceed, context.HasFailed);
    }

    /// <summary>
    /// Creates an authorization context with the specified user claims.
    /// </summary>
    private AuthorizationHandlerContext CreateAuthorizationContext(
        string? userId = "testuser", 
        string? userRole = "Director", 
        string? organizationId = "org123")
    {
        var claims = new List<Claim>();
        
        if (!string.IsNullOrEmpty(userId))
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        
        if (!string.IsNullOrEmpty(userRole))
            claims.Add(new Claim(ClaimTypes.Role, userRole));
        
        if (!string.IsNullOrEmpty(organizationId))
            claims.Add(new Claim("OrganizationId", organizationId));

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var requirement = new RoleRequirement(new[] { UserRole.Director });

        return new AuthorizationHandlerContext(new[] { requirement }, principal, null);
    }

    /// <summary>
    /// Sets up route values for the mock HTTP request.
    /// </summary>
    private void SetupRouteValues(string key, string value)
    {
        var routeValues = new Microsoft.AspNetCore.Routing.RouteValueDictionary
        {
            { key, value }
        };
        _mockHttpRequest.Setup(x => x.RouteValues).Returns(routeValues);
    }

    /// <summary>
    /// Sets up query parameters for the mock HTTP request.
    /// </summary>
    private void SetupQueryParameters(string key, string value)
    {
        var queryCollection = new QueryCollection(new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
        {
            { key, value }
        });
        _mockHttpRequest.Setup(x => x.Query).Returns(queryCollection);
    }

    /// <summary>
    /// Verifies that a warning log was called with the specified message.
    /// </summary>
    private void VerifyLogWarning(string expectedMessage)
    {
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(expectedMessage)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    /// <summary>
    /// Verifies that an information log was called with the specified message.
    /// </summary>
    private void VerifyLogInformation(string expectedMessage)
    {
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(expectedMessage)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    /// <summary>
    /// Helper method to invoke the protected HandleRequirementAsync method using reflection.
    /// </summary>
    private async Task InvokeHandlerAsync(AuthorizationHandlerContext context, RoleRequirement requirement)
    {
        var handleMethod = typeof(RoleAuthorizationHandler)
            .GetMethod("HandleRequirementAsync", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        
        if (handleMethod != null)
        {
            var task = (Task)handleMethod.Invoke(_handler, new object[] { context, requirement })!;
            await task;
        }
    }
}