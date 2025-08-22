# Prompt 1: Login Screen

## High-Level Goal
Create a mobile-first, secure login screen for the ColorGarb Client Portal with organization-based authentication and ColorGarb branding.

## Detailed Instructions
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

## Code Structure & Constraints
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

## Scope
Create ONLY the LoginScreen component. Do NOT create routing, API integration, or state management. Focus on the UI/UX and form validation structure.

---
