using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace ColorGarbApi.Services;

/// <summary>
/// Service implementation for phone number verification and validation.
/// Handles secure verification codes and phone number format validation.
/// </summary>
/// <since>3.2.0</since>
public class PhoneVerificationService : IPhoneVerificationService
{
    private readonly ColorGarbDbContext _context;
    private readonly TwilioSmsProvider _smsProvider;
    private readonly ILogger<PhoneVerificationService> _logger;
    private static readonly Regex PhoneRegex = new(@"^\+[1-9]\d{1,14}$", RegexOptions.Compiled);

    /// <summary>
    /// Initializes a new instance of the PhoneVerificationService
    /// </summary>
    /// <param name="context">Database context</param>
    /// <param name="smsProvider">Twilio SMS provider</param>
    /// <param name="logger">Logger for diagnostic information</param>
    public PhoneVerificationService(
        ColorGarbDbContext context,
        TwilioSmsProvider smsProvider,
        ILogger<PhoneVerificationService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _smsProvider = smsProvider ?? throw new ArgumentNullException(nameof(smsProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Sends a verification code to a phone number for SMS opt-in verification.
    /// </summary>
    /// <param name="userId">Unique identifier of the user requesting verification</param>
    /// <param name="phoneNumber">Phone number to verify in E.164 format</param>
    /// <returns>PhoneVerification record with token and expiration information</returns>
    /// <exception cref="ArgumentException">Thrown when phone number format is invalid</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    /// <exception cref="InvalidOperationException">Thrown when rate limits are exceeded</exception>
    public async Task<PhoneVerification> SendVerificationCodeAsync(string userId, string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentNullException(nameof(userId));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format", nameof(userId));

        var formattedPhone = await ValidateAndFormatPhoneNumberAsync(phoneNumber);

        // Check rate limiting - max 3 verification attempts per hour per phone number
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var recentAttempts = await _context.PhoneVerifications
            .Where(pv => pv.PhoneNumber == formattedPhone && pv.CreatedAt > oneHourAgo)
            .CountAsync();

        if (recentAttempts >= 3)
        {
            throw new InvalidOperationException("Rate limit exceeded. Please try again in an hour.");
        }

        // Generate 6-digit verification code
        var verificationCode = GenerateVerificationCode();

        // Create verification record
        var verification = new PhoneVerification
        {
            UserId = userGuid,
            PhoneNumber = formattedPhone,
            VerificationToken = verificationCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        _context.PhoneVerifications.Add(verification);
        await _context.SaveChangesAsync();

        // Send SMS with verification code
        var message = $"ColorGarb verification code: {verificationCode}. This code expires in 10 minutes. Reply STOP to opt out.";
        
        try
        {
            await _smsProvider.SendSmsAsync(formattedPhone, message);
            _logger.LogInformation("Verification code sent to user {UserId} at phone {PhoneNumber}", userId, formattedPhone);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification SMS to {PhoneNumber}", formattedPhone);
            // Don't expose Twilio errors to the client
            throw new InvalidOperationException("Failed to send verification code. Please try again.");
        }

        return verification;
    }

    /// <summary>
    /// Verifies a phone number using the provided verification token.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="verificationToken">Six-digit verification code</param>
    /// <returns>True if verification was successful</returns>
    /// <exception cref="ArgumentException">Thrown when token is invalid format</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    public async Task<bool> VerifyPhoneNumberAsync(string userId, string verificationToken)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentNullException(nameof(userId));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format", nameof(userId));

        if (string.IsNullOrWhiteSpace(verificationToken) || verificationToken.Length != 6 || !verificationToken.All(char.IsDigit))
            throw new ArgumentException("Verification token must be 6 digits", nameof(verificationToken));

        // Find the verification record
        var verification = await _context.PhoneVerifications
            .Where(pv => pv.UserId == userGuid 
                && pv.VerificationToken == verificationToken 
                && !pv.IsVerified 
                && pv.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(pv => pv.CreatedAt)
            .FirstOrDefaultAsync();

        if (verification == null)
        {
            _logger.LogWarning("Invalid or expired verification attempt for user {UserId}", userId);
            return false;
        }

        // Update verification record
        verification.IsVerified = true;
        verification.VerifiedAt = DateTime.UtcNow;

        // Update user's notification preferences
        var preferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == userGuid);

        if (preferences != null)
        {
            preferences.PhoneNumber = verification.PhoneNumber;
            preferences.PhoneVerified = true;
            preferences.PhoneVerifiedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Phone number {PhoneNumber} verified successfully for user {UserId}", 
            verification.PhoneNumber, userId);

        return true;
    }

    /// <summary>
    /// Checks if a phone number has been verified for a specific user.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>True if the user has a verified phone number</returns>
    /// <exception cref="ArgumentException">Thrown when userId is invalid</exception>
    public async Task<bool> IsPhoneNumberVerifiedAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format", nameof(userId));

        var preferences = await _context.NotificationPreferences
            .Where(np => np.UserId == userGuid && np.PhoneVerified)
            .FirstOrDefaultAsync();

        return preferences != null;
    }

    /// <summary>
    /// Validates and formats a phone number to E.164 standard.
    /// </summary>
    /// <param name="phoneNumber">Raw phone number input</param>
    /// <param name="countryCode">ISO country code (default: US)</param>
    /// <returns>Formatted phone number in E.164 format</returns>
    /// <exception cref="ArgumentException">Thrown when phone number is invalid</exception>
    public async Task<string> ValidateAndFormatPhoneNumberAsync(string phoneNumber, string countryCode = "US")
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Phone number cannot be null or empty", nameof(phoneNumber));

        await Task.CompletedTask; // Make async for future phone validation library integration

        // Remove all non-digit characters except +
        var cleanNumber = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

        // If it starts with +, validate as E.164
        if (cleanNumber.StartsWith("+"))
        {
            if (PhoneRegex.IsMatch(cleanNumber))
                return cleanNumber;
            
            throw new ArgumentException("Invalid phone number format. Must be valid E.164 format.", nameof(phoneNumber));
        }

        // Handle US numbers without country code
        if (countryCode == "US")
        {
            // Remove leading 1 if present
            if (cleanNumber.StartsWith("1") && cleanNumber.Length == 11)
                cleanNumber = cleanNumber[1..];

            // Should be 10 digits for US
            if (cleanNumber.Length == 10 && cleanNumber.All(char.IsDigit))
                return $"+1{cleanNumber}";
        }

        throw new ArgumentException($"Invalid phone number format for country {countryCode}", nameof(phoneNumber));
    }

    /// <summary>
    /// Cleans up expired verification requests from the database.
    /// </summary>
    /// <returns>Number of expired records removed</returns>
    public async Task<int> CleanupExpiredVerificationsAsync()
    {
        var expired = await _context.PhoneVerifications
            .Where(pv => pv.ExpiresAt < DateTime.UtcNow)
            .ToListAsync();

        if (expired.Any())
        {
            _context.PhoneVerifications.RemoveRange(expired);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Cleaned up {Count} expired phone verification records", expired.Count);
        }

        return expired.Count;
    }

    /// <summary>
    /// Generates a secure 6-digit verification code.
    /// </summary>
    /// <returns>Six-digit numeric string</returns>
    private static string GenerateVerificationCode()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var randomNumber = BitConverter.ToUInt32(bytes, 0);
        
        // Ensure it's a 6-digit number between 100000-999999
        var code = (randomNumber % 900000) + 100000;
        return code.ToString();
    }
}