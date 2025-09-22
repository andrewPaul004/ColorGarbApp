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
  // Page-specific selectors
  private selectors = {
    // Form elements
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    signInButton: '[data-testid="sign-in-button"]',
    forgotPasswordLink: '[data-testid="forgot-password-link"]',

    // Validation errors
    emailError: '[data-testid="email-error"]',
    passwordError: '[data-testid="password-error"]',

    // Form container
    loginForm: '[data-testid="login-form"]',

    // Page elements
    pageTitle: 'h1',
    subtitle: '[data-testid="login-subtitle"]',

    // Remember me checkbox (if implemented)
    rememberMeCheckbox: '[data-testid="remember-me-checkbox"]',

    // Loading states
    loginLoadingSpinner: '[data-testid="login-loading-spinner"]',

    // Links
    createAccountLink: '[data-testid="create-account-link"]',
    helpLink: '[data-testid="help-link"]',
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
    // Check page title
    await expect(this.page).toHaveTitle(/ColorGarb/i);

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
   * Get validation error for email field
   */
  async getEmailError(): Promise<string | null> {
    const errorElement = this.page.locator(this.selectors.emailError);
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Get validation error for password field
   */
  async getPasswordError(): Promise<string | null> {
    const errorElement = this.page.locator(this.selectors.passwordError);
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
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
    await expect(this.emailInput).toHaveAttribute('required');
    await expect(this.emailInput).toHaveAttribute('autocomplete', 'email');

    // Password field
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
    await expect(this.passwordInput).toHaveAttribute('required');
    await expect(this.passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Button accessibility
    await expect(this.signInButton).toHaveAttribute('type', 'submit');
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
    // Trigger validation errors
    await this.clickSignIn();

    // Check for email error
    const emailError = await this.getEmailError();
    if (emailError) {
      await expect(this.emailInput).toHaveAttribute('aria-invalid', 'true');
      await expect(this.emailInput).toHaveAttribute('aria-describedby');
    }

    // Check for password error
    const passwordError = await this.getPasswordError();
    if (passwordError) {
      await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
      await expect(this.passwordInput).toHaveAttribute('aria-describedby');
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

    // Verify no error messages
    const emailError = this.page.locator(this.selectors.emailError);
    const passwordError = this.page.locator(this.selectors.passwordError);

    await expect(emailError).not.toBeVisible();
    await expect(passwordError).not.toBeVisible();
  }

  /**
   * Test form validation with various invalid inputs
   */
  async testFormValidation(): Promise<void> {
    const testCases = [
      {
        email: '',
        password: '',
        expectEmailError: true,
        expectPasswordError: true,
        description: 'empty fields'
      },
      {
        email: 'invalid-email',
        password: 'password123',
        expectEmailError: true,
        expectPasswordError: false,
        description: 'invalid email format'
      },
      {
        email: 'valid@email.com',
        password: '',
        expectEmailError: false,
        expectPasswordError: true,
        description: 'missing password'
      }
    ];

    for (const testCase of testCases) {
      await this.clearForm();

      if (testCase.email) await this.fillEmail(testCase.email);
      if (testCase.password) await this.fillPassword(testCase.password);

      await this.clickSignIn();

      const emailError = await this.getEmailError();
      const passwordError = await this.getPasswordError();

      if (testCase.expectEmailError) {
        expect(emailError).toBeTruthy();
      } else {
        expect(emailError).toBeFalsy();
      }

      if (testCase.expectPasswordError) {
        expect(passwordError).toBeTruthy();
      } else {
        expect(passwordError).toBeFalsy();
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