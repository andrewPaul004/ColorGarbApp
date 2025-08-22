using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColorGarbApi.Migrations
{
    /// <inheritdoc />
    public partial class FixSeedDataAndPasswordHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "CurrentShipDate", "OriginalShipDate", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 4, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 4, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Organizations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "PasswordHash", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKXhK9Pq3qKwP0O", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
    }
}
