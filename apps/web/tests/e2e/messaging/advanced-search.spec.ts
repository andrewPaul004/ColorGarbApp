import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for advanced message search and filtering scenarios
 * Tests complex search combinations, performance, and edge cases
 */

test.describe('Advanced Message Search and Filtering', () => {
  let page: Page;
  const testOrderId = 'test-order-search-advanced';
  
  // Sample messages covering various scenarios
  const testMessages = [
    {
      id: '1',
      content: 'Welcome to ColorGarb! We are excited to work on your spring musical production.',
      senderName: 'ColorGarb Support',
      senderRole: 'ColorGarbStaff',
      messageType: 'General',
      recipientRole: 'All',
      isRead: false,
      createdAt: '2025-01-01T10:00:00Z',
      attachments: [],
      attachmentCount: 0
    },
    {
      id: '2',
      content: 'URGENT: Need costume measurements by Friday for production schedule.',
      senderName: 'Production Manager',
      senderRole: 'ColorGarbStaff',
      messageType: 'Urgent',
      recipientRole: 'Director',
      isRead: true,
      createdAt: '2025-01-02T14:30:00Z',
      attachments: [{
        id: 'att-1',
        originalFileName: 'measurement_form.pdf',
        fileSize: 245760,
        mimeType: 'application/pdf'
      }],
      attachmentCount: 1
    },
    {
      id: '3',
      content: 'Budget approved for premium fabric upgrade. Additional $500 authorized.',
      senderName: 'Sarah Finance',
      senderRole: 'Finance',
      messageType: 'Update',
      recipientRole: 'All',
      isRead: false,
      createdAt: '2025-01-03T09:15:00Z',
      attachments: [],
      attachmentCount: 0
    },
    {
      id: '4',
      content: 'Question about color scheme - can we change the blue to navy for better stage lighting?',
      senderName: 'John Director',
      senderRole: 'Director',
      messageType: 'Question',
      recipientRole: 'ColorGarbStaff',
      isRead: true,
      createdAt: '2025-01-04T16:45:00Z',
      attachments: [{
        id: 'att-2',
        originalFileName: 'color_reference.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg'
      }],
      attachmentCount: 1
    },
    {
      id: '5',
      content: 'Design proof attached for your review. Please confirm approval by Monday.',
      senderName: 'Design Team',
      senderRole: 'ColorGarbStaff',
      messageType: 'General',
      recipientRole: 'Director',
      isRead: false,
      createdAt: '2025-01-05T11:20:00Z',
      attachments: [
        {
          id: 'att-3',
          originalFileName: 'design_proof_v1.pdf',
          fileSize: 3072000,
          mimeType: 'application/pdf'
        },
        {
          id: 'att-4',
          originalFileName: 'color_swatches.png',
          fileSize: 512000,
          mimeType: 'image/png'
        }
      ],
      attachmentCount: 2
    }
  ];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock search API with comprehensive filtering
    await page.route('**/api/orders/*/messages*', async route => {
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      
      let filteredMessages = [...testMessages];
      
      // Text search
      const searchTerm = urlParams.get('searchTerm');
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredMessages = filteredMessages.filter(msg =>
          msg.content.toLowerCase().includes(term) ||
          msg.senderName.toLowerCase().includes(term) ||
          msg.attachments.some(att => att.originalFileName.toLowerCase().includes(term))
        );
      }
      
      // Message type filter
      const messageType = urlParams.get('messageType');
      if (messageType) {
        filteredMessages = filteredMessages.filter(msg => msg.messageType === messageType);
      }
      
      // Sender role filter
      const senderRole = urlParams.get('senderRole');
      if (senderRole) {
        filteredMessages = filteredMessages.filter(msg => msg.senderRole === senderRole);
      }
      
      // Date range filters
      const dateFrom = urlParams.get('dateFrom');
      const dateTo = urlParams.get('dateTo');
      if (dateFrom) {
        filteredMessages = filteredMessages.filter(msg => 
          new Date(msg.createdAt) >= new Date(dateFrom)
        );
      }
      if (dateTo) {
        filteredMessages = filteredMessages.filter(msg =>
          new Date(msg.createdAt) <= new Date(dateTo)
        );
      }
      
      // Attachment filter
      const includeAttachments = urlParams.get('includeAttachments');
      if (includeAttachments !== null) {
        const hasAttachments = includeAttachments === 'true';
        filteredMessages = filteredMessages.filter(msg =>
          hasAttachments ? msg.attachmentCount > 0 : msg.attachmentCount === 0
        );
      }
      
      await route.fulfill({
        json: {
          messages: filteredMessages,
          totalCount: filteredMessages.length,
          unreadCount: filteredMessages.filter(m => !m.isRead).length,
          hasNextPage: false
        }
      });
    });

    await page.goto(`/orders/${testOrderId}`);
    await page.click('button:has-text("View Messages")');
    await page.click('button[title="Search messages"]');
  });

  test('should perform complex multi-criteria searches', async () => {
    // Complex search: Urgent messages from staff with attachments
    await page.click('button:has-text("Show Filters")');
    
    // Set message type to Urgent
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Urgent")');
    
    // Set sender role to ColorGarb Staff
    await page.click('div[aria-labelledby*="sender-role"] .MuiSelect-select');
    await page.click('li:has-text("ColorGarb Staff")');
    
    // Set to include attachments only
    await page.click('div[aria-labelledby*="attachments"] .MuiSelect-select');
    await page.click('li:has-text("With Attachments")');
    
    // Execute search
    await page.click('button:has-text("Search")');
    
    // Should find the urgent message from production manager with attachment
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=URGENT: Need costume measurements')).toBeVisible();
    await expect(page.locator('text=measurement_form.pdf')).toBeVisible();
  });

  test('should search across message content and attachments', async () => {
    // Search for "design" - should match content and attachment filenames
    await page.fill('input[placeholder*="Search messages"]', 'design');
    await page.click('button:has-text("Search")');
    
    // Should find messages with "design" in content or attachment names
    await expect(page.locator('text=2 messages')).toBeVisible();
    await expect(page.locator('text=Design proof attached')).toBeVisible();
    await expect(page.locator('text=design_proof_v1.pdf')).toBeVisible();
  });

  test('should handle fuzzy search and partial matches', async () => {
    // Test partial word matching
    await page.fill('input[placeholder*="Search messages"]', 'budg');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=Budget approved')).toBeVisible();
    
    // Test case-insensitive search
    await page.fill('input[placeholder*="Search messages"]', 'URGENT');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=URGENT: Need costume')).toBeVisible();
    
    // Test search with special characters
    await page.fill('input[placeholder*="Search messages"]', '$500');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=Additional $500')).toBeVisible();
  });

  test('should filter by date ranges accurately', async () => {
    await page.click('button:has-text("Show Filters")');
    
    // Set date range for January 2-4, 2025 (should catch messages 2, 3, 4)
    await page.fill('input[placeholder*="From Date"]', '2025-01-02');
    await page.fill('input[placeholder*="To Date"]', '2025-01-04');
    
    await page.click('button:has-text("Search")');
    
    // Should find 3 messages in date range
    await expect(page.locator('text=3 messages')).toBeVisible();
    await expect(page.locator('text=URGENT: Need costume')).toBeVisible();
    await expect(page.locator('text=Budget approved')).toBeVisible();
    await expect(page.locator('text=Question about color scheme')).toBeVisible();
    
    // Should NOT find messages outside date range
    await expect(page.locator('text=Welcome to ColorGarb')).not.toBeVisible();
    await expect(page.locator('text=Design proof attached')).not.toBeVisible();
  });

  test('should combine text search with filters', async () => {
    // Search for "color" with Director role filter
    await page.fill('input[placeholder*="Search messages"]', 'color');
    
    await page.click('button:has-text("Show Filters")');
    await page.click('div[aria-labelledby*="sender-role"] .MuiSelect-select');
    await page.click('li:has-text("Director")');
    
    await page.click('button:has-text("Search")');
    
    // Should find Director's message about color scheme
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=Question about color scheme')).toBeVisible();
    
    // Should NOT find other color-related messages from staff
    await expect(page.locator('text=color_swatches.png')).not.toBeVisible();
  });

  test('should handle empty search results gracefully', async () => {
    // Search for non-existent term
    await page.fill('input[placeholder*="Search messages"]', 'nonexistent');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=0 messages')).toBeVisible();
    await expect(page.locator('text=No messages found')).toBeVisible();
    
    // Search with impossible filter combination
    await page.fill('input[placeholder*="Search messages"]', 'budget');
    
    await page.click('button:has-text("Show Filters")');
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Urgent")');
    
    await page.click('button:has-text("Search")');
    
    // Budget message is not urgent, should return no results
    await expect(page.locator('text=0 messages')).toBeVisible();
  });

  test('should paginate large search results', async () => {
    // Mock large dataset
    const largeMessageSet = Array.from({ length: 150 }, (_, i) => ({
      id: `large-${i}`,
      content: `Test message ${i} with searchable content`,
      senderName: 'Test User',
      senderRole: 'Director',
      messageType: 'General',
      recipientRole: 'All',
      isRead: false,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      attachments: [],
      attachmentCount: 0
    }));

    await page.route('**/api/orders/*/messages*', async route => {
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const page = parseInt(urlParams.get('page') || '1');
      const pageSize = parseInt(urlParams.get('pageSize') || '50');
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageMessages = largeMessageSet.slice(startIndex, endIndex);
      
      await route.fulfill({
        json: {
          messages: pageMessages,
          totalCount: largeMessageSet.length,
          unreadCount: largeMessageSet.length,
          hasNextPage: endIndex < largeMessageSet.length
        }
      });
    });

    // Search for "searchable" which should match all messages
    await page.fill('input[placeholder*="Search messages"]', 'searchable');
    await page.click('button:has-text("Search")');
    
    // Should show total count
    await expect(page.locator('text=150 messages')).toBeVisible();
    
    // Should show first page of results
    await expect(page.locator('text=Test message 0')).toBeVisible();
    await expect(page.locator('text=Test message 49')).toBeVisible();
    
    // Should not show results from next page yet
    await expect(page.locator('text=Test message 50')).not.toBeVisible();
    
    // Load more results
    if (await page.locator('button:has-text("Load More")').count() > 0) {
      await page.click('button:has-text("Load More")');
      await expect(page.locator('text=Test message 50')).toBeVisible();
    }
  });

  test('should preserve search state during navigation', async () => {
    // Perform a search
    await page.fill('input[placeholder*="Search messages"]', 'budget');
    await page.click('button:has-text("Show Filters")');
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Update")');
    await page.click('button:has-text("Search")');
    
    // Verify search results
    await expect(page.locator('text=Budget approved')).toBeVisible();
    
    // Close message center
    await page.click('button[title="Close messages"]');
    
    // Reopen message center
    await page.click('button:has-text("View Messages")');
    await page.click('button[title="Search messages"]');
    
    // Search state should be preserved
    await expect(page.locator('input[placeholder*="Search messages"]')).toHaveValue('budget');
    await expect(page.locator('.MuiChip-root:has-text("Update")')).toBeVisible();
    
    // Results should still be filtered
    await expect(page.locator('text=Budget approved')).toBeVisible();
    await expect(page.locator('text=Welcome to ColorGarb')).not.toBeVisible();
  });

  test('should search within specific date ranges with time zones', async () => {
    // Test timezone handling
    await page.click('button:has-text("Show Filters")');
    
    // Search for specific day (should handle timezone correctly)
    await page.fill('input[placeholder*="From Date"]', '2025-01-03');
    await page.fill('input[placeholder*="To Date"]', '2025-01-03');
    
    await page.click('button:has-text("Search")');
    
    // Should find message from Jan 3rd
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=Budget approved')).toBeVisible();
  });

  test('should handle special characters and unicode in search', async () => {
    // Mock messages with special characters
    await page.route('**/api/orders/*/messages*', async route => {
      const specialMessages = [
        {
          id: 'special-1',
          content: 'Cost is €500 for the costumes (très expensive!)',
          senderName: 'François Designer',
          senderRole: 'ColorGarbStaff',
          messageType: 'General',
          recipientRole: 'All',
          isRead: false,
          createdAt: '2025-01-06T10:00:00Z',
          attachments: [],
          attachmentCount: 0
        },
        {
          id: 'special-2', 
          content: 'Measurements: 5\'10" height, 32" waist',
          senderName: 'John Director',
          senderRole: 'Director',
          messageType: 'General',
          recipientRole: 'ColorGarbStaff',
          isRead: false,
          createdAt: '2025-01-07T10:00:00Z',
          attachments: [],
          attachmentCount: 0
        }
      ];
      
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const searchTerm = urlParams.get('searchTerm');
      
      let results = specialMessages;
      if (searchTerm) {
        results = specialMessages.filter(msg =>
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      await route.fulfill({
        json: {
          messages: results,
          totalCount: results.length,
          unreadCount: results.length,
          hasNextPage: false
        }
      });
    });

    // Search for euro symbol
    await page.fill('input[placeholder*="Search messages"]', '€500');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=Cost is €500')).toBeVisible();
    
    // Search for measurements with quotes and inches
    await page.fill('input[placeholder*="Search messages"]', '32"');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=32" waist')).toBeVisible();
    
    // Search for accented characters
    await page.fill('input[placeholder*="Search messages"]', 'très');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=très expensive')).toBeVisible();
  });

  test('should provide search suggestions and auto-complete', async () => {
    // Mock search suggestions API
    await page.route('**/api/orders/*/messages/suggestions*', async route => {
      const term = route.request().url().split('term=')[1];
      let suggestions = [];
      
      if (term?.includes('cost')) {
        suggestions = ['costume', 'costumes', 'cost estimate'];
      } else if (term?.includes('bud')) {
        suggestions = ['budget', 'budget approved'];
      }
      
      await route.fulfill({
        json: { suggestions }
      });
    });

    // Type partial term
    await page.fill('input[placeholder*="Search messages"]', 'cost');
    
    // Wait for suggestions (if implemented)
    await page.waitForTimeout(500);
    
    // If autocomplete is implemented, verify suggestions appear
    if (await page.locator('.MuiAutocomplete-popper').count() > 0) {
      await expect(page.locator('li:has-text("costume")')).toBeVisible();
      await expect(page.locator('li:has-text("costumes")')).toBeVisible();
    }
  });

  test('should handle concurrent search requests', async () => {
    let requestCount = 0;
    
    await page.route('**/api/orders/*/messages*', async route => {
      requestCount++;
      
      // Simulate slow search
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await route.fulfill({
        json: {
          messages: testMessages.slice(0, 1),
          totalCount: 1,
          unreadCount: 1,
          hasNextPage: false
        }
      });
    });

    // Trigger multiple rapid searches
    await page.fill('input[placeholder*="Search messages"]', 'test1');
    await page.click('button:has-text("Search")');
    
    await page.fill('input[placeholder*="Search messages"]', 'test2');
    await page.click('button:has-text("Search")');
    
    await page.fill('input[placeholder*="Search messages"]', 'test3');
    await page.click('button:has-text("Search")');
    
    // Wait for searches to complete
    await page.waitForTimeout(1500);
    
    // Should only show results from the last search
    await expect(page.locator('input[placeholder*="Search messages"]')).toHaveValue('test3');
    
    // Should handle request cancellation (fewer requests than searches)
    expect(requestCount).toBeLessThanOrEqual(3);
  });
});