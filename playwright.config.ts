import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Playwright configuration for ColorGarb application testing
 * Covers authentication, orders, messaging, administration, and cross-browser compatibility
 *
 * @fileoverview Main Playwright configuration for all E2E tests
 * @since 3.0.0
 */

// Environment configuration
const WEB_PORT = process.env.WEB_PORT || '5173';
const API_PORT = process.env.API_PORT || '5132';
const BASE_URL = process.env.BASE_URL || `http://localhost:${WEB_PORT}`;
const API_URL = process.env.API_URL || `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Global test configuration
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // Global test data
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Test timeout configuration
  timeout: 60000,
  expect: {
    timeout: 15000,
  },

  // Browser projects for cross-browser testing
  projects: [
    // Setup project for global authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop Chrome - Primary testing environment
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      dependencies: ['setup'],
      testIgnore: ['**/mobile/**', '**/setup/**'],
    },

    // Desktop Firefox - Cross-browser compatibility
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
      testIgnore: ['**/mobile/**', '**/setup/**', '**/performance/**'],
    },

    // Desktop Safari - Cross-browser compatibility
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['setup'],
      testIgnore: ['**/mobile/**', '**/setup/**', '**/performance/**'],
    },

    // Mobile Chrome - Responsive design validation
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        permissions: ['camera', 'microphone'],
      },
      dependencies: ['setup'],
      testMatch: ['**/mobile/**', '**/responsive/**'],
    },

    // Mobile Safari - iOS compatibility
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        permissions: ['camera', 'microphone'],
      },
      dependencies: ['setup'],
      testMatch: ['**/mobile/**', '**/responsive/**'],
    },

    // Tablet - Medium screen validation
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        permissions: ['camera', 'microphone'],
      },
      dependencies: ['setup'],
      testMatch: ['**/responsive/**'],
    },

    // Accessibility testing with special configurations
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Accessibility-focused settings
        reducedMotion: 'reduce',
        forcedColors: 'active',
        colorScheme: 'light',
        permissions: ['clipboard-read', 'clipboard-write'],
      },
      dependencies: ['setup'],
      testMatch: ['**/accessibility/**'],
    },

    // High contrast mode testing
    {
      name: 'high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark',
        forcedColors: 'active',
      },
      dependencies: ['setup'],
      testMatch: ['**/accessibility/**'],
    },

    // Performance testing with specific network conditions
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Simulate slower network for performance testing
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        },
      },
      dependencies: ['setup'],
      testMatch: ['**/performance/**'],
    },
  ],

  // Global setup for database seeding and test data
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Web server configuration for local development
  webServer: [
    {
      command: 'npm run dev:web',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      cwd: './apps/web',
    },
    {
      command: 'npm run dev:api',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      cwd: './apps/api',
    },
  ],

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'test-results/html-report',
      open: process.env.CI ? 'never' : 'on-failure',
    }],
    ['json', {
      outputFile: 'test-results/test-results.json'
    }],
    ['junit', {
      outputFile: 'test-results/junit.xml'
    }],
    ['blob', {
      outputDir: 'test-results/blob-report',
    }],
    process.env.CI ? ['github'] : ['line'],
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Metadata for test reporting
  metadata: {
    project: 'ColorGarb E2E Tests',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    baseUrl: BASE_URL,
    apiUrl: API_URL,
  },
});