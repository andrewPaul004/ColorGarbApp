using System.ComponentModel.DataAnnotations;

namespace ColorGarbApi.Models.DTOs;

/// <summary>
/// DTO for submitting an order request from Director/Finance users.
/// Contains all order details for ColorGarb staff review and approval.
/// </summary>
/// <since>1.0.0</since>
public class CreateOrderRequestDto
{
    /// <summary>
    /// Brief description of the costume order
    /// </summary>
    [Required(ErrorMessage = "Description is required")]
    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Detailed notes about the order requirements
    /// </summary>
    [StringLength(2000, ErrorMessage = "Notes cannot exceed 2000 characters")]
    public string? Notes { get; set; }

    /// <summary>
    /// Number of performers/costumes needed
    /// </summary>
    [Required(ErrorMessage = "Performer count is required")]
    [Range(1, 10000, ErrorMessage = "Performer count must be between 1 and 10000")]
    public int PerformerCount { get; set; }

    /// <summary>
    /// Client's preferred completion date
    /// </summary>
    [Required(ErrorMessage = "Preferred completion date is required")]
    public DateTime PreferredCompletionDate { get; set; }

    /// <summary>
    /// Estimated budget for the order
    /// </summary>
    [Range(0.01, 999999.99, ErrorMessage = "Budget must be between $0.01 and $999,999.99")]
    public decimal? EstimatedBudget { get; set; }

    /// <summary>
    /// Priority level of the order request
    /// </summary>
    [Required(ErrorMessage = "Priority is required")]
    [StringLength(20, ErrorMessage = "Priority cannot exceed 20 characters")]
    public string Priority { get; set; } = "Normal";
}