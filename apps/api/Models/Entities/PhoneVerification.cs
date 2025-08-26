using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ColorGarbApi.Models.Entities;

/// <summary>
/// Represents a phone number verification request with secure token and expiration tracking.
/// Used for SMS notification opt-in verification process.
/// </summary>
/// <since>3.2.0</since>
public class PhoneVerification
{
    /// <summary>
    /// Unique identifier for the phone verification request
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the user requesting phone verification
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Phone number being verified (E.164 format)
    /// </summary>
    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Six-digit verification code sent to the phone number
    /// </summary>
    [Required]
    [StringLength(6)]
    public string VerificationToken { get; set; } = string.Empty;

    /// <summary>
    /// Indicates if this phone number has been successfully verified
    /// </summary>
    [Required]
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Timestamp when the phone number was verified
    /// </summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// Expiration timestamp for the verification token
    /// </summary>
    [Required]
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(10);

    /// <summary>
    /// Number of verification attempts made
    /// </summary>
    [Required]
    public int Attempts { get; set; } = 0;

    /// <summary>
    /// When this verification request was created
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the associated user
    /// </summary>
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}