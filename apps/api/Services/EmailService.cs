using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Email service implementation for sending authentication-related emails.
/// In production, this should integrate with a proper email service provider.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;

    public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
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
}