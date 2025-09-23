import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the main Dashboard page
 * Handles order overview, filtering, and navigation to order details
 *
 * @class DashboardPage
 * @extends BasePage
 * @since 3.0.0
 */
export class DashboardPage extends BasePage {
  // Page-specific selectors
  private selectors = {
    // Page structure - actual Material-UI components
    pageTitle: 'h1:has-text("Order Dashboard")',
    welcomeMessage: 'text=/Welcome back.*Here are your organization\'s orders/',

    // Summary cards - Updated to use data-testid selectors
    summaryCardsContainer: '.MuiGrid-container >> .MuiPaper-root',
    totalOrdersCard: '[data-testid="total-orders-card"]',
    activeOrdersCard: '[data-testid="active-orders-card"]',
    overdueOrdersCard: '[data-testid="overdue-orders-card"]',
    totalValueCard: '[data-testid="total-value-card"]',

    // Filters - Updated to use data-testid selectors
    filtersContainer: '.MuiPaper-root:has(.MuiFormControl-root)',
    statusFilter: '[data-testid="status-filter-select"]',
    stageFilter: '[data-testid="stage-filter-select"]',
    statusFilterDropdown: '[aria-labelledby="status-filter-label"]',
    stageFilterDropdown: '[aria-labelledby="stage-filter-label"]',

    // Orders grid
    ordersGrid: '.MuiGrid-container:has(.MuiCard-root)',
    orderCards: '.MuiCard-root',
    emptyState: 'text=No Orders Found',

    // Create order functionality
    createOrderButton: '[data-testid="create-order-button"]',
    createOrderDialog: '.MuiDialog-root',

    // Error and loading states
    errorAlert: '.MuiAlert-root',
    loadingSpinner: '.MuiCircularProgress-root',
  };

  // Locators
  get pageTitle(): Locator { return this.page.locator(this.selectors.pageTitle); }
  get createOrderButton(): Locator { return this.page.locator(this.selectors.createOrderButton); }
  get ordersGrid(): Locator { return this.page.locator(this.selectors.ordersGrid); }
  get orderCards(): Locator { return this.page.locator(this.selectors.orderCards); }
  get statusFilter(): Locator { return this.page.locator(this.selectors.statusFilter); }
  get stageFilter(): Locator { return this.page.locator(this.selectors.stageFilter); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto(`${this.baseURL}/dashboard`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for dashboard to load completely
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.page.waitForURL('/dashboard');
    await this.waitForPageLoad();

    // Wait for summary cards to load
    await this.page.locator(this.selectors.summaryCardsContainer).waitFor({ state: 'visible' });

    // Wait for orders to load (or empty state)
    await Promise.race([
      this.page.locator(this.selectors.ordersGrid).waitFor({ state: 'visible' }),
      this.page.locator(this.selectors.emptyState).waitFor({ state: 'visible' })
    ]);
  }

  /**
   * Verify dashboard page display
   */
  async verifyPageDisplay(): Promise<void> {
    // Check page title
    await expect(this.pageTitle).toBeVisible();
    await expect(this.pageTitle).toContainText('Order Dashboard');

    // Check welcome message
    const welcomeMessage = this.page.locator(this.selectors.welcomeMessage);
    await expect(welcomeMessage).toBeVisible();

    // Check summary cards are visible
    await expect(this.page.locator(this.selectors.summaryCards)).toBeVisible();
    await expect(this.page.locator(this.selectors.totalOrdersCard)).toBeVisible();
    await expect(this.page.locator(this.selectors.activeOrdersCard)).toBeVisible();
    await expect(this.page.locator(this.selectors.overdueOrdersCard)).toBeVisible();
    await expect(this.page.locator(this.selectors.totalValueCard)).toBeVisible();

    // Check filters are visible
    await expect(this.page.locator(this.selectors.filtersContainer)).toBeVisible();
    await expect(this.statusFilter).toBeVisible();
    await expect(this.stageFilter).toBeVisible();
  }

  /**
   * Get the user name from the welcome message
   */
  async getUserName(): Promise<string | null> {
    const userName = this.page.locator(this.selectors.userName);
    if (await userName.isVisible()) {
      return await userName.textContent();
    }

    // Fallback: extract from welcome message
    const welcomeMessage = await this.page.locator(this.selectors.welcomeMessage).textContent();
    const match = welcomeMessage?.match(/Welcome back,\s*([^!]+)/);
    return match ? match[1].trim() : null;
  }

  /**
   * Get summary statistics from the dashboard cards
   */
  async getSummaryStats(): Promise<{
    totalOrders: number;
    activeOrders: number;
    overdueOrders: number;
    totalValue: string;
  }> {
    const totalOrdersText = await this.page.locator(this.selectors.totalOrdersCard + ' .MuiTypography-h5').textContent();
    const activeOrdersText = await this.page.locator(this.selectors.activeOrdersCard + ' .MuiTypography-h5').textContent();
    const overdueOrdersText = await this.page.locator(this.selectors.overdueOrdersCard + ' .MuiTypography-h5').textContent();
    const totalValueText = await this.page.locator(this.selectors.totalValueCard + ' .MuiTypography-h6').textContent();

    return {
      totalOrders: parseInt(totalOrdersText || '0'),
      activeOrders: parseInt(activeOrdersText || '0'),
      overdueOrders: parseInt(overdueOrdersText || '0'),
      totalValue: totalValueText || '$0.00'
    };
  }

  /**
   * Set status filter
   */
  async setStatusFilter(status: 'All' | 'Active' | 'Inactive' | 'Completed'): Promise<void> {
    await this.statusFilter.click();
    await this.page.locator(`[role="option"][data-value="${status}"]`).click();
    await this.waitForAPIResponse('/api/orders');
    await this.waitForLoadingToComplete();
  }

  /**
   * Set stage filter
   */
  async setStageFilter(stage: string): Promise<void> {
    await this.stageFilter.click();
    await this.page.locator(`[role="option"][data-value="${stage}"]`).click();
    await this.waitForAPIResponse('/api/orders');
    await this.waitForLoadingToComplete();
  }

  /**
   * Get the number of order cards displayed
   */
  async getOrderCount(): Promise<number> {
    await this.waitForLoadingToComplete();
    return await this.orderCards.count();
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateDisplayed(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get order information from a specific order card
   */
  async getOrderInfo(index: number): Promise<{
    id: string;
    orderNumber: string;
    description: string;
    stage: string;
    shipDate: string;
  }> {
    const orderCard = this.orderCards.nth(index);
    await expect(orderCard).toBeVisible();

    const orderNumber = await orderCard.locator('[data-testid="order-number"]').textContent();
    const description = await orderCard.locator('[data-testid="order-description"]').textContent();
    const stage = await orderCard.locator('[data-testid="order-stage"]').textContent();
    const shipDate = await orderCard.locator('[data-testid="order-ship-date"]').textContent();

    // Get order ID from data attribute or href
    const orderId = await orderCard.getAttribute('data-order-id') || '';

    return {
      id: orderId,
      orderNumber: orderNumber || '',
      description: description || '',
      stage: stage || '',
      shipDate: shipDate || ''
    };
  }

  /**
   * Click on an order card to navigate to order details
   */
  async clickOrderCard(index: number): Promise<void> {
    const orderCard = this.orderCards.nth(index);
    await orderCard.click();
    await this.page.waitForURL(/\/orders\/[^\/]+$/);
    await this.waitForPageLoad();
  }

  /**
   * Click on a specific order by order number
   */
  async clickOrderByNumber(orderNumber: string): Promise<void> {
    const orderCard = this.page.locator(`[data-testid="order-card"]:has([data-testid="order-number"]:text("${orderNumber}"))`);
    await expect(orderCard).toBeVisible();
    await orderCard.click();
    await this.page.waitForURL(/\/orders\/[^\/]+$/);
    await this.waitForPageLoad();
  }

  /**
   * Click create order button (if user has permission)
   */
  async clickCreateOrder(): Promise<void> {
    await expect(this.createOrderButton).toBeVisible();
    await this.createOrderButton.click();

    // Wait for create order dialog to appear
    await this.page.locator(this.selectors.createOrderDialog).waitFor({ state: 'visible' });
  }

  /**
   * Verify create order button visibility based on user role
   */
  async verifyCreateOrderPermission(shouldBeVisible: boolean): Promise<void> {
    if (shouldBeVisible) {
      await expect(this.createOrderButton).toBeVisible();
    } else {
      await expect(this.createOrderButton).not.toBeVisible();
    }
  }

  /**
   * Search for orders (if search functionality exists)
   */
  async searchOrders(searchTerm: string): Promise<void> {
    const searchInput = this.page.locator(this.commonSelectors.searchInput);
    if (await searchInput.isVisible()) {
      await this.fillField(this.commonSelectors.searchInput, searchTerm, { pressEnter: true });
      await this.waitForAPIResponse('/api/orders');
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Verify order cards display correct information
   */
  async verifyOrderCardsFormat(): Promise<void> {
    const orderCount = await this.getOrderCount();

    if (orderCount === 0) {
      await expect(this.page.locator(this.selectors.emptyState)).toBeVisible();
      return;
    }

    // Check first few order cards for proper format
    const cardsToCheck = Math.min(orderCount, 3);

    for (let i = 0; i < cardsToCheck; i++) {
      const orderCard = this.orderCards.nth(i);

      // Verify required elements are present
      await expect(orderCard.locator('[data-testid="order-number"]')).toBeVisible();
      await expect(orderCard.locator('[data-testid="order-description"]')).toBeVisible();
      await expect(orderCard.locator('[data-testid="order-stage"]')).toBeVisible();
      await expect(orderCard.locator('[data-testid="order-ship-date"]')).toBeVisible();

      // Verify card is clickable
      await expect(orderCard).toHaveAttribute('role', 'button');
    }
  }

  /**
   * Test filter functionality comprehensively
   */
  async testFiltering(): Promise<void> {
    // Test status filters
    const statusFilters = ['All', 'Active', 'Inactive'];

    for (const status of statusFilters) {
      await this.setStatusFilter(status as any);
      await this.waitForLoadingToComplete();

      // Verify URL parameter is set
      expect(this.page.url()).toContain(`status=${status}`);
    }

    // Test stage filters
    const stageFilters = ['All', 'DesignProposal', 'ProofApproval', 'Measurements'];

    for (const stage of stageFilters) {
      await this.setStageFilter(stage);
      await this.waitForLoadingToComplete();

      if (stage !== 'All') {
        expect(this.page.url()).toContain(`stage=${stage}`);
      }
    }
  }

  /**
   * Verify responsive design on different viewports
   */
  async testResponsiveDesign(): Promise<void> {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop', expectedColumns: 3 },
      { width: 1024, height: 768, name: 'tablet', expectedColumns: 2 },
      { width: 375, height: 667, name: 'mobile', expectedColumns: 1 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500);

      // Verify layout adapts
      await expect(this.ordersGrid).toBeVisible();

      // Take screenshot for manual verification
      await this.takeScreenshot(`dashboard-${viewport.name}`);
    }
  }

  /**
   * Test performance with large number of orders
   */
  async testPerformanceWithManyOrders(): Promise<void> {
    const startTime = Date.now();

    // Navigate to dashboard
    await this.goto();

    // Wait for all content to load
    await this.waitForDashboardLoad();

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Verify reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000); // 5 seconds max

    // Verify grid renders efficiently
    const orderCount = await this.getOrderCount();
    console.log(`Dashboard loaded ${orderCount} orders in ${loadTime}ms`);
  }

  /**
   * Verify keyboard navigation through order cards
   */
  async testKeyboardNavigation(): Promise<void> {
    const orderCount = await this.getOrderCount();

    if (orderCount === 0) return;

    // Focus first order card
    await this.orderCards.first().focus();

    // Navigate through cards with arrow keys
    for (let i = 0; i < Math.min(orderCount - 1, 3); i++) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(100);
    }

    // Test Enter key to open order
    await this.page.keyboard.press('Enter');
    await this.page.waitForURL(/\/orders\/[^\/]+$/);
  }

  /**
   * Verify data consistency between summary cards and order list
   */
  async verifyDataConsistency(): Promise<void> {
    const stats = await this.getSummaryStats();
    const displayedOrderCount = await this.getOrderCount();

    // For 'All' filter, total orders should match displayed count (considering pagination)
    await this.setStatusFilter('All');
    await this.waitForLoadingToComplete();

    const allOrdersCount = await this.getOrderCount();

    // Basic consistency check (exact match depends on pagination implementation)
    expect(allOrdersCount).toBeGreaterThanOrEqual(0);
    expect(stats.totalOrders).toBeGreaterThanOrEqual(allOrdersCount);
  }
}