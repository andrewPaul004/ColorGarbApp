using Microsoft.AspNetCore.Mvc;
using ColorGarbApi.Services;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Cache controller for testing Redis functionality in development
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CacheController : ControllerBase
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CacheController> _logger;

    /// <summary>
    /// Initializes the cache controller
    /// </summary>
    /// <param name="cacheService">Cache service instance</param>
    /// <param name="logger">Logger instance</param>
    public CacheController(ICacheService cacheService, ILogger<CacheController> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    /// <summary>
    /// Test setting a value in cache
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <param name="value">Value to cache</param>
    /// <returns>Success status</returns>
    /// <response code="200">Value cached successfully</response>
    /// <response code="500">Failed to cache value</response>
    [HttpPost("set")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SetValue([FromQuery] string key, [FromQuery] string value)
    {
        try
        {
            var success = await _cacheService.SetAsync(key, value, TimeSpan.FromMinutes(5));

            if (success)
            {
                return Ok(new { message = "Value cached successfully", key, value });
            }
            else
            {
                return StatusCode(500, new { message = "Failed to cache value" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching value");
            return StatusCode(500, new { message = "Error caching value", error = ex.Message });
        }
    }

    /// <summary>
    /// Test getting a value from cache
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <returns>Cached value or not found</returns>
    /// <response code="200">Value retrieved successfully</response>
    /// <response code="404">Value not found in cache</response>
    /// <response code="500">Error retrieving value</response>
    [HttpGet("get")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetValue([FromQuery] string key)
    {
        try
        {
            var value = await _cacheService.GetAsync<string>(key);

            if (value != null)
            {
                return Ok(new { key, value });
            }
            else
            {
                return NotFound(new { message = "Value not found in cache", key });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving value from cache");
            return StatusCode(500, new { message = "Error retrieving value", error = ex.Message });
        }
    }

    /// <summary>
    /// Test deleting a value from cache
    /// </summary>
    /// <param name="key">Cache key</param>
    /// <returns>Deletion status</returns>
    /// <response code="200">Value deleted successfully</response>
    /// <response code="404">Value not found in cache</response>
    /// <response code="500">Error deleting value</response>
    [HttpDelete("delete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteValue([FromQuery] string key)
    {
        try
        {
            var deleted = await _cacheService.DeleteAsync(key);

            if (deleted)
            {
                return Ok(new { message = "Value deleted successfully", key });
            }
            else
            {
                return NotFound(new { message = "Value not found in cache", key });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting value from cache");
            return StatusCode(500, new { message = "Error deleting value", error = ex.Message });
        }
    }

    /// <summary>
    /// Check cache connection status
    /// </summary>
    /// <returns>Connection status</returns>
    /// <response code="200">Cache is connected</response>
    /// <response code="503">Cache is not connected</response>
    [HttpGet("status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public IActionResult GetStatus()
    {
        try
        {
            var isConnected = _cacheService.IsConnected();

            if (isConnected)
            {
                return Ok(new { status = "connected", timestamp = DateTime.UtcNow });
            }
            else
            {
                return StatusCode(503, new { status = "disconnected", timestamp = DateTime.UtcNow });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache status");
            return StatusCode(503, new { status = "error", error = ex.Message, timestamp = DateTime.UtcNow });
        }
    }
}