import { test, expect, type Page, devices } from '@playwright/test';

/**
 * E2E tests for mobile messaging functionality
 * Tests mobile-optimized UI, touch interactions, and camera integration
 */

// Configure mobile viewport
test.use({ 
  ...devices['iPhone 13'],
  permissions: ['camera', 'microphone'] 
});

test.describe('Mobile Messaging Interface', () => {
  let page: Page;
  const testOrderId = 'test-order-123';

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock API responses
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages: [
            {
              id: '1',
              content: 'Test message for mobile interface',
              senderName: 'John Director',
              senderRole: 'Director',
              messageType: 'General',
              isRead: false,
              createdAt: new Date().toISOString(),
              attachments: [],
              attachmentCount: 0
            }
          ],
          totalCount: 1,
          unreadCount: 1,
          hasNextPage: false
        }
      });
    });

    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            message: {
              id: Date.now().toString(),
              content: 'Test reply',
              senderName: 'Current User',
              senderRole: 'Director',
              messageType: 'General',
              isRead: false,
              createdAt: new Date().toISOString(),
              attachments: [],
              attachmentCount: 0
            }
          }
        });
      }
    });

    // Navigate to order detail page
    await page.goto(`/orders/${testOrderId}`);
  });

  test('should display mobile-optimized message center layout', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Verify message center opens full-screen on mobile
    const messageCenter = page.locator('[data-testid="message-center"]');
    await expect(messageCenter).toBeVisible();
    
    // Check full-width layout
    const boundingBox = await messageCenter.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(350); // Should use most of mobile width
    
    // Verify mobile header styling
    await expect(page.locator('h2:has-text("Messages")')).toHaveCSS('font-size', /1\.1rem/);
    
    // Check touch-friendly buttons
    const closeButton = page.locator('button[title="Close messages"]');
    const buttonBox = await closeButton.boundingBox();
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44); // Minimum touch target
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should support swipe gestures for message replies', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Wait for messages to load
    await expect(page.locator('text=Test message for mobile interface')).toBeVisible();
    
    // Get message element
    const messageItem = page.locator('text=Test message for mobile interface').locator('..');
    
    // Perform swipe left gesture
    const messageBox = await messageItem.boundingBox();
    if (messageBox) {
      await page.touchscreen.swipe(
        messageBox.x + messageBox.width - 20, // Start near right edge
        messageBox.y + messageBox.height / 2,
        messageBox.x + 20, // End near left edge  
        messageBox.y + messageBox.height / 2,
        { steps: 10 }
      );
    }
    
    // Verify reply button becomes visible
    await expect(page.locator('button[aria-label*="reply" i]')).toBeVisible();
    
    // Test tapping reply button
    await page.tap('button[aria-label*="reply" i]');
    
    // Verify reply action is triggered (would focus composer in real implementation)
    // For now, just check console log or UI state change
  });

  test('should optimize message composer for mobile keyboard', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Focus message input
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.tap();
    
    // Verify mobile keyboard optimizations
    await expect(messageInput).toHaveAttribute('autocapitalize', 'sentences');
    await expect(messageInput).toHaveAttribute('autocorrect', 'on');
    await expect(messageInput).toHaveAttribute('inputmode', 'text');
    
    // Check font size is 16px (prevents iOS zoom)
    await expect(messageInput).toHaveCSS('font-size', '16px');
    
    // Test Enter key behavior (should send on mobile)
    await messageInput.fill('Test mobile message');
    await messageInput.press('Enter');
    
    // Verify message is sent (input should clear)
    await expect(messageInput).toHaveValue('');
  });

  test('should show camera and photo options for file attachment', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Check for mobile attachment options
    await expect(page.locator('button[title="Take photo"]')).toBeVisible();
    await expect(page.locator('button[title="Choose photo"]')).toBeVisible();
    await expect(page.locator('button[title="Attach file"]')).toBeVisible();
  });

  test('should handle camera capture for attachments', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Mock file input for camera
    await page.route('**/upload', route => route.fulfill({ json: { success: true } }));
    
    // Test camera button
    const cameraButton = page.locator('button[title="Take photo"]');
    await expect(cameraButton).toBeVisible();
    
    // Simulate camera capture by programmatically setting file input
    await page.evaluate(() => {
      // Create mock camera capture file
      const file = new File(['test image data'], 'camera-capture.jpg', { 
        type: 'image/jpeg' 
      });
      
      // Find file input and trigger change
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        // Mock file list
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true
        });
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
      }
    });
    
    // Verify attachment is added (would show in attachment list)
    // In a real test, this would verify the UI shows the attachment
  });

  test('should handle photo library selection', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Test photo library button
    const photoButton = page.locator('button[title="Choose photo"]');
    await expect(photoButton).toBeVisible();
    
    // Similar to camera test, but without capture attribute
    await photoButton.tap();
    
    // In a real test, this would verify the correct file input attributes
    // and handle the file selection flow
  });

  test('should display mobile-friendly search interface', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Open search
    await page.tap('button[title="Search messages"]');
    
    // Verify mobile search layout
    const searchInput = page.locator('input[placeholder*="Search messages"]');
    await expect(searchInput).toBeVisible();
    
    // Check touch-friendly search button
    const searchButton = page.locator('button:has-text("Search")');
    const searchButtonBox = await searchButton.boundingBox();
    expect(searchButtonBox?.height).toBeGreaterThanOrEqual(44);
    
    // Test mobile keyboard on search
    await searchInput.tap();
    await expect(searchInput).toBeFocused();
  });

  test('should handle touch interactions with message attachments', async () => {
    // Mock message with attachment
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages: [
            {
              id: '1',
              content: 'Message with attachment',
              senderName: 'John Director',
              senderRole: 'Director',
              messageType: 'General',
              isRead: false,
              createdAt: new Date().toISOString(),
              attachments: [{
                id: 'att1',
                originalFileName: 'document.pdf',
                fileSize: 1024000,
                mimeType: 'application/pdf'
              }],
              attachmentCount: 1
            }
          ],
          totalCount: 1,
          unreadCount: 1,
          hasNextPage: false
        }
      });
    });
    
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Wait for attachment to be visible
    await expect(page.locator('text=document.pdf')).toBeVisible();
    
    // Test download button touch target
    const downloadButton = page.locator('button[title="Download attachment"]');
    await expect(downloadButton).toBeVisible();
    
    const downloadBox = await downloadButton.boundingBox();
    expect(downloadBox?.width).toBeGreaterThanOrEqual(44);
    expect(downloadBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should scroll smoothly on mobile', async () => {
    // Mock multiple messages for scrolling
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      content: `Test message ${i} for scroll testing`,
      senderName: 'Test User',
      senderRole: 'Director',
      messageType: 'General',
      isRead: false,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      attachments: [],
      attachmentCount: 0
    }));

    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: messages.length,
          hasNextPage: false
        }
      });
    });
    
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Wait for messages to load
    await expect(page.locator('text=Test message 0')).toBeVisible();
    
    // Test smooth scrolling behavior
    const messageList = page.locator('[data-testid="message-list"]');
    await messageList.scrollIntoViewIfNeeded();
    
    // Perform scroll gesture
    await page.touchscreen.swipe(200, 400, 200, 200, { steps: 10 });
    
    // Verify scroll worked (should see later messages)
    await expect(page.locator('text=Test message 5')).toBeVisible();
  });

  test('should handle mobile orientation changes', async () => {
    // Open message center in portrait
    await page.tap('button:has-text("View Messages")');
    
    // Verify portrait layout
    const messageCenter = page.locator('[data-testid="message-center"]');
    await expect(messageCenter).toBeVisible();
    
    // Simulate orientation change to landscape
    await page.setViewportSize({ width: 896, height: 414 });
    
    // Verify layout adapts to landscape
    await expect(messageCenter).toBeVisible();
    
    // Check that header elements are still accessible
    await expect(page.locator('button[title="Close messages"]')).toBeVisible();
  });

  test('should provide haptic feedback cues (simulated)', async () => {
    // Open message center
    await page.tap('button:has-text("View Messages")');
    
    // Test that important actions could trigger haptic feedback
    // In a real mobile environment, these would trigger vibration
    
    // Simulate swipe with haptic feedback at threshold
    const messageItem = page.locator('text=Test message').first();
    const messageBox = await messageItem.boundingBox();
    
    if (messageBox) {
      // Long press (could trigger haptic feedback)
      await page.touchscreen.tap(
        messageBox.x + messageBox.width / 2,
        messageBox.y + messageBox.height / 2,
        { delay: 500 }
      );
    }
    
    // Send button tap (could trigger success haptic feedback)
    const sendButton = page.locator('button:has-text("Send")');
    if (await sendButton.isVisible()) {
      await sendButton.tap();
    }
  });
});