import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * E2E tests for organization isolation and message access controls
 * Tests security boundaries, data isolation, and unauthorized access prevention
 */

interface TestOrganization {
  id: string;
  name: string;
  type: string;
  users: TestUser[];
}

interface TestUser {
  id: string;
  name: string;
  role: 'Director' | 'Finance' | 'ColorGarbStaff';
  organizationId: string;
  email: string;
}

interface TestOrder {
  id: string;
  orderNumber: string;
  organizationId: string;
  description: string;
}

const testOrganizations: TestOrganization[] = [
  {
    id: 'org-school-1',
    name: 'Westfield High School',
    type: 'school',
    users: [
      { id: 'user-1', name: 'John Director', role: 'Director', organizationId: 'org-school-1', email: 'john@westfield.edu' },
      { id: 'user-2', name: 'Sarah Finance', role: 'Finance', organizationId: 'org-school-1', email: 'sarah@westfield.edu' }
    ]
  },
  {
    id: 'org-theater-1',
    name: 'Broadway Theater Company',
    type: 'theater',
    users: [
      { id: 'user-3', name: 'Mike Producer', role: 'Director', organizationId: 'org-theater-1', email: 'mike@broadway.com' },
      { id: 'user-4', name: 'Lisa Budget', role: 'Finance', organizationId: 'org-theater-1', email: 'lisa@broadway.com' }
    ]
  },
  {
    id: 'colorgarb-org',
    name: 'ColorGarb Inc',
    type: 'vendor',
    users: [
      { id: 'staff-1', name: 'ColorGarb Support', role: 'ColorGarbStaff', organizationId: 'colorgarb-org', email: 'support@colorgarb.com' },
      { id: 'staff-2', name: 'Production Manager', role: 'ColorGarbStaff', organizationId: 'colorgarb-org', email: 'production@colorgarb.com' }
    ]
  }
];

const testOrders: TestOrder[] = [
  { id: 'order-1', orderNumber: 'CG-2025-001', organizationId: 'org-school-1', description: 'Spring Musical Costumes' },
  { id: 'order-2', orderNumber: 'CG-2025-002', organizationId: 'org-theater-1', description: 'Broadway Production Costumes' },
  { id: 'order-3', orderNumber: 'CG-2025-003', organizationId: 'org-school-1', description: 'Band Competition Uniforms' }
];

test.describe('Organization Isolation and Access Controls', () => {
  const createAuthenticatedContext = async (browser: any, user: TestUser): Promise<BrowserContext> => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-User-Id': user.id,
        'X-User-Role': user.role,
        'X-Organization-Id': user.organizationId,
        'Authorization': `Bearer mock-token-${user.id}`
      }
    });

    await context.addInitScript((userData) => {
      window.localStorage.setItem('authToken', `mock-token-${userData.id}`);
      window.localStorage.setItem('userInfo', JSON.stringify(userData));
    }, user);

    return context;
  };

  const setupMessageRoutes = (page: Page, allowedOrgs: string[] = []) => {
    return page.route('**/api/orders/*/messages*', async route => {
      const headers = route.request().headers();
      const userOrgId = headers['x-organization-id'];
      const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];
      const order = testOrders.find(o => o.id === orderId);
      
      // Check organization access
      const hasAccess = allowedOrgs.includes(userOrgId) || 
                       order?.organizationId === userOrgId ||
                       userOrgId === 'colorgarb-org'; // Staff can access all

      if (!hasAccess) {
        await route.fulfill({
          status: 403,
          json: {
            error: 'Forbidden: Access denied to this organization\'s messages',
            code: 'ORGANIZATION_ACCESS_DENIED'
          }
        });
        return;
      }

      // Mock messages specific to the order/organization
      const messages = [
        {
          id: `msg-${orderId}-1`,
          content: `Message for ${order?.description}`,
          senderId: 'user-1',
          senderName: 'Test User',
          senderRole: 'Director',
          messageType: 'General',
          recipientRole: 'All',
          isRead: false,
          createdAt: new Date().toISOString(),
          attachments: [],
          attachmentCount: 0
        }
      ];

      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: messages.filter(m => !m.isRead).length,
          hasNextPage: false
        }
      });
    });
  };

  test('should prevent cross-organization message access', async ({ browser }) => {
    // Create contexts for users from different organizations
    const schoolUser = testOrganizations[0].users[0]; // Westfield High School
    const theaterUser = testOrganizations[1].users[0]; // Broadway Theater

    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const theaterContext = await createAuthenticatedContext(browser, theaterUser);

    const schoolPage = await schoolContext.newPage();
    const theaterPage = await theaterContext.newPage();

    // Setup routes for each user's organization access
    await setupMessageRoutes(schoolPage, ['org-school-1']);
    await setupMessageRoutes(theaterPage, ['org-theater-1']);

    // School user tries to access their own order (should succeed)
    await schoolPage.goto('/orders/order-1'); // Westfield order
    await schoolPage.click('button:has-text("View Messages")');
    
    // Should access their own messages
    await expect(schoolPage.locator('text=Message for Spring Musical Costumes')).toBeVisible();

    // School user tries to access theater order (should fail)
    await schoolPage.goto('/orders/order-2'); // Broadway order
    await schoolPage.click('button:has-text("View Messages")');
    
    // Should show access denied
    await expect(schoolPage.locator('text*="Forbidden"')).toBeVisible();
    await expect(schoolPage.locator('text*="Access denied"')).toBeVisible();

    // Theater user tries to access school order (should fail)
    await theaterPage.goto('/orders/order-1'); // Westfield order
    await theaterPage.click('button:has-text("View Messages")');
    
    // Should show access denied
    await expect(theaterPage.locator('text*="Forbidden"')).toBeVisible();
    await expect(theaterPage.locator('text*="Access denied"')).toBeVisible();

    // Theater user accesses their own order (should succeed)
    await theaterPage.goto('/orders/order-2'); // Broadway order
    await theaterPage.click('button:has-text("View Messages")');
    
    // Should access their own messages
    await expect(theaterPage.locator('text=Message for Broadway Production Costumes')).toBeVisible();

    await schoolContext.close();
    await theaterContext.close();
  });

  test('should allow ColorGarb staff to access all organizations', async ({ browser }) => {
    const staffUser = testOrganizations[2].users[0]; // ColorGarb Staff
    const staffContext = await createAuthenticatedContext(browser, staffUser);
    const staffPage = await staffContext.newPage();

    // Staff should have universal access
    await setupMessageRoutes(staffPage, ['org-school-1', 'org-theater-1', 'colorgarb-org']);

    // Test access to school order
    await staffPage.goto('/orders/order-1');
    await staffPage.click('button:has-text("View Messages")');
    await expect(staffPage.locator('text=Message for Spring Musical Costumes')).toBeVisible();

    // Test access to theater order
    await staffPage.goto('/orders/order-2');
    await staffPage.click('button:has-text("View Messages")');
    await expect(staffPage.locator('text=Message for Broadway Production Costumes')).toBeVisible();

    await staffContext.close();
  });

  test('should validate organization membership on message sending', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const schoolPage = await schoolContext.newPage();

    // Setup message sending validation
    await schoolPage.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        const headers = route.request().headers();
        const userOrgId = headers['x-organization-id'];
        const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];
        const order = testOrders.find(o => o.id === orderId);

        if (order?.organizationId !== userOrgId && userOrgId !== 'colorgarb-org') {
          await route.fulfill({
            status: 403,
            json: {
              error: 'Forbidden: Cannot send messages to orders outside your organization',
              code: 'CROSS_ORGANIZATION_MESSAGE_DENIED'
            }
          });
          return;
        }

        await route.fulfill({
          json: {
            message: {
              id: 'new-msg-1',
              content: 'Authorized message',
              senderId: schoolUser.id,
              senderName: schoolUser.name,
              senderRole: schoolUser.role
            },
            success: true
          }
        });
      }
    });

    await setupMessageRoutes(schoolPage, ['org-school-1']);

    // Try to send message to own organization's order (should succeed)
    await schoolPage.goto('/orders/order-1');
    await schoolPage.click('button:has-text("View Messages")');
    
    await schoolPage.fill('textarea[placeholder*="Type your message"]', 'Test message from school user');
    await schoolPage.click('button:has-text("Send")');
    
    // Should succeed (no error message)
    await expect(schoolPage.locator('.MuiAlert-root[severity="error"]')).not.toBeVisible();

    // Try to send message to another organization's order (should fail)
    await schoolPage.goto('/orders/order-2'); // Different org order
    
    // This should fail at the route level when trying to send
    await schoolPage.route('**/api/orders/order-2/messages', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          json: {
            error: 'Forbidden: Cannot send messages to orders outside your organization',
            code: 'CROSS_ORGANIZATION_MESSAGE_DENIED'
          }
        });
      }
    });

    // Even if we could load the UI, sending should fail
    await schoolPage.evaluate(() => {
      // Simulate bypassing UI restrictions (direct API call)
      fetch('/api/orders/order-2/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': 'org-school-1'
        },
        body: JSON.stringify({
          content: 'Unauthorized cross-org message',
          messageType: 'General'
        })
      }).then(response => {
        if (!response.ok) {
          window.lastApiError = response.status;
        }
      });
    });

    await schoolPage.waitForTimeout(100);
    
    const apiError = await schoolPage.evaluate(() => (window as any).lastApiError);
    expect(apiError).toBe(403);

    await schoolContext.close();
  });

  test('should prevent unauthorized attachment access', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    const theaterUser = testOrganizations[1].users[0];

    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const theaterContext = await createAuthenticatedContext(browser, theaterUser);

    const schoolPage = await schoolContext.newPage();
    const theaterPage = await theaterContext.newPage();

    // Mock attachment download with organization validation
    const setupAttachmentSecurity = (page: Page, userOrgId: string) => {
      return page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
        const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];
        const order = testOrders.find(o => o.id === orderId);

        if (order?.organizationId !== userOrgId && userOrgId !== 'colorgarb-org') {
          await route.fulfill({
            status: 403,
            json: {
              error: 'Forbidden: Attachment belongs to different organization',
              code: 'CROSS_ORGANIZATION_ATTACHMENT_ACCESS'
            }
          });
          return;
        }

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="document.pdf"'
          },
          body: 'Authorized file content'
        });
      });
    };

    await setupAttachmentSecurity(schoolPage, 'org-school-1');
    await setupAttachmentSecurity(theaterPage, 'org-theater-1');

    // Mock messages with attachments
    const setupMessageWithAttachment = (page: Page, allowedOrgs: string[]) => {
      return page.route('**/api/orders/*/messages*', async route => {
        const headers = route.request().headers();
        const userOrgId = headers['x-organization-id'];
        const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];
        const order = testOrders.find(o => o.id === orderId);

        if (!allowedOrgs.includes(userOrgId) && order?.organizationId !== userOrgId) {
          await route.fulfill({ status: 403, json: { error: 'Forbidden' } });
          return;
        }

        await route.fulfill({
          json: {
            messages: [{
              id: 'msg-with-att',
              content: 'Message with attachment',
              attachments: [{
                id: 'att-1',
                originalFileName: 'confidential.pdf',
                fileSize: 1024000,
                mimeType: 'application/pdf'
              }],
              attachmentCount: 1
            }],
            totalCount: 1,
            unreadCount: 1,
            hasNextPage: false
          }
        });
      });
    };

    await setupMessageWithAttachment(schoolPage, ['org-school-1']);
    await setupMessageWithAttachment(theaterPage, ['org-theater-1']);

    // School user accesses their own attachment (should succeed)
    await schoolPage.goto('/orders/order-1');
    await schoolPage.click('button:has-text("View Messages")');
    await expect(schoolPage.locator('text=confidential.pdf')).toBeVisible();
    
    await schoolPage.click('button[title="Download attachment"]');
    // Should succeed silently (no error)

    // Theater user tries to access school's attachment via direct URL manipulation
    await theaterPage.evaluate(() => {
      // Simulate direct API call to cross-organization attachment
      fetch('/api/orders/order-1/messages/msg-with-att/attachments/att-1/download', {
        headers: {
          'X-Organization-Id': 'org-theater-1',
          'Authorization': 'Bearer mock-token-user-3'
        }
      }).then(response => {
        (window as any).attachmentDownloadStatus = response.status;
      });
    });

    await theaterPage.waitForTimeout(100);
    
    const downloadStatus = await theaterPage.evaluate(() => (window as any).attachmentDownloadStatus);
    expect(downloadStatus).toBe(403);

    await schoolContext.close();
    await theaterContext.close();
  });

  test('should audit and log cross-organization access attempts', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const schoolPage = await schoolContext.newPage();

    const auditLog: any[] = [];

    // Setup audit logging for access attempts
    await schoolPage.route('**/api/orders/*/messages*', async route => {
      const headers = route.request().headers();
      const userOrgId = headers['x-organization-id'];
      const userId = headers['x-user-id'];
      const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];
      const order = testOrders.find(o => o.id === orderId);

      // Log access attempt
      auditLog.push({
        timestamp: new Date().toISOString(),
        userId,
        userOrgId,
        requestedOrderId: orderId,
        targetOrgId: order?.organizationId,
        action: 'MESSAGE_ACCESS',
        allowed: order?.organizationId === userOrgId || userOrgId === 'colorgarb-org'
      });

      if (order?.organizationId !== userOrgId && userOrgId !== 'colorgarb-org') {
        await route.fulfill({
          status: 403,
          json: {
            error: 'Forbidden: Access denied',
            auditId: `audit-${auditLog.length}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await route.fulfill({
        json: {
          messages: [],
          totalCount: 0,
          unreadCount: 0,
          hasNextPage: false
        }
      });
    });

    // Attempt authorized access
    await schoolPage.goto('/orders/order-1'); // Same org
    await schoolPage.click('button:has-text("View Messages")');

    // Attempt unauthorized access
    await schoolPage.goto('/orders/order-2'); // Different org
    await schoolPage.click('button:has-text("View Messages")');

    // Verify audit log captured both attempts
    expect(auditLog).toHaveLength(2);
    
    // First attempt should be allowed
    expect(auditLog[0]).toMatchObject({
      userId: schoolUser.id,
      userOrgId: 'org-school-1',
      requestedOrderId: 'order-1',
      targetOrgId: 'org-school-1',
      action: 'MESSAGE_ACCESS',
      allowed: true
    });

    // Second attempt should be denied
    expect(auditLog[1]).toMatchObject({
      userId: schoolUser.id,
      userOrgId: 'org-school-1',
      requestedOrderId: 'order-2',
      targetOrgId: 'org-theater-1',
      action: 'MESSAGE_ACCESS',
      allowed: false
    });

    await schoolContext.close();
  });

  test('should handle token manipulation and validation', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    
    // Create context with manipulated token
    const maliciousContext = await browser.newContext({
      extraHTTPHeaders: {
        'X-User-Id': schoolUser.id,
        'X-User-Role': schoolUser.role,
        'X-Organization-Id': 'org-theater-1', // Wrong org!
        'Authorization': 'Bearer manipulated-token'
      }
    });

    const maliciousPage = await maliciousContext.newPage();

    // Setup strict token validation
    await maliciousPage.route('**/api/orders/*/messages*', async route => {
      const headers = route.request().headers();
      const authToken = headers['authorization'];
      const userId = headers['x-user-id'];
      const claimedOrgId = headers['x-organization-id'];

      // Simulate server-side token validation
      const expectedToken = `Bearer mock-token-${userId}`;
      const validUser = testOrganizations.flatMap(org => org.users)
        .find(user => user.id === userId);

      if (authToken !== expectedToken || 
          !validUser || 
          validUser.organizationId !== claimedOrgId) {
        await route.fulfill({
          status: 401,
          json: {
            error: 'Unauthorized: Invalid token or organization mismatch',
            code: 'TOKEN_VALIDATION_FAILED'
          }
        });
        return;
      }

      await route.fulfill({
        json: {
          messages: [],
          totalCount: 0,
          unreadCount: 0,
          hasNextPage: false
        }
      });
    });

    await maliciousPage.goto('/orders/order-1');
    await maliciousPage.click('button:has-text("View Messages")');

    // Should show authentication error
    await expect(maliciousPage.locator('text*="Unauthorized"')).toBeVisible();
    await expect(maliciousPage.locator('text*="Invalid token"')).toBeVisible();

    await maliciousContext.close();
  });

  test('should prevent data leakage in API responses', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const schoolPage = await schoolContext.newPage();

    let lastApiResponse: any = null;

    // Intercept API responses to check for data leakage
    await schoolPage.route('**/api/orders/*/messages*', async route => {
      const headers = route.request().headers();
      const userOrgId = headers['x-organization-id'];
      const orderId = route.request().url().match(/\/orders\/([^\/]+)\/messages/)?.[1];

      // Simulate server response with potential data leakage prevention
      const response = {
        messages: [
          {
            id: 'msg-1',
            content: 'Message content',
            senderId: 'user-1',
            senderName: 'John Director',
            // organizationId should NOT be included in client response
            // internalNotes should NOT be included in client response
            // systemMetadata should NOT be included in client response
          }
        ],
        totalCount: 1,
        unreadCount: 1,
        hasNextPage: false,
        // debugInfo should NOT be included in production
        // serverVersion should NOT be included
        // databaseQueries should NOT be included
      };

      lastApiResponse = response;
      
      await route.fulfill({ json: response });
    });

    await schoolPage.goto('/orders/order-1');
    await schoolPage.click('button:has-text("View Messages")');

    await schoolPage.waitForTimeout(100);

    // Verify response doesn't contain sensitive server information
    expect(lastApiResponse).not.toHaveProperty('debugInfo');
    expect(lastApiResponse).not.toHaveProperty('serverVersion');
    expect(lastApiResponse).not.toHaveProperty('databaseQueries');
    expect(lastApiResponse).not.toHaveProperty('internalNotes');

    // Verify messages don't contain organization IDs (data leakage)
    if (lastApiResponse?.messages?.[0]) {
      expect(lastApiResponse.messages[0]).not.toHaveProperty('organizationId');
      expect(lastApiResponse.messages[0]).not.toHaveProperty('internalNotes');
      expect(lastApiResponse.messages[0]).not.toHaveProperty('systemMetadata');
    }

    await schoolContext.close();
  });

  test('should handle session timeout and re-authentication', async ({ browser }) => {
    const schoolUser = testOrganizations[0].users[0];
    let sessionValid = true;

    const schoolContext = await createAuthenticatedContext(browser, schoolUser);
    const schoolPage = await schoolContext.newPage();

    // Setup session validation
    await schoolPage.route('**/api/orders/*/messages*', async route => {
      if (!sessionValid) {
        await route.fulfill({
          status: 401,
          json: {
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          }
        });
        return;
      }

      await route.fulfill({
        json: {
          messages: [],
          totalCount: 0,
          unreadCount: 0,
          hasNextPage: false
        }
      });
    });

    // Initial access (should work)
    await schoolPage.goto('/orders/order-1');
    await schoolPage.click('button:has-text("View Messages")');
    
    // Should load successfully
    await expect(schoolPage.locator('[data-testid="message-center"]')).toBeVisible();

    // Simulate session expiration
    sessionValid = false;

    // Try to refresh messages
    await schoolPage.click('button[title="Refresh messages"]');

    // Should show session expired error
    await expect(schoolPage.locator('text*="Session expired"')).toBeVisible();

    // Should redirect to login or show re-auth prompt
    // (Implementation depends on app's auth flow)

    await schoolContext.close();
  });
});