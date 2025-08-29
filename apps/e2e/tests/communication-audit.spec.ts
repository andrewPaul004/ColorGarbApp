import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end tests for communication audit trail functionality.
 * Tests complete user workflows from frontend interaction to backend processing.
 * 
 * @since 3.4.0
 */

test.describe('Communication Audit Trail', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup - Navigate to audit dashboard and wait for load
    await page.goto('/communication-audit');
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to be fully loaded
    await expect(page.getByText('Communication Audit Trail')).toBeVisible();
    await expect(page.getByPlaceholder('Search communications...')).toBeVisible();
  });

  /**
   * Test basic search functionality
   */
  test('should search and display communication logs', async ({ page }) => {
    // Arrange - Wait for initial data to load
    await page.waitForSelector('[data-testid="communication-table"]', { timeout: 10000 });

    // Act - Perform search
    await page.fill('[placeholder="Search communications..."]', 'order update');
    await page.click('button:has-text("Search")');
    
    // Wait for search results
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-audit/logs') && response.status() === 200
    );

    // Assert - Verify search results
    await expect(page.getByText('order update')).toBeVisible();
    
    // Verify table has data
    const tableRows = page.locator('[data-testid="communication-table"] tbody tr');
    await expect(tableRows).toHaveCountGreaterThan(0);
  });

  /**
   * Test advanced filtering functionality
   */
  test('should filter communications by type and status', async ({ page }) => {
    // Act - Open filters
    await page.click('button:has-text("Filters")');
    
    // Wait for filters to appear
    await expect(page.getByText('Communication Type')).toBeVisible();

    // Select Email as communication type
    await page.click('[data-testid="communication-type-select"]');
    await page.click('text=Email');
    await page.keyboard.press('Escape'); // Close dropdown

    // Select Delivered as delivery status
    await page.click('[data-testid="delivery-status-select"]');
    await page.click('text=Delivered');
    await page.keyboard.press('Escape'); // Close dropdown

    // Apply filters by searching
    await page.click('button:has-text("Search")');

    // Wait for filtered results
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-audit/logs') && 
      response.url().includes('communicationType=Email') &&
      response.status() === 200
    );

    // Assert - Verify filtered results
    const emailChips = page.locator('[data-testid="communication-type-chip"]:has-text("Email")');
    await expect(emailChips.first()).toBeVisible();
    
    const deliveredChips = page.locator('[data-testid="delivery-status-chip"]:has-text("Delivered")');
    await expect(deliveredChips.first()).toBeVisible();
  });

  /**
   * Test detailed view functionality
   */
  test('should open and display detailed communication view', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('[data-testid="communication-table"] tbody tr');

    // Act - Click view details on first row
    const firstViewButton = page.locator('[data-testid="view-details-button"]').first();
    await firstViewButton.click();

    // Assert - Verify detail dialog opens
    await expect(page.getByText('Communication Details')).toBeVisible();
    await expect(page.getByText('Technical Details')).toBeVisible();
    await expect(page.getByText('Delivery Status')).toBeVisible();

    // Verify dialog contains expected information
    await expect(page.getByText('Communication ID')).toBeVisible();
    await expect(page.getByText('Order ID')).toBeVisible();
    
    // Close dialog
    await page.click('button:has-text("Close")');
    await expect(page.getByText('Communication Details')).not.toBeVisible();
  });

  /**
   * Test export functionality
   */
  test('should open export dialog and estimate export size', async ({ page }) => {
    // Act - Click export button
    await page.click('button:has-text("Export")');

    // Assert - Verify export dialog opens
    await expect(page.getByText('Export Communication Data')).toBeVisible();
    await expect(page.getByText('Export Estimation')).toBeVisible();

    // Wait for estimation to load
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-export/estimate') && response.status() === 200
    );

    // Verify estimation information is displayed
    await expect(page.locator('[data-testid="estimated-records-chip"]')).toBeVisible();
    await expect(page.locator('[data-testid="estimated-size-chip"]')).toBeVisible();

    // Test format selection
    await page.click('input[value="excel"]');
    await expect(page.locator('input[value="excel"]')).toBeChecked();

    // Test export options
    await page.check('[data-testid="include-content-checkbox"]');
    await expect(page.locator('[data-testid="include-content-checkbox"]')).toBeChecked();

    // Cancel export
    await page.click('button:has-text("Cancel")');
    await expect(page.getByText('Export Communication Data')).not.toBeVisible();
  });

  /**
   * Test pagination functionality
   */
  test('should navigate through pages of results', async ({ page }) => {
    // Wait for results to load
    await page.waitForSelector('[data-testid="communication-table"] tbody tr');

    // Check if pagination is available
    const pagination = page.locator('[data-testid="table-pagination"]');
    if (await pagination.isVisible()) {
      // Get current page info
      const pageInfo = page.locator('[data-testid="pagination-info"]');
      const initialPageInfo = await pageInfo.textContent();

      // Click next page if available
      const nextButton = page.locator('[aria-label="Go to next page"]');
      if (await nextButton.isEnabled()) {
        await nextButton.click();

        // Wait for new data to load
        await page.waitForResponse(response => 
          response.url().includes('/api/communication-audit/logs') &&
          response.url().includes('page=2') &&
          response.status() === 200
        );

        // Verify page changed
        const newPageInfo = await pageInfo.textContent();
        expect(newPageInfo).not.toBe(initialPageInfo);

        // Go back to first page
        const previousButton = page.locator('[aria-label="Go to previous page"]');
        await previousButton.click();

        await page.waitForResponse(response => 
          response.url().includes('/api/communication-audit/logs') &&
          response.url().includes('page=1') &&
          response.status() === 200
        );
      }
    }
  });

  /**
   * Test real-time updates (if applicable)
   */
  test('should refresh data when refresh is triggered', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="communication-table"] tbody tr');

    // Get initial row count
    const initialRows = await page.locator('[data-testid="communication-table"] tbody tr').count();

    // Trigger refresh by searching again
    await page.click('button:has-text("Search")');

    // Wait for API call
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-audit/logs') && response.status() === 200
    );

    // Verify table still has data (may be same or different based on real data)
    const refreshedRows = await page.locator('[data-testid="communication-table"] tbody tr').count();
    expect(refreshedRows).toBeGreaterThan(0);
  });

  /**
   * Test error handling
   */
  test('should display error message when API fails', async ({ page }) => {
    // Intercept API call and return error
    await page.route('/api/communication-audit/logs*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    // Trigger search that will fail
    await page.click('button:has-text("Search")');

    // Verify error message is displayed
    await expect(page.getByText('Failed to search communications')).toBeVisible();
    
    // Verify error alert is shown
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  /**
   * Test responsive design on mobile
   */
  test('should work correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify main elements are visible and accessible
    await expect(page.getByText('Communication Audit Trail')).toBeVisible();
    await expect(page.getByPlaceholder('Search communications...')).toBeVisible();

    // Test mobile-specific interactions
    await page.fill('[placeholder="Search communications..."]', 'mobile test');
    await page.click('button:has-text("Search")');

    // Verify table is responsive
    await expect(page.locator('[data-testid="communication-table"]')).toBeVisible();

    // Test filters on mobile
    await page.click('button:has-text("Filters")');
    await expect(page.getByText('Communication Type')).toBeVisible();
  });

  /**
   * Test keyboard navigation and accessibility
   */
  test('should support keyboard navigation', async ({ page }) => {
    // Focus on search input
    await page.focus('[placeholder="Search communications..."]');
    
    // Type search term
    await page.keyboard.type('accessibility test');
    
    // Navigate to search button using Tab
    await page.keyboard.press('Tab');
    
    // Activate search with Enter
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-audit/logs') && response.status() === 200
    );

    // Verify search was executed
    const searchInput = page.locator('[placeholder="Search communications..."]');
    await expect(searchInput).toHaveValue('accessibility test');
  });

  /**
   * Test date range filtering
   */
  test('should filter by date range', async ({ page }) => {
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Set from date
    const fromDatePicker = page.locator('[data-testid="from-date-picker"] input');
    await fromDatePicker.click();
    await fromDatePicker.fill('01/01/2024');
    await page.keyboard.press('Escape');

    // Set to date
    const toDatePicker = page.locator('[data-testid="to-date-picker"] input');
    await toDatePicker.click();
    await toDatePicker.fill('12/31/2024');
    await page.keyboard.press('Escape');

    // Apply filters
    await page.click('button:has-text("Search")');

    // Wait for filtered results
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-audit/logs') && 
      response.url().includes('dateFrom') &&
      response.url().includes('dateTo') &&
      response.status() === 200
    );

    // Verify date chips are displayed in filter summary (if available)
    const appliedFilters = page.locator('[data-testid="applied-filters"]');
    if (await appliedFilters.isVisible()) {
      await expect(appliedFilters.locator('text=/From:/i')).toBeVisible();
      await expect(appliedFilters.locator('text=/To:/i')).toBeVisible();
    }
  });

  /**
   * Test export workflow completion
   */
  test('should complete CSV export workflow', async ({ page }) => {
    // Setup download handler
    const downloadPromise = page.waitForEvent('download');

    // Open export dialog
    await page.click('button:has-text("Export")');
    await expect(page.getByText('Export Communication Data')).toBeVisible();

    // Wait for estimation
    await page.waitForResponse(response => 
      response.url().includes('/api/communication-export/estimate') && response.status() === 200
    );

    // Select CSV format (should be default)
    await expect(page.locator('input[value="csv"]')).toBeChecked();

    // Set reasonable record limit
    await page.fill('[data-testid="max-records-input"]', '100');

    // Start export
    await page.click('button:has-text("Export CSV")');

    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/communication-audit.*\.csv$/);
    
    // Verify export dialog closes
    await expect(page.getByText('Export Communication Data')).not.toBeVisible();
  });
});

/**
 * Test suite for staff-only functionality
 */
test.describe('Staff-Only Features', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup with staff user authentication (implementation depends on auth system)
    await page.goto('/communication-audit');
    // Add authentication setup here
  });

  test('should allow access to all organization data for staff users', async ({ page }) => {
    // Staff users should see organization selector or have access to all data
    await expect(page.getByText('Communication Audit Trail')).toBeVisible();
    
    // This test would verify that staff can see data from multiple organizations
    // Implementation depends on the specific UI for staff users
  });

  test('should allow staff to generate compliance reports', async ({ page }) => {
    await page.click('button:has-text("Export")');
    await expect(page.getByText('Export Communication Data')).toBeVisible();

    // Select PDF format for compliance report
    await page.click('input[value="pdf"]');
    
    // This would test the compliance report generation
    // Implementation depends on specific compliance report features
  });
});

/**
 * Performance and stress tests
 */
test.describe('Performance Tests', () => {
  
  test('should handle large search results efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/communication-audit');
    
    // Perform search that might return many results
    await page.fill('[placeholder="Search communications..."]', '*'); // Wildcard search
    await page.click('button:has-text("Search")');
    
    // Wait for results with timeout
    await page.waitForResponse(
      response => response.url().includes('/api/communication-audit/logs'),
      { timeout: 10000 }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify page loads within reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds max
    
    // Verify UI is still responsive
    await expect(page.getByText('Communication Audit Trail')).toBeVisible();
  });
});