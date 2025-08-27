import { test, expect, type Page } from '@playwright/test';

/**
 * Performance and load tests for messaging functionality
 * Tests high-volume message handling, search performance, and resource usage
 */

test.describe('Messaging Performance and Load Tests', () => {
  let page: Page;

  // Generate large dataset for performance testing
  const generateMessages = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `perf-msg-${i}`,
      content: `Performance test message ${i} with searchable content and various keywords like urgent, budget, design, costumes, measurements, and production schedules.`,
      senderId: `user-${i % 10}`, // 10 different users
      senderName: `Test User ${i % 10}`,
      senderRole: ['Director', 'Finance', 'ColorGarbStaff'][i % 3],
      messageType: ['General', 'Question', 'Update', 'Urgent'][i % 4],
      recipientRole: 'All',
      isRead: Math.random() > 0.3, // 70% read, 30% unread
      readAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null,
      createdAt: new Date(Date.now() - i * 60000).toISOString(), // 1 minute intervals
      updatedAt: new Date(Date.now() - i * 60000).toISOString(),
      attachments: i % 5 === 0 ? [{ // Every 5th message has attachment
        id: `att-${i}`,
        originalFileName: `document_${i}.pdf`,
        fileSize: Math.floor(Math.random() * 5000000),
        mimeType: 'application/pdf'
      }] : [],
      attachmentCount: i % 5 === 0 ? 1 : 0,
      replyToMessageId: i > 10 && Math.random() > 0.8 ? `perf-msg-${i - Math.floor(Math.random() * 10)}` : null
    }));
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/orders/perf-test-order');
  });

  test('should handle large message lists efficiently', async () => {
    const largeMessageSet = generateMessages(1000);
    
    let requestStartTime: number;
    let requestEndTime: number;
    
    await page.route('**/api/orders/*/messages*', async route => {
      requestStartTime = Date.now();
      
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const pageNum = parseInt(urlParams.get('page') || '1');
      const pageSize = parseInt(urlParams.get('pageSize') || '50');
      
      // Simulate pagination
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageMessages = largeMessageSet.slice(startIndex, endIndex);
      
      // Simulate realistic server response time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await route.fulfill({
        json: {
          messages: pageMessages,
          totalCount: largeMessageSet.length,
          unreadCount: largeMessageSet.filter(m => !m.isRead).length,
          hasNextPage: endIndex < largeMessageSet.length
        }
      });
      
      requestEndTime = Date.now();
    });

    const startTime = Date.now();
    
    // Open message center
    await page.click('button:has-text("View Messages")');
    
    // Wait for initial messages to load
    await expect(page.locator('text=Performance test message 0')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (< 2 seconds)
    expect(loadTime).toBeLessThan(2000);
    
    // API response should be fast (< 200ms)
    expect(requestEndTime - requestStartTime).toBeLessThan(200);
    
    // Should show correct total count
    await expect(page.locator('text=1000 messages')).toBeVisible();
    
    // Test scrolling performance with large dataset
    const scrollStartTime = Date.now();
    
    // Simulate scrolling to load more messages
    const messageList = page.locator('[data-testid="message-list"]');
    await messageList.scrollIntoViewIfNeeded();
    
    // Scroll down multiple times to test virtualization
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    
    const scrollTime = Date.now() - scrollStartTime;
    
    // Scrolling should be smooth (< 1 second for 10 scroll actions)
    expect(scrollTime).toBeLessThan(1000);
    
    // Should have loaded more messages
    if (await page.locator('button:has-text("Load More")').count() > 0) {
      await page.click('button:has-text("Load More")');
      await expect(page.locator('text=Performance test message 50')).toBeVisible();
    }
  });

  test('should search through large datasets efficiently', async () => {
    const largeMessageSet = generateMessages(5000);
    let searchExecutionTime: number;
    
    await page.route('**/api/orders/*/messages*', async route => {
      const searchStartTime = Date.now();
      
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const searchTerm = urlParams.get('searchTerm');
      
      let results = largeMessageSet;
      
      // Simulate server-side search
      if (searchTerm) {
        results = largeMessageSet.filter(msg =>
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Simulate realistic search time for large dataset
      await new Promise(resolve => setTimeout(resolve, Math.min(100 + results.length / 100, 500)));
      
      searchExecutionTime = Date.now() - searchStartTime;
      
      await route.fulfill({
        json: {
          messages: results.slice(0, 50), // First page
          totalCount: results.length,
          unreadCount: results.filter(m => !m.isRead).length,
          hasNextPage: results.length > 50
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    await page.click('button[title="Search messages"]');
    
    const uiSearchStartTime = Date.now();
    
    // Perform search
    await page.fill('input[placeholder*="Search messages"]', 'urgent');
    await page.click('button:has-text("Search")');
    
    // Wait for search results
    await expect(page.locator('text*="messages"')).toBeVisible();
    
    const totalSearchTime = Date.now() - uiSearchStartTime;
    
    // Search should complete quickly (< 1 second total UI time)
    expect(totalSearchTime).toBeLessThan(1000);
    
    // Server search execution should be reasonable (< 600ms)
    expect(searchExecutionTime).toBeLessThan(600);
    
    // Search should return relevant results
    const resultCount = await page.locator('text*="message"').first().textContent();
    expect(resultCount).toMatch(/\d+\s+messages?/);
  });

  test('should handle rapid consecutive searches without performance degradation', async () => {
    const messageSet = generateMessages(1000);
    const searchTimes: number[] = [];
    let searchCount = 0;
    
    await page.route('**/api/orders/*/messages*', async route => {
      const searchStart = Date.now();
      searchCount++;
      
      // Simulate search processing
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
      
      await route.fulfill({
        json: {
          messages: messageSet.slice(0, 20),
          totalCount: 20,
          unreadCount: 10,
          hasNextPage: false
        }
      });
      
      searchTimes.push(Date.now() - searchStart);
    });

    await page.click('button:has-text("View Messages")');
    await page.click('button[title="Search messages"]');
    
    const searchTerms = ['urgent', 'budget', 'design', 'costume', 'measure'];
    
    // Perform rapid consecutive searches
    for (const term of searchTerms) {
      await page.fill('input[placeholder*="Search messages"]', term);
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(100); // Small delay between searches
    }
    
    // Wait for all searches to complete
    await page.waitForTimeout(500);
    
    // Should handle all searches
    expect(searchCount).toBeGreaterThanOrEqual(searchTerms.length);
    
    // Search times should be consistent (no significant degradation)
    if (searchTimes.length >= 2) {
      const firstSearchTime = searchTimes[0];
      const lastSearchTime = searchTimes[searchTimes.length - 1];
      const timeDifference = Math.abs(lastSearchTime - firstSearchTime);
      
      // Time difference should be minimal (< 200ms degradation)
      expect(timeDifference).toBeLessThan(200);
    }
  });

  test('should maintain responsive UI during heavy operations', async () => {
    const largeMessageSet = generateMessages(2000);
    
    await page.route('**/api/orders/*/messages*', async route => {
      // Simulate slow server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await route.fulfill({
        json: {
          messages: largeMessageSet.slice(0, 50),
          totalCount: largeMessageSet.length,
          unreadCount: 600,
          hasNextPage: true
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // UI should show loading state immediately
    await expect(page.locator('.MuiSkeleton-root, .MuiCircularProgress-root, text*="Loading"')).toBeVisible();
    
    // UI should remain responsive during loading
    const responsiveStartTime = Date.now();
    
    // Try to interact with UI elements
    const closeButton = page.locator('button[title="Close messages"]');
    await expect(closeButton).toBeVisible();
    
    // Button should respond to hover
    await closeButton.hover();
    
    const hoverResponseTime = Date.now() - responsiveStartTime;
    
    // UI interaction should be immediate (< 100ms)
    expect(hoverResponseTime).toBeLessThan(100);
    
    // Wait for loading to complete
    await expect(page.locator('text=Performance test message 0')).toBeVisible();
    
    // UI should be fully interactive after loading
    await expect(page.locator('text=2000 messages')).toBeVisible();
  });

  test('should handle memory usage efficiently with large message lists', async () => {
    const veryLargeMessageSet = generateMessages(10000);
    
    await page.route('**/api/orders/*/messages*', async route => {
      const url = route.request().url();
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const pageNum = parseInt(urlParams.get('page') || '1');
      const pageSize = parseInt(urlParams.get('pageSize') || '50');
      
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageMessages = veryLargeMessageSet.slice(startIndex, endIndex);
      
      await route.fulfill({
        json: {
          messages: pageMessages,
          totalCount: veryLargeMessageSet.length,
          unreadCount: 3000,
          hasNextPage: endIndex < veryLargeMessageSet.length
        }
      });
    });

    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        domNodes: document.querySelectorAll('*').length
      };
    });

    await page.click('button:has-text("View Messages")');
    
    // Load several pages of messages
    for (let i = 0; i < 5; i++) {
      if (await page.locator('button:has-text("Load More")').count() > 0) {
        await page.click('button:has-text("Load More")');
        await page.waitForTimeout(200);
      }
    }
    
    // Get final memory usage
    const finalMetrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        domNodes: document.querySelectorAll('*').length
      };
    });

    // Memory usage should be reasonable
    if (initialMetrics.usedJSHeapSize > 0 && finalMetrics.usedJSHeapSize > 0) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;
      
      // Memory increase should be reasonable (< 200% increase)
      expect(memoryIncreasePercent).toBeLessThan(200);
    }

    // DOM node count should be managed (virtualization should prevent excessive nodes)
    const domNodeIncrease = finalMetrics.domNodes - initialMetrics.domNodes;
    
    // DOM node increase should be controlled (< 1000 new nodes for 250 messages)
    expect(domNodeIncrease).toBeLessThan(1000);
  });

  test('should handle attachment downloads under load', async () => {
    const messagesWithAttachments = generateMessages(100).map(msg => ({
      ...msg,
      attachments: [{
        id: `att-${msg.id}`,
        originalFileName: `document_${msg.id}.pdf`,
        fileSize: 1024000,
        mimeType: 'application/pdf'
      }],
      attachmentCount: 1
    }));

    let downloadRequests = 0;
    const downloadTimes: number[] = [];
    
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages: messagesWithAttachments.slice(0, 10),
          totalCount: messagesWithAttachments.length,
          unreadCount: 50,
          hasNextPage: true
        }
      });
    });

    await page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
      const downloadStart = Date.now();
      downloadRequests++;
      
      // Simulate download processing time
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="document.pdf"'
        },
        body: 'Mock PDF content'
      });
      
      downloadTimes.push(Date.now() - downloadStart);
    });

    await page.click('button:has-text("View Messages")');
    
    // Wait for messages with attachments to load
    await expect(page.locator('text=document_perf-msg-0.pdf')).toBeVisible();
    
    // Test multiple concurrent downloads
    const downloadButtons = page.locator('button[title="Download attachment"]');
    const downloadCount = Math.min(await downloadButtons.count(), 5);
    
    const concurrentDownloadStart = Date.now();
    
    // Trigger multiple downloads rapidly
    for (let i = 0; i < downloadCount; i++) {
      await downloadButtons.nth(i).click();
    }
    
    // Wait for downloads to process
    await page.waitForTimeout(1000);
    
    const totalDownloadTime = Date.now() - concurrentDownloadStart;
    
    // Should handle concurrent downloads efficiently
    expect(downloadRequests).toBe(downloadCount);
    expect(totalDownloadTime).toBeLessThan(2000);
    
    // Individual download times should be reasonable
    if (downloadTimes.length > 0) {
      const averageDownloadTime = downloadTimes.reduce((a, b) => a + b, 0) / downloadTimes.length;
      expect(averageDownloadTime).toBeLessThan(300);
    }
  });

  test('should maintain performance during real-time updates', async () => {
    let messageSet = generateMessages(500);
    let updateCount = 0;
    
    await page.route('**/api/orders/*/messages*', async route => {
      // Add new messages periodically to simulate real-time updates
      if (updateCount % 3 === 0 && updateCount > 0) {
        const newMessage = {
          id: `realtime-${updateCount}`,
          content: `Real-time message ${updateCount}`,
          senderId: 'realtime-user',
          senderName: 'Real-time User',
          senderRole: 'ColorGarbStaff',
          messageType: 'General',
          recipientRole: 'All',
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
          attachmentCount: 0,
          replyToMessageId: null
        };
        messageSet.unshift(newMessage);
      }
      
      updateCount++;
      
      await route.fulfill({
        json: {
          messages: messageSet.slice(0, 50),
          totalCount: messageSet.length,
          unreadCount: messageSet.filter(m => !m.isRead).length,
          hasNextPage: messageSet.length > 50
        }
      });
    });

    await page.click('button:has-text("View Messages")');
    
    // Initial load
    await expect(page.locator('text=Performance test message 0')).toBeVisible();
    
    const performanceStart = Date.now();
    
    // Simulate periodic real-time updates (like auto-refresh)
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(300);
      await page.click('button[title="Refresh messages"]');
    }
    
    const totalUpdateTime = Date.now() - performanceStart;
    
    // Should handle multiple updates efficiently (< 5 seconds for 10 updates)
    expect(totalUpdateTime).toBeLessThan(5000);
    
    // Should show real-time messages
    await expect(page.locator('text*="Real-time message"')).toBeVisible();
    
    // Message count should have increased
    const finalCountText = await page.locator('text*="message"').first().textContent();
    const messageCount = parseInt(finalCountText?.match(/(\d+)/)?.[1] || '0');
    expect(messageCount).toBeGreaterThan(500);
  });

  test('should handle network latency gracefully', async () => {
    const messageSet = generateMessages(100);
    const networkDelays = [100, 500, 1000, 2000]; // Simulate various network conditions
    
    for (const delay of networkDelays) {
      await page.route('**/api/orders/*/messages*', async route => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          json: {
            messages: messageSet.slice(0, 20),
            totalCount: messageSet.length,
            unreadCount: 30,
            hasNextPage: true
          }
        });
      });

      const loadStart = Date.now();
      
      // For each test, reload the messages
      if (delay > networkDelays[0]) {
        await page.click('button[title="Refresh messages"]');
      } else {
        await page.click('button:has-text("View Messages")');
      }
      
      // UI should show loading state immediately regardless of network speed
      if (delay > 200) {
        await expect(page.locator('.MuiSkeleton-root, .MuiCircularProgress-root')).toBeVisible();
      }
      
      // Wait for content to load
      await expect(page.locator('text=Performance test message 0')).toBeVisible();
      
      const loadTime = Date.now() - loadStart;
      
      // Total load time should not exceed network delay + reasonable processing time
      expect(loadTime).toBeLessThan(delay + 500);
      
      // UI should remain responsive throughout
      const closeButton = page.locator('button[title="Close messages"]');
      await expect(closeButton).toBeVisible();
      
      await page.waitForTimeout(100); // Brief pause between network condition tests
    }
  });
});