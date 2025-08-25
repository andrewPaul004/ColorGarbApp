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
}