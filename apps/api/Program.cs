using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using StackExchange.Redis;
using System.Text;
using System.Threading.RateLimiting;
using ColorGarbApi.Data;
using ColorGarbApi.Services;
using ColorGarbApi.Common.Authorization;
using ColorGarbApi.Models.Entities;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure Entity Framework
builder.Services.AddDbContext<ColorGarbDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Server=(localdb)\\mssqllocaldb;Database=ColorGarbDb;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true";
    options.UseSqlServer(connectionString);
});

// Configure Redis
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    return ConnectionMultiplexer.Connect(redisConnectionString);
});

// Register cache service
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// Register email service
builder.Services.AddScoped<IEmailService, EmailService>();

// Register audit service
builder.Services.AddScoped<IAuditService, AuditService>();

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
