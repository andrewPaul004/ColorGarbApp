using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ColorGarbApi.Services;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using System.Security.Claims;

namespace ColorGarbApi.Controllers;

/// <summary>
/// API controller for communication audit trail operations.
/// Provides endpoints for retrieving communication logs, delivery status, and audit reports.
/// </summary>
/// <since>3.4.0</since>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommunicationAuditController : ControllerBase
{
    private readonly ICommunicationAuditService _auditService;
    private readonly ILogger<CommunicationAuditController> _logger;

    /// <summary>
    /// Initializes the communication audit controller.
    /// </summary>
    /// <param name="auditService">Communication audit service</param>
    /// <param name="logger">Logger instance</param>
    public CommunicationAuditController(
        ICommunicationAuditService auditService,
        ILogger<CommunicationAuditController> logger)
    {
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves communication logs with advanced search and filtering capabilities.
    /// Supports organization isolation and role-based access control.
    /// </summary>
    /// <param name="request">Search parameters and filters</param>
    /// <returns>Paginated communication audit results</returns>
    /// <response code="200">Communication logs retrieved successfully</response>
    /// <response code="400">Invalid search parameters</response>
    /// <response code="403">Access denied to organization data</response>
    /// <exception cref="UnauthorizedAccessException">Thrown when user lacks access to requested organization</exception>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(CommunicationAuditResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<CommunicationAuditResult>> GetCommunicationLogs(
        [FromQuery] CommunicationAuditSearchRequest request)
    {
        try
        {
            _logger.LogDebug("Searching communication logs for user {UserId}", GetCurrentUserId());

            // Validate access permissions
            var currentUserId = GetCurrentUserId();
            var organizationId = GetCurrentOrganizationId();

            if (!await _auditService.ValidateAuditAccessAsync(currentUserId, organizationId))
            {
                _logger.LogWarning("User {UserId} denied access to audit data for organization {OrganizationId}", 
                    currentUserId, organizationId);
                return Forbid();
            }

            // Apply organization isolation for non-staff users
            if (!IsColorGarbStaff())
            {
                request.OrganizationId = organizationId;
            }

            var result = await _auditService.SearchCommunicationLogsAsync(request);
            
            _logger.LogInformation("Retrieved {Count} communication logs for user {UserId}", 
                result.Logs.Count(), currentUserId);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication logs");
            return BadRequest("Failed to retrieve communication logs");
        }
    }

    /// <summary>
    /// Retrieves complete communication history for a specific order.
    /// Includes all emails, SMS, messages, and system notifications.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <returns>Complete communication timeline for the order</returns>
    /// <response code="200">Order communication history retrieved successfully</response>
    /// <response code="403">Access denied to order data</response>
    /// <response code="404">Order not found</response>
    [HttpGet("orders/{orderId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<CommunicationLog>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<CommunicationLog>>> GetOrderCommunicationHistory(Guid orderId)
    {
        try
        {
            _logger.LogDebug("Retrieving communication history for order {OrderId}", orderId);

            var currentUserId = GetCurrentUserId();
            var organizationId = IsColorGarbStaff() ? null : GetCurrentOrganizationId();

            var history = await _auditService.GetOrderCommunicationHistoryAsync(orderId, organizationId);
            
            _logger.LogInformation("Retrieved {Count} communications for order {OrderId}", 
                history.Count(), orderId);
            
            return Ok(history);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access to order {OrderId} communication history", orderId);
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Order {OrderId} not found", orderId);
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving communication history for order {OrderId}", orderId);
            return BadRequest("Failed to retrieve order communication history");
        }
    }

    /// <summary>
    /// Retrieves delivery status summary for reporting purposes.
    /// Provides aggregated statistics for communication delivery rates.
    /// </summary>
    /// <param name="organizationId">Organization ID for the summary (ColorGarb staff only)</param>
    /// <param name="from">Start date for the report (ISO-8601 format)</param>
    /// <param name="to">End date for the report (ISO-8601 format)</param>
    /// <returns>Delivery status summary with aggregated statistics</returns>
    /// <response code="200">Delivery status summary generated successfully</response>
    /// <response code="400">Invalid date parameters</response>
    /// <response code="403">Access denied to organization data</response>
    [HttpGet("delivery-summary")]
    [ProducesResponseType(typeof(DeliveryStatusSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<DeliveryStatusSummary>> GetDeliveryStatusSummary(
        [FromQuery] Guid? organizationId,
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset to)
    {
        try
        {
            _logger.LogDebug("Generating delivery status summary from {From} to {To}", from, to);

            // Validate date range
            if (from >= to || (to - from).TotalDays > 365)
            {
                return BadRequest("Invalid date range. Maximum range is 365 days.");
            }

            // Determine target organization
            var targetOrgId = IsColorGarbStaff() ? organizationId ?? GetCurrentOrganizationId() : GetCurrentOrganizationId();

            // Validate access
            var currentUserId = GetCurrentUserId();
            if (!await _auditService.ValidateAuditAccessAsync(currentUserId, targetOrgId))
            {
                return Forbid();
            }

            var summary = await _auditService.GetDeliveryStatusSummaryAsync(targetOrgId!.Value, from, to);
            
            _logger.LogInformation("Generated delivery summary for organization {OrganizationId}: {TotalCount} communications", 
                targetOrgId, summary.TotalCommunications);
            
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating delivery status summary");
            return BadRequest("Failed to generate delivery status summary");
        }
    }

    /// <summary>
    /// Retrieves edit history for a specific message with full audit trail.
    /// Shows all changes made to message content with timestamps and user attribution.
    /// </summary>
    /// <param name="messageId">Unique identifier of the message</param>
    /// <returns>Chronological list of message edits</returns>
    /// <response code="200">Message edit history retrieved successfully</response>
    /// <response code="403">Access denied to message data</response>
    /// <response code="404">Message not found</response>
    [HttpGet("messages/{messageId:guid}/edit-history")]
    [ProducesResponseType(typeof(IEnumerable<MessageEdit>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<MessageEdit>>> GetMessageEditHistory(Guid messageId)
    {
        try
        {
            _logger.LogDebug("Retrieving edit history for message {MessageId}", messageId);

            var currentUserId = GetCurrentUserId();
            
            // Note: Additional authorization check could be added here to verify message access
            var editHistory = await _auditService.GetMessageEditHistoryAsync(messageId);
            
            _logger.LogInformation("Retrieved {Count} edits for message {MessageId}", 
                editHistory.Count(), messageId);
            
            return Ok(editHistory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving edit history for message {MessageId}", messageId);
            return BadRequest("Failed to retrieve message edit history");
        }
    }

    /// <summary>
    /// Webhook endpoint for processing SendGrid delivery status updates.
    /// Handles delivery confirmations, bounces, and read receipts.
    /// </summary>
    /// <param name="events">Array of SendGrid webhook events</param>
    /// <returns>No content on successful processing</returns>
    /// <response code="204">Webhook events processed successfully</response>
    /// <response code="400">Invalid webhook payload</response>
    [HttpPost("webhooks/sendgrid")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessSendGridWebhook([FromBody] SendGridEvent[] events)
    {
        try
        {
            _logger.LogDebug("Processing {Count} SendGrid webhook events", events.Length);

            foreach (var webhookEvent in events)
            {
                if (string.IsNullOrEmpty(webhookEvent.SgMessageId))
                {
                    _logger.LogWarning("SendGrid event missing message ID, skipping");
                    continue;
                }

                // Map SendGrid event to our delivery status
                var status = MapSendGridEventToStatus(webhookEvent.Event);
                var statusDetails = $"{webhookEvent.Event}: {webhookEvent.Reason}";
                var webhookData = System.Text.Json.JsonSerializer.Serialize(webhookEvent);

                await _auditService.UpdateDeliveryStatusAsync(
                    webhookEvent.SgMessageId, 
                    status, 
                    statusDetails, 
                    webhookData);
            }

            _logger.LogInformation("Successfully processed {Count} SendGrid webhook events", events.Length);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SendGrid webhook events");
            return BadRequest("Failed to process webhook events");
        }
    }

    /// <summary>
    /// Webhook endpoint for processing Twilio delivery status updates.
    /// Handles SMS delivery confirmations and failure notifications.
    /// </summary>
    /// <param name="request">Twilio webhook payload</param>
    /// <returns>No content on successful processing</returns>
    /// <response code="204">Webhook event processed successfully</response>
    /// <response code="400">Invalid webhook payload</response>
    [HttpPost("webhooks/twilio")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessTwilioWebhook([FromForm] TwilioWebhookRequest request)
    {
        try
        {
            _logger.LogDebug("Processing Twilio webhook event for message {MessageSid}", request.MessageSid);

            if (string.IsNullOrEmpty(request.MessageSid))
            {
                _logger.LogWarning("Twilio webhook missing MessageSid");
                return BadRequest("Missing MessageSid");
            }

            // Map Twilio status to our delivery status
            var status = MapTwilioStatusToDeliveryStatus(request.MessageStatus);
            var statusDetails = $"Twilio: {request.MessageStatus}";
            var webhookData = System.Text.Json.JsonSerializer.Serialize(request);

            await _auditService.UpdateDeliveryStatusAsync(
                request.MessageSid, 
                status, 
                statusDetails, 
                webhookData);

            _logger.LogInformation("Successfully processed Twilio webhook for message {MessageSid}", request.MessageSid);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Twilio webhook for message {MessageSid}", request.MessageSid);
            return BadRequest("Failed to process webhook event");
        }
    }

    #region Helper Methods

    /// <summary>
    /// Gets the current user ID from the JWT claims.
    /// </summary>
    /// <returns>Current user's unique identifier</returns>
    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    /// <summary>
    /// Gets the current user's organization ID from JWT claims.
    /// </summary>
    /// <returns>Current user's organization identifier</returns>
    private Guid? GetCurrentOrganizationId()
    {
        var orgClaim = User.FindFirst("organization_id")?.Value;
        return Guid.TryParse(orgClaim, out var orgId) ? orgId : null;
    }

    /// <summary>
    /// Determines if the current user is ColorGarb staff.
    /// </summary>
    /// <returns>True if user has ColorGarb staff role</returns>
    private bool IsColorGarbStaff()
    {
        return User.IsInRole("ColorGarbStaff");
    }

    /// <summary>
    /// Maps SendGrid event types to our delivery status values.
    /// </summary>
    /// <param name="eventType">SendGrid event type</param>
    /// <returns>Mapped delivery status</returns>
    private static string MapSendGridEventToStatus(string eventType)
    {
        return eventType?.ToLower() switch
        {
            "delivered" => "Delivered",
            "open" => "Read",
            "click" => "Read",
            "bounce" => "Bounced",
            "dropped" => "Failed",
            "deferred" => "Sent",
            "processed" => "Sent",
            _ => "Sent"
        };
    }

    /// <summary>
    /// Maps Twilio message status to our delivery status values.
    /// </summary>
    /// <param name="twilioStatus">Twilio message status</param>
    /// <returns>Mapped delivery status</returns>
    private static string MapTwilioStatusToDeliveryStatus(string twilioStatus)
    {
        return twilioStatus?.ToLower() switch
        {
            "delivered" => "Delivered",
            "sent" => "Sent",
            "failed" => "Failed",
            "undelivered" => "Failed",
            "queued" => "Sent",
            "accepted" => "Sent",
            _ => "Sent"
        };
    }

    #endregion
}

#region Webhook Models

/// <summary>
/// Represents a SendGrid webhook event payload.
/// </summary>
public class SendGridEvent
{
    /// <summary>
    /// SendGrid event type (delivered, bounce, open, etc.)
    /// </summary>
    public string Event { get; set; } = string.Empty;

    /// <summary>
    /// SendGrid message identifier
    /// </summary>
    public string SgMessageId { get; set; } = string.Empty;

    /// <summary>
    /// Recipient email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp of the event
    /// </summary>
    public long Timestamp { get; set; }

    /// <summary>
    /// Additional reason information
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// Event-specific response data
    /// </summary>
    public string? Response { get; set; }
}

/// <summary>
/// Represents a Twilio webhook request payload.
/// </summary>
public class TwilioWebhookRequest
{
    /// <summary>
    /// Twilio message SID identifier
    /// </summary>
    public string MessageSid { get; set; } = string.Empty;

    /// <summary>
    /// Current message status
    /// </summary>
    public string MessageStatus { get; set; } = string.Empty;

    /// <summary>
    /// Recipient phone number
    /// </summary>
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// Sender phone number
    /// </summary>
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// Error code (if applicable)
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Error message (if applicable)
    /// </summary>
    public string? ErrorMessage { get; set; }
}

#endregion