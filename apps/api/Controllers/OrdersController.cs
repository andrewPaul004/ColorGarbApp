using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Orders controller handling costume order data access and management.
/// Provides organization-filtered access to order information with role-based authorization.
/// </summary>
[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(ColorGarbDbContext context, ILogger<OrdersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves all active orders for the authenticated user's organization.
    /// Automatically filtered by organization ID from JWT token claims.
    /// Only returns orders that belong to the user's organization for data isolation.
    /// </summary>
    /// <param name="status">Optional filter by order status (Active, Completed, Cancelled)</param>
    /// <param name="stage">Optional filter by current manufacturing stage</param>
    /// <returns>List of orders filtered by user's organization</returns>
    /// <response code="200">Successfully retrieved orders list</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks required permissions</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOrders([FromQuery] string? status = null, [FromQuery] string? stage = null)
    {
        try
        {
            var currentOrganizationId = GetCurrentOrganizationId();
            var userRole = GetUserRole();

            if (currentOrganizationId == null && userRole != "ColorGarbStaff")
            {
                _logger.LogWarning("User attempted to access orders without organization: {UserId}", GetUserId());
                return Forbid("Access denied: No organization association");
            }

            var query = _context.Orders
                .Include(o => o.Organization)
                .AsQueryable();

            // Apply organization filtering (ColorGarb staff can see all orders)
            if (userRole != "ColorGarbStaff" && currentOrganizationId.HasValue)
            {
                query = query.Where(o => o.OrganizationId == currentOrganizationId.Value);
            }

            // Apply optional status filter
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (status.Equals("Active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.IsActive);
                }
                else if (status.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => !o.IsActive);
                }
            }
            else
            {
                // Default to active orders only
                query = query.Where(o => o.IsActive);
            }

            // Apply optional stage filter
            if (!string.IsNullOrWhiteSpace(stage))
            {
                query = query.Where(o => EF.Functions.Like(o.CurrentStage.ToLower(), stage.ToLower()));
            }

            // Order by creation date (newest first)
            query = query.OrderByDescending(o => o.CreatedAt);

            var orders = await query.ToListAsync();

            var orderDtos = orders.Select(o => new OrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Description = o.Description,
                CurrentStage = o.CurrentStage,
                OriginalShipDate = o.OriginalShipDate,
                CurrentShipDate = o.CurrentShipDate,
                TotalAmount = o.TotalAmount,
                PaymentStatus = o.PaymentStatus,
                IsActive = o.IsActive,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                OrganizationName = o.Organization?.Name ?? "Unknown Organization"
            }).ToList();

            _logger.LogInformation("Retrieved {Count} orders for organization {OrganizationId}", 
                orderDtos.Count, currentOrganizationId);

            return Ok(orderDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving orders for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving orders" });
        }
    }

    /// <summary>
    /// Retrieves a specific order by ID, with organization-based access control.
    /// Users can only access orders that belong to their organization.
    /// </summary>
    /// <param name="id">Unique identifier of the order to retrieve</param>
    /// <returns>Order details if found and accessible</returns>
    /// <response code="200">Order found and returned</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks permission to access this order</response>
    /// <response code="404">Order not found or not accessible</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        try
        {
            var currentOrganizationId = GetCurrentOrganizationId();
            var userRole = GetUserRole();

            if (currentOrganizationId == null && userRole != "ColorGarbStaff")
            {
                _logger.LogWarning("User attempted to access order without organization: {UserId}", GetUserId());
                return Forbid("Access denied: No organization association");
            }

            var query = _context.Orders
                .Include(o => o.Organization)
                .Where(o => o.Id == id);

            // Apply organization filtering (ColorGarb staff can see all orders)
            if (userRole != "ColorGarbStaff" && currentOrganizationId.HasValue)
            {
                query = query.Where(o => o.OrganizationId == currentOrganizationId.Value);
            }

            var order = await query.FirstOrDefaultAsync();

            if (order == null)
            {
                _logger.LogWarning("Order not found or access denied: {OrderId} for user {UserId}", id, GetUserId());
                return NotFound(new { message = "Order not found or access denied" });
            }

            var orderDetailDto = new OrderDetailDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                Description = order.Description,
                CurrentStage = order.CurrentStage,
                OriginalShipDate = order.OriginalShipDate,
                CurrentShipDate = order.CurrentShipDate,
                TotalAmount = order.TotalAmount,
                PaymentStatus = order.PaymentStatus,
                Notes = order.Notes,
                Status = order.IsActive ? "Active" : "Completed",
                IsActive = order.IsActive,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                OrganizationName = order.Organization?.Name ?? "Unknown Organization",
                Organization = order.Organization != null ? new OrganizationDetailDto
                {
                    Id = order.Organization.Id,
                    Name = order.Organization.Name,
                    Type = order.Organization.Type,
                    ContactEmail = order.Organization.ContactEmail,
                    ContactPhone = order.Organization.ContactPhone,
                    Address = new AddressDto
                    {
                        Street1 = ExtractAddressLine(order.Organization.Address, 1),
                        Street2 = ExtractAddressLine(order.Organization.Address, 2),
                        City = ExtractAddressCity(order.Organization.Address),
                        State = ExtractAddressState(order.Organization.Address),
                        ZipCode = ExtractAddressZipCode(order.Organization.Address),
                        Country = "US"
                    },
                    PaymentTerms = order.Organization.PaymentTerms ?? "Net 30"
                } : null,
                NextActions = GetNextActionsForStage(order.CurrentStage)
            };

            _logger.LogInformation("Retrieved order {OrderId} for user {UserId}", id, GetUserId());

            return Ok(orderDetailDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order {OrderId} for user {UserId}", id, GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving the order" });
        }
    }

    /// <summary>
    /// Gets the current user's organization ID from JWT claims
    /// </summary>
    /// <returns>Organization ID or null if not found</returns>
    private Guid? GetCurrentOrganizationId()
    {
        var organizationIdClaim = User.FindFirst("organizationId")?.Value;
        if (string.IsNullOrEmpty(organizationIdClaim) || !Guid.TryParse(organizationIdClaim, out var organizationId))
        {
            return null;
        }
        return organizationId;
    }

    /// <summary>
    /// Gets the current user's role from JWT claims
    /// </summary>
    /// <returns>User role string</returns>
    private string GetUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }

    /// <summary>
    /// Gets the current user's ID from JWT claims
    /// </summary>
    /// <returns>User ID string</returns>
    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
    }

    /// <summary>
    /// Gets stage-specific next actions for order management
    /// </summary>
    /// <param name="currentStage">Current manufacturing stage</param>
    /// <returns>List of recommended next actions</returns>
    private List<string> GetNextActionsForStage(string currentStage)
    {
        return currentStage switch
        {
            "Measurements" => new List<string> { "Submit performer measurements", "Review sizing requirements" },
            "DesignProposal" => new List<string> { "Review design proposal", "Provide feedback or approval" },
            "ProofApproval" => new List<string> { "Approve final design proof", "Request design modifications" },
            "ProductionPlanning" => new List<string> { "Await production start notification" },
            "Cutting" or "Sewing" or "QualityControl" or "Finishing" or "FinalInspection" => 
                new List<string> { "Track production progress", "Prepare for delivery" },
            "Packaging" or "ShippingPreparation" => new List<string> { "Confirm shipping address", "Track shipment" },
            "ShipOrder" => new List<string> { "Track delivery status", "Prepare for receipt" },
            "Delivery" => new List<string> { "Confirm delivery received", "Provide feedback" },
            _ => new List<string> { "Contact support for assistance" }
        };
    }

    /// <summary>
    /// Extracts street address line from concatenated address string
    /// </summary>
    /// <param name="address">Full address string</param>
    /// <param name="lineNumber">Line number to extract (1 or 2)</param>
    /// <returns>Street address line or empty string</returns>
    private string ExtractAddressLine(string? address, int lineNumber)
    {
        if (string.IsNullOrEmpty(address)) return string.Empty;
        
        // Simple parsing - in production, use proper address parsing service
        var lines = address.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        return lineNumber == 1 && lines.Length > 0 ? lines[0].Trim() :
               lineNumber == 2 && lines.Length > 1 ? lines[1].Trim() : string.Empty;
    }

    /// <summary>
    /// Extracts city from address string (basic implementation)
    /// </summary>
    /// <param name="address">Full address string</param>
    /// <returns>City name or "Unknown"</returns>
    private string ExtractAddressCity(string? address)
    {
        // TODO: Implement proper address parsing service
        return "Unknown";
    }

    /// <summary>
    /// Extracts state from address string (basic implementation)
    /// </summary>
    /// <param name="address">Full address string</param>
    /// <returns>State abbreviation or "Unknown"</returns>
    private string ExtractAddressState(string? address)
    {
        // TODO: Implement proper address parsing service
        return "Unknown";
    }

    /// <summary>
    /// Extracts zip code from address string (basic implementation)
    /// </summary>
    /// <param name="address">Full address string</param>
    /// <returns>Zip code or "00000"</returns>
    private string ExtractAddressZipCode(string? address)
    {
        // TODO: Implement proper address parsing service
        return "00000";
    }
}

/// <summary>
/// Data transfer object for order information in API responses.
/// Contains basic order details for dashboard display and organization isolation.
/// </summary>
public class OrderDto
{
    /// <summary>
    /// Unique identifier for the order
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable order number (e.g., "CG-2023-001")
    /// </summary>
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>
    /// Brief description of the costume order
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Current stage in the 13-step manufacturing process
    /// </summary>
    public string CurrentStage { get; set; } = string.Empty;

    /// <summary>
    /// Original promised ship date
    /// </summary>
    public DateTime OriginalShipDate { get; set; }

    /// <summary>
    /// Current ship date (may be revised)
    /// </summary>
    public DateTime CurrentShipDate { get; set; }

    /// <summary>
    /// Total order value in USD
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Current payment status
    /// </summary>
    public string PaymentStatus { get; set; } = string.Empty;

    /// <summary>
    /// Additional notes or special instructions (optional)
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Indicates if the order is currently active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Date and time when the order was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Date and time when the order was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Name of the organization that owns this order
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;
}

/// <summary>
/// Extended data transfer object for detailed order information including organization details.
/// Contains complete order context for order detail workspace view.
/// </summary>
public class OrderDetailDto : OrderDto
{
    /// <summary>
    /// Current order status (Active, Completed, Cancelled)
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// Complete organization information including contact and address details
    /// </summary>
    public OrganizationDetailDto? Organization { get; set; }

    /// <summary>
    /// Available quick actions based on current order stage
    /// </summary>
    public List<string> NextActions { get; set; } = new List<string>();
}

/// <summary>
/// Organization details for order detail view
/// </summary>
public class OrganizationDetailDto
{
    /// <summary>
    /// Unique identifier for the organization
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Organization name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Organization type (School, BoosterClub, Theater, etc.)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Primary contact email address
    /// </summary>
    public string ContactEmail { get; set; } = string.Empty;

    /// <summary>
    /// Optional contact phone number
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Complete mailing/shipping address
    /// </summary>
    public AddressDto Address { get; set; } = new AddressDto();

    /// <summary>
    /// Payment terms and conditions
    /// </summary>
    public string PaymentTerms { get; set; } = string.Empty;
}

/// <summary>
/// Address information for organization contact details
/// </summary>
public class AddressDto
{
    /// <summary>
    /// Primary street address line
    /// </summary>
    public string Street1 { get; set; } = string.Empty;

    /// <summary>
    /// Secondary street address line (optional)
    /// </summary>
    public string Street2 { get; set; } = string.Empty;

    /// <summary>
    /// City name
    /// </summary>
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// State or province abbreviation
    /// </summary>
    public string State { get; set; } = string.Empty;

    /// <summary>
    /// ZIP or postal code
    /// </summary>
    public string ZipCode { get; set; } = string.Empty;

    /// <summary>
    /// Country code (defaults to US)
    /// </summary>
    public string Country { get; set; } = "US";
}