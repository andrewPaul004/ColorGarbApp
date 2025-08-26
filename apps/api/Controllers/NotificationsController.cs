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
    private readonly ISmsService _smsService;
    private readonly IPhoneVerificationService _phoneVerificationService;
    private readonly ILogger<NotificationsController> _logger;

    /// <summary>
    /// Initializes a new instance of the NotificationsController
    /// </summary>
    /// <param name="notificationPreferenceService">Service for notification preference operations</param>
    /// <param name="emailService">Service for email operations</param>
    /// <param name="smsService">Service for SMS operations</param>
    /// <param name="phoneVerificationService">Service for phone verification operations</param>
    /// <param name="logger">Logger for diagnostic information</param>
    public NotificationsController(
        INotificationPreferenceService notificationPreferenceService,
        IEmailService emailService,
        ISmsService smsService,
        IPhoneVerificationService phoneVerificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationPreferenceService = notificationPreferenceService ?? throw new ArgumentNullException(nameof(notificationPreferenceService));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _smsService = smsService ?? throw new ArgumentNullException(nameof(smsService));
        _phoneVerificationService = phoneVerificationService ?? throw new ArgumentNullException(nameof(phoneVerificationService));
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
            existingPreferences.SmsEnabled = request.SmsEnabled;
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

    /// <summary>
    /// Sends a verification code to a phone number for SMS opt-in verification.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="request">Phone verification request</param>
    /// <returns>Verification details with expiration information</returns>
    /// <response code="200">Verification code sent successfully</response>
    /// <response code="400">Invalid phone number or rate limit exceeded</response>
    /// <response code="404">User not found</response>
    [HttpPost("users/{userId:guid}/phone/verify")]
    [ProducesResponseType(typeof(PhoneVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendPhoneVerification(Guid userId, [FromBody] PhoneVerificationRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest("Phone number is required");
        }

        try
        {
            var verification = await _phoneVerificationService.SendVerificationCodeAsync(userId.ToString(), request.PhoneNumber);

            var response = new PhoneVerificationResponse
            {
                Success = true,
                Message = "Verification code sent to your phone number",
                ExpiresAt = verification.ExpiresAt
            };

            _logger.LogInformation("Phone verification code sent to user {UserId}", userId);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid phone verification request for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Phone verification failed for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Verification failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending phone verification for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while sending verification code");
        }
    }

    /// <summary>
    /// Verifies a phone number using the provided verification token.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="request">Phone verification token</param>
    /// <returns>Verification result with phone number details</returns>
    /// <response code="200">Phone number verified successfully</response>
    /// <response code="400">Invalid or expired verification token</response>
    /// <response code="404">User not found</response>
    [HttpPut("users/{userId:guid}/phone/verify")]
    [ProducesResponseType(typeof(VerifyPhoneResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyPhoneNumber(Guid userId, [FromBody] VerifyPhoneRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.VerificationToken))
        {
            return BadRequest("Verification token is required");
        }

        try
        {
            var success = await _phoneVerificationService.VerifyPhoneNumberAsync(userId.ToString(), request.VerificationToken);

            if (!success)
            {
                return BadRequest("Invalid or expired verification token");
            }

            // Get updated preferences to return phone number
            var preferences = await _notificationPreferenceService.GetByUserIdAsync(userId);

            var response = new VerifyPhoneResponse
            {
                Success = true,
                PhoneNumber = preferences?.PhoneNumber ?? string.Empty,
                VerifiedAt = preferences?.PhoneVerifiedAt ?? DateTime.UtcNow
            };

            _logger.LogInformation("Phone number verified successfully for user {UserId}", userId);

            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid phone verification token for user {UserId}: {Error}", userId, ex.Message);
            return BadRequest($"Invalid token: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying phone number for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while verifying phone number");
        }
    }

    /// <summary>
    /// Retrieves SMS notification history for a specific user with pagination support.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number (1-based, default: 1)</param>
    /// <param name="pageSize">Number of records per page (default: 50, max: 100)</param>
    /// <returns>List of SMS notifications with delivery tracking information</returns>
    /// <response code="200">SMS history retrieved successfully</response>
    /// <response code="400">Invalid user ID or pagination parameters</response>
    [HttpGet("users/{userId:guid}/sms-history")]
    [ProducesResponseType(typeof(List<SmsNotificationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSmsNotificationHistory(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
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
            var notifications = await _smsService.GetSmsHistoryAsync(userId.ToString(), page, pageSize);

            var response = notifications.Select(n => new SmsNotificationResponse
            {
                Id = n.Id,
                PhoneNumber = n.PhoneNumber,
                Message = n.Message,
                Status = n.Status,
                DeliveryAttempts = n.DeliveryAttempts,
                CreatedAt = n.CreatedAt,
                LastAttemptAt = n.LastAttemptAt,
                DeliveredAt = n.DeliveredAt,
                ErrorMessage = n.ErrorMessage,
                Cost = n.Cost
            }).ToList();

            _logger.LogDebug("Retrieved {Count} SMS history records for user {UserId} (page {Page})",
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
            _logger.LogError(ex, "Error retrieving SMS history for user {UserId}", userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving SMS history");
        }
    }

    /// <summary>
    /// Webhook endpoint for receiving SMS delivery status updates from Twilio.
    /// </summary>
    /// <param name="request">Twilio webhook request</param>
    /// <returns>No content on successful status update</returns>
    /// <response code="204">Status updated successfully</response>
    /// <response code="400">Invalid request data</response>
    [HttpPost("webhook/sms-status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateSmsDeliveryStatus([FromBody] TwilioWebhookRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.MessageSid))
        {
            return BadRequest("MessageSid is required");
        }

        try
        {
            var success = await _smsService.UpdateDeliveryStatusAsync(request.MessageSid, request.MessageStatus, request.ErrorMessage);

            if (!success)
            {
                _logger.LogWarning("SMS notification not found for MessageSid: {MessageSid}", request.MessageSid);
            }

            _logger.LogDebug("Updated SMS delivery status for MessageSid {MessageSid} to {Status}",
                request.MessageSid, request.MessageStatus);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating SMS delivery status for MessageSid {MessageSid}", request.MessageSid);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating delivery status");
        }
    }

    /// <summary>
    /// Webhook endpoint for processing inbound SMS messages including opt-out handling.
    /// </summary>
    /// <param name="request">Twilio inbound SMS webhook request</param>
    /// <returns>TwiML response for Twilio</returns>
    /// <response code="200">Message processed successfully</response>
    [HttpPost("webhook/sms-inbound")]
    [Produces("application/xml")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ProcessInboundSms([FromForm] TwilioInboundSmsRequest request)
    {
        try
        {
            await _smsService.ProcessInboundSmsAsync(request.From ?? string.Empty, request.Body ?? string.Empty, request.MessageSid ?? string.Empty);

            // Return empty TwiML response
            var twimlResponse = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
            return Content(twimlResponse, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing inbound SMS");
            var errorResponse = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
            return Content(errorResponse, "application/xml");
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
        public bool SmsEnabled { get; set; } = false;
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
        public bool EmailEnabled { get; set; } = true;
        public bool SmsEnabled { get; set; } = false;
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

    /// <summary>
    /// Request model for phone verification
    /// </summary>
    public class PhoneVerificationRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model for phone verification
    /// </summary>
    public class PhoneVerificationResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    /// <summary>
    /// Request model for verifying phone number
    /// </summary>
    public class VerifyPhoneRequest
    {
        public string VerificationToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model for phone verification
    /// </summary>
    public class VerifyPhoneResponse
    {
        public bool Success { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime VerifiedAt { get; set; }
    }

    /// <summary>
    /// Response model for SMS notification history
    /// </summary>
    public class SmsNotificationResponse
    {
        public Guid Id { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int DeliveryAttempts { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastAttemptAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public string? ErrorMessage { get; set; }
        public decimal? Cost { get; set; }
    }

    /// <summary>
    /// Request model for Twilio webhook updates
    /// </summary>
    public class TwilioWebhookRequest
    {
        public string MessageSid { get; set; } = string.Empty;
        public string MessageStatus { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Request model for Twilio inbound SMS webhook
    /// </summary>
    public class TwilioInboundSmsRequest
    {
        public string? From { get; set; }
        public string? Body { get; set; }
        public string? MessageSid { get; set; }
    }

    #endregion
}