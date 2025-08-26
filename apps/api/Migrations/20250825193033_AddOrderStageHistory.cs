using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ColorGarbApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderStageHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrderStageHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Stage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EnteredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PreviousShipDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NewShipDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ChangeReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStageHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStageHistory_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "OrderStageHistory",
                columns: new[] { "Id", "ChangeReason", "EnteredAt", "NewShipDate", "Notes", "OrderId", "PreviousShipDate", "Stage", "UpdatedBy" },
                values: new object[,]
                {
                    { new Guid("44444444-4444-4444-4444-444444444444"), null, new DateTime(2024, 12, 31, 10, 0, 0, 0, DateTimeKind.Utc), null, "Initial design concepts and artwork creation", new Guid("33333333-3333-3333-3333-333333333333"), null, "DesignProposal", "ColorGarb Design Team" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), null, new DateTime(2025, 1, 4, 14, 30, 0, 0, DateTimeKind.Utc), null, "Client review and approval of design proof", new Guid("33333333-3333-3333-3333-333333333333"), null, "ProofApproval", "Band Director Johnson" },
                    { new Guid("66666666-6666-6666-6666-666666666666"), null, new DateTime(2025, 1, 10, 9, 15, 0, 0, DateTimeKind.Utc), null, "Collection and verification of performer measurements", new Guid("33333333-3333-3333-3333-333333333333"), null, "Measurements", "Measurements Team" }
                });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CurrentStage",
                value: "ProductionPlanning");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStageHistory_EnteredAt",
                table: "OrderStageHistory",
                column: "EnteredAt");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStageHistory_OrderId",
                table: "OrderStageHistory",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStageHistory_OrderId_EnteredAt",
                table: "OrderStageHistory",
                columns: new[] { "OrderId", "EnteredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderStageHistory_Stage",
                table: "OrderStageHistory",
                column: "Stage");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderStageHistory");

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "CurrentStage",
                value: "Initial Consultation");
        }
    }
}
