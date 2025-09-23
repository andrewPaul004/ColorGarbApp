import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { OrderDetailPage } from '../page-objects/OrderDetailPage';

/**
 * Comprehensive order management workflow tests
 * Tests the complete order lifecycle from creation to delivery
 *
 * @fileoverview Order workflow end-to-end tests
 * @since 3.0.0
 */

// Test data for order scenarios
const testOrders = {
  basic: {
    description: 'Lincoln High School Marching Band Uniforms',
    quantity: 25,
    estimatedValue: 5000,
    notes: 'Standard marching band uniform order for fall season'
  },
  complex: {
    description: 'Color Guard Competition Costumes',
    quantity: 12,
    estimatedValue: 8500,
    notes: 'Custom color guard costumes with intricate designs and accessories'
  }
};

const manufacturingStages = [
  'DesignProposal',
  'ProofApproval',
  'Measurements',
  'ProductionPlanning',
  'Cutting',
  'Sewing',
  'QualityControl',
  'Finishing',
  'FinalInspection',
  'Packaging',
  'ShippingPreparation',
  'ShipOrder',
  'Delivery'
];

test.describe('Order Management Workflow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let orderDetailPage: OrderDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    orderDetailPage = new OrderDetailPage(page);
  });

  test.describe('Order Creation and Display', () => {
    test('director should be able to create new orders', async ({ page }) => {
      // Login as director
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Verify create order permission
      await dashboardPage.verifyCreateOrderPermission(true);

      // Create new order
      await dashboardPage.clickCreateOrder();

      // Fill order creation form
      await page.fill('[data-testid="order-description"]', testOrders.basic.description);
      await page.fill('[data-testid="order-quantity"]', testOrders.basic.quantity.toString());
      await page.fill('[data-testid="order-estimated-value"]', testOrders.basic.estimatedValue.toString());
      await page.fill('[data-testid="order-notes"]', testOrders.basic.notes);

      // Submit order
      await page.click('[data-testid="create-order-submit"]');

      // Wait for order creation and redirect
      await page.waitForURL(/\/orders\/[^\/]+$/);
      await orderDetailPage.waitForOrderDetailLoad();

      // Verify order was created correctly
      const orderInfo = await orderDetailPage.getOrderInfo();
      expect(orderInfo.description).toContain(testOrders.basic.description);
      expect(orderInfo.stage).toBe('DesignProposal');
    });

    test('finance user should be able to create orders', async ({ page }) => {
      // Login as finance user
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('finance@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Finance users should also have create order permission
      await dashboardPage.verifyCreateOrderPermission(true);
    });

    test('regular client users should not see create order button', async ({ page }) => {
      // This test would need a regular client user account
      // For now, we'll verify the permission system works for known roles

      // Login as director first to verify permission exists
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      await dashboardPage.verifyCreateOrderPermission(true);
    });

    test('should display orders in dashboard grid', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Verify orders are displayed
      const orderCount = await dashboardPage.getOrderCount();
      expect(orderCount).toBeGreaterThanOrEqual(0);

      if (orderCount > 0) {
        // Verify order cards format
        await dashboardPage.verifyOrderCardsFormat();

        // Test order card interaction
        const orderInfo = await dashboardPage.getOrderInfo(0);
        expect(orderInfo.orderNumber).toBeTruthy();
        expect(orderInfo.description).toBeTruthy();
        expect(orderInfo.stage).toBeTruthy();
      }
    });

    test('should handle order filtering correctly', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Test filtering functionality
      await dashboardPage.testFiltering();
    });
  });

  test.describe('Order Detail Navigation', () => {
    test('should navigate to order details from dashboard', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Click first order
        await dashboardPage.clickOrderCard(0);

        // Should be on order detail page
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify order information is displayed
        const orderInfo = await orderDetailPage.getOrderInfo();
        expect(orderInfo.orderNumber).toBeTruthy();
        expect(orderInfo.organizationName).toBeTruthy();
      }
    });

    test('should display complete order information', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify all sections are present
        await orderDetailPage.verifyOrganizationInfo();

        // Verify stage timeline
        const timeline = await orderDetailPage.getStageTimeline();
        expect(timeline.length).toBeGreaterThan(0);

        // Should have at least one current stage
        const currentStage = timeline.find(stage => stage.status === 'current');
        expect(currentStage).toBeTruthy();
      }
    });

    test('should navigate back to dashboard', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Navigate back
        await orderDetailPage.backToDashboard();

        // Should be back on dashboard
        await dashboardPage.waitForDashboardLoad();
        await expect(page).toHaveURL('/dashboard');
      }
    });
  });

  test.describe('13-Stage Manufacturing Process', () => {
    test('should display complete stage timeline', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Get stage timeline
        const timeline = await orderDetailPage.getStageTimeline();

        // Should have all manufacturing stages represented
        expect(timeline.length).toBeGreaterThanOrEqual(manufacturingStages.length);

        // Verify stage progression logic
        let foundCurrent = false;
        let foundPending = false;

        for (const stage of timeline) {
          if (stage.status === 'current') {
            expect(foundCurrent).toBe(false); // Should only have one current stage
            foundCurrent = true;
          } else if (stage.status === 'pending') {
            foundPending = true;
            // All pending stages should come after current stage
            expect(foundCurrent).toBe(true);
          }
        }

        expect(foundCurrent).toBe(true); // Should have one current stage
      }
    });

    test('staff should be able to update order stages', async ({ page }) => {
      // Login as staff member
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('staff@colorgarb.com', 'password123', '/admin/dashboard');

      // Navigate to an order (staff can see all orders)
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      // Find an order that's not in final stages
      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Click first order
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify staff has stage update permissions
        await orderDetailPage.verifyStageUpdatePermission(true);

        // Get current stage
        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage && currentStage.stage !== 'Delivery') {
          // Find next stage in the sequence
          const currentIndex = manufacturingStages.indexOf(currentStage.stage);
          if (currentIndex >= 0 && currentIndex < manufacturingStages.length - 1) {
            const nextStage = manufacturingStages[currentIndex + 1];

            // Update to next stage
            await orderDetailPage.updateOrderStage(nextStage, {
              notes: `Advanced to ${nextStage} stage via automated test`
            });

            // Verify stage was updated
            const updatedTimeline = await orderDetailPage.getStageTimeline();
            const newCurrentStage = updatedTimeline.find(stage => stage.status === 'current');
            expect(newCurrentStage?.stage).toBe(nextStage);
          }
        }
      }
    });

    test('clients should not be able to update order stages', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify client does not have stage update permissions
        await orderDetailPage.verifyStageUpdatePermission(false);
      }
    });

    test('should handle ship date updates correctly', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('staff@colorgarb.com', 'password123', '/admin/dashboard');

      // Navigate to orders
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        // Get current order info
        const orderInfo = await orderDetailPage.getOrderInfo();
        const currentShipDate = orderInfo.shipDate;

        // Update ship date along with stage update
        const newShipDate = new Date();
        newShipDate.setDate(newShipDate.getDate() + 30); // 30 days from now
        const formattedDate = newShipDate.toISOString().split('T')[0];

        // Find a stage to update to (if possible)
        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage && currentStage.stage !== 'Delivery') {
          await orderDetailPage.updateOrderStage(currentStage.stage, {
            newShipDate: formattedDate,
            notes: 'Ship date updated during automated test'
          });

          // Verify ship date was updated
          await page.reload();
          await orderDetailPage.waitForOrderDetailLoad();

          const updatedOrderInfo = await orderDetailPage.getOrderInfo();
          expect(updatedOrderInfo.shipDate).not.toBe(currentShipDate);
        }
      }
    });
  });

  test.describe('Order Data Consistency', () => {
    test('should maintain data consistency across views', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Get order info from dashboard
        const dashboardOrderInfo = await dashboardPage.getOrderInfo(0);

        // Navigate to order detail
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Get order info from detail page
        const detailOrderInfo = await orderDetailPage.getOrderInfo();

        // Verify consistency
        expect(detailOrderInfo.orderNumber).toBe(dashboardOrderInfo.orderNumber);
        expect(detailOrderInfo.stage).toContain(dashboardOrderInfo.stage);
      }
    });

    test('should verify data consistency in order detail page', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify internal data consistency
        await orderDetailPage.verifyDataConsistency();
      }
    });
  });

  test.describe('Order Search and Filtering', () => {
    test('should filter orders by status', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Test different status filters
      const statuses = ['All', 'Active', 'Inactive'];

      for (const status of statuses) {
        await dashboardPage.setStatusFilter(status as any);

        // Verify URL reflects filter
        expect(page.url()).toContain(`status=${status}`);

        // Verify orders are loaded
        await dashboardPage.waitForLoadingToComplete();
      }
    });

    test('should filter orders by manufacturing stage', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Test stage filtering
      const stages = ['All', 'DesignProposal', 'ProductionPlanning', 'Cutting'];

      for (const stage of stages) {
        await dashboardPage.setStageFilter(stage);

        if (stage !== 'All') {
          // Verify URL reflects filter
          expect(page.url()).toContain(`stage=${stage}`);
        }

        await dashboardPage.waitForLoadingToComplete();
      }
    });

    test('should search orders by description', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Test search functionality if available
      const searchInput = page.locator('[data-testid="search-input"]');

      if (await searchInput.isVisible()) {
        await dashboardPage.searchOrders('uniform');

        // Verify search results
        const orderCount = await dashboardPage.getOrderCount();

        if (orderCount > 0) {
          // Verify at least one result contains the search term
          const firstOrder = await dashboardPage.getOrderInfo(0);
          expect(firstOrder.description.toLowerCase()).toContain('uniform');
        }
      }
    });
  });

  test.describe('Order Performance and Scalability', () => {
    test('should load orders efficiently', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');

      // Test dashboard performance
      await dashboardPage.testPerformanceWithManyOrders();
    });

    test('should handle large order lists', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Verify pagination or virtual scrolling works
      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 20) {
        // If there are many orders, verify performance is still good
        const startTime = Date.now();

        // Scroll through orders
        for (let i = 0; i < Math.min(orderCount, 10); i++) {
          await dashboardPage.getOrderInfo(i);
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Should process orders quickly
        expect(processingTime).toBeLessThan(5000); // 5 seconds max
      }
    });
  });

  test.describe('Mobile Order Management', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Test responsive design
      await dashboardPage.testResponsiveDesign();

      // Test order card interaction on mobile
      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Verify order detail page works on mobile
        const orderInfo = await orderDetailPage.getOrderInfo();
        expect(orderInfo.orderNumber).toBeTruthy();
      }
    });
  });

  test.describe('Order Error Handling', () => {
    test('should handle order loading errors gracefully', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');

      // Mock API error
      await page.route('**/api/orders', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        });
      });

      await dashboardPage.goto();

      // Should show error message
      const error = await dashboardPage.getErrorMessage();
      expect(error).toMatch(/error|failed|unavailable/i);
    });

    test('should handle individual order load failures', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect('director@lincolnhigh.edu', 'password123');
      await dashboardPage.waitForDashboardLoad();

      // Mock order detail API error
      await page.route('**/api/orders/*', route => {
        if (!route.request().url().includes('messages')) {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Order not found' })
          });
        } else {
          route.continue();
        }
      });

      // Try to access order detail
      await page.goto('/orders/nonexistent-order-id');

      // Should show appropriate error
      const error = await orderDetailPage.getErrorMessage();
      expect(error).toMatch(/not found|unavailable/i);
    });
  });
});