using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for sending SMS notifications including critical alerts and delivery tracking.
/// Provides abstraction for SMS delivery with Twilio integration and rate limiting.
/// </summary>
/// <since>3.2.0</since>
public interface ISmsService
{
    /// <summary>
    /// Sends a basic SMS message to a phone number.
    /// </summary>
    /// <param name="phoneNumber">Recipient phone number in E.164 format</param>
    /// <param name="message">SMS message content (max 1600 characters)</param>
    /// <param name="orderId">Optional order ID for tracking purposes</param>
    /// <returns>SmsNotification record with delivery tracking information</returns>
    /// <exception cref="ArgumentException">Thrown when phone number is invalid or message is too long</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    Task<SmsNotification> SendSmsAsync(string phoneNumber, string message, string? orderId = null);

    /// <summary>
    /// Sends a critical notification SMS based on user preferences and notification type.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="notificationType">Type of critical notification (Shipping, PaymentDue, UrgentIssue)</param>
    /// <returns>SmsNotification record if sent, null if user has SMS disabled or phone not verified</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    Task<SmsNotification?> SendCriticalNotificationAsync(string userId, string orderId, string notificationType);

    /// <summary>
    /// Updates the delivery status of an SMS notification for tracking purposes.
    /// Called by Twilio webhook to report delivery status.
    /// </summary>
    /// <param name="messageId">Twilio Message SID</param>
    /// <param name="status">Updated delivery status</param>
    /// <param name="errorMessage">Error message for failed deliveries (optional)</param>
    /// <returns>True if status was updated successfully</returns>
    /// <exception cref="ArgumentException">Thrown when messageId is invalid</exception>
    Task<bool> UpdateDeliveryStatusAsync(string messageId, string status, string? errorMessage = null);

    /// <summary>
    /// Retrieves SMS notification history for a specific user with pagination support.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of records per page</param>
    /// <returns>List of SmsNotification records for the user</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    Task<List<SmsNotification>> GetSmsHistoryAsync(string userId, int page = 1, int pageSize = 50);

    /// <summary>
    /// Processes inbound SMS messages including opt-out handling.
    /// </summary>
    /// <param name="from">Phone number that sent the SMS</param>
    /// <param name="body">Content of the SMS message</param>
    /// <param name="messageId">Twilio Message SID</param>
    /// <returns>True if message was processed successfully</returns>
    Task<bool> ProcessInboundSmsAsync(string from, string body, string messageId);

    /// <summary>
    /// Checks if a user is within SMS rate limits before sending.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="phoneNumber">Phone number to check rate limits for</param>
    /// <returns>True if within rate limits, false if rate limited</returns>
    Task<bool> IsWithinRateLimitAsync(string userId, string phoneNumber);
}