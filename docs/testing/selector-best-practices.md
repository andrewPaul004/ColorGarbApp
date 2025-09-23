# Page Object Model Selector Best Practices

## Overview

This guide provides best practices for creating reliable, maintainable selectors in Playwright Page Object Models for the ColorGarb application.

## Selector Strategy Priority

### 1. Primary: data-testid Attributes ✅
Use `data-testid` attributes for reliable element targeting that's independent of implementation details.

```typescript
// ✅ GOOD - Specific and reliable
emailInput: '[data-testid="email-input"]',
loginButton: '[data-testid="login-submit-button"]',
totalOrdersCard: '[data-testid="total-orders-card"]',
```

### 2. Secondary: Text Content Selectors
Use specific text content with `has-text()` for unique elements.

```typescript
// ✅ GOOD - Specific text targeting
createOrderButton: 'button:has-text("Create New Order")',
stageTitle: 'h2:has-text("Manufacturing Progress")',
```

### 3. Tertiary: Hierarchical CSS Selectors
Use scoped CSS selectors with proper parent-child relationships.

```typescript
// ✅ GOOD - Properly scoped
summaryCard: '[data-testid="dashboard-summary"] .MuiPaper-root',
orderCard: '[data-testid="orders-grid"] .MuiCard-root',
```

## Anti-Patterns to Avoid

### ❌ Broad CSS Class Selectors
```typescript
// ❌ BAD - Matches multiple elements
orderCards: '.MuiCard-root',
buttons: '.MuiButton-root',
papers: '.MuiPaper-root',
```

### ❌ Generic Element Selectors
```typescript
// ❌ BAD - Too generic
allButtons: 'button',
allInputs: 'input',
allDivs: 'div',
```

### ❌ Index-Based Selectors
```typescript
// ❌ BAD - Fragile, depends on DOM order
firstCard: '.MuiCard-root:first-child',
thirdButton: 'button:nth-child(3)',
```

## Defensive Selector Patterns

### Using Scoped Containers
```typescript
// ✅ GOOD - Scoped to specific sections
private selectors = {
  // Dashboard specific
  dashboardSummary: '[data-testid="dashboard-summary"]',
  totalOrdersCard: '[data-testid="dashboard-summary"] [data-testid="total-orders-card"]',

  // Order detail specific
  orderHeader: '[data-testid="order-header"]',
  orderTitle: '[data-testid="order-header"] h1',
};
```

### Text Content Targeting
```typescript
// ✅ GOOD - Using specific text content
private selectors = {
  // Login page
  forgotPasswordLink: 'button:has-text("Forgot your password?")',

  // Dashboard
  createOrderButton: 'button:has-text("Create New Order")',

  // Order detail
  backToDashboard: '.MuiBreadcrumbs-root a:has-text("Dashboard")',
};
```

### Combinatorial Selectors
```typescript
// ✅ GOOD - Combining attributes for specificity
private selectors = {
  // Form specific
  emailField: 'input[type="email"][name="email"]',
  submitButton: 'button[type="submit"]:has-text("Sign In")',

  // State specific
  activeOrderCard: '[data-testid="order-card"][data-status="active"]',
  errorAlert: '.MuiAlert-root[data-severity="error"]',
};
```

## Component-Specific Guidelines

### Form Components
```typescript
private formSelectors = {
  // Use data-testid for inputs
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',

  // Use specific button text
  submitButton: '[data-testid="login-submit-button"]',

  // Use alert data-testid
  errorAlert: '[data-testid="login-error-alert"]',
};
```

### Navigation Components
```typescript
private navigationSelectors = {
  // Use specific menu items
  dashboardLink: '[data-testid="nav-dashboard"]',
  ordersLink: '[data-testid="nav-orders"]',

  // Use breadcrumb text
  breadcrumbHome: '.MuiBreadcrumbs-root a:has-text("Dashboard")',
};
```

### Data Display Components
```typescript
private dataSelectors = {
  // Use data-testid for cards
  summaryCards: '[data-testid*="-card"]',
  totalOrdersCard: '[data-testid="total-orders-card"]',

  // Use specific table cells
  orderRow: '[data-testid="order-row"]',
  orderNumber: '[data-testid="order-number"]',
};
```

## Selector Testing and Validation

### In Page Object Constructors
```typescript
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.validateSelectors();
  }

  private async validateSelectors(): Promise<void> {
    // Validate critical selectors exist and are unique
    const criticalSelectors = [
      this.selectors.emailInput,
      this.selectors.passwordInput,
      this.selectors.loginButton
    ];

    for (const selector of criticalSelectors) {
      const count = await this.page.locator(selector).count();
      if (count === 0) {
        console.warn(`Selector not found: ${selector}`);
      } else if (count > 1) {
        console.warn(`Multiple elements found for selector: ${selector} (${count})`);
      }
    }
  }
}
```

### Selector Debugging Utilities
```typescript
export class BasePage {
  /**
   * Debug selector by showing all matching elements
   */
  async debugSelector(selector: string): Promise<void> {
    const elements = await this.page.locator(selector).all();
    console.log(`Selector "${selector}" matches ${elements.length} elements:`);

    for (let i = 0; i < elements.length; i++) {
      const text = await elements[i].textContent();
      const classes = await elements[i].getAttribute('class');
      console.log(`  ${i + 1}. Text: "${text}" Classes: "${classes}"`);
    }
  }

  /**
   * Verify selector is unique
   */
  async verifySelectorUniqueness(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count === 1;
  }
}
```

## Maintenance Guidelines

### Regular Selector Audits
1. Review selectors quarterly for reliability
2. Update selectors when components change
3. Replace broad selectors with specific ones
4. Add data-testid attributes for new components

### Documentation Updates
1. Document selector strategy decisions
2. Maintain this guide with new patterns
3. Share selector updates with team
4. Create migration guides for major changes

### Performance Considerations
1. Prefer single selectors over complex hierarchies
2. Use fast selectors (id, data-testid) over slow ones (text content)
3. Avoid xpath when possible
4. Cache frequently used locators

## Migration Examples

### Before: Broad Selectors
```typescript
// ❌ Problematic selectors
private selectors = {
  orderCards: '.MuiCard-root',
  buttons: 'button',
  forms: '.MuiPaper-root',
  inputs: '.MuiTextField-root input',
};
```

### After: Specific Selectors
```typescript
// ✅ Improved selectors
private selectors = {
  orderCard: '[data-testid="order-card"]',
  createOrderButton: '[data-testid="create-order-button"]',
  loginForm: '[data-testid="login-form"]',
  emailInput: '[data-testid="email-input"]',
};
```

## Testing Selector Reliability

### Automated Selector Tests
```typescript
test('verify selector uniqueness', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Verify critical selectors are unique
  expect(await page.locator('[data-testid="email-input"]').count()).toBe(1);
  expect(await page.locator('[data-testid="password-input"]').count()).toBe(1);
  expect(await page.locator('[data-testid="login-submit-button"]').count()).toBe(1);
});
```

This guide ensures reliable, maintainable test automation through proper selector strategies.