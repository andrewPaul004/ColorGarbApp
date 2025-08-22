using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColorGarbApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordHashToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "Users",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "CurrentShipDate", "OriginalShipDate", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 14, 36, 51, 151, DateTimeKind.Utc).AddTicks(3117), new DateTime(2025, 11, 20, 14, 36, 51, 151, DateTimeKind.Utc).AddTicks(2363), new DateTime(2025, 11, 20, 14, 36, 51, 151, DateTimeKind.Utc).AddTicks(1975), new DateTime(2025, 8, 22, 14, 36, 51, 151, DateTimeKind.Utc).AddTicks(3232) });

            migrationBuilder.UpdateData(
                table: "Organizations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 14, 36, 51, 149, DateTimeKind.Utc).AddTicks(156), new DateTime(2025, 8, 22, 14, 36, 51, 149, DateTimeKind.Utc).AddTicks(684) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 14, 36, 51, 150, DateTimeKind.Utc).AddTicks(9222), "", new DateTime(2025, 8, 22, 14, 36, 51, 150, DateTimeKind.Utc).AddTicks(9362) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "CurrentShipDate", "OriginalShipDate", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 2, 59, 14, 451, DateTimeKind.Utc).AddTicks(5245), new DateTime(2025, 11, 20, 2, 59, 14, 450, DateTimeKind.Utc).AddTicks(7414), new DateTime(2025, 11, 20, 2, 59, 14, 450, DateTimeKind.Utc).AddTicks(2564), new DateTime(2025, 8, 22, 2, 59, 14, 451, DateTimeKind.Utc).AddTicks(6003) });

            migrationBuilder.UpdateData(
                table: "Organizations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 2, 59, 14, 445, DateTimeKind.Utc).AddTicks(6232), new DateTime(2025, 8, 22, 2, 59, 14, 445, DateTimeKind.Utc).AddTicks(6510) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 8, 22, 2, 59, 14, 448, DateTimeKind.Utc).AddTicks(7755), new DateTime(2025, 8, 22, 2, 59, 14, 448, DateTimeKind.Utc).AddTicks(9676) });
        }
    }
}
