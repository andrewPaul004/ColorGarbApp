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
}