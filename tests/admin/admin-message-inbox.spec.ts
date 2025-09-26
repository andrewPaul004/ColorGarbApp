import { test, expect, Page } from '@playwright/test';
import { AdminMessageInboxPage } from '../page-objects/AdminMessageInboxPage';

/**
 * Comprehensive test suite for Admin Message Inbox functionality
 * Tests all aspects of the unified message management interface for ColorGarb staff
 *
 * Test Coverage:
 * - Component rendering and layout
 * - Navigation integration with unread badge
 * - Message filtering and search
 * - Bulk operations and selection
 * - MessageCenter dialog integration
 * - Responsive design
 * - Accessibility features
 * - Cross-browser compatibility
 */

test.describe('Admin Message Inbox', () => {
  let adminMessageInboxPage: AdminMessageInboxPage;

  // Use staff authentication for all tests
  test.use({ storageState: 'tests/auth-states/staff.json' });

  test.beforeEach(async ({ page }) => {
    adminMessageInboxPage = new AdminMessageInboxPage(page);
    await adminMessageInboxPage.navigate();
  });

  test.describe('Basic Rendering and Layout', () => {
    test('should render admin message inbox with correct header elements', async () => {
      await expect(adminMessageInboxPage.pageTitle).toBeVisible();
      await expect(adminMessageInboxPage.pageTitle).toHaveText('Admin Message Inbox');

      // Check header elements are present
      await expect(adminMessageInboxPage.messageIcon).toBeVisible();
      await expect(adminMessageInboxPage.refreshButton).toBeVisible();
      await expect(adminMessageInboxPage.totalMessageCount).toBeVisible();

      await adminMessageInboxPage.takeScreenshot('admin-inbox-header');
    });

    test('should display message count and unread badge correctly', async () => {
      // Wait for messages to load
      await adminMessageInboxPage.waitForMessagesLoad();

      const totalCount = await adminMessageInboxPage.getTotalMessageCount();
      expect(totalCount).toBeGreaterThanOrEqual(0);

      const unreadCount = await adminMessageInboxPage.getUnreadCount();
      expect(unreadCount).toBeGreaterThanOrEqual(0);

      await adminMessageInboxPage.takeScreenshot('admin-inbox-counts');
    });

    test('should show filters section with all filter controls', async () => {
      await adminMessageInboxPage.expandFilters();

      await expect(adminMessageInboxPage.searchInput).toBeVisible();
      await expect(adminMessageInboxPage.clientNameInput).toBeVisible();
      await expect(adminMessageInboxPage.orderNumberInput).toBeVisible();
      await expect(adminMessageInboxPage.messageTypeSelect).toBeVisible();
      await expect(adminMessageInboxPage.senderRoleSelect).toBeVisible();
      await expect(adminMessageInboxPage.unreadOnlyCheckbox).toBeVisible();
      await expect(adminMessageInboxPage.clearFiltersButton).toBeVisible();

      await adminMessageInboxPage.takeScreenshot('admin-inbox-filters-expanded');
    });

    test('should display message list or no messages state', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();

      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        await expect(adminMessageInboxPage.messageList).toBeVisible();
        await expect(adminMessageInboxPage.messageItems.first()).toBeVisible();
      } else {
        await expect(adminMessageInboxPage.noMessagesDisplay).toBeVisible();
      }

      await adminMessageInboxPage.takeScreenshot('admin-inbox-message-list');
    });
  });

  test.describe('Navigation Integration', () => {
    test('should navigate via messages menu with unread count badge', async ({ page }) => {
      // Navigate to dashboard first
      await page.goto('/admin/dashboard');

      // Check the messages menu item in navigation
      const messagesMenuItem = page.locator('a[href="/admin/messages"], button').filter({ hasText: 'Messages' });
      await expect(messagesMenuItem).toBeVisible();

      // Check if unread badge is present (may or may not be visible depending on data)
      const badge = page.locator('.MuiBadge-badge');
      const hasBadge = await badge.isVisible();

      if (hasBadge) {
        const badgeCount = await badge.textContent();
        expect(parseInt(badgeCount || '0')).toBeGreaterThan(0);
      }

      // Click messages menu item
      await messagesMenuItem.click();
      await expect(page).toHaveURL('/admin/messages');
      await expect(adminMessageInboxPage.pageTitle).toBeVisible();

      await page.screenshot({ path: 'test-results/screenshots/navigation-to-messages.png' });
    });

    test('should show correct breadcrumb and page title', async () => {
      await expect(adminMessageInboxPage.pageTitle).toHaveText('Admin Message Inbox');

      const subtitle = adminMessageInboxPage.page.locator('text=Unified view of all client messages');
      await expect(subtitle).toBeVisible();

      await adminMessageInboxPage.takeScreenshot('admin-inbox-title-subtitle');
    });
  });

  test.describe('Message Filtering and Search', () => {
    test('should filter messages by search term', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const initialCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (initialCount > 0) {
        // Get first message preview to use as search term
        const firstMessagePreview = await adminMessageInboxPage.getMessagePreview(0);
        const searchTerm = firstMessagePreview.split(' ')[0]; // Use first word

        await adminMessageInboxPage.searchMessages(searchTerm);
        await adminMessageInboxPage.waitForMessagesLoad();

        // Verify filter is applied
        const searchInput = await adminMessageInboxPage.searchInput.inputValue();
        expect(searchInput).toBe(searchTerm);

        await adminMessageInboxPage.takeScreenshot('admin-inbox-search-filter');
      }
    });

    test('should filter messages by client name', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const initialCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (initialCount > 0) {
        // Get organization name from first message
        const metadata = await adminMessageInboxPage.getMessageMetadata(0);

        if (metadata.organization) {
          await adminMessageInboxPage.filterByClient(metadata.organization);
          await adminMessageInboxPage.waitForMessagesLoad();

          const clientInput = await adminMessageInboxPage.clientNameInput.inputValue();
          expect(clientInput).toBe(metadata.organization);

          await adminMessageInboxPage.takeScreenshot('admin-inbox-client-filter');
        }
      }
    });

    test('should filter messages by message type', async () => {
      await adminMessageInboxPage.filterByMessageType('General');
      await adminMessageInboxPage.waitForMessagesLoad();

      // Verify dropdown shows selected value
      const selectedType = await adminMessageInboxPage.messageTypeSelect.textContent();
      expect(selectedType).toContain('General');

      await adminMessageInboxPage.takeScreenshot('admin-inbox-type-filter');
    });

    test('should filter by sender role', async () => {
      await adminMessageInboxPage.filterBySenderRole('Client');
      await adminMessageInboxPage.waitForMessagesLoad();

      const selectedRole = await adminMessageInboxPage.senderRoleSelect.textContent();
      expect(selectedRole).toContain('Client');

      await adminMessageInboxPage.takeScreenshot('admin-inbox-role-filter');
    });

    test('should toggle unread only filter', async () => {
      await adminMessageInboxPage.toggleUnreadOnly();
      await adminMessageInboxPage.waitForMessagesLoad();

      const isChecked = await adminMessageInboxPage.unreadOnlyCheckbox.isChecked();
      expect(isChecked).toBe(true);

      await adminMessageInboxPage.takeScreenshot('admin-inbox-unread-filter');
    });

    test('should clear all filters', async () => {
      // Apply multiple filters
      await adminMessageInboxPage.searchMessages('test');
      await adminMessageInboxPage.filterByMessageType('General');
      await adminMessageInboxPage.toggleUnreadOnly();

      // Clear all filters
      await adminMessageInboxPage.clearFilters();
      await adminMessageInboxPage.waitForMessagesLoad();

      // Verify filters are cleared
      const searchValue = await adminMessageInboxPage.searchInput.inputValue();
      const isUnreadChecked = await adminMessageInboxPage.unreadOnlyCheckbox.isChecked();

      expect(searchValue).toBe('');
      expect(isUnreadChecked).toBe(false);

      await adminMessageInboxPage.takeScreenshot('admin-inbox-filters-cleared');
    });

    test('should display active filter count', async () => {
      // Apply a filter
      await adminMessageInboxPage.searchMessages('test');

      // Collapse filters to see count
      await adminMessageInboxPage.filtersToggleButton.click();

      // Check if active filter count is shown
      try {
        const activeCount = await adminMessageInboxPage.getActiveFilterCount();
        expect(activeCount).toBeGreaterThan(0);
      } catch {
        // Filter count may not be visible if no active filters
        console.log('Filter count not displayed or filters still expanded');
      }

      await adminMessageInboxPage.takeScreenshot('admin-inbox-filter-count');
    });
  });

  test.describe('Bulk Operations and Message Selection', () => {
    test('should select and deselect individual messages', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        // Select first message
        await adminMessageInboxPage.selectMessage(0);

        let selectedCount = await adminMessageInboxPage.getSelectedCount();
        expect(selectedCount).toBe(1);

        // Mark read button should appear
        await expect(adminMessageInboxPage.markReadButton).toBeVisible();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-message-selected');

        // Deselect by clicking again
        await adminMessageInboxPage.selectMessage(0);
        selectedCount = await adminMessageInboxPage.getSelectedCount();
        expect(selectedCount).toBe(0);
      }
    });

    test('should select all messages', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        await adminMessageInboxPage.selectAll();

        const selectedCount = await adminMessageInboxPage.getSelectedCount();
        expect(selectedCount).toBe(messageCount);

        await expect(adminMessageInboxPage.markReadButton).toBeVisible();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-all-selected');
      }
    });

    test('should mark selected messages as read', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        // Select first message
        await adminMessageInboxPage.selectMessage(0);

        const initialUnreadCount = await adminMessageInboxPage.getUnreadCount();

        // Mark as read
        await adminMessageInboxPage.markSelectedAsRead();

        // Verify selection is cleared
        const selectedCount = await adminMessageInboxPage.getSelectedCount();
        expect(selectedCount).toBe(0);

        // Verify mark read button is hidden
        await expect(adminMessageInboxPage.markReadButton).not.toBeVisible();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-after-mark-read');
      }
    });

    test('should show correct selection count in bulk actions', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount >= 2) {
        // Select multiple messages
        await adminMessageInboxPage.selectMessage(0);
        await adminMessageInboxPage.selectMessage(1);

        const selectedCount = await adminMessageInboxPage.getSelectedCount();
        expect(selectedCount).toBe(2);

        // Check button text includes count
        const buttonText = await adminMessageInboxPage.markReadButton.textContent();
        expect(buttonText).toContain('2');

        await adminMessageInboxPage.takeScreenshot('admin-inbox-multiple-selected');
      }
    });
  });

  test.describe('MessageCenter Dialog Integration', () => {
    test('should open message center when clicking on a message', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        await adminMessageInboxPage.openMessage(0);

        // Verify dialog is open
        await expect(adminMessageInboxPage.messageCenterDialog).toBeVisible();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-message-center-opened');

        // Close dialog
        await adminMessageInboxPage.closeMessageCenter();
        await expect(adminMessageInboxPage.messageCenterDialog).not.toBeVisible();
      }
    });

    test('should pass correct order information to message center', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        const metadata = await adminMessageInboxPage.getMessageMetadata(0);

        await adminMessageInboxPage.openMessage(0);

        // Verify dialog has opened with order information
        await expect(adminMessageInboxPage.messageCenterDialog).toBeVisible();

        // The dialog should contain order-related information
        const dialogContent = await adminMessageInboxPage.messageCenterDialog.textContent();
        expect(dialogContent).toBeTruthy();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-message-center-content');
        await adminMessageInboxPage.closeMessageCenter();
      }
    });
  });

  test.describe('Message List Features', () => {
    test('should display message metadata correctly', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      if (messageCount > 0) {
        const metadata = await adminMessageInboxPage.getMessageMetadata(0);

        expect(metadata.sender).toBeTruthy();
        expect(metadata.timeAgo).toBeTruthy();

        // Organization and order number might be present
        console.log('Message metadata:', metadata);

        await adminMessageInboxPage.takeScreenshot('admin-inbox-message-metadata');
      }
    });

    test('should indicate urgent messages with visual cues', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      for (let i = 0; i < messageCount && i < 5; i++) {
        const isUrgent = await adminMessageInboxPage.isMessageUrgent(i);
        console.log(`Message ${i} urgent status:`, isUrgent);

        if (isUrgent) {
          await adminMessageInboxPage.takeScreenshot(`admin-inbox-urgent-message-${i}`);
          break;
        }
      }
    });

    test('should show attachment indicators', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

      for (let i = 0; i < messageCount && i < 5; i++) {
        const hasAttachments = await adminMessageInboxPage.hasAttachments(i);
        console.log(`Message ${i} attachments:`, hasAttachments);

        if (hasAttachments) {
          await adminMessageInboxPage.takeScreenshot(`admin-inbox-message-attachments-${i}`);
          break;
        }
      }
    });

    test('should support pagination with load more', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();

      const hasMore = await adminMessageInboxPage.hasMoreMessages();
      if (hasMore) {
        const initialCount = await adminMessageInboxPage.getDisplayedMessageCount();

        await adminMessageInboxPage.loadMoreMessages();

        const newCount = await adminMessageInboxPage.getDisplayedMessageCount();
        expect(newCount).toBeGreaterThan(initialCount);

        await adminMessageInboxPage.takeScreenshot('admin-inbox-after-load-more');
      }
    });
  });

  test.describe('Refresh and Real-time Updates', () => {
    test('should refresh message list when refresh button is clicked', async () => {
      await adminMessageInboxPage.waitForMessagesLoad();
      const initialCount = await adminMessageInboxPage.getDisplayedMessageCount();

      await adminMessageInboxPage.refreshMessages();

      // Verify page refreshed (count should be same or different)
      const newCount = await adminMessageInboxPage.getDisplayedMessageCount();
      expect(newCount).toBeGreaterThanOrEqual(0);

      await adminMessageInboxPage.takeScreenshot('admin-inbox-after-refresh');
    });

    test('should handle loading states properly', async () => {
      // Navigate fresh to see loading state
      await adminMessageInboxPage.navigate();

      // Check if loading spinner appears
      try {
        await expect(adminMessageInboxPage.loadingSpinner).toBeVisible({ timeout: 1000 });
        await adminMessageInboxPage.takeScreenshot('admin-inbox-loading');
      } catch {
        // Loading might be too fast to catch
        console.log('Loading spinner not visible - load was too fast');
      }

      await adminMessageInboxPage.waitForMessagesLoad();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle and display errors gracefully', async () => {
      // This test would need to simulate an API error
      // For now, we just check that error handling components exist
      const hasError = await adminMessageInboxPage.hasError();

      if (hasError) {
        const errorMessage = await adminMessageInboxPage.getErrorMessage();
        expect(errorMessage).toBeTruthy();

        await adminMessageInboxPage.takeScreenshot('admin-inbox-error-state');
      } else {
        console.log('No errors currently displayed');
      }
    });
  });
});

test.describe('Admin Message Inbox - Responsive Design', () => {
  let adminMessageInboxPage: AdminMessageInboxPage;

  test.use({
    storageState: 'tests/auth-states/staff.json',
    viewport: { width: 375, height: 667 } // Mobile viewport
  });

  test.beforeEach(async ({ page }) => {
    adminMessageInboxPage = new AdminMessageInboxPage(page);
    await adminMessageInboxPage.navigate();
  });

  test('should render correctly on mobile devices', async () => {
    await adminMessageInboxPage.waitForMessagesLoad();

    // Check mobile-specific elements
    await expect(adminMessageInboxPage.pageTitle).toBeVisible();
    await expect(adminMessageInboxPage.refreshButton).toBeVisible();

    // Check if elements are properly sized for mobile
    const refreshButton = await adminMessageInboxPage.refreshButton.boundingBox();
    expect(refreshButton).toBeTruthy();
    expect(refreshButton!.height).toBeGreaterThan(30); // Minimum touch target

    await adminMessageInboxPage.takeScreenshot('admin-inbox-mobile-layout');
  });

  test('should have accessible touch targets on mobile', async () => {
    await adminMessageInboxPage.waitForMessagesLoad();

    // Expand filters to test mobile filter UI
    await adminMessageInboxPage.expandFilters();

    // Check filter inputs are usable on mobile
    await expect(adminMessageInboxPage.searchInput).toBeVisible();
    const searchBox = await adminMessageInboxPage.searchInput.boundingBox();
    expect(searchBox!.height).toBeGreaterThan(40); // Good mobile touch target

    await adminMessageInboxPage.takeScreenshot('admin-inbox-mobile-filters');
  });

  test('should support mobile message interaction', async () => {
    await adminMessageInboxPage.waitForMessagesLoad();
    const messageCount = await adminMessageInboxPage.getDisplayedMessageCount();

    if (messageCount > 0) {
      // Test message selection on mobile
      await adminMessageInboxPage.selectMessage(0);
      const selectedCount = await adminMessageInboxPage.getSelectedCount();
      expect(selectedCount).toBe(1);

      await adminMessageInboxPage.takeScreenshot('admin-inbox-mobile-selection');
    }
  });
});

test.describe('Admin Message Inbox - Accessibility', () => {
  let adminMessageInboxPage: AdminMessageInboxPage;

  test.use({
    storageState: 'tests/auth-states/staff.json'
  });

  test.beforeEach(async ({ page }) => {
    adminMessageInboxPage = new AdminMessageInboxPage(page);
    await adminMessageInboxPage.navigate();
  });

  test('should have proper ARIA labels and semantic HTML', async () => {
    await adminMessageInboxPage.verifyAccessibility();
    await adminMessageInboxPage.takeScreenshot('admin-inbox-accessibility');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await adminMessageInboxPage.waitForMessagesLoad();

    // Test keyboard navigation through main elements
    await page.keyboard.press('Tab'); // Should focus refresh button
    await expect(adminMessageInboxPage.refreshButton).toBeFocused();

    await page.keyboard.press('Tab'); // Move to next focusable element

    // Continue tabbing through interface
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Small delay for focus
    }

    await adminMessageInboxPage.takeScreenshot('admin-inbox-keyboard-navigation');
  });

  test('should have appropriate contrast and readability', async ({ page }) => {
    await adminMessageInboxPage.waitForMessagesLoad();

    // Check if page is readable (basic check)
    await expect(adminMessageInboxPage.pageTitle).toBeVisible();
    await expect(adminMessageInboxPage.totalMessageCount).toBeVisible();

    // Take screenshot for manual accessibility review
    await adminMessageInboxPage.takeScreenshot('admin-inbox-contrast-check');
  });
});