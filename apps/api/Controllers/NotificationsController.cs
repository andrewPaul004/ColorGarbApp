using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ColorGarbApi.Controllers;

/// <summary>
/// API controller for managing notification preferences and email notification history.
/// Provides endpoints for CRUD operations on user notification settings and delivery tracking.
/// </summary>
/// <since>3.1.0</since>
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationPreferenceService _notificationPreferenceService;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationsController> _logger;

    /// <summary>
    /// Initializes a new instance of the NotificationsController
    /// </summary>
    /// <param name="notificationPreferenceService">Service for notification preference operations</param>
    /// <param name="emailService">Service for email operations</param>
    /// <param name="logger">Logger for diagnostic information</param>
    public NotificationsController(
        INotificationPreferenceService notificationPreferenceService,
        IEmailService emailService,
        ILogger<NotificationsController> logger)
    {
        _notificationPreferenceService = notificationPreferenceService ?? throw new ArgumentNullException(nameof(notificationPreferenceService));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Retrieves notification preferences for a specific user.
    /// Returns current preference settings and available milestone options.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>User's notification preferences and available milestone types</returns>
    /// <response code="200">Preferences retrieved successfully</response>
    /// <response code="400">Invalid user ID format</response>
    /// <response code="404">User preferences not found</response>
    [HttpGet("users/{userId:guid}/preferences")]
    [ProducesResponseType(typeof(NotificationPreferencesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNotificationPreferences(Guid userId)
    {
        try
        {
            var preferences = await _notificationPreferenceService.GetByUserIdAsync(userId);
            
            if (preferences == null)
            {
                // Create default preferences if none exist
                preferences = await _notificationPreferenceService.CreateDefaultPreferencesAsync(userId);
            }

            var availableMilestones = new[]
            {
                new { type = "MeasurementsDue", name = "Measurements Due", description = "When performer measurements need to be submitted" },
                new { type = "ProofApproval", name = "Proof Approval", description = "When design proof is ready for review" },
                new { type = "ProductionStart", name = "Production Start", description = "When production begins on your order" },
                new { type = "Shipping", name = "Shipping", description = "When your order is shipped" },
                new { type = "Delivery", name = "Delivery", description = "When your order is delivered" }
            };

            var response = new NotificationPreferencesResponse
            {
                Preferences = preferences,
                AvailableMilestones = availableMilestones
            };

            _logger.LogDebug("Retrieved notification preferences for user {UserId}", userId);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid user ID format: {UserId} - {Error}", userId, ex.Message);
            return BadRequest($"Invalid user ID: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notification preferences for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving preferences");
        }
    }

    /// <summary>
    /// Updates notification preferences for a specific user.
    /// Allows modification of email settings, milestone preferences, and notification frequency.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="request">Updated preference settings</param>
    /// <returns>No content on successful update</returns>
    /// <response code="204">Preferences updated successfully</response>
    /// <response code="400">Invalid request data or user ID</response>
    /// <response code="404">User preferences not found</response>
    [HttpPut("users/{userId:guid}/preferences")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateNotificationPreferences(Guid userId, [FromBody] UpdatePreferencesRequest request)
    {
        if (request == null)
        {
            return BadRequest("Request body is required");
        }

        try
        {
            var existingPreferences = await _notificationPreferenceService.GetByUserIdAsync(userId);
            if (existingPreferences == null)
            {
                return NotFound("User preferences not found");
            }

            // Validate milestone data
            try
            {
                JsonSerializer.Deserialize<List<MilestonePreference>>(JsonSerializer.Serialize(request.Milestones));
            }
            catch (JsonException)
            {
                return BadRequest("Invalid milestone preferences format");
            }

            // Update preferences
            existingPreferences.EmailEnabled = request.EmailEnabled;
            existingPreferences.Frequency = request.Frequency;
            existingPreferences.MilestonesJson = JsonSerializer.Serialize(request.Milestones);

            await _notificationPreferenceService.UpdateAsync(existingPreferences);

            _logger.LogInformation("Updated notification preferences for user {UserId}", userId);

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid request for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Operation failed for user {UserId}: {Error}", userId, ex.Message);
            return NotFound($"Operation failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating preferences");
        }
    }

    /// <summary>
    /// Unsubscribes a user from email notifications using their unsubscribe token.
    /// This endpoint is typically called from email unsubscribe links.
    /// </summary>
    /// <param name="token">Unique unsubscribe token from email link</param>
    /// <returns>Unsubscribe confirmation with user information</returns>
    /// <response code="200">Unsubscribe successful</response>
    /// <response code="400">Invalid or missing token</response>
    /// <response code="404">Token not found or already used</response>
    [HttpGet("unsubscribe/{token}")]
    [ProducesResponseType(typeof(UnsubscribeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unsubscribe(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest("Unsubscribe token is required");
        }

        try
        {
            var success = await _notificationPreferenceService.UnsubscribeAsync(token);
            
            if (!success)
            {
                return NotFound("Invalid or expired unsubscribe token");
            }

            var response = new UnsubscribeResponse
            {
                Success = true,
                Message = "You have been successfully unsubscribed from email notifications. You can re-enable notifications in your account settings."
            };

            _logger.LogInformation("User unsubscribed successfully using token {Token}", token[..8]);

            return Ok(response);
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning("Invalid unsubscribe token: {Error}", ex.Message);
            return BadRequest("Invalid token format");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing unsubscribe for token {Token}", token);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing unsubscribe request");
        }
    }

    /// <summary>
    /// Retrieves email notification history for a specific user with pagination support.
    /// Shows delivery status, timestamps, and email details for audit purposes.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number (1-based, default: 1)</param>
    /// <param name="pageSize">Number of records per page (default: 50, max: 100)</param>
    /// <returns>List of email notifications with delivery tracking information</returns>
    /// <response code="200">Notification history retrieved successfully</response>
    /// <response code="400">Invalid user ID or pagination parameters</response>
    [HttpGet("users/{userId:guid}/history")]
    [ProducesResponseType(typeof(List<EmailNotificationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetNotificationHistory(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1)
        {
            return BadRequest("Page must be greater than 0");
        }

        if (pageSize < 1 || pageSize > 100)
        {
            return BadRequest("Page size must be between 1 and 100");
        }

        try
        {
            var notifications = await _emailService.GetNotificationHistoryAsync(userId.ToString(), page, pageSize);
            
            var response = notifications.Select(n => new EmailNotificationResponse
            {
                Id = n.Id,
                TemplateName = n.TemplateName,
                Subject = n.Subject,
                Status = n.Status,
                DeliveryAttempts = n.DeliveryAttempts,
                CreatedAt = n.CreatedAt,
                LastAttemptAt = n.LastAttemptAt,
                DeliveredAt = n.DeliveredAt,
                ErrorMessage = n.ErrorMessage
            }).ToList();

            _logger.LogDebug("Retrieved {Count} notification history records for user {UserId} (page {Page})", 
                response.Count, userId, page);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid parameters for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Invalid parameters: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notification history for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving notification history");
        }
    }

    /// <summary>
    /// Webhook endpoint for receiving email delivery status updates from email service providers.
    /// This is typically called by SendGrid, AWS SES, or other email services to report delivery status.
    /// </summary>
    /// <param name="notificationId">Unique identifier of the email notification</param>
    /// <param name="request">Delivery status update information</param>
    /// <returns>No content on successful status update</returns>
    /// <response code="204">Status updated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="404">Notification not found</response>
    [HttpPost("webhook/delivery-status/{notificationId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDeliveryStatus(Guid notificationId, [FromBody] DeliveryStatusRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest("Status is required");
        }

        try
        {
            var success = await _emailService.UpdateDeliveryStatusAsync(notificationId.ToString(), request.Status, request.ErrorMessage);
            
            if (!success)
            {
                return NotFound("Notification not found");
            }

            _logger.LogDebug("Updated delivery status for notification {NotificationId} to {Status}", notificationId, request.Status);

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid delivery status update for notification {NotificationId}: {Error}", notificationId, ex.Message);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating delivery status for notification {NotificationId}", notificationId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating delivery status");
        }
    }

    #region Request/Response Models

    /// <summary>
    /// Response model for notification preferences endpoint
    /// </summary>
    public class NotificationPreferencesResponse
    {
        public NotificationPreference Preferences { get; set; } = null!;
        public object[] AvailableMilestones { get; set; } = Array.Empty<object>();
    }

    /// <summary>
    /// Request model for updating notification preferences
    /// </summary>
    public class UpdatePreferencesRequest
    {
        public bool EmailEnabled { get; set; } = true;
        public List<MilestonePreference> Milestones { get; set; } = new();
        public string Frequency { get; set; } = "Immediate";
    }

    /// <summary>
    /// Milestone preference configuration
    /// </summary>
    public class MilestonePreference
    {
        public string Type { get; set; } = string.Empty;
        public bool Enabled { get; set; } = true;
        public int? NotifyBefore { get; set; }
    }

    /// <summary>
    /// Response model for unsubscribe endpoint
    /// </summary>
    public class UnsubscribeResponse
    {
        public bool Success { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model for email notification history
    /// </summary>
    public class EmailNotificationResponse
    {
        public Guid Id { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int DeliveryAttempts { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastAttemptAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Request model for delivery status webhook updates
    /// </summary>
    public class DeliveryStatusRequest
    {
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    #endregion
}