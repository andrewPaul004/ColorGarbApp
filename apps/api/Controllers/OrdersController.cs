using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
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