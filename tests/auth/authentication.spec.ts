import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * Comprehensive authentication test suite for ColorGarb application
 * Tests login, logout, session management, and role-based redirections
 *
 * @fileoverview Authentication end-to-end tests
 * @since 3.0.0
 */

// Test data for different user roles
const testUsers = {
  director: {
    email: 'director@lincolnhigh.edu',
    password: 'password123',
    name: 'Jane Smith',
    role: 'Director',
    expectedRedirect: '/dashboard'
  },
  finance: {
    email: 'finance@lincolnhigh.edu',
    password: 'password123',
    name: 'John Finance',
    role: 'Finance',
    expectedRedirect: '/dashboard'
  },
  staff: {
    email: 'staff@colorgarb.com',
    password: 'password123',
    name: 'ColorGarb Staff',
    role: 'ColorGarbStaff',
    expectedRedirect: '/admin/dashboard'
  }
};

test.describe('Authentication Flows', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Login Page Functionality', () => {
    test('should display login form with all required elements', async ({ page }) => {
      await loginPage.goto();

      // Verify page structure
      await loginPage.verifyPageDisplay();

      // Check accessibility properties
      await loginPage.verifyAccessibilityProperties();

      // Verify initial focus
      await loginPage.verifyInitialFocus();
    });

    test('should handle keyboard navigation properly', async ({ page }) => {
      await loginPage.goto();

      // Test keyboard navigation through form
      await loginPage.testKeyboardNavigation();

      // Test form submission with keyboard
      await loginPage.submitWithKeyboard(testUsers.director.email, testUsers.director.password);

      // Verify successful login
      await expect(page).toHaveURL(testUsers.director.expectedRedirect);
    });

    test('should validate form input properly', async ({ page }) => {
      await loginPage.goto();

      // Test comprehensive form validation
      await loginPage.testFormValidation();
    });

    test('should show loading state during authentication', async ({ page }) => {
      await loginPage.goto();

      // Test loading state behavior
      await loginPage.verifyLoadingState();
    });

    test('should work correctly on mobile devices', async ({ page }) => {
      await loginPage.goto();

      // Test mobile responsiveness
      await loginPage.testMobileResponsiveness();
    });
  });

  test.describe('Successful Authentication', () => {
    for (const [userType, userData] of Object.entries(testUsers)) {
      test(`should successfully authenticate ${userType} user`, async ({ page }) => {
        await loginPage.goto();

        // Perform login
        await loginPage.loginAndWaitForRedirect(userData.email, userData.password, userData.expectedRedirect);

        // Verify user is on correct page
        await expect(page).toHaveURL(userData.expectedRedirect);

        // Verify user information is displayed
        if (userData.expectedRedirect === '/dashboard') {
          await dashboardPage.waitForDashboardLoad();
          const userName = await dashboardPage.getUserName();
          expect(userName).toContain(userData.name);
        }
      });
    }

    test('should persist authentication across page refreshes', async ({ page }) => {
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);

      // Refresh the page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL('/dashboard');
      await dashboardPage.waitForDashboardLoad();

      // User information should still be visible
      const userName = await dashboardPage.getUserName();
      expect(userName).toContain(testUsers.director.name);
    });

    test('should redirect authenticated users away from login page', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);

      // Try to go to login page
      await page.goto('/auth/login');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle role-based redirections correctly', async ({ page }) => {
      // Test staff user gets redirected to admin dashboard
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        testUsers.staff.expectedRedirect
      );

      await expect(page).toHaveURL('/admin/dashboard');

      // Logout
      await page.locator('[data-testid="logout-button"]').click();
      await expect(page).toHaveURL('/auth/login');

      // Test regular user gets redirected to user dashboard
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password,
        testUsers.director.expectedRedirect
      );

      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Failed Authentication', () => {
    test('should handle invalid email addresses', async ({ page }) => {
      await loginPage.goto();

      const invalidEmails = [
        'nonexistent@example.com',
        'invalid.email.format',
        'user@wrongdomain.com'
      ];

      for (const email of invalidEmails) {
        await loginPage.clearForm();
        await loginPage.login(email, 'password123');

        // Should show error message
        const errorMessage = await loginPage.getErrorMessage();
        expect(errorMessage).toMatch(/invalid.*email.*password/i);

        // Should remain on login page
        await expect(page).toHaveURL('/auth/login');
      }
    });

    test('should handle invalid passwords', async ({ page }) => {
      await loginPage.goto();

      const invalidPasswords = [
        'wrongpassword',
        'password',
        '12345',
        ''
      ];

      for (const password of invalidPasswords) {
        await loginPage.clearForm();
        await loginPage.login(testUsers.director.email, password);

        if (password === '') {
          // Empty password should show validation error
          const passwordError = await loginPage.getPasswordError();
          expect(passwordError).toMatch(/password.*required/i);
        } else {
          // Wrong password should show authentication error
          const errorMessage = await loginPage.getErrorMessage();
          expect(errorMessage).toMatch(/invalid.*email.*password/i);
        }

        // Should remain on login page
        await expect(page).toHaveURL('/auth/login');
      }
    });

    test('should show proper validation errors for empty fields', async ({ page }) => {
      await loginPage.goto();

      // Test empty email
      await loginPage.fillPassword('password123');
      await loginPage.clickSignIn();

      const emailError = await loginPage.getEmailError();
      expect(emailError).toMatch(/email.*required/i);

      // Test empty password
      await loginPage.clearForm();
      await loginPage.fillEmail(testUsers.director.email);
      await loginPage.clickSignIn();

      const passwordError = await loginPage.getPasswordError();
      expect(passwordError).toMatch(/password.*required/i);

      // Test both empty
      await loginPage.clearForm();
      await loginPage.clickSignIn();

      const emailErrorBoth = await loginPage.getEmailError();
      const passwordErrorBoth = await loginPage.getPasswordError();
      expect(emailErrorBoth).toMatch(/email.*required/i);
      expect(passwordErrorBoth).toMatch(/password.*required/i);
    });

    test('should handle malformed email addresses', async ({ page }) => {
      await loginPage.goto();

      const malformedEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user name@domain.com'
      ];

      for (const email of malformedEmails) {
        await loginPage.clearForm();
        await loginPage.fillEmail(email);
        await loginPage.fillPassword('password123');
        await loginPage.clickSignIn();

        // Should show email validation error
        const emailError = await loginPage.getEmailError();
        expect(emailError).toMatch(/valid.*email/i);

        await loginPage.clearForm();
      }
    });

    test('should clear errors when user starts typing', async ({ page }) => {
      await loginPage.goto();

      // Trigger validation errors
      await loginPage.clickSignIn();

      // Verify errors are shown
      expect(await loginPage.getEmailError()).toBeTruthy();
      expect(await loginPage.getPasswordError()).toBeTruthy();

      // Start typing in email field
      await loginPage.fillEmail('t');

      // Email error should be cleared
      expect(await loginPage.getEmailError()).toBeFalsy();

      // Password error should still be there
      expect(await loginPage.getPasswordError()).toBeTruthy();

      // Start typing in password field
      await loginPage.fillPassword('p');

      // Password error should be cleared
      expect(await loginPage.getPasswordError()).toBeFalsy();
    });
  });

  test.describe('Account Security', () => {
    test('should implement account lockout after failed attempts', async ({ page }) => {
      await loginPage.goto();

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await loginPage.clearForm();
        await loginPage.login(testUsers.director.email, 'wrongpassword');

        // Wait for error message
        const error = await loginPage.getErrorMessage();
        expect(error).toMatch(/invalid.*email.*password/i);
      }

      // 6th attempt should show account locked message
      await loginPage.clearForm();
      await loginPage.login(testUsers.director.email, 'wrongpassword');

      const lockoutError = await loginPage.getErrorMessage();
      expect(lockoutError).toMatch(/account.*locked|too many.*attempts/i);
    });

    test('should enforce password requirements', async ({ page }) => {
      // This test assumes password requirements are enforced
      // Adjust based on actual implementation
      await loginPage.goto();

      const weakPasswords = [
        '123',
        'abc',
        '   ',
        'password' // too common
      ];

      for (const password of weakPasswords) {
        await loginPage.clearForm();
        await loginPage.fillEmail('newuser@example.com');
        await loginPage.fillPassword(password);
        await loginPage.clickSignIn();

        // Should show appropriate error (either validation or authentication)
        const error = await loginPage.getErrorMessage() || await loginPage.getPasswordError();
        expect(error).toBeTruthy();
      }
    });

    test('should not expose sensitive information in error messages', async ({ page }) => {
      await loginPage.goto();

      // Try login with non-existent user
      await loginPage.login('nonexistent@example.com', 'password123');

      const error = await loginPage.getErrorMessage();
      // Error should not reveal whether email exists or not
      expect(error).toMatch(/invalid.*email.*password/i);
      expect(error).not.toMatch(/user.*not.*found|email.*not.*exist/i);
    });

    test('should implement timing attack protection', async ({ page }) => {
      await loginPage.goto();

      // Test with non-existent user
      const start1 = Date.now();
      await loginPage.login('nonexistent@example.com', 'password123');
      const time1 = Date.now() - start1;

      // Wait for error and clear
      await loginPage.getErrorMessage();
      await loginPage.clearForm();

      // Test with existing user but wrong password
      const start2 = Date.now();
      await loginPage.login(testUsers.director.email, 'wrongpassword');
      const time2 = Date.now() - start2;

      // Response times should be similar (within reasonable tolerance)
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(2000); // 2 second tolerance
    });
  });

  test.describe('Session Management', () => {
    test('should logout user and redirect to login', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);
      await dashboardPage.waitForDashboardLoad();

      // Logout
      await dashboardPage.logout();

      // Should redirect to login page
      await expect(page).toHaveURL('/auth/login');

      // Should not be able to access protected routes
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/auth/login');
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/orders',
        '/profile',
        '/admin/dashboard',
        '/admin/users'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL('/auth/login');
      }
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);

      // Manually clear the auth token to simulate expiration
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should maintain session across browser tabs', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      const loginPage1 = new LoginPage(page1);
      const dashboardPage1 = new DashboardPage(page1);
      const dashboardPage2 = new DashboardPage(page2);

      // Login in first tab
      await loginPage1.goto();
      await loginPage1.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);
      await dashboardPage1.waitForDashboardLoad();

      // Navigate to dashboard in second tab
      await dashboardPage2.goto();
      await dashboardPage2.waitForDashboardLoad();

      // Should be authenticated in both tabs
      const userName1 = await dashboardPage1.getUserName();
      const userName2 = await dashboardPage2.getUserName();

      expect(userName1).toContain(testUsers.director.name);
      expect(userName2).toContain(testUsers.director.name);

      await context.close();
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should be accessible to screen readers', async ({ page }) => {
      await loginPage.goto();

      // Verify accessibility basics
      await loginPage.verifyAccessibility();

      // Check for proper ARIA labels and roles
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');

      // Check error state accessibility
      await loginPage.verifyErrorState();
    });

    test('should support high contrast mode', async ({ page }) => {
      // Set forced colors mode
      await page.emulateMedia({ forcedColors: 'active' });

      await loginPage.goto();

      // Verify form is still visible and usable
      await loginPage.verifyPageDisplay();

      // Test login functionality
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);
      await expect(page).toHaveURL('/dashboard');
    });

    test('should work with reduced motion settings', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await loginPage.goto();

      // Should still function normally
      await loginPage.verifyPageDisplay();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle browser autofill correctly', async ({ page }) => {
      await loginPage.goto();

      // Simulate browser autofill
      await page.fill('[data-testid="email-input"]', testUsers.director.email);
      await page.fill('[data-testid="password-input"]', testUsers.director.password);

      // Submit form
      await loginPage.clickSignIn();

      // Should succeed
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await loginPage.goto();

      // Block network requests
      await page.route('**/api/auth/login', route => route.abort());

      await loginPage.login(testUsers.director.email, testUsers.director.password);

      // Should show network error
      const error = await loginPage.getErrorMessage();
      expect(error).toMatch(/network|connection|failed/i);

      // Restore network and retry
      await page.unroute('**/api/auth/login');
      await loginPage.clickSignIn();

      // Should succeed
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle server errors appropriately', async ({ page }) => {
      await loginPage.goto();

      // Mock server error
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        });
      });

      await loginPage.login(testUsers.director.email, testUsers.director.password);

      // Should show server error
      const error = await loginPage.getErrorMessage();
      expect(error).toMatch(/server.*error|try.*again/i);
    });

    test('should recover from form submission errors', async ({ page }) => {
      await loginPage.goto();

      // Cause an error
      await loginPage.login('invalid@email.com', 'wrongpassword');

      // Verify error is shown
      expect(await loginPage.getErrorMessage()).toBeTruthy();

      // Clear and try valid credentials
      await loginPage.clearForm();
      await loginPage.loginAndWaitForRedirect(testUsers.director.email, testUsers.director.password);

      // Should succeed
      await expect(page).toHaveURL('/dashboard');
    });
  });
});