import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end tests for complete communication audit trail workflows.
 * Tests the full user journey from communication sending to audit trail viewing and reporting.
 */
test.describe('Communication Audit Trail Workflows', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication
    await page.route('/api/auth/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'test-token',
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              name: 'Test User',
              role: 'client',
              organizationId: 'test-org-id'
            }
          })
        });
      }
    });

    // Mock communication audit API endpoints
    await page.route('/api/communication-reports/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/search') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            logs: [
              {
                id: 'comm-1',
                orderId: 'order-123',
                communicationType: 'Email',
                senderId: 'sender-1',
                recipientEmail: 'customer@example.com',
                subject: 'Order Update Notification',
                content: 'Your order has been updated.',
                deliveryStatus: 'Delivered',
                sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                deliveredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
              },
              {
                id: 'comm-2',
                orderId: 'order-123',
                communicationType: 'SMS',
                senderId: 'sender-1',
                recipientPhone: '+1234567890',
                content: 'SMS notification sent',
                deliveryStatus: 'Failed',
                sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                failureReason: 'Invalid phone number',
                createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
              }
            ],
            totalCount: 2,
            page: 1,
            pageSize: 25,
            hasNextPage: false,
            statusSummary: {
              'Delivered': 1,
              'Failed': 1
            }
          })
        });
      }

      if (url.includes('/summary') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organizationId: 'test-org-id',
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            totalCommunications: 150,
            statusCounts: {
              'Delivered': 120,
              'Failed': 20,
              'Sent': 10
            },
            typeCounts: {
              'Email': 100,
              'SMS': 50
            }
          })
        });
      }

      if (url.includes('/export/csv') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'Communication ID,Order ID,Type,Status\ncomm-1,order-123,Email,Delivered\ncomm-2,order-123,SMS,Failed',
          headers: {
            'Content-Disposition': 'attachment; filename="communication-audit.csv"'
          }
        });
      }

      if (url.includes('/reports/compliance-pdf') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
          headers: {
            'Content-Disposition': 'attachment; filename="compliance-report.pdf"'
          }
        });
      }
    });

    // Navigate to login and authenticate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should display communication audit trail with search and filtering', async () => {
    // Navigate to communication audit page
    await page.goto('/communication-audit');

    // Verify page loaded correctly
    await expect(page.locator('h1, h4')).toContainText('Communication Audit Trail');

    // Verify audit log tab is active by default
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Audit Log');

    // Verify communications are displayed
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(2);

    // Verify communication details
    await expect(page.locator('tbody tr').first()).toContainText('Email');
    await expect(page.locator('tbody tr').first()).toContainText('customer@example.com');
    await expect(page.locator('tbody tr').first()).toContainText('Delivered');

    await expect(page.locator('tbody tr').last()).toContainText('SMS');
    await expect(page.locator('tbody tr').last()).toContainText('+1234567890');
    await expect(page.locator('tbody tr').last()).toContainText('Failed');
  });

  test('should expand communication row to show detailed information', async () => {
    await page.goto('/communication-audit');

    // Click expand button on first row
    await page.click('tbody tr:first-child button[aria-label*="expand"], tbody tr:first-child [data-testid="ExpandMoreIcon"], tbody tr:first-child button:has([data-testid="ExpandMoreIcon"])');

    // Wait for expansion content to appear
    await expect(page.locator('tbody tr + tr')).toContainText('Message Details');
    await expect(page.locator('tbody tr + tr')).toContainText('Your order has been updated.');
  });

  test('should filter communications by type and status', async () => {
    await page.goto('/communication-audit');

    // Open advanced filters
    await page.click('button:has-text("Filters")');

    // Select Email communication type
    await page.click('div[role="button"]:has-text("Communication Types")');
    await page.click('li:has-text("Email")');
    await page.press('body', 'Escape'); // Close dropdown

    // Select Delivered status
    await page.click('div[role="button"]:has-text("Delivery Status")');
    await page.click('li:has-text("Delivered")');
    await page.press('body', 'Escape'); // Close dropdown

    // Verify active filters are shown
    await expect(page.locator('.MuiChip-root')).toContainText('Type: Email');
    await expect(page.locator('.MuiChip-root')).toContainText('Status: Delivered');

    // Verify only matching communications are displayed
    // (Note: In real test, this would trigger new API call with filters)
    await expect(page.locator('tbody tr')).toHaveCount(2); // Mock still returns 2
  });

  test('should perform text search in communications', async () => {
    await page.goto('/communication-audit');

    // Enter search term
    await page.fill('input[placeholder*="Search"]', 'Order Update');

    // Verify search term is applied
    await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('Order Update');

    // In real scenario, this would filter results
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });

  test('should navigate to dashboard tab and display charts', async () => {
    await page.goto('/communication-audit');

    // Click dashboard tab
    await page.click('[role="tab"]:has-text("Dashboard")');

    // Verify dashboard content is displayed
    await expect(page.locator('h4, h6')).toContainText(/Total Communications|Success Rate|Email Communications/);

    // Verify metric cards are present
    await expect(page.locator('[data-testid="metric-card"], .MuiCard-root')).toHaveCount.toBeGreaterThan(0);

    // Verify charts are displayed
    await expect(page.locator('canvas, [data-testid="chart"]')).toHaveCount.toBeGreaterThan(0);
  });

  test('should export data in CSV format', async () => {
    await page.goto('/communication-audit');

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('button:has-text("Export Data")');

    // Select CSV format (should be default)
    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator('div[role="button"]:has-text("CSV")').first()).toBeVisible();

    // Click export button in dialog
    await page.click('dialog button:has-text("Export CSV")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should generate compliance PDF report', async () => {
    await page.goto('/communication-audit');

    // Navigate to dashboard tab
    await page.click('[role="tab"]:has-text("Dashboard")');

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Click generate report button
    await page.click('button:has-text("Generate Report")');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should export data with advanced options', async () => {
    await page.goto('/communication-audit');

    // Open export dialog
    await page.click('button:has-text("Export Data")');
    await expect(page.locator('dialog')).toBeVisible();

    // Select Excel format
    await page.click('div[role="button"] .MuiSelect-select');
    await page.click('li:has-text("Excel")');

    // Enable content inclusion
    await page.check('input[type="checkbox"] + span:has-text("Include Message Content")');
    await page.check('input[type="checkbox"] + span:has-text("Include Metadata")');

    // Set maximum records
    await page.fill('input[label*="Maximum Records"]', '5000');

    // Set up download handler
    const downloadPromise = page.waitForEvent('download');

    // Export
    await page.click('dialog button:has-text("Export Excel")');

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('should handle export job status for large datasets', async () => {
    // Mock large dataset response
    await page.route('/api/communication-reports/export/csv', async (route) => {
      await route.fulfill({
        status: 202, // Accepted - async job
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: 'job-12345',
          status: 'Processing',
          recordCount: 50000,
          estimatedSize: 5000000
        })
      });
    });

    // Mock job status endpoint
    await page.route('/api/communication-reports/export/status/job-12345', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: 'job-12345',
          status: 'Completed',
          recordCount: 50000,
          estimatedSize: 5000000,
          downloadUrl: '/api/communication-reports/export/download/job-12345'
        })
      });
    });

    await page.goto('/communication-audit');

    // Open export dialog
    await page.click('button:has-text("Export Data")');

    // Set large record count to trigger async processing
    await page.fill('input[label*="Maximum Records"]', '50000');

    // Start export
    await page.click('dialog button:has-text("Export CSV")');

    // Verify job is shown in active exports
    await expect(page.locator('dialog')).toContainText('Export Job #job-12345');
    await expect(page.locator('dialog')).toContainText('Processing');

    // Simulate status update (in real test, this would happen automatically)
    await page.reload();
    await page.click('button:has-text("Export Data")');

    // Verify completed status
    await expect(page.locator('dialog')).toContainText('Completed');
    await expect(page.locator('button:has-text("Download"), [aria-label*="Download"]')).toBeVisible();
  });

  test('should display error states gracefully', async () => {
    // Mock API error
    await page.route('/api/communication-reports/search', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/communication-audit');

    // Verify error message is displayed
    await expect(page.locator('.MuiAlert-root, [role="alert"]')).toContainText(/Failed to load|Error/);
  });

  test('should handle pagination correctly', async () => {
    // Mock paginated response
    await page.route('/api/communication-reports/search', async (route) => {
      const requestBody = await route.request().postData();
      const request = JSON.parse(requestBody || '{}');
      const page = request.page || 1;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            {
              id: `comm-${page}-1`,
              orderId: 'order-123',
              communicationType: 'Email',
              senderId: 'sender-1',
              recipientEmail: 'test@example.com',
              content: `Page ${page} content`,
              deliveryStatus: 'Delivered',
              sentAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
          ],
          totalCount: 100,
          page: page,
          pageSize: 25,
          hasNextPage: page < 4,
          statusSummary: { 'Delivered': 1 }
        })
      });
    });

    await page.goto('/communication-audit');

    // Verify pagination controls
    await expect(page.locator('.MuiTablePagination-root')).toBeVisible();
    await expect(page.locator('p:has-text("1–25 of 100")')).toBeVisible();

    // Navigate to next page
    await page.click('[aria-label="Go to next page"], button:has([data-testid="KeyboardArrowRightIcon"])');

    // Verify page change
    await expect(page.locator('p:has-text("26–50 of 100")')).toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });
});