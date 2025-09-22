import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Order Detail page
 * Handles order information display, messaging, and stage management
 *
 * @class OrderDetailPage
 * @extends BasePage
 * @since 3.0.0
 */
export class OrderDetailPage extends BasePage {
  // Page-specific selectors - using actual Material-UI components
  private selectors = {
    // Page structure
    pageTitle: 'h1:has-text("Order")', // Typography h1 with Order text
    orderNumber: 'h1:has-text("Order")', // Same as title - contains order number
    backToDashboard: '.MuiBreadcrumbs-root a:has-text("Dashboard")', // Breadcrumb link

    // Order information sections - Paper components
    orderHeaderSection: '.MuiPaper-root:has(h1)',
    orderSummarySection: '.MuiPaper-root', // OrderSummary component in Paper
    contactInfoSection: '.MuiPaper-root', // ContactInfo component in Paper

    // Order details from header section
    orderDescription: 'h6:has-text("")', // h6 Typography with description
    currentStageText: 'text=Current Stage >> .. >> .MuiTypography-body1',
    shipDateText: 'text=Ship Date >> .. >> .MuiTypography-body1',

    // Stage timeline section
    stageTimelineSection: '.MuiPaper-root:has-text("Manufacturing Progress")',
    stageTimelineTitle: 'h2:has-text("Manufacturing Progress")',
    orderTimeline: '[class*="OrderTimeline"]', // OrderTimeline component

    // Quick Actions section
    quickActionsSection: '[class*="QuickActions"]',
    submitMeasurementsButton: 'button:has-text("measurements")',
    viewMessagesButton: 'button:has-text("messages")',
    uploadDocumentsButton: 'button:has-text("documents")',

    // Message Center (Modal)
    messageCenterModal: '.MuiDialog-root',
    messageCenter: '[class*="MessageCenter"]',

    // Ship Date Display section
    shipDateDisplay: '[class*="ShipDateDisplay"]',

    // Stage Detail Modal
    stageDetailModal: '.MuiDialog-root',

    // Loading and error states
    loadingSpinner: '.MuiCircularProgress-root',
    errorAlert: '.MuiAlert-root',

    // General UI elements
    breadcrumbNavigation: '.MuiBreadcrumbs-root',

    // Message-related selectors (from MessageCenter component)
    messageInput: '.MuiTextField-root input', // TextField input for messages
    sendMessageButton: 'button:has-text("Send")',

    // Organization information (from ContactInfo component)
    organizationName: 'text=/organization/i >> .. >> .MuiTypography-body1',
    contactEmail: 'text=/email/i >> .. >> .MuiTypography-body1',
    contactPhone: 'text=/phone/i >> .. >> .MuiTypography-body1',
  };

  // Locators
  get orderNumber(): Locator { return this.page.locator(this.selectors.orderNumber); }
  get messageInput(): Locator { return this.page.locator(this.selectors.messageInput); }
  get sendMessageButton(): Locator { return this.page.locator(this.selectors.sendMessageButton); }
  get stageTimeline(): Locator { return this.page.locator(this.selectors.stageTimeline); }
  get messageList(): Locator { return this.page.locator(this.selectors.messageList); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to a specific order detail page
   */
  async goto(orderId: string): Promise<void> {
    await this.page.goto(`${this.baseURL}/orders/${orderId}`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for order detail page to load completely
   */
  async waitForOrderDetailLoad(): Promise<void> {
    await this.page.waitForURL(/\/orders\/[^\/]+$/);

    // Wait for order summary to load
    await this.page.locator(this.selectors.orderSummary).waitFor({ state: 'visible' });

    // Wait for either messages or message center to load
    await Promise.race([
      this.page.locator(this.selectors.messageCenter).waitFor({ state: 'visible' }),
      this.page.locator(this.selectors.messagesLoading).waitFor({ state: 'detached' })
    ]);

    await this.waitForLoadingToComplete();
  }

  /**
   * Get order information from the page
   */
  async getOrderInfo(): Promise<{
    orderNumber: string;
    description: string;
    stage: string;
    shipDate: string;
    totalAmount: string;
    paymentStatus: string;
    organizationName: string;
  }> {
    const orderNumber = await this.page.locator(this.selectors.orderNumber).textContent() || '';
    const stage = await this.page.locator(this.selectors.orderStage).textContent() || '';
    const shipDate = await this.page.locator(this.selectors.shipDate).textContent() || '';
    const totalAmount = await this.page.locator(this.selectors.totalAmount).textContent() || '';
    const paymentStatus = await this.page.locator(this.selectors.paymentStatus).textContent() || '';
    const organizationName = await this.page.locator(this.selectors.organizationName).textContent() || '';

    // Description might be in summary or title
    const pageTitle = await this.page.locator(this.selectors.pageTitle).textContent() || '';

    return {
      orderNumber,
      description: pageTitle,
      stage,
      shipDate,
      totalAmount,
      paymentStatus,
      organizationName
    };
  }

  /**
   * Send a message in the order
   */
  async sendMessage(content: string, options: {
    messageType?: 'General' | 'Question' | 'Update' | 'Urgent';
    recipientRole?: 'All' | 'Client' | 'Staff';
    attachments?: string[];
  } = {}): Promise<void> {
    // Fill message content
    await this.fillField(this.selectors.messageInput, content);

    // Set message type if specified
    if (options.messageType) {
      await this.page.locator(this.selectors.messageTypeSelect).click();
      await this.page.locator(`[data-value="${options.messageType}"]`).click();
    }

    // Set recipient role if specified
    if (options.recipientRole) {
      await this.page.locator(this.selectors.recipientRoleSelect).click();
      await this.page.locator(`[data-value="${options.recipientRole}"]`).click();
    }

    // Add attachments if specified
    if (options.attachments && options.attachments.length > 0) {
      const fileInput = this.page.locator(this.selectors.attachmentInput);
      await fileInput.setInputFiles(options.attachments);
    }

    // Send the message
    await this.clickElement(this.selectors.sendMessageButton);

    // Wait for message to be sent
    await this.waitForAPIResponse('/api/orders/*/messages');

    // Wait for message to appear in the list
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get the number of messages displayed
   */
  async getMessageCount(): Promise<number> {
    await this.waitForLoadingToComplete();
    return await this.page.locator(this.selectors.messageItem).count();
  }

  /**
   * Get message information from a specific message
   */
  async getMessageInfo(index: number): Promise<{
    sender: string;
    content: string;
    timestamp: string;
    messageType: string;
    isRead: boolean;
    attachmentCount: number;
  }> {
    const messageItem = this.page.locator(this.selectors.messageItem).nth(index);
    await expect(messageItem).toBeVisible();

    const sender = await messageItem.locator('[data-testid="message-sender"]').textContent() || '';
    const content = await messageItem.locator('[data-testid="message-content"]').textContent() || '';
    const timestamp = await messageItem.locator('[data-testid="message-timestamp"]').textContent() || '';
    const messageType = await messageItem.locator('[data-testid="message-type"]').textContent() || '';

    const isRead = await messageItem.locator('[data-testid="message-read-indicator"]').isVisible();
    const attachmentCount = await messageItem.locator('[data-testid="message-attachment"]').count();

    return {
      sender,
      content,
      timestamp,
      messageType,
      isRead,
      attachmentCount
    };
  }

  /**
   * Search messages by content
   */
  async searchMessages(searchTerm: string): Promise<void> {
    await this.fillField(this.selectors.messageSearchInput, searchTerm);
    await this.clickElement(this.selectors.messageSearchButton);

    await this.waitForAPIResponse('/api/orders/*/messages/search');
    await this.waitForLoadingToComplete();
  }

  /**
   * Filter messages to show only unread
   */
  async filterUnreadMessages(showUnreadOnly: boolean = true): Promise<void> {
    const filterCheckbox = this.page.locator(this.selectors.unreadMessagesFilter);

    const isChecked = await filterCheckbox.isChecked();
    if (isChecked !== showUnreadOnly) {
      await filterCheckbox.click();
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Get stage timeline information
   */
  async getStageTimeline(): Promise<Array<{
    stage: string;
    status: 'completed' | 'current' | 'pending';
    timestamp?: string;
    notes?: string;
  }>> {
    const timelineItems = this.page.locator(this.selectors.stageTimelineItem);
    const count = await timelineItems.count();
    const stages = [];

    for (let i = 0; i < count; i++) {
      const item = timelineItems.nth(i);
      const stage = await item.locator('[data-testid="stage-name"]').textContent() || '';

      let status: 'completed' | 'current' | 'pending' = 'pending';
      if (await item.locator(this.selectors.completedStageIndicator).isVisible()) {
        status = 'completed';
      } else if (await item.locator(this.selectors.currentStageIndicator).isVisible()) {
        status = 'current';
      }

      const timestamp = await item.locator('[data-testid="stage-timestamp"]').textContent();
      const notes = await item.locator('[data-testid="stage-notes"]').textContent();

      stages.push({
        stage,
        status,
        timestamp: timestamp || undefined,
        notes: notes || undefined
      });
    }

    return stages;
  }

  /**
   * Update order stage (for staff users)
   */
  async updateOrderStage(newStage: string, options: {
    newShipDate?: string;
    notes?: string;
  } = {}): Promise<void> {
    // Open stage update section
    await this.clickElement(this.selectors.stageUpdateButton);

    // Wait for update form to appear
    await this.page.locator(this.selectors.stageUpdateSection).waitFor({ state: 'visible' });

    // Select new stage
    await this.page.locator(this.selectors.stageSelectDropdown).click();
    await this.page.locator(`[data-value="${newStage}"]`).click();

    // Update ship date if provided
    if (options.newShipDate) {
      await this.fillField(this.selectors.shipDatePicker, options.newShipDate);
    }

    // Add notes if provided
    if (options.notes) {
      await this.fillField(this.selectors.updateNotesField, options.notes);
    }

    // Save the update
    await this.clickElement(this.selectors.saveStageUpdate);

    // Wait for update to complete
    await this.waitForAPIResponse('/api/orders/*/stage');
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify stage update permissions based on user role
   */
  async verifyStageUpdatePermission(shouldHavePermission: boolean): Promise<void> {
    if (shouldHavePermission) {
      await expect(this.page.locator(this.selectors.stageUpdateButton)).toBeVisible();
    } else {
      await expect(this.page.locator(this.selectors.stageUpdateButton)).not.toBeVisible();
    }
  }

  /**
   * Download an attachment
   */
  async downloadAttachment(attachmentIndex: number): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');

    const attachmentItem = this.page.locator(this.selectors.attachmentItem).nth(attachmentIndex);
    const downloadButton = attachmentItem.locator(this.selectors.downloadAttachment);

    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  /**
   * Verify organization information display
   */
  async verifyOrganizationInfo(): Promise<void> {
    const contactInfo = this.page.locator(this.selectors.contactInfo);
    await expect(contactInfo).toBeVisible();

    // Check required organization fields
    await expect(this.page.locator(this.selectors.organizationName)).toBeVisible();

    // Optional fields should be visible if they have content
    const contactEmail = this.page.locator(this.selectors.contactEmail);
    const contactPhone = this.page.locator(this.selectors.contactPhone);
    const shippingAddress = this.page.locator(this.selectors.shippingAddress);

    // If these elements exist, they should have content
    if (await contactEmail.isVisible()) {
      expect(await contactEmail.textContent()).toBeTruthy();
    }
    if (await contactPhone.isVisible()) {
      expect(await contactPhone.textContent()).toBeTruthy();
    }
    if (await shippingAddress.isVisible()) {
      expect(await shippingAddress.textContent()).toBeTruthy();
    }
  }

  /**
   * Navigate back to dashboard
   */
  async backToDashboard(): Promise<void> {
    await this.clickElement(this.selectors.backToDashboard);
    await this.page.waitForURL('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Verify message composer permissions based on user role
   */
  async verifyMessagePermissions(canSendMessages: boolean): Promise<void> {
    if (canSendMessages) {
      await expect(this.page.locator(this.selectors.messageComposer)).toBeVisible();
      await expect(this.messageInput).toBeVisible();
      await expect(this.sendMessageButton).toBeVisible();
    } else {
      await expect(this.page.locator(this.selectors.messageComposer)).not.toBeVisible();
    }
  }

  /**
   * Test message validation
   */
  async testMessageValidation(): Promise<void> {
    // Try to send empty message
    await this.clickElement(this.selectors.sendMessageButton);

    // Should show validation error
    const error = await this.getErrorMessage();
    expect(error).toMatch(/message.*required|content.*required/i);
  }

  /**
   * Verify data consistency between different sections
   */
  async verifyDataConsistency(): Promise<void> {
    const orderInfo = await this.getOrderInfo();

    // Verify order number is consistent
    expect(orderInfo.orderNumber).toBeTruthy();

    // Verify stage timeline shows current stage
    const timeline = await this.getStageTimeline();
    const currentStageInTimeline = timeline.find(stage => stage.status === 'current');

    if (currentStageInTimeline) {
      expect(currentStageInTimeline.stage).toMatch(new RegExp(orderInfo.stage, 'i'));
    }
  }

  /**
   * Test real-time message updates (if implemented)
   */
  async testRealTimeUpdates(): Promise<void> {
    const initialMessageCount = await this.getMessageCount();

    // Send a message
    await this.sendMessage('Test real-time update', { messageType: 'General' });

    // Wait for the new message to appear
    await this.page.waitForFunction(
      (expectedCount) => {
        const messageItems = document.querySelectorAll('[data-testid="message-item"]');
        return messageItems.length > expectedCount;
      },
      initialMessageCount,
      { timeout: 10000 }
    );

    const newMessageCount = await this.getMessageCount();
    expect(newMessageCount).toBe(initialMessageCount + 1);
  }

  /**
   * Test file upload functionality
   */
  async testFileUpload(filePaths: string[]): Promise<void> {
    // Set up file input
    const fileInput = this.page.locator(this.selectors.attachmentInput);
    await fileInput.setInputFiles(filePaths);

    // Verify files are selected
    const files = await fileInput.evaluate((input: HTMLInputElement) => {
      return Array.from(input.files || []).map(file => file.name);
    });

    expect(files.length).toBe(filePaths.length);

    // Send message with attachments
    await this.sendMessage('Message with attachments', { messageType: 'General' });

    // Verify attachments appear in the message
    const latestMessage = this.page.locator(this.selectors.messageItem).first();
    const attachmentCount = await latestMessage.locator('[data-testid="message-attachment"]').count();
    expect(attachmentCount).toBe(filePaths.length);
  }
}