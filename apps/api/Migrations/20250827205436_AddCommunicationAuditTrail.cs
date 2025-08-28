using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColorGarbApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunicationAuditTrail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommunicationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommunicationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecipientId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecipientEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    RecipientPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(10000)", maxLength: 10000, nullable: false),
                    TemplateUsed = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DeliveryStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ExternalMessageId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FailureReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunicationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Users_RecipientId",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CommunicationLogs_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MessageAuditTrails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageAuditTrails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageAuditTrails_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveryLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommunicationLogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveryProvider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ExternalId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StatusDetails = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WebhookData = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveryLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveryLogs_CommunicationLogs_CommunicationLogId",
                        column: x => x.CommunicationLogId,
                        principalTable: "CommunicationLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MessageEdits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageAuditTrailId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EditedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EditedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousContent = table.Column<string>(type: "nvarchar(max)", maxLength: 5000, nullable: false),
                    ChangeReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageEdits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageEdits_MessageAuditTrails_MessageAuditTrailId",
                        column: x => x.MessageAuditTrailId,
                        principalTable: "MessageAuditTrails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageEdits_Users_EditedBy",
                        column: x => x.EditedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_CommunicationType",
                table: "CommunicationLogs",
                column: "CommunicationType");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_CommunicationType_DeliveryStatus",
                table: "CommunicationLogs",
                columns: new[] { "CommunicationType", "DeliveryStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_Content",
                table: "CommunicationLogs",
                column: "Content");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_DeliveredAt",
                table: "CommunicationLogs",
                column: "DeliveredAt");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_DeliveryStatus",
                table: "CommunicationLogs",
                column: "DeliveryStatus");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_ExternalMessageId",
                table: "CommunicationLogs",
                column: "ExternalMessageId",
                unique: true,
                filter: "[ExternalMessageId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_MessageId",
                table: "CommunicationLogs",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_OrderId",
                table: "CommunicationLogs",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_OrderId_SentAt",
                table: "CommunicationLogs",
                columns: new[] { "OrderId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_ReadAt",
                table: "CommunicationLogs",
                column: "ReadAt");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_RecipientEmail",
                table: "CommunicationLogs",
                column: "RecipientEmail");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_RecipientId",
                table: "CommunicationLogs",
                column: "RecipientId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_RecipientPhone",
                table: "CommunicationLogs",
                column: "RecipientPhone");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_SenderId",
                table: "CommunicationLogs",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_SenderId_SentAt",
                table: "CommunicationLogs",
                columns: new[] { "SenderId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_SentAt",
                table: "CommunicationLogs",
                column: "SentAt");

            migrationBuilder.CreateIndex(
                name: "IX_CommunicationLogs_Subject",
                table: "CommunicationLogs",
                column: "Subject");

            migrationBuilder.CreateIndex(
                name: "IX_MessageAuditTrails_CreatedAt",
                table: "MessageAuditTrails",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MessageAuditTrails_IpAddress",
                table: "MessageAuditTrails",
                column: "IpAddress");

            migrationBuilder.CreateIndex(
                name: "IX_MessageAuditTrails_MessageId",
                table: "MessageAuditTrails",
                column: "MessageId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MessageEdits_EditedAt",
                table: "MessageEdits",
                column: "EditedAt");

            migrationBuilder.CreateIndex(
                name: "IX_MessageEdits_EditedBy",
                table: "MessageEdits",
                column: "EditedBy");

            migrationBuilder.CreateIndex(
                name: "IX_MessageEdits_MessageAuditTrailId",
                table: "MessageEdits",
                column: "MessageAuditTrailId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageEdits_MessageAuditTrailId_EditedAt",
                table: "MessageEdits",
                columns: new[] { "MessageAuditTrailId", "EditedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_CommunicationLogId",
                table: "NotificationDeliveryLogs",
                column: "CommunicationLogId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_CommunicationLogId_UpdatedAt",
                table: "NotificationDeliveryLogs",
                columns: new[] { "CommunicationLogId", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_DeliveryProvider",
                table: "NotificationDeliveryLogs",
                column: "DeliveryProvider");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_DeliveryProvider_Status",
                table: "NotificationDeliveryLogs",
                columns: new[] { "DeliveryProvider", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_ExternalId",
                table: "NotificationDeliveryLogs",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_Status",
                table: "NotificationDeliveryLogs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveryLogs_UpdatedAt",
                table: "NotificationDeliveryLogs",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MessageEdits");

            migrationBuilder.DropTable(
                name: "NotificationDeliveryLogs");

            migrationBuilder.DropTable(
                name: "MessageAuditTrails");

            migrationBuilder.DropTable(
                name: "CommunicationLogs");
        }
    }
}
