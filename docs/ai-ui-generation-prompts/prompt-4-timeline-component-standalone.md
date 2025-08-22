# Prompt 4: Timeline Component (Standalone)

## High-Level Goal
Create a reusable, responsive timeline component that visualizes the 13-stage costume manufacturing process with progress indicators and interactive features.

## Detailed Instructions
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

## Code Structure & Constraints
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

## Scope
Create a standalone Timeline component that can be imported and used in other components. Include comprehensive prop interface and sample data for testing.

---
