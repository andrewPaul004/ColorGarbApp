/**
 * @fileoverview Test suite for AdminOrdersList component status filtering functionality.
 * Verifies that the status filter works correctly and displays appropriate results.
 *
 * @since 2.4.0
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AdminOrdersList } from './AdminOrdersList';
import { useAdminStore } from '../../stores/adminStore';
import { colorGarbTheme } from '../../theme/colorGarbTheme';
import type { AdminOrder } from '../../services/adminService';

// Mock the admin store
jest.mock('../../stores/adminStore');
const mockUseAdminStore = useAdminStore as jest.MockedFunction<typeof useAdminStore>;

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
 * Sample admin order data for testing
 */
const mockOrders: AdminOrder[] = [
  {
    id: '1',
    orderNumber: 'CG-2023-001',
    description: 'Marching Band Uniforms',
    currentStage: 'Production Planning',
    originalShipDate: new Date('2023-12-01'),
    currentShipDate: new Date('2023-12-01'),
    totalAmount: 5000,
    paymentStatus: 'Pending',
    isActive: true,
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-10-01'),
    organizationId: 'org-1',
    organizationName: 'Central High School',
  },
  {
    id: '2',
    orderNumber: 'CG-2023-002',
    description: 'Theater Costumes',
    currentStage: 'Delivery',
    originalShipDate: new Date('2023-11-15'),
    currentShipDate: new Date('2023-11-15'),
    totalAmount: 3000,
    paymentStatus: 'Paid',
    isActive: false,
    createdAt: new Date('2023-09-01'),
    updatedAt: new Date('2023-11-01'),
    organizationId: 'org-2',
    organizationName: 'Drama Club Theater',
  },
  {
    id: '3',
    orderNumber: 'CG-2023-003',
    description: 'Color Guard Flags',
    currentStage: 'Design Proposal',
    originalShipDate: new Date('2024-01-15'),
    currentShipDate: new Date('2024-01-15'),
    totalAmount: 2000,
    paymentStatus: 'Pending',
    isActive: false,
    createdAt: new Date('2023-10-15'),
    updatedAt: new Date('2023-10-15'),
    organizationId: 'org-3',
    organizationName: 'West Side High School',
  },
];

/**
 * Default mock store state
 */
const defaultMockStore = {
  orders: mockOrders,
  filters: { page: 1, pageSize: 50, status: 'Active' },
  totalCount: 3,
  selectedOrderIds: [],
  updateFilters: jest.fn(),
  toggleOrderSelection: jest.fn(),
  selectAllOrders: jest.fn(),
  clearOrderSelection: jest.fn(),
  isOrderSelected: jest.fn().mockReturnValue(false),
};

describe('AdminOrdersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminStore.mockReturnValue(defaultMockStore);
  });

  /**
   * Test that the component renders correctly with default active status filter
   */
  test('renders orders list with active status filter applied', async () => {
    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show the active order
    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();
    expect(screen.getByText('Marching Band Uniforms')).toBeInTheDocument();
    expect(screen.getByText('Central High School')).toBeInTheDocument();

    // Should not show inactive orders when status filter is Active
    expect(screen.queryByText('CG-2023-002')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-003')).not.toBeInTheDocument();
  });

  /**
   * Test search functionality works independently of status filtering
   */
  test('applies search query on top of status-filtered results', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AdminOrdersList searchQuery="Marching" />
      </TestWrapper>
    );

    // Should show filtered results
    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();
    expect(screen.getByText('Marching Band Uniforms')).toBeInTheDocument();

    // Should not show orders that don't match search
    expect(screen.queryByText('CG-2023-002')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-003')).not.toBeInTheDocument();
  });

  /**
   * Test status filter showing completed orders
   */
  test('displays completed orders when status filter is Completed', async () => {
    // Mock store with Completed status filter
    const completedFilterStore = {
      ...defaultMockStore,
      filters: { page: 1, pageSize: 50, status: 'Completed' },
      orders: [mockOrders[1]], // Only the completed order (Delivery stage, inactive)
    };

    mockUseAdminStore.mockReturnValue(completedFilterStore);

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show the completed order
    expect(screen.getByText('CG-2023-002')).toBeInTheDocument();
    expect(screen.getByText('Theater Costumes')).toBeInTheDocument();
    expect(screen.getByText('Drama Club Theater')).toBeInTheDocument();

    // Should not show active or cancelled orders
    expect(screen.queryByText('CG-2023-001')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-003')).not.toBeInTheDocument();
  });

  /**
   * Test status filter showing cancelled orders
   */
  test('displays cancelled orders when status filter is Cancelled', async () => {
    // Mock store with Cancelled status filter
    const cancelledFilterStore = {
      ...defaultMockStore,
      filters: { page: 1, pageSize: 50, status: 'Cancelled' },
      orders: [mockOrders[2]], // Only the cancelled order (inactive, not in final stages)
    };

    mockUseAdminStore.mockReturnValue(cancelledFilterStore);

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show the cancelled order
    expect(screen.getByText('CG-2023-003')).toBeInTheDocument();
    expect(screen.getByText('Color Guard Flags')).toBeInTheDocument();
    expect(screen.getByText('West Side High School')).toBeInTheDocument();

    // Should not show active or completed orders
    expect(screen.queryByText('CG-2023-001')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-002')).not.toBeInTheDocument();
  });

  /**
   * Test status filter showing all orders
   */
  test('displays all orders when status filter is set to all', async () => {
    // Mock store with no status filter (all orders)
    const allFilterStore = {
      ...defaultMockStore,
      filters: { page: 1, pageSize: 50 }, // No status filter
      orders: mockOrders, // All orders
    };

    mockUseAdminStore.mockReturnValue(allFilterStore);

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show all orders
    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();
    expect(screen.getByText('CG-2023-002')).toBeInTheDocument();
    expect(screen.getByText('CG-2023-003')).toBeInTheDocument();

    // Should show all organization names
    expect(screen.getByText('Central High School')).toBeInTheDocument();
    expect(screen.getByText('Drama Club Theater')).toBeInTheDocument();
    expect(screen.getByText('West Side High School')).toBeInTheDocument();
  });

  /**
   * Test empty state when no orders match filter
   */
  test('displays empty state when no orders match status filter', async () => {
    // Mock store with no orders matching filter
    const emptyFilterStore = {
      ...defaultMockStore,
      orders: [],
      totalCount: 0,
    };

    mockUseAdminStore.mockReturnValue(emptyFilterStore);

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show empty state
    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.getByText('No orders match the current filters. Try adjusting your search criteria.')).toBeInTheDocument();

    // Should not show any order entries
    expect(screen.queryByText('CG-2023-001')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-002')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-003')).not.toBeInTheDocument();
  });

  /**
   * Test mobile responsive view maintains filter functionality
   */
  test('maintains status filter functionality in mobile view', async () => {
    // Mock mobile breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600, // Mobile width
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show the active order in mobile view
    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();
    expect(screen.getByText('Marching Band Uniforms')).toBeInTheDocument();

    // Should not show inactive orders
    expect(screen.queryByText('CG-2023-002')).not.toBeInTheDocument();
    expect(screen.queryByText('CG-2023-003')).not.toBeInTheDocument();
  });

  /**
   * Test that status chips display correctly
   */
  test('displays correct status chips for orders', async () => {
    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show active status chip
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Should show payment status
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  /**
   * Test order selection functionality works with status filtering
   */
  test('allows order selection with status filtering applied', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Find and click the checkbox for the active order
    const checkbox = screen.getByRole('checkbox', { name: /select.*CG-2023-001/i });
    await user.click(checkbox);

    // Should call toggle selection
    expect(defaultMockStore.toggleOrderSelection).toHaveBeenCalledWith('1');
  });

  /**
   * Test pagination works correctly with status filtering
   */
  test('displays pagination information correctly with status filter', async () => {
    const paginatedStore = {
      ...defaultMockStore,
      totalCount: 25,
      filters: { page: 1, pageSize: 50, status: 'Active' },
    };

    mockUseAdminStore.mockReturnValue(paginatedStore);

    render(
      <TestWrapper>
        <AdminOrdersList />
      </TestWrapper>
    );

    // Should show pagination controls
    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(pagination).toBeInTheDocument();
  });
});