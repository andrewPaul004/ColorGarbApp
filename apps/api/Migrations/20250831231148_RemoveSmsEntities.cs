using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ColorGarbApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSmsEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PhoneVerifications");

            migrationBuilder.DropTable(
                name: "SmsNotifications");

            migrationBuilder.DropIndex(
                name: "IX_NotificationPreferences_PhoneNumber",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "PhoneVerificationToken",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "PhoneVerified",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "PhoneVerifiedAt",
                table: "NotificationPreferences");

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "Email", "IsActive", "LastLoginAt", "Name", "OrganizationId", "PasswordHash", "Phone", "Role", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("55555555-5555-5555-5555-555555555555"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "finance@lincolnhigh.edu", true, null, "John Doe", new Guid("11111111-1111-1111-1111-111111111111"), "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", "(555) 123-4568", "Finance", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("66666666-6666-6666-6666-666666666666"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "admin@colorgarb.com", true, null, "Admin User", null, "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", "(555) 999-0000", "ColorGarbStaff", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "NotificationPreferences",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneVerificationToken",
                table: "NotificationPreferences",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PhoneVerified",
                table: "NotificationPreferences",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PhoneVerifiedAt",
                table: "NotificationPreferences",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PhoneVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    VerificationToken = table.Column<string>(type: "nvarchar(6)", maxLength: 6, nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhoneVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PhoneVerifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SmsNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeliveryAttempts = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LastAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(1600)", maxLength: 1600, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TwilioMessageSid = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmsNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SmsNotifications_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SmsNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_PhoneNumber",
                table: "NotificationPreferences",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneVerifications_ExpiresAt",
                table: "PhoneVerifications",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneVerifications_PhoneNumber",
                table: "PhoneVerifications",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneVerifications_UserId",
                table: "PhoneVerifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PhoneVerifications_UserId_IsVerified",
                table: "PhoneVerifications",
                columns: new[] { "UserId", "IsVerified" });

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_CreatedAt",
                table: "SmsNotifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_OrderId",
                table: "SmsNotifications",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_PhoneNumber",
                table: "SmsNotifications",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_Status",
                table: "SmsNotifications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_TwilioMessageSid",
                table: "SmsNotifications",
                column: "TwilioMessageSid",
                unique: true,
                filter: "[TwilioMessageSid] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_UserId",
                table: "SmsNotifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SmsNotifications_UserId_Status",
                table: "SmsNotifications",
                columns: new[] { "UserId", "Status" });
        }
    }
}
