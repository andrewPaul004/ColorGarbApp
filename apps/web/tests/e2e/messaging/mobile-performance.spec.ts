import { test, expect, type Page, devices } from '@playwright/test';

/**
 * E2E tests for mobile performance and responsive design across devices
 * Tests performance metrics, touch interactions, and device-specific optimizations
 */

const mobileDevices = [
  { name: 'iPhone 13', device: devices['iPhone 13'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

test.describe('Mobile Performance and Responsive Design', () => {
  const testOrderId = 'mobile-perf-order';
  
  const generateMobileMessages = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `mobile-msg-${i}`,
      content: `Mobile test message ${i} with content that should wrap properly on small screens and display correctly across different viewport sizes.`,
      senderId: `user-${i % 5}`,
      senderName: `Mobile User ${i % 5}`,
      senderRole: ['Director', 'Finance', 'ColorGarbStaff'][i % 3],
      messageType: ['General', 'Question', 'Update', 'Urgent'][i % 4],
      recipientRole: 'All',
      isRead: Math.random() > 0.5,
      readAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
      updatedAt: new Date(Date.now() - i * 60000).toISOString(),
      attachments: i % 3 === 0 ? [{
        id: `att-${i}`,
        originalFileName: `mobile_document_${i}.pdf`,
        fileSize: Math.floor(Math.random() * 2000000),
        mimeType: 'application/pdf'
      }] : [],
      attachmentCount: i % 3 === 0 ? 1 : 0,
      replyToMessageId: null
    }));
  };

  // Test each mobile device configuration
  mobileDevices.forEach(({ name, device }) => {
    test.describe(`${name} Performance`, () => {
      test.use(device);

      test(`should load message center efficiently on ${name}`, async ({ page }) => {
        const messages = generateMobileMessages(100);
        
        // Track performance metrics
        let renderStartTime: number;
        let renderEndTime: number;
        
        await page.route('**/api/orders/*/messages*', async route => {
          // Simulate realistic mobile network latency
          const networkDelay = device.userAgent.includes('Mobile') ? 200 : 100;
          await new Promise(resolve => setTimeout(resolve, networkDelay));
          
          await route.fulfill({
            json: {
              messages: messages.slice(0, 20),
              totalCount: messages.length,
              unreadCount: messages.filter(m => !m.isRead).length,
              hasNextPage: true
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        
        // Measure message center load time
        renderStartTime = Date.now();
        await page.tap('button:has-text("View Messages")');
        
        // Wait for content to be visible
        await expect(page.locator('text=Mobile test message 0')).toBeVisible();
        renderEndTime = Date.now();
        
        const loadTime = renderEndTime - renderStartTime;
        
        // Mobile load time should be reasonable (< 3 seconds including network)
        expect(loadTime).toBeLessThan(3000);
        
        // Check viewport adaptation
        const messageCenter = page.locator('[data-testid="message-center"]');
        const viewport = page.viewportSize();
        
        if (viewport) {
          const centerBox = await messageCenter.boundingBox();
          
          // Should use full width on mobile
          expect(centerBox?.width).toBeGreaterThan(viewport.width * 0.9);
          
          // Should fit within viewport height
          expect(centerBox?.height).toBeLessThanOrEqual(viewport.height);
        }
      });

      test(`should handle touch interactions smoothly on ${name}`, async ({ page }) => {
        const messages = generateMobileMessages(50);
        
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: messages.slice(0, 10),
              totalCount: messages.length,
              unreadCount: 25,
              hasNextPage: true
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        // Test touch targets meet minimum size requirements (44x44px)
        const touchButtons = [
          'button[title="Close messages"]',
          'button[title="Search messages"]',
          'button[title="Refresh messages"]'
        ];
        
        for (const selector of touchButtons) {
          const button = page.locator(selector);
          const box = await button.boundingBox();
          
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
        
        // Test swipe gesture performance
        const messageItem = page.locator('text=Mobile test message 0').locator('..');
        const messageBox = await messageItem.boundingBox();
        
        if (messageBox) {
          const swipeStartTime = Date.now();
          
          // Perform swipe gesture
          await page.touchscreen.swipe(
            messageBox.x + messageBox.width - 20,
            messageBox.y + messageBox.height / 2,
            messageBox.x + 20,
            messageBox.y + messageBox.height / 2,
            { steps: 10 }
          );
          
          const swipeTime = Date.now() - swipeStartTime;
          
          // Swipe should be responsive (< 500ms)
          expect(swipeTime).toBeLessThan(500);
          
          // Should reveal action button
          await expect(page.locator('button[aria-label*="reply" i]')).toBeVisible();
        }
      });

      test(`should optimize text rendering for ${name}`, async ({ page }) => {
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: [{
                id: 'text-test',
                content: 'This is a long message that should wrap properly on mobile devices and maintain good readability with appropriate line spacing and font sizing for optimal user experience.',
                senderName: 'Test User',
                senderRole: 'Director',
                messageType: 'General',
                isRead: false,
                createdAt: new Date().toISOString(),
                attachments: [],
                attachmentCount: 0
              }],
              totalCount: 1,
              unreadCount: 1,
              hasNextPage: false
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        // Check text input font size (should be 16px to prevent zoom on iOS)
        const messageInput = page.locator('textarea[placeholder*="Type your message"]');
        await expect(messageInput).toHaveCSS('font-size', '16px');
        
        // Check message text readability
        const messageText = page.locator('text=This is a long message');
        const textStyles = await messageText.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
            wordBreak: styles.wordBreak
          };
        });
        
        // Font size should be readable on mobile (at least 14px)
        const fontSize = parseFloat(textStyles.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(14);
        
        // Should have appropriate word breaking
        expect(textStyles.wordBreak).toMatch(/break-word|break-all/);
      });

      test(`should handle keyboard interactions on ${name}`, async ({ page }) => {
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: [],
              totalCount: 0,
              unreadCount: 0,
              hasNextPage: false
            }
          });
        });

        await page.route('**/api/orders/*/messages', async route => {
          if (route.request().method() === 'POST') {
            await route.fulfill({
              json: {
                message: {
                  id: 'mobile-sent',
                  content: 'Test mobile message',
                  senderName: 'Mobile User',
                  senderRole: 'Director'
                },
                success: true
              }
            });
          }
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        const messageInput = page.locator('textarea[placeholder*="Type your message"]');
        
        // Test mobile keyboard attributes
        await expect(messageInput).toHaveAttribute('autocapitalize', 'sentences');
        await expect(messageInput).toHaveAttribute('autocorrect', 'on');
        await expect(messageInput).toHaveAttribute('inputmode', 'text');
        
        // Test Enter key behavior on mobile
        await messageInput.fill('Mobile keyboard test');
        
        // On mobile, Enter should send the message
        await messageInput.press('Enter');
        
        // Message should be sent and input cleared
        await expect(messageInput).toHaveValue('');
      });

      test(`should adapt layout for different orientations on ${name}`, async ({ page }) => {
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: generateMobileMessages(5),
              totalCount: 5,
              unreadCount: 3,
              hasNextPage: false
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        // Test portrait orientation
        let viewport = page.viewportSize();
        let messageCenter = page.locator('[data-testid="message-center"]');
        let portraitBox = await messageCenter.boundingBox();
        
        // Switch to landscape orientation
        if (device.name.includes('iPhone') || device.name.includes('Pixel')) {
          await page.setViewportSize({ 
            width: viewport!.height, 
            height: viewport!.width 
          });
          
          // Wait for layout to adapt
          await page.waitForTimeout(300);
          
          let landscapeBox = await messageCenter.boundingBox();
          
          // Layout should adapt to landscape
          expect(landscapeBox?.width).toBeGreaterThan(portraitBox?.width!);
          
          // Header elements should still be accessible
          await expect(page.locator('button[title="Close messages"]')).toBeVisible();
        }
      });

      test(`should optimize scroll performance on ${name}`, async ({ page }) => {
        const largeMessageSet = generateMobileMessages(200);
        
        await page.route('**/api/orders/*/messages*', async route => {
          const url = route.request().url();
          const urlParams = new URLSearchParams(url.split('?')[1] || '');
          const pageNum = parseInt(urlParams.get('page') || '1');
          const pageSize = 20; // Smaller page size for mobile
          
          const startIndex = (pageNum - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const pageMessages = largeMessageSet.slice(startIndex, endIndex);
          
          await route.fulfill({
            json: {
              messages: pageMessages,
              totalCount: largeMessageSet.length,
              unreadCount: 100,
              hasNextPage: endIndex < largeMessageSet.length
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        // Wait for initial load
        await expect(page.locator('text=Mobile test message 0')).toBeVisible();
        
        // Test scroll performance
        const scrollStartTime = Date.now();
        
        // Perform multiple scroll gestures
        for (let i = 0; i < 5; i++) {
          await page.touchscreen.swipe(200, 600, 200, 200, { steps: 5 });
          await page.waitForTimeout(50);
        }
        
        const scrollTime = Date.now() - scrollStartTime;
        
        // Scrolling should be smooth (< 1 second for 5 scrolls)
        expect(scrollTime).toBeLessThan(1000);
        
        // Should have loaded more content
        await expect(page.locator('text=Mobile test message 10')).toBeVisible();
      });

      test(`should handle image and file attachments efficiently on ${name}`, async ({ page }) => {
        const messagesWithAttachments = generateMobileMessages(10).map(msg => ({
          ...msg,
          attachments: [{
            id: `att-${msg.id}`,
            originalFileName: `mobile_image_${msg.id}.jpg`,
            fileSize: 2048000,
            mimeType: 'image/jpeg'
          }],
          attachmentCount: 1
        }));
        
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: messagesWithAttachments,
              totalCount: messagesWithAttachments.length,
              unreadCount: 5,
              hasNextPage: false
            }
          });
        });

        await page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
          // Simulate mobile download
          await new Promise(resolve => setTimeout(resolve, 200));
          
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'image/jpeg',
              'Content-Disposition': 'attachment; filename="mobile_image.jpg"'
            },
            body: 'Mock image content'
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        await page.tap('button:has-text("View Messages")');
        
        // Wait for attachments to render
        await expect(page.locator('text=mobile_image_mobile-msg-0.jpg')).toBeVisible();
        
        // Test attachment download on mobile
        const downloadStartTime = Date.now();
        await page.tap('button[title="Download attachment"]');
        
        const downloadTime = Date.now() - downloadStartTime;
        
        // Download should initiate quickly (< 1 second)
        expect(downloadTime).toBeLessThan(1000);
        
        // Attachment UI should be touch-friendly
        const downloadButton = page.locator('button[title="Download attachment"]').first();
        const buttonBox = await downloadButton.boundingBox();
        
        if (buttonBox) {
          expect(buttonBox.width).toBeGreaterThanOrEqual(44);
          expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        }
      });

      test(`should maintain performance under memory constraints on ${name}`, async ({ page }) => {
        // Simulate memory-constrained environment
        await page.addInitScript(() => {
          // Mock limited memory scenario
          (performance as any).memory = {
            usedJSHeapSize: 50 * 1024 * 1024, // 50MB
            totalJSHeapSize: 100 * 1024 * 1024, // 100MB limit
            jsHeapSizeLimit: 100 * 1024 * 1024
          };
        });

        const messages = generateMobileMessages(100);
        
        await page.route('**/api/orders/*/messages*', async route => {
          await route.fulfill({
            json: {
              messages: messages.slice(0, 15), // Smaller batches for memory efficiency
              totalCount: messages.length,
              unreadCount: 50,
              hasNextPage: true
            }
          });
        });

        await page.goto(`/orders/${testOrderId}`);
        
        // Get initial memory usage
        const initialMemory = await page.evaluate(() => 
          (performance as any).memory?.usedJSHeapSize || 0
        );

        await page.tap('button:has-text("View Messages")');
        await expect(page.locator('text=Mobile test message 0')).toBeVisible();
        
        // Load several pages
        for (let i = 0; i < 3; i++) {
          if (await page.locator('button:has-text("Load More")').count() > 0) {
            await page.tap('button:has-text("Load More")');
            await page.waitForTimeout(200);
          }
        }
        
        // Check memory usage after operations
        const finalMemory = await page.evaluate(() => 
          (performance as any).memory?.usedJSHeapSize || 0
        );

        if (initialMemory > 0 && finalMemory > 0) {
          const memoryIncrease = finalMemory - initialMemory;
          const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
          
          // Memory increase should be controlled (< 150% on mobile)
          expect(memoryIncreasePercent).toBeLessThan(150);
        }
        
        // App should remain responsive
        await expect(page.locator('button[title="Close messages"]')).toBeVisible();
      });
    });
  });

  test('should handle network connectivity changes', async ({ page }) => {
    test.use(devices['iPhone 13']);
    
    const messages = generateMobileMessages(20);
    let networkOnline = true;
    
    await page.route('**/api/orders/*/messages*', async route => {
      if (!networkOnline) {
        await route.abort();
        return;
      }
      
      await route.fulfill({
        json: {
          messages,
          totalCount: messages.length,
          unreadCount: 10,
          hasNextPage: false
        }
      });
    });

    await page.goto(`/orders/${testOrderId}`);
    await page.tap('button:has-text("View Messages")');
    
    // Initial load should work
    await expect(page.locator('text=Mobile test message 0')).toBeVisible();
    
    // Simulate network offline
    networkOnline = false;
    
    // Try to refresh
    await page.tap('button[title="Refresh messages"]');
    
    // Should show appropriate offline message
    await expect(page.locator('text*="network" i, text*="offline" i, text*="connection" i')).toBeVisible();
    
    // Simulate network back online
    networkOnline = true;
    
    // Retry should work
    if (await page.locator('button:has-text("Retry")').count() > 0) {
      await page.tap('button:has-text("Retry")');
      await expect(page.locator('text=Mobile test message 0')).toBeVisible();
    }
  });
});