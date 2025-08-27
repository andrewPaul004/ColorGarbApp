import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * E2E tests for messaging workflows across different user roles
 * Tests role-based permissions, message routing, and access controls
 */

interface UserRole {
  name: string;
  role: 'Director' | 'Finance' | 'ColorGarbStaff';
  organizationId: string;
  userId: string;
  permissions: string[];
}

const testUsers: Record<string, UserRole> = {
  director: {
    name: 'John Director',
    role: 'Director',
    organizationId: 'org-123',
    userId: 'user-director-1',
    permissions: ['view_messages', 'send_messages', 'manage_order']
  },
  finance: {
    name: 'Sarah Finance',
    role: 'Finance', 
    organizationId: 'org-123',
    userId: 'user-finance-1',
    permissions: ['view_messages', 'send_messages', 'manage_payments']
  },
  staff: {
    name: 'ColorGarb Support',
    role: 'ColorGarbStaff',
    organizationId: 'colorgarb-org',
    userId: 'user-staff-1',
    permissions: ['view_all_messages', 'send_messages', 'manage_orders', 'access_all_orgs']
  }
};

test.describe('User Role Messaging Workflows', () => {
  const testOrderId = 'test-order-roles';
  let messages: any[] = [];

  // Helper function to create browser context for specific user
  const createUserContext = async (browser: any, user: UserRole): Promise<BrowserContext> => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-User-Id': user.userId,
        'X-User-Role': user.role,
        'X-Organization-Id': user.organizationId
      }
    });
    
    // Mock authentication state
    await context.addInitScript((userData) => {
      window.localStorage.setItem('authToken', `mock-token-${userData.userId}`);
      window.localStorage.setItem('userInfo', JSON.stringify(userData));
    }, user);
    
    return context;
  };

  // Helper to add message with proper role context
  const addMessage = (content: string, sender: UserRole, messageType = 'General', recipientRole = 'All') => {
    const message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      senderId: sender.userId,
      senderName: sender.name,
      senderRole: sender.role,
      messageType,
      recipientRole,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      attachmentCount: 0,
      replyToMessageId: null,
      replyToMessage: null
    };
    messages.unshift(message);
    return message;
  };

  test.beforeEach(async ({ browser }) => {
    // Reset messages for each test
    messages.length = 0;
    
    // Add initial messages from different roles
    addMessage(
      'Welcome to your order! We\'ll keep you updated on progress.',
      testUsers.staff,
      'General',
      'All'
    );
  });

  test('should handle Director role messaging workflow', async ({ browser }) => {
    const context = await createUserContext(browser, testUsers.director);
    const page = await context.newPage();

    // Mock API responses with role-based filtering
    await page.route('**/api/orders/*/messages*', async route => {
      const method = route.request().method();
      const headers = route.request().headers();
      
      if (method === 'GET') {
        // Director can see all messages for their organization's orders
        const visibleMessages = messages.filter(msg => 
          msg.recipientRole === 'All' || 
          msg.recipientRole === 'Director' ||
          msg.senderRole === 'Director'
        );
        
        await route.fulfill({
          json: {
            messages: visibleMessages,
            totalCount: visibleMessages.length,
            unreadCount: visibleMessages.filter(m => !m.isRead).length,
            hasNextPage: false
          }
        });
      } else if (method === 'POST') {
        // Director can send messages
        const requestData = await route.request().postData();
        const newMessage = addMessage(
          'Message from Director role',
          testUsers.director,
          'Question',
          'ColorGarbStaff'
        );
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: [],
            success: true
          }
        });
      }
    });

    await page.goto(`/orders/${testOrderId}`);
    
    // Test Director can access message center
    await page.click('button:has-text("View Messages")');
    await expect(page.locator('[data-testid="message-center"]')).toBeVisible();
    
    // Verify Director can see welcome message
    await expect(page.locator('text=Welcome to your order!')).toBeVisible();
    
    // Test Director can send messages to staff
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('I have a question about the timeline for our spring musical costumes.');
    
    // Set recipient to ColorGarb Staff
    await page.click('button:has-text("Show Options")');
    await page.click('div[aria-labelledby*="recipient"] .MuiSelect-select');
    await page.click('li:has-text("ColorGarb Staff")');
    
    // Set message type to Question
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Question")');
    
    await page.click('button:has-text("Send")');
    
    // Verify message was sent
    await expect(page.locator('text=I have a question about the timeline')).toBeVisible();
    
    // Verify Director role badge is shown
    await expect(page.locator('.MuiChip-root:has-text("Director")')).toBeVisible();
    
    await context.close();
  });

  test('should handle Finance role messaging workflow', async ({ browser }) => {
    const context = await createUserContext(browser, testUsers.finance);
    const page = await context.newPage();

    await page.route('**/api/orders/*/messages*', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        // Finance can see messages relevant to their role
        const visibleMessages = messages.filter(msg =>
          msg.recipientRole === 'All' || 
          msg.recipientRole === 'Finance' ||
          msg.senderRole === 'Finance'
        );
        
        await route.fulfill({
          json: {
            messages: visibleMessages,
            totalCount: visibleMessages.length,
            unreadCount: visibleMessages.filter(m => !m.isRead).length,
            hasNextPage: false
          }
        });
      } else if (method === 'POST') {
        const newMessage = addMessage(
          'Budget approved for additional requirements',
          testUsers.finance,
          'Update',
          'All'
        );
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: [],
            success: true
          }
        });
      }
    });

    await page.goto(`/orders/${testOrderId}`);
    await page.click('button:has-text("View Messages")');
    
    // Test Finance can send budget updates
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('Budget has been approved for premium fabric upgrade - additional $500 authorized.');
    
    // Set message type to Update
    await page.click('button:has-text("Show Options")');
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Update")');
    
    await page.click('button:has-text("Send")');
    
    // Verify Finance message appears with proper role badge
    await expect(page.locator('text=Budget has been approved')).toBeVisible();
    await expect(page.locator('.MuiChip-root:has-text("Finance")')).toBeVisible();
    
    // Verify Update message type is shown
    await expect(page.locator('.MuiChip-root:has-text("Update")')).toBeVisible();
    
    await context.close();
  });

  test('should handle ColorGarb Staff role messaging workflow', async ({ browser }) => {
    const context = await createUserContext(browser, testUsers.staff);
    const page = await context.newPage();

    await page.route('**/api/orders/*/messages*', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        // Staff can see all messages (no filtering)
        await route.fulfill({
          json: {
            messages: messages,
            totalCount: messages.length,
            unreadCount: messages.filter(m => !m.isRead).length,
            hasNextPage: false
          }
        });
      } else if (method === 'POST') {
        const newMessage = addMessage(
          'Thank you for your question. Production is on schedule.',
          testUsers.staff,
          'General',
          'All'
        );
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: [],
            success: true
          }
        });
      }
    });

    await page.goto(`/orders/${testOrderId}`);
    await page.click('button:has-text("View Messages")');
    
    // Staff should see all messages in the thread
    await expect(page.locator('text=Welcome to your order!')).toBeVisible();
    
    // Test staff can reply to client questions
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('Thank you for your question. Your spring musical costumes are on schedule for delivery by March 15th.');
    
    await page.click('button:has-text("Send")');
    
    // Verify staff response
    await expect(page.locator('text=Thank you for your question')).toBeVisible();
    await expect(page.locator('.MuiChip-root:has-text("ColorGarb Staff")')).toBeVisible();
    
    await context.close();
  });

  test('should enforce role-based message visibility', async ({ browser }) => {
    // Add messages with different recipient roles
    addMessage('Message for Director only', testUsers.staff, 'General', 'Director');
    addMessage('Message for Finance only', testUsers.staff, 'General', 'Finance');
    addMessage('Message for all staff', testUsers.director, 'General', 'ColorGarbStaff');
    addMessage('Public message for everyone', testUsers.staff, 'General', 'All');

    // Test Director visibility
    const directorContext = await createUserContext(browser, testUsers.director);
    const directorPage = await directorContext.newPage();

    await directorPage.route('**/api/orders/*/messages*', async route => {
      const visibleMessages = messages.filter(msg =>
        msg.recipientRole === 'All' ||
        msg.recipientRole === 'Director' ||
        msg.senderRole === 'Director'
      );
      
      await route.fulfill({
        json: {
          messages: visibleMessages,
          totalCount: visibleMessages.length,
          unreadCount: visibleMessages.filter(m => !m.isRead).length,
          hasNextPage: false
        }
      });
    });

    await directorPage.goto(`/orders/${testOrderId}`);
    await directorPage.click('button:has-text("View Messages")');
    
    // Director should see messages for Director and All
    await expect(directorPage.locator('text=Message for Director only')).toBeVisible();
    await expect(directorPage.locator('text=Public message for everyone')).toBeVisible();
    await expect(directorPage.locator('text=Message for all staff')).toBeVisible(); // Sent by Director
    
    // Director should NOT see Finance-only messages
    await expect(directorPage.locator('text=Message for Finance only')).not.toBeVisible();

    await directorContext.close();

    // Test Finance visibility
    const financeContext = await createUserContext(browser, testUsers.finance);
    const financePage = await financeContext.newPage();

    await financePage.route('**/api/orders/*/messages*', async route => {
      const visibleMessages = messages.filter(msg =>
        msg.recipientRole === 'All' ||
        msg.recipientRole === 'Finance' ||
        msg.senderRole === 'Finance'
      );
      
      await route.fulfill({
        json: {
          messages: visibleMessages,
          totalCount: visibleMessages.length,
          unreadCount: visibleMessages.filter(m => !m.isRead).length,
          hasNextPage: false
        }
      });
    });

    await financePage.goto(`/orders/${testOrderId}`);
    await financePage.click('button:has-text("View Messages")');
    
    // Finance should see messages for Finance and All
    await expect(financePage.locator('text=Message for Finance only')).toBeVisible();
    await expect(financePage.locator('text=Public message for everyone')).toBeVisible();
    
    // Finance should NOT see Director-only messages
    await expect(financePage.locator('text=Message for Director only')).not.toBeVisible();

    await financeContext.close();
  });

  test('should handle urgent messages with proper role escalation', async ({ browser }) => {
    const directorContext = await createUserContext(browser, testUsers.director);
    const directorPage = await directorContext.newPage();

    await directorPage.route('**/api/orders/*/messages*', async route => {
      const method = route.request().method();
      
      if (method === 'POST') {
        const newMessage = addMessage(
          'URGENT: Need approval for design changes by tomorrow',
          testUsers.director,
          'Urgent',
          'ColorGarbStaff'
        );
        
        await route.fulfill({
          json: {
            message: newMessage,
            attachments: [],
            success: true
          }
        });
      } else {
        await route.fulfill({
          json: {
            messages: messages,
            totalCount: messages.length,
            unreadCount: messages.filter(m => !m.isRead).length,
            hasNextPage: false
          }
        });
      }
    });

    await directorPage.goto(`/orders/${testOrderId}`);
    await directorPage.click('button:has-text("View Messages")');
    
    // Send urgent message
    const messageInput = directorPage.locator('textarea[placeholder*="Type your message"]');
    await messageInput.fill('URGENT: We need approval for last-minute design changes by tomorrow morning.');
    
    await directorPage.click('button:has-text("Show Options")');
    await directorPage.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await directorPage.click('li:has-text("Urgent")');
    
    await directorPage.click('button:has-text("Send")');
    
    // Verify urgent message styling
    await expect(directorPage.locator('text=URGENT: We need approval')).toBeVisible();
    await expect(directorPage.locator('.MuiChip-root:has-text("Urgent")')).toHaveCSS('background-color', /error/);
    
    await directorContext.close();
  });

  test('should prevent unauthorized cross-organization access', async ({ browser }) => {
    // Create user from different organization
    const unauthorizedUser: UserRole = {
      name: 'Unauthorized User',
      role: 'Director',
      organizationId: 'different-org-456',
      userId: 'user-unauthorized',
      permissions: ['view_messages', 'send_messages']
    };

    const unauthorizedContext = await createUserContext(browser, unauthorizedUser);
    const unauthorizedPage = await unauthorizedContext.newPage();

    // Mock 403 Forbidden response for unauthorized access
    await unauthorizedPage.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        status: 403,
        json: {
          error: 'Forbidden: You do not have access to this order',
          code: 'ORGANIZATION_MISMATCH'
        }
      });
    });

    await unauthorizedPage.goto(`/orders/${testOrderId}`);
    
    // Should not be able to access message center
    await unauthorizedPage.click('button:has-text("View Messages")');
    
    // Verify access denied message
    await expect(unauthorizedPage.locator('text*="Forbidden"')).toBeVisible();
    await expect(unauthorizedPage.locator('text*="do not have access"')).toBeVisible();

    await unauthorizedContext.close();
  });

  test('should handle concurrent messaging from multiple users', async ({ browser }) => {
    // Open contexts for multiple users simultaneously
    const directorContext = await createUserContext(browser, testUsers.director);
    const financeContext = await createUserContext(browser, testUsers.finance);
    const staffContext = await createUserContext(browser, testUsers.staff);

    const directorPage = await directorContext.newPage();
    const financePage = await financeContext.newPage();
    const staffPage = await staffContext.newPage();

    let messageCounter = 1;

    // Mock API for all pages
    const setupPageRoutes = (page: Page, user: UserRole) => {
      return page.route('**/api/orders/*/messages*', async route => {
        const method = route.request().method();
        
        if (method === 'POST') {
          const content = `Message ${messageCounter++} from ${user.name}`;
          const newMessage = addMessage(content, user, 'General', 'All');
          
          await route.fulfill({
            json: {
              message: newMessage,
              attachments: [],
              success: true
            }
          });
        } else {
          // Return all messages for this test
          await route.fulfill({
            json: {
              messages: messages,
              totalCount: messages.length,
              unreadCount: messages.filter(m => !m.isRead).length,
              hasNextPage: false
            }
          });
        }
      });
    };

    await Promise.all([
      setupPageRoutes(directorPage, testUsers.director),
      setupPageRoutes(financePage, testUsers.finance),
      setupPageRoutes(staffPage, testUsers.staff)
    ]);

    // Navigate all users to the same order
    await Promise.all([
      directorPage.goto(`/orders/${testOrderId}`),
      financePage.goto(`/orders/${testOrderId}`),
      staffPage.goto(`/orders/${testOrderId}`)
    ]);

    // Open message centers
    await Promise.all([
      directorPage.click('button:has-text("View Messages")'),
      financePage.click('button:has-text("View Messages")'),
      staffPage.click('button:has-text("View Messages")')
    ]);

    // Send messages simultaneously
    await Promise.all([
      directorPage.locator('textarea[placeholder*="Type your message"]').fill('Director message'),
      financePage.locator('textarea[placeholder*="Type your message"]').fill('Finance message'),
      staffPage.locator('textarea[placeholder*="Type your message"]').fill('Staff message')
    ]);

    await Promise.all([
      directorPage.click('button:has-text("Send")'),
      financePage.click('button:has-text("Send")'),
      staffPage.click('button:has-text("Send")')
    ]);

    // Verify all messages appear (after refresh to simulate real-time updates)
    await Promise.all([
      directorPage.click('button[title="Refresh messages"]'),
      financePage.click('button[title="Refresh messages"]'),
      staffPage.click('button[title="Refresh messages"]')
    ]);

    // All users should see all messages
    const expectedTexts = ['Director message', 'Finance message', 'Staff message'];
    
    for (const text of expectedTexts) {
      await expect(directorPage.locator(`text*="${text}"`)).toBeVisible();
      await expect(financePage.locator(`text*="${text}"`)).toBeVisible();
      await expect(staffPage.locator(`text*="${text}"`)).toBeVisible();
    }

    await Promise.all([
      directorContext.close(),
      financeContext.close(),
      staffContext.close()
    ]);
  });
});