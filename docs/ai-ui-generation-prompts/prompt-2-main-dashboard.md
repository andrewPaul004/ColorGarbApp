# Prompt 2: Main Dashboard

## High-Level Goal
Create a mobile-first dashboard showing active orders with status indicators, designed for band directors to quickly assess order progress and required actions.

## Detailed Instructions
1. Create a React component named `Dashboard.tsx` with TypeScript
2. Design mobile-first layout with responsive grid for larger screens
3. Add header section with user name, organization, and logout button
4. Create order card components showing:
   - Order number and description
   - Current manufacturing stage (of 13 stages)
   - Progress indicator (visual bar or circle)
   - Next required action (if any)
   - Ship date information
5. Include notification badges for orders requiring attention
6. Add bottom navigation for mobile: Dashboard, Orders, Messages, Profile
7. Implement pull-to-refresh gesture indicator
8. Add search/filter functionality for multiple orders
9. Include empty state when no orders exist
10. Use card-based layout with subtle shadows and proper spacing
11. Ensure touch-friendly interactions (minimum 44px targets)
12. Add loading skeleton states for order cards

## Code Structure & Constraints
```typescript
// Expected data structure
interface Order {
  id: string;
  orderNumber: string;
  description: string;
  currentStage: number; // 1-13
  stageName: string;
  nextAction?: string;
  originalShipDate: string;
  currentShipDate: string;
  requiresAttention: boolean;
  organization: string;
}

// Stage names (13 total)
const stages = [
  'Design Proposal', 'Proof Approval', 'Measurements', 'Production Planning',
  'Cutting', 'Sewing', 'Quality Control', 'Finishing', 'Final Inspection',
  'Packaging', 'Shipping Preparation', 'Ship Order', 'Delivery'
];
```

**Layout Requirements:**
- Single column on mobile, 2-3 columns on tablet/desktop
- Order cards should have consistent height and visual hierarchy
- Use status badges for urgent actions
- Progressive disclosure - show more details on larger screens

## Scope
Create the Dashboard component and OrderCard sub-component. Include sample data for demonstration. Do NOT implement actual API calls or navigation routing.

---
