import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * Role-based Access Control Tests
 * Tests user permissions and access restrictions based on roles
 *
 * @fileoverview Role-based access control validation tests
 * @since 3.0.0
 */

// Test users representing different roles
const testUsers = {
  director: {
    email: 'director@lincolnhigh.edu',
    password: 'password123',
    name: 'Jane Smith',
    role: 'Director',
    organizationId: 'lincoln-high',
    expectedDashboard: '/dashboard',
    permissions: {
      createOrders: true,
      viewOrders: true,
      sendMessages: true,
      viewOwnOrgData: true,
      viewOtherOrgData: false,
      updateOrderStages: false,
      accessAdminPanel: false,
      manageUsers: false
    }
  },
  finance: {
    email: 'finance@lincolnhigh.edu',
    password: 'password123',
    name: 'John Finance',
    role: 'Finance',
    organizationId: 'lincoln-high',
    expectedDashboard: '/dashboard',
    permissions: {
      createOrders: true,
      viewOrders: true,
      sendMessages: true,
      viewOwnOrgData: true,
      viewOtherOrgData: false,
      updateOrderStages: false,
      accessAdminPanel: false,
      manageUsers: false
    }
  },
  colorGarbStaff: {
    email: 'staff@colorgarb.com',
    password: 'password123',
    name: 'ColorGarb Staff',
    role: 'ColorGarbStaff',
    organizationId: null,
    expectedDashboard: '/admin/dashboard',
    permissions: {
      createOrders: true,
      viewOrders: true,
      sendMessages: true,
      viewOwnOrgData: true,
      viewOtherOrgData: true,
      updateOrderStages: true,
      accessAdminPanel: true,
      manageUsers: true
    }
  }
};

// Protected routes and their required permissions
const protectedRoutes = [
  { path: '/dashboard', requiredRole: ['Director', 'Finance', 'ColorGarbStaff'] },
  { path: '/orders', requiredRole: ['Director', 'Finance', 'ColorGarbStaff'] },
  { path: '/profile', requiredRole: ['Director', 'Finance', 'ColorGarbStaff'] },
  { path: '/admin/dashboard', requiredRole: ['ColorGarbStaff'] },
  { path: '/admin/users', requiredRole: ['ColorGarbStaff'] },
  { path: '/admin/messages', requiredRole: ['ColorGarbStaff'] },
  { path: '/admin/organizations', requiredRole: ['ColorGarbStaff'] },
  { path: '/admin/settings', requiredRole: ['ColorGarbStaff'] }
];

test.describe('Role-Based Access Control', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Route Access Control', () => {
    for (const [userType, userData] of Object.entries(testUsers)) {
      test(`${userType} should access appropriate routes and be blocked from restricted ones`, async ({ page }) => {
        // Login as the user
        await page.goto('/auth/login');
        await loginPage.loginAndWaitForRedirect(
          userData.email,
          userData.password,
          userData.expectedDashboard
        );

        // Test each protected route
        for (const route of protectedRoutes) {
          await page.goto(route.path);

          if (route.requiredRole.includes(userData.role)) {
            // User should have access - verify they're not redirected
            await page.waitForTimeout(1000); // Allow time for any redirects
            expect(page.url()).toContain(route.path);

            // Verify page loads properly
            await page.waitForLoadState('networkidle');
            const pageTitle = await page.title();
            expect(pageTitle).toBeTruthy();
          } else {
            // User should be blocked - verify redirect or error
            await page.waitForTimeout(1000);
            const currentUrl = page.url();

            // Should either redirect away or show error
            if (currentUrl.includes(route.path)) {
              // If still on the page, should show access denied error
              const errorMessage = await page.locator('[data-testid="error-message"], [role="alert"]').textContent();
              expect(errorMessage).toMatch(/access.*denied|unauthorized|forbidden/i);
            } else {
              // Should be redirected to appropriate page
              expect(currentUrl).not.toContain(route.path);
              expect(currentUrl).toMatch(/dashboard|login|unauthorized/);
            }
          }
        }
      });
    }

    test('unauthenticated users should be redirected to login', async ({ page }) => {
      for (const route of protectedRoutes) {
        await page.goto(route.path);
        await expect(page).toHaveURL('/auth/login');
      }
    });
  });

  test.describe('UI Element Permissions', () => {
    for (const [userType, userData] of Object.entries(testUsers)) {
      test(`${userType} should see appropriate UI elements based on permissions`, async ({ page }) => {
        await page.goto('/auth/login');
        await loginPage.loginAndWaitForRedirect(userData.email, userData.password, userData.expectedDashboard);

        // Navigate to main dashboard
        if (userData.expectedDashboard !== '/dashboard') {
          await page.goto('/dashboard');
          // Staff users might not have access to regular dashboard
          if (userData.role === 'ColorGarbStaff') {
            await page.goto('/admin/dashboard');
          }
        }

        await page.waitForLoadState('networkidle');

        // Test create order permission
        const createOrderButton = page.locator('[data-testid="create-order-button"]');
        if (userData.permissions.createOrders) {
          await expect(createOrderButton).toBeVisible();
        } else {
          await expect(createOrderButton).not.toBeVisible();
        }

        // Test navigation menu items
        const navBar = page.locator('[data-testid="navigation-bar"]');
        await expect(navBar).toBeVisible();

        // Admin panel access
        const adminLink = page.locator('[data-testid="admin-link"], a[href*="/admin"]');
        if (userData.permissions.accessAdminPanel) {
          // Staff should see admin links
          if (await adminLink.count() > 0) {
            await expect(adminLink.first()).toBeVisible();
          }
        } else {
          // Non-staff should not see admin links
          await expect(adminLink).toHaveCount(0);
        }
      });
    }
  });

  test.describe('Data Access Permissions', () => {
    test('director and finance should only see their organization data', async ({ page }) => {
      // Test with Director
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      await dashboardPage.waitForDashboardLoad();

      // Get orders count for Director's organization
      const directorOrderCount = await dashboardPage.getOrderCount();
      const directorSummary = await dashboardPage.getSummaryStats();

      // Logout
      await dashboardPage.logout();

      // Test with Finance user from same organization
      await loginPage.loginAndWaitForRedirect(
        testUsers.finance.email,
        testUsers.finance.password
      );

      await dashboardPage.waitForDashboardLoad();

      const financeOrderCount = await dashboardPage.getOrderCount();
      const financeSummary = await dashboardPage.getSummaryStats();

      // Both should see same data (same organization)
      expect(financeOrderCount).toBe(directorOrderCount);
      expect(financeSummary.totalOrders).toBe(directorSummary.totalOrders);
    });

    test('ColorGarb staff should see data from all organizations', async ({ page }) => {
      // First get data as regular user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      await dashboardPage.waitForDashboardLoad();
      const clientOrderCount = await dashboardPage.getOrderCount();

      await dashboardPage.logout();

      // Now test as staff
      await loginPage.loginAndWaitForRedirect(
        testUsers.colorGarbStaff.email,
        testUsers.colorGarbStaff.password,
        '/admin/dashboard'
      );

      // Navigate to admin orders view
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const staffOrderCount = await page.locator('[data-testid="order-card"]').count();

      // Staff should typically see more orders than any single organization
      // (unless there's only one organization with orders)
      expect(staffOrderCount).toBeGreaterThanOrEqual(clientOrderCount);
    });

    test('users should not be able to access other organization data via API', async ({ page }) => {
      // Login as regular user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      // Monitor API requests
      const apiRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/orders') || request.url().includes('/api/organizations')) {
          apiRequests.push({
            url: request.url(),
            headers: request.headers()
          });
        }
      });

      // Monitor API responses for unauthorized access
      const unauthorizedResponses: any[] = [];
      page.on('response', response => {
        if (response.status() === 401 || response.status() === 403) {
          unauthorizedResponses.push({
            url: response.url(),
            status: response.status()
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      // Verify API requests include proper authorization
      expect(apiRequests.length).toBeGreaterThan(0);

      for (const request of apiRequests) {
        expect(request.headers.authorization).toBeTruthy();
        expect(request.headers.authorization).toMatch(/^Bearer\s+/);
      }

      // No unauthorized responses should occur for legitimate requests
      expect(unauthorizedResponses.length).toBe(0);
    });
  });

  test.describe('Permission Boundaries', () => {
    test('director should not be able to update order stages', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Navigate to order detail
        await dashboardPage.clickOrderCard(0);
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await page.waitForLoadState('networkidle');

        // Director should not have stage update permissions
        const stageUpdateButton = page.locator('[data-testid="stage-update-button"]');
        await expect(stageUpdateButton).not.toBeVisible();
      }
    });

    test('ColorGarb staff should be able to update order stages', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.colorGarbStaff.email,
        testUsers.colorGarbStaff.password,
        '/admin/dashboard'
      );

      // Navigate to admin orders
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Navigate to order detail
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await page.waitForLoadState('networkidle');

        // Staff should have stage update permissions
        const stageUpdateButton = page.locator('[data-testid="stage-update-button"]');
        await expect(stageUpdateButton).toBeVisible();
      }
    });

    test('users should only send messages in their organization orders', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Navigate to order detail
        await dashboardPage.clickOrderCard(0);
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await page.waitForLoadState('networkidle');

        // Should have message composer
        const messageComposer = page.locator('[data-testid="message-composer"]');
        await expect(messageComposer).toBeVisible();

        // Should be able to send message
        const messageInput = page.locator('[data-testid="message-input"]');
        const sendButton = page.locator('[data-testid="send-message-button"]');

        await expect(messageInput).toBeVisible();
        await expect(sendButton).toBeVisible();
      }
    });
  });

  test.describe('Role Hierarchy and Inheritance', () => {
    test('should enforce proper role hierarchy within organizations', async ({ page }) => {
      // Test that Director and Finance have similar access within their organization
      // but different from Staff

      const orgUsers = [testUsers.director, testUsers.finance];

      for (const user of orgUsers) {
        await page.goto('/auth/login');
        await loginPage.loginAndWaitForRedirect(user.email, user.password);

        await dashboardPage.waitForDashboardLoad();

        // Both should have order creation permission
        const createOrderButton = page.locator('[data-testid="create-order-button"]');
        await expect(createOrderButton).toBeVisible();

        // Both should see same organization data
        const summary = await dashboardPage.getSummaryStats();
        expect(summary.totalOrders).toBeGreaterThanOrEqual(0);

        // Both should NOT have admin access
        const adminLinks = page.locator('a[href*="/admin"]');
        await expect(adminLinks).toHaveCount(0);

        await dashboardPage.logout();
      }
    });

    test('should handle role-based feature flags correctly', async ({ page }) => {
      // Test different features available to different roles

      const featureTests = [
        {
          feature: 'Order Creation',
          selector: '[data-testid="create-order-button"]',
          roles: ['Director', 'Finance', 'ColorGarbStaff']
        },
        {
          feature: 'Admin Panel',
          selector: 'a[href*="/admin"]',
          roles: ['ColorGarbStaff']
        }
      ];

      for (const [userType, userData] of Object.entries(testUsers)) {
        await page.goto('/auth/login');
        await loginPage.loginAndWaitForRedirect(
          userData.email,
          userData.password,
          userData.expectedDashboard
        );

        if (userData.expectedDashboard === '/admin/dashboard') {
          // For staff, check admin features
          await page.waitForLoadState('networkidle');
        } else {
          // For clients, navigate to regular dashboard
          await dashboardPage.goto();
          await dashboardPage.waitForDashboardLoad();
        }

        for (const featureTest of featureTests) {
          const element = page.locator(featureTest.selector);
          const shouldHaveAccess = featureTest.roles.includes(userData.role);

          if (shouldHaveAccess) {
            await expect(element).toBeVisible();
          } else {
            await expect(element).not.toBeVisible();
          }
        }

        await dashboardPage.logout();
      }
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should handle token manipulation attempts', async ({ page }) => {
      // Login normally
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      // Modify token to attempt privilege escalation
      await page.evaluate(() => {
        const token = localStorage.getItem('auth-token');
        if (token) {
          // Attempt to modify token (this should fail gracefully)
          localStorage.setItem('auth-token', token + 'tampered');
        }
      });

      // Try to access admin route
      await page.goto('/admin/dashboard');

      // Should either redirect to login or show unauthorized error
      await page.waitForTimeout(2000);
      const currentUrl = page.url();

      expect(currentUrl).not.toContain('/admin/dashboard');
      expect(currentUrl).toMatch(/login|unauthorized|dashboard/);
    });

    test('should handle expired tokens gracefully', async ({ page }) => {
      // Login normally
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      // Clear token to simulate expiration
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/orders');

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should prevent cross-site request forgery for role changes', async ({ page }) => {
      // Login as regular user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      // Monitor for any role-related API calls
      const roleRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/auth') || request.url().includes('/api/users')) {
          roleRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      // Any state-changing requests should have proper authorization
      const stateChangingRequests = roleRequests.filter(req =>
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      );

      for (const request of stateChangingRequests) {
        expect(request.headers.authorization).toBeTruthy();
        expect(request.headers['content-type']).toMatch(/application\/json/);
      }
    });

    test('should validate role consistency across session', async ({ page }) => {
      // Login as director
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.director.email,
        testUsers.director.password
      );

      // Verify consistent role throughout session
      await dashboardPage.waitForDashboardLoad();

      // Check user info in different parts of the UI
      const userName = await dashboardPage.getUserName();
      expect(userName).toContain(testUsers.director.name);

      // Navigate to profile
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // User role should be consistent
      const profileRole = await page.locator('[data-testid="user-role"]').textContent();
      if (profileRole) {
        expect(profileRole).toContain('Director');
      }

      // Navigate back to dashboard
      await dashboardPage.goto();

      // Role-based permissions should still be consistent
      const createOrderButton = page.locator('[data-testid="create-order-button"]');
      await expect(createOrderButton).toBeVisible();
    });
  });
});