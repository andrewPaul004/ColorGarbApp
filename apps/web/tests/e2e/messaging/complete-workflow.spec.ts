import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for complete messaging workflow
 * Tests end-to-end user scenarios including sending, receiving, searching, and managing messages
 */

test.describe('Complete Messaging Workflow', () => {
  let page: Page;
  const testOrderId = 'test-order-workflow';
  let messageId = 1;

  // Mock message store for maintaining state across requests
  const messages: any[] = [];
  
  const addMessage = (content: string, senderName = 'Test User', senderRole = 'Director', messageType = 'General') => {
    const message = {
      id: (messageId++).toString(),
      content,
      senderName,
      senderRole,
      messageType,
      recipientRole: 'All',
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      attachmentCount: 0,
      replyToMessageId: null,
      replyToMessage: null
    };
    messages.unshift(message); // Add to beginning (newest first)
    return message;
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Reset messages for each test
    messages.length = 0;
    messageId = 1;
    
    // Add some initial messages
    addMessage('Welcome to the ColorGarb message center!', 'ColorGarb Support', 'ColorGarbStaff', 'General');
    addMessage('Please let us know if you have any questions about your order.', 'ColorGarb Support', 'ColorGarbStaff', 'General');
    
    // Mock API endpoints
    await page.route('**/api/orders/*/messages*', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'GET') {
        // Handle search parameters
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        const searchTerm = urlParams.get('searchTerm');
        const messageType = urlParams.get('messageType');
        const senderRole = urlParams.get('senderRole');
        
        let filteredMessages = [...messages];
        
        if (searchTerm) {
          filteredMessages = filteredMessages.filter(msg =>
            msg.content.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        if (messageType) {
          filteredMessages = filteredMessages.filter(msg => msg.messageType === messageType);
        }
        
        if (senderRole) {
          filteredMessages = filteredMessages.filter(msg => msg.senderRole === senderRole);
        }
        
        await route.fulfill({
          json: {
            messages: filteredMessages,
            totalCount: filteredMessages.length,
            unreadCount: filteredMessages.filter(m => !m.isRead).length,
            hasNextPage: false
          }
        });
      } else if (method === 'POST') {
        // Handle message sending
        const requestData = await route.request().postData();
        
        // Parse FormData if present
        let content = '';
        let messageType = 'General';
        
        if (requestData) {
          // Simple parsing for test - in real app this would be FormData
          const lines = requestData.split('\n');
          for (const line of lines) {
            if (line.includes('content')) {
              content = line.split('content')[1]?.trim().replace(/['"]/g, '') || '';
            }
            if (line.includes('messageType')) {
              messageType = line.split('messageType')[1]?.trim().replace(/['"]/g, '') || 'General';
            }
          }
        }
        
        const newMessage = addMessage(content || 'Test message', 'Current User', 'Director', messageType);
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: [],
            success: true
          }
        });
      }
    });

    // Mock mark as read endpoint
    await page.route('**/api/orders/*/messages/*/read', async route => {
      if (route.request().method() === 'PUT') {
        const messageId = route.request().url().match(/messages\/([^\/]+)\/read/)?.[1];
        const message = messages.find(m => m.id === messageId);
        if (message) {
          message.isRead = true;
          message.readAt = new Date().toISOString();
        }
        
        await route.fulfill({
          json: { success: true, readAt: new Date().toISOString() }
        });
      }
    });

    // Navigate to order detail page
    await page.goto(`/orders/${testOrderId}`);
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Order');
  });

  test('should complete full messaging workflow for client user', async () => {
    // Step 1: Open message center and verify initial state
    await page.click('button:has-text("View Messages")');
    await expect(page.locator('[data-testid="message-center"]')).toBeVisible();
    
    // Verify initial messages are displayed
    await expect(page.locator('text=Welcome to the ColorGarb message center!')).toBeVisible();
    await expect(page.locator('text=Please let us know if you have any questions')).toBeVisible();
    
    // Verify unread count is shown
    await expect(page.locator('text=2 unread')).toBeVisible();
    
    // Step 2: Mark a message as read by clicking it
    await page.click('text=Welcome to the ColorGarb message center!');
    
    // Verify unread count updated
    await expect(page.locator('text=1 unread')).toBeVisible();
    
    // Step 3: Send a new message
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('Thank you for the welcome! I have a question about the delivery timeline.');
    
    // Select message type
    await page.click('button:has-text("Show Options")');
    await page.click('div[role="combobox"]:has-text("General")');
    await page.click('li:has-text("Question")');
    
    // Send the message
    await page.click('button:has-text("Send")');
    
    // Verify message appears in the thread
    await expect(page.locator('text=Thank you for the welcome! I have a question about the delivery timeline.')).toBeVisible();
    
    // Verify input is cleared
    await expect(messageInput).toHaveValue('');
    
    // Step 4: Search for specific messages
    await page.click('button[title="Search messages"]');
    
    const searchInput = page.locator('input[placeholder*="Search messages"]');
    await searchInput.fill('delivery');
    await page.click('button:has-text("Search")');
    
    // Verify search results
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=delivery timeline')).toBeVisible();
    await expect(page.locator('text=Welcome to the ColorGarb')).not.toBeVisible();
    
    // Step 5: Clear search and verify all messages return
    await page.click('button:has-text("Clear All")');
    await expect(page.locator('text=3 messages')).toBeVisible();
    
    // Step 6: Test advanced filtering
    await page.click('button:has-text("Show Filters")');
    
    // Filter by message type
    await page.click('div[aria-label*="Message Type"] .MuiSelect-select');
    await page.click('li:has-text("Question")');
    await page.click('button:has-text("Search")');
    
    // Verify filtered results
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=delivery timeline')).toBeVisible();
    
    // Step 7: Close message center
    await page.click('button[title="Close messages"]');
    await expect(page.locator('[data-testid="message-center"]')).not.toBeVisible();
    
    // Step 8: Verify unread count is updated in Quick Actions
    await expect(page.locator('button:has-text("View Messages")')).toBeVisible();
    // The unread count should be visible as a badge on the button
  });

  test('should handle file attachments in messaging workflow', async () => {
    // Mock file upload endpoint
    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        const newMessage = addMessage(
          'Here are the measurement documents you requested.',
          'Current User',
          'Director',
          'General'
        );
        
        // Add mock attachment
        newMessage.attachments = [{
          id: 'att1',
          messageId: newMessage.id,
          originalFileName: 'measurements.pdf',
          blobUrl: 'https://example.com/measurements.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
        newMessage.attachmentCount = 1;
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: newMessage.attachments,
            success: true
          }
        });
      }
    });

    // Mock file download
    await page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="measurements.pdf"'
        },
        body: 'Mock PDF content'
      });
    });
    
    // Open message center
    await page.click('button:has-text("View Messages")');
    
    // Simulate file attachment by creating and attaching a file
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('Here are the measurement documents you requested.');
    
    // Simulate file selection (in real test, this would involve file picker)
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        const file = new File(['mock content'], 'measurements.pdf', { type: 'application/pdf' });
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Verify attachment is shown in composer
    await expect(page.locator('text=measurements.pdf')).toBeVisible();
    
    // Send message with attachment
    await page.click('button:has-text("Send")');
    
    // Verify message with attachment appears
    await expect(page.locator('text=Here are the measurement documents')).toBeVisible();
    await expect(page.locator('text=1 attachment')).toBeVisible();
    
    // Test attachment download
    await page.click('button[title="Download attachment"]');
    
    // In a real test, this would verify the download was triggered
    // For now, we just verify the button was clickable
  });

  test('should handle error scenarios gracefully', async () => {
    // Test network error during message sending
    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error occurred' }
        });
      }
    });
    
    // Open message center
    await page.click('button:has-text("View Messages")');
    
    // Attempt to send message
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('This message should fail to send');
    await page.click('button:has-text("Send")');
    
    // Verify error is displayed
    await expect(page.locator('text*="error"')).toBeVisible();
    
    // Verify message remains in input (not sent)
    await expect(messageInput).toHaveValue('This message should fail to send');
    
    // Test network error during message loading
    await page.route('**/api/orders/*/messages*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 503,
          json: { error: 'Service unavailable' }
        });
      }
    });
    
    // Try to refresh messages
    await page.click('button[title="Refresh messages"]');
    
    // Verify error state is shown
    await expect(page.locator('text*="error"')).toBeVisible();
    
    // Verify retry button is available
    await expect(page.locator('button[aria-label*="retry" i]')).toBeVisible();
  });

  test('should maintain message state across page navigation', async () => {
    // Open message center and send a message
    await page.click('button:has-text("View Messages")');
    
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('Message before navigation');
    await page.click('button:has-text("Send")');
    
    // Verify message is sent
    await expect(page.locator('text=Message before navigation')).toBeVisible();
    
    // Close message center
    await page.click('button[title="Close messages"]');
    
    // Navigate to dashboard (simulate page change)
    await page.goto('/dashboard');
    await page.goBack();
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Order');
    
    // Reopen message center
    await page.click('button:has-text("View Messages")');
    
    // Verify message is still there (would be loaded from server)
    await expect(page.locator('text=Message before navigation')).toBeVisible();
  });

  test('should handle real-time message updates', async () => {
    // Open message center
    await page.click('button:has-text("View Messages")');
    
    // Verify initial message count
    await expect(page.locator('text=2 messages')).toBeVisible();
    
    // Simulate new message arriving (would come from WebSocket or polling)
    await page.evaluate(() => {
      // Simulate adding a new message to the store
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: {
          id: '999',
          content: 'New message arrived in real-time!',
          senderName: 'ColorGarb Staff',
          senderRole: 'ColorGarbStaff',
          messageType: 'Update',
          createdAt: new Date().toISOString(),
          isRead: false
        }
      }));
    });
    
    // Wait for auto-refresh (30 seconds) or trigger manual refresh
    await page.click('button[title="Refresh messages"]');
    
    // Verify new message appears
    await expect(page.locator('text=New message arrived in real-time!')).toBeVisible();
    await expect(page.locator('text=3 messages')).toBeVisible();
  });
});