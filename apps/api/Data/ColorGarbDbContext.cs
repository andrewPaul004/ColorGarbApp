using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Models;

namespace ColorGarbApi.Data;

/// <summary>
/// Entity Framework DbContext for the ColorGarb application.
/// Provides access to all database entities and handles organization-level data isolation.
/// </summary>
public class ColorGarbDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of the ColorGarbDbContext
    /// </summary>
    /// <param name="options">Database context options</param>
    public ColorGarbDbContext(DbContextOptions<ColorGarbDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Organizations dataset - represents client organizations
    /// </summary>
    public DbSet<Organization> Organizations => Set<Organization>();

    /// <summary>
    /// Users dataset - represents system users (both clients and staff)
    /// </summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>
    /// Orders dataset - represents costume orders through manufacturing process
    /// </summary>
    public DbSet<Order> Orders => Set<Order>();

    /// <summary>
    /// Login attempts dataset - tracks authentication attempts for security
    /// </summary>
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();

    /// <summary>
    /// Password reset tokens dataset - tracks secure password reset tokens
    /// </summary>
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    /// <summary>
    /// Configures entity relationships and constraints
    /// </summary>
    /// <param name="modelBuilder">Entity Framework model builder</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Organization entity
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ContactEmail).IsUnique();
            entity.Property(e => e.Type).HasConversion<string>();
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Role).HasConversion<string>();

            // Configure relationship with Organization
            entity.HasOne(e => e.Organization)
                  .WithMany(e => e.Users)
                  .HasForeignKey(e => e.OrganizationId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure Order entity
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderNumber).IsUnique();
            entity.Property(e => e.CurrentStage).HasConversion<string>();
            entity.Property(e => e.PaymentStatus).HasConversion<string>();

            // Configure relationship with Organization
            entity.HasOne(e => e.Organization)
                  .WithMany(e => e.Orders)
                  .HasForeignKey(e => e.OrganizationId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure LoginAttempt entity
        modelBuilder.Entity<LoginAttempt>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.AttemptedAt);
            entity.HasIndex(e => new { e.Email, e.AttemptedAt });
        });

        // Configure PasswordResetToken entity
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TokenHash);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt);

            // Configure relationship with User
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed initial data for development
        SeedInitialData(modelBuilder);
    }

    /// <summary>
    /// Seeds initial data for development and testing
    /// </summary>
    /// <param name="modelBuilder">Entity Framework model builder</param>
    private static void SeedInitialData(ModelBuilder modelBuilder)
    {
        // Static dates for seed data consistency
        var seedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var shipDate = new DateTime(2025, 4, 1, 0, 0, 0, DateTimeKind.Utc);

        // Seed a sample organization
        var sampleOrgId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        modelBuilder.Entity<Organization>().HasData(new Organization
        {
            Id = sampleOrgId,
            Name = "Lincoln High School Drama Department",
            Type = "school",
            ContactEmail = "drama@lincolnhigh.edu",
            ContactPhone = "(555) 123-4567",
            Address = "123 School St, Lincoln, IL 62656",
            IsActive = true,
            CreatedAt = seedDate,
            UpdatedAt = seedDate
        });

        // Seed a sample user with password hash for "password123"
        var sampleUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = sampleUserId,
            Email = "director@lincolnhigh.edu",
            Name = "Jane Smith",
            Role = "client",
            Phone = "(555) 123-4567",
            OrganizationId = sampleOrgId,
            PasswordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", // BCrypt hash of "password123"
            IsActive = true,
            CreatedAt = seedDate,
            UpdatedAt = seedDate
        });

        // Seed a sample order
        var sampleOrderId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        modelBuilder.Entity<Order>().HasData(new Order
        {
            Id = sampleOrderId,
            OrderNumber = "CG-2025-001",
            OrganizationId = sampleOrgId,
            Description = "Spring Musical - Hamilton Costumes (15 performers)",
            CurrentStage = "Initial Consultation",
            OriginalShipDate = shipDate,
            CurrentShipDate = shipDate,
            TotalAmount = 7500.00m,
            PaymentStatus = "Pending",
            Notes = "Historical accuracy important. Male and female period costumes needed.",
            IsActive = true,
            CreatedAt = seedDate,
            UpdatedAt = seedDate
        });
    }

    /// <summary>
    /// Override SaveChanges to automatically update timestamps
    /// </summary>
    /// <returns>Number of entities affected</returns>
    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    /// <summary>
    /// Override SaveChangesAsync to automatically update timestamps
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of entities affected</returns>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Updates CreatedAt and UpdatedAt timestamps for tracked entities
    /// </summary>
    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is Organization org)
            {
                if (entry.State == EntityState.Added)
                    org.CreatedAt = DateTime.UtcNow;
                org.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is User user)
            {
                if (entry.State == EntityState.Added)
                    user.CreatedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is Order order)
            {
                if (entry.State == EntityState.Added)
                    order.CreatedAt = DateTime.UtcNow;
                order.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}