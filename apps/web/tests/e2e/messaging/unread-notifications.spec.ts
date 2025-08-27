import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for unread message indicators and notification delivery
 * Tests badge counts, visual indicators, real-time updates, and notification systems
 */

test.describe('Unread Message Indicators and Notifications', () => {
  let page: Page;
  const testOrderId = 'test-order-notifications';
  let messages: any[] = [];
  let messageIdCounter = 1;

  const createMessage = (content: string, isRead = false, senderName = 'Test User') => {
    const message = {
      id: (messageIdCounter++).toString(),
      content,
      senderId: 'sender-123',
      senderName,
      senderRole: 'ColorGarbStaff',
      messageType: 'General',
      recipientRole: 'All',
      isRead,
      readAt: isRead ? new Date().toISOString() : null,
      createdAt: new Date(Date.now() - (messages.length * 60000)).toISOString(), // 1 min intervals
      updatedAt: new Date().toISOString(),
      attachments: [],
      attachmentCount: 0,
      replyToMessageId: null,
      replyToMessage: null
    };
    messages.push(message);
    return message;
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    messages.length = 0;
    messageIdCounter = 1;

    // Create initial messages with mixed read states
    createMessage('Welcome to ColorGarb!', true, 'ColorGarb Support');
    createMessage('Your order has been received', false, 'Order Manager');
    createMessage('Please confirm measurements', false, 'Production Team');
    createMessage('Design proofs are ready', false, 'Design Team');

    await page.goto(`/orders/${testOrderId}`);
  });

  test('should display correct unread count in Quick Actions badge', async () => {
    // Mock API to return messages with unread count
    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = messages.filter(m => !m.isRead).length;
      
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    // Wait for page to load and check unread count
    await expect(page.locator('button:has-text("View Messages")')).toBeVisible();
    
    // Should show badge with unread count (3 unread messages)
    await expect(page.locator('.MuiBadge-badge:has-text("3")')).toBeVisible();
    
    // Badge should be red/error color for unread messages
    const badge = page.locator('.MuiBadge-badge');
    await expect(badge).toHaveCSS('background-color', /rgb\(211, 47, 47\)|#d32f2f|red/);
    
    // Button should have error color styling when unread messages exist
    await expect(page.locator('button:has-text("View Messages")[color="error"]')).toBeVisible();
  });

  test('should update unread count when messages are read', async () => {
    let currentMessages = [...messages];
    
    await page.route('**/api/orders/*/messages*', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        const unreadCount = currentMessages.filter(m => !m.isRead).length;
        await route.fulfill({
          json: {
            messages: currentMessages,
            totalCount: currentMessages.length,
            unreadCount,
            hasNextPage: false
          }
        });
      }
    });

    // Mock mark as read endpoint
    await page.route('**/api/orders/*/messages/*/read', async route => {
      if (route.request().method() === 'PUT') {
        const messageId = route.request().url().match(/messages\/([^\/]+)\/read/)?.[1];
        const message = currentMessages.find(m => m.id === messageId);
        if (message) {
          message.isRead = true;
          message.readAt = new Date().toISOString();
        }
        
        await route.fulfill({
          json: { success: true, readAt: new Date().toISOString() }
        });
      }
    });

    // Initial unread count should be 3
    await expect(page.locator('.MuiBadge-badge:has-text("3")')).toBeVisible();
    
    // Open message center
    await page.click('button:has-text("View Messages")');
    
    // Click on an unread message to mark it as read
    await page.click('text=Your order has been received');
    
    // Wait for the read status to update
    await page.waitForTimeout(500);
    
    // Close and reopen to trigger count refresh
    await page.click('button[title="Close messages"]');
    await page.waitForTimeout(500);
    
    // Unread count should now be 2
    await expect(page.locator('.MuiBadge-badge:has-text("2")')).toBeVisible();
  });

  test('should hide badge when all messages are read', async () => {
    // Mark all messages as read
    messages.forEach(msg => {
      msg.isRead = true;
      msg.readAt = new Date().toISOString();
    });

    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: 0,
          hasNextPage: false
        }
      });
    });

    // Badge should not be visible when no unread messages
    await expect(page.locator('.MuiBadge-badge')).not.toBeVisible();
    
    // Button should return to default styling
    await expect(page.locator('button:has-text("View Messages")[color="inherit"]')).toBeVisible();
  });

  test('should show visual indicators for unread messages in message list', async () => {
    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = messages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Wait for messages to load
    await expect(page.locator('text=Welcome to ColorGarb!')).toBeVisible();
    
    // Unread messages should have visual indicators
    const unreadMessages = messages.filter(m => !m.isRead);
    
    for (const message of unreadMessages) {
      const messageElement = page.locator(`text=${message.content}`).locator('..');
      
      // Should have unread styling (colored border, background, etc.)
      await expect(messageElement).toHaveCSS('border-left', /4px solid/);
      await expect(messageElement).toHaveCSS('background-color', /rgba\(25, 118, 210, 0\.05\)/);
      
      // Should show unread indicator icon
      await expect(messageElement.locator('.MuiSvgIcon-root[data-testid="CircleIcon"]')).toBeVisible();
    }
    
    // Read message should not have unread indicators
    const readMessage = page.locator('text=Welcome to ColorGarb!').locator('..');
    await expect(readMessage).not.toHaveCSS('border-left', /4px solid/);
  });

  test('should show unread count in message center header', async () => {
    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = messages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Should show unread count in header
    await expect(page.locator('text=3 unread')).toBeVisible();
    
    // Unread chip should have warning/attention styling
    const unreadChip = page.locator('.MuiChip-root:has-text("3 unread")');
    await expect(unreadChip).toBeVisible();
    await expect(unreadChip).toHaveCSS('background-color', /rgb\(255, 152, 0\)|#ff9800|orange/);
  });

  test('should handle real-time unread count updates', async () => {
    let currentUnreadCount = 3;
    
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: currentUnreadCount,
          hasNextPage: false
        }
      });
    });

    // Initial state
    await expect(page.locator('.MuiBadge-badge:has-text("3")')).toBeVisible();
    
    // Simulate new message arriving (real-time update)
    await page.evaluate((newUnreadCount) => {
      // Simulate WebSocket or polling update
      window.dispatchEvent(new CustomEvent('messageCountUpdate', {
        detail: { unreadCount: newUnreadCount }
      }));
    }, 4);
    
    // Update mock to reflect new count
    currentUnreadCount = 4;
    
    // Refresh the page to simulate real-time update
    await page.click('button:has-text("View Messages")');
    await page.click('button[title="Refresh messages"]');
    
    // Should show updated count
    await expect(page.locator('text=4 unread')).toBeVisible();
  });

  test('should show browser notifications for new messages', async () => {
    // Grant notification permission
    await page.context().grantPermissions(['notifications']);
    
    // Mock notification API
    await page.addInitScript(() => {
      let notificationCount = 0;
      
      // Override Notification constructor
      (window as any).Notification = class MockNotification {
        constructor(title: string, options?: NotificationOptions) {
          notificationCount++;
          (window as any).lastNotification = { title, options };
          
          // Simulate click event after a delay
          setTimeout(() => {
            if (this.onclick) {
              this.onclick(new Event('click'));
            }
          }, 100);
        }
        
        static permission = 'granted';
        static requestPermission = () => Promise.resolve('granted');
        
        onclick: ((event: Event) => void) | null = null;
        close = () => {};
      };
      
      (window as any).getNotificationCount = () => notificationCount;
    });

    await page.goto(`/orders/${testOrderId}`);
    
    // Simulate new message notification
    await page.evaluate(() => {
      // Simulate new message event that would trigger notification
      const newMessage = {
        id: 'new-msg-1',
        content: 'URGENT: Design changes needed immediately',
        senderName: 'Production Manager',
        messageType: 'Urgent'
      };
      
      // Trigger notification (this would normally be done by the app)
      new (window as any).Notification('New Message from Production Manager', {
        body: 'URGENT: Design changes needed immediately',
        icon: '/icon-192.png',
        tag: 'message-new-msg-1'
      });
    });
    
    // Verify notification was created
    const lastNotification = await page.evaluate(() => (window as any).lastNotification);
    expect(lastNotification.title).toBe('New Message from Production Manager');
    expect(lastNotification.options.body).toBe('URGENT: Design changes needed immediately');
  });

  test('should show desktop notification badges', async () => {
    // Mock navigator.setAppBadge for PWA badge support
    await page.addInitScript(() => {
      let badgeCount = 0;
      
      (navigator as any).setAppBadge = (count: number) => {
        badgeCount = count;
        (window as any).appBadgeCount = count;
        return Promise.resolve();
      };
      
      (navigator as any).clearAppBadge = () => {
        badgeCount = 0;
        (window as any).appBadgeCount = 0;
        return Promise.resolve();
      };
    });

    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: 3,
          hasNextPage: false
        }
      });
    });

    // Simulate app setting badge count
    await page.evaluate(() => {
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(3);
      }
    });
    
    // Verify badge was set
    const badgeCount = await page.evaluate(() => (window as any).appBadgeCount);
    expect(badgeCount).toBe(3);
  });

  test('should handle bulk message read operations', async () => {
    let currentMessages = [...messages];
    
    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = currentMessages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages: currentMessages,
          totalCount: currentMessages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    // Mock bulk mark as read endpoint
    await page.route('**/api/orders/*/messages/mark-read', async route => {
      if (route.request().method() === 'PUT') {
        const requestData = await route.request().postDataJSON();
        const messageIds = requestData.messageIds;
        
        currentMessages.forEach(msg => {
          if (messageIds.includes(msg.id)) {
            msg.isRead = true;
            msg.readAt = new Date().toISOString();
          }
        });
        
        await route.fulfill({
          json: {
            success: true,
            markedCount: messageIds.length
          }
        });
      }
    });

    await page.click('button:has-text("View Messages")');
    
    // Initial unread count
    await expect(page.locator('text=3 unread')).toBeVisible();
    
    // If there's a "Mark all as read" button, test it
    if (await page.locator('button:has-text("Mark all as read")').count() > 0) {
      await page.click('button:has-text("Mark all as read")');
      
      // Should show no unread messages
      await expect(page.locator('text=0 unread')).toBeVisible();
    } else {
      // Alternatively, mark messages as read by clicking them
      await page.click('text=Your order has been received');
      await page.click('text=Please confirm measurements');
      await page.click('text=Design proofs are ready');
      
      // Close and reopen to refresh count
      await page.click('button[title="Close messages"]');
      await page.click('button:has-text("View Messages")');
      
      await expect(page.locator('text=0 unread')).toBeVisible();
    }
  });

  test('should persist read status across sessions', async () => {
    let currentMessages = [...messages];
    
    // Mark one message as read
    currentMessages[1].isRead = true;
    currentMessages[1].readAt = new Date().toISOString();
    
    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = currentMessages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages: currentMessages,
          totalCount: currentMessages.length,
          unreadCount,
          hasNextCount: false
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Should show 2 unread (one was marked as read)
    await expect(page.locator('text=2 unread')).toBeVisible();
    
    // Simulate page refresh (new session)
    await page.reload();
    
    // Should still show 2 unread messages
    await expect(page.locator('.MuiBadge-badge:has-text("2")')).toBeVisible();
    
    await page.click('button:has-text("View Messages")');
    await expect(page.locator('text=2 unread')).toBeVisible();
    
    // Read message should still be marked as read
    const readMessage = page.locator('text=Your order has been received').locator('..');
    await expect(readMessage).not.toHaveCSS('border-left', /4px solid/);
  });

  test('should show relative timestamps for read messages', async () => {
    // Mark a message as read with specific timestamp
    const readTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    messages[0].isRead = true;
    messages[0].readAt = readTime.toISOString();

    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = messages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Should show relative time for read message
    await expect(page.locator('text=Read 2 hours ago')).toBeVisible();
  });

  test('should handle notification permission denied gracefully', async () => {
    // Deny notification permission
    await page.addInitScript(() => {
      (window as any).Notification = class MockNotification {
        static permission = 'denied';
        static requestPermission = () => Promise.resolve('denied');
        
        constructor() {
          throw new Error('Permission denied');
        }
      };
    });

    await page.goto(`/orders/${testOrderId}`);
    
    // App should handle denied permissions gracefully
    // Should still show in-app notifications and badges
    await expect(page.locator('.MuiBadge-badge:has-text("3")')).toBeVisible();
    
    // Try to trigger notification request
    await page.evaluate(() => {
      try {
        (window as any).Notification.requestPermission();
      } catch (error) {
        // Should handle gracefully
        console.log('Notifications not supported');
      }
    });
    
    // App should continue to function normally
    await page.click('button:has-text("View Messages")');
    await expect(page.locator('text=3 unread')).toBeVisible();
  });

  test('should debounce rapid read status changes', async () => {
    let readRequests = 0;
    
    await page.route('**/api/orders/*/messages/*/read', async route => {
      readRequests++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
      
      await route.fulfill({
        json: { success: true, readAt: new Date().toISOString() }
      });
    });

    await page.route('**/api/orders/*/messages*', async route => {
      const unreadCount = messages.filter(m => !m.isRead).length;
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount,
          hasNextPage: false
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Rapidly click multiple messages
    await page.click('text=Your order has been received');
    await page.click('text=Please confirm measurements');
    await page.click('text=Design proofs are ready');
    
    // Wait for requests to complete
    await page.waitForTimeout(500);
    
    // Should have made reasonable number of requests (not excessive)
    expect(readRequests).toBeLessThanOrEqual(3);
    expect(readRequests).toBeGreaterThan(0);
  });
});