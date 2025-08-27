import { test, expect, type Page } from '@playwright/test';
import { createReadStream } from 'fs';
import { join } from 'path';

/**
 * E2E tests for file attachment security, upload restrictions, and download controls
 * Tests file type validation, size limits, malware protection, and access controls
 */

test.describe('File Attachment Security Tests', () => {
  let page: Page;
  const testOrderId = 'test-order-security';
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  
  const allowedFileTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  const blockedFileTypes = [
    'application/x-executable',
    'application/x-msdownload', 
    'application/octet-stream',
    'text/javascript',
    'application/javascript',
    'text/html',
    'application/x-sh',
    'application/x-python-code'
  ];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Mock basic API responses
    await page.route('**/api/orders/*/messages*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            messages: [],
            totalCount: 0,
            unreadCount: 0,
            hasNextPage: false
          }
        });
      }
    });

    await page.goto(`/orders/${testOrderId}`);
    await page.click('button:has-text("View Messages")');
  });

  test('should validate allowed file types', async () => {
    const validFiles = [
      { name: 'document.pdf', type: 'application/pdf', content: 'PDF content' },
      { name: 'image.jpg', type: 'image/jpeg', content: 'JPEG image data' },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content: 'Excel data' },
      { name: 'text.txt', type: 'text/plain', content: 'Plain text content' }
    ];

    let uploadAttempts = 0;

    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        uploadAttempts++;
        
        // Simulate successful upload for valid files
        await route.fulfill({
          json: {
            message: {
              id: `msg-${uploadAttempts}`,
              content: 'Message with valid attachment',
              attachments: [{
                id: `att-${uploadAttempts}`,
                originalFileName: validFiles[uploadAttempts - 1]?.name || 'file.pdf',
                fileSize: 1024,
                mimeType: validFiles[uploadAttempts - 1]?.type || 'application/pdf'
              }],
              attachmentCount: 1
            },
            success: true
          }
        });
      }
    });

    for (const file of validFiles) {
      // Simulate file selection
      await page.evaluate((fileData) => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File([fileData.content], fileData.name, { type: fileData.type });
        
        // Mock FileList
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true
        });
        
        // Trigger change event
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }, file);

      // Verify file is accepted (no error message)
      await expect(page.locator('.MuiAlert-root[severity="error"]')).not.toBeVisible();
      
      // Verify file appears in attachment list
      await expect(page.locator(`text=${file.name}`)).toBeVisible();

      // Send message
      await page.fill('textarea[placeholder*="Type your message"]', 'Testing valid file upload');
      await page.click('button:has-text("Send")');
      
      // Verify successful upload
      await expect(page.locator('text=Message with valid attachment')).toBeVisible();
    }
  });

  test('should reject blocked file types', async () => {
    const blockedFiles = [
      { name: 'malware.exe', type: 'application/x-executable' },
      { name: 'script.js', type: 'text/javascript' },
      { name: 'webpage.html', type: 'text/html' },
      { name: 'shell.sh', type: 'application/x-sh' }
    ];

    for (const file of blockedFiles) {
      // Simulate blocked file selection
      await page.evaluate((fileData) => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['malicious content'], fileData.name, { type: fileData.type });
        
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          configurable: true
        });
        
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }, file);

      // Verify error message appears
      await expect(page.locator('.MuiAlert-root[severity="error"]')).toBeVisible();
      await expect(page.locator(`text*="not allowed"`)).toBeVisible();
      
      // Verify file is NOT added to attachment list
      await expect(page.locator(`text=${file.name}`)).not.toBeVisible();
    }
  });

  test('should enforce file size limits', async () => {
    // Test file that exceeds size limit
    const oversizedFile = {
      name: 'large-file.pdf',
      type: 'application/pdf',
      size: maxFileSize + 1024 // 1KB over limit
    };

    await page.evaluate((fileData) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create large file buffer
      const largeContent = new Uint8Array(fileData.size);
      largeContent.fill(65); // Fill with 'A' characters
      
      const file = new File([largeContent], fileData.name, { type: fileData.type });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, oversizedFile);

    // Verify size limit error
    await expect(page.locator('.MuiAlert-root[severity="error"]')).toBeVisible();
    await expect(page.locator('text*="too large"')).toBeVisible();
    await expect(page.locator('text*="Maximum size"')).toBeVisible();

    // Test file at exact size limit (should be allowed)
    const maxSizeFile = {
      name: 'max-size.pdf',
      type: 'application/pdf',
      size: maxFileSize
    };

    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            message: {
              id: 'msg-max-size',
              content: 'Message with max size file',
              attachments: [{
                id: 'att-max-size',
                originalFileName: maxSizeFile.name,
                fileSize: maxSizeFile.size,
                mimeType: maxSizeFile.type
              }],
              attachmentCount: 1
            },
            success: true
          }
        });
      }
    });

    await page.evaluate((fileData) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const content = new Uint8Array(fileData.size);
      const file = new File([content], fileData.name, { type: fileData.type });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, maxSizeFile);

    // Verify max size file is accepted
    await expect(page.locator(`text=${maxSizeFile.name}`)).toBeVisible();
  });

  test('should prevent duplicate file attachments', async () => {
    const duplicateFile = {
      name: 'document.pdf',
      type: 'application/pdf',
      content: 'PDF content'
    };

    // Add first instance of file
    await page.evaluate((fileData) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([fileData.content], fileData.name, { type: fileData.type });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, duplicateFile);

    // Verify first file is added
    await expect(page.locator(`text=${duplicateFile.name}`).first()).toBeVisible();

    // Try to add same file again
    await page.evaluate((fileData) => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([fileData.content], fileData.name, { type: fileData.type });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, duplicateFile);

    // Verify duplicate error message
    await expect(page.locator('text*="already attached"')).toBeVisible();
    
    // Verify only one instance of the file exists
    expect(await page.locator(`text=${duplicateFile.name}`).count()).toBe(1);
  });

  test('should scan for malicious content patterns', async () => {
    const suspiciousFiles = [
      {
        name: 'innocent.pdf',
        type: 'application/pdf', 
        content: '<script>alert("xss")</script>' // XSS attempt in filename
      },
      {
        name: 'document.pdf',
        type: 'application/pdf',
        content: '../../../../etc/passwd' // Path traversal attempt
      }
    ];

    // Mock server-side virus scanning
    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        const postData = await route.request().postData();
        
        // Simulate virus scanner detecting malicious content
        if (postData?.includes('script') || postData?.includes('../')) {
          await route.fulfill({
            status: 400,
            json: {
              error: 'File rejected by security scan',
              code: 'MALICIOUS_CONTENT_DETECTED'
            }
          });
        } else {
          await route.fulfill({
            json: {
              message: { id: 'safe-msg', content: 'Safe file uploaded' },
              success: true
            }
          });
        }
      }
    });

    for (const file of suspiciousFiles) {
      await page.evaluate((fileData) => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const mockFile = new File([fileData.content], fileData.name, { type: fileData.type });
        
        Object.defineProperty(fileInput, 'files', {
          value: [mockFile],
          configurable: true
        });
        
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }, file);

      // Try to send message
      await page.fill('textarea[placeholder*="Type your message"]', 'Attempting to send suspicious file');
      await page.click('button:has-text("Send")');
      
      // Verify security rejection
      await expect(page.locator('text*="security scan"')).toBeVisible();
      await expect(page.locator('text*="rejected"')).toBeVisible();
    }
  });

  test('should enforce authenticated download access', async () => {
    const testMessage = {
      id: 'msg-with-attachment',
      content: 'Message with protected attachment',
      attachments: [{
        id: 'protected-att-1',
        originalFileName: 'sensitive-document.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf'
      }]
    };

    // Mock message with attachment
    await page.route('**/api/orders/*/messages*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            messages: [testMessage],
            totalCount: 1,
            unreadCount: 0,
            hasNextPage: false
          }
        });
      }
    });

    // Mock download endpoint with authentication check
    let downloadAttempts = 0;
    await page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
      downloadAttempts++;
      const authHeader = route.request().headers()['authorization'];
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await route.fulfill({
          status: 401,
          json: { error: 'Authentication required' }
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="sensitive-document.pdf"'
          },
          body: 'Mock PDF content'
        });
      }
    });

    // Refresh to load message with attachment
    await page.reload();
    await page.click('button:has-text("View Messages")');
    
    // Verify attachment is visible
    await expect(page.locator('text=sensitive-document.pdf')).toBeVisible();
    
    // Try to download attachment
    await page.click('button[title="Download attachment"]');
    
    // Verify download was attempted with authentication
    expect(downloadAttempts).toBe(1);
  });

  test('should validate file content type vs extension', async () => {
    const mismatchedFiles = [
      {
        name: 'document.pdf',
        type: 'application/pdf',
        realContent: '<html><script>alert("fake pdf")</script></html>' // HTML masquerading as PDF
      },
      {
        name: 'image.jpg',
        type: 'image/jpeg', 
        realContent: 'PK\x03\x04' // ZIP file header masquerading as JPEG
      }
    ];

    // Mock server-side content validation
    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        const postData = await route.request().postData();
        
        // Simulate server detecting content/extension mismatch
        if (postData?.includes('html') || postData?.includes('PK\x03\x04')) {
          await route.fulfill({
            status: 400,
            json: {
              error: 'File content does not match extension',
              code: 'CONTENT_TYPE_MISMATCH'
            }
          });
        }
      }
    });

    for (const file of mismatchedFiles) {
      await page.evaluate((fileData) => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const mockFile = new File([fileData.realContent], fileData.name, { type: fileData.type });
        
        Object.defineProperty(fileInput, 'files', {
          value: [mockFile],
          configurable: true
        });
        
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }, file);

      await page.fill('textarea[placeholder*="Type your message"]', 'Testing content validation');
      await page.click('button:has-text("Send")');
      
      // Verify content validation error
      await expect(page.locator('text*="content does not match"')).toBeVisible();
    }
  });

  test('should handle upload progress and cancellation', async () => {
    let uploadInProgress = false;
    let uploadCancelled = false;

    // Mock slow upload with cancellation support
    await page.route('**/api/orders/*/messages', async route => {
      if (route.request().method() === 'POST') {
        uploadInProgress = true;
        
        // Simulate slow upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (uploadCancelled) {
          await route.fulfill({
            status: 499,
            json: { error: 'Upload cancelled' }
          });
        } else {
          await route.fulfill({
            json: {
              message: { id: 'uploaded-msg', content: 'File uploaded successfully' },
              success: true
            }
          });
        }
        
        uploadInProgress = false;
      }
    });

    // Add large file to trigger progress indicator
    await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeContent = new Uint8Array(5 * 1024 * 1024); // 5MB
      const file = new File([largeContent], 'large-file.pdf', { type: 'application/pdf' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.fill('textarea[placeholder*="Type your message"]', 'Uploading large file');
    
    // Start upload
    await page.click('button:has-text("Send")');
    
    // Verify progress indicator appears
    await expect(page.locator('text*="Sending"')).toBeVisible();
    await expect(page.locator('.MuiCircularProgress-root')).toBeVisible();
    
    // Simulate cancellation (if cancel button exists)
    if (await page.locator('button:has-text("Cancel")').count() > 0) {
      uploadCancelled = true;
      await page.click('button:has-text("Cancel")');
      
      await expect(page.locator('text*="cancelled"')).toBeVisible();
    } else {
      // Wait for upload completion
      await expect(page.locator('text=File uploaded successfully')).toBeVisible();
    }
  });

  test('should enforce organization-based file access', async () => {
    const testAttachment = {
      id: 'org-restricted-att',
      messageId: 'msg-1',
      originalFileName: 'confidential-document.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf'
    };

    // Mock download with organization validation
    await page.route('**/api/orders/*/messages/*/attachments/*/download', async route => {
      const headers = route.request().headers();
      const userOrgId = headers['x-organization-id'];
      const expectedOrgId = 'org-123';
      
      if (userOrgId !== expectedOrgId) {
        await route.fulfill({
          status: 403,
          json: {
            error: 'Forbidden: Attachment belongs to different organization',
            code: 'ORGANIZATION_MISMATCH'
          }
        });
      } else {
        await route.fulfill({
          status: 200,
          body: 'Authorized file content'
        });
      }
    });

    // Mock message with restricted attachment
    await page.route('**/api/orders/*/messages*', async route => {
      await route.fulfill({
        json: {
          messages: [{
            id: 'msg-1',
            content: 'Message with organization-restricted file',
            attachments: [testAttachment],
            attachmentCount: 1
          }],
          totalCount: 1,
          unreadCount: 0,
          hasNextPage: false
        }
      });
    });

    // Set wrong organization context
    await page.setExtraHTTPHeaders({
      'X-Organization-Id': 'wrong-org-456'
    });

    await page.reload();
    await page.click('button:has-text("View Messages")');
    
    // Try to download attachment
    await page.click('button[title="Download attachment"]');
    
    // Should see access denied error
    await expect(page.locator('text*="Forbidden"')).toBeVisible();
    await expect(page.locator('text*="different organization"')).toBeVisible();
  });
});