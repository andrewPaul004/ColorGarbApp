using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Services;

/// <summary>
/// Service interface for phone number verification and validation.
/// Handles secure verification codes and phone number format validation.
/// </summary>
/// <since>3.2.0</since>
public interface IPhoneVerificationService
{
    /// <summary>
    /// Sends a verification code to a phone number for SMS opt-in verification.
    /// </summary>
    /// <param name="userId">Unique identifier of the user requesting verification</param>
    /// <param name="phoneNumber">Phone number to verify in E.164 format</param>
    /// <returns>PhoneVerification record with token and expiration information</returns>
    /// <exception cref="ArgumentException">Thrown when phone number format is invalid</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    /// <exception cref="InvalidOperationException">Thrown when rate limits are exceeded</exception>
    Task<PhoneVerification> SendVerificationCodeAsync(string userId, string phoneNumber);

    /// <summary>
    /// Verifies a phone number using the provided verification token.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <param name="verificationToken">Six-digit verification code</param>
    /// <returns>True if verification was successful</returns>
    /// <exception cref="ArgumentException">Thrown when token is invalid format</exception>
    /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
    Task<bool> VerifyPhoneNumberAsync(string userId, string verificationToken);

    /// <summary>
    /// Checks if a phone number has been verified for a specific user.
    /// </summary>
    /// <param name="userId">Unique identifier of the user</param>
    /// <returns>True if the user has a verified phone number</returns>
    /// <exception cref="ArgumentException">Thrown when userId is invalid</exception>
    Task<bool> IsPhoneNumberVerifiedAsync(string userId);

    /// <summary>
    /// Validates and formats a phone number to E.164 standard.
    /// </summary>
    /// <param name="phoneNumber">Raw phone number input</param>
    /// <param name="countryCode">ISO country code (default: US)</param>
    /// <returns>Formatted phone number in E.164 format</returns>
    /// <exception cref="ArgumentException">Thrown when phone number is invalid</exception>
    Task<string> ValidateAndFormatPhoneNumberAsync(string phoneNumber, string countryCode = "US");

    /// <summary>
    /// Cleans up expired verification requests from the database.
    /// </summary>
    /// <returns>Number of expired records removed</returns>
    Task<int> CleanupExpiredVerificationsAsync();
}