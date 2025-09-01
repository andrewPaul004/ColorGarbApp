using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Data;
using ColorGarbApi.Models.Entities;
using ColorGarbApi.Common.Authorization;

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

    public OrganizationsController(
        ColorGarbDbContext context,
        ILogger<OrganizationsController> logger)
    {
        _context = context;
        _logger = logger;
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
}