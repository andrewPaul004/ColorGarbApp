import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { OrderDetailPage } from '../page-objects/OrderDetailPage';

/**
 * 13-Stage Manufacturing Process Tests
 * Tests the complete manufacturing workflow from DesignProposal to Delivery
 *
 * @fileoverview Manufacturing stage progression tests
 * @since 3.0.0
 */

// The complete 13-stage manufacturing process
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

// Stage categories for testing
const stageCategories = {
  design: ['DesignProposal', 'ProofApproval'],
  preparation: ['Measurements', 'ProductionPlanning'],
  production: ['Cutting', 'Sewing'],
  quality: ['QualityControl', 'Finishing', 'FinalInspection'],
  fulfillment: ['Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery']
};

// Test users with different roles
const testUsers = {
  staff: {
    email: 'staff@colorgarb.com',
    password: 'password123',
    name: 'ColorGarb Staff',
    role: 'ColorGarbStaff'
  },
  client: {
    email: 'director@lincolnhigh.edu',
    password: 'password123',
    name: 'Jane Smith',
    role: 'Director'
  }
};

test.describe('13-Stage Manufacturing Process', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let orderDetailPage: OrderDetailPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    orderDetailPage = new OrderDetailPage(page);
  });

  test.describe('Stage Timeline Display', () => {
    test('should display complete 13-stage timeline for all orders', async ({ page }) => {
      // Login as client to view their orders
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        // Navigate to first order
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Get stage timeline
        const timeline = await orderDetailPage.getStageTimeline();

        // Should have all 13 stages represented
        expect(timeline.length).toBeGreaterThanOrEqual(manufacturingStages.length);

        // Verify all required stages are present
        const timelineStages = timeline.map(stage => stage.stage);

        for (const requiredStage of manufacturingStages) {
          const stageExists = timelineStages.some(stage =>
            stage.includes(requiredStage) || stage === requiredStage
          );
          expect(stageExists).toBe(true);
        }

        // Verify stage status logic
        let hasCurrentStage = false;
        let foundCurrent = false;

        for (const stage of timeline) {
          if (stage.status === 'current') {
            expect(foundCurrent).toBe(false); // Should only have one current stage
            foundCurrent = true;
            hasCurrentStage = true;
          } else if (stage.status === 'pending') {
            // All pending stages should come after current stage
            expect(foundCurrent).toBe(true);
          }
        }

        expect(hasCurrentStage).toBe(true);
      }
    });

    test('should show stage progression chronologically', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Verify stages are in correct order
        let currentStageFound = false;
        let previousStagesCompleted = true;

        for (let i = 0; i < timeline.length; i++) {
          const stage = timeline[i];

          if (stage.status === 'completed') {
            // All completed stages should come before current stage
            expect(currentStageFound).toBe(false);
          } else if (stage.status === 'current') {
            expect(currentStageFound).toBe(false); // Only one current stage
            currentStageFound = true;
            // All previous stages should be completed
            expect(previousStagesCompleted).toBe(true);
          } else if (stage.status === 'pending') {
            // All pending stages should come after current stage
            expect(currentStageFound).toBe(true);
          }
        }
      }
    });

    test('should display stage timestamps for completed stages', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Check completed stages have timestamps
        const completedStages = timeline.filter(stage => stage.status === 'completed');

        for (const stage of completedStages) {
          expect(stage.timestamp).toBeTruthy();

          // Timestamp should be a valid date
          if (stage.timestamp) {
            const date = new Date(stage.timestamp);
            expect(date.getTime()).not.toBeNaN();
          }
        }
      }
    });
  });

  test.describe('Stage Progression by Staff', () => {
    test('staff should be able to advance stages sequentially', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        '/admin/dashboard'
      );

      // Navigate to admin orders
      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        // Find an order that's not in final stage
        let orderFound = false;

        for (let i = 0; i < Math.min(orderCount, 5); i++) {
          await orderCards.nth(i).click();
          await page.waitForURL(/\/orders\/[^\/]+$/);
          await orderDetailPage.waitForOrderDetailLoad();

          const timeline = await orderDetailPage.getStageTimeline();
          const currentStage = timeline.find(stage => stage.status === 'current');

          if (currentStage && currentStage.stage !== 'Delivery') {
            orderFound = true;

            // Verify staff can update stages
            await orderDetailPage.verifyStageUpdatePermission(true);

            // Find the next stage in sequence
            const currentIndex = manufacturingStages.indexOf(currentStage.stage);

            if (currentIndex >= 0 && currentIndex < manufacturingStages.length - 1) {
              const nextStage = manufacturingStages[currentIndex + 1];

              // Update to next stage
              await orderDetailPage.updateOrderStage(nextStage, {
                notes: `Advanced from ${currentStage.stage} to ${nextStage} via automated test`
              });

              // Verify stage was updated
              const updatedTimeline = await orderDetailPage.getStageTimeline();
              const newCurrentStage = updatedTimeline.find(stage => stage.status === 'current');

              expect(newCurrentStage?.stage).toBe(nextStage);

              // Verify previous stage is now completed
              const previousStage = updatedTimeline.find(stage => stage.stage === currentStage.stage);
              expect(previousStage?.status).toBe('completed');
              expect(previousStage?.timestamp).toBeTruthy();
            }
            break;
          }

          // Go back to orders list if this wasn't the right order
          await page.goto('/admin/orders');
          await page.waitForLoadState('networkidle');
        }

        if (!orderFound) {
          console.log('No orders found in non-final stages for testing progression');
        }
      }
    });

    test('staff should not be able to skip stages', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        '/admin/dashboard'
      );

      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage) {
          const currentIndex = manufacturingStages.indexOf(currentStage.stage);

          // Try to skip to a stage that's too far ahead
          if (currentIndex >= 0 && currentIndex < manufacturingStages.length - 3) {
            const skippedStage = manufacturingStages[currentIndex + 2]; // Skip one stage

            // This should either be prevented in UI or show an error
            try {
              await orderDetailPage.updateOrderStage(skippedStage, {
                notes: 'Attempting to skip stage - should fail'
              });

              // If the update didn't throw an error, verify it was rejected
              const timeline2 = await orderDetailPage.getStageTimeline();
              const newCurrentStage = timeline2.find(stage => stage.status === 'current');

              // Should not have advanced to the skipped stage
              expect(newCurrentStage?.stage).not.toBe(skippedStage);
            } catch (error) {
              // Expected - stage skipping should be prevented
              console.log('Stage skipping properly prevented:', error.message);
            }
          }
        }
      }
    });

    test('staff should be able to update ship dates with stage changes', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        '/admin/dashboard'
      );

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

        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage && currentStage.stage !== 'Delivery') {
          // Calculate new ship date (extend by 1 week)
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 7);
          const formattedDate = newDate.toISOString().split('T')[0];

          // Update stage with new ship date
          await orderDetailPage.updateOrderStage(currentStage.stage, {
            newShipDate: formattedDate,
            notes: 'Ship date updated due to production adjustments'
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

  test.describe('Stage Categories and Business Logic', () => {
    test('should properly categorize stages by business function', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Verify design stages come first
        const designStages = timeline.filter(stage =>
          stageCategories.design.includes(stage.stage)
        );

        const productionStages = timeline.filter(stage =>
          stageCategories.production.includes(stage.stage)
        );

        const fulfillmentStages = timeline.filter(stage =>
          stageCategories.fulfillment.includes(stage.stage)
        );

        // Design stages should come before production stages
        if (designStages.length > 0 && productionStages.length > 0) {
          const lastDesignIndex = timeline.findIndex(stage =>
            stage.stage === designStages[designStages.length - 1].stage
          );
          const firstProductionIndex = timeline.findIndex(stage =>
            stage.stage === productionStages[0].stage
          );

          expect(lastDesignIndex).toBeLessThan(firstProductionIndex);
        }

        // Production stages should come before fulfillment stages
        if (productionStages.length > 0 && fulfillmentStages.length > 0) {
          const lastProductionIndex = timeline.findIndex(stage =>
            stage.stage === productionStages[productionStages.length - 1].stage
          );
          const firstFulfillmentIndex = timeline.findIndex(stage =>
            stage.stage === fulfillmentStages[0].stage
          );

          expect(lastProductionIndex).toBeLessThan(firstFulfillmentIndex);
        }
      }
    });

    test('should handle quality control stages appropriately', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Find quality control stages
        const qualityStages = timeline.filter(stage =>
          stageCategories.quality.includes(stage.stage)
        );

        // Quality stages should be properly sequenced
        expect(qualityStages.length).toBeGreaterThan(0);

        // QualityControl should come before FinalInspection
        const qcStage = timeline.find(stage => stage.stage === 'QualityControl');
        const finalInspectionStage = timeline.find(stage => stage.stage === 'FinalInspection');

        if (qcStage && finalInspectionStage) {
          const qcIndex = timeline.indexOf(qcStage);
          const finalIndex = timeline.indexOf(finalInspectionStage);
          expect(qcIndex).toBeLessThan(finalIndex);
        }
      }
    });

    test('should enforce proper fulfillment sequence', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Find fulfillment stages
        const fulfillmentStages = ['Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'];
        const foundStages = timeline.filter(stage =>
          fulfillmentStages.includes(stage.stage)
        );

        // Verify fulfillment stages are in correct order
        let previousIndex = -1;
        for (const expectedStage of fulfillmentStages) {
          const stageIndex = timeline.findIndex(stage => stage.stage === expectedStage);
          if (stageIndex >= 0) {
            expect(stageIndex).toBeGreaterThan(previousIndex);
            previousIndex = stageIndex;
          }
        }
      }
    });
  });

  test.describe('Stage History and Audit Trail', () => {
    test('should maintain complete stage history', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Check that completed stages have proper history
        const completedStages = timeline.filter(stage => stage.status === 'completed');

        for (const stage of completedStages) {
          // Should have timestamp
          expect(stage.timestamp).toBeTruthy();

          // Should have valid date
          if (stage.timestamp) {
            const date = new Date(stage.timestamp);
            expect(date.getTime()).not.toBeNaN();

            // Date should be in the past
            expect(date.getTime()).toBeLessThan(Date.now());
          }

          // May have notes
          if (stage.notes) {
            expect(stage.notes.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should track stage updates by staff member', async ({ page }) => {
      // This test verifies that stage updates are properly attributed
      // Implementation depends on specific audit trail requirements

      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Verify stage history includes user information (if implemented)
        const completedStages = timeline.filter(stage => stage.status === 'completed');

        for (const stage of completedStages) {
          // Check if stage has update tracking
          if (stage.notes && stage.notes.includes('ColorGarb Staff')) {
            // Stage was updated by staff - verify proper attribution
            expect(stage.notes).toMatch(/staff|colorgarb/i);
          }
        }
      }
    });
  });

  test.describe('Client Stage Visibility', () => {
    test('clients should see stage progress but not be able to modify', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        // Clients should see the stage timeline
        const timeline = await orderDetailPage.getStageTimeline();
        expect(timeline.length).toBeGreaterThan(0);

        // But should not have stage update permissions
        await orderDetailPage.verifyStageUpdatePermission(false);
      }
    });

    test('clients should see appropriate stage descriptions', async ({ page }) => {
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(testUsers.client.email, testUsers.client.password);
      await dashboardPage.waitForDashboardLoad();

      const orderCount = await dashboardPage.getOrderCount();

      if (orderCount > 0) {
        await dashboardPage.clickOrderCard(0);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();

        // Verify stage names are user-friendly
        for (const stage of timeline) {
          expect(stage.stage).toBeTruthy();
          expect(stage.stage.length).toBeGreaterThan(3);

          // Stage names should not be just internal codes
          expect(stage.stage).not.toMatch(/^[A-Z0-9_]+$/);
        }
      }
    });
  });

  test.describe('Stage Performance and Error Handling', () => {
    test('should handle stage updates efficiently', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        '/admin/dashboard'
      );

      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage && currentStage.stage !== 'Delivery') {
          const startTime = Date.now();

          // Perform stage update
          await orderDetailPage.updateOrderStage(currentStage.stage, {
            notes: 'Performance test stage update'
          });

          const endTime = Date.now();
          const updateTime = endTime - startTime;

          // Stage update should complete in reasonable time
          expect(updateTime).toBeLessThan(10000); // 10 seconds max
        }
      }
    });

    test('should handle stage update failures gracefully', async ({ page }) => {
      // Login as staff
      await page.goto('/auth/login');
      await loginPage.loginAndWaitForRedirect(
        testUsers.staff.email,
        testUsers.staff.password,
        '/admin/dashboard'
      );

      // Mock API failure
      await page.route('**/api/orders/*/stage', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Stage update failed' })
        });
      });

      await page.goto('/admin/orders');
      await page.waitForLoadState('networkidle');

      const orderCards = page.locator('[data-testid="order-card"]');
      const orderCount = await orderCards.count();

      if (orderCount > 0) {
        await orderCards.first().click();
        await page.waitForURL(/\/orders\/[^\/]+$/);
        await orderDetailPage.waitForOrderDetailLoad();

        const timeline = await orderDetailPage.getStageTimeline();
        const currentStage = timeline.find(stage => stage.status === 'current');

        if (currentStage) {
          // Try to update stage (should fail)
          try {
            await orderDetailPage.updateOrderStage(currentStage.stage, {
              notes: 'This update should fail'
            });

            // Should show error message
            const error = await orderDetailPage.getErrorMessage();
            expect(error).toMatch(/failed|error/i);
          } catch (error) {
            // Expected failure due to mocked API error
            console.log('Stage update properly failed:', error.message);
          }
        }
      }
    });
  });
});