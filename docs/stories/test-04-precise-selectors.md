# Story Test-04: Update Page Object Models with Precise Selectors

**Title**: Replace Broad CSS Selectors with Specific Element Targeting

## User Story
As a Test Automation Engineer, I want Page Object Models to use precise, unique selectors so that tests reliably target the correct elements without ambiguity.

## Priority
**High**

## Effort Estimate
8 story points

## Dependencies
- Story Test-02 (data-testid implementation)

## Acceptance Criteria
- All broad CSS selectors replaced with specific targeting
- No test failures due to multiple element matches
- Selectors are maintainable and descriptive
- Page Object Models use defensive selector strategies
- Element targeting is consistent across all test files

## Technical Requirements
- Replace broad selectors like `.MuiButton-root` with specific targeting
- Implement hierarchical selector strategies for complex components
- Add unique identifiers where data-testid is not available
- Update all Page Object Model selector methods
- Create selector best practices documentation
- Add selector validation utilities

## Current Issue
Tests fail because broad CSS selectors match multiple elements on the page, causing "Multiple elements found" errors.

## Problematic Selectors to Fix

### DashboardPage.ts
```typescript
// BEFORE (problematic)
summaryCards: '.MuiGrid-container >> .MuiPaper-root', // Matches multiple papers
orderCards: '.MuiCard-root', // Matches all cards on page

// AFTER (specific)
totalOrdersCard: '[data-testid="total-orders-card"]',
activeOrdersCard: '[data-testid="active-orders-card"]',
orderCard: '[data-testid="order-card"]',
```

### LoginPage.ts
```typescript
// BEFORE (broad)
signInButton: 'button[type="button"]:has-text("Sign In")',

// AFTER (specific)
signInButton: '[data-testid="sign-in-button"]',
```

### OrderDetailPage.ts
```typescript
// BEFORE (ambiguous)
orderSummarySection: '.MuiPaper-root', // Multiple papers exist

// AFTER (specific)
orderSummarySection: '[data-testid="order-summary-section"]',
```

## Selector Strategy Guidelines
1. **Primary**: Use data-testid attributes when available
2. **Secondary**: Use specific text content with has-text()
3. **Tertiary**: Use hierarchical CSS selectors with proper scoping
4. **Avoid**: Broad CSS class selectors that match multiple elements

## Files to Update
- `tests/page-objects/LoginPage.ts`
- `tests/page-objects/DashboardPage.ts`
- `tests/page-objects/OrderDetailPage.ts`
- `tests/page-objects/BasePage.ts`

## Defensive Selector Patterns
```typescript
// Use specific scoping to avoid ambiguity
summarySection: '[data-testid="dashboard-summary"] .MuiPaper-root',

// Use text content for unique identification
createOrderButton: 'button:has-text("Create New Order")',

// Use hierarchical targeting
orderCard: '[data-testid="orders-grid"] .MuiCard-root',
```

## Testing Validation
- Add selector validation utilities to ensure uniqueness
- Implement selector testing in Page Object constructors
- Create selector debugging helpers for troubleshooting

## Documentation to Create
- Selector best practices guide
- Troubleshooting guide for common selector issues
- Page Object Model maintenance guidelines

## Success Criteria
- Zero "multiple elements found" test failures
- All selectors target exactly one element when expected
- Selectors are maintainable and readable
- Test execution is more reliable and predictable

## Story Status
**TODO**