using ColorGarbApi.Models;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for sending emails including authentication-related messages.
/// Provides abstraction for email delivery with support for templates and tracking.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Sends a password reset email with secure token link.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="resetToken">Secure password reset token</param>
    /// <param name="userName">User's display name</param>
    /// <returns>True if email was sent successfully</returns>
    Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string userName);

    /// <summary>
    /// Sends account lockout notification email.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="lockoutExpiryTime">When the lockout expires</param>
    /// <param name="userName">User's display name</param>
    /// <returns>True if email was sent successfully</returns>
    Task<bool> SendAccountLockoutEmailAsync(string email, DateTime lockoutExpiryTime, string userName);

    /// <summary>
    /// Sends order stage progression notification email.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="organizationName">Name of the organization</param>
    /// <param name="orderNumber">Human-readable order number</param>
    /// <param name="orderDescription">Description of the order</param>
    /// <param name="previousStage">Previous manufacturing stage</param>
    /// <param name="newStage">New manufacturing stage</param>
    /// <param name="currentShipDate">Current expected ship date</param>
    /// <returns>True if email was sent successfully</returns>
    Task<bool> SendOrderStageUpdateEmailAsync(
        string email,
        string organizationName,
        string orderNumber,
        string orderDescription,
        string previousStage,
        string newStage,
        DateTime currentShipDate);

    /// <summary>
    /// Sends ship date change notification email.
    /// </summary>
    /// <param name="email">Recipient email address</param>
    /// <param name="organizationName">Name of the organization</param>
    /// <param name="orderNumber">Human-readable order number</param>
    /// <param name="orderDescription">Description of the order</param>
    /// <param name="previousShipDate">Previous ship date</param>
    /// <param name="newShipDate">New ship date</param>
    /// <param name="reason">Reason for the ship date change</param>
    /// <returns>True if email was sent successfully</returns>
    Task<bool> SendShipDateChangeEmailAsync(
        string email,
        string organizationName,
        string orderNumber,
        string orderDescription,
        DateTime previousShipDate,
        DateTime newShipDate,
        string reason);

    /// <summary>
    /// Sends a templated email notification with dynamic data substitution.
    /// </summary>
    /// <param name="templateName">Name of the email template to use</param>
    /// <param name="recipient">Email address of the recipient</param>
    /// <param name="templateData">Dynamic data for template substitution</param>
    /// <returns>EmailNotification record with delivery tracking information</returns>
    /// <exception cref="ArgumentException">Thrown when template name is invalid</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    Task<Models.Entities.EmailNotification> SendTemplatedEmailAsync(string templateName, string recipient, object templateData);

    /// <summary>
    /// Sends a milestone-based notification email based on user preferences.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="milestone">Milestone type that triggered the notification</param>
    /// <returns>EmailNotification record if sent, null if user has notifications disabled</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    Task<Models.Entities.EmailNotification?> SendMilestoneNotificationAsync(string userId, string orderId, string milestone);

    /// <summary>
    /// Updates the delivery status of an email notification for tracking purposes.
    /// </summary>
    /// <param name="notificationId">Unique identifier of the email notification</param>
    /// <param name="status">Updated delivery status</param>
    /// <param name="errorMessage">Error message for failed deliveries (optional)</param>
    /// <returns>True if status was updated successfully</returns>
    /// <exception cref="ArgumentException">Thrown when notificationId is invalid</exception>
    Task<bool> UpdateDeliveryStatusAsync(string notificationId, string status, string? errorMessage = null);

    /// <summary>
    /// Retrieves email notification history for a specific user.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of records per page</param>
    /// <returns>List of EmailNotification records for the user</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    Task<List<Models.Entities.EmailNotification>> GetNotificationHistoryAsync(string userId, int page = 1, int pageSize = 50);
}