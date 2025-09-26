import { test, expect } from '@playwright/test';
import { AdminMessageInboxPage } from '../page-objects/AdminMessageInboxPage';

/**
 * Demo Test Suite for Admin Message Inbox
 * Visual demonstration of test capabilities with screenshots
 * This suite showcases the comprehensive testing approach for stakeholder review
 */

test.describe('Admin Message Inbox - Visual Demo', () => {
  let adminMessageInboxPage: AdminMessageInboxPage;

  test.use({
    storageState: 'tests/auth-states/staff.json',
    video: 'on', // Record video for demo
    screenshot: 'on' // Take screenshots on all actions
  });

  test.beforeEach(async ({ page }) => {
    adminMessageInboxPage = new AdminMessageInboxPage(page);
  });

  test('Complete Admin Message Inbox Workflow Demo', async ({ page }) => {
    // Step 1: Navigate to Admin Message Inbox
    console.log('🎬 Demo Step 1: Navigating to Admin Message Inbox');
    await adminMessageInboxPage.navigate();
    await page.screenshot({ path: 'test-results/demo/01-navigation-complete.png', fullPage: true });

    // Step 2: Verify page rendering and components
    console.log('🎬 Demo Step 2: Verifying page components');
    await expect(adminMessageInboxPage.pageTitle).toBeVisible();
    await expect(adminMessageInboxPage.pageTitle).toHaveText('Admin Message Inbox');

    // Highlight the unread badge if present
    try {
      const unreadCount = await adminMessageInboxPage.getUnreadCount();
      console.log(`📧 Unread messages: ${unreadCount}`);
    } catch {
      console.log('📧 No unread messages currently');
    }

    await page.screenshot({ path: 'test-results/demo/02-page-header.png' });

    // Step 3: Demonstrate filter expansion
    console.log('🎬 Demo Step 3: Expanding filters section');
    await adminMessageInboxPage.expandFilters();
    await page.screenshot({ path: 'test-results/demo/03-filters-expanded.png', fullPage: true });

    // Step 4: Demonstrate search functionality
    console.log('🎬 Demo Step 4: Testing search functionality');
    await adminMessageInboxPage.searchMessages('message');
    await adminMessageInboxPage.waitForMessagesLoad();
    await page.screenshot({ path: 'test-results/demo/04-search-applied.png', fullPage: true });

    // Step 5: Demonstrate message type filter
    console.log('🎬 Demo Step 5: Testing message type filter');
    await adminMessageInboxPage.filterByMessageType('General');
    await adminMessageInboxPage.waitForMessagesLoad();
    await page.screenshot({ path: 'test-results/demo/05-type-filter.png', fullPage: true });

    // Step 6: Clear filters and show all messages
    console.log('🎬 Demo Step 6: Clearing filters');
    await adminMessageInboxPage.clearFilters();
    await adminMessageInboxPage.waitForMessagesLoad();
    await page.screenshot({ path: 'test-results/demo/06-filters-cleared.png', fullPage: true });

    // Step 7: Demonstrate message selection
    console.log('🎬 Demo Step 7: Testing message selection');
    const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

    if (messageCount > 0) {
      await adminMessageInboxPage.selectMessage(0);
      const selectedCount = await adminMessageInboxPage.getSelectedCount();
      console.log(`✅ Selected ${selectedCount} message(s)`);
      await page.screenshot({ path: 'test-results/demo/07-message-selected.png', fullPage: true });

      // Step 8: Demonstrate bulk read functionality
      if (await adminMessageInboxPage.markReadButton.isVisible()) {
        console.log('🎬 Demo Step 8: Marking selected messages as read');
        await adminMessageInboxPage.markSelectedAsRead();
        await page.screenshot({ path: 'test-results/demo/08-marked-as-read.png', fullPage: true });
      }

      // Step 9: Demonstrate message center integration
      console.log('🎬 Demo Step 9: Opening message conversation');
      await adminMessageInboxPage.openMessage(0);
      await page.screenshot({ path: 'test-results/demo/09-message-center-opened.png', fullPage: true });

      await adminMessageInboxPage.closeMessageCenter();
      await page.screenshot({ path: 'test-results/demo/10-message-center-closed.png', fullPage: true });
    } else {
      console.log('📭 No messages available for selection demo');
      await page.screenshot({ path: 'test-results/demo/07-no-messages.png', fullPage: true });
    }

    // Step 10: Demonstrate refresh functionality
    console.log('🎬 Demo Step 10: Testing refresh functionality');
    await adminMessageInboxPage.refreshMessages();
    await page.screenshot({ path: 'test-results/demo/11-after-refresh.png', fullPage: true });

    // Final screenshot
    console.log('🎬 Demo Complete: Final state');
    await page.screenshot({ path: 'test-results/demo/12-final-state.png', fullPage: true });

    console.log('🎉 Demo workflow completed successfully!');
    console.log('📁 Screenshots saved to test-results/demo/');
    console.log('🎥 Video recording available in test-results/');
  });

  test('Mobile Responsive Design Demo', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log('📱 Mobile Demo: Admin Message Inbox on mobile device');
    await adminMessageInboxPage.navigate();
    await page.screenshot({ path: 'test-results/demo/mobile-01-overview.png', fullPage: true });

    // Test mobile filter interaction
    await adminMessageInboxPage.expandFilters();
    await page.screenshot({ path: 'test-results/demo/mobile-02-filters.png', fullPage: true });

    // Test mobile message interaction
    const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();
    if (messageCount > 0) {
      await adminMessageInboxPage.selectMessage(0);
      await page.screenshot({ path: 'test-results/demo/mobile-03-selection.png', fullPage: true });
    }

    console.log('📱 Mobile demo completed');
  });

  test('Accessibility Features Demo', async ({ page }) => {
    console.log('♿ Accessibility Demo: Keyboard navigation and ARIA compliance');
    await adminMessageInboxPage.navigate();

    // Verify accessibility
    await adminMessageInboxPage.verifyAccessibility();
    await page.screenshot({ path: 'test-results/demo/a11y-01-overview.png', fullPage: true });

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(adminMessageInboxPage.refreshButton).toBeFocused();
    await page.screenshot({ path: 'test-results/demo/a11y-02-keyboard-focus.png' });

    console.log('♿ Accessibility demo completed');
  });

  test('Error Handling Demo', async ({ page }) => {
    console.log('🚨 Error Handling Demo: Graceful error states');
    await adminMessageInboxPage.navigate();

    // Check for error states (may not be present in normal conditions)
    const hasError = await adminMessageInboxPage.hasError();
    if (hasError) {
      const errorMessage = await adminMessageInboxPage.getErrorMessage();
      console.log(`🚨 Error detected: ${errorMessage}`);
      await page.screenshot({ path: 'test-results/demo/error-state.png', fullPage: true });
    } else {
      console.log('✅ No errors currently displayed - system healthy');
      await page.screenshot({ path: 'test-results/demo/healthy-state.png', fullPage: true });
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Generate test metadata for each demo
    const metadata = {
      testName: testInfo.title,
      duration: testInfo.duration,
      status: testInfo.status,
      browser: testInfo.project.name,
      timestamp: new Date().toISOString(),
      screenshots: testInfo.attachments
        .filter(attachment => attachment.name.includes('screenshot'))
        .map(attachment => attachment.path)
    };

    console.log(`📊 Test metadata:`, JSON.stringify(metadata, null, 2));
  });
});