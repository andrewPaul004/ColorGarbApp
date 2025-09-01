using Microsoft.EntityFrameworkCore;
using ColorGarbApi.Models;
using ColorGarbApi.Models.Entities;

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
    /// Order stage history dataset - tracks progression through manufacturing stages
    /// </summary>
    public DbSet<OrderStageHistory> OrderStageHistory => Set<OrderStageHistory>();

    /// <summary>
    /// Login attempts dataset - tracks authentication attempts for security
    /// </summary>
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();

    /// <summary>
    /// Password reset tokens dataset - tracks secure password reset tokens
    /// </summary>
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    /// <summary>
    /// Role access audits dataset - tracks role-based access attempts for security
    /// </summary>
    public DbSet<RoleAccessAudit> RoleAccessAudits => Set<RoleAccessAudit>();

    /// <summary>
    /// Notification preferences dataset - tracks user email notification preferences
    /// </summary>
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();

    /// <summary>
    /// Email notifications dataset - tracks email delivery status and audit trail
    /// </summary>
    public DbSet<EmailNotification> EmailNotifications => Set<EmailNotification>();

    // SMS functionality removed - keeping for historical reference in comments only

    /// <summary>
    /// Messages dataset - tracks order-specific communication between clients and staff
    /// </summary>
    public DbSet<Message> Messages => Set<Message>();

    /// <summary>
    /// Message attachments dataset - tracks files attached to order messages
    /// </summary>
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();

    /// <summary>
    /// Communication logs dataset - comprehensive audit trail for all communications
    /// </summary>
    public DbSet<CommunicationLog> CommunicationLogs => Set<CommunicationLog>();

    /// <summary>
    /// Notification delivery logs dataset - detailed delivery status tracking
    /// </summary>
    public DbSet<NotificationDeliveryLog> NotificationDeliveryLogs => Set<NotificationDeliveryLog>();

    /// <summary>
    /// Message audit trails dataset - tracks message creation and edit history
    /// </summary>
    public DbSet<MessageAuditTrail> MessageAuditTrails => Set<MessageAuditTrail>();

    /// <summary>
    /// Message edits dataset - tracks individual message modifications
    /// </summary>
    public DbSet<MessageEdit> MessageEdits => Set<MessageEdit>();

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

        // Configure OrderStageHistory entity
        modelBuilder.Entity<OrderStageHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.Stage);
            entity.HasIndex(e => e.EnteredAt);
            entity.HasIndex(e => new { e.OrderId, e.EnteredAt });

            // Configure relationship with Order
            entity.HasOne(e => e.Order)
                  .WithMany(e => e.StageHistory)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
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

        // Configure RoleAccessAudit entity
        modelBuilder.Entity<RoleAccessAudit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => new { e.UserId, e.Timestamp });
            entity.Property(e => e.UserRole).HasConversion<string>();

            // Configure relationship with User
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Organization
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure NotificationPreference entity
        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.UnsubscribeToken).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.IsActive });

            // Configure relationship with User
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure EmailNotification entity
        modelBuilder.Entity<EmailNotification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.Status });

            // Configure relationship with User
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Order
            entity.HasOne(e => e.Order)
                  .WithMany()
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SMS and Phone verification entities removed - SMS functionality disabled

        // Configure Message entity
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IsRead);
            entity.HasIndex(e => new { e.OrderId, e.CreatedAt });
            entity.HasIndex(e => new { e.OrderId, e.IsRead });

            // Configure Content column to use nvarchar(max) for SQL Server
            entity.Property(e => e.Content).HasColumnType("nvarchar(max)");

            // Configure relationship with Order
            entity.HasOne(e => e.Order)
                  .WithMany(e => e.Messages)
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Sender
            entity.HasOne(e => e.Sender)
                  .WithMany()
                  .HasForeignKey(e => e.SenderId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Configure self-referencing relationship for replies
            entity.HasOne(e => e.ReplyToMessage)
                  .WithMany(e => e.Replies)
                  .HasForeignKey(e => e.ReplyToMessageId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure MessageAttachment entity
        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MessageId);
            entity.HasIndex(e => e.UploadedBy);
            entity.HasIndex(e => e.UploadedAt);
            entity.HasIndex(e => e.OriginalFileName);

            // Configure relationship with Message
            entity.HasOne(e => e.Message)
                  .WithMany(e => e.Attachments)
                  .HasForeignKey(e => e.MessageId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with UploadedBy User
            entity.HasOne(e => e.UploadedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.UploadedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure CommunicationLog entity
        modelBuilder.Entity<CommunicationLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.RecipientId);
            entity.HasIndex(e => e.CommunicationType);
            entity.HasIndex(e => e.DeliveryStatus);
            entity.HasIndex(e => e.SentAt);
            entity.HasIndex(e => e.DeliveredAt);
            entity.HasIndex(e => e.ReadAt);
            entity.HasIndex(e => e.ExternalMessageId).IsUnique();
            entity.HasIndex(e => new { e.OrderId, e.SentAt });
            entity.HasIndex(e => new { e.SenderId, e.SentAt });
            entity.HasIndex(e => new { e.CommunicationType, e.DeliveryStatus });

            // Configure Content column to use nvarchar(max) for SQL Server
            entity.Property(e => e.Content).HasColumnType("nvarchar(max)");

            // Configure indexes (excluding Content which is nvarchar(max))
            entity.HasIndex(e => e.Subject);
            entity.HasIndex(e => e.RecipientEmail);
            entity.HasIndex(e => e.RecipientPhone);

            // Configure relationship with Order
            entity.HasOne(e => e.Order)
                  .WithMany()
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Sender
            entity.HasOne(e => e.Sender)
                  .WithMany()
                  .HasForeignKey(e => e.SenderId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Configure relationship with Recipient
            entity.HasOne(e => e.Recipient)
                  .WithMany()
                  .HasForeignKey(e => e.RecipientId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure NotificationDeliveryLog entity
        modelBuilder.Entity<NotificationDeliveryLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CommunicationLogId);
            entity.HasIndex(e => e.DeliveryProvider);
            entity.HasIndex(e => e.ExternalId).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.UpdatedAt);
            entity.HasIndex(e => new { e.CommunicationLogId, e.UpdatedAt });
            entity.HasIndex(e => new { e.DeliveryProvider, e.Status });

            // Configure relationship with CommunicationLog
            entity.HasOne(e => e.CommunicationLog)
                  .WithMany(e => e.DeliveryLogs)
                  .HasForeignKey(e => e.CommunicationLogId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure MessageAuditTrail entity
        modelBuilder.Entity<MessageAuditTrail>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MessageId).IsUnique();
            entity.HasIndex(e => e.IpAddress);
            entity.HasIndex(e => e.CreatedAt);

            // Configure one-to-one relationship with Message
            entity.HasOne(e => e.Message)
                  .WithOne(e => e.AuditTrail)
                  .HasForeignKey<MessageAuditTrail>(e => e.MessageId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure MessageEdit entity
        modelBuilder.Entity<MessageEdit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.MessageAuditTrailId);
            entity.HasIndex(e => e.EditedBy);
            entity.HasIndex(e => e.EditedAt);
            entity.HasIndex(e => new { e.MessageAuditTrailId, e.EditedAt });

            // Configure relationship with MessageAuditTrail
            entity.HasOne(e => e.MessageAuditTrail)
                  .WithMany(e => e.EditHistory)
                  .HasForeignKey(e => e.MessageAuditTrailId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Configure relationship with Editor
            entity.HasOne(e => e.Editor)
                  .WithMany()
                  .HasForeignKey(e => e.EditedBy)
                  .OnDelete(DeleteBehavior.Restrict);
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

        // Seed sample users with password hash for "password123"
        var sampleUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var financeUserId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        var adminUserId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = sampleUserId,
                Email = "director@lincolnhigh.edu",
                Name = "Jane Smith",
                Role = UserRole.Director,
                Phone = "(555) 123-4567",
                OrganizationId = sampleOrgId,
                PasswordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", // BCrypt hash of "password123"
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new User
            {
                Id = financeUserId,
                Email = "finance@lincolnhigh.edu",
                Name = "John Doe",
                Role = UserRole.Finance,
                Phone = "(555) 123-4568",
                OrganizationId = sampleOrgId,
                PasswordHash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", // BCrypt hash of "password123"
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new User
            {
                Id = adminUserId,
                Email = "admin@colorgarb.com",
                Name = "Admin User",
                Role = UserRole.ColorGarbStaff,
                Phone = "(555) 999-0000",
                OrganizationId = null, // ColorGarb staff don't belong to specific organizations
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
            CurrentStage = "ProductionPlanning",
            OriginalShipDate = shipDate,
            CurrentShipDate = shipDate,
            TotalAmount = 7500.00m,
            PaymentStatus = "Pending",
            Notes = "Historical accuracy important. Male and female period costumes needed.",
            IsActive = true,
            CreatedAt = seedDate,
            UpdatedAt = seedDate
        });

        // Seed sample stage history entries
        modelBuilder.Entity<OrderStageHistory>().HasData(
            new OrderStageHistory
            {
                Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                OrderId = sampleOrderId,
                Stage = "DesignProposal",
                EnteredAt = new DateTime(2024, 12, 31, 10, 0, 0, DateTimeKind.Utc),
                UpdatedBy = "ColorGarb Design Team",
                Notes = "Initial design concepts and artwork creation"
            },
            new OrderStageHistory
            {
                Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                OrderId = sampleOrderId,
                Stage = "ProofApproval",
                EnteredAt = new DateTime(2025, 1, 4, 14, 30, 0, DateTimeKind.Utc),
                UpdatedBy = "Band Director Johnson",
                Notes = "Client review and approval of design proof"
            },
            new OrderStageHistory
            {
                Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                OrderId = sampleOrderId,
                Stage = "Measurements",
                EnteredAt = new DateTime(2025, 1, 10, 9, 15, 0, DateTimeKind.Utc),
                UpdatedBy = "Measurements Team",
                Notes = "Collection and verification of performer measurements"
            }
        );
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
            else if (entry.Entity is OrderStageHistory stageHistory)
            {
                if (entry.State == EntityState.Added && stageHistory.EnteredAt == default)
                    stageHistory.EnteredAt = DateTime.UtcNow;
            }
            else if (entry.Entity is NotificationPreference preference)
            {
                if (entry.State == EntityState.Added)
                    preference.CreatedAt = DateTime.UtcNow;
                preference.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is EmailNotification notification)
            {
                if (entry.State == EntityState.Added)
                    notification.CreatedAt = DateTime.UtcNow;
            }
            // SMS and Phone verification tracking removed
            else if (entry.Entity is Message message)
            {
                if (entry.State == EntityState.Added)
                    message.CreatedAt = DateTime.UtcNow;
                message.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is MessageAttachment messageAttachment)
            {
                if (entry.State == EntityState.Added)
                    messageAttachment.UploadedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is CommunicationLog communicationLog)
            {
                if (entry.State == EntityState.Added)
                    communicationLog.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is NotificationDeliveryLog deliveryLog)
            {
                if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
                    deliveryLog.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is MessageAuditTrail auditTrail)
            {
                if (entry.State == EntityState.Added)
                    auditTrail.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is MessageEdit messageEdit)
            {
                if (entry.State == EntityState.Added)
                    messageEdit.EditedAt = DateTime.UtcNow;
            }
        }
    }
}