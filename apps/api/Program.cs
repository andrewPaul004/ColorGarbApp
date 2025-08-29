using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using StackExchange.Redis;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using ColorGarbApi.Data;
using ColorGarbApi.Services;
using ColorGarbApi.Common.Authorization;
using ColorGarbApi.Models.Entities;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Configure Entity Framework
builder.Services.AddDbContext<ColorGarbDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=ColorGarbDb;Trusted_Connection=true;MultipleActiveResultSets=true";
    options.UseSqlServer(connectionString);
});

// Configure Redis
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    return ConnectionMultiplexer.Connect(redisConnectionString);
});

// Register Redis database for rate limiting
builder.Services.AddScoped<IDatabase>(sp =>
{
    var multiplexer = sp.GetRequiredService<IConnectionMultiplexer>();
    return multiplexer.GetDatabase();
});

// Register cache service
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// Register email service
builder.Services.AddScoped<IEmailService, EmailService>();

// Register SMS services
builder.Services.AddScoped<TwilioSmsProvider>();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<IPhoneVerificationService, PhoneVerificationService>();

// Register notification preference service (required by SMS service)
builder.Services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();

// Register audit service
builder.Services.AddScoped<IAuditService, AuditService>();

// Register HttpClient for production tracking service
builder.Services.AddHttpClient<ProductionTrackingService>();

// Register production tracking service
builder.Services.AddScoped<IProductionTrackingService, ProductionTrackingService>();

// Register message services
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IMessageService, MessageService>();

// Register communication audit services
builder.Services.AddScoped<ICommunicationAuditRepository, CommunicationAuditRepository>();
builder.Services.AddScoped<ICommunicationAuditService, CommunicationAuditService>();

// Register communication export service
builder.Services.AddScoped<ICommunicationExportService, CommunicationExportServiceV2>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-secret-key-that-should-be-changed-in-production";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ColorGarbApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ColorGarbClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Configure role-based authorization
builder.Services.AddScoped<IAuthorizationHandler, RoleAuthorizationHandler>();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

builder.Services.AddAuthorization(options =>
{
    // Register role-based policies
    foreach (UserRole role in Enum.GetValues<UserRole>())
    {
        options.AddPolicy($"RequireRole_{role}", policy =>
            policy.Requirements.Add(new RoleRequirement(new[] { role })));
    }

    // Register combined role policies
    options.AddPolicy("RequireRoles_Director_Finance", policy =>
        policy.Requirements.Add(new RoleRequirement(new[] { UserRole.Director, UserRole.Finance })));

    options.AddPolicy("RequireOrganizationAccess", policy =>
        policy.Requirements.Add(new RoleRequirement(new[] { UserRole.Director, UserRole.Finance })));

    options.AddPolicy("RequireColorGarbStaff", policy =>
        policy.Requirements.Add(new RoleRequirement(new[] { UserRole.ColorGarbStaff }, false, true)));
});

// Configure Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    // Auth endpoints rate limiting - 5 attempts per minute per IP
    options.AddFixedWindowLimiter("AuthLimiter", configure =>
    {
        configure.PermitLimit = 5;
        configure.Window = TimeSpan.FromMinutes(1);
        configure.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        configure.QueueLimit = 0; // No queuing for auth attempts
    });

    // General API rate limiting - 100 requests per minute per IP
    options.AddFixedWindowLimiter("ApiLimiter", configure =>
    {
        configure.PermitLimit = 100;
        configure.Window = TimeSpan.FromMinutes(1);
        configure.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        configure.QueueLimit = 10;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176") // Vite dev server
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Ensure database is created in development
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<ColorGarbDbContext>();
        context.Database.EnsureCreated();
    }
}

app.UseHttpsRedirection();

app.UseCors();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Make Program class accessible for integration testing
public partial class Program { }
