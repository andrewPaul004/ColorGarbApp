using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using ColorGarbApi.Data;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Health check controller for monitoring API and infrastructure status
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ColorGarbDbContext _context;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<HealthController> _logger;

    /// <summary>
    /// Initializes the health controller
    /// </summary>
    /// <param name="context">Database context</param>
    /// <param name="redis">Redis connection</param>
    /// <param name="logger">Logger instance</param>
    public HealthController(
        ColorGarbDbContext context,
        IConnectionMultiplexer redis,
        ILogger<HealthController> logger)
    {
        _context = context;
        _redis = redis;
        _logger = logger;
    }

    /// <summary>
    /// Basic health check endpoint
    /// </summary>
    /// <returns>Health status response</returns>
    /// <response code="200">API is healthy</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"
        });
    }

    /// <summary>
    /// Detailed health check including database and Redis connectivity
    /// </summary>
    /// <returns>Detailed health status response</returns>
    /// <response code="200">All services are healthy</response>
    /// <response code="503">One or more services are unhealthy</response>
    [HttpGet("detailed")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetDetailed()
    {
        var healthChecks = new Dictionary<string, object>();
        var overallStatus = "healthy";

        // Check API status
        healthChecks["api"] = new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow
        };

        // Check database connectivity
        try
        {
            var dbConnectionOk = await _context.Database.CanConnectAsync();
            var organizationCount = await _context.Organizations.CountAsync();

            healthChecks["database"] = new
            {
                status = dbConnectionOk ? "healthy" : "unhealthy",
                canConnect = dbConnectionOk,
                organizationCount = organizationCount,
                connectionString = _context.Database.GetConnectionString()?.Split(';')[0] // Only show server part
            };

            if (!dbConnectionOk)
                overallStatus = "unhealthy";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            healthChecks["database"] = new
            {
                status = "unhealthy",
                error = ex.Message
            };
            overallStatus = "unhealthy";
        }

        // Check Redis connectivity
        try
        {
            var database = _redis.GetDatabase();
            var redisKey = "health_check_" + Guid.NewGuid();
            var testValue = "test_" + DateTime.UtcNow.Ticks;

            await database.StringSetAsync(redisKey, testValue, TimeSpan.FromSeconds(10));
            var retrievedValue = await database.StringGetAsync(redisKey);
            var redisConnectionOk = retrievedValue == testValue;

            await database.KeyDeleteAsync(redisKey);

            healthChecks["redis"] = new
            {
                status = redisConnectionOk ? "healthy" : "unhealthy",
                canConnect = _redis.IsConnected,
                testPassed = redisConnectionOk
            };

            if (!redisConnectionOk)
                overallStatus = "unhealthy";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis health check failed");
            healthChecks["redis"] = new
            {
                status = "unhealthy",
                error = ex.Message
            };
            overallStatus = "unhealthy";
        }

        var response = new
        {
            status = overallStatus,
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development",
            checks = healthChecks
        };

        return overallStatus == "healthy"
            ? Ok(response)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}