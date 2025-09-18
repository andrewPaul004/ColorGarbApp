using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models.DTOs;
using ColorGarbApi.Services;

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
    private readonly IAuditService _auditService;
    private readonly IProductionTrackingService _productionTrackingService;
    private readonly IEmailService _emailService;

    public OrdersController(ColorGarbDbContext context, ILogger<OrdersController> logger, IAuditService auditService, IProductionTrackingService productionTrackingService, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
        _productionTrackingService = productionTrackingService;
        _emailService = emailService;
    }

    /// <summary>
    /// Retrieves all orders across all organizations for ColorGarb staff members.
    /// Supports filtering by organization, status, stage, and pagination.
    /// </summary>
    /// <param name="organizationId">Optional filter by organization ID</param>
    /// <param name="status">Optional filter by order status</param>
    /// <param name="stage">Optional filter by manufacturing stage</param>
    /// <param name="page">Page number for pagination (default: 1)</param>
    /// <param name="pageSize">Number of items per page (default: 50, max: 100)</param>
    /// <returns>Paginated list of orders with organization details</returns>
    /// <response code="200">Successfully retrieved orders</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks ColorGarb staff permissions</response>
    /// <response code="500">Server error occurred</response>
    [HttpGet("admin/orders")]
    [Authorize(Roles = "ColorGarbStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAllOrdersForAdmin(
        [FromQuery] Guid? organizationId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? stage = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var userId = GetUserId();
            var userRole = GetUserRole();

            // Log the admin access attempt
            await _auditService.LogRoleAccessAttemptAsync(
                Guid.Parse(userId),
                UserRole.ColorGarbStaff,
                "GET /api/orders/admin/orders",
                "GET",
                true,
                organizationId,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.FirstOrDefault(),
                $"Filters: orgId={organizationId}, status={status}, stage={stage}, page={page}, pageSize={pageSize}"
            );

            var query = _context.Orders
                .Include(o => o.Organization)
                .AsQueryable();

            // Apply organization filter if specified
            if (organizationId.HasValue)
            {
                query = query.Where(o => o.OrganizationId == organizationId.Value);
            }

            // Apply status filter if specified
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (status.Equals("Active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.IsActive);
                }
                else if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                {
                    // Completed orders are inactive orders that have reached final stages
                    query = query.Where(o => !o.IsActive && 
                        (o.CurrentStage.Equals("Delivery", StringComparison.OrdinalIgnoreCase) ||
                         o.CurrentStage.Equals("Ship Order", StringComparison.OrdinalIgnoreCase)));
                }
                else if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    // Cancelled orders are inactive orders not in completed stages
                    query = query.Where(o => !o.IsActive && 
                        !(o.CurrentStage.Equals("Delivery", StringComparison.OrdinalIgnoreCase) ||
                          o.CurrentStage.Equals("Ship Order", StringComparison.OrdinalIgnoreCase)));
                }
                else if (status.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    // Legacy support for "Inactive" - all inactive orders
                    query = query.Where(o => !o.IsActive);
                }
            }
            else
            {
                // Default to active orders only when no status filter specified
                query = query.Where(o => o.IsActive);
            }

            // Apply stage filter if specified
            if (!string.IsNullOrWhiteSpace(stage))
            {
                query = query.Where(o => EF.Functions.Like(o.CurrentStage.ToLower(), stage.ToLower()));
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync();

            // Order by creation date (newest first) and apply pagination
            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Get all organizations for the dropdown
            var organizations = await _context.Organizations
                .Where(o => o.IsActive)
                .OrderBy(o => o.Name)
                .Select(o => new OrganizationDto
                {
                    Id = o.Id,
                    Name = o.Name,
                    Type = o.Type.ToString(),
                    ContactEmail = o.ContactEmail
                })
                .ToListAsync();

            var orderDtos = orders.Select(o => new AdminOrderDto
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
                OrganizationId = o.OrganizationId,
                OrganizationName = o.Organization?.Name ?? "Unknown Organization"
            }).ToList();

            var response = new AdminOrdersResponse
            {
                Orders = orderDtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                Organizations = organizations
            };

            _logger.LogInformation("Admin retrieved {Count} orders (page {Page}/{TotalPages})",
                orderDtos.Count, page, (int)Math.Ceiling((double)totalCount / pageSize));

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving admin orders for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while retrieving orders" });
        }
    }

    /// <summary>
    /// Updates the manufacturing stage and/or ship date for a specific order.
    /// Only ColorGarb staff members can perform this operation.
    /// Creates audit trail entries for all changes.
    /// </summary>
    /// <param name="orderId">Unique identifier of the order to update</param>
    /// <param name="request">Stage and ship date update details with reason</param>
    /// <returns>No content on successful update</returns>
    /// <response code="204">Order updated successfully</response>
    /// <response code="400">Invalid request data or stage transition</response>
    /// <response code="403">User lacks ColorGarb staff permissions</response>
    /// <response code="404">Order not found</response>
    /// <response code="500">Server error occurred</response>
    [HttpPatch("{orderId:guid}/admin")]
    [Authorize(Roles = "ColorGarbStaff")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateOrderStageAdmin(Guid orderId, [FromBody] UpdateOrderStageRequest request)
    {
        try
        {
            var userId = GetUserId();
            var userGuid = Guid.Parse(userId);

            // Find the order
            var order = await _context.Orders
                .Include(o => o.Organization)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                await _auditService.LogRoleAccessAttemptAsync(
                    userGuid,
                    UserRole.ColorGarbStaff,
                    $"PATCH /api/orders/{orderId}/admin",
                    "PATCH",
                    false,
                    null,
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Request.Headers.UserAgent.FirstOrDefault(),
                    "Order not found"
                );

                _logger.LogWarning("Admin order update failed - order not found: {OrderId} by user {UserId}", orderId, userId);
                return NotFound(new { message = "Order not found" });
            }

            // Admin users can transition to any stage without restrictions
            // Note: Removed stage transition validation for admin users as per requirements

            // Store original values for audit trail
            var originalStage = order.CurrentStage;
            var originalShipDate = order.CurrentShipDate;

            // Update the order
            order.CurrentStage = request.Stage;
            if (request.ShipDate.HasValue)
            {
                order.CurrentShipDate = request.ShipDate.Value;
            }
            order.UpdatedAt = DateTime.UtcNow;

            // Create stage history entry
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            var userName = user?.Name ?? "Unknown User";

            var stageHistory = new OrderStageHistory
            {
                OrderId = orderId,
                Stage = request.Stage,
                UpdatedBy = userName,
                Notes = request.Reason,
                PreviousShipDate = originalShipDate,
                NewShipDate = request.ShipDate,
                ChangeReason = request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value ? request.Reason : null
            };

            _context.OrderStageHistory.Add(stageHistory);

            // If only ship date changed (no stage change), create a separate history entry for ship date tracking
            if (originalStage == request.Stage && request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value)
            {
                var shipDateHistory = new OrderStageHistory
                {
                    OrderId = orderId,
                    Stage = originalStage, // Keep same stage
                    UpdatedBy = userName,
                    Notes = $"Ship date updated: {request.Reason}",
                    PreviousShipDate = originalShipDate,
                    NewShipDate = request.ShipDate,
                    ChangeReason = request.Reason
                };

                _context.OrderStageHistory.Add(shipDateHistory);
            }
            await _context.SaveChangesAsync();

            // Sync with production tracking system and send notifications (don't block on failure)
             _ = Task.Run(async () =>
            {
                try
                {
                    /* // Production tracking sync
                    var syncResult = await _productionTrackingService.SyncOrderStageUpdateAsync(
                        orderId,
                        order.OrderNumber,
                        originalStage,
                        request.Stage,
                        userId);

                    if (!syncResult.IsSuccess)
                    {
                        _logger.LogWarning("Production tracking sync failed for order {OrderNumber}: {Error}",
                            order.OrderNumber, syncResult.ErrorMessage);
                    } */

                    // Also sync ship date if it changed
                    /* if (request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value)
                    {
                        var shipDateSyncResult = await _productionTrackingService.SyncShipDateUpdateAsync(
                            orderId,
                            order.OrderNumber,
                            originalShipDate,
                            request.ShipDate.Value,
                            request.Reason,
                            userId);

                        if (!shipDateSyncResult.IsSuccess)
                        {
                            _logger.LogWarning("Production tracking ship date sync failed for order {OrderNumber}: {Error}",
                                order.OrderNumber, shipDateSyncResult.ErrorMessage);
                        }
                    } */

                    // Send notifications
                    await SendOrderNotificationsAsync(
                        orderId,
                        order.OrganizationId,
                        order.OrderNumber,
                        originalStage,
                        request.Stage,
                        originalShipDate,
                        request.ShipDate,
                        request.Reason);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error during production tracking sync and notifications for order {OrderNumber}",
                        order.OrderNumber);
                }
            }); 

            // Log successful audit entry
            await _auditService.LogRoleAccessAttemptAsync(
                userGuid,
                UserRole.ColorGarbStaff,
                $"PATCH /api/orders/{orderId}/admin",
                "PATCH",
                true,
                order.OrganizationId,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.FirstOrDefault(),
                $"Updated order {order.OrderNumber}: stage {originalStage} -> {request.Stage}, " +
                $"ship date {originalShipDate:yyyy-MM-dd} -> {order.CurrentShipDate:yyyy-MM-dd}, reason: {request.Reason}"
            );

            _logger.LogInformation("Admin updated order {OrderId}: stage {OriginalStage} -> {NewStage} by user {UserId}",
                orderId, originalStage, request.Stage, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating order {OrderId} by admin user {UserId}", orderId, GetUserId());
            return StatusCode(500, new { message = "An error occurred while updating the order" });
        }
    }

    /// <summary>
    /// Performs bulk updates on multiple orders simultaneously.
    /// Only ColorGarb staff members can perform this operation.
    /// Creates audit trail entries for all changes.
    /// </summary>
    /// <param name="request">Bulk update request with order IDs and changes</param>
    /// <returns>Results of bulk update operation</returns>
    /// <response code="200">Bulk update completed with results</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="403">User lacks ColorGarb staff permissions</response>
    /// <response code="500">Server error occurred</response>
    [HttpPost("admin/orders/bulk-update")]
    [Authorize(Roles = "ColorGarbStaff")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> BulkUpdateOrders([FromBody] BulkUpdateRequest request)
    {
        try
        {
            var userId = GetUserId();
            var userGuid = Guid.Parse(userId);
            var successful = new List<string>();
            var failed = new List<BulkUpdateFailure>();

            if (request.OrderIds == null || !request.OrderIds.Any())
            {
                return BadRequest(new { message = "At least one order ID is required" });
            }

            foreach (var orderId in request.OrderIds)
            {
                try
                {
                    var order = await _context.Orders
                        .Include(o => o.Organization)
                        .FirstOrDefaultAsync(o => o.Id == orderId);

                    if (order == null)
                    {
                        failed.Add(new BulkUpdateFailure { OrderId = orderId.ToString(), Error = "Order not found" });
                        continue;
                    }

                    // Admin users can transition to any stage without restrictions in bulk updates
                    // Note: Removed stage transition validation for admin bulk updates as per requirements

                    // Store original values for audit trail
                    var originalStage = order.CurrentStage;
                    var originalShipDate = order.CurrentShipDate;

                    // Apply updates
                    if (!string.IsNullOrWhiteSpace(request.Stage))
                    {
                        order.CurrentStage = request.Stage;
                    }

                    if (request.ShipDate.HasValue)
                    {
                        order.CurrentShipDate = request.ShipDate.Value;
                    }

                    order.UpdatedAt = DateTime.UtcNow;

                    // Create stage history entry for any changes
                    var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
                    var userName = user?.Name ?? "Unknown User";

                    // Create history entry if stage changed
                    if (!string.IsNullOrWhiteSpace(request.Stage))
                    {
                        var stageHistory = new OrderStageHistory
                        {
                            OrderId = orderId,
                            Stage = request.Stage,
                            UpdatedBy = userName,
                            Notes = request.Reason,
                            PreviousShipDate = originalShipDate,
                            NewShipDate = request.ShipDate,
                            ChangeReason = request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value ? request.Reason : null
                        };

                        _context.OrderStageHistory.Add(stageHistory);
                    }

                    // If only ship date changed (no stage change), create a separate history entry for ship date tracking
                    if (string.IsNullOrWhiteSpace(request.Stage) && request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value)
                    {
                        var shipDateHistory = new OrderStageHistory
                        {
                            OrderId = orderId,
                            Stage = originalStage, // Keep same stage
                            UpdatedBy = userName,
                            Notes = $"Ship date updated: {request.Reason}",
                            PreviousShipDate = originalShipDate,
                            NewShipDate = request.ShipDate,
                            ChangeReason = request.Reason
                        };

                        _context.OrderStageHistory.Add(shipDateHistory);
                    }

                    await _context.SaveChangesAsync();

                    // Sync with production tracking system (don't block on failure)
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            /* if (!string.IsNullOrWhiteSpace(request.Stage))
                            {
                                var syncResult = await _productionTrackingService.SyncOrderStageUpdateAsync(
                                    orderId,
                                    order.OrderNumber,
                                    originalStage,
                                    order.CurrentStage,
                                    userId);

                                if (!syncResult.IsSuccess)
                                {
                                    _logger.LogWarning("Bulk production tracking sync failed for order {OrderNumber}: {Error}",
                                        order.OrderNumber, syncResult.ErrorMessage);
                                }
                            }

                            if (request.ShipDate.HasValue && originalShipDate != request.ShipDate.Value)
                            {
                                var shipDateSyncResult = await _productionTrackingService.SyncShipDateUpdateAsync(
                                    orderId,
                                    order.OrderNumber,
                                    originalShipDate,
                                    order.CurrentShipDate,
                                    request.Reason,
                                    userId);

                                if (!shipDateSyncResult.IsSuccess)
                                {
                                    _logger.LogWarning("Bulk production tracking ship date sync failed for order {OrderNumber}: {Error}",
                                        order.OrderNumber, shipDateSyncResult.ErrorMessage);
                                }
                            } */

                            // Send notifications for bulk updates too
                            await SendOrderNotificationsAsync(
                                orderId,
                                order.OrganizationId,
                                order.OrderNumber,
                                originalStage,
                                order.CurrentStage,
                                originalShipDate,
                                request.ShipDate,
                                request.Reason);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Unexpected error during bulk production tracking sync and notifications for order {OrderNumber}",
                                order.OrderNumber);
                        }
                    }); 

                    // Log audit entry for successful update
                    await _auditService.LogRoleAccessAttemptAsync(
                        userGuid,
                        UserRole.ColorGarbStaff,
                        "POST /api/orders/admin/orders/bulk-update",
                        "POST",
                        true,
                        order.OrganizationId,
                        HttpContext.Connection.RemoteIpAddress?.ToString(),
                        Request.Headers.UserAgent.FirstOrDefault(),
                        $"Bulk updated order {order.OrderNumber}: stage {originalStage} -> {order.CurrentStage}, " +
                        $"ship date {originalShipDate:yyyy-MM-dd} -> {order.CurrentShipDate:yyyy-MM-dd}, reason: {request.Reason}"
                    );

                    successful.Add(orderId.ToString());
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating order {OrderId} in bulk operation", orderId);
                    failed.Add(new BulkUpdateFailure { OrderId = orderId.ToString(), Error = ex.Message });
                }
            }

            var response = new BulkUpdateResponse
            {
                Successful = successful,
                Failed = failed
            };

            _logger.LogInformation("Bulk update completed by admin user {UserId}: {SuccessCount} successful, {FailedCount} failed",
                userId, successful.Count, failed.Count);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk update by admin user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while performing bulk update" });
        }
    }

    /// <summary>
    /// Validates if a stage transition is allowed.
    /// Prevents skipping stages and ensures logical progression.
    /// </summary>
    /// <param name="currentStage">Current order stage</param>
    /// <param name="newStage">Proposed new stage</param>
    /// <returns>True if transition is valid</returns>
    private static bool IsValidStageTransition(string currentStage, string newStage)
    {
        // Define the valid stage progression order
        var stages = new[]
        {
            "Initial Consultation",
            "Design Proposal",
            "Proof Approval",
            "Measurements",
            "Production Planning",
            "Cutting",
            "Sewing",
            "Quality Control",
            "Finishing",
            "Final Inspection",
            "Packaging",
            "Shipping Preparation",
            "Ship Order",
            "Delivery"
        };

        var currentIndex = Array.IndexOf(stages, currentStage);
        var newIndex = Array.IndexOf(stages, newStage);

        // Allow if same stage, backward movement (for corrections), or one stage forward progression
        return currentIndex == newIndex ||
               (newIndex >= 0 && currentIndex >= 0 && newIndex <= currentIndex + 1 && newIndex >= 0);
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
                else if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                {
                    // Completed orders are inactive orders that have reached final stages
                    query = query.Where(o => !o.IsActive && 
                        (o.CurrentStage.Equals("Delivery", StringComparison.OrdinalIgnoreCase) ||
                         o.CurrentStage.Equals("Ship Order", StringComparison.OrdinalIgnoreCase)));
                }
                else if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    // Cancelled orders are inactive orders not in completed stages
                    query = query.Where(o => !o.IsActive && 
                        !(o.CurrentStage.Equals("Delivery", StringComparison.OrdinalIgnoreCase) ||
                          o.CurrentStage.Equals("Ship Order", StringComparison.OrdinalIgnoreCase)));
                }
                else if (status.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    // Legacy support for "Inactive" - all inactive orders
                    query = query.Where(o => !o.IsActive);
                }
            }
            else
            {
                // Default to active orders only when no status filter specified
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
                .Include(o => o.StageHistory.OrderBy(sh => sh.EnteredAt))
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

            var orderDto = new OrderDetailDto
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
                    Address = order.Organization.Address,
                    PaymentTerms = "Net 30" // Default payment terms - would be configurable per organization in production
                } : null,
                StageHistory = order.StageHistory.Select(sh => new StageHistoryDto
                {
                    Id = sh.Id,
                    Stage = sh.Stage,
                    EnteredAt = sh.EnteredAt,
                    UpdatedBy = sh.UpdatedBy,
                    Notes = sh.Notes,
                    PreviousShipDate = sh.PreviousShipDate,
                    NewShipDate = sh.NewShipDate,
                    ChangeReason = sh.ChangeReason
                }).ToList()
            };

            _logger.LogInformation("Retrieved order {OrderId} for user {UserId}", id, GetUserId());

            return Ok(orderDto);
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
    /// Sends notifications for order updates (stage changes and ship date changes) to users based on their notification preferences.
    /// This method is designed to be called from background tasks and creates its own service scope.
    /// </summary>
    /// <param name="orderId">Order ID</param>
    /// <param name="organizationId">Organization ID</param>
    /// <param name="orderNumber">Order number for logging</param>
    /// <param name="originalStage">Previous stage</param>
    /// <param name="newStage">New stage</param>
    /// <param name="originalShipDate">Previous ship date</param>
    /// <param name="newShipDate">New ship date (if changed)</param>
    /// <param name="reason">Reason for the update</param>
    private async Task SendOrderNotificationsAsync(
        Guid orderId,
        Guid organizationId,
        string orderNumber,
        string originalStage,
        string newStage,
        DateTime originalShipDate,
        DateTime? newShipDate,
        string reason)
    {
        // Create a new service scope for background task to avoid disposed context issues
        using var scope = HttpContext.RequestServices.CreateScope();
        var scopedServices = scope.ServiceProvider;
        
        try
        {
            var context = scopedServices.GetRequiredService<ColorGarbDbContext>();
            var emailService = scopedServices.GetRequiredService<IEmailService>();
            var logger = scopedServices.GetRequiredService<ILogger<OrdersController>>();

            // Get all users for this organization who might have notification preferences
            var organizationUsers = await context.Users
                .Where(u => u.OrganizationId == organizationId && u.IsActive)
                .Select(u => u.Id.ToString())
                .ToListAsync();

            var notificationsSent = 0;
            var notificationsFailed = 0;

            // Send stage milestone notification to each user based on their preferences
            if (originalStage != newStage)
            {
                foreach (var userId in organizationUsers)
                {
                    try
                    {
                        var notification = await emailService.SendMilestoneNotificationAsync(
                            userId,
                            orderId.ToString(),
                            newStage);

                        if (notification != null)
                        {
                            notificationsSent++;
                            logger.LogDebug("Stage milestone notification sent to user {UserId} for order {OrderNumber}: {NewStage}",
                                userId, orderNumber, newStage);
                        }
                        else
                        {
                            logger.LogDebug("No notification sent to user {UserId} for order {OrderNumber} - user has notifications disabled or milestone not enabled",
                                userId, orderNumber);
                        }
                    }
                    catch (Exception ex)
                    {
                        notificationsFailed++;
                        logger.LogWarning(ex, "Failed to send milestone notification to user {UserId} for order {OrderNumber}",
                            userId, orderNumber);
                    }
                }

                if (notificationsSent > 0)
                {
                    logger.LogInformation("Stage update notifications sent for order {OrderNumber}: {PreviousStage} -> {NewStage} ({Sent} sent, {Failed} failed)",
                        orderNumber, originalStage, newStage, notificationsSent, notificationsFailed);
                }
            }

            // Send ship date change milestone notification (treated as a separate milestone type)
            if (newShipDate.HasValue && originalShipDate != newShipDate.Value)
            {
                var shipNotificationsSent = 0;
                var shipNotificationsFailed = 0;

                foreach (var userId in organizationUsers)
                {
                    try
                    {
                        // Use "Ship Date Change" as a special milestone type for ship date updates
                        var notification = await emailService.SendMilestoneNotificationAsync(
                            userId,
                            orderId.ToString(),
                            "Ship Date Change");

                        if (notification != null)
                        {
                            shipNotificationsSent++;
                            logger.LogDebug("Ship date change notification sent to user {UserId} for order {OrderNumber}",
                                userId, orderNumber);
                        }
                        else
                        {
                            logger.LogDebug("No ship date notification sent to user {UserId} for order {OrderNumber} - user has notifications disabled or milestone not enabled",
                                userId, orderNumber);
                        }
                    }
                    catch (Exception ex)
                    {
                        shipNotificationsFailed++;
                        logger.LogWarning(ex, "Failed to send ship date change notification to user {UserId} for order {OrderNumber}",
                            userId, orderNumber);
                    }
                }

                if (shipNotificationsSent > 0)
                {
                    logger.LogInformation("Ship date change notifications sent for order {OrderNumber}: {PreviousDate} -> {NewDate} ({Sent} sent, {Failed} failed)",
                        orderNumber, originalShipDate.ToString("yyyy-MM-dd"), newShipDate.Value.ToString("yyyy-MM-dd"), 
                        shipNotificationsSent, shipNotificationsFailed);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notifications for order {OrderNumber}", orderNumber);
        }
    }

    /// <summary>
    /// Submits an order request for ColorGarb staff review and approval.
    /// Director/Finance users can no longer create orders directly - they submit requests instead.
    /// ColorGarb staff will review and create the actual order if approved.
    /// </summary>
    /// <param name="request">Order request details for staff review</param>
    /// <returns>Created order request with pending status</returns>
    /// <response code="201">Order request submitted successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks permission to submit order requests</response>
    /// <response code="500">Server error occurred</response>
    [HttpPost("request")]
    [Authorize(Roles = "Director,Finance")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateOrderRequest([FromBody] CreateOrderRequestDto request)
    {
        try
        {
            // Validate request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();
            var userRole = GetUserRole();
            var organizationId = GetCurrentOrganizationId();

            if (!organizationId.HasValue)
            {
                _logger.LogWarning("User attempted to submit order request without organization association: {UserId}", userId);
                return BadRequest(new { message = "User must be associated with an organization to submit order requests" });
            }

            // Get user details for the request
            var user = await _context.Users
                .Where(u => u.Id == Guid.Parse(userId))
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest(new { message = "User not found" });
            }

            // Create order request entity
            var orderRequest = new OrderRequest
            {
                Id = Guid.NewGuid(),
                OrganizationId = organizationId.Value,
                RequesterId = Guid.Parse(userId),
                RequesterName = user.Name,
                RequesterEmail = user.Email,
                Description = request.Description.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                PerformerCount = request.PerformerCount,
                PreferredCompletionDate = request.PreferredCompletionDate,
                EstimatedBudget = request.EstimatedBudget,
                Priority = request.Priority,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Add to database
            _context.OrderRequests.Add(orderRequest);
            await _context.SaveChangesAsync();

            // Log audit entry for order request submission
            await _auditService.LogRoleAccessAttemptAsync(
                Guid.Parse(userId),
                userRole == "Director" ? UserRole.Director : UserRole.Finance,
                "POST /api/orders/request",
                "POST",
                true,
                organizationId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.FirstOrDefault(),
                $"Submitted order request: {request.Description}"
            );

            // Send email notifications to ColorGarb staff about the new order request
            _ = Task.Run(async () => await SendOrderRequestNotificationsAsync(orderRequest));

            // Load organization for response
            var organization = await _context.Organizations
                .Where(o => o.Id == organizationId.Value)
                .FirstOrDefaultAsync();

            // Create response DTO
            var responseDto = new OrderRequestResponseDto
            {
                Id = orderRequest.Id,
                Description = orderRequest.Description,
                PerformerCount = orderRequest.PerformerCount,
                PreferredCompletionDate = orderRequest.PreferredCompletionDate,
                Status = orderRequest.Status,
                CreatedAt = orderRequest.CreatedAt,
                OrganizationName = organization?.Name ?? "Unknown Organization",
                RequesterName = orderRequest.RequesterName
            };

            _logger.LogInformation("Order request submitted successfully: {RequestId} by user {UserId}", orderRequest.Id, userId);

            return CreatedAtAction(nameof(GetOrderRequest), new { id = orderRequest.Id }, responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting order request for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while submitting the order request" });
        }
    }

    /// <summary>
    /// Gets a specific order request by ID for ColorGarb staff.
    /// Used for the CreatedAtAction response after submitting an order request.
    /// </summary>
    /// <param name="id">Order request ID</param>
    /// <returns>Order request details</returns>
    [HttpGet("requests/{id:guid}")]
    [Authorize(Roles = "ColorGarbStaff")]
    public async Task<IActionResult> GetOrderRequest(Guid id)
    {
        try
        {
            var orderRequest = await _context.OrderRequests
                .Include(or => or.Organization)
                .Include(or => or.Requester)
                .Where(or => or.Id == id)
                .FirstOrDefaultAsync();

            if (orderRequest == null)
            {
                return NotFound(new { message = "Order request not found" });
            }

            var responseDto = new OrderRequestResponseDto
            {
                Id = orderRequest.Id,
                Description = orderRequest.Description,
                PerformerCount = orderRequest.PerformerCount,
                PreferredCompletionDate = orderRequest.PreferredCompletionDate,
                Status = orderRequest.Status,
                CreatedAt = orderRequest.CreatedAt,
                OrganizationName = orderRequest.Organization.Name,
                RequesterName = orderRequest.RequesterName
            };

            return Ok(responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving order request {RequestId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the order request" });
        }
    }

    /// <summary>
    /// Generates a unique order number following the pattern CG-YYYY-XXX
    /// </summary>
    /// <returns>Unique order number</returns>
    private async Task<string> GenerateOrderNumberAsync()
    {
        var currentYear = DateTime.UtcNow.Year;
        var prefix = $"CG-{currentYear}-";

        // Find the highest order number for the current year
        var lastOrderNumber = await _context.Orders
            .Where(o => o.OrderNumber.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNumber)
            .Select(o => o.OrderNumber)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(lastOrderNumber))
        {
            // Extract the number portion and increment
            var numberPart = lastOrderNumber.Substring(prefix.Length);
            if (int.TryParse(numberPart, out var currentNumber))
            {
                nextNumber = currentNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D3}";
    }

    /// <summary>
    /// Sends email notifications to ColorGarb staff for new order creation
    /// </summary>
    private async Task SendOrderCreationNotificationsAsync(
        Guid orderId,
        Guid organizationId,
        string orderNumber,
        CreateOrderRequest request)
    {
        try
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var context = scopedServices.GetRequiredService<ColorGarbDbContext>();
            var emailService = scopedServices.GetRequiredService<IEmailService>();
            var logger = scopedServices.GetRequiredService<ILogger<OrdersController>>();

            // Get organization and user details
            var organization = await context.Organizations
                .Where(o => o.Id == organizationId)
                .FirstOrDefaultAsync();

            var user = await context.Users
                .Where(u => u.Id.ToString() == GetUserId())
                .FirstOrDefaultAsync();

            if (organization == null || user == null)
            {
                logger.LogWarning("Failed to load organization or user data for order creation notification: {OrderNumber}", orderNumber);
                return;
            }

            // Send notification to ColorGarb staff (this would be implemented in EmailService)
            logger.LogInformation("New order created notification: Order {OrderNumber} by {UserName} from {OrganizationName}", 
                orderNumber, user.Name, organization.Name);

            // TODO: Implement actual email notification when EmailService is updated
            // await emailService.SendNewOrderNotificationAsync(orderNumber, organization, user, request);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending order creation notifications for {OrderNumber}", orderNumber);
        }
    }

    /// <summary>
    /// Sends notifications to ColorGarb staff about new order requests from Director/Finance users.
    /// Creates messages that staff can review and approve for order creation.
    /// </summary>
    private async Task SendOrderRequestNotificationsAsync(OrderRequest orderRequest)
    {
        try
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var context = scopedServices.GetRequiredService<ColorGarbDbContext>();
            var emailService = scopedServices.GetRequiredService<IEmailService>();
            var logger = scopedServices.GetRequiredService<ILogger<OrdersController>>();

            // Get organization details
            var organization = await context.Organizations
                .Where(o => o.Id == orderRequest.OrganizationId)
                .FirstOrDefaultAsync();

            if (organization == null)
            {
                logger.LogWarning("Failed to load organization data for order request notification: {RequestId}", orderRequest.Id);
                return;
            }

            // Send notification to ColorGarb staff about the new order request
            logger.LogInformation("New order request submitted: {RequestId} by {RequesterName} from {OrganizationName}", 
                orderRequest.Id, orderRequest.RequesterName, organization.Name);

            // TODO: Implement actual email notification when EmailService is updated
            // This will send an email to ColorGarb staff with a link to review and approve the order request
            // await emailService.SendNewOrderRequestNotificationAsync(orderRequest, organization);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending order request notifications for {RequestId}", orderRequest.Id);
        }
    }

    /// <summary>
    /// Creates a new order for ColorGarb admin users with enhanced capabilities.
    /// Admin can select any organization and configure advanced order settings.
    /// </summary>
    /// <param name="request">Admin order creation request with enhanced fields</param>
    /// <returns>Created order with generated order number and selected stage</returns>
    /// <response code="201">Order created successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="403">User lacks ColorGarb staff permissions</response>
    /// <response code="500">Server error occurred</response>
    [HttpPost("admin")]
    [Authorize(Roles = "ColorGarbStaff")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateOrderAdmin([FromBody] AdminCreateOrderRequest request)
    {
        try
        {
            // Validate request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = GetUserId();

            // Validate organization exists and is active
            var organization = await _context.Organizations
                .Where(o => o.Id == request.OrganizationId && o.IsActive)
                .FirstOrDefaultAsync();

            if (organization == null)
            {
                return BadRequest(new { message = "Invalid organization selected. Organization must be active." });
            }

            // Validate manufacturing stage
            var validStages = GetAvailableManufacturingStages();
            if (!validStages.Contains(request.InitialStage))
            {
                return BadRequest(new { message = $"Invalid manufacturing stage: {request.InitialStage}" });
            }

            // Generate unique order number
            var orderNumber = await GenerateOrderNumberAsync();

            // Use custom order name if provided, otherwise use description
            var orderName = !string.IsNullOrWhiteSpace(request.OrderName) 
                ? request.OrderName.Trim() 
                : request.Description.Trim();

            // Create order entity
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = orderNumber,
                OrganizationId = request.OrganizationId,
                Description = orderName, // Using order name as primary description
                CurrentStage = request.InitialStage,
                OriginalShipDate = request.DeliveryDate,
                CurrentShipDate = request.DeliveryDate,
                TotalAmount = request.TotalAmount, // null means "TBD"
                PaymentStatus = request.TotalAmount.HasValue && request.TotalAmount > 0 ? "Pending" : "Pending Design Approval",
                Notes = BuildAdminOrderNotes(request),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Add to database
            _context.Orders.Add(order);

            // Create initial stage history entry
            var stageHistory = new OrderStageHistory
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Stage = request.InitialStage,
                EnteredAt = DateTime.UtcNow,
                UpdatedBy = userId,
                Notes = $"Order created by ColorGarb admin for {organization.Name}",
                PreviousShipDate = null,
                NewShipDate = order.CurrentShipDate,
                ChangeReason = "Admin order creation"
            };

            _context.OrderStageHistory.Add(stageHistory);

            await _context.SaveChangesAsync();

            // Log audit entry for admin order creation
            await _auditService.LogRoleAccessAttemptAsync(
                Guid.Parse(userId),
                UserRole.ColorGarbStaff,
                "POST /api/orders/admin",
                "POST",
                true,
                request.OrganizationId,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.FirstOrDefault(),
                $"Admin created order {orderNumber} for {organization.Name}: {orderName}"
            );

            // Send email notifications to organization users and ColorGarb staff
            _ = Task.Run(async () => await SendAdminOrderCreationNotificationsAsync(
                order.Id,
                order.OrganizationId,
                order.OrderNumber,
                request,
                organization.Name));

            // Create response DTO
            var orderDto = new OrderDto
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
                IsActive = order.IsActive,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt,
                OrganizationName = organization.Name
            };

            _logger.LogInformation("Admin order created successfully: {OrderNumber} for {OrganizationName} by admin {UserId}", 
                orderNumber, organization.Name, userId);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, orderDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating admin order for user {UserId}", GetUserId());
            return StatusCode(500, new { message = "An error occurred while creating the order" });
        }
    }

    /// <summary>
    /// Gets available manufacturing stages for order creation
    /// </summary>
    /// <returns>List of valid manufacturing stages</returns>
    private List<string> GetAvailableManufacturingStages()
    {
        return new List<string>
        {
            "Design Proposal",
            "Proof Approval", 
            "Measurements",
            "Production Planning",
            "Cutting",
            "Sewing",
            "Quality Control",
            "Finishing",
            "Final Inspection",
            "Packaging",
            "Shipping Preparation",
            "Ship Order",
            "Delivery"
        };
    }

    /// <summary>
    /// Builds comprehensive notes field for admin-created orders
    /// </summary>
    private string BuildAdminOrderNotes(AdminCreateOrderRequest request)
    {
        var notesParts = new List<string>();

        // Add performer count if specified
        if (request.NumberOfPerformers.HasValue && request.NumberOfPerformers > 0)
        {
            notesParts.Add($"Number of Performers: {request.NumberOfPerformers}");
        }

        // Add sample requirement
        if (request.NeedsSample)
        {
            notesParts.Add("Sample requested prior to production");
        }

        // Add measurement date context
        notesParts.Add($"Measurements scheduled for: {request.MeasurementDate:yyyy-MM-dd}");

        // Add special instructions if provided
        if (!string.IsNullOrWhiteSpace(request.SpecialInstructions))
        {
            notesParts.Add($"Special Instructions: {request.SpecialInstructions.Trim()}");
        }

        // Add admin notes if provided
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            notesParts.Add($"Additional Notes: {request.Notes.Trim()}");
        }

        return string.Join("\n\n", notesParts);
    }

    /// <summary>
    /// Sends email notifications for admin-created orders
    /// </summary>
    private async Task SendAdminOrderCreationNotificationsAsync(
        Guid orderId,
        Guid organizationId,
        string orderNumber,
        AdminCreateOrderRequest request,
        string organizationName)
    {
        try
        {
            using var scope = HttpContext.RequestServices.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var context = scopedServices.GetRequiredService<ColorGarbDbContext>();
            var emailService = scopedServices.GetRequiredService<IEmailService>();
            var logger = scopedServices.GetRequiredService<ILogger<OrdersController>>();

            // Get admin user details
            var adminUser = await context.Users
                .Where(u => u.Id.ToString() == GetUserId())
                .FirstOrDefaultAsync();

            if (adminUser == null)
            {
                logger.LogWarning("Failed to load admin user data for order creation notification: {OrderNumber}", orderNumber);
                return;
            }

            // Send notification to organization users
            var orgUsers = await context.Users
                .Where(u => u.OrganizationId == organizationId && u.IsActive)
                .ToListAsync();

            foreach (var user in orgUsers)
            {
                logger.LogInformation("Admin order created notification sent to org user {UserName}: Order {OrderNumber}", 
                    user.Name, orderNumber);
            }

            // Send notification to ColorGarb staff about admin-created order
            logger.LogInformation("Admin order created: {OrderNumber} for {OrganizationName} by {AdminName}", 
                orderNumber, organizationName, adminUser.Name);

            // TODO: Implement actual email notifications when EmailService is updated
            // await emailService.SendAdminOrderNotificationAsync(orderNumber, organizationName, adminUser, request, orgUsers);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending admin order creation notifications for {OrderNumber}", orderNumber);
        }
    }
}

/// <summary>
/// Request object for creating new orders by ColorGarb admin users.
/// Includes enhanced fields for cross-organization order management.
/// </summary>
public class AdminCreateOrderRequest
{
    /// <summary>
    /// ID of the organization this order belongs to (required)
    /// </summary>
    [Required]
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// Custom order name (e.g., "Fall 2025 Marching Band") - optional, uses description if not provided
    /// </summary>
    [MaxLength(200, ErrorMessage = "Order name cannot exceed 200 characters")]
    public string? OrderName { get; set; }

    /// <summary>
    /// Description of the costume order (required, max 500 characters)
    /// </summary>
    [Required]
    [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Number of performers/people for this order (optional)
    /// </summary>
    [Range(1, 10000, ErrorMessage = "Number of performers must be between 1 and 10,000")]
    public int? NumberOfPerformers { get; set; }

    /// <summary>
    /// Date when customer will provide measurements (required, must be future date)
    /// </summary>
    [Required]
    public DateTime MeasurementDate { get; set; }

    /// <summary>
    /// Date when customer needs costumes delivered (required, must be after measurement date)
    /// </summary>
    [Required]
    public DateTime DeliveryDate { get; set; }

    /// <summary>
    /// Whether customer needs a sample before production (optional)
    /// </summary>
    public bool NeedsSample { get; set; } = false;

    /// <summary>
    /// Initial manufacturing stage for this order (required)
    /// </summary>
    [Required]
    [MaxLength(50, ErrorMessage = "Stage name cannot exceed 50 characters")]
    public string InitialStage { get; set; } = "Design Proposal";

    /// <summary>
    /// Custom total amount for the order (optional, defaults to 0.00)
    /// </summary>
    [Range(0, 1000000, ErrorMessage = "Total amount must be between $0 and $1,000,000")]
    public decimal? TotalAmount { get; set; }

    /// <summary>
    /// Detailed special instructions for the order (optional, max 5000 characters)
    /// </summary>
    [MaxLength(5000, ErrorMessage = "Special instructions cannot exceed 5000 characters")]
    public string? SpecialInstructions { get; set; }

    /// <summary>
    /// Additional administrative notes (optional, max 2000 characters)
    /// </summary>
    [MaxLength(2000, ErrorMessage = "Notes cannot exceed 2000 characters")]
    public string? Notes { get; set; }
}

/// <summary>
/// Request object for creating new orders by Director and Finance users.
/// </summary>
public class CreateOrderRequest
{
    /// <summary>
    /// Description of the costume order (required, max 500 characters)
    /// </summary>
    [Required]
    [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Date when customer will provide measurements (required, must be future date)
    /// </summary>
    [Required]
    public DateTime MeasurementDate { get; set; }

    /// <summary>
    /// Date when customer needs costumes delivered (required, must be after measurement date)
    /// </summary>
    [Required]
    public DateTime DeliveryDate { get; set; }

    /// <summary>
    /// Whether customer needs a sample before production (optional)
    /// </summary>
    public bool NeedsSample { get; set; } = false;

    /// <summary>
    /// Additional notes or special instructions (optional, max 2000 characters)
    /// </summary>
    [MaxLength(2000, ErrorMessage = "Notes cannot exceed 2000 characters")]
    public string? Notes { get; set; }
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
    /// Total order value in USD. Null indicates "TBD" (To Be Determined)
    /// </summary>
    public decimal? TotalAmount { get; set; }

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
/// Data transfer object for admin order operations.
/// Contains additional fields needed for cross-organization order management.
/// </summary>
public class AdminOrderDto : OrderDto
{
    /// <summary>
    /// ID of the organization that owns this order (for admin filtering)
    /// </summary>
    public Guid OrganizationId { get; set; }
}

/// <summary>
/// Response object for admin orders endpoint with pagination and organization data.
/// </summary>
public class AdminOrdersResponse
{
    /// <summary>
    /// List of orders for the current page
    /// </summary>
    public List<AdminOrderDto> Orders { get; set; } = new();

    /// <summary>
    /// Total number of orders matching the filter criteria
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// List of all active organizations for filtering dropdown
    /// </summary>
    public List<OrganizationDto> Organizations { get; set; } = new();
}

/// <summary>
/// Data transfer object for organization information in admin responses.
/// </summary>
public class OrganizationDto
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
    /// Organization type (school, theater, etc.)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Primary contact email for the organization
    /// </summary>
    public string ContactEmail { get; set; } = string.Empty;
}

/// <summary>
/// Request object for updating order stage and ship date.
/// Used by admin users to modify order progression.
/// </summary>
public class UpdateOrderStageRequest
{
    /// <summary>
    /// New manufacturing stage for the order
    /// </summary>
    public string Stage { get; set; } = string.Empty;

    /// <summary>
    /// Optional new ship date for the order
    /// </summary>
    public DateTime? ShipDate { get; set; }

    /// <summary>
    /// Required reason for the update (for audit trail)
    /// </summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Request object for bulk updating multiple orders.
/// </summary>
public class BulkUpdateRequest
{
    /// <summary>
    /// List of order IDs to update
    /// </summary>
    public List<Guid> OrderIds { get; set; } = new();

    /// <summary>
    /// New stage to apply to all orders (optional)
    /// </summary>
    public string? Stage { get; set; }

    /// <summary>
    /// New ship date to apply to all orders (optional)
    /// </summary>
    public DateTime? ShipDate { get; set; }

    /// <summary>
    /// Reason for the bulk update (for audit trail)
    /// </summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Response object for bulk update operations.
/// </summary>
public class BulkUpdateResponse
{
    /// <summary>
    /// List of order IDs that were successfully updated
    /// </summary>
    public List<string> Successful { get; set; } = new();

    /// <summary>
    /// List of orders that failed to update with error details
    /// </summary>
    public List<BulkUpdateFailure> Failed { get; set; } = new();
}

/// <summary>
/// Represents a failed bulk update operation for a single order.
/// </summary>
public class BulkUpdateFailure
{
    /// <summary>
    /// ID of the order that failed to update
    /// </summary>
    public string OrderId { get; set; } = string.Empty;

    /// <summary>
    /// Error message describing why the update failed
    /// </summary>
    public string Error { get; set; } = string.Empty;
}

/// <summary>
/// Data transfer object for detailed organization information.
/// Contains complete organization data for order detail display.
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
    /// Organization type (School, Theater, etc.)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Primary contact email address
    /// </summary>
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Primary contact phone number
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// Complete address for shipping
    /// </summary>
    public string? Address { get; set; }

    /// <summary>
    /// Payment terms for the organization
    /// </summary>
    public string? PaymentTerms { get; set; }
}

/// <summary>
/// Data transfer object for detailed order information with complete organization data.
/// Used for order detail endpoints requiring comprehensive information display.
/// </summary>
public class OrderDetailDto : OrderDto
{
    /// <summary>
    /// Complete organization information
    /// </summary>
    public OrganizationDetailDto? Organization { get; set; }

    /// <summary>
    /// Historical progression through manufacturing stages
    /// </summary>
    public List<StageHistoryDto> StageHistory { get; set; } = new();
}

/// <summary>
/// Data transfer object for order stage history information.
/// </summary>
public class StageHistoryDto
{
    /// <summary>
    /// Unique identifier for the stage history entry
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The stage that was entered
    /// </summary>
    public string Stage { get; set; } = string.Empty;

    /// <summary>
    /// Date and time when this stage was entered
    /// </summary>
    public DateTime EnteredAt { get; set; }

    /// <summary>
    /// ID or name of the user/system that updated the stage
    /// </summary>
    public string UpdatedBy { get; set; } = string.Empty;

    /// <summary>
    /// Optional notes about the stage progression
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Previous ship date before this stage (if changed)
    /// </summary>
    public DateTime? PreviousShipDate { get; set; }

    /// <summary>
    /// New ship date set during this stage (if changed)
    /// </summary>
    public DateTime? NewShipDate { get; set; }

    /// <summary>
    /// Reason for ship date change (if applicable)
    /// </summary>
    public string? ChangeReason { get; set; }
}