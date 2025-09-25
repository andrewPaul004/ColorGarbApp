using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text;
using ColorGarbApi.Data;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Models.DTOs;
using ColorGarbApi.Common.Authorization;
using ColorGarbApi.Services;

namespace ColorGarbApi.Controllers;

/// <summary>
/// Organizations controller for managing organization data.
/// Provides endpoints for retrieving organization information.
/// </summary>
[ApiController]
[Route("api/organizations")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly ColorGarbDbContext _context;
    private readonly ILogger<OrganizationsController> _logger;
    private readonly IAuditService _auditService;

    public OrganizationsController(
        ColorGarbDbContext context,
        ILogger<OrganizationsController> logger,
        IAuditService auditService)
    {
        _context = context;
        _logger = logger;
        _auditService = auditService;
    }

    /// <summary>
    /// Gets all organizations. Only accessible by ColorGarb staff.
    /// </summary>
    /// <returns>List of all organizations</returns>
    /// <response code="200">Returns the list of organizations</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    [HttpGet]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetAllOrganizations()
    {
        try
        {
            var organizations = await _context.Organizations
                .Where(o => o.IsActive)
                .OrderBy(o => o.Name)
                .Select(o => new OrganizationDto
                {
                    Id = o.Id,
                    Name = o.Name,
                    Type = o.Type,
                    ContactEmail = o.ContactEmail
                })
                .ToListAsync();

            return Ok(organizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving organizations");
            return StatusCode(500, new { message = "An error occurred while retrieving organizations" });
        }
    }

    /// <summary>
    /// Gets a specific organization by ID.
    /// </summary>
    /// <param name="id">Organization ID</param>
    /// <returns>Organization details</returns>
    /// <response code="200">Returns the organization</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    /// <response code="404">Organization not found</response>
    [HttpGet("{id}")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationDto>> GetOrganization(Guid id)
    {
        try
        {
            var organization = await _context.Organizations
                .Where(o => o.Id == id && o.IsActive)
                .Select(o => new OrganizationDto
                {
                    Id = o.Id,
                    Name = o.Name,
                    Type = o.Type,
                    ContactEmail = o.ContactEmail
                })
                .FirstOrDefaultAsync();

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found" });
            }

            return Ok(organization);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving organization {OrganizationId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the organization" });
        }
    }

    /// <summary>
    /// Creates a new organization. Only accessible by ColorGarb staff.
    /// </summary>
    /// <param name="createDto">Organization creation data</param>
    /// <returns>Created organization details</returns>
    /// <response code="201">Organization created successfully</response>
    /// <response code="400">Invalid organization data</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    /// <response code="409">Organization with same name already exists</response>
    [HttpPost]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrganizationDetailsDto>> CreateOrganization([FromBody] CreateOrganizationDto createDto)
    {
        try
        {
            // Validate model
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check for duplicate organization name
            var existingOrganization = await _context.Organizations
                .FirstOrDefaultAsync(o => o.Name.ToLower() == createDto.Name.ToLower());

            if (existingOrganization != null)
            {
                return Conflict(new { message = "An organization with this name already exists" });
            }

            // Create new organization
            var organization = new Organization
            {
                Name = createDto.Name,
                Type = createDto.Type,
                ContactEmail = createDto.ContactEmail,
                ContactPhone = createDto.ContactPhone,
                Address = createDto.Address,
                ShippingAddress = createDto.ShippingAddress,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Organizations.Add(organization);
            await _context.SaveChangesAsync();

            // Log audit trail
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            await _auditService.LogRoleAccessAttemptAsync(
                userId,
                UserRole.ColorGarbStaff,
                $"Organization/{organization.Id}",
                "POST",
                true,
                organization.Id,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent.ToString(),
                $"Created organization: {organization.Name}"
            );

            _logger.LogInformation("Organization created: {OrganizationId} by user {UserId}", organization.Id, userId);

            // Map to detailed DTO
            var result = new OrganizationDetailsDto
            {
                Id = organization.Id,
                Name = organization.Name,
                Type = organization.Type,
                ContactEmail = organization.ContactEmail,
                ContactPhone = organization.ContactPhone,
                Address = organization.Address,
                ShippingAddress = organization.ShippingAddress,
                IsActive = organization.IsActive,
                CreatedAt = organization.CreatedAt,
                UpdatedAt = organization.UpdatedAt,
                TotalOrders = 0,
                ActiveOrders = 0,
                TotalOrderValue = 0,
                LastOrderDate = null
            };

            return CreatedAtAction(nameof(GetOrganization), new { id = organization.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating organization");
            return StatusCode(500, new { message = "An error occurred while creating the organization" });
        }
    }

    /// <summary>
    /// Updates an existing organization. Only accessible by ColorGarb staff.
    /// </summary>
    /// <param name="id">Organization ID</param>
    /// <param name="updateDto">Organization update data</param>
    /// <returns>Updated organization details</returns>
    /// <response code="200">Organization updated successfully</response>
    /// <response code="400">Invalid organization data</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    /// <response code="404">Organization not found</response>
    /// <response code="409">Organization with same name already exists</response>
    [HttpPut("{id}")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrganizationDetailsDto>> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationDto updateDto)
    {
        try
        {
            // Validate model
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var organization = await _context.Organizations
                .Include(o => o.Orders)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found" });
            }

            // Check for duplicate name if name is being updated
            if (!string.IsNullOrWhiteSpace(updateDto.Name) && updateDto.Name != organization.Name)
            {
                var existingOrganization = await _context.Organizations
                    .FirstOrDefaultAsync(o => o.Name.ToLower() == updateDto.Name.ToLower() && o.Id != id);

                if (existingOrganization != null)
                {
                    return Conflict(new { message = "An organization with this name already exists" });
                }
            }

            // Store original values for audit
            var originalValues = new
            {
                Name = organization.Name,
                Type = organization.Type,
                ContactEmail = organization.ContactEmail,
                ContactPhone = organization.ContactPhone,
                Address = organization.Address,
                ShippingAddress = organization.ShippingAddress
            };

            // Update fields if provided
            if (!string.IsNullOrWhiteSpace(updateDto.Name))
                organization.Name = updateDto.Name;
            if (!string.IsNullOrWhiteSpace(updateDto.Type))
                organization.Type = updateDto.Type;
            if (!string.IsNullOrWhiteSpace(updateDto.ContactEmail))
                organization.ContactEmail = updateDto.ContactEmail;
            if (updateDto.ContactPhone != null)
                organization.ContactPhone = updateDto.ContactPhone;
            if (!string.IsNullOrWhiteSpace(updateDto.Address))
                organization.Address = updateDto.Address;
            if (updateDto.ShippingAddress != null)
                organization.ShippingAddress = updateDto.ShippingAddress;

            organization.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log audit trail
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            var changes = new List<string>();
            if (updateDto.Name != null && updateDto.Name != originalValues.Name) changes.Add($"Name: {originalValues.Name} → {updateDto.Name}");
            if (updateDto.Type != null && updateDto.Type != originalValues.Type) changes.Add($"Type: {originalValues.Type} → {updateDto.Type}");
            if (updateDto.ContactEmail != null && updateDto.ContactEmail != originalValues.ContactEmail) changes.Add($"Email: {originalValues.ContactEmail} → {updateDto.ContactEmail}");
            if (updateDto.ContactPhone != originalValues.ContactPhone) changes.Add($"Phone: {originalValues.ContactPhone ?? "null"} → {updateDto.ContactPhone ?? "null"}");
            if (updateDto.Address != null && updateDto.Address != originalValues.Address) changes.Add($"Address: {originalValues.Address} → {updateDto.Address}");
            if (updateDto.ShippingAddress != originalValues.ShippingAddress) changes.Add($"ShippingAddress: {originalValues.ShippingAddress ?? "null"} → {updateDto.ShippingAddress ?? "null"}");

            await _auditService.LogRoleAccessAttemptAsync(
                userId,
                UserRole.ColorGarbStaff,
                $"Organization/{organization.Id}",
                "PUT",
                true,
                organization.Id,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent.ToString(),
                $"Updated organization: {organization.Name}. Changes: {string.Join(", ", changes)}"
            );

            _logger.LogInformation("Organization updated: {OrganizationId} by user {UserId}. Changes: {Changes}",
                organization.Id, userId, string.Join(", ", changes));

            // Calculate order statistics
            var totalOrders = organization.Orders.Count;
            var activeOrders = organization.Orders.Count(o => o.IsActive);
            var totalOrderValue = organization.Orders.Sum(o => o.TotalAmount ?? 0);
            var lastOrderDate = organization.Orders.MaxBy(o => o.CreatedAt)?.CreatedAt;

            // Map to detailed DTO
            var result = new OrganizationDetailsDto
            {
                Id = organization.Id,
                Name = organization.Name,
                Type = organization.Type,
                ContactEmail = organization.ContactEmail,
                ContactPhone = organization.ContactPhone,
                Address = organization.Address,
                ShippingAddress = organization.ShippingAddress,
                IsActive = organization.IsActive,
                CreatedAt = organization.CreatedAt,
                UpdatedAt = organization.UpdatedAt,
                TotalOrders = totalOrders,
                ActiveOrders = activeOrders,
                TotalOrderValue = totalOrderValue,
                LastOrderDate = lastOrderDate
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating organization {OrganizationId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the organization" });
        }
    }

    /// <summary>
    /// Deactivates an organization (soft delete). Only accessible by ColorGarb staff.
    /// </summary>
    /// <param name="id">Organization ID</param>
    /// <returns>No content on successful deactivation</returns>
    /// <response code="204">Organization deactivated successfully</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    /// <response code="404">Organization not found</response>
    /// <response code="400">Cannot deactivate organization with active orders</response>
    [HttpDelete("{id}")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateOrganization(Guid id)
    {
        try
        {
            var organization = await _context.Organizations
                .Include(o => o.Orders)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found" });
            }

            // Check for active orders
            var activeOrders = organization.Orders.Where(o => o.IsActive).ToList();
            if (activeOrders.Any())
            {
                return BadRequest(new {
                    message = $"Cannot deactivate organization with {activeOrders.Count} active orders. Complete or cancel active orders first.",
                    activeOrderCount = activeOrders.Count
                });
            }

            organization.IsActive = false;
            organization.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log audit trail
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            await _auditService.LogRoleAccessAttemptAsync(
                userId,
                UserRole.ColorGarbStaff,
                $"Organization/{organization.Id}",
                "DELETE",
                true,
                organization.Id,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent.ToString(),
                $"Deactivated organization: {organization.Name}"
            );

            _logger.LogInformation("Organization deactivated: {OrganizationId} by user {UserId}", organization.Id, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating organization {OrganizationId}", id);
            return StatusCode(500, new { message = "An error occurred while deactivating the organization" });
        }
    }

    /// <summary>
    /// Gets detailed organization information with statistics. Only accessible by ColorGarb staff.
    /// </summary>
    /// <param name="id">Organization ID</param>
    /// <returns>Detailed organization information</returns>
    /// <response code="200">Returns the organization details</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    /// <response code="404">Organization not found</response>
    [HttpGet("{id}/details")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationDetailsDto>> GetOrganizationDetails(Guid id)
    {
        try
        {
            var organization = await _context.Organizations
                .Include(o => o.Orders)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (organization == null)
            {
                return NotFound(new { message = "Organization not found" });
            }

            // Calculate statistics
            var totalOrders = organization.Orders.Count;
            var activeOrders = organization.Orders.Count(o => o.IsActive);
            var totalOrderValue = organization.Orders.Sum(o => o.TotalAmount ?? 0);
            var lastOrderDate = organization.Orders.MaxBy(o => o.CreatedAt)?.CreatedAt;

            var result = new OrganizationDetailsDto
            {
                Id = organization.Id,
                Name = organization.Name,
                Type = organization.Type,
                ContactEmail = organization.ContactEmail,
                ContactPhone = organization.ContactPhone,
                Address = organization.Address,
                ShippingAddress = organization.ShippingAddress,
                IsActive = organization.IsActive,
                CreatedAt = organization.CreatedAt,
                UpdatedAt = organization.UpdatedAt,
                TotalOrders = totalOrders,
                ActiveOrders = activeOrders,
                TotalOrderValue = totalOrderValue,
                LastOrderDate = lastOrderDate
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving organization details {OrganizationId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the organization details" });
        }
    }

    /// <summary>
    /// Bulk imports organizations from CSV data. Only accessible by ColorGarb staff.
    /// Maximum 1000 organizations per batch.
    /// </summary>
    /// <param name="bulkImportDto">Bulk import data</param>
    /// <returns>Import results with success/failure counts</returns>
    /// <response code="200">Import completed with results</response>
    /// <response code="400">Invalid import data</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    [HttpPost("bulk-import")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<BulkOrganizationImportResult>> BulkImportOrganizations([FromBody] BulkOrganizationImportDto bulkImportDto)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            // Validate model
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (bulkImportDto.Organizations.Count > 1000)
            {
                return BadRequest(new { message = "Cannot import more than 1000 organizations at once" });
            }

            var result = new BulkOrganizationImportResult();
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Get existing organization names for duplicate checking
            var existingNames = await _context.Organizations
                .Select(o => o.Name.ToLower())
                .ToHashSetAsync();

            var organizationsToAdd = new List<Organization>();
            var rowNumber = 1;

            foreach (var orgDto in bulkImportDto.Organizations)
            {
                var validationErrors = new List<string>();

                // Validate individual organization
                var validationContext = new ValidationContext(orgDto);
                var validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();

                if (!Validator.TryValidateObject(orgDto, validationContext, validationResults, true))
                {
                    validationErrors.AddRange(validationResults.Select(vr => vr.ErrorMessage ?? "Unknown validation error"));
                }

                // Check for duplicate names within the batch and existing data
                if (existingNames.Contains(orgDto.Name?.ToLower()) ||
                    organizationsToAdd.Any(o => o.Name.ToLower() == orgDto.Name?.ToLower()))
                {
                    validationErrors.Add($"Organization name '{orgDto.Name}' already exists or is duplicated in the import batch");
                }

                if (validationErrors.Any())
                {
                    result.Failures.Add(new OrganizationImportFailure
                    {
                        RowNumber = rowNumber,
                        OrganizationName = orgDto.Name ?? "Unknown",
                        Error = "Validation failed",
                        ValidationErrors = validationErrors
                    });
                    result.FailureCount++;
                }
                else
                {
                    var organization = new Organization
                    {
                        Name = orgDto.Name,
                        Type = orgDto.Type,
                        ContactEmail = orgDto.ContactEmail,
                        ContactPhone = orgDto.ContactPhone,
                        Address = orgDto.Address,
                        ShippingAddress = orgDto.ShippingAddress,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    organizationsToAdd.Add(organization);
                    existingNames.Add(orgDto.Name.ToLower()); // Add to set to catch duplicates within batch
                }

                rowNumber++;
            }

            // Save successful organizations
            if (organizationsToAdd.Any())
            {
                _context.Organizations.AddRange(organizationsToAdd);
                await _context.SaveChangesAsync();
                result.SuccessCount = organizationsToAdd.Count;
            }

            result.ProcessingTime = DateTime.UtcNow - startTime;

            // Log audit trail
            await _auditService.LogRoleAccessAttemptAsync(
                userId,
                UserRole.ColorGarbStaff,
                "Organization/bulk-import",
                "POST",
                true,
                null,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent.ToString(),
                $"Bulk imported organizations: {result.SuccessCount} successful, {result.FailureCount} failed"
            );

            _logger.LogInformation("Bulk organization import completed by user {UserId}: {SuccessCount} successful, {FailureCount} failed",
                userId, result.SuccessCount, result.FailureCount);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk organization import");
            return StatusCode(500, new { message = "An error occurred during bulk import" });
        }
    }

    /// <summary>
    /// Exports organization data as CSV. Only accessible by ColorGarb staff.
    /// </summary>
    /// <param name="includeInactive">Include inactive organizations in export</param>
    /// <returns>CSV file with organization data</returns>
    /// <response code="200">CSV export file</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="403">Forbidden - user doesn't have required permissions</response>
    [HttpGet("export")]
    [RequireRole(UserRole.ColorGarbStaff)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportOrganizations([FromQuery] bool includeInactive = false)
    {
        try
        {
            var query = _context.Organizations
                .Include(o => o.Orders)
                .AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(o => o.IsActive);
            }

            var organizations = await query
                .OrderBy(o => o.Name)
                .ToListAsync();

            // Build CSV content
            var csvBuilder = new StringBuilder();
            csvBuilder.AppendLine("Id,Name,Type,ContactEmail,ContactPhone,Address,ShippingAddress,IsActive,CreatedAt,UpdatedAt,TotalOrders,ActiveOrders,TotalOrderValue,LastOrderDate");

            foreach (var org in organizations)
            {
                var totalOrders = org.Orders.Count;
                var activeOrders = org.Orders.Count(o => o.IsActive);
                var totalOrderValue = org.Orders.Sum(o => o.TotalAmount ?? 0);
                var lastOrderDate = org.Orders.MaxBy(o => o.CreatedAt)?.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss") ?? "";

                csvBuilder.AppendLine($"\"{org.Id}\"," +
                    $"\"{EscapeCsvField(org.Name)}\"," +
                    $"\"{EscapeCsvField(org.Type)}\"," +
                    $"\"{EscapeCsvField(org.ContactEmail)}\"," +
                    $"\"{EscapeCsvField(org.ContactPhone ?? "")}\"," +
                    $"\"{EscapeCsvField(org.Address)}\"," +
                    $"\"{EscapeCsvField(org.ShippingAddress ?? "")}\"," +
                    $"{org.IsActive}," +
                    $"\"{org.CreatedAt:yyyy-MM-dd HH:mm:ss}\"," +
                    $"\"{org.UpdatedAt:yyyy-MM-dd HH:mm:ss}\"," +
                    $"{totalOrders}," +
                    $"{activeOrders}," +
                    $"{totalOrderValue:F2}," +
                    $"\"{lastOrderDate}\"");
            }

            // Log audit trail
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
            await _auditService.LogRoleAccessAttemptAsync(
                userId,
                UserRole.ColorGarbStaff,
                "Organization/export",
                "GET",
                true,
                null,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent.ToString(),
                $"Exported {organizations.Count} organizations (includeInactive: {includeInactive})"
            );

            _logger.LogInformation("Organization data exported by user {UserId}: {OrganizationCount} organizations", userId, organizations.Count);

            var csvBytes = Encoding.UTF8.GetBytes(csvBuilder.ToString());
            var fileName = $"organizations_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

            return File(csvBytes, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting organization data");
            return StatusCode(500, new { message = "An error occurred while exporting organization data" });
        }
    }

    /// <summary>
    /// Helper method to escape CSV fields containing quotes or commas.
    /// </summary>
    /// <param name="field">Field value to escape</param>
    /// <returns>Escaped field value</returns>
    private static string EscapeCsvField(string field)
    {
        if (string.IsNullOrEmpty(field))
            return string.Empty;

        // Escape quotes by doubling them
        return field.Replace("\"", "\"\"");
    }
}