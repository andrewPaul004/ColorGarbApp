import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object model providing common functionality for all pages
 * Contains shared methods for navigation, error handling, and common UI elements
 *
 * @class BasePage
 * @since 3.0.0
 */
export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  // Common selectors used across all pages
  protected commonSelectors = {
    // Navigation
    navigationBar: '[data-testid="navigation-bar"]',
    userMenu: '[data-testid="user-menu"]',
    userMenuButton: '[data-testid="user-menu-button"]',
    logoutButton: '[data-testid="logout-button"]',
    logoLink: '[data-testid="logo-link"]',

    // Loading states
    loadingSpinner: '[data-testid="loading-spinner"]',
    pageLoading: '[data-testid="page-loading"]',
    skeletonLoader: '[data-testid="skeleton-loader"]',

    // Error handling
    errorAlert: '[data-testid="error-alert"]',
    errorMessage: '[data-testid="error-message"]',
    successAlert: '[data-testid="success-alert"]',
    warningAlert: '[data-testid="warning-alert"]',
    infoAlert: '[data-testid="info-alert"]',

    // Common buttons
    saveButton: '[data-testid="save-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    submitButton: '[data-testid="submit-button"]',
    resetButton: '[data-testid="reset-button"]',
    deleteButton: '[data-testid="delete-button"]',
    editButton: '[data-testid="edit-button"]',
    viewButton: '[data-testid="view-button"]',

    // Common dialogs
    confirmDialog: '[data-testid="confirm-dialog"]',
    confirmDialogTitle: '[data-testid="confirm-dialog-title"]',
    confirmDialogMessage: '[data-testid="confirm-dialog-message"]',
    confirmDialogConfirm: '[data-testid="confirm-dialog-confirm"]',
    confirmDialogCancel: '[data-testid="confirm-dialog-cancel"]',

    // Form elements
    searchInput: '[data-testid="search-input"]',
    filterButton: '[data-testid="filter-button"]',
    clearFiltersButton: '[data-testid="clear-filters-button"]',
    paginationContainer: '[data-testid="pagination-container"]',
    paginationInfo: '[data-testid="pagination-info"]',

    // Breadcrumb navigation
    breadcrumbContainer: '[data-testid="breadcrumb-container"]',
    breadcrumbLink: '[data-testid="breadcrumb-link"]',
  };

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:5173';
  }

  /**
   * Navigate to the page (implemented by subclasses)
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoadingToComplete();
  }

  /**
   * Wait for any loading indicators to disappear
   */
  async waitForLoadingToComplete(): Promise<void> {
    // Wait for loading spinners to disappear
    const loadingSpinner = this.page.locator(this.commonSelectors.loadingSpinner);
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'detached', timeout: 30000 });
    }

    // Wait for skeleton loaders to disappear
    const skeletonLoader = this.page.locator(this.commonSelectors.skeletonLoader);
    if (await skeletonLoader.isVisible()) {
      await skeletonLoader.waitFor({ state: 'detached', timeout: 30000 });
    }

    // Wait for page loading indicators
    const pageLoading = this.page.locator(this.commonSelectors.pageLoading);
    if (await pageLoading.isVisible()) {
      await pageLoading.waitFor({ state: 'detached', timeout: 30000 });
    }
  }

  /**
   * Get the current page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get the current URL
   */
  async getCurrentURL(): Promise<string> {
    return this.page.url();
  }

  /**
   * Check if an element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Get error message if present
   */
  async getErrorMessage(): Promise<string | null> {
    const errorAlert = this.page.locator(this.commonSelectors.errorAlert);
    if (await errorAlert.isVisible()) {
      return await errorAlert.textContent();
    }

    const errorMessage = this.page.locator(this.commonSelectors.errorMessage);
    if (await errorMessage.isVisible()) {
      return await errorMessage.textContent();
    }

    return null;
  }

  /**
   * Get success message if present
   */
  async getSuccessMessage(): Promise<string | null> {
    const successAlert = this.page.locator(this.commonSelectors.successAlert);
    if (await successAlert.isVisible()) {
      return await successAlert.textContent();
    }
    return null;
  }

  /**
   * Wait for and handle confirmation dialog
   */
  async handleConfirmationDialog(confirm: boolean = true): Promise<void> {
    const confirmDialog = this.page.locator(this.commonSelectors.confirmDialog);
    await confirmDialog.waitFor({ state: 'visible', timeout: 10000 });

    if (confirm) {
      await this.page.click(this.commonSelectors.confirmDialogConfirm);
    } else {
      await this.page.click(this.commonSelectors.confirmDialogCancel);
    }

    await confirmDialog.waitFor({ state: 'detached', timeout: 10000 });
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<void> {
    // Open user menu
    await this.page.click(this.commonSelectors.userMenuButton);

    // Wait for menu to appear
    await this.page.locator(this.commonSelectors.userMenu).waitFor({ state: 'visible' });

    // Click logout
    await this.page.click(this.commonSelectors.logoutButton);

    // Wait for redirect to login page
    await this.page.waitForURL('/auth/login');
  }

  /**
   * Navigate to a specific page using the navigation menu
   */
  async navigateToPage(pageName: string): Promise<void> {
    const navLinks: Record<string, string> = {
      'dashboard': '/dashboard',
      'orders': '/orders',
      'profile': '/profile',
      'admin-dashboard': '/admin/dashboard',
      'admin-users': '/admin/users',
      'admin-messages': '/admin/messages',
      'admin-organizations': '/admin/organizations',
    };

    const url = navLinks[pageName];
    if (!url) {
      throw new Error(`Unknown page: ${pageName}`);
    }

    await this.page.goto(`${this.baseURL}${url}`);
    await this.waitForPageLoad();
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Wait for API response and verify success
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );

    expect(response.status()).toBeLessThan(400);
    return response;
  }

  /**
   * Fill form field with proper validation
   */
  async fillField(selector: string, value: string, options: {
    clear?: boolean;
    pressEnter?: boolean;
    validate?: boolean;
  } = {}): Promise<void> {
    const field = this.page.locator(selector);

    // Wait for field to be visible
    await field.waitFor({ state: 'visible' });

    // Clear field if requested
    if (options.clear !== false) {
      await field.clear();
    }

    // Fill the field
    await field.fill(value);

    // Press Enter if requested
    if (options.pressEnter) {
      await field.press('Enter');
    }

    // Validate the value was set correctly
    if (options.validate !== false) {
      await expect(field).toHaveValue(value);
    }
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string, options: {
    force?: boolean;
    timeout?: number;
    retries?: number;
  } = {}): Promise<void> {
    const element = this.page.locator(selector);
    const retries = options.retries || 3;
    const timeout = options.timeout || 10000;

    for (let i = 0; i < retries; i++) {
      try {
        await element.waitFor({ state: 'visible', timeout });
        await element.click({ force: options.force, timeout });
        return;
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Verify page accessibility basics
   */
  async verifyAccessibility(): Promise<void> {
    // Check for page title
    const title = await this.getPageTitle();
    expect(title).toBeTruthy();
    expect(title).not.toBe('');

    // Check for main landmark
    const main = this.page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Check for proper heading structure
    const h1 = this.page.locator('h1');
    await expect(h1).toHaveCount(1);
  }

  /**
   * Handle responsive design verification
   */
  async verifyResponsiveDesign(): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500); // Allow layout to settle

      // Verify navigation is accessible
      const navigation = this.page.locator(this.commonSelectors.navigationBar);
      await expect(navigation).toBeVisible();

      // Take screenshot for manual verification
      await this.takeScreenshot(`responsive-${viewport.name}`);
    }
  }

  /**
   * Verify common security headers and practices
   */
  async verifySecurityPractices(): Promise<void> {
    // Check for HTTPS in production
    const url = this.page.url();
    if (process.env.NODE_ENV === 'production') {
      expect(url).toMatch(/^https:/);
    }

    // Verify no sensitive data in localStorage
    const localStorage = await this.page.evaluate(() => {
      const items: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key);
        }
      }
      return items;
    });

    // Check for potentially sensitive data patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /private.*key/i,
      /api.*key/i
    ];

    for (const [key, value] of Object.entries(localStorage)) {
      for (const pattern of sensitivePatterns) {
        expect(key).not.toMatch(pattern);
        if (typeof value === 'string') {
          expect(value).not.toMatch(pattern);
        }
      }
    }
  }
}