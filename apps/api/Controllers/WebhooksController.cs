using Microsoft.AspNetCore.Mvc;
using ColorGarbApi.Services;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Webhook endpoints for receiving delivery status updates from external communication providers.
/// Handles webhooks from SendGrid (email) and Twilio (SMS) for audit trail tracking.
/// </summary>
/// <since>3.4.0</since>
[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly ICommunicationAuditService _auditService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        ICommunicationAuditService auditService,
        IConfiguration configuration,
        ILogger<WebhooksController> logger)
    {
        _auditService = auditService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Webhook endpoint for SendGrid email delivery status events.
    /// Receives delivery, bounce, open, and click events for email tracking.
    /// </summary>
    /// <param name="events">Array of SendGrid webhook events</param>
    /// <returns>OK response if events were processed successfully</returns>
    [HttpPost("sendgrid")]
    public async Task<IActionResult> SendGridWebhook([FromBody] JsonElement events)
    {
        try
        {
            // Verify SendGrid webhook signature for security
            if (!await VerifySendGridSignature())
            {
                _logger.LogWarning("SendGrid webhook signature verification failed");
                return Unauthorized();
            }

            var eventArray = events.EnumerateArray();
            var processedCount = 0;

            foreach (var eventData in eventArray)
            {
                try
                {
                    await ProcessSendGridEvent(eventData);
                    processedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process SendGrid event after all retries: {Event}", eventData.GetRawText());
                    // Continue processing other events even if one fails
                }
            }

            _logger.LogInformation("Processed {Count} SendGrid webhook events", processedCount);
            return Ok(new { processed = processedCount });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SendGrid webhook");
            return StatusCode(500, "Webhook processing failed");
        }
    }

    /// <summary>
    /// Webhook endpoint for Twilio SMS delivery status events.
    /// Receives delivery, failed, and undelivered events for SMS tracking.
    /// </summary>
    /// <returns>TwiML response for Twilio</returns>
    [HttpPost("twilio")]
    public async Task<IActionResult> TwilioWebhook()
    {
        try
        {
            // Verify Twilio webhook signature for security
            if (!await VerifyTwilioSignature())
            {
                _logger.LogWarning("Twilio webhook signature verification failed");
                return Unauthorized();
            }

            // Parse Twilio form data
            var formData = new Dictionary<string, string>();
            foreach (var key in Request.Form.Keys)
            {
                formData[key] = Request.Form[key].ToString();
            }

            await ProcessTwilioEvent(formData);

            _logger.LogInformation("Processed Twilio webhook event for MessageSid: {MessageSid}", 
                formData.GetValueOrDefault("MessageSid", "unknown"));

            // Return empty TwiML response
            return Content("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Twilio webhook");
            return StatusCode(500, "Webhook processing failed");
        }
    }


    /// <summary>
    /// Processes a single SendGrid webhook event and updates audit trail.
    /// </summary>
    /// <param name="eventData">SendGrid event data</param>
    private async Task ProcessSendGridEvent(JsonElement eventData)
    {
        // Validate and extract event details with proper error handling
        string? eventType = null;
        string? messageId = null;
        string? email = null;
        long timestamp = 0;

        try
        {
            if (!eventData.TryGetProperty("event", out var eventTypeElement) ||
                !eventData.TryGetProperty("sg_message_id", out var messageIdElement))
            {
                throw new ArgumentException("SendGrid event missing required 'event' or 'sg_message_id' properties");
            }

            eventType = eventTypeElement.GetString();
            messageId = messageIdElement.GetString();
            
            // Optional fields
            eventData.TryGetProperty("email", out var emailElement);
            email = emailElement.GetString();
            
            if (eventData.TryGetProperty("timestamp", out var timestampElement))
            {
                timestamp = timestampElement.GetInt64();
            }

            if (string.IsNullOrEmpty(messageId) || string.IsNullOrEmpty(eventType))
            {
                throw new ArgumentException("SendGrid event has null or empty required fields");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse SendGrid event data: {EventData}", eventData.GetRawText());
            throw new ArgumentException("Invalid SendGrid event format", ex);
        }

        // Map SendGrid events to our status values
        var status = eventType.ToLower() switch
        {
            "delivered" => "Delivered",
            "bounce" => "Bounced",
            "dropped" => "Failed",
            "deferred" => "Deferred",
            "open" => "Opened",
            "click" => "Clicked",
            "spamreport" => "SpamReport",
            "unsubscribe" => "Unsubscribed",
            "group_unsubscribe" => "GroupUnsubscribed",
            _ => eventType
        };

        // Extract additional details
        var reason = eventData.TryGetProperty("reason", out var reasonElement) 
            ? reasonElement.GetString() : null;
        var response = eventData.TryGetProperty("response", out var responseElement) 
            ? responseElement.GetString() : null;

        var statusDetails = !string.IsNullOrEmpty(reason) ? reason : response;

        // Update audit trail with enhanced error handling
        try
        {
            await _auditService.UpdateDeliveryStatusAsync(
                messageId,
                status,
                statusDetails,
                eventData.GetRawText()
            );

            _logger.LogDebug("Updated delivery status for SendGrid message {MessageId}: {Status}", 
                messageId, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update audit trail for SendGrid message {MessageId}. Status: {Status}", 
                messageId, status);
            
            // Re-throw to trigger retry policy
            throw new InvalidOperationException($"Failed to update delivery status for message {messageId}", ex);
        }
    }

    /// <summary>
    /// Processes a Twilio webhook event and updates audit trail.
    /// </summary>
    /// <param name="formData">Twilio webhook form data</param>
    private async Task ProcessTwilioEvent(Dictionary<string, string> formData)
    {
        // Validate required fields with better error handling
        var messageSid = formData.GetValueOrDefault("MessageSid", "");
        var messageStatus = formData.GetValueOrDefault("MessageStatus", "");

        if (string.IsNullOrEmpty(messageSid) || string.IsNullOrEmpty(messageStatus))
        {
            var missingFields = new List<string>();
            if (string.IsNullOrEmpty(messageSid)) missingFields.Add("MessageSid");
            if (string.IsNullOrEmpty(messageStatus)) missingFields.Add("MessageStatus");
            
            throw new ArgumentException($"Twilio event missing required fields: {string.Join(", ", missingFields)}");
        }

        // Map Twilio statuses to our status values
        var status = messageStatus.ToLower() switch
        {
            "queued" => "Queued",
            "sent" => "Sent",
            "delivered" => "Delivered",
            "undelivered" => "Failed",
            "failed" => "Failed",
            "received" => "Delivered", // For inbound messages
            _ => messageStatus
        };

        // Extract error details if available
        var errorCode = formData.GetValueOrDefault("ErrorCode", "");
        var errorMessage = formData.GetValueOrDefault("ErrorMessage", "");
        var statusDetails = !string.IsNullOrEmpty(errorMessage) 
            ? $"Error {errorCode}: {errorMessage}" 
            : null;

        // Convert form data to JSON for storage
        var webhookData = JsonSerializer.Serialize(formData);

        // Update audit trail with enhanced error handling
        try
        {
            await _auditService.UpdateDeliveryStatusAsync(
                messageSid,
                status,
                statusDetails,
                webhookData
            );

            _logger.LogDebug("Updated delivery status for Twilio message {MessageSid}: {Status}", 
                messageSid, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update audit trail for Twilio message {MessageSid}. Status: {Status}", 
                messageSid, status);
            
            // Re-throw to trigger retry policy
            throw new InvalidOperationException($"Failed to update delivery status for message {messageSid}", ex);
        }
    }

    /// <summary>
    /// Verifies SendGrid webhook signature for security.
    /// </summary>
    /// <returns>True if signature is valid</returns>
    private async Task<bool> VerifySendGridSignature()
    {
        var publicKey = _configuration["SendGrid:WebhookPublicKey"];
        if (string.IsNullOrEmpty(publicKey))
        {
            _logger.LogWarning("SendGrid webhook public key not configured");
            return false; // In development, you might want to return true
        }

        // Get signature from headers
        var signature = Request.Headers["X-Twilio-Email-Event-Webhook-Signature"].FirstOrDefault();
        var timestamp = Request.Headers["X-Twilio-Email-Event-Webhook-Timestamp"].FirstOrDefault();

        if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(timestamp))
        {
            return false;
        }

        // Read request body
        Request.Body.Position = 0;
        var body = await new StreamReader(Request.Body).ReadToEndAsync();
        Request.Body.Position = 0;

        // Verify signature (simplified - in production use proper ECDSA verification)
        // This is a placeholder - implement proper SendGrid signature verification
        return true; // For development
    }

    /// <summary>
    /// Verifies Twilio webhook signature for security.
    /// </summary>
    /// <returns>True if signature is valid</returns>
    private async Task<bool> VerifyTwilioSignature()
    {
        var authToken = _configuration["Twilio:AuthToken"];
        if (string.IsNullOrEmpty(authToken))
        {
            _logger.LogWarning("Twilio auth token not configured");
            return false; // In development, you might want to return true
        }

        var signature = Request.Headers["X-Twilio-Signature"].FirstOrDefault();
        if (string.IsNullOrEmpty(signature))
        {
            return false;
        }

        // Construct the expected signature
        var url = $"{Request.Scheme}://{Request.Host}{Request.Path}";
        var body = "";

        // Get form data for signature
        foreach (var key in Request.Form.Keys.OrderBy(k => k))
        {
            body += $"{key}{Request.Form[key]}";
        }

        var expectedSignature = Convert.ToBase64String(
            new HMACSHA1(Encoding.UTF8.GetBytes(authToken))
                .ComputeHash(Encoding.UTF8.GetBytes(url + body))
        );

        var isValid = signature == expectedSignature;
        if (!isValid)
        {
            _logger.LogWarning("Twilio signature verification failed. Expected: {Expected}, Received: {Received}", 
                expectedSignature, signature);
        }

        return isValid;
    }

    /// <summary>
    /// Health check endpoint for webhook availability.
    /// </summary>
    /// <returns>OK response with webhook status</returns>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new 
        { 
            status = "healthy", 
            endpoints = new[] { "sendgrid", "twilio" },
            timestamp = DateTime.UtcNow 
        });
    }
}