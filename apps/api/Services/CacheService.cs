using StackExchange.Redis;
using System.Text.Json;

namespace ColorGarbApi.Services;

/// <summary>
/// Service for Redis caching operations
/// Provides session storage and data caching functionality
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Set a value in cache with expiration
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <param name="value">Value to cache</param>
    /// <param name="expiry">Expiration time</param>
    /// <returns>Success status</returns>
    Task<bool> SetAsync(string key, object value, TimeSpan? expiry = null);

    /// <summary>
    /// Get a value from cache
    /// </summary>
    /// <typeparam name="T">Type to deserialize to</typeparam>
    /// <param name="key">Cache key</param>
    /// <returns>Cached value or default</returns>
    Task<T?> GetAsync<T>(string key);

    /// <summary>
    /// Delete a value from cache
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <returns>Success status</returns>
    Task<bool> DeleteAsync(string key);

    /// <summary>
    /// Check if Redis connection is healthy
    /// </summary>
    /// <returns>Connection status</returns>
    bool IsConnected();
}

/// <summary>
/// Redis implementation of cache service
/// Handles session storage and data caching using Redis
/// </summary>
public class RedisCacheService : ICacheService
{
    private readonly IDatabase _database;
    private readonly IConnectionMultiplexer _connectionMultiplexer;
    private readonly ILogger<RedisCacheService> _logger;

    /// <summary>
    /// Initializes the Redis cache service
    /// </summary>
    /// <param name="connectionMultiplexer">Redis connection multiplexer</param>
    /// <param name="logger">Logger instance</param>
    public RedisCacheService(IConnectionMultiplexer connectionMultiplexer, ILogger<RedisCacheService> logger)
    {
        _connectionMultiplexer = connectionMultiplexer;
        _database = connectionMultiplexer.GetDatabase();
        _logger = logger;
    }

    /// <summary>
    /// Set a value in Redis cache with optional expiration
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <param name="value">Value to cache (will be JSON serialized)</param>
    /// <param name="expiry">Optional expiration time (default: 1 hour)</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> SetAsync(string key, object value, TimeSpan? expiry = null)
    {
        try
        {
            var serializedValue = JsonSerializer.Serialize(value);
            expiry ??= TimeSpan.FromHours(1); // Default 1 hour expiration

            var result = await _database.StringSetAsync(key, serializedValue, expiry);

            if (result)
            {
                _logger.LogDebug("Successfully cached value for key: {Key}", key);
            }
            else
            {
                _logger.LogWarning("Failed to cache value for key: {Key}", key);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache value for key: {Key}", key);
            return false;
        }
    }

    /// <summary>
    /// Get a value from Redis cache and deserialize to specified type
    /// </summary>
    /// <typeparam name="T">Type to deserialize to</typeparam>
    /// <param name="key">Cache key</param>
    /// <returns>Deserialized value or default(T) if not found</returns>
    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var cachedValue = await _database.StringGetAsync(key);

            if (!cachedValue.HasValue)
            {
                _logger.LogDebug("Cache miss for key: {Key}", key);
                return default(T);
            }

            var result = JsonSerializer.Deserialize<T>(cachedValue!);
            _logger.LogDebug("Cache hit for key: {Key}", key);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache value for key: {Key}", key);
            return default(T);
        }
    }

    /// <summary>
    /// Delete a value from Redis cache
    /// </summary>
    /// <param name="key">Cache key to delete</param>
    /// <returns>True if key was deleted, false if key didn't exist</returns>
    public async Task<bool> DeleteAsync(string key)
    {
        try
        {
            var result = await _database.KeyDeleteAsync(key);

            if (result)
            {
                _logger.LogDebug("Successfully deleted cache key: {Key}", key);
            }
            else
            {
                _logger.LogDebug("Cache key not found for deletion: {Key}", key);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting cache key: {Key}", key);
            return false;
        }
    }

    /// <summary>
    /// Check if Redis connection is healthy
    /// </summary>
    /// <returns>True if connected, false otherwise</returns>
    public bool IsConnected()
    {
        try
        {
            return _connectionMultiplexer.IsConnected;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking Redis connection status");
            return false;
        }
    }
}