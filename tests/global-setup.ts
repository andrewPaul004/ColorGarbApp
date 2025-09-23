import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { DatabaseSeeder } from './test-data/database-seeder';
import { EnvironmentHealthChecker } from './utils/health-checks';
import { AuthStateValidator } from './utils/auth-validation';

/**
 * Global setup for Playwright tests
 * Handles authentication, test data setup, and environment preparation
 *
 * @param config Playwright configuration
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for ColorGarb E2E tests...');

  const { baseURL } = config.projects[0].use;
  const apiUrl = process.env.API_URL || 'http://localhost:5132';

  try {
    // Comprehensive environment health check
    const healthChecker = new EnvironmentHealthChecker(baseURL!, apiUrl);
    const healthStatus = await healthChecker.checkEnvironment();

    if (healthStatus.overall === 'unhealthy') {
      console.error('❌ Environment health check failed. Cannot proceed with tests.');
      const diagnostics = await healthChecker.getDiagnosticInfo();
      console.log('🔍 Diagnostic Information:', JSON.stringify(diagnostics, null, 2));
      throw new Error('Environment is unhealthy. Please resolve the issues above before running tests.');
    }

    if (healthStatus.overall === 'degraded') {
      console.warn('⚠️ Environment has warnings but tests can proceed.');
    }

    // Seed test data
    const seeder = new DatabaseSeeder(apiUrl);
    await seeder.seedAllTestData();
    await seeder.resetAuthStates();

    // Verify test data exists
    const dataExists = await seeder.verifyTestData();
    if (!dataExists) {
      console.warn('⚠️ Test data verification failed, but continuing with setup');
    }

    // Setup authentication state for different user roles
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await setupAuthentication(page, baseURL!, apiUrl);
    } finally {
      await browser.close();
    }

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Setup authentication states for different user roles
 * Creates stored authentication states for reuse in tests
 */
async function setupAuthentication(page: any, baseURL: string, apiUrl: string) {
  console.log('🔐 Setting up authentication states...');

  const authValidator = new AuthStateValidator();
  authValidator.ensureAuthStatesDirectory();

  // Check existing auth states first
  const existingStates = await authValidator.validateAllAuthStates();
  const validStates = existingStates.filter(state => state.isValid);

  console.log(`📊 Found ${validStates.length} valid auth states, ${existingStates.length - validStates.length} invalid`);

  // Clean up invalid states
  await authValidator.cleanupInvalidAuthStates();

  const authStates = [
    {
      role: 'director',
      email: 'director@lincolnhigh.edu'
    },
    {
      role: 'finance',
      email: 'finance@lincolnhigh.edu'
    },
    {
      role: 'staff',
      email: 'staff@colorgarb.com'
    }
  ];

  // Create auth states for users that don't have valid ones
  for (const user of authStates) {
    const existingState = validStates.find(state =>
      state.role === user.role || state.email === user.email
    );

    if (existingState) {
      console.log(`✅ Valid auth state already exists for ${user.role}`);
      continue;
    }

    const success = await authValidator.createTestAuthState(
      page,
      user.role,
      user.email,
      baseURL
    );

    if (success) {
      console.log(`✅ Authentication state created for ${user.role}`);
    } else {
      console.warn(`⚠️ Failed to create authentication state for ${user.role}`);
    }

    // Clear session to prepare for next user
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Small delay between auth setups
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate final auth state report
  const report = await authValidator.generateAuthStateReport();
  console.log(report);
}

export default globalSetup;