using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for notification preference business logic operations.
/// Handles user notification preferences with proper error handling, validation, and audit logging.
/// </summary>
/// <since>3.1.0</since>
public class NotificationPreferenceService : INotificationPreferenceService
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<NotificationPreferenceService> _logger;
    private readonly IAuditService _auditService;

    /// <summary>
    /// Initializes a new instance of the NotificationPreferenceService
    /// </summary>
    /// <param name="context">Database context for data access</param>
    /// <param name="logger">Logger for diagnostic information</param>
    /// <param name="auditService">Audit service for tracking changes</param>
    public NotificationPreferenceService(
        ColorGarbDbContext context, 
        ILogger<NotificationPreferenceService> logger,
        IAuditService auditService)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
    }

    /// <inheritdoc />
    public async Task<NotificationPreference?> GetByUserIdAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty", nameof(userId));
        }

        try
        {
            var preference = await _context.NotificationPreferences
                .Include(np => np.User)
                .FirstOrDefaultAsync(np => np.UserId == userId && np.IsActive);

            _logger.LogDebug("Retrieved notification preferences for user {UserId}: {Found}", 
                userId, preference != null);

            return preference;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notification preferences for user {UserId}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<NotificationPreference> CreateAsync(NotificationPreference preference)
    {
        if (preference == null)
        {
            throw new ArgumentNullException(nameof(preference));
        }

        try
        {
            // Check if user already has preferences
            var existing = await GetByUserIdAsync(preference.UserId);
            if (existing != null)
            {
                throw new InvalidOperationException($"User {preference.UserId} already has notification preferences");
            }

            // Generate unsubscribe token
            preference.UnsubscribeToken = GenerateSecureToken();
            preference.CreatedAt = DateTime.UtcNow;
            preference.UpdatedAt = DateTime.UtcNow;

            _context.NotificationPreferences.Add(preference);
            await _context.SaveChangesAsync();

            await _auditService.LogRoleAccessAttemptAsync(
                preference.UserId, 
                UserRole.Director, 
                "notification-preferences", 
                "POST", 
                true, 
                null, 
                null, 
                null, 
                $"Created notification preferences",
                null);

            _logger.LogInformation("Created notification preferences for user {UserId} with ID {PreferenceId}", 
                preference.UserId, preference.Id);

            return preference;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating notification preferences for user {UserId}", preference.UserId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<NotificationPreference> CreateDefaultPreferencesAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty", nameof(userId));
        }

        try
        {
            // Check if user exists first to prevent orphaned preferences
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!userExists)
            {
                throw new InvalidOperationException($"User {userId} does not exist");
            }

            // Default milestones JSON with all notification types enabled
            const string defaultMilestones = """
                [
                    {"type": "MeasurementsDue", "enabled": true, "notifyBefore": 24},
                    {"type": "ProofApproval", "enabled": true, "notifyBefore": 0},
                    {"type": "ProductionStart", "enabled": true, "notifyBefore": 0},
                    {"type": "Shipping", "enabled": true, "notifyBefore": 0},
                    {"type": "Delivery", "enabled": true, "notifyBefore": 0}
                ]
                """;

            var defaultPreference = new NotificationPreference
            {
                UserId = userId,
                EmailEnabled = true,
                MilestonesJson = defaultMilestones,
                Frequency = "Immediate",
                IsActive = true
            };

            return await CreateAsync(defaultPreference);
        }
        catch (Exception ex) when (!(ex is ArgumentException || ex is InvalidOperationException))
        {
            _logger.LogError(ex, "Unexpected error creating default preferences for user {UserId}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task UpdateAsync(NotificationPreference preference)
    {
        if (preference == null)
        {
            throw new ArgumentNullException(nameof(preference));
        }

        try
        {
            var existing = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.Id == preference.Id);

            if (existing == null)
            {
                throw new InvalidOperationException($"Notification preference {preference.Id} not found");
            }

            // Track changes for audit
            var changes = new List<string>();
            if (existing.EmailEnabled != preference.EmailEnabled)
                changes.Add($"EmailEnabled: {existing.EmailEnabled} -> {preference.EmailEnabled}");
            if (existing.Frequency != preference.Frequency)
                changes.Add($"Frequency: {existing.Frequency} -> {preference.Frequency}");
            if (existing.MilestonesJson != preference.MilestonesJson)
                changes.Add("Milestones configuration updated");

            // Update properties
            existing.EmailEnabled = preference.EmailEnabled;
            existing.MilestonesJson = preference.MilestonesJson;
            existing.Frequency = preference.Frequency;
            existing.IsActive = preference.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (changes.Any())
            {
                await _auditService.LogRoleAccessAttemptAsync(
                    preference.UserId, 
                    UserRole.Director, 
                    "notification-preferences", 
                    "PUT", 
                    true, 
                    null, 
                    null, 
                    null, 
                    $"Updated notification preferences: {string.Join(", ", changes)}",
                    null);
            }

            _logger.LogInformation("Updated notification preferences {PreferenceId} for user {UserId}", 
                preference.Id, preference.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences {PreferenceId}", preference.Id);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> UnsubscribeAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ArgumentNullException(nameof(token));
        }

        try
        {
            var preference = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.UnsubscribeToken == token && np.IsActive);

            if (preference == null)
            {
                _logger.LogWarning("Unsubscribe attempt with invalid token: {Token}", token);
                return false;
            }

            preference.EmailEnabled = false;
            preference.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogRoleAccessAttemptAsync(
                preference.UserId, 
                UserRole.Director, 
                "notification-preferences-unsubscribe", 
                "POST", 
                true, 
                null, 
                null, 
                null, 
                $"User unsubscribed via email link (token: {token[..8]}...)",
                null);

            _logger.LogInformation("User {UserId} unsubscribed via token {Token}", 
                preference.UserId, token[..8]);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing unsubscribe for token {Token}", token);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IEnumerable<NotificationPreference>> GetActivePreferencesAsync()
    {
        try
        {
            var preferences = await _context.NotificationPreferences
                .Include(np => np.User)
                .Where(np => np.IsActive && np.EmailEnabled)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} active notification preferences", preferences.Count);

            return preferences;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active notification preferences");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<string> GenerateUnsubscribeTokenAsync(Guid userId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty", nameof(userId));
        }

        try
        {
            var token = GenerateSecureToken();
            
            var preference = await GetByUserIdAsync(userId);
            if (preference != null)
            {
                preference.UnsubscribeToken = token;
                preference.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await _auditService.LogRoleAccessAttemptAsync(
                    userId, 
                    UserRole.Director, 
                    "notification-preferences-token", 
                    "POST", 
                    true, 
                    null, 
                    null, 
                    null, 
                    "Generated new unsubscribe token",
                    null);
            }

            _logger.LogDebug("Generated unsubscribe token for user {UserId}", userId);

            return token;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating unsubscribe token for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Generates a cryptographically secure random token for unsubscribe functionality
    /// </summary>
    /// <returns>Base64-encoded secure token</returns>
    private static string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var tokenBytes = new byte[32];
        rng.GetBytes(tokenBytes);
        return Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}