# Prompt 3: Order Detail Page with Timeline

## High-Level Goal
Create a comprehensive order detail page featuring a visual 13-stage timeline, order information, and tabbed navigation for different order sections.

## Detailed Instructions
1. Create a React component named `OrderDetail.tsx` with TypeScript
2. Design mobile-first with horizontal scrolling timeline on mobile, vertical on desktop
3. Create order header with:
   - Order number, description, and current stage
   - Ship date information (original vs. current)
   - Key contact and shipping details
4. Build interactive 13-stage timeline component:
   - Visual indicators for completed, current, and pending stages
   - Stage names and estimated dates
   - Clickable stages for stage details
   - Progress bar connecting stages
5. Add tabbed navigation below timeline:
   - Timeline (default), Messages, Measurements, Payments, Documents
6. Include floating action button for most common next action
7. Add breadcrumb navigation for desktop
8. Implement responsive design for mobile, tablet, desktop viewports
9. Use proper loading states and error handling
10. Include back navigation to dashboard

## Code Structure & Constraints
```typescript
interface OrderDetails {
  id: string;
  orderNumber: string;
  description: string;
  currentStage: number;
  stages: OrderStage[];
  originalShipDate: string;
  currentShipDate: string;
  shipDateHistory: ShipDateChange[];
  contactInfo: ContactInfo;
  shippingAddress: Address;
}

interface OrderStage {
  id: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  completedDate?: string;
  estimatedDate?: string;
  description: string;
}
```

**Timeline Design Requirements:**
- Use color-coded indicators (green=completed, blue=current, gray=pending)
- Connect stages with progress line
- Mobile: horizontal scroll with stage cards
- Desktop: vertical timeline with left-aligned content
- Include stage numbers and dates

## Scope
Create OrderDetail component and Timeline sub-component. Include sample order data. Do NOT implement tab content areas - focus on the timeline and layout structure.

---
