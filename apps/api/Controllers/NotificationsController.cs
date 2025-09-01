using ColorGarbApi.Models.Entities;
using ColorGarbApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ColorGarbApi.Controllers;

/// <summary>
/// API controller for managing notification preferences and email notification history.
/// Provides endpoints for CRUD operations on user notification settings and email delivery tracking.
/// SMS functionality has been removed.
/// </summary>
/// <since>3.1.0 (SMS functionality removed in 3.2.0)</since>
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

            // Use actual order stages as available milestones plus special milestone types
            var availableMilestones = new[]
            {
                new { type = "Initial Consultation", name = "Initial Consultation", description = "When initial consultation begins" },
                new { type = "Design Proposal", name = "Design Proposal", description = "When design proposal is submitted" },
                new { type = "Proof Approval", name = "Proof Approval", description = "When design proof is ready for review" },
                new { type = "Measurements", name = "Measurements", description = "When performer measurements need to be submitted" },
                new { type = "Production Planning", name = "Production Planning", description = "When production planning begins" },
                new { type = "Cutting", name = "Cutting", description = "When fabric cutting stage begins" },
                new { type = "Sewing", name = "Sewing", description = "When sewing stage begins" },
                new { type = "Quality Control", name = "Quality Control", description = "When quality control inspection begins" },
                new { type = "Finishing", name = "Finishing", description = "When finishing touches are applied" },
                new { type = "Final Inspection", name = "Final Inspection", description = "When final inspection is completed" },
                new { type = "Packaging", name = "Packaging", description = "When order is being packaged" },
                new { type = "Shipping Preparation", name = "Shipping Preparation", description = "When order is prepared for shipping" },
                new { type = "Ship Order", name = "Ship Order", description = "When order is shipped" },
                new { type = "Delivery", name = "Delivery", description = "When order is delivered" },
                new { type = "Ship Date Change", name = "Ship Date Change", description = "When order delivery dates are revised" }
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
    /// Allows modification of email settings and milestone-specific preferences.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="request">Updated preference settings</param>
    /// <returns>No content on successful update</returns>
    /// <response code="204">Preferences updated successfully</response>
    /// <response code="400">Invalid request data or user ID format</response>
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
                return NotFound($"Preferences not found for user {userId}");
            }

            // Update preferences
            existingPreferences.EmailEnabled = request.EmailEnabled;
            existingPreferences.SmsEnabled = false; // SMS always disabled
            existingPreferences.Frequency = request.Frequency;
            existingPreferences.MilestonesJson = JsonSerializer.Serialize(request.Milestones);

            await _notificationPreferenceService.UpdateAsync(existingPreferences);

            _logger.LogInformation("Updated notification preferences for user {UserId}", userId);

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid update request for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating preferences");
        }
    }

    /// <summary>
    /// Retrieves email notification history for a specific user with pagination support.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number (1-based, default: 1)</param>
    /// <param name="pageSize">Number of records per page (default: 50, max: 100)</param>
    /// <returns>List of email notifications with delivery tracking information</returns>
    /// <response code="200">Email history retrieved successfully</response>
    /// <response code="400">Invalid user ID or pagination parameters</response>
    [HttpGet("users/{userId:guid}/email-history")]
    [ProducesResponseType(typeof(List<EmailNotificationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetEmailNotificationHistory(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page < 1)
        {
            return BadRequest("Page number must be greater than 0");
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

            _logger.LogDebug("Retrieved {Count} email history records for user {UserId} (page {Page})",
                response.Count, userId, page);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving email history for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving email history");
        }
    }

    /// <summary>
    /// Unsubscribes a user from email notifications using a unique unsubscribe token.
    /// </summary>
    /// <param name="token">Unique unsubscribe token</param>
    /// <returns>Unsubscribe result</returns>
    /// <response code="200">Successfully unsubscribed</response>
    /// <response code="400">Invalid or expired token</response>
    /// <response code="404">Token not found</response>
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
                Message = "You have been successfully unsubscribed from email notifications"
            };

            _logger.LogInformation("User unsubscribed using token {Token}", token);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing unsubscribe for token {Token}", token);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing unsubscribe request");
        }
    }

    #region Request/Response Models

    /// <summary>
    /// Response model for notification preferences
    /// </summary>
    public class NotificationPreferencesResponse
    {
        public NotificationPreference Preferences { get; set; } = new();
        public object AvailableMilestones { get; set; } = new();
    }

    /// <summary>
    /// Request model for updating notification preferences
    /// </summary>
    public class UpdatePreferencesRequest
    {
        public bool EmailEnabled { get; set; } = true;
        public bool SmsEnabled { get; set; } = false; // Always false - kept for compatibility
        public List<MilestonePreference> Milestones { get; set; } = new();
        public string Frequency { get; set; } = "Immediate";
    }

    /// <summary>
    /// Milestone-specific preference settings
    /// </summary>
    public class MilestonePreference
    {
        public string Type { get; set; } = string.Empty;
        public bool Enabled { get; set; } = true;
        public bool EmailEnabled { get; set; } = true;
        public bool SmsEnabled { get; set; } = false; // Always false - kept for compatibility
        public int? NotifyBefore { get; set; }
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
    /// Response model for unsubscribe operations
    /// </summary>
    public class UnsubscribeResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    #endregion
}