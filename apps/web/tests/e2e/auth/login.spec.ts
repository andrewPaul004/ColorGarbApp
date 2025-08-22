/**
 * End-to-end tests for authentication flows
 * Tests complete user authentication scenarios using Playwright
 * 
 * @fileoverview Authentication E2E tests
 * @since 1.0.0
 */
import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'https://localhost:7001';

/**
 * Test user credentials for authentication tests
 */
const TEST_USER = {
  email: 'director@lincolnhigh.edu',
  password: 'password123',
  name: 'Jane Smith'
};

/**
 * Page object model for login page
 */
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/auth/login`);
  }

  async fillEmail(email: string) {
    await this.page.fill('[data-testid="email-input"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('[data-testid="password-input"]', password);
  }

  async clickSignIn() {
    await this.page.click('[data-testid="sign-in-button"]');
  }

  async clickForgotPassword() {
    await this.page.click('[data-testid="forgot-password-link"]');
  }

  async getErrorMessage() {
    return await this.page.textContent('[data-testid="error-alert"]');
  }

  async isLoading() {
    return await this.page.isVisible('[data-testid="loading-spinner"]');
  }
}

/**
 * Page object model for dashboard page
 */
class DashboardPage {
  constructor(private page: Page) {}

  async waitForLoad() {
    await this.page.waitForURL(`${BASE_URL}/dashboard`);
  }

  async getUserName() {
    return await this.page.textContent('[data-testid="user-name"]');
  }

  async logout() {
    await this.page.click('[data-testid="logout-button"]');
  }
}

/**
 * Page object model for forgot password page
 */
class ForgotPasswordPage {
  constructor(private page: Page) {}

  async waitForLoad() {
    await this.page.waitForURL(`${BASE_URL}/auth/forgot-password`);
  }

  async fillEmail(email: string) {
    await this.page.fill('[data-testid="email-input"]', email);
  }

  async clickSendResetLink() {
    await this.page.click('[data-testid="send-reset-button"]');
  }

  async getSuccessMessage() {
    return await this.page.textContent('[data-testid="success-message"]');
  }

  async clickBackToLogin() {
    await this.page.click('[data-testid="back-to-login-link"]');
  }
}

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    forgotPasswordPage = new ForgotPasswordPage(page);
  });

  test.describe('Login Page', () => {
    test('should display login form with all required elements', async ({ page }) => {
      await loginPage.goto();

      // Check page title and heading
      await expect(page).toHaveTitle(/ColorGarb/i);
      await expect(page.locator('h1')).toContainText('ColorGarb Client Portal');

      // Check form elements
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
    });

    test('should focus email input on page load', async ({ page }) => {
      await loginPage.goto();
      
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toBeFocused();
    });

    test('should have proper accessibility attributes', async ({ page }) => {
      await loginPage.goto();

      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');

      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  test.describe('Successful Authentication', () => {
    test('should successfully log in with valid credentials', async () => {
      await loginPage.goto();

      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();

      // Should redirect to dashboard
      await dashboardPage.waitForLoad();
      
      // Should display user information
      const userName = await dashboardPage.getUserName();
      expect(userName).toContain(TEST_USER.name);
    });

    test('should persist authentication across page refreshes', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();
      await dashboardPage.waitForLoad();

      // Refresh the page
      await page.reload();
      
      // Should still be on dashboard
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      
      const userName = await dashboardPage.getUserName();
      expect(userName).toContain(TEST_USER.name);
    });

    test('should redirect authenticated users away from login page', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();
      await dashboardPage.waitForLoad();

      // Try to go to login page
      await page.goto(`${BASE_URL}/auth/login`);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });
  });

  test.describe('Failed Authentication', () => {
    test('should show error for invalid email', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail('nonexistent@example.com');
      await loginPage.fillPassword('password123');
      await loginPage.clickSignIn();

      // Should show error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid email or password');

      // Should remain on login page
      await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });

    test('should show error for invalid password', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword('wrongpassword');
      await loginPage.clickSignIn();

      // Should show error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid email or password');

      // Should remain on login page
      await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });

    test('should show validation error for empty email', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillPassword('password123');
      await loginPage.clickSignIn();

      // Should show validation error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    });

    test('should show validation error for empty password', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.clickSignIn();

      // Should show validation error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail('invalid-email-format');
      await loginPage.fillPassword('password123');
      await loginPage.clickSignIn();

      // Should show validation error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email address');
    });

    test('should clear errors when user starts typing', async ({ page }) => {
      await loginPage.goto();

      // Trigger validation error
      await loginPage.clickSignIn();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

      // Start typing in email field
      await loginPage.fillEmail('t');

      // Error should be cleared
      await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state during login attempt', async ({ page }) => {
      // Slow down network to see loading state
      await page.route(`${API_URL}/api/auth/login`, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await loginPage.goto();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();

      // Should show loading state
      expect(await loginPage.isLoading()).toBe(true);
      await expect(page.locator('[data-testid="sign-in-button"]')).toContainText('Signing in');
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeDisabled();
    });

    test('should disable form fields during loading', async ({ page }) => {
      // Slow down network to see loading state
      await page.route(`${API_URL}/api/auth/login`, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await loginPage.goto();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();

      // Form fields should be disabled
      await expect(page.locator('[data-testid="email-input"]')).toBeDisabled();
      await expect(page.locator('[data-testid="password-input"]')).toBeDisabled();
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeDisabled();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.goto();
      await loginPage.clickForgotPassword();

      await forgotPasswordPage.waitForLoad();
      await expect(page.locator('h1')).toContainText('Reset Your Password');
    });

    test('should send password reset email', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/forgot-password`);
      
      await forgotPasswordPage.fillEmail(TEST_USER.email);
      await forgotPasswordPage.clickSendResetLink();

      // Should show success message
      const successMessage = await forgotPasswordPage.getSuccessMessage();
      expect(successMessage).toContain('reset link has been sent');
    });

    test('should navigate back to login from forgot password', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/forgot-password`);
      await forgotPasswordPage.clickBackToLogin();

      await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });
  });

  test.describe('Account Lockout', () => {
    test('should lock account after multiple failed attempts', async ({ page }) => {
      await loginPage.goto();

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await loginPage.fillEmail(TEST_USER.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.clickSignIn();
        
        // Wait for error message
        await expect(page.locator('[data-testid="error-alert"]')).toBeVisible();
        
        // Clear form for next attempt
        await page.fill('[data-testid="email-input"]', '');
        await page.fill('[data-testid="password-input"]', '');
      }

      // 6th attempt should show account locked message
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword('wrongpassword');
      await loginPage.clickSignIn();

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Account is temporarily locked');
    });
  });

  test.describe('Session Management', () => {
    test('should logout user and redirect to login', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.fillEmail(TEST_USER.email);
      await loginPage.fillPassword(TEST_USER.password);
      await loginPage.clickSignIn();
      await dashboardPage.waitForLoad();

      // Logout
      await dashboardPage.logout();

      // Should redirect to login page
      await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto(`${BASE_URL}/dashboard`);

      // Should redirect to login
      await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginPage.goto();

      // Check that elements are visible and properly sized
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible();

      // Check that form is responsive
      const formWidth = await page.locator('[data-testid="login-form"]').boundingBox();
      expect(formWidth?.width).toBeLessThanOrEqual(375);
    });

    test('should be usable with touch interactions', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginPage.goto();

      // Test touch interactions
      await page.tap('[data-testid="email-input"]');
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      
      await page.tap('[data-testid="password-input"]');
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      
      await page.tap('[data-testid="sign-in-button"]');

      // Should successfully login
      await dashboardPage.waitForLoad();
    });
  });
});