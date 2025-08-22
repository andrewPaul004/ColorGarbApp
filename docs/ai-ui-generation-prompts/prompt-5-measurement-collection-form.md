# Prompt 5: Measurement Collection Form

## High-Level Goal
Create a mobile-optimized measurement collection interface with both individual entry and bulk upload capabilities, featuring validation and progress tracking.

## Detailed Instructions
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

## Code Structure & Constraints
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

## Scope
Create MeasurementCollection component with both individual and bulk upload modes. Include form validation logic and sample data. Do NOT implement actual file upload or API submission.

---
