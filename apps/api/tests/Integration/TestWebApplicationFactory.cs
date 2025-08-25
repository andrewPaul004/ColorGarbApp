using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ColorGarbApi.Data;
using ColorGarbApi.Services;
using Moq;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Custom WebApplicationFactory for integration tests.
/// Configures in-memory database and mock services for testing.
/// </summary>
public class TestWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the real database context registration
            var contextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ColorGarbDbContext>));
            if (contextDescriptor != null)
            {
                services.Remove(contextDescriptor);
            }

            // Remove the DbContext registration itself
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ColorGarbDbContext));
            if (dbContextDescriptor != null)
            {
                services.Remove(dbContextDescriptor);
            }

            // Add in-memory database for testing
            services.AddDbContext<ColorGarbDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDatabase");
            });

            // Mock external services for testing
            var mockEmailService = new Mock<IEmailService>();
            mockEmailService.Setup(x => x.SendPasswordResetEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                          .ReturnsAsync(true);
            mockEmailService.Setup(x => x.SendOrderStageUpdateEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
                          .ReturnsAsync(true);
            mockEmailService.Setup(x => x.SendShipDateChangeEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>()))
                          .ReturnsAsync(true);

            var mockProductionService = new Mock<IProductionTrackingService>();
            mockProductionService.Setup(x => x.SyncOrderStageUpdateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                                .ReturnsAsync(ProductionSyncResult.Success());
            mockProductionService.Setup(x => x.SyncShipDateUpdateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<string>(), It.IsAny<string>()))
                                .ReturnsAsync(ProductionSyncResult.Success());

            services.Replace(ServiceDescriptor.Scoped(_ => mockEmailService.Object));
            services.Replace(ServiceDescriptor.Scoped(_ => mockProductionService.Object));

            // Build the service provider
            var serviceProvider = services.BuildServiceProvider();

            // Create a scope to get scoped services
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();

            // Ensure the database is created
            context.Database.EnsureCreated();

            // Seed test data
            SeedTestData(context);
        });

        builder.UseEnvironment("Testing");
    }

    /// <summary>
    /// Seeds test data for integration tests
    /// </summary>
    /// <param name="context">Database context</param>
    private static void SeedTestData(ColorGarbDbContext context)
    {
        // Clear existing data
        context.OrderStageHistory.RemoveRange(context.OrderStageHistory);
        context.Orders.RemoveRange(context.Orders);
        context.Users.RemoveRange(context.Users);
        context.Organizations.RemoveRange(context.Organizations);
        context.SaveChanges();

        // Create test organizations
        var org1 = new ColorGarbApi.Models.Organization
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Test High School",
            Type = "school",
            ContactEmail = "test@school.edu",
            ContactPhone = "(555) 123-4567",
            Address = "123 School St, Test City, TX 12345",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var org2 = new ColorGarbApi.Models.Organization
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Test Theater Company",
            Type = "theater",
            ContactEmail = "info@theater.com",
            ContactPhone = "(555) 987-6543",
            Address = "456 Theater Ave, Test City, TX 12345",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Organizations.AddRange(org1, org2);

        // Create test users with different roles
        var clientUser = new ColorGarbApi.Models.User
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Email = "client@school.edu",
            Name = "Test Client",
            Role = ColorGarbApi.Models.Entities.UserRole.Director,
            OrganizationId = org1.Id,
            PasswordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", // "password123"
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var adminUser = new ColorGarbApi.Models.User
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Email = "admin@colorgarb.com",
            Name = "Test Admin",
            Role = ColorGarbApi.Models.Entities.UserRole.ColorGarbStaff,
            OrganizationId = null, // Admin users typically don't belong to client organizations
            PasswordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", // "password123"
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(clientUser, adminUser);

        // Create test orders
        var order1 = new ColorGarbApi.Models.Order
        {
            Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
            OrderNumber = "TEST-001",
            OrganizationId = org1.Id,
            Description = "Test Order 1 - Band Uniforms",
            CurrentStage = "ProductionPlanning",
            OriginalShipDate = DateTime.UtcNow.AddDays(30),
            CurrentShipDate = DateTime.UtcNow.AddDays(35),
            TotalAmount = 5000.00m,
            PaymentStatus = "Pending",
            Notes = "Test order for integration tests",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var order2 = new ColorGarbApi.Models.Order
        {
            Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
            OrderNumber = "TEST-002",
            OrganizationId = org2.Id,
            Description = "Test Order 2 - Theater Costumes",
            CurrentStage = "Sewing",
            OriginalShipDate = DateTime.UtcNow.AddDays(45),
            CurrentShipDate = DateTime.UtcNow.AddDays(45),
            TotalAmount = 7500.00m,
            PaymentStatus = "Partial",
            Notes = "Test theater costumes",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Orders.AddRange(order1, order2);

        // Create stage history
        var stageHistory1 = new ColorGarbApi.Models.OrderStageHistory
        {
            Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
            OrderId = order1.Id,
            Stage = "DesignProposal",
            EnteredAt = DateTime.UtcNow.AddDays(-20),
            UpdatedBy = "Test Admin",
            Notes = "Design proposal completed"
        };

        var stageHistory2 = new ColorGarbApi.Models.OrderStageHistory
        {
            Id = Guid.Parse("88888888-8888-8888-8888-888888888888"),
            OrderId = order1.Id,
            Stage = "ProofApproval",
            EnteredAt = DateTime.UtcNow.AddDays(-15),
            UpdatedBy = "Test Client",
            Notes = "Proof approved by client"
        };

        context.OrderStageHistory.AddRange(stageHistory1, stageHistory2);

        context.SaveChanges();
    }
}