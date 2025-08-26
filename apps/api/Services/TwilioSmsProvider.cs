using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace ColorGarbApi.Services;

/// <summary>
/// Twilio SMS provider implementation for sending SMS messages.
/// Handles Twilio API integration and message delivery tracking.
/// </summary>
/// <since>3.2.0</since>
public class TwilioSmsProvider
{
    private readonly ILogger<TwilioSmsProvider> _logger;
    private readonly string _accountSid;
    private readonly string _authToken;
    private readonly string _fromNumber;

    /// <summary>
    /// Initializes a new instance of the TwilioSmsProvider
    /// </summary>
    /// <param name="logger">Logger for diagnostic information</param>
    /// <param name="configuration">Application configuration containing Twilio settings</param>
    /// <exception cref="InvalidOperationException">Thrown when Twilio configuration is invalid</exception>
    public TwilioSmsProvider(ILogger<TwilioSmsProvider> logger, IConfiguration configuration)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _accountSid = configuration["Twilio:AccountSid"] ?? throw new InvalidOperationException("Twilio AccountSid not configured");
        _authToken = configuration["Twilio:AuthToken"] ?? throw new InvalidOperationException("Twilio AuthToken not configured");
        _fromNumber = configuration["Twilio:FromNumber"] ?? throw new InvalidOperationException("Twilio FromNumber not configured");

        // Validate configuration values
        ValidateConfiguration();

        TwilioClient.Init(_accountSid, _authToken);
        _logger.LogInformation("Twilio SMS provider initialized successfully with account SID: {AccountSid}", _accountSid[..8] + "...");
    }

    /// <summary>
    /// Validates Twilio configuration parameters for security and correctness.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when configuration is invalid</exception>
    private void ValidateConfiguration()
    {
        // Validate AccountSid format (should start with "AC" and be 34 characters)
        if (!_accountSid.StartsWith("AC") || _accountSid.Length != 34)
        {
            throw new InvalidOperationException("Invalid Twilio AccountSid format. Must start with 'AC' and be 34 characters long.");
        }

        // Validate AuthToken length (should be 32 characters)
        if (_authToken.Length != 32)
        {
            throw new InvalidOperationException("Invalid Twilio AuthToken format. Must be 32 characters long.");
        }

        // Validate FromNumber is in E.164 format
        if (!IsValidPhoneNumber(_fromNumber))
        {
            throw new InvalidOperationException($"Invalid Twilio FromNumber format: {_fromNumber}. Must be in E.164 format (e.g., +15551234567).");
        }

        _logger.LogDebug("Twilio configuration validation passed");
    }

    /// <summary>
    /// Sends an SMS message using Twilio API.
    /// </summary>
    /// <param name="to">Recipient phone number in E.164 format</param>
    /// <param name="message">Message content (max 1600 characters)</param>
    /// <returns>MessageResource with Twilio message details</returns>
    /// <exception cref="ArgumentException">Thrown when parameters are invalid</exception>
    /// <exception cref="InvalidOperationException">Thrown when SMS sending fails</exception>
    public async Task<MessageResource> SendSmsAsync(string to, string message)
    {
        if (string.IsNullOrWhiteSpace(to))
            throw new ArgumentException("Phone number cannot be null or empty", nameof(to));

        if (string.IsNullOrWhiteSpace(message))
            throw new ArgumentException("Message cannot be null or empty", nameof(message));

        if (message.Length > 1600)
            throw new ArgumentException("Message cannot exceed 1600 characters", nameof(message));

        if (!to.StartsWith("+"))
            throw new ArgumentException("Phone number must be in E.164 format (starting with +)", nameof(to));

        try
        {
            _logger.LogDebug("Sending SMS to {PhoneNumber} with message length {MessageLength}", to, message.Length);

            var messageResource = await MessageResource.CreateAsync(
                body: message,
                from: new PhoneNumber(_fromNumber),
                to: new PhoneNumber(to)
            );

            _logger.LogInformation("SMS sent successfully. MessageSid: {MessageSid}, Status: {Status}", 
                messageResource.Sid, messageResource.Status);

            return messageResource;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SMS to {PhoneNumber}", to);
            throw new InvalidOperationException($"Failed to send SMS: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Retrieves message status from Twilio for delivery tracking.
    /// </summary>
    /// <param name="messageSid">Twilio Message SID</param>
    /// <returns>MessageResource with current status</returns>
    /// <exception cref="ArgumentException">Thrown when messageSid is invalid</exception>
    public async Task<MessageResource?> GetMessageStatusAsync(string messageSid)
    {
        if (string.IsNullOrWhiteSpace(messageSid))
            throw new ArgumentException("Message SID cannot be null or empty", nameof(messageSid));

        try
        {
            var message = await MessageResource.FetchAsync(messageSid);
            
            _logger.LogDebug("Retrieved message status for {MessageSid}: {Status}", messageSid, message.Status);
            
            return message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve message status for {MessageSid}", messageSid);
            return null;
        }
    }

    /// <summary>
    /// Validates phone number format for Twilio compatibility.
    /// </summary>
    /// <param name="phoneNumber">Phone number to validate</param>
    /// <returns>True if phone number is valid E.164 format</returns>
    public static bool IsValidPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return false;

        // Basic E.164 validation: starts with +, followed by 1-15 digits
        if (!phoneNumber.StartsWith("+"))
            return false;

        var digits = phoneNumber[1..];
        if (digits.Length < 1 || digits.Length > 15)
            return false;

        return digits.All(char.IsDigit);
    }
}