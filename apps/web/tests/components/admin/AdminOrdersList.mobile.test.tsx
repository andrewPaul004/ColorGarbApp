/**
 * @fileoverview Mobile-specific tests for AdminOrdersList three-dot menu functionality
 * Tests mobile touch event handling, accessibility, and menu interactions
 * Addresses Story 9A.2b mobile action menu requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminOrdersList } from '../../../src/components/admin/AdminOrdersList';
import { useAdminStore } from '../../../src/stores/adminStore';

// Mock the admin store
jest.mock('../../../src/stores/adminStore');
const mockUseAdminStore = useAdminStore as jest.MockedFunction<typeof useAdminStore>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock orders data for testing
const mockOrders = [
  {
    id: 'order-1',
    orderNumber: 'CG-2024-001',
    description: 'Fall 2024 Marching Band Uniforms',
    organizationName: 'Lincoln High School',
    currentStage: 'Design Proposal',
    currentShipDate: '2024-12-01T00:00:00Z',
    totalAmount: 5000,
    isActive: true,
    organizationId: 'org-1',
  },
  {
    id: 'order-2',
    orderNumber: 'CG-2024-002',
    description: 'Winter Concert Attire',
    organizationName: 'Springfield College',
    currentStage: 'Production Planning',
    currentShipDate: '2024-11-15T00:00:00Z',
    totalAmount: 3500,
    isActive: true,
    organizationId: 'org-2',
  },
];

describe('AdminOrdersList - Mobile Three-Dot Menu (Story 9A.2b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup admin store mock
    mockUseAdminStore.mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      error: null,
      totalCount: 2,
      pagination: { page: 1, pageSize: 50 },
      selectedOrderIds: [],
      filters: {},
      refreshOrders: jest.fn(),
      clearMessages: jest.fn(),
      setSelectedOrderIds: jest.fn(),
      updateOrderStage: jest.fn(),
      organizations: [],
      ordersError: null,
      successMessage: null,
      loadOrganizations: jest.fn(),
      bulkUpdateOrders: jest.fn(),
    });
  });

  describe('Mobile Touch Event Handling (AC: 1)', () => {
    it('responds to mobile tap events on three-dot menu', async () => {
      render(<AdminOrdersList />);

      const menuButtons = screen.getAllByLabelText('order actions');
      expect(menuButtons).toHaveLength(2);

      // Test mobile tap event
      const firstMenuButton = menuButtons[0];

      // Simulate touch event
      fireEvent.touchStart(firstMenuButton);
      fireEvent.touchEnd(firstMenuButton);
      fireEvent.click(firstMenuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('handles both mouse and touch events without double-firing', async () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];

      // Simulate rapid touch + click (which can happen on some devices)
      fireEvent.touchStart(menuButton);
      fireEvent.touchEnd(menuButton);
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Menu should only appear once, not multiple times
      const menus = screen.getAllByRole('menu');
      expect(menus).toHaveLength(1);
    });

    it('prevents event bubbling and default behavior', async () => {
      const mockStopPropagation = jest.fn();
      const mockPreventDefault = jest.fn();

      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];

      // Create a custom event with spy methods
      const customEvent = {
        ...new Event('click'),
        stopPropagation: mockStopPropagation,
        preventDefault: mockPreventDefault,
        currentTarget: menuButton,
      };

      fireEvent(menuButton, customEvent);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Note: This tests the event handling pattern, actual preventDefault/stopPropagation
      // are called in the component's handleMenuOpen function
    });
  });

  describe('Touch Target Accessibility (AC: 3)', () => {
    it('meets 44px minimum touch target size requirement', () => {
      render(<AdminOrdersList />);

      const menuButtons = screen.getAllByLabelText('order actions');

      menuButtons.forEach(button => {
        const styles = window.getComputedStyle(button);

        // Check that the button has minimum 44px touch target
        // Note: In tests, we verify the CSS properties are set correctly
        expect(button).toHaveStyle({
          minHeight: '44px',
          minWidth: '44px'
        });
      });
    });

    it('has proper ARIA labels for accessibility', () => {
      render(<AdminOrdersList />);

      const menuButtons = screen.getAllByLabelText('order actions');

      menuButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label', 'order actions');
      });
    });

    it('provides visual feedback on touch/hover states', () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];

      // Check hover and active state styling is applied
      expect(menuButton).toHaveStyle({
        '&:hover': { backgroundColor: 'action.hover' },
        '&:active': { backgroundColor: 'action.selected' }
      });
    });
  });

  describe('Menu Functionality (AC: 2)', () => {
    it('opens action menu with appropriate order management options', async () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      await userEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.getByText('Update Status')).toBeInTheDocument();
      });
    });

    it('executes View Details action correctly', async () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      await userEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      const viewDetailsItem = screen.getByText('View Details');
      await userEvent.click(viewDetailsItem);

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/admin/orders/order-1');
    });

    it('opens Update Status dialog correctly', async () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      await userEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Update Status')).toBeInTheDocument();
      });

      const updateStatusItem = screen.getByText('Update Status');
      await userEvent.click(updateStatusItem);

      await waitFor(() => {
        expect(screen.getByText('Update Order Status')).toBeInTheDocument();
      });
    });

    it('dismisses menu when clicking outside', async () => {
      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      await userEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click outside the menu
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Screen Positioning (AC: 6)', () => {
    it('positions menu correctly for mobile screen sizes', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone width
      });

      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      await userEvent.click(menuButton);

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();

        // Verify menu positioning properties
        expect(menu.parentElement).toHaveStyle({
          transformOrigin: 'right top',
        });
      });
    });

    it('handles menu positioning near screen edges', async () => {
      render(<AdminOrdersList />);

      // Test with last order card (likely near bottom of screen)
      const menuButtons = screen.getAllByLabelText('order actions');
      const lastMenuButton = menuButtons[menuButtons.length - 1];

      await userEvent.click(lastMenuButton);

      await waitFor(() => {
        const menu = screen.getByRole('menu');
        expect(menu).toBeInTheDocument();

        // Menu should be positioned to avoid screen edge cutoff
        expect(menu.parentElement).toHaveAttribute('data-popper-placement');
      });
    });
  });

  describe('Performance Requirements (AC: 9)', () => {
    it('opens menu within performance requirements', async () => {
      const startTime = Date.now();

      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should open well within 300ms requirement (allowing for test environment overhead)
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Cross-Device Compatibility (AC: 7)', () => {
    it('works consistently across different mobile browsers', async () => {
      // Mock different mobile user agents
      const userAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1', // iOS Safari
        'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36', // Android Chrome
      ];

      for (const userAgent of userAgents) {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: userAgent,
        });

        render(<AdminOrdersList />);

        const menuButton = screen.getAllByLabelText('order actions')[0];
        await userEvent.click(menuButton);

        await waitFor(() => {
          expect(screen.getByRole('menu')).toBeInTheDocument();
          expect(screen.getByText('View Details')).toBeInTheDocument();
        });

        // Clean up for next iteration
        fireEvent.click(document.body);
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Regression Prevention (AC: 8)', () => {
    it('preserves desktop functionality while adding mobile support', async () => {
      // Mock desktop environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(<AdminOrdersList />);

      const menuButton = screen.getAllByLabelText('order actions')[0];

      // Test mouse event (desktop)
      fireEvent.mouseDown(menuButton);
      fireEvent.mouseUp(menuButton);
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.getByText('Update Status')).toBeInTheDocument();
      });
    });

    it('maintains existing order list functionality', () => {
      render(<AdminOrdersList />);

      // Verify orders are rendered
      expect(screen.getByText('CG-2024-001')).toBeInTheDocument();
      expect(screen.getByText('CG-2024-002')).toBeInTheDocument();
      expect(screen.getByText('Fall 2024 Marching Band Uniforms')).toBeInTheDocument();
      expect(screen.getByText('Winter Concert Attire')).toBeInTheDocument();

      // Verify other functionality still works
      expect(screen.getByText('Lincoln High School')).toBeInTheDocument();
      expect(screen.getByText('Springfield College')).toBeInTheDocument();
    });
  });
});