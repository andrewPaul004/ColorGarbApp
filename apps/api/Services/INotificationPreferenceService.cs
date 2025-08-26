using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for managing notification preference operations.
/// Provides business logic for user notification preferences including CRUD operations and specialized queries.
/// </summary>
/// <since>3.1.0</since>
public interface INotificationPreferenceService
{
    /// <summary>
    /// Retrieves notification preferences for a specific user
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>NotificationPreference if found, null otherwise</returns>
    /// <exception cref="ArgumentException">Thrown when userId is invalid</exception>
    Task<NotificationPreference?> GetByUserIdAsync(Guid userId);

    /// <summary>
    /// Creates a new notification preference record with default settings
    /// </summary>
    /// <param name="preference">NotificationPreference entity to create</param>
    /// <returns>Created NotificationPreference with generated ID and token</returns>
    /// <exception cref="ArgumentNullException">Thrown when preference is null</exception>
    /// <exception cref="InvalidOperationException">Thrown when user already has preferences</exception>
    Task<NotificationPreference> CreateAsync(NotificationPreference preference);

    /// <summary>
    /// Updates an existing notification preference record
    /// </summary>
    /// <param name="preference">NotificationPreference entity to update</param>
    /// <returns>Task representing the async operation</returns>
    /// <exception cref="ArgumentNullException">Thrown when preference is null</exception>
    /// <exception cref="InvalidOperationException">Thrown when preference doesn't exist</exception>
    Task UpdateAsync(NotificationPreference preference);

    /// <summary>
    /// Unsubscribes a user using their unsubscribe token
    /// </summary>
    /// <param name="token">Unique unsubscribe token</param>
    /// <returns>True if unsubscribe was successful, false if token not found</returns>
    /// <exception cref="ArgumentNullException">Thrown when token is null or empty</exception>
    Task<bool> UnsubscribeAsync(string token);

    /// <summary>
    /// Retrieves all active notification preferences for batch processing
    /// </summary>
    /// <returns>Collection of active NotificationPreference records</returns>
    Task<IEnumerable<NotificationPreference>> GetActivePreferencesAsync();

    /// <summary>
    /// Generates and sets a unique unsubscribe token for a user
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>Generated unsubscribe token</returns>
    /// <exception cref="ArgumentException">Thrown when userId is invalid</exception>
    Task<string> GenerateUnsubscribeTokenAsync(Guid userId);

    /// <summary>
    /// Creates default notification preferences for a new user
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>Created NotificationPreference with default settings</returns>
    /// <exception cref="ArgumentException">Thrown when userId is invalid</exception>
    Task<NotificationPreference> CreateDefaultPreferencesAsync(Guid userId);
}