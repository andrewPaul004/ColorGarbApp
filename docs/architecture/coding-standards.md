# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define shared types in packages/shared and import consistently across frontend and backend
- **JSDoc Documentation:** All public functions, interfaces, classes, and exported components must include comprehensive JSDoc comments with @param, @returns, @throws, and @example tags
- **API Error Handling:** All API responses must use standardized error format with proper HTTP status codes and detailed error messages
- **Authentication Patterns:** Never bypass role-based authorization checks - always verify user permissions and organization access
- **Database Queries:** Use parameterized queries exclusively to prevent SQL injection, implement proper indexing for performance
- **State Management:** Frontend state updates must follow immutable patterns, backend state changes require audit trails
- **File Uploads:** All file operations must include virus scanning, size validation, and secure storage with access controls
- **Notification Delivery:** Email/SMS notifications require opt-in verification and delivery confirmation tracking
- **Payment Security:** Payment processing must never store card details, implement idempotency for transaction safety
- **Measurement Validation:** All measurement data requires range validation and approval workflows before production use
- **Organization Isolation:** Database queries must enforce row-level security to prevent cross-organization data access

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `OrderTimeline.tsx` |
| Hooks | camelCase with 'use' | - | `useOrderData.ts` |
| Services | camelCase | PascalCase | `orderService.ts` / `OrderService.cs` |
| API Routes | kebab-case | kebab-case | `/api/order-measurements` |
| Database Tables | - | PascalCase | `OrderStageHistory` |
| Database Columns | - | PascalCase | `CreatedAt`, `OrganizationId` |
| Constants | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `ORDER_STAGES`, `MAX_FILE_SIZE` |
| Environment Variables | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `STRIPE_SECRET_KEY` |

## JSDoc Documentation Standards

All public functions, interfaces, classes, and exported components must include comprehensive JSDoc documentation. This ensures code maintainability and provides excellent IntelliSense support for development teams.

### Required JSDoc Tags

- `@param` - Document all function parameters with type and description
- `@returns` - Document return value type and description
- `@throws` - Document any exceptions that may be thrown
- `@example` - Provide usage examples for complex functions
- `@since` - Version when the function was added (for major features)
- `@deprecated` - Mark deprecated functions with migration guidance

### TypeScript Interface Documentation

```typescript
/**
 * Represents a costume order through the complete manufacturing process.
 * Includes timeline tracking, measurement data, and payment information.
 * 
 * @interface Order
 * @since 1.0.0
 */
interface Order {
  /** Unique identifier for the order */
  id: string;
  
  /** Human-readable order number (e.g., "CG-2023-001") */
  orderNumber: string;
  
  /** ID of the client organization that owns this order */
  organizationId: string;
  
  /** Brief description of the costume order */
  description: string;
  
  /** Current stage in the 13-step manufacturing process */
  currentStage: OrderStage;
  
  /** Original promised ship date */
  originalShipDate: Date;
  
  /** Current ship date (may be revised) */
  currentShipDate: Date;
}
```

### React Component Documentation

```typescript
/**
 * Displays the 13-stage manufacturing timeline for a costume order.
 * Shows current progress, completed stages, and upcoming milestones.
 * 
 * @component
 * @param {OrderTimelineProps} props - Component props
 * @returns {JSX.Element} Timeline visualization component
 * 
 * @example
 * ```tsx
 * <OrderTimeline
 *   orderId="12345"
 *   currentStage="Measurements"
 *   stageHistory={historyData}
 *   onStageClick={handleStageClick}
 * />
 * ```
 * 
 * @since 1.0.0
 */
export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  orderId,
  currentStage,
  stageHistory,
  onStageClick
}) => {
  // Component implementation
};
```

### Service Function Documentation

```typescript
/**
 * Submits performer measurements for a specific order.
 * Validates measurement ranges and triggers approval workflow.
 * 
 * @param {string} orderId - Unique identifier of the order
 * @param {MeasurementSubmission[]} measurements - Array of performer measurements
 * @returns {Promise<MeasurementResult>} Result containing validation status and any errors
 * 
 * @throws {ValidationError} When measurements are outside acceptable ranges
 * @throws {AuthorizationError} When user lacks permission to submit measurements
 * @throws {OrderNotFoundError} When the specified order doesn't exist
 * 
 * @example
 * ```typescript
 * const measurements = [
 *   { performerName: "John Doe", measurements: { chest: 36, waist: 32 } }
 * ];
 * 
 * try {
 *   const result = await submitMeasurements("order-123", measurements);
 *   console.log("Measurements submitted:", result.submittedCount);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error("Invalid measurements:", error.details);
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 */
export async function submitMeasurements(
  orderId: string,
  measurements: MeasurementSubmission[]
): Promise<MeasurementResult> {
  // Function implementation
}
```

### Custom Hook Documentation

```typescript
/**
 * Custom hook for managing order data and operations.
 * Provides CRUD operations, caching, and real-time updates.
 * 
 * @param {string} organizationId - ID of the organization to fetch orders for
 * @returns {UseOrdersResult} Object containing orders data and management functions
 * 
 * @example
 * ```typescript
 * const { orders, loading, error, refreshOrders, updateOrderStage } = useOrders(orgId);
 * 
 * // Display orders
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * // Update order stage
 * await updateOrderStage("order-123", "ProductionPlanning");
 * ```
 * 
 * @since 1.0.0
 */
export const useOrders = (organizationId: string): UseOrdersResult => {
  // Hook implementation
};
```

### API Controller Documentation (C#)

```csharp
/// <summary>
/// Updates the manufacturing stage of a specific order.
/// Only ColorGarb staff members can perform this operation.
/// Triggers automatic notifications to the client organization.
/// </summary>
/// <param name="orderId">Unique identifier of the order to update</param>
/// <param name="request">Stage update details including new stage and optional ship date</param>
/// <returns>No content on successful update</returns>
/// <response code="204">Order stage updated successfully</response>
/// <response code="400">Invalid stage transition or missing required data</response>
/// <response code="403">User lacks ColorGarb staff permissions</response>
/// <response code="404">Order not found</response>
/// <exception cref="ValidationException">Thrown when stage transition is invalid</exception>
/// <exception cref="OrderNotFoundException">Thrown when order doesn't exist</exception>
[HttpPatch("{orderId:guid}")]
[Authorize(Roles = "ColorGarbStaff")]
[ProducesResponseType(StatusCodes.Status204NoContent)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> UpdateOrderStage(
    Guid orderId, 
    [FromBody] UpdateOrderStageRequest request)
{
    // Method implementation
}
```
