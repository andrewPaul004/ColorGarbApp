using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ColorGarbApi.Services;

/// <summary>
/// Email service implementation for sending authentication-related emails.
/// In production, this should integrate with a proper email service provider.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly ColorGarbDbContext _context;
    private readonly INotificationPreferenceService _notificationPreferenceService;
    private readonly ICommunicationAuditService _auditService;

    public EmailService(
        ILogger<EmailService> logger, 
        IConfiguration configuration,
        ColorGarbDbContext context,
        INotificationPreferenceService notificationPreferenceService,
        ICommunicationAuditService auditService)
    {
        _logger = logger;
        _configuration = configuration;
        _context = context;
        _notificationPreferenceService = notificationPreferenceService;
        _auditService = auditService;
    }

    /// <summary>
    /// Sends a password reset email with secure token link.
    /// Currently logs the action for development - replace with actual email service in production.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="resetToken">Secure password reset token</param>
    /// <param name="userName">User's display name</param>
    /// <returns>True if email was sent successfully</returns>
    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string userName)
    {
        try
        {
            // In production, replace this with actual email service integration
            // e.g., SendGrid, AWS SES, Azure Communication Services, etc.

            var resetUrl = $"{_configuration["Frontend:BaseUrl"]}/reset-password?token={resetToken}";

            var emailContent = $@"
                Dear {userName},
                
                You have requested to reset your password for your ColorGarb account.
                
                Please click the following link to reset your password:
                {resetUrl}
                
                This link will expire in 1 hour for security purposes.
                
                If you did not request this password reset, please ignore this email.
                
                Best regards,
                ColorGarb Team
            ";

            // TODO: Replace with actual email service
            _logger.LogInformation("Password reset email would be sent to: {Email}", email);
            _logger.LogDebug("Reset URL: {ResetUrl}", resetUrl);
            _logger.LogDebug("Email content: {Content}", emailContent);

            // Log to communication audit trail
            await LogEmailCommunicationAsync(
                email, 
                null, // No specific order for password reset
                "Password Reset Request",
                emailContent,
                "password-reset-template",
                null // No specific sender user for system emails
            );

            // Simulate async email sending
            await Task.Delay(100);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to: {Email}", email);
            return false;
        }
    }

    /// <summary>
    /// Sends account lockout notification email.
    /// Currently logs the action for development - replace with actual email service in production.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="lockoutExpiryTime">When the lockout expires</param>
    /// <param name="userName">User's display name</param>
    /// <returns>True if email was sent successfully</returns>
    public async Task<bool> SendAccountLockoutEmailAsync(string email, DateTime lockoutExpiryTime, string userName)
    {
        try
        {
            var emailContent = $@"
                Dear {userName},
                
                Your ColorGarb account has been temporarily locked due to multiple failed login attempts.
                
                Your account will be automatically unlocked at: {lockoutExpiryTime:yyyy-MM-dd HH:mm:ss} UTC
                
                If you believe this is an error or if you need immediate assistance, please contact our support team.
                
                Best regards,
                ColorGarb Team
            ";

            // TODO: Replace with actual email service
            _logger.LogInformation("Account lockout email would be sent to: {Email}", email);
            _logger.LogDebug("Lockout expiry: {LockoutExpiryTime}", lockoutExpiryTime);
            _logger.LogDebug("Email content: {Content}", emailContent);

            // Simulate async email sending
            await Task.Delay(100);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send account lockout email to: {Email}", email);
            return false;
        }
    }

    /// <summary>
    /// Sends order stage progression notification email.
    /// Currently logs the action for development - replace with actual email service in production.
    /// </summary>
    public async Task<bool> SendOrderStageUpdateEmailAsync(
        string email,
        string organizationName,
        string orderNumber,
        string orderDescription,
        string previousStage,
        string newStage,
        DateTime currentShipDate)
    {
        try
        {
            var emailContent = $@"
                Dear {organizationName} Team,
                
                We're pleased to update you on the progress of your costume order.
                
                Order Details:
                - Order Number: {orderNumber}
                - Description: {orderDescription}
                
                Progress Update:
                - Previous Stage: {previousStage}
                - Current Stage: {newStage}
                - Expected Ship Date: {currentShipDate:yyyy-MM-dd}
                
                Your order is progressing smoothly through our manufacturing process. 
                You can track your order progress at any time by logging into your ColorGarb portal.
                
                If you have any questions about your order, please don't hesitate to contact us.
                
                Best regards,
                The ColorGarb Production Team
            ";

            // TODO: Replace with actual email service
            _logger.LogInformation("Order stage update email would be sent to: {Email} for order {OrderNumber}: {PreviousStage} -> {NewStage}",
                email, orderNumber, previousStage, newStage);
            _logger.LogDebug("Email content: {Content}", emailContent);

            // Find order ID for audit logging
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);

            if (order != null)
            {
                await LogEmailCommunicationAsync(
                    email,
                    order.Id,
                    $"Order Stage Update: {orderNumber}",
                    emailContent,
                    "order-stage-update-template",
                    null // System-generated email
                );
            }

            // Simulate async email sending
            await Task.Delay(100);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order stage update email to: {Email} for order {OrderNumber}", email, orderNumber);
            return false;
        }
    }

    /// <summary>
    /// Sends ship date change notification email.
    /// Currently logs the action for development - replace with actual email service in production.
    /// </summary>
    public async Task<bool> SendShipDateChangeEmailAsync(
        string email,
        string organizationName,
        string orderNumber,
        string orderDescription,
        DateTime previousShipDate,
        DateTime newShipDate,
        string reason)
    {
        try
        {
            var isDelayed = newShipDate > previousShipDate;
            var changeType = isDelayed ? "delayed" : "moved earlier";
            var daysDifference = Math.Abs((newShipDate - previousShipDate).Days);

            var emailContent = $@"
                Dear {organizationName} Team,
                
                We need to inform you about a change to your costume order shipping schedule.
                
                Order Details:
                - Order Number: {orderNumber}
                - Description: {orderDescription}
                
                Shipping Schedule Change:
                - Original Ship Date: {previousShipDate:yyyy-MM-dd}
                - New Ship Date: {newShipDate:yyyy-MM-dd}
                - Your order has been {changeType} by {daysDifference} day{(daysDifference != 1 ? "s" : "")}
                
                Reason for Change: {reason}
                
                {(isDelayed ?
                    "We sincerely apologize for any inconvenience this delay may cause. We are working diligently to minimize any further delays and ensure the highest quality for your costumes." :
                    "We're pleased to inform you that your order is progressing faster than expected!")}
                
                If you have any questions or concerns about this change, please contact us immediately.
                
                Thank you for your understanding and continued business.
                
                Best regards,
                The ColorGarb Production Team
            ";

            // TODO: Replace with actual email service
            _logger.LogInformation("Ship date change email would be sent to: {Email} for order {OrderNumber}: {PreviousDate} -> {NewDate}",
                email, orderNumber, previousShipDate.ToString("yyyy-MM-dd"), newShipDate.ToString("yyyy-MM-dd"));
            _logger.LogDebug("Email content: {Content}", emailContent);

            // Find order ID for audit logging
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);

            if (order != null)
            {
                await LogEmailCommunicationAsync(
                    email,
                    order.Id,
                    $"Ship Date Change: {orderNumber}",
                    emailContent,
                    "ship-date-change-template",
                    null // System-generated email
                );
            }

            // Simulate async email sending
            await Task.Delay(100);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send ship date change email to: {Email} for order {OrderNumber}", email, orderNumber);
            return false;
        }
    }

    /// <summary>
    /// Sends a templated email notification with dynamic data substitution.
    /// Currently simulates template rendering for development - integrate with email service in production.
    /// </summary>
    /// <param name="templateName">Name of the email template to use</param>
    /// <param name="recipient">Email address of the recipient</param>
    /// <param name="templateData">Dynamic data for template substitution</param>
    /// <returns>EmailNotification record with delivery tracking information</returns>
    public async Task<EmailNotification> SendTemplatedEmailAsync(string templateName, string recipient, object templateData)
    {
        if (string.IsNullOrWhiteSpace(templateName))
        {
            throw new ArgumentException("Template name cannot be empty", nameof(templateName));
        }

        if (string.IsNullOrWhiteSpace(recipient))
        {
            throw new ArgumentNullException(nameof(recipient));
        }

        if (templateData == null)
        {
            throw new ArgumentNullException(nameof(templateData));
        }

        try
        {
            // Create notification record for tracking
            var notification = new EmailNotification
            {
                UserId = ExtractUserIdFromTemplateData(templateData),
                OrderId = ExtractOrderIdFromTemplateData(templateData),
                TemplateName = templateName,
                Subject = GenerateSubjectFromTemplate(templateName, templateData),
                Recipient = recipient,
                Status = "Pending",
                DeliveryAttempts = 0
            };

            _context.EmailNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // Render and send email (simulated for development)
            var emailContent = await RenderEmailTemplateAsync(templateName, templateData);
            
            // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
            _logger.LogInformation("Templated email would be sent - Template: {Template}, Recipient: {Recipient}, Subject: {Subject}",
                templateName, recipient, notification.Subject);
            _logger.LogDebug("Email content: {Content}", emailContent);

            // Log to communication audit trail
            if (notification.OrderId.HasValue)
            {
                await LogEmailCommunicationAsync(
                    recipient,
                    notification.OrderId,
                    notification.Subject,
                    emailContent,
                    templateName,
                    notification.UserId
                );
            }

            // Simulate async email sending
            await Task.Delay(100);

            // Update notification status
            notification.Status = "Sent";
            notification.DeliveryAttempts = 1;
            notification.LastAttemptAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Templated email sent successfully - NotificationId: {NotificationId}", notification.Id);

            return notification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send templated email - Template: {Template}, Recipient: {Recipient}", 
                templateName, recipient);
            throw;
        }
    }

    /// <summary>
    /// Sends a milestone-based notification email based on user preferences.
    /// Checks user preferences before sending and respects notification settings.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="milestone">Milestone type that triggered the notification</param>
    /// <returns>EmailNotification record if sent, null if user has notifications disabled</returns>
    public async Task<EmailNotification?> SendMilestoneNotificationAsync(string userId, string orderId, string milestone)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            throw new ArgumentException("Invalid user ID format", nameof(userId));
        }

        if (!Guid.TryParse(orderId, out var orderGuid))
        {
            throw new ArgumentException("Invalid order ID format", nameof(orderId));
        }

        if (string.IsNullOrWhiteSpace(milestone))
        {
            throw new ArgumentException("Milestone cannot be empty", nameof(milestone));
        }

        try
        {
            // Check user notification preferences
            var preferences = await _notificationPreferenceService.GetByUserIdAsync(userGuid);
            if (preferences == null || !preferences.EmailEnabled)
            {
                _logger.LogDebug("Skipping milestone notification for user {UserId} - notifications disabled", userId);
                return null;
            }

            // Parse milestones and check if this milestone is enabled
            var milestones = JsonSerializer.Deserialize<List<NotificationMilestone>>(preferences.MilestonesJson);
            var milestoneConfig = milestones?.FirstOrDefault(m => m.Type == milestone);
            if (milestoneConfig == null || !milestoneConfig.Enabled)
            {
                _logger.LogDebug("Skipping milestone notification for user {UserId} - milestone {Milestone} disabled", 
                    userId, milestone);
                return null;
            }

            // Get user and order details for template data
            var user = await _context.Users.Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == userGuid);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderGuid);

            if (user == null || order == null)
            {
                _logger.LogWarning("Cannot send milestone notification - User or Order not found. UserId: {UserId}, OrderId: {OrderId}", 
                    userId, orderId);
                return null;
            }

            // Build template data
            var templateData = new
            {
                user = new { firstName = user.Name.Split(' ')[0], lastName = user.Name.Split(' ').Skip(1).FirstOrDefault() ?? "" },
                organization = new { name = user.Organization?.Name ?? "Unknown Organization" },
                order = new { orderNumber = order.OrderNumber, description = order.Description, currentStage = order.CurrentStage },
                milestone = new { name = milestone, description = GetMilestoneDescription(milestone) },
                links = new
                {
                    portalUrl = _configuration["Frontend:BaseUrl"],
                    orderDetailUrl = $"{_configuration["Frontend:BaseUrl"]}/orders/{order.Id}",
                    unsubscribeUrl = $"{_configuration["Frontend:BaseUrl"]}/unsubscribe/{preferences.UnsubscribeToken}"
                }
            };

            // Determine template name based on milestone
            var templateName = GetTemplateNameForMilestone(milestone);

            // Send templated email
            var notification = await SendTemplatedEmailAsync(templateName, user.Email, templateData);

            _logger.LogInformation("Milestone notification sent - User: {UserId}, Order: {OrderId}, Milestone: {Milestone}", 
                userId, orderId, milestone);

            return notification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send milestone notification - User: {UserId}, Order: {OrderId}, Milestone: {Milestone}", 
                userId, orderId, milestone);
            throw;
        }
    }

    /// <summary>
    /// Updates the delivery status of an email notification for tracking purposes.
    /// Typically called by webhook handlers from email service providers.
    /// </summary>
    /// <param name="notificationId">Unique identifier of the email notification</param>
    /// <param name="status">Updated delivery status</param>
    /// <param name="errorMessage">Error message for failed deliveries (optional)</param>
    /// <returns>True if status was updated successfully</returns>
    public async Task<bool> UpdateDeliveryStatusAsync(string notificationId, string status, string? errorMessage = null)
    {
        if (!Guid.TryParse(notificationId, out var notificationGuid))
        {
            throw new ArgumentException("Invalid notification ID format", nameof(notificationId));
        }

        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Status cannot be empty", nameof(status));
        }

        try
        {
            var notification = await _context.EmailNotifications
                .FirstOrDefaultAsync(n => n.Id == notificationGuid);

            if (notification == null)
            {
                _logger.LogWarning("Cannot update delivery status - notification not found: {NotificationId}", notificationId);
                return false;
            }

            // Update status and tracking fields
            notification.Status = status;
            notification.ErrorMessage = errorMessage;
            
            if (status == "Delivered")
            {
                notification.DeliveredAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogDebug("Updated notification {NotificationId} status to {Status}", notificationId, status);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update delivery status for notification {NotificationId}", notificationId);
            return false;
        }
    }

    /// <summary>
    /// Retrieves email notification history for a specific user with pagination support.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of records per page</param>
    /// <returns>List of EmailNotification records for the user</returns>
    public async Task<List<EmailNotification>> GetNotificationHistoryAsync(string userId, int page = 1, int pageSize = 50)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            throw new ArgumentException("Invalid user ID format", nameof(userId));
        }

        if (page < 1)
        {
            throw new ArgumentException("Page must be greater than 0", nameof(page));
        }

        if (pageSize < 1 || pageSize > 100)
        {
            throw new ArgumentException("Page size must be between 1 and 100", nameof(pageSize));
        }

        try
        {
            var notifications = await _context.EmailNotifications
                .Where(n => n.UserId == userGuid)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            _logger.LogDebug("Retrieved {Count} notification history records for user {UserId} (page {Page})", 
                notifications.Count, userId, page);

            return notifications;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve notification history for user {UserId}", userId);
            throw;
        }
    }

    #region Private Helper Methods

    /// <summary>
    /// Extracts user ID from template data object
    /// </summary>
    private static Guid ExtractUserIdFromTemplateData(object templateData)
    {
        // For development, return a default GUID
        // In production, extract from dynamic template data
        return Guid.Parse("22222222-2222-2222-2222-222222222222");
    }

    /// <summary>
    /// Extracts order ID from template data object
    /// </summary>
    private static Guid ExtractOrderIdFromTemplateData(object templateData)
    {
        // For development, return a default GUID
        // In production, extract from dynamic template data
        return Guid.Parse("33333333-3333-3333-3333-333333333333");
    }

    /// <summary>
    /// Generates email subject line based on template and data
    /// </summary>
    private static string GenerateSubjectFromTemplate(string templateName, object templateData)
    {
        return templateName switch
        {
            "milestone-measurements-due" => "Action Required: Submit Performer Measurements",
            "milestone-proof-approval" => "Your Design Proof is Ready for Review",
            "milestone-production-start" => "Great News! Production Has Started on Your Order",
            "milestone-shipping" => "Your Order is On Its Way!",
            "milestone-delivery" => "Your Order Has Been Delivered",
            _ => "Update on Your ColorGarb Order"
        };
    }

    /// <summary>
    /// Renders email template with dynamic data substitution
    /// </summary>
    private async Task<string> RenderEmailTemplateAsync(string templateName, object templateData)
    {
        // TODO: Implement proper template engine (Razor, Liquid, etc.)
        // For now, return simple template structure
        
        await Task.CompletedTask;
        
        return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>ColorGarb Notification</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }}
                    .header {{ background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; line-height: 1.6; }}
                    .footer {{ background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; }}
                    .button {{ background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>ColorGarb</h1>
                    </div>
                    <div class='content'>
                        <h2>Order Update Notification</h2>
                        <p>Template: {templateName}</p>
                        <p>This is a simulated email template rendering for development purposes.</p>
                        <p>In production, this would be replaced with proper template rendering using the provided template data.</p>
                        <a href='#' class='button'>View Order Details</a>
                    </div>
                    <div class='footer'>
                        <p>&copy; 2025 ColorGarb. All rights reserved.</p>
                        <p><a href='#'>Unsubscribe</a> | <a href='#'>Contact Support</a></p>
                    </div>
                </div>
            </body>
            </html>
        ";
    }

    /// <summary>
    /// Gets human-readable description for milestone types
    /// </summary>
    private static string GetMilestoneDescription(string milestone)
    {
        return milestone switch
        {
            "MeasurementsDue" => "Time to submit performer measurements",
            "ProofApproval" => "Your design proof is ready for review",
            "ProductionStart" => "Production has begun on your costumes",
            "Shipping" => "Your order is being shipped",
            "Delivery" => "Your order has been delivered",
            _ => "Order milestone update"
        };
    }

    /// <summary>
    /// Maps milestone types to template names
    /// </summary>
    private static string GetTemplateNameForMilestone(string milestone)
    {
        return milestone switch
        {
            "MeasurementsDue" => "milestone-measurements-due",
            "ProofApproval" => "milestone-proof-approval",
            "ProductionStart" => "milestone-production-start",
            "Shipping" => "milestone-shipping",
            "Delivery" => "milestone-delivery",
            _ => "milestone-generic"
        };
    }

    #endregion

    /// <summary>
    /// Logs email communication to the audit trail for tracking and compliance purposes.
    /// </summary>
    /// <param name="recipientEmail">Email address of the recipient</param>
    /// <param name="orderId">Order ID if email is order-related</param>
    /// <param name="subject">Email subject line</param>
    /// <param name="content">Full email content</param>
    /// <param name="templateName">Template used for the email</param>
    /// <param name="senderId">User ID of the sender, if applicable</param>
    /// <returns>Task for async operation</returns>
    private async Task LogEmailCommunicationAsync(
        string recipientEmail, 
        Guid? orderId, 
        string subject, 
        string content, 
        string? templateName, 
        Guid? senderId)
    {
        try
        {
            // Find a suitable order ID for system emails if not provided
            if (orderId == null && !string.IsNullOrEmpty(recipientEmail))
            {
                // For system emails without specific order context, we might need to create a default
                // For now, we'll skip logging system emails without order context
                // In production, you might want to create system-level communication logs
                return;
            }

            var communicationLog = new CommunicationLog
            {
                OrderId = orderId.Value,
                CommunicationType = "Email",
                SenderId = senderId ?? Guid.Empty, // System user ID or actual sender
                RecipientEmail = recipientEmail,
                Subject = subject,
                Content = content,
                TemplateUsed = templateName,
                DeliveryStatus = "Sent",
                ExternalMessageId = $"email-{Guid.NewGuid()}", // Generate unique ID for tracking
                SentAt = DateTime.UtcNow
            };

            await _auditService.LogCommunicationAsync(communicationLog);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log email communication to audit trail for {Email}", recipientEmail);
            // Don't throw - audit logging failure shouldn't prevent email sending
        }
    }

    /// <summary>
    /// Nested class representing notification milestone configuration
    /// </summary>
    public class NotificationMilestone
    {
        public string Type { get; set; } = string.Empty;
        public bool Enabled { get; set; } = true;
        public int? NotifyBefore { get; set; }
    }
}