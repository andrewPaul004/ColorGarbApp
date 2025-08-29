import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for message search functionality
 * Tests search features including history, keyboard shortcuts, and filtering
 */

test.describe('Message Search Functionality', () => {
  let page: Page;
  const testOrderId = 'test-order-123';
  const testMessages = [
    {
      id: '1',
      content: 'Hello, I have a question about the costume design',
      senderName: 'John Director',
      senderRole: 'Director',
      messageType: 'Question',
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      content: 'Budget update: approved additional $500 for premium fabric',
      senderName: 'Sarah Finance',
      senderRole: 'Finance',
      messageType: 'Update',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      content: 'URGENT: Need measurements by Friday for production',
      senderName: 'ColorGarb Staff',
      senderRole: 'ColorGarbStaff', 
      messageType: 'Urgent',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock API responses
    await page.route('**/api/orders/*/messages*', async route => {
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const searchTerm = urlParams.get('searchTerm');
      const messageType = urlParams.get('messageType');
      const senderRole = urlParams.get('senderRole');
      
      let filteredMessages = [...testMessages];
      
      // Apply search filters
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
    });

    // Navigate to order detail page
    await page.goto(`/orders/${testOrderId}`);
    
    // Open message center
    await page.click('button:has-text("View Messages")');
    await expect(page.locator('[data-testid="message-center"]')).toBeVisible();
    
    // Open search panel
    await page.click('button[title="Search messages"]');
    await expect(page.locator('input[placeholder*="Search messages"]')).toBeVisible();
  });

  test('should perform basic text search', async () => {
    // Enter search term
    await page.fill('input[placeholder*="Search messages"]', 'costume');
    await page.click('button:has-text("Search")');
    
    // Verify search results
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=costume design')).toBeVisible();
    await expect(page.locator('text=Budget update')).not.toBeVisible();
  });

  test('should filter by message type', async () => {
    // Open advanced filters
    await page.click('button:has-text("Show Filters")');
    
    // Select message type
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Urgent")');
    
    // Execute search
    await page.click('button:has-text("Search")');
    
    // Verify results
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=URGENT')).toBeVisible();
    await expect(page.locator('text=costume design')).not.toBeVisible();
  });

  test('should filter by sender role', async () => {
    // Open advanced filters
    await page.click('button:has-text("Show Filters")');
    
    // Select sender role
    await page.click('div[aria-labelledby*="sender-role"] .MuiSelect-select');
    await page.click('li:has-text("Finance")');
    
    // Execute search
    await page.click('button:has-text("Search")');
    
    // Verify results
    await expect(page.locator('text=1 message')).toBeVisible();
    await expect(page.locator('text=Budget update')).toBeVisible();
    await expect(page.locator('text=Sarah Finance')).toBeVisible();
  });

  test('should use keyboard shortcuts', async () => {
    const searchInput = page.locator('input[placeholder*="Search messages"]');
    
    // Test Ctrl+F to focus search
    await page.keyboard.press('Control+f');
    await expect(searchInput).toBeFocused();
    
    // Test Escape to clear search
    await searchInput.fill('test search');
    await page.keyboard.press('Escape');
    await expect(searchInput).toHaveValue('');
    
    // Test Enter to search
    await searchInput.fill('budget');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=1 message')).toBeVisible();
  });

  test('should manage search history', async () => {
    const searchInput = page.locator('input[placeholder*="Search messages"]');
    
    // Perform several searches
    const searchTerms = ['costume', 'budget', 'urgent'];
    
    for (const term of searchTerms) {
      await searchInput.fill(term);
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(500); // Allow search to complete
    }
    
    // Clear search and check history
    await searchInput.fill('');
    
    // Open search history (if available)
    if (await page.locator('button[title*="history"]').count() > 0) {
      await page.click('button[title*="history"]');
      
      // Verify history items are present
      for (const term of searchTerms.reverse()) { // Most recent first
        await expect(page.locator(`text=${term}`)).toBeVisible();
      }
      
      // Test selecting from history
      await page.click('text=budget');
      await expect(searchInput).toHaveValue('budget');
    }
  });

  test('should clear all filters', async () => {
    // Set up multiple filters
    await page.fill('input[placeholder*="Search messages"]', 'test');
    
    await page.click('button:has-text("Show Filters")');
    await page.click('div[aria-labelledby*="message-type"] .MuiSelect-select');
    await page.click('li:has-text("Question")');
    
    // Execute search to activate filters
    await page.click('button:has-text("Search")');
    
    // Verify active filters are shown
    await expect(page.locator('.MuiChip-root', { hasText: 'Search: "test"' })).toBeVisible();
    await expect(page.locator('.MuiChip-root', { hasText: 'Type: Question' })).toBeVisible();
    
    // Clear all filters
    await page.click('button:has-text("Clear All")');
    
    // Verify filters are cleared
    await expect(page.locator('.MuiChip-root', { hasText: 'Search:' })).not.toBeVisible();
    await expect(page.locator('.MuiChip-root', { hasText: 'Type:' })).not.toBeVisible();
    await expect(page.locator('input[placeholder*="Search messages"]')).toHaveValue('');
  });

  test('should handle date range filtering', async () => {
    // Open advanced filters
    await page.click('button:has-text("Show Filters")');
    
    // Set date range (last 24 hours)
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    
    await page.fill('input[placeholder*="From Date"]', yesterday.toISOString().split('T')[0]);
    await page.fill('input[placeholder*="To Date"]', today.toISOString().split('T')[0]);
    
    // Execute search
    await page.click('button:has-text("Search")');
    
    // Verify date filter chips are shown
    await expect(page.locator('.MuiChip-root', { hasText: 'From:' })).toBeVisible();
    await expect(page.locator('.MuiChip-root', { hasText: 'To:' })).toBeVisible();
  });

  test('should show search results count', async () => {
    // Search for term that should return specific number of results
    await page.fill('input[placeholder*="Search messages"]', 'update');
    await page.click('button:has-text("Search")');
    
    // Verify result count is displayed
    await expect(page.locator('text=1 message')).toBeVisible();
    
    // Search for term with no results
    await page.fill('input[placeholder*="Search messages"]', 'nonexistent');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=0 messages')).toBeVisible();
  });

  test('should handle search errors gracefully', async () => {
    // Mock API error
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        status: 500,
        json: { error: 'Search service unavailable' }
      });
    });
    
    // Attempt search
    await page.fill('input[placeholder*="Search messages"]', 'test');
    await page.click('button:has-text("Search")');
    
    // Verify error handling
    await expect(page.locator('text*="error"', { exact: false })).toBeVisible();
  });

  test('should be accessible with screen readers', async () => {
    const searchInput = page.locator('input[placeholder*="Search messages"]');
    
    // Check for proper ARIA labels
    await expect(searchInput).toHaveAttribute('aria-label', 'Search messages');
    
    // Check for help text
    await expect(page.locator('#search-help')).toBeVisible();
    
    // Check filter controls have proper labels
    await page.click('button:has-text("Show Filters")');
    
    const messageTypeSelect = page.locator('div[aria-labelledby*="message-type"]');
    const senderRoleSelect = page.locator('div[aria-labelledby*="sender-role"]');
    
    await expect(messageTypeSelect).toBeVisible();
    await expect(senderRoleSelect).toBeVisible();
  });
});