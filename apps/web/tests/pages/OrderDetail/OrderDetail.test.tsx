import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import OrderDetail from '../../../src/pages/OrderDetail/OrderDetail';
import { useAppStore } from '../../../src/stores/appStore';
import colorGarbTheme from '../../../src/theme/colorGarbTheme';
import type { OrderDetail as OrderDetailType } from '../../../src/types/shared';

// Mock the store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock child components
jest.mock('../../../src/pages/OrderDetail/components/OrderHeader', () => {
  return function MockOrderHeader({ order }: { order: OrderDetailType }) {
    return <div data-testid="order-header">{order.orderNumber}</div>;
  };
});

jest.mock('../../../src/pages/OrderDetail/components/OrderSummary', () => {
  return function MockOrderSummary({ order }: { order: OrderDetailType }) {
    return <div data-testid="order-summary">{order.description}</div>;
  };
});

jest.mock('../../../src/pages/OrderDetail/components/ContactInfo', () => {
  return function MockContactInfo({ order }: { order: OrderDetailType }) {
    return <div data-testid="contact-info">{order.organization.name}</div>;
  };
});

jest.mock('../../../src/pages/OrderDetail/components/QuickActions', () => {
  return function MockQuickActions({ order }: { order: OrderDetailType }) {
    return <div data-testid="quick-actions">{order.currentStage}</div>;
  };
});

jest.mock('../../../src/pages/OrderDetail/components/Breadcrumbs', () => {
  return function MockBreadcrumbs({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
    return <div data-testid="breadcrumbs">{orderNumber}</div>;
  };
});

/**
 * Test wrapper component that provides theme and router context
 */
const TestWrapper: React.FC<{ children: React.ReactNode; route?: string }> = ({ 
  children, 
  route = '/orders/test-order-id' 
}) => (
  <ThemeProvider theme={colorGarbTheme}>
    <MemoryRouter initialEntries={[route]}>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

/**
 * Mock order detail data for testing
 */
const mockOrderDetail: OrderDetailType = {
  id: 'test-order-id',
  orderNumber: 'CG-2023-001',
  description: 'Test Order Description',
  currentStage: 'Measurements',
  originalShipDate: new Date('2023-12-15'),
  currentShipDate: new Date('2023-12-20'),
  totalAmount: 1500.00,
  paymentStatus: 'Paid',
  status: 'Active',
  isActive: true,
  createdAt: new Date('2023-10-01'),
  updatedAt: new Date('2023-11-15'),
  organizationName: 'Test High School',
  notes: 'Test order notes',
  organization: {
    id: 'test-org-id',
    name: 'Test High School',
    type: 'School',
    contactEmail: 'contact@testschool.edu',
    contactPhone: '555-0123',
    address: {
      street1: '123 School St',
      street2: '',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US'
    },
    paymentTerms: 'Net 30'
  },
  nextActions: ['Submit measurements', 'Review sizing']
};

describe('OrderDetail Component', () => {
  const mockSelectOrder = jest.fn();
  const mockClearSelectedOrder = jest.fn();
  const mockClearOrdersError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppStore.mockReturnValue({
      selectedOrder: null,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);
  });

  it('renders loading state when order is loading', () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: null,
      selectedOrderLoading: true,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: null,
      selectedOrderLoading: false,
      ordersError: 'Failed to load order',
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    expect(screen.getByText('Failed to load order')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  it('renders order not found state when no order is returned', () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: null,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    expect(screen.getByText(/Order not found or you don't have permission/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardWarning');
  });

  it('renders order detail components when order is loaded', async () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: mockOrderDetail,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    // Check that all child components are rendered
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('order-header')).toBeInTheDocument();
    expect(screen.getByTestId('order-summary')).toBeInTheDocument();
    expect(screen.getByTestId('contact-info')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();

    // Check that components receive correct props
    expect(screen.getByTestId('order-header')).toHaveTextContent('CG-2023-001');
    expect(screen.getByTestId('order-summary')).toHaveTextContent('Test Order Description');
    expect(screen.getByTestId('contact-info')).toHaveTextContent('Test High School');
    expect(screen.getByTestId('quick-actions')).toHaveTextContent('Measurements');
  });

  it('calls selectOrder with correct orderId on mount', async () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: mockOrderDetail,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    expect(mockSelectOrder).toHaveBeenCalledWith('test-order-id');
  });

  it('calls cleanup functions on unmount', async () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: mockOrderDetail,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    const { unmount } = render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    unmount();

    expect(mockClearSelectedOrder).toHaveBeenCalled();
    expect(mockClearOrdersError).toHaveBeenCalled();
  });

  it('redirects to dashboard when no orderId is provided', () => {
    render(
      <TestWrapper route="/orders/">
        <OrderDetail />
      </TestWrapper>
    );

    // Component should redirect, so we won't see the main content
    expect(screen.queryByTestId('order-header')).not.toBeInTheDocument();
  });

  it('applies responsive grid layout correctly', () => {
    mockUseAppStore.mockReturnValue({
      selectedOrder: mockOrderDetail,
      selectedOrderLoading: false,
      ordersError: null,
      selectOrder: mockSelectOrder,
      clearSelectedOrder: mockClearSelectedOrder,
      clearOrdersError: mockClearOrdersError,
    } as any);

    render(
      <TestWrapper>
        <OrderDetail />
      </TestWrapper>
    );

    // Check that the grid container exists with proper responsive configuration
    const gridContainer = screen.getByTestId('order-header').closest('[class*="MuiGrid-container"]');
    expect(gridContainer).toBeInTheDocument();
  });
});