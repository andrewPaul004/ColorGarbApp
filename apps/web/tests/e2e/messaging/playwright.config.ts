import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for messaging E2E tests
 * Optimized for testing both desktop and mobile messaging workflows
 */

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Global test configuration
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Test timeout configuration
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // Project configurations for different devices/browsers
  projects: [
    {
      name: 'desktop-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/message-search.spec.ts'],
    },
    
    {
      name: 'desktop-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/message-search.spec.ts'],
    },

    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        permissions: ['camera', 'microphone'],
      },
      testMatch: ['**/mobile-messaging.spec.ts'],
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        permissions: ['camera', 'microphone'],
      },
      testMatch: ['**/mobile-messaging.spec.ts'],
    },

    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        permissions: ['camera', 'microphone'],
      },
      testMatch: ['**/mobile-messaging.spec.ts'],
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Additional accessibility settings
        reducedMotion: 'reduce',
        forcedColors: 'active',
      },
      testMatch: ['**/message-search.spec.ts'],
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    process.env.CI ? ['github'] : ['line'],
  ],

  // Output directory
  outputDir: 'test-results/artifacts',
});