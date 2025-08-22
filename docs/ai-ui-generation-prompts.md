# ColorGarb Client Portal - AI UI Generation Prompts

*Generated for use with v0, Lovable, or similar AI frontend generation tools*

## Project Context

**Project:** ColorGarb Client Portal - Custom costume manufacturing client portal  
**Tech Stack:** React + TypeScript, Tailwind CSS, Mobile-first responsive design  
**Design System:** Custom components based on Material Design principles  
**Target Users:** Band directors (mobile-heavy), finance users, ColorGarb staff

**Color Palette:**
- Primary: #1B365D (header backgrounds, primary buttons)
- Secondary: #4A90B8 (links, secondary actions)
- Accent: #F39C12 (notifications, warnings)
- Success: #27AE60, Warning: #F39C12, Error: #E74C3C
- Neutrals: #34495E, #7F8C8D, #BDC3C7, #ECF0F1

**Typography:** Inter font family, 16px base font size, mobile-optimized spacing

---

## Prompt 1: Login Screen

### High-Level Goal
Create a mobile-first, secure login screen for the ColorGarb Client Portal with organization-based authentication and ColorGarb branding.

### Detailed Instructions
1. Create a React component named `LoginScreen.tsx` with TypeScript
2. Design for mobile-first (320px+) with responsive scaling
3. Include ColorGarb logo placeholder at the top (use a placeholder rectangle)
4. Add email input field with proper validation (email format)
5. Add password input field with show/hide toggle
6. Include "Remember Me" checkbox below password field
7. Add primary login button with loading state capability
8. Include "Forgot Password?" link below the form
9. Use Tailwind CSS for all styling following the color palette above
10. Implement form validation with error states and messaging
11. Add subtle shadow and rounded corners for modern appearance
12. Ensure 44px minimum touch targets for mobile accessibility

### Code Structure & Constraints
```typescript
// Expected TypeScript interface
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Color classes to use
const colors = {
  primary: 'bg-[#1B365D]',
  secondary: 'bg-[#4A90B8]', 
  accent: 'bg-[#F39C12]',
  error: 'text-[#E74C3C]'
}
```

**Styling Requirements:**
- Use Inter font family (font-sans in Tailwind)
- Mobile-first responsive design
- 8px base spacing grid (space-2, space-4, space-6, etc.)
- Form should be centered and max-width of 400px
- Include hover and focus states for interactive elements

### Scope
Create ONLY the LoginScreen component. Do NOT create routing, API integration, or state management. Focus on the UI/UX and form validation structure.

---

## Prompt 2: Main Dashboard

### High-Level Goal
Create a mobile-first dashboard showing active orders with status indicators, designed for band directors to quickly assess order progress and required actions.

### Detailed Instructions
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

### Code Structure & Constraints
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

### Scope
Create the Dashboard component and OrderCard sub-component. Include sample data for demonstration. Do NOT implement actual API calls or navigation routing.

---

## Prompt 3: Order Detail Page with Timeline

### High-Level Goal
Create a comprehensive order detail page featuring a visual 13-stage timeline, order information, and tabbed navigation for different order sections.

### Detailed Instructions
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

### Code Structure & Constraints
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

### Scope
Create OrderDetail component and Timeline sub-component. Include sample order data. Do NOT implement tab content areas - focus on the timeline and layout structure.

---

## Prompt 4: Timeline Component (Standalone)

### High-Level Goal
Create a reusable, responsive timeline component that visualizes the 13-stage costume manufacturing process with progress indicators and interactive features.

### Detailed Instructions
1. Create a React component named `Timeline.tsx` with TypeScript
2. Design for mobile-first with responsive behavior:
   - Mobile: Horizontal scrolling timeline with cards
   - Desktop: Vertical timeline with connected progress line
3. Support three stage states: completed, current, pending
4. Include visual elements:
   - Stage number indicators (circles with numbers)
   - Stage names and descriptions
   - Progress connecting line between stages
   - Date information (completed/estimated)
5. Add interactive features:
   - Click/tap to view stage details
   - Current stage highlighting
   - Smooth scrolling to current stage on load
6. Implement responsive breakpoints for layout changes
7. Add loading and error states
8. Include accessibility features (ARIA labels, keyboard navigation)
9. Use consistent spacing and typography from design system
10. Add subtle animations for stage progression

### Code Structure & Constraints
```typescript
interface TimelineProps {
  stages: TimelineStage[];
  currentStage: number;
  onStageClick?: (stageId: number) => void;
  variant?: 'horizontal' | 'vertical' | 'auto';
}

interface TimelineStage {
  id: number;
  name: string;
  status: 'completed' | 'current' | 'pending' | 'delayed';
  completedDate?: string;
  estimatedDate?: string;
  description?: string;
  icon?: string;
}

// Visual design constants
const stageStyles = {
  completed: 'bg-[#27AE60] text-white',
  current: 'bg-[#4A90B8] text-white animate-pulse',
  pending: 'bg-[#BDC3C7] text-[#34495E]',
  delayed: 'bg-[#E74C3C] text-white'
};
```

**Responsive Behavior:**
- Mobile (< 768px): Horizontal scroll, compact cards
- Tablet (768px-1023px): Hybrid layout with larger touch targets
- Desktop (1024px+): Vertical timeline with full details

### Scope
Create a standalone Timeline component that can be imported and used in other components. Include comprehensive prop interface and sample data for testing.

---

## Prompt 5: Measurement Collection Form

### High-Level Goal
Create a mobile-optimized measurement collection interface with both individual entry and bulk upload capabilities, featuring validation and progress tracking.

### Detailed Instructions
1. Create a React component named `MeasurementCollection.tsx` with TypeScript
2. Design mobile-first form interface with two modes:
   - Individual performer entry mode
   - Bulk CSV upload mode
3. Individual mode features:
   - Performer name input
   - Dynamic measurement fields (chest, waist, height, etc.)
   - Numeric input validation with acceptable ranges
   - Save draft functionality
   - Progress indicator showing completion
4. Bulk upload mode features:
   - CSV template download link
   - File drop zone for upload
   - Data preview table before submission
   - Error validation and correction interface
5. Include form validation:
   - Required field indicators
   - Measurement range validation
   - Error messaging with correction guidance
   - Success confirmation states
6. Add mobile-optimized features:
   - Numeric keypad for measurement inputs
   - Touch-friendly buttons and controls
   - Swipe navigation between performers
7. Implement responsive design for larger screens
8. Include accessibility features and proper form labeling

### Code Structure & Constraints
```typescript
interface MeasurementData {
  performerName: string;
  measurements: {
    chest: number;
    waist: number;
    height: number;
    inseam: number;
    shoulderWidth: number;
    armLength: number;
  };
  notes?: string;
}

interface ValidationRules {
  field: string;
  min: number;
  max: number;
  unit: string;
  required: boolean;
}

// Measurement validation ranges
const measurementRules: ValidationRules[] = [
  { field: 'chest', min: 20, max: 60, unit: 'inches', required: true },
  { field: 'waist', min: 18, max: 55, unit: 'inches', required: true },
  { field: 'height', min: 36, max: 84, unit: 'inches', required: true },
  // ... etc
];
```

**Form Design Requirements:**
- Use input type="number" with step="0.5" for measurements
- Include measurement guide/help text
- Show progress indicator (X of Y performers completed)
- Use consistent error styling across all validation

### Scope
Create MeasurementCollection component with both individual and bulk upload modes. Include form validation logic and sample data. Do NOT implement actual file upload or API submission.

---

## Usage Instructions

1. **Copy the desired prompt** from the sections above
2. **Paste into your AI tool** (v0, Lovable, etc.)
3. **Provide additional context** if needed:
   - Existing code snippets
   - Specific design preferences
   - Integration requirements
4. **Iterate and refine** - start with basic structure, then enhance
5. **Test thoroughly** - all AI-generated code requires human review

## Important Notes

⚠️ **All AI-generated code will require careful human review, testing, and refinement to be considered production-ready.**

- **Accessibility:** Ensure WCAG AA compliance through manual testing
- **Performance:** Optimize images, animations, and component rendering
- **Security:** Validate all form inputs and API integrations
- **Cross-browser:** Test across different browsers and devices
- **Integration:** Ensure components work with your existing codebase

## Next Steps

After generating components with AI tools:
1. **Review and test** all generated code
2. **Integrate** with your existing React application
3. **Add API connections** for data fetching
4. **Implement routing** between components
5. **Add state management** (Redux, Context, etc.)
6. **Conduct user testing** with actual band directors and finance users