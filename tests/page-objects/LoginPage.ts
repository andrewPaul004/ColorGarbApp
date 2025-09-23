import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Login page
 * Handles authentication flows, validation, and error states
 *
 * @class LoginPage
 * @extends BasePage
 * @since 3.0.0
 */
export class LoginPage extends BasePage {
  // Page-specific selectors - Updated to use data-testid attributes
  private selectors = {
    // Form elements - using data-testid for reliable element targeting
    emailInput: '[data-testid="email-input"]', // Email input field
    passwordInput: '[data-testid="password-input"]', // Password input field
    signInButton: '[data-testid="login-submit-button"]', // Sign in button
    forgotPasswordLink: '[data-testid="forgot-password-link"]', // Forgot password link

    // Validation errors - Alert component with data-testid
    errorAlert: '[data-testid="login-error-alert"]', // Error alert component

    // Form container - Card component
    loginForm: '.MuiCard-root', // Material-UI Card containing the form

    // Page elements
    pageTitle: 'h1', // Typography component h1
    subtitle: 'text=Sign in to access your costume orders', // Subtitle text

    // Loading states - CircularProgress in button
    loginLoadingSpinner: '.MuiCircularProgress-root',
    loadingText: 'text=Signing in...',

    // Links
    supportLink: 'a[href="mailto:support@colorgarb.com"]',
  };

  // Form locators
  get emailInput(): Locator { return this.page.locator(this.selectors.emailInput); }
  get passwordInput(): Locator { return this.page.locator(this.selectors.passwordInput); }
  get signInButton(): Locator { return this.page.locator(this.selectors.signInButton); }
  get forgotPasswordLink(): Locator { return this.page.locator(this.selectors.forgotPasswordLink); }
  get loginForm(): Locator { return this.page.locator(this.selectors.loginForm); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto(`${this.baseURL}/auth/login`);
    await this.waitForPageLoad();
  }

  /**
   * Verify the login page is displayed correctly
   */
  async verifyPageDisplay(): Promise<void> {
    // Check page title - matches actual HTML title
    await expect(this.page).toHaveTitle('Vite + React + TS');

    // Check main heading
    const heading = this.page.locator(this.selectors.pageTitle);
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/ColorGarb.*Portal/i);

    // Check form elements are present
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.forgotPasswordLink).toBeVisible();

    // Verify form has proper structure
    await expect(this.loginForm).toBeVisible();
  }

  /**
   * Fill in email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillField(this.selectors.emailInput, email);
  }

  /**
   * Fill in password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillField(this.selectors.passwordInput, password);
  }

  /**
   * Click the sign in button
   */
  async clickSignIn(): Promise<void> {
    await this.clickElement(this.selectors.signInButton);
  }

  /**
   * Click the forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSignIn();
  }

  /**
   * Perform login and wait for successful redirect
   */
  async loginAndWaitForRedirect(email: string, password: string, expectedUrl?: string): Promise<void> {
    await this.login(email, password);

    // Wait for redirect based on user role
    if (expectedUrl) {
      await this.page.waitForURL(expectedUrl);
    } else {
      // Wait for any dashboard redirect
      await this.page.waitForURL(/\/(dashboard|admin\/dashboard)/);
    }

    await this.waitForPageLoad();
  }

  /**
   * Get validation error from Alert component
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator(this.selectors.errorAlert);
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Check if email field has error state
   */
  async hasEmailError(): Promise<boolean> {
    const emailField = this.emailInput;
    const hasErrorClass = await emailField.locator('..').locator('.Mui-error').isVisible();
    return hasErrorClass;
  }

  /**
   * Check if password field has error state
   */
  async hasPasswordError(): Promise<boolean> {
    const passwordField = this.passwordInput;
    const hasErrorClass = await passwordField.locator('..').locator('.Mui-error').isVisible();
    return hasErrorClass;
  }

  /**
   * Check if form is in loading state
   */
  async isLoading(): Promise<boolean> {
    const loadingSpinner = this.page.locator(this.selectors.loginLoadingSpinner);
    const isSpinnerVisible = await loadingSpinner.isVisible();

    const isButtonDisabled = await this.signInButton.isDisabled();

    return isSpinnerVisible || isButtonDisabled;
  }

  /**
   * Verify form field properties for accessibility
   */
  async verifyAccessibilityProperties(): Promise<void> {
    // Email field
    await expect(this.emailInput).toHaveAttribute('type', 'email');
    await expect(this.emailInput).toHaveAttribute('name', 'email');
    await expect(this.emailInput).toHaveAttribute('id', 'email');

    // Password field
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
    await expect(this.passwordInput).toHaveAttribute('name', 'password');
    await expect(this.passwordInput).toHaveAttribute('id', 'password');

    // Button accessibility - it's type="button" not "submit" based on the source
    await expect(this.signInButton).toHaveAttribute('type', 'button');
  }

  /**
   * Verify initial focus is on email field
   */
  async verifyInitialFocus(): Promise<void> {
    await expect(this.emailInput).toBeFocused();
  }

  /**
   * Test keyboard navigation through form
   */
  async testKeyboardNavigation(): Promise<void> {
    // Start at email field
    await this.emailInput.focus();
    await expect(this.emailInput).toBeFocused();

    // Tab to password field
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();

    // Tab to sign in button
    await this.page.keyboard.press('Tab');
    await expect(this.signInButton).toBeFocused();

    // Tab to forgot password link
    await this.page.keyboard.press('Tab');
    await expect(this.forgotPasswordLink).toBeFocused();
  }

  /**
   * Submit form using keyboard
   */
  async submitWithKeyboard(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Verify error state styling and accessibility
   */
  async verifyErrorState(): Promise<void> {
    // Trigger validation errors by submitting empty form
    await this.clickSignIn();

    // Check for error alert
    const errorMessage = await this.getErrorMessage();
    if (errorMessage) {
      await expect(this.page.locator(this.selectors.errorAlert)).toBeVisible();
    }

    // Check if fields show error styling
    const hasEmailError = await this.hasEmailError();
    const hasPasswordError = await this.hasPasswordError();

    // Material-UI automatically handles aria attributes for error states
    if (hasEmailError) {
      await expect(this.emailInput).toHaveAttribute('aria-invalid', 'true');
    }

    if (hasPasswordError) {
      await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Clear form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Verify form is cleared and reset
   */
  async verifyFormReset(): Promise<void> {
    await expect(this.emailInput).toHaveValue('');
    await expect(this.passwordInput).toHaveValue('');

    // Verify no error alert is visible
    const errorAlert = this.page.locator(this.selectors.errorAlert);
    await expect(errorAlert).not.toBeVisible();
  }

  /**
   * Test form validation with various invalid inputs
   */
  async testFormValidation(): Promise<void> {
    const testCases = [
      {
        email: '',
        password: '',
        expectError: true,
        expectedErrorText: 'Email is required',
        description: 'empty fields'
      },
      {
        email: 'invalid-email',
        password: 'password123',
        expectError: true,
        expectedErrorText: 'Please enter a valid email address',
        description: 'invalid email format'
      },
      {
        email: 'valid@email.com',
        password: '',
        expectError: true,
        expectedErrorText: 'Password is required',
        description: 'missing password'
      }
    ];

    for (const testCase of testCases) {
      await this.clearForm();

      if (testCase.email) await this.fillEmail(testCase.email);
      if (testCase.password) await this.fillPassword(testCase.password);

      await this.clickSignIn();

      if (testCase.expectError) {
        const errorMessage = await this.getErrorMessage();
        expect(errorMessage).toContain(testCase.expectedErrorText);
      }
    }
  }

  /**
   * Verify loading state behavior
   */
  async verifyLoadingState(): Promise<void> {
    // Set up slow network to observe loading state
    await this.page.route('**/api/auth/login', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await this.fillEmail('test@example.com');
    await this.fillPassword('password123');
    await this.clickSignIn();

    // Verify loading state
    expect(await this.isLoading()).toBe(true);

    // Verify form is disabled during loading
    await expect(this.emailInput).toBeDisabled();
    await expect(this.passwordInput).toBeDisabled();
    await expect(this.signInButton).toBeDisabled();
  }

  /**
   * Test mobile responsiveness
   */
  async testMobileResponsiveness(): Promise<void> {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });

    // Verify form is still accessible
    await expect(this.loginForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();

    // Test touch interactions
    await this.emailInput.tap();
    await this.fillEmail('test@example.com');

    await this.passwordInput.tap();
    await this.fillPassword('password123');

    await this.signInButton.tap();
  }
}