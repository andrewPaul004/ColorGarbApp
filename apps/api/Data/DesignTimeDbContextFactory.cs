using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ColorGarbApi.Data;

/// <summary>
/// Design-time factory for ColorGarbDbContext to support EF migrations.
/// This enables migrations to run without a full application startup.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ColorGarbDbContext>
{
    /// <summary>
    /// Creates a new instance of ColorGarbDbContext for design-time operations
    /// </summary>
    /// <param name="args">Command line arguments</param>
    /// <returns>Configured DbContext instance</returns>
    public ColorGarbDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ColorGarbDbContext>();
        
        // Use a default connection string for migrations
        optionsBuilder.UseSqlServer("Server=localhost;Database=ColorGarb_Dev;Trusted_Connection=true;MultipleActiveResultSets=true");

        return new ColorGarbDbContext(optionsBuilder.Options);
    }
}