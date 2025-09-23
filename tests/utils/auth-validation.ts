/**
 * Authentication state validation utilities for E2E tests
 * Validates stored authentication states and provides debugging capabilities
 *
 * @fileoverview Authentication state management and validation
 * @since 3.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';

export interface AuthState {
  cookies: any[];
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
    sessionStorage?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export interface AuthStateInfo {
  role: string;
  email: string;
  statePath: string;
  isValid: boolean;
  lastModified?: Date;
  userInfo?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

/**
 * Authentication state validator and manager
 */
export class AuthStateValidator {
  private authStatesDir: string;

  constructor(authStatesDir: string = 'tests/auth-states') {
    this.authStatesDir = authStatesDir;
  }

  /**
   * Validate all authentication state files
   */
  async validateAllAuthStates(): Promise<AuthStateInfo[]> {
    const results: AuthStateInfo[] = [];

    if (!fs.existsSync(this.authStatesDir)) {
      console.warn(`⚠️ Auth states directory not found: ${this.authStatesDir}`);
      return results;
    }

    const authFiles = fs.readdirSync(this.authStatesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(this.authStatesDir, file));

    for (const filePath of authFiles) {
      const result = await this.validateAuthState(filePath);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a specific authentication state file
   */
  async validateAuthState(statePath: string): Promise<AuthStateInfo> {
    const role = path.basename(statePath, '.json');

    try {
      if (!fs.existsSync(statePath)) {
        return {
          role,
          email: 'unknown',
          statePath,
          isValid: false,
        };
      }

      const stats = fs.statSync(statePath);
      const authData = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as AuthState;

      // Extract user info from localStorage
      const userInfo = this.extractUserInfo(authData);

      // Validate structure
      const isValid = this.validateAuthStateStructure(authData);

      return {
        role,
        email: userInfo?.email || 'unknown',
        statePath,
        isValid,
        lastModified: stats.mtime,
        userInfo,
      };

    } catch (error) {
      console.warn(`⚠️ Failed to validate auth state ${statePath}:`, error.message);
      return {
        role,
        email: 'error',
        statePath,
        isValid: false,
      };
    }
  }

  /**
   * Extract user information from auth state
   */
  private extractUserInfo(authState: AuthState): any {
    try {
      for (const origin of authState.origins) {
        for (const item of origin.localStorage || []) {
          if (item.name === 'auth-storage') {
            const authData = JSON.parse(item.value);
            if (authData.state?.user) {
              return authData.state.user;
            }
          }
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Validate authentication state structure
   */
  private validateAuthStateStructure(authState: AuthState): boolean {
    try {
      // Check required structure
      if (!authState.origins || !Array.isArray(authState.origins)) {
        return false;
      }

      // Check for at least one origin with localStorage
      const hasValidOrigin = authState.origins.some(origin =>
        origin.origin &&
        origin.localStorage &&
        Array.isArray(origin.localStorage)
      );

      if (!hasValidOrigin) {
        return false;
      }

      // Check for auth data in localStorage
      const hasAuthData = authState.origins.some(origin =>
        origin.localStorage?.some(item =>
          item.name === 'auth-storage' &&
          item.value &&
          this.isValidAuthValue(item.value)
        )
      );

      return hasAuthData;

    } catch (error) {
      return false;
    }
  }

  /**
   * Validate authentication value structure
   */
  private isValidAuthValue(value: string): boolean {
    try {
      const authData = JSON.parse(value);
      return !!(
        authData.state?.user?.id &&
        authData.state?.user?.email &&
        authData.state?.user?.role &&
        authData.state?.token &&
        authData.state?.isAuthenticated === true
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create authentication state for testing purposes
   */
  async createTestAuthState(
    page: Page,
    role: string,
    email: string,
    baseURL: string
  ): Promise<boolean> {
    try {
      console.log(`🔑 Creating auth state for ${role} (${email})...`);

      // Navigate to login page
      await page.goto(`${baseURL}/auth/login`);

      // Fill in credentials
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', 'password123');

      // Submit login form
      await page.click('[data-testid="login-submit-button"]');

      // Wait for successful login
      await page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 15000 });

      // Verify we're logged in by checking for user content
      await page.waitForSelector('[data-testid="create-order-button"], [data-testid="admin-dashboard"]', {
        timeout: 10000
      });

      // Save the authentication state
      const statePath = path.join(this.authStatesDir, `${role}.json`);
      await page.context().storageState({ path: statePath });

      // Validate the created state
      const validation = await this.validateAuthState(statePath);

      if (validation.isValid) {
        console.log(`✅ Auth state created and validated for ${role}`);
        return true;
      } else {
        console.warn(`⚠️ Auth state created but validation failed for ${role}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Failed to create auth state for ${role}:`, error.message);
      return false;
    }
  }

  /**
   * Clean up expired or invalid authentication states
   */
  async cleanupInvalidAuthStates(): Promise<void> {
    const states = await this.validateAllAuthStates();

    for (const state of states) {
      if (!state.isValid) {
        console.log(`🧹 Removing invalid auth state: ${state.statePath}`);
        try {
          if (fs.existsSync(state.statePath)) {
            fs.unlinkSync(state.statePath);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to remove ${state.statePath}:`, error.message);
        }
      }
    }
  }

  /**
   * Generate authentication state summary report
   */
  async generateAuthStateReport(): Promise<string> {
    const states = await this.validateAllAuthStates();

    let report = '\n🔐 Authentication State Report\n';
    report += '=' .repeat(40) + '\n';

    if (states.length === 0) {
      report += '❌ No authentication states found\n';
      return report;
    }

    for (const state of states) {
      const status = state.isValid ? '✅' : '❌';
      const lastMod = state.lastModified
        ? new Date(state.lastModified).toISOString()
        : 'unknown';

      report += `${status} ${state.role.padEnd(10)} | ${state.email.padEnd(25)} | ${lastMod}\n`;

      if (state.userInfo) {
        report += `   User ID: ${state.userInfo.id}\n`;
        report += `   Role: ${state.userInfo.role}\n`;
        if (state.userInfo.organizationId) {
          report += `   Org: ${state.userInfo.organizationId}\n`;
        }
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Ensure auth states directory exists
   */
  ensureAuthStatesDirectory(): void {
    if (!fs.existsSync(this.authStatesDir)) {
      fs.mkdirSync(this.authStatesDir, { recursive: true });
      console.log(`📁 Created auth states directory: ${this.authStatesDir}`);
    }
  }
}