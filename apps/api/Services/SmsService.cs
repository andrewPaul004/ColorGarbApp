using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for sending SMS notifications including critical alerts and delivery tracking.
/// Provides SMS delivery with Twilio integration and rate limiting.
/// </summary>
/// <since>3.2.0</since>
public class SmsService : ISmsService
{
    private readonly ColorGarbDbContext _context;
    private readonly TwilioSmsProvider _smsProvider;
    private readonly INotificationPreferenceService _notificationPreferenceService;
    private readonly IDatabase _redis;
    private readonly ILogger<SmsService> _logger;
    private readonly IConfiguration _configuration;

    private static readonly Dictionary<string, string> SmsTemplates = new()
    {
        {
            "Shipping",
            "Order {orderNumber} has shipped! Track: {portalLink} Reply STOP to opt out"
        },
        {
            "PaymentDue",
            "Payment due for order {orderNumber}. Pay now: {portalLink} Reply STOP to opt out"
        },
        {
            "UrgentIssue",
            "Urgent: Issue with order {orderNumber}. Details: {portalLink} Reply STOP to opt out"
        }
    };

    /// <summary>
    /// Initializes a new instance of the SmsService
    /// </summary>
    /// <param name="context">Database context</param>
    /// <param name="smsProvider">Twilio SMS provider</param>
    /// <param name="notificationPreferenceService">Notification preference service</param>
    /// <param name="redis">Redis database for rate limiting</param>
    /// <param name="logger">Logger for diagnostic information</param>
    /// <param name="configuration">Application configuration for portal URLs</param>
    public SmsService(
        ColorGarbDbContext context,
        TwilioSmsProvider smsProvider,
        INotificationPreferenceService notificationPreferenceService,
        IDatabase redis,
        ILogger<SmsService> logger,
        IConfiguration configuration)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _smsProvider = smsProvider ?? throw new ArgumentNullException(nameof(smsProvider));
        _notificationPreferenceService = notificationPreferenceService ?? throw new ArgumentNullException(nameof(notificationPreferenceService));
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    /// <summary>
    /// Sends a basic SMS message to a phone number.
    /// </summary>
    /// <param name="phoneNumber">Recipient phone number in E.164 format</param>
    /// <param name="message">SMS message content (max 1600 characters)</param>
    /// <param name="orderId">Optional order ID for tracking purposes</param>
    /// <returns>SmsNotification record with delivery tracking information</returns>
    /// <exception cref="ArgumentException">Thrown when phone number is invalid or message is too long</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    public async Task<SmsNotification> SendSmsAsync(string phoneNumber, string message, string? orderId = null)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentNullException(nameof(phoneNumber));

        if (string.IsNullOrWhiteSpace(message))
            throw new ArgumentNullException(nameof(message));

        if (message.Length > 1600)
            throw new ArgumentException("Message cannot exceed 1600 characters", nameof(message));

        if (!TwilioSmsProvider.IsValidPhoneNumber(phoneNumber))
            throw new ArgumentException("Invalid phone number format", nameof(phoneNumber));

        // Create SMS notification record
        var smsNotification = new SmsNotification
        {
            UserId = Guid.Empty, // Will be set by caller if known
            OrderId = string.IsNullOrWhiteSpace(orderId) ? null : Guid.Parse(orderId),
            PhoneNumber = phoneNumber,
            Message = message,
            Status = "Pending"
        };

        _context.SmsNotifications.Add(smsNotification);
        await _context.SaveChangesAsync();

        try
        {
            // Send SMS via Twilio
            var twilioMessage = await _smsProvider.SendSmsAsync(phoneNumber, message);

            // Update notification with Twilio details
            smsNotification.TwilioMessageSid = twilioMessage.Sid;
            smsNotification.Status = twilioMessage.Status.ToString();
            smsNotification.DeliveryAttempts = 1;
            smsNotification.LastAttemptAt = DateTime.UtcNow;

            if (twilioMessage.Price != null && decimal.TryParse(twilioMessage.Price, out var price))
            {
                smsNotification.Cost = Math.Abs(price); // Twilio prices are negative, make positive
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("SMS sent successfully to {PhoneNumber}. MessageSid: {MessageSid}", 
                phoneNumber, twilioMessage.Sid);
        }
        catch (Exception ex)
        {
            smsNotification.Status = "Failed";
            smsNotification.ErrorMessage = ex.Message;
            smsNotification.DeliveryAttempts = 1;
            smsNotification.LastAttemptAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogError(ex, "Failed to send SMS to {PhoneNumber}", phoneNumber);
            throw;
        }

        return smsNotification;
    }

    /// <summary>
    /// Sends a critical notification SMS based on user preferences and notification type.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="orderId">Unique identifier of the order</param>
    /// <param name="notificationType">Type of critical notification (Shipping, PaymentDue, UrgentIssue)</param>
    /// <returns>SmsNotification record if sent, null if user has SMS disabled or phone not verified</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    public async Task<SmsNotification?> SendCriticalNotificationAsync(string userId, string orderId, string notificationType)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

        if (string.IsNullOrWhiteSpace(orderId))
            throw new ArgumentException("Order ID cannot be null or empty", nameof(orderId));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format", nameof(userId));

        if (!Guid.TryParse(orderId, out var orderGuid))
            throw new ArgumentException("Invalid order ID format", nameof(orderId));

        if (!SmsTemplates.ContainsKey(notificationType))
            throw new ArgumentException($"Unsupported notification type: {notificationType}", nameof(notificationType));

        // Check user preferences
        var preferences = await _notificationPreferenceService.GetByUserIdAsync(userGuid);
        if (preferences == null || !preferences.SmsEnabled || !preferences.PhoneVerified || string.IsNullOrWhiteSpace(preferences.PhoneNumber))
        {
            _logger.LogDebug("User {UserId} has SMS disabled or phone not verified", userId);
            return null;
        }

        // Check rate limiting
        if (!await IsWithinRateLimitAsync(userId, preferences.PhoneNumber))
        {
            _logger.LogWarning("Rate limit exceeded for user {UserId}", userId);
            return null;
        }

        // Get order details for template substitution
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderGuid);

        if (order == null)
        {
            throw new ArgumentException($"Order not found: {orderId}", nameof(orderId));
        }

        // Build message from template
        var template = SmsTemplates[notificationType];
        var portalBaseUrl = _configuration["Portal:BaseUrl"] ?? "https://portal.colorgarb.com";
        var portalLink = $"{portalBaseUrl}/orders/{orderId}";
        var message = template
            .Replace("{orderNumber}", order.OrderNumber)
            .Replace("{portalLink}", portalLink);

        // Ensure message is within SMS limits
        if (message.Length > 160)
        {
            // Truncate portal link to fit in single SMS
            var shortBaseUrl = _configuration["Portal:ShortBaseUrl"] ?? "colorgarb.com";
            var shortLink = $"{shortBaseUrl}/o/{orderId[..8]}";
            message = template
                .Replace("{orderNumber}", order.OrderNumber)
                .Replace("{portalLink}", shortLink);
        }

        // Send SMS
        var smsNotification = await SendSmsAsync(preferences.PhoneNumber, message, orderId);
        smsNotification.UserId = userGuid;
        await _context.SaveChangesAsync();

        // Update rate limiting
        await UpdateRateLimitAsync(userId, preferences.PhoneNumber);

        return smsNotification;
    }

    /// <summary>
    /// Updates the delivery status of an SMS notification for tracking purposes.
    /// Called by Twilio webhook to report delivery status.
    /// </summary>
    /// <param name="messageId">Twilio Message SID</param>
    /// <param name="status">Updated delivery status</param>
    /// <param name="errorMessage">Error message for failed deliveries (optional)</param>
    /// <returns>True if status was updated successfully</returns>
    /// <exception cref="ArgumentException">Thrown when messageId is invalid</exception>
    public async Task<bool> UpdateDeliveryStatusAsync(string messageId, string status, string? errorMessage = null)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            throw new ArgumentException("Message ID cannot be null or empty", nameof(messageId));

        if (string.IsNullOrWhiteSpace(status))
            throw new ArgumentException("Status cannot be null or empty", nameof(status));

        var notification = await _context.SmsNotifications
            .FirstOrDefaultAsync(sn => sn.TwilioMessageSid == messageId);

        if (notification == null)
        {
            _logger.LogWarning("SMS notification not found for MessageSid: {MessageSid}", messageId);
            return false;
        }

        notification.Status = status;
        notification.ErrorMessage = errorMessage;

        if (status.Equals("delivered", StringComparison.OrdinalIgnoreCase))
        {
            notification.DeliveredAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogDebug("Updated SMS notification {NotificationId} status to {Status}", 
            notification.Id, status);

        return true;
    }

    /// <summary>
    /// Retrieves SMS notification history for a specific user with pagination support.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="page">Page number for pagination (1-based)</param>
    /// <param name="pageSize">Number of records per page</param>
    /// <returns>List of SmsNotification records for the user</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    public async Task<List<SmsNotification>> GetSmsHistoryAsync(string userId, int page = 1, int pageSize = 50)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format", nameof(userId));

        if (page < 1)
            throw new ArgumentException("Page must be greater than 0", nameof(page));

        if (pageSize < 1 || pageSize > 100)
            throw new ArgumentException("Page size must be between 1 and 100", nameof(pageSize));

        return await _context.SmsNotifications
            .Where(sn => sn.UserId == userGuid)
            .OrderByDescending(sn => sn.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(sn => sn.Order)
            .ToListAsync();
    }

    /// <summary>
    /// Processes inbound SMS messages including opt-out handling.
    /// </summary>
    /// <param name="from">Phone number that sent the SMS</param>
    /// <param name="body">Content of the SMS message</param>
    /// <param name="messageId">Twilio Message SID</param>
    /// <returns>True if message was processed successfully</returns>
    public async Task<bool> ProcessInboundSmsAsync(string from, string body, string messageId)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(body))
            return false;

        var normalizedBody = body.Trim().ToUpper();

        // Handle STOP requests (opt-out)
        if (normalizedBody == "STOP" || normalizedBody == "UNSUBSCRIBE")
        {
            await OptOutPhoneNumberAsync(from);
            _logger.LogInformation("Phone number {PhoneNumber} opted out via SMS", from);
            return true;
        }

        // Handle START requests (opt back in)
        if (normalizedBody == "START" || normalizedBody == "SUBSCRIBE")
        {
            await OptInPhoneNumberAsync(from);
            _logger.LogInformation("Phone number {PhoneNumber} opted back in via SMS", from);
            return true;
        }

        _logger.LogDebug("Received inbound SMS from {PhoneNumber}: {Body}", from, body);
        return true;
    }

    /// <summary>
    /// Checks if a user is within SMS rate limits before sending.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="phoneNumber">Phone number to check rate limits for</param>
    /// <returns>True if within rate limits, false if rate limited</returns>
    public async Task<bool> IsWithinRateLimitAsync(string userId, string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(phoneNumber))
            return false;

        var userKey = $"sms_rate_limit:user:{userId}";
        var phoneKey = $"sms_rate_limit:phone:{phoneNumber}";

        // Check user rate limit: 1 SMS per user per 5 minutes
        var userCount = await _redis.StringGetAsync(userKey);
        if (userCount.HasValue && (int)userCount > 0)
            return false;

        // Check phone rate limit: 3 SMS per phone per hour
        var phoneCount = await _redis.StringGetAsync(phoneKey);
        if (phoneCount.HasValue && (int)phoneCount >= 3)
            return false;

        return true;
    }

    /// <summary>
    /// Updates rate limiting counters after sending SMS.
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="phoneNumber">Phone number</param>
    private async Task UpdateRateLimitAsync(string userId, string phoneNumber)
    {
        var userKey = $"sms_rate_limit:user:{userId}";
        var phoneKey = $"sms_rate_limit:phone:{phoneNumber}";

        // Set user rate limit: 5 minutes
        await _redis.StringSetAsync(userKey, 1, TimeSpan.FromMinutes(5));

        // Increment phone rate limit: 1 hour
        var phoneCount = await _redis.StringIncrementAsync(phoneKey);
        if (phoneCount == 1)
        {
            await _redis.KeyExpireAsync(phoneKey, TimeSpan.FromHours(1));
        }
    }

    /// <summary>
    /// Opts out a phone number from SMS notifications.
    /// </summary>
    /// <param name="phoneNumber">Phone number to opt out</param>
    private async Task OptOutPhoneNumberAsync(string phoneNumber)
    {
        var preferences = await _context.NotificationPreferences
            .Where(np => np.PhoneNumber == phoneNumber)
            .ToListAsync();

        foreach (var preference in preferences)
        {
            preference.SmsEnabled = false;
        }

        if (preferences.Any())
        {
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Opts in a phone number for SMS notifications.
    /// </summary>
    /// <param name="phoneNumber">Phone number to opt in</param>
    private async Task OptInPhoneNumberAsync(string phoneNumber)
    {
        var preferences = await _context.NotificationPreferences
            .Where(np => np.PhoneNumber == phoneNumber && np.PhoneVerified)
            .ToListAsync();

        foreach (var preference in preferences)
        {
            preference.SmsEnabled = true;
        }

        if (preferences.Any())
        {
            await _context.SaveChangesAsync();
        }
    }
}