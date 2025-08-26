using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ColorGarbApi.Tests.Unit.Services;

/// <summary>
/// Unit tests for NotificationPreferenceService to ensure proper business logic and error handling.
/// Tests CRUD operations, validation, and audit logging functionality.
/// </summary>
/// <since>3.1.0</since>
public class NotificationPreferenceServiceTests : IDisposable
{
    private readonly ColorGarbDbContext _context;
    private readonly Mock<ILogger<NotificationPreferenceService>> _mockLogger;
    private readonly Mock<IAuditService> _mockAuditService;
    private readonly NotificationPreferenceService _service;
    private readonly Guid _testUserId = Guid.NewGuid();

    /// <summary>
    /// Initializes test dependencies with in-memory database
    /// </summary>
    public NotificationPreferenceServiceTests()
    {
        var options = new DbContextOptionsBuilder<ColorGarbDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ColorGarbDbContext(options);
        _mockLogger = new Mock<ILogger<NotificationPreferenceService>>();
        _mockAuditService = new Mock<IAuditService>();

        _service = new NotificationPreferenceService(_context, _mockLogger.Object, _mockAuditService.Object);

        // Seed test user
        SeedTestData();
    }

    /// <summary>
    /// Seeds test data including a test user for notification preferences
    /// </summary>
    private void SeedTestData()
    {
        var testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            Name = "Test User",
            Role = UserRole.Director,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(testUser);
        _context.SaveChanges();
    }

    #region GetByUserIdAsync Tests

    /// <summary>
    /// Test: GetByUserIdAsync should return null when no preferences exist for user
    /// </summary>
    [Fact]
    public async Task GetByUserIdAsync_WhenNoPreferencesExist_ShouldReturnNull()
    {
        // Act
        var result = await _service.GetByUserIdAsync(_testUserId);

        // Assert
        Assert.Null(result);
    }

    /// <summary>
    /// Test: GetByUserIdAsync should return preferences when they exist for user
    /// </summary>
    [Fact]
    public async Task GetByUserIdAsync_WhenPreferencesExist_ShouldReturnPreferences()
    {
        // Arrange
        var preference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            MilestonesJson = """[{"type": "MeasurementsDue", "enabled": true}]""",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.Add(preference);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetByUserIdAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.EmailEnabled);
        Assert.Equal("Immediate", result.Frequency);
    }

    /// <summary>
    /// Test: GetByUserIdAsync should throw ArgumentException for empty user ID
    /// </summary>
    [Fact]
    public async Task GetByUserIdAsync_WhenUserIdIsEmpty_ShouldThrowArgumentException()
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.GetByUserIdAsync(Guid.Empty));
        Assert.Equal("User ID cannot be empty (Parameter 'userId')", exception.Message);
    }

    #endregion

    #region CreateAsync Tests

    /// <summary>
    /// Test: CreateAsync should successfully create new preferences with generated token
    /// </summary>
    [Fact]
    public async Task CreateAsync_WhenValidPreference_ShouldCreateSuccessfully()
    {
        // Arrange
        var preference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            MilestonesJson = """[{"type": "MeasurementsDue", "enabled": true}]""",
            Frequency = "Daily"
        };

        // Act
        var result = await _service.CreateAsync(preference);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.EmailEnabled);
        Assert.False(string.IsNullOrEmpty(result.UnsubscribeToken));
        Assert.True(result.CreatedAt <= DateTime.UtcNow);
        Assert.True(result.UpdatedAt <= DateTime.UtcNow);

        // Verify audit service was called
        _mockAuditService.Verify(
            x => x.LogRoleAccessAttemptAsync(
                _testUserId, 
                It.IsAny<UserRole>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                true, 
                null, 
                null, 
                null, 
                It.IsAny<string>(),
                null),
            Times.Once);
    }

    /// <summary>
    /// Test: CreateAsync should throw InvalidOperationException when preferences already exist
    /// </summary>
    [Fact]
    public async Task CreateAsync_WhenPreferencesAlreadyExist_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var existingPreference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.Add(existingPreference);
        await _context.SaveChangesAsync();

        var newPreference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = false,
            MilestonesJson = "[]",
            Frequency = "Weekly"
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(newPreference));
        Assert.Equal($"User {_testUserId} already has notification preferences", exception.Message);
    }

    /// <summary>
    /// Test: CreateAsync should throw ArgumentNullException when preference is null
    /// </summary>
    [Fact]
    public async Task CreateAsync_WhenPreferenceIsNull_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.CreateAsync(null!));
    }

    #endregion

    #region CreateDefaultPreferencesAsync Tests

    /// <summary>
    /// Test: CreateDefaultPreferencesAsync should create preferences with all milestones enabled
    /// </summary>
    [Fact]
    public async Task CreateDefaultPreferencesAsync_WhenValidUserId_ShouldCreateDefaultPreferences()
    {
        // Act
        var result = await _service.CreateDefaultPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.EmailEnabled);
        Assert.Equal("Immediate", result.Frequency);
        
        // Verify milestones JSON contains expected defaults
        Assert.Contains("MeasurementsDue", result.MilestonesJson);
        Assert.Contains("ProofApproval", result.MilestonesJson);
        Assert.Contains("ProductionStart", result.MilestonesJson);
        Assert.Contains("Shipping", result.MilestonesJson);
        Assert.Contains("Delivery", result.MilestonesJson);
    }

    /// <summary>
    /// Test: CreateDefaultPreferencesAsync should throw ArgumentException for empty user ID
    /// </summary>
    [Fact]
    public async Task CreateDefaultPreferencesAsync_WhenUserIdIsEmpty_ShouldThrowArgumentException()
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateDefaultPreferencesAsync(Guid.Empty));
        Assert.Equal("User ID cannot be empty (Parameter 'userId')", exception.Message);
    }

    #endregion

    #region UpdateAsync Tests

    /// <summary>
    /// Test: UpdateAsync should successfully update existing preferences
    /// </summary>
    [Fact]
    public async Task UpdateAsync_WhenValidPreference_ShouldUpdateSuccessfully()
    {
        // Arrange
        var originalPreference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            MilestonesJson = """[{"type": "MeasurementsDue", "enabled": true}]""",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.Add(originalPreference);
        await _context.SaveChangesAsync();

        // Store the original ID to track the same preference
        var originalId = originalPreference.Id;

        // Modify preferences
        originalPreference.EmailEnabled = false;
        originalPreference.Frequency = "Weekly";
        originalPreference.MilestonesJson = """[{"type": "MeasurementsDue", "enabled": false}]""";

        // Act
        await _service.UpdateAsync(originalPreference);

        // Assert
        var updated = await _context.NotificationPreferences.FindAsync(originalId);
        Assert.NotNull(updated);
        Assert.False(updated.EmailEnabled);
        Assert.Equal("Weekly", updated.Frequency);
        Assert.Contains("false", updated.MilestonesJson);

        // Note: Audit service call depends on change detection logic
        // For this test, we focus on verifying the core update functionality works
    }

    /// <summary>
    /// Test: UpdateAsync should throw InvalidOperationException when preference doesn't exist
    /// </summary>
    [Fact]
    public async Task UpdateAsync_WhenPreferenceNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var nonExistentPreference = new NotificationPreference
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            EmailEnabled = false,
            MilestonesJson = "[]",
            Frequency = "Daily"
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateAsync(nonExistentPreference));
        Assert.Equal($"Notification preference {nonExistentPreference.Id} not found", exception.Message);
    }

    /// <summary>
    /// Test: UpdateAsync should throw ArgumentNullException when preference is null
    /// </summary>
    [Fact]
    public async Task UpdateAsync_WhenPreferenceIsNull_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.UpdateAsync(null!));
    }

    #endregion

    #region UnsubscribeAsync Tests

    /// <summary>
    /// Test: UnsubscribeAsync should successfully unsubscribe user with valid token
    /// </summary>
    [Fact]
    public async Task UnsubscribeAsync_WhenValidToken_ShouldUnsubscribeSuccessfully()
    {
        // Arrange
        var token = "valid-unsubscribe-token";
        var preference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            UnsubscribeToken = token,
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.Add(preference);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UnsubscribeAsync(token);

        // Assert
        Assert.True(result);

        var updated = await _context.NotificationPreferences.FindAsync(preference.Id);
        Assert.NotNull(updated);
        Assert.False(updated.EmailEnabled);

        // Verify audit service was called
        _mockAuditService.Verify(
            x => x.LogRoleAccessAttemptAsync(
                _testUserId, 
                It.IsAny<UserRole>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                true, 
                null, 
                null, 
                null, 
                It.IsAny<string>(),
                null),
            Times.Once);
    }

    /// <summary>
    /// Test: UnsubscribeAsync should return false for invalid token
    /// </summary>
    [Fact]
    public async Task UnsubscribeAsync_WhenInvalidToken_ShouldReturnFalse()
    {
        // Act
        var result = await _service.UnsubscribeAsync("invalid-token");

        // Assert
        Assert.False(result);
    }

    /// <summary>
    /// Test: UnsubscribeAsync should throw ArgumentNullException for null token
    /// </summary>
    [Fact]
    public async Task UnsubscribeAsync_WhenTokenIsNull_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.UnsubscribeAsync(null!));
    }

    /// <summary>
    /// Test: UnsubscribeAsync should throw ArgumentNullException for empty token
    /// </summary>
    [Fact]
    public async Task UnsubscribeAsync_WhenTokenIsEmpty_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.UnsubscribeAsync(string.Empty));
    }

    #endregion

    #region GetActivePreferencesAsync Tests

    /// <summary>
    /// Test: GetActivePreferencesAsync should return only active preferences with email enabled
    /// </summary>
    [Fact]
    public async Task GetActivePreferencesAsync_ShouldReturnOnlyActiveEnabledPreferences()
    {
        // Arrange
        var activeUser = Guid.NewGuid();
        var inactiveUser = Guid.NewGuid();
        var disabledUser = Guid.NewGuid();

        // Add users to context
        var activeUserEntity = new User { Id = activeUser, Email = "active@test.com", Name = "Active User", Role = UserRole.Director, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var inactiveUserEntity = new User { Id = inactiveUser, Email = "inactive@test.com", Name = "Inactive User", Role = UserRole.Director, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var disabledUserEntity = new User { Id = disabledUser, Email = "disabled@test.com", Name = "Disabled User", Role = UserRole.Director, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        
        _context.Users.AddRange(activeUserEntity, inactiveUserEntity, disabledUserEntity);

        var activePreference = new NotificationPreference
        {
            UserId = activeUser,
            EmailEnabled = true,
            IsActive = true,
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        var inactivePreference = new NotificationPreference
        {
            UserId = inactiveUser,
            EmailEnabled = true,
            IsActive = false,
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        var disabledPreference = new NotificationPreference
        {
            UserId = disabledUser,
            EmailEnabled = false,
            IsActive = true,
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.AddRange(activePreference, inactivePreference, disabledPreference);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActivePreferencesAsync();

        // Assert
        var resultList = result.ToList();
        Assert.Single(resultList);
        Assert.Equal(activeUser, resultList[0].UserId);
    }

    #endregion

    #region GenerateUnsubscribeTokenAsync Tests

    /// <summary>
    /// Test: GenerateUnsubscribeTokenAsync should generate and save new token for existing preferences
    /// </summary>
    [Fact]
    public async Task GenerateUnsubscribeTokenAsync_WhenPreferencesExist_ShouldGenerateNewToken()
    {
        // Arrange
        var preference = new NotificationPreference
        {
            UserId = _testUserId,
            EmailEnabled = true,
            UnsubscribeToken = "old-token",
            MilestonesJson = "[]",
            Frequency = "Immediate"
        };

        _context.NotificationPreferences.Add(preference);
        await _context.SaveChangesAsync();

        // Act
        var newToken = await _service.GenerateUnsubscribeTokenAsync(_testUserId);

        // Assert
        Assert.NotNull(newToken);
        Assert.NotEmpty(newToken);
        Assert.NotEqual("old-token", newToken);

        var updated = await _context.NotificationPreferences.FindAsync(preference.Id);
        Assert.NotNull(updated);
        Assert.Equal(newToken, updated.UnsubscribeToken);
    }

    /// <summary>
    /// Test: GenerateUnsubscribeTokenAsync should return token when no preferences exist
    /// </summary>
    [Fact]
    public async Task GenerateUnsubscribeTokenAsync_WhenNoPreferencesExist_ShouldReturnToken()
    {
        // Act
        var token = await _service.GenerateUnsubscribeTokenAsync(_testUserId);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);
    }

    /// <summary>
    /// Test: GenerateUnsubscribeTokenAsync should throw ArgumentException for empty user ID
    /// </summary>
    [Fact]
    public async Task GenerateUnsubscribeTokenAsync_WhenUserIdIsEmpty_ShouldThrowArgumentException()
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.GenerateUnsubscribeTokenAsync(Guid.Empty));
        Assert.Equal("User ID cannot be empty (Parameter 'userId')", exception.Message);
    }

    #endregion

    /// <summary>
    /// Disposes test resources including in-memory database context
    /// </summary>
    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}