import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for AdminMessageInbox component
 * Provides methods for interacting with the admin message inbox functionality
 *
 * @extends BasePage
 */
export class AdminMessageInboxPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator;
  readonly messageIcon: Locator;
  readonly unreadBadge: Locator;
  readonly refreshButton: Locator;
  readonly markReadButton: Locator;
  readonly totalMessageCount: Locator;

  // Filter elements
  readonly filtersToggleButton: Locator;
  readonly searchInput: Locator;
  readonly clientNameInput: Locator;
  readonly orderNumberInput: Locator;
  readonly messageTypeSelect: Locator;
  readonly senderRoleSelect: Locator;
  readonly unreadOnlyCheckbox: Locator;
  readonly clearFiltersButton: Locator;
  readonly filtersActiveCount: Locator;

  // Bulk selection elements
  readonly selectAllCheckbox: Locator;
  readonly selectedCountText: Locator;

  // Message list elements
  readonly messageList: Locator;
  readonly messageItems: Locator;
  readonly noMessagesDisplay: Locator;
  readonly loadingSpinner: Locator;
  readonly loadMoreButton: Locator;

  // Error handling
  readonly errorAlert: Locator;

  // Message center dialog
  readonly messageCenterDialog: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.pageTitle = page.getByRole('heading', { name: 'Admin Message Inbox' });
    this.messageIcon = page.locator('[data-testid="message-icon"]').first();
    this.unreadBadge = page.locator('.MuiBadge-badge');
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.markReadButton = page.getByRole('button', { name: /mark read/i });
    this.totalMessageCount = page.locator('text=/\\d+ total messages/');

    // Filter elements
    this.filtersToggleButton = page.getByRole('button').filter({ has: page.locator('[data-testid="ExpandMoreIcon"], [data-testid="ExpandLessIcon"]') });
    this.searchInput = page.getByLabel('Search messages');
    this.clientNameInput = page.getByLabel('Client name');
    this.orderNumberInput = page.getByLabel('Order number');
    this.messageTypeSelect = page.getByLabel('Message Type');
    this.senderRoleSelect = page.getByLabel('Sender Role');
    this.unreadOnlyCheckbox = page.getByRole('checkbox', { name: /unread only/i });
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters/i });
    this.filtersActiveCount = page.locator('text=/\\d+ filters active/');

    // Bulk selection elements
    this.selectAllCheckbox = page.getByRole('checkbox').first();
    this.selectedCountText = page.locator('text=/\\d+ selected|Select all/');

    // Message list elements
    this.messageList = page.getByRole('list');
    this.messageItems = page.getByRole('listitem').filter({ has: page.getByRole('checkbox') });
    this.noMessagesDisplay = page.locator('text=No messages found');
    this.loadingSpinner = page.locator('.MuiCircularProgress-root');
    this.loadMoreButton = page.getByRole('button', { name: /load more messages/i });

    // Error handling
    this.errorAlert = page.locator('.MuiAlert-root[role="alert"]');

    // Message center dialog
    this.messageCenterDialog = page.locator('[role="dialog"]');
  }

  /**
   * Navigate to admin message inbox
   */
  async navigate(): Promise<void> {
    await this.page.goto('/admin/messages');
    await this.waitForLoad();
  }

  /**
   * Wait for the page to fully load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await this.waitForNetworkIdle();
  }

  /**
   * Wait for messages to load (either loading spinner to appear and disappear, or messages to be visible)
   */
  async waitForMessagesLoad(): Promise<void> {
    // Wait for either loading to complete or messages to appear
    await Promise.race([
      this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }),
      this.messageItems.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.noMessagesDisplay.waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(() => {
      // If all promises fail, continue - might be in a no-messages state
    });
  }

  /**
   * Get the unread count from the badge
   */
  async getUnreadCount(): Promise<number> {
    try {
      const badgeText = await this.unreadBadge.textContent();
      return badgeText ? parseInt(badgeText, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get total message count from the header
   */
  async getTotalMessageCount(): Promise<number> {
    const countText = await this.totalMessageCount.textContent();
    const match = countText?.match(/(\d+) total messages/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Expand filters section
   */
  async expandFilters(): Promise<void> {
    const isExpanded = await this.searchInput.isVisible();
    if (!isExpanded) {
      await this.filtersToggleButton.click();
      await expect(this.searchInput).toBeVisible();
    }
  }

  /**
   * Apply search filter
   */
  async searchMessages(searchTerm: string): Promise<void> {
    await this.expandFilters();
    await this.searchInput.fill(searchTerm);
    await this.waitForMessagesLoad();
  }

  /**
   * Filter by client name
   */
  async filterByClient(clientName: string): Promise<void> {
    await this.expandFilters();
    await this.clientNameInput.fill(clientName);
    await this.waitForMessagesLoad();
  }

  /**
   * Filter by order number
   */
  async filterByOrder(orderNumber: string): Promise<void> {
    await this.expandFilters();
    await this.orderNumberInput.fill(orderNumber);
    await this.waitForMessagesLoad();
  }

  /**
   * Filter by message type
   */
  async filterByMessageType(messageType: string): Promise<void> {
    await this.expandFilters();
    await this.messageTypeSelect.click();
    await this.page.getByRole('option', { name: messageType }).click();
    await this.waitForMessagesLoad();
  }

  /**
   * Filter by sender role
   */
  async filterBySenderRole(role: string): Promise<void> {
    await this.expandFilters();
    await this.senderRoleSelect.click();
    await this.page.getByRole('option', { name: role }).click();
    await this.waitForMessagesLoad();
  }

  /**
   * Toggle unread only filter
   */
  async toggleUnreadOnly(): Promise<void> {
    await this.expandFilters();
    await this.unreadOnlyCheckbox.click();
    await this.waitForMessagesLoad();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.expandFilters();
    await this.clearFiltersButton.click();
    await this.waitForMessagesLoad();
  }

  /**
   * Get the number of active filters
   */
  async getActiveFilterCount(): Promise<number> {
    try {
      const isExpanded = await this.searchInput.isVisible();
      if (isExpanded) {
        return 0; // When expanded, we can't see the count
      }
      const countText = await this.filtersActiveCount.textContent();
      const match = countText?.match(/(\d+) filters active/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Select all messages
   */
  async selectAll(): Promise<void> {
    await this.selectAllCheckbox.click();
  }

  /**
   * Select a specific message by index
   */
  async selectMessage(index: number): Promise<void> {
    const messageItem = this.messageItems.nth(index);
    const checkbox = messageItem.getByRole('checkbox');
    await checkbox.click();
  }

  /**
   * Get the count of selected messages
   */
  async getSelectedCount(): Promise<number> {
    const selectedText = await this.selectedCountText.textContent();
    const match = selectedText?.match(/(\d+) selected/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Mark selected messages as read
   */
  async markSelectedAsRead(): Promise<void> {
    await expect(this.markReadButton).toBeVisible();
    await this.markReadButton.click();
  }

  /**
   * Get the number of messages currently displayed
   */
  async getDisplayedMessageCount(): Promise<number> {
    return await this.messageItems.count();
  }

  /**
   * Click on a message to open the conversation
   */
  async openMessage(index: number): Promise<void> {
    const messageItem = this.messageItems.nth(index);
    // Click on the message content area, not the checkbox
    const messageContent = messageItem.locator('div').last();
    await messageContent.click();
    await expect(this.messageCenterDialog).toBeVisible();
  }

  /**
   * Check if a message is marked as read
   */
  async isMessageRead(index: number): Promise<boolean> {
    const messageItem = this.messageItems.nth(index);
    const backgroundColor = await messageItem.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Read messages have a different background color
    return backgroundColor !== 'rgba(0, 0, 0, 0.04)'; // MUI's action.hover color
  }

  /**
   * Get message preview text
   */
  async getMessagePreview(index: number): Promise<string> {
    const messageItem = this.messageItems.nth(index);
    const previewText = messageItem.locator('p').filter({ hasText: /\w/ }).first();
    return await previewText.textContent() || '';
  }

  /**
   * Get sender name for a message
   */
  async getMessageSender(index: number): Promise<string> {
    const messageItem = this.messageItems.nth(index);
    const senderElement = messageItem.locator('h6').first();
    return await senderElement.textContent() || '';
  }

  /**
   * Check if a message has attachments
   */
  async hasAttachments(index: number): Promise<boolean> {
    const messageItem = this.messageItems.nth(index);
    const attachmentIcon = messageItem.locator('[data-testid="AttachFileIcon"]');
    return await attachmentIcon.isVisible();
  }

  /**
   * Check if a message is marked as urgent
   */
  async isMessageUrgent(index: number): Promise<boolean> {
    const messageItem = this.messageItems.nth(index);
    const urgentIcon = messageItem.locator('[data-testid="PriorityHighIcon"]');
    return await urgentIcon.isVisible();
  }

  /**
   * Load more messages
   */
  async loadMoreMessages(): Promise<void> {
    if (await this.loadMoreButton.isVisible()) {
      await this.loadMoreButton.click();
      await this.waitForMessagesLoad();
    }
  }

  /**
   * Check if there are more messages to load
   */
  async hasMoreMessages(): Promise<boolean> {
    return await this.loadMoreButton.isVisible();
  }

  /**
   * Refresh the message list
   */
  async refreshMessages(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForMessagesLoad();
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasError()) {
      return await this.errorAlert.textContent() || '';
    }
    return '';
  }

  /**
   * Close the message center dialog
   */
  async closeMessageCenter(): Promise<void> {
    if (await this.messageCenterDialog.isVisible()) {
      await this.page.keyboard.press('Escape');
      await expect(this.messageCenterDialog).not.toBeVisible();
    }
  }

  /**
   * Take a screenshot of the current state
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Verify accessibility of key elements
   */
  async verifyAccessibility(): Promise<void> {
    // Verify important elements have proper ARIA labels and roles
    await expect(this.pageTitle).toHaveAttribute('role', 'heading');
    await expect(this.refreshButton).toBeEnabled();
    await expect(this.messageList).toHaveAttribute('role', 'list');

    // Check keyboard navigation works
    await this.refreshButton.focus();
    await expect(this.refreshButton).toBeFocused();
  }

  /**
   * Get message metadata (sender, organization, order)
   */
  async getMessageMetadata(index: number): Promise<{
    sender: string;
    organization: string;
    orderNumber: string;
    messageType: string;
    timeAgo: string;
  }> {
    const messageItem = this.messageItems.nth(index);

    const senderElement = messageItem.locator('h6').first();
    const sender = await senderElement.textContent() || '';

    // Extract metadata from the message item
    const allText = await messageItem.textContent() || '';
    const parts = allText.split('•').map(part => part.trim());

    return {
      sender,
      organization: parts[1] || '',
      orderNumber: parts[2] || '',
      messageType: parts[parts.length - 2] || '',
      timeAgo: parts[parts.length - 1] || ''
    };
  }
}