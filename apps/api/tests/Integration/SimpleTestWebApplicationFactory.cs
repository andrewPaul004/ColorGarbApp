using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;
using ColorGarbApi.Services;
using Moq;

namespace ColorGarbApi.Tests.Integration;

/// <summary>
/// Simplified WebApplicationFactory for basic integration tests.
/// Focuses on authentication and authorization testing without complex database setup.
/// </summary>
public class SimpleTestWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Configure test settings for JWT
            config.AddInMemoryCollection(new Dictionary<string, string>
            {
                ["Jwt:Key"] = "test-secret-key-for-integration-testing-purposes-must-be-long-enough",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
                ["Frontend:BaseUrl"] = "http://localhost:5173"
            }!);
        });

        builder.ConfigureServices(services =>
        {
            // Mock external services to avoid dependencies during testing
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

            // Replace services with mocks
            services.Replace(ServiceDescriptor.Scoped(_ => mockEmailService.Object));
            services.Replace(ServiceDescriptor.Scoped(_ => mockProductionService.Object));
        });

        builder.UseEnvironment("Testing");
    }
}