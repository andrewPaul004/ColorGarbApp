/**
 * @fileoverview Test suite for OrdersList component mobile menu functionality.
 * Verifies that the three-dot action menu works correctly on mobile devices.
 *
 * @since 2.5.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { OrdersList } from './OrdersList';
import { useAppStore } from '../../stores/appStore';
import { colorGarbTheme } from '../../theme/colorGarbTheme';
import type { Order } from '../../types/shared';

// Mock the app store
jest.mock('../../stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock the react-router-dom navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

/**
 * Test wrapper component with required providers
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={colorGarbTheme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

/**
 * Sample order data for testing
 */
const mockOrders: Order[] = [
  {
    id: 'order-1',
    orderNumber: 'CG-2023-001',
    description: 'Marching Band Uniforms',
    customerName: 'Central High School',
    currentStage: 'Production',
    originalShipDate: new Date('2023-12-01'),
    currentShipDate: new Date('2023-12-01'),
    totalAmount: 5000,
    paymentStatus: 'Paid',
    isActive: true,
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-10-01'),
    organizationId: 'org-1',
  },
  {
    id: 'order-2',
    orderNumber: 'CG-2023-002',
    description: 'Theater Costumes',
    customerName: 'Drama Club Theater',
    currentStage: 'Quality Control',
    originalShipDate: new Date('2023-11-15'),
    currentShipDate: new Date('2023-11-15'),
    totalAmount: 3000,
    paymentStatus: 'Pending',
    isActive: true,
    createdAt: new Date('2023-09-01'),
    updatedAt: new Date('2023-11-01'),
    organizationId: 'org-2',
  },
];

/**
 * Default mock store state
 */
const defaultMockStore = {
  orders: mockOrders,
  ordersLoading: false,
  ordersError: null,
  user: { id: 'user-1', name: 'Test User', role: 'Director' },
  fetchOrders: jest.fn(),
  clearOrdersError: jest.fn(),
};

describe('OrdersList Mobile Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue(defaultMockStore);
  });

  /**
   * Test that three-dot menu buttons are visible and properly sized in table view
   */
  test('renders three-dot menu buttons with proper touch targets in table view', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    // Should have menu buttons for each order
    const menuButtons = screen.getAllByLabelText('order actions');
    expect(menuButtons).toHaveLength(2);

    // Check touch target sizes meet accessibility requirements (44px minimum)
    menuButtons.forEach(button => {
      expect(button).toHaveStyle('min-height: 44px');
      expect(button).toHaveStyle('min-width: 44px');
    });
  });

  /**
   * Test menu opens on click/tap
   */
  test('opens action menu when three-dot button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButtons = screen.getAllByLabelText('order actions');

    // Click the first menu button
    await user.click(menuButtons[0]);

    // Menu should be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Should show menu items
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Edit Order')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Attach Documents')).toBeInTheDocument();
  });

  /**
   * Test touch events work properly without double-firing
   */
  test('handles touch events correctly without double-firing', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];

    // Simulate touch events followed by click
    fireEvent.touchStart(menuButton);
    fireEvent.touchEnd(menuButton);
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Should only open one menu (no double-firing)
    const menus = screen.getAllByRole('menu');
    expect(menus).toHaveLength(1);
  });

  /**
   * Test menu positioning for mobile screens
   */
  test('positions menu correctly on different screen sizes', async () => {
    const user = userEvent.setup();

    // Mock mobile screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    });

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];
    await user.click(menuButton);

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    // Menu should have proper styling for mobile
    const menuPaper = menu.closest('.MuiPaper-root');
    expect(menuPaper).toHaveStyle('min-width: 180px');
  });

  /**
   * Test menu closes when action is selected
   */
  test('closes menu when action item is selected', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];
    await user.click(menuButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click View Details action
    const viewDetailsItem = screen.getByText('View Details');
    await user.click(viewDetailsItem);

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Should navigate to order details
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-1');
  });

  /**
   * Test all menu actions function correctly
   */
  test('executes all menu actions correctly', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];

    // Test View Details action
    await user.click(menuButton);
    await user.click(screen.getByText('View Details'));
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-1');

    // Test Edit Order action
    await user.click(menuButton);
    await user.click(screen.getByText('Edit Order'));
    expect(consoleSpy).toHaveBeenCalledWith('Edit order:', 'order-1');

    // Test Messages action
    await user.click(menuButton);
    await user.click(screen.getByText('Messages'));
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-1/messages');

    // Test Attach Documents action
    await user.click(menuButton);
    await user.click(screen.getByText('Attach Documents'));
    expect(consoleSpy).toHaveBeenCalledWith('Attach documents to order:', 'order-1');

    consoleSpy.mockRestore();
  });

  /**
   * Test menu works correctly across view modes
   */
  test('menu functionality works in table view only', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // In cards view, should not have action menu buttons
    const cardMenuButtons = screen.queryAllByLabelText('order actions');
    expect(cardMenuButtons).toHaveLength(0);

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    // Now should have menu buttons
    const tableMenuButtons = screen.getAllByLabelText('order actions');
    expect(tableMenuButtons).toHaveLength(2);
  });

  /**
   * Test menu accessibility features
   */
  test('maintains accessibility features for mobile', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];

    // Button should have proper ARIA label
    expect(menuButton).toHaveAccessibleName('order actions');

    // Should be focusable
    menuButton.focus();
    expect(menuButton).toHaveFocus();

    // Should open menu on click
    await user.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Menu items should be accessible
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);

    menuItems.forEach(item => {
      expect(item).toHaveAttribute('role', 'menuitem');
    });
  });

  /**
   * Test rapid consecutive taps don't cause issues
   */
  test('handles rapid consecutive taps gracefully', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];

    // Rapid consecutive clicks
    await user.click(menuButton);
    await user.click(menuButton);
    await user.click(menuButton);

    // Should still work correctly - menu should be open
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Should be able to select an action
    await user.click(screen.getByText('View Details'));

    // Should navigate correctly
    expect(mockNavigate).toHaveBeenCalledWith('/orders/order-1');
  });

  /**
   * Test menu closes when clicking outside
   */
  test('closes menu when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];
    await user.click(menuButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside the menu
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  /**
   * Test menu works correctly with multiple orders
   */
  test('handles multiple order menus independently', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButtons = screen.getAllByLabelText('order actions');
    expect(menuButtons).toHaveLength(2);

    // Open first order menu
    await user.click(menuButtons[0]);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close and open second order menu
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    await user.click(menuButtons[1]);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  /**
   * Test menu handles empty state correctly
   */
  test('handles empty orders state correctly', () => {
    const emptyStore = {
      ...defaultMockStore,
      orders: [],
    };
    mockUseAppStore.mockReturnValue(emptyStore);

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Should show empty state, no menu buttons
    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.queryAllByLabelText('order actions')).toHaveLength(0);
  });

  /**
   * Test menu maintains functionality during loading states
   */
  test('handles loading state correctly', () => {
    const loadingStore = {
      ...defaultMockStore,
      ordersLoading: true,
    };
    mockUseAppStore.mockReturnValue(loadingStore);

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Should show loading spinner, no menu buttons
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryAllByLabelText('order actions')).toHaveLength(0);
  });

  /**
   * Test menu functionality survives view mode changes
   */
  test('menu state resets correctly when switching view modes', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <OrdersList />
      </TestWrapper>
    );

    // Switch to table view and open menu
    const viewModeSelect = screen.getByLabelText('View Mode');
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Table'));

    const menuButton = screen.getAllByLabelText('order actions')[0];
    await user.click(menuButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Switch back to cards view
    await user.click(viewModeSelect);
    await user.click(screen.getByText('Cards'));

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});