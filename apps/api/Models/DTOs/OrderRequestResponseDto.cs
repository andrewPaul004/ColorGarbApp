namespace ColorGarbApi.Models.DTOs;

/// <summary>
/// DTO for returning order request details to the client.
/// Contains the created order request information and status.
/// </summary>
/// <since>1.0.0</since>
public class OrderRequestResponseDto
{
    /// <summary>
    /// Unique identifier for the order request
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Brief description of the costume order
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Number of performers/costumes needed
    /// </summary>
    public int PerformerCount { get; set; }

    /// <summary>
    /// Client's preferred completion date
    /// </summary>
    public DateTime PreferredCompletionDate { get; set; }

    /// <summary>
    /// Current status of the order request
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// When this order request was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Organization name that made the request
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>
    /// Name of the person who made the request
    /// </summary>
    public string RequesterName { get; set; } = string.Empty;
}