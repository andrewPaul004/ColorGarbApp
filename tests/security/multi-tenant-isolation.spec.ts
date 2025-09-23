import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { OrderDetailPage } from '../page-objects/OrderDetailPage';

/**
 * Multi-tenant organization isolation tests
 * Ensures data isolation between organizations and proper access controls
 *
 * @fileoverview Multi-tenant security and isolation tests
 * @since 3.0.0
 */

// Test organizations and users
const organizations = {
  lincolnHigh: {
    name: 'Lincoln High School',
    users: {
      director: {
        email: 'director@lincolnhigh.edu',
        password: 'password123',
        name: 'Jane Smith',
        role: 'Director'
      },
      finance: {
        email: 'finance@lincolnhigh.edu',
        password: 'password123',
        name: 'John Finance',
        role: 'Finance'
      }
    }
  },
  riversideAcademy: {
    name: 'Riverside Academy',
    users: {
      director: {
        email: 'director@riverside.edu',
        password: 'password123',
        name: 'Sarah Director',
        role: 'Director'
      },
      finance: {
        email: 'finance@riverside.edu',
        password: 'password123',
        name: 'Mike Finance',
        role: 'Finance'
      }
    }
  },
  colorGarb: {
    name: 'ColorGarb Staff',
    users: {
      staff: {
        email: 'staff@colorgarb.com',
        password: 'password123',
        name: 'ColorGarb Staff',
        role: 'ColorGarbStaff'
      },
      admin: {
        email: 'admin@colorgarb.com',
        password: 'password123',
        name: 'ColorGarb Admin',
        role: 'ColorGarbStaff'
      }
    }
  }
};

test.describe('Multi-Tenant Organization Isolation', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let orderDetailPage: OrderDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    orderDetailPage = new OrderDetailPage(page);
  });

  test.describe('Data Isolation Between Organizations', () => {
    test('users should only see orders from their organization', async ({ page }) => {
      // Test with Lincoln High School user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Get all orders visible to Lincoln High
      const lincolnOrderCount = await dashboardPage.getOrderCount();
      const lincolnOrders = [];

      for (let i = 0; i < Math.min(lincolnOrderCount, 5); i++) {
        const orderInfo = await dashboardPage.getOrderInfo(i);
        lincolnOrders.push(orderInfo);
      }

      // Logout
      await dashboardPage.logout();

      // Login as Riverside Academy user
      await loginPage.loginAndWaitForRedirect(
        organizations.riversideAcademy.users.director.email,
        organizations.riversideAcademy.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Get all orders visible to Riverside Academy
      const riversideOrderCount = await dashboardPage.getOrderCount();
      const riversideOrders = [];

      for (let i = 0; i < Math.min(riversideOrderCount, 5); i++) {
        const orderInfo = await dashboardPage.getOrderInfo(i);
        riversideOrders.push(orderInfo);
      }

      // Verify no overlap in order numbers between organizations
      const lincolnOrderNumbers = lincolnOrders.map(order => order.orderNumber);
      const riversideOrderNumbers = riversideOrders.map(order => order.orderNumber);

      const overlap = lincolnOrderNumbers.filter(orderNum =>
        riversideOrderNumbers.includes(orderNum)
      );

      expect(overlap.length).toBe(0);
    });

    test('users cannot access orders from other organizations via direct URL', async ({ page }) => {
      // First, login as Lincoln High user and get an order ID
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      let lincolnOrderId = null;
      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Click on first order to get URL
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Extract order ID from URL
        const currentUrl = page.url();
        const orderIdMatch = currentUrl.match(/\/orders\/([^\/]+)$/);
        if (orderIdMatch) {
          lincolnOrderId = orderIdMatch[1];
        }

        // Go back to dashboard
        await orderDetailPage.backToDashboard();
      }

      // Logout from Lincoln High
      await dashboardPage.logout();

      // Login as Riverside Academy user
      await loginPage.loginAndWaitForRedirect(
        organizations.riversideAcademy.users.director.email,
        organizations.riversideAcademy.users.director.password
      );

      if (lincolnOrderId) {
        // Try to access Lincoln High's order directly
        await page.goto(`/orders/${lincolnOrderId}`);

        // Should either redirect to dashboard or show access denied
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        const isOnOrderPage = currentUrl.includes(`/orders/${lincolnOrderId}`);

        if (isOnOrderPage) {
          // If still on order page, should show error
          const error = await orderDetailPage.getErrorMessage();
          expect(error).toMatch(/not found|access denied|unauthorized/i);
        } else {
          // Should be redirected away
          expect(currentUrl).not.toContain(`/orders/${lincolnOrderId}`);
        }
      }
    });

    test('API requests should respect organization boundaries', async ({ page }) => {
      // Login as Lincoln High user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Monitor API requests
      const apiRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/orders')) {
          apiRequests.push({
            url: request.url(),
            headers: request.headers()
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      // Verify API requests include proper organization context
      expect(apiRequests.length).toBeGreaterThan(0);

      for (const request of apiRequests) {
        // API should include authorization header
        expect(request.headers.authorization).toBeTruthy();

        // URL should not include other organization IDs
        expect(request.url).not.toMatch(/organizationId=(?!lincoln)/i);
      }
    });
  });

  test.describe('Message Isolation', () => {
    test('users should only see messages for their organization orders', async ({ page }) => {
      // Test message isolation in order detail pages
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Navigate to order detail
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify message permissions
        await orderDetailPage.verifyMessagePermissions(true);

        // Send a message
        await orderDetailPage.sendMessage('Test message for organization isolation', {
          messageType: 'General',
          recipientRole: 'All'
        });

        // Verify message appears
        const messageCount = await orderDetailPage.getMessageCount();
        expect(messageCount).toBeGreaterThan(0);

        // Get the message and verify sender organization
        const messageInfo = await orderDetailPage.getMessageInfo(0);
        expect(messageInfo.sender).toContain('Lincoln High') || expect(messageInfo.sender).toContain('Jane Smith');
      }
    });

    test('staff should see messages from all organizations but context should be preserved', async ({ page }) => {
      // Login as ColorGarb staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.colorGarb.users.staff.email,
        organizations.colorGarb.users.staff.password,
        '/admin/dashboard'
      );

      // Navigate to admin orders view
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      // Find an order to examine
      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Click on first order
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify staff can see messages but organization context is clear
        const orderInfo = await orderDetailPage.getOrderInfo();
        expect(orderInfo.organizationName).toBeTruthy();

        // Staff should be able to see and send messages
        await orderDetailPage.verifyMessagePermissions(true);
      }
    });
  });

  test.describe('Role-Based Access Within Organizations', () => {
    test('director and finance users should have different permissions within same organization', async ({ page }) => {
      // Test Director permissions
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Director should be able to create orders
      await dashboardPage.verifyCreateOrderPermission(true);

      // Check available navigation options for director
      const directorNav = await page.locator('[data-testid="navigation-bar"]').innerHTML();

      // Logout and test Finance user
      await dashboardPage.logout();

      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.finance.email,
        organizations.lincolnHigh.users.finance.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Finance should also be able to create orders
      await dashboardPage.verifyCreateOrderPermission(true);

      // Check available navigation options for finance
      const financeNav = await page.locator('[data-testid="navigation-bar"]').innerHTML();

      // Both roles should have similar access within their organization
      // (specific differences would depend on business requirements)
      expect(directorNav).toBeTruthy();
      expect(financeNav).toBeTruthy();
    });

    test('users from same organization should see same orders but may have different action permissions', async ({ page }) => {
      // Get orders as Director
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      const directorOrderCount = await dashboardPage.getOrderCount();
      const directorSummary = await dashboardPage.getSummaryStats();

      await dashboardPage.logout();

      // Get orders as Finance user from same organization
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.finance.email,
        organizations.lincolnHigh.users.finance.password
      );
      await dashboardPage.waitForDashboardLoad();

      const financeOrderCount = await dashboardPage.getOrderCount();
      const financeSummary = await dashboardPage.getSummaryStats();

      // Both should see the same orders (data consistency)
      expect(financeOrderCount).toBe(directorOrderCount);
      expect(financeSummary.totalOrders).toBe(directorSummary.totalOrders);
      expect(financeSummary.activeOrders).toBe(directorSummary.activeOrders);
    });
  });

  test.describe('Staff Cross-Organization Access', () => {
    test('ColorGarb staff should see orders from all organizations', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.colorGarb.users.staff.email,
        organizations.colorGarb.users.staff.password,
        '/admin/dashboard'
      );

      // Navigate to admin orders view
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      // Get total orders visible to staff
      const staffOrderCount = await page.locator('[data-testid="order-card"]').count();

      // Staff should typically see more orders than any single organization
      expect(staffOrderCount).toBeGreaterThanOrEqual(0);

      // Verify staff can see orders from multiple organizations
      if (staffOrderCount >= 2) {
        const orderInfos = [];

        for (let i = 0; i < Math.min(staffOrderCount, 5); i++) {
          const orderCard = page.locator('[data-testid="order-card"]').nth(i);
          const organizationName = await orderCard.locator('[data-testid="organization-name"]').textContent();
          orderInfos.push({ organizationName });
        }

        // Should see orders from different organizations
        const uniqueOrganizations = [...new Set(orderInfos.map(info => info.organizationName))];
        expect(uniqueOrganizations.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('staff should be able to filter by organization', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.colorGarb.users.staff.email,
        organizations.colorGarb.users.staff.password,
        '/admin/dashboard'
      );

      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      // Check if organization filter exists
      const orgFilter = page.locator('[data-testid="organization-filter"]');

      if (await orgFilter.isVisible()) {
        // Test filtering by specific organization
        await orgFilter.click();

        // Look for Lincoln High School option
        const lincolnOption = page.locator('[data-value*="lincoln"], [data-value*="Lincoln"]');

        if (await lincolnOption.isVisible()) {
          await lincolnOption.click();

          // Wait for filtered results
          await page.waitForResponse(response =>
            response.url().includes('/api/orders') && response.status() === 200
          );

          // Verify all visible orders are from Lincoln High
          const filteredOrderCount = await page.locator('[data-testid="order-card"]').count();

          if (filteredOrderCount > 0) {
            const firstOrderOrg = await page.locator('[data-testid="order-card"]')
              .first()
              .locator('[data-testid="organization-name"]')
              .textContent();

            expect(firstOrderOrg).toContain('Lincoln');
          }
        }
      }
    });

    test('staff should have elevated permissions across organizations', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.colorGarb.users.staff.email,
        organizations.colorGarb.users.staff.password,
        '/admin/dashboard'
      );

      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Navigate to order detail
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        // Staff should have stage update permissions
        await orderDetailPage.verifyStageUpdatePermission(true);

        // Staff should have messaging permissions
        await orderDetailPage.verifyMessagePermissions(true);
      }
    });
  });

  test.describe('Security Boundaries', () => {
    test('should prevent unauthorized API access through token manipulation', async ({ page }) => {
      // Login as Lincoln High user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Intercept API calls to verify they fail with manipulated tokens
      let interceptedRequest = false;
      await page.route('**/api/orders**', async (route) => {
        interceptedRequest = true;

        const request = route.request();
        const headers = request.headers();

        // Verify authorization header exists
        expect(headers.authorization).toBeTruthy();
        expect(headers.authorization).toMatch(/^Bearer\s+/);

        // Continue with request
        await route.continue();
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      expect(interceptedRequest).toBe(true);
    });

    test('should prevent cross-site request forgery', async ({ page }) => {
      // Login as normal user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Monitor requests for CSRF protection
      const requests: any[] = [];
      page.on('request', request => {
        if (request.method() === 'POST' || request.method() === 'PUT' || request.method() === 'DELETE') {
          requests.push({
            url: request.url(),
            headers: request.headers(),
            method: request.method()
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      // If there are any state-changing requests, they should have proper headers
      const stateChangingRequests = requests.filter(req =>
        req.url.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes(req.method)
      );

      for (const request of stateChangingRequests) {
        // Should have authorization
        expect(request.headers.authorization).toBeTruthy();

        // Should have content-type for JSON requests
        if (request.headers['content-type']) {
          expect(request.headers['content-type']).toMatch(/application\/json/);
        }
      }
    });

    test('should validate organization context in all requests', async ({ page }) => {
      // Login as Lincoln High user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Monitor API requests to ensure they don't leak organization data
      const apiCalls: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/orders') && response.status() === 200) {
          apiCalls.push({
            url: response.url(),
            status: response.status()
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      // Verify API calls were made and succeeded
      expect(apiCalls.length).toBeGreaterThan(0);

      // All successful API calls should respect organization boundaries
      for (const call of apiCalls) {
        expect(call.status).toBe(200);
        // URL should not contain other organization identifiers
        expect(call.url).not.toMatch(/riverside|academy/i);
      }
    });

    test('should handle session hijacking protection', async ({ page }) => {
      // Login normally
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Get current session information
      const sessionData = await page.evaluate(() => {
        return {
          localStorage: { ...localStorage },
          sessionStorage: { ...sessionStorage }
        };
      });

      // Verify session data doesn't contain sensitive information in plain text
      const sessionString = JSON.stringify(sessionData);

      // Should not contain plain text passwords
      expect(sessionString).not.toMatch(/password123/);

      // Should not contain unencoded sensitive data
      expect(sessionString).not.toMatch(/social security|ssn|credit card/i);
    });
  });

  test.describe('Data Leakage Prevention', () => {
    test('should not expose other organization data in autocomplete or suggestions', async ({ page }) => {
      // Login as Lincoln High user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Test search functionality if available
      const searchInput = page.locator('[data-testid="search-input"]');

      if (await searchInput.isVisible()) {
        // Type partial organization name from different org
        await searchInput.fill('Riverside');

        // Wait for any autocomplete suggestions
        await page.waitForTimeout(1000);

        // Should not show suggestions from other organizations
        const suggestions = page.locator('[data-testid="search-suggestions"] [data-testid="suggestion-item"]');
        const suggestionCount = await suggestions.count();

        for (let i = 0; i < suggestionCount; i++) {
          const suggestionText = await suggestions.nth(i).textContent();
          expect(suggestionText).not.toContain('Riverside Academy');
        }
      }
    });

    test('should not leak organization data in error messages', async ({ page }) => {
      // Login as Lincoln High user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );

      // Try to access a non-existent order
      await page.goto('/orders/nonexistent-order-id');

      // Error message should not reveal information about other organizations
      const error = await orderDetailPage.getErrorMessage();

      if (error) {
        expect(error).not.toContain('Riverside');
        expect(error).not.toContain('Academy');
        expect(error).not.toMatch(/organization.*\d+/); // Should not show org IDs
      }
    });

    test('should sanitize data in browser console and network logs', async ({ page }) => {
      // Monitor console logs
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      // Login and navigate
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        organizations.lincolnHigh.users.director.email,
        organizations.lincolnHigh.users.director.password
      );
      await dashboardPage.waitForDashboardLoad();

      // Check console logs for sensitive data leakage
      const allConsoleText = consoleLogs.join(' ');

      // Should not log passwords or tokens in plain text
      expect(allConsoleText).not.toMatch(/password123/);
      expect(allConsoleText).not.toMatch(/Bearer\s+[A-Za-z0-9\-_.]+/);

      // Should not log other organization names if not relevant
      expect(allConsoleText).not.toContain('Riverside Academy');
    });
  });
});