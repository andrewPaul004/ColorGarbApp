import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

/**
 * Global setup for Playwright tests
 * Handles authentication, test data setup, and environment preparation
 *
 * @param config Playwright configuration
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for ColorGarb E2E tests...');

  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Check if backend is running
    console.log('🔍 Checking backend health...');
    const apiUrl = process.env.API_URL || 'http://localhost:5132';

    try {
      const response = await page.goto(`${apiUrl}/api/health`);
      if (!response?.ok()) {
        throw new Error(`Backend health check failed: ${response?.status()}`);
      }
      console.log('✅ Backend is healthy');
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      throw new Error('Backend is not running or not healthy. Please start the API server.');
    }

    // Check if frontend is running
    console.log('🔍 Checking frontend...');
    try {
      const response = await page.goto(baseURL!);
      if (!response?.ok()) {
        throw new Error(`Frontend check failed: ${response?.status()}`);
      }
      console.log('✅ Frontend is accessible');
    } catch (error) {
      console.error('❌ Frontend check failed:', error);
      throw new Error('Frontend is not running. Please start the web server.');
    }

    // Setup authentication state for different user roles
    await setupAuthentication(page, baseURL!);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication states for different user roles
 * Creates stored authentication states for reuse in tests
 */
async function setupAuthentication(page: any, baseURL: string) {
  console.log('🔐 Setting up authentication states...');

  const authStates = [
    {
      role: 'director',
      email: 'director@lincolnhigh.edu',
      password: 'password123',
      name: 'Jane Smith',
      statePath: 'tests/auth-states/director.json'
    },
    {
      role: 'finance',
      email: 'finance@lincolnhigh.edu',
      password: 'password123',
      name: 'John Finance',
      statePath: 'tests/auth-states/finance.json'
    },
    {
      role: 'staff',
      email: 'staff@colorgarb.com',
      password: 'password123',
      name: 'ColorGarb Staff',
      statePath: 'tests/auth-states/staff.json'
    }
  ];

  // Ensure auth-states directory exists
  const fs = require('fs');
  const authStatesDir = path.dirname(authStates[0].statePath);
  if (!fs.existsSync(authStatesDir)) {
    fs.mkdirSync(authStatesDir, { recursive: true });
  }

  for (const user of authStates) {
    try {
      console.log(`🔑 Setting up authentication for ${user.role}...`);

      // Navigate to login page
      await page.goto(`${baseURL}/auth/login`);

      // Fill in credentials
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);

      // Submit login form
      await page.click('[data-testid="sign-in-button"]');

      // Wait for successful login (redirect to dashboard or admin dashboard)
      await page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 10000 });

      // Save the authentication state
      await page.context().storageState({ path: user.statePath });

      console.log(`✅ Authentication state saved for ${user.role}`);

      // Logout to prepare for next user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

    } catch (error) {
      console.warn(`⚠️ Could not setup authentication for ${user.role}:`, error.message);
      // Continue with other users even if one fails
    }
  }
}

export default globalSetup;