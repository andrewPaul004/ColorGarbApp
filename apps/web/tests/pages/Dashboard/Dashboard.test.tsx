import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Dashboard } from '../../../src/pages/Dashboard/Dashboard';
import { useAppStore } from '../../../src/stores/appStore';
import { Order } from '../../../src/types/shared';

// Mock the store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock theme for Material-UI components
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock orders data
const mockOrders: Order[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    orderNumber: 'CG-2023-001',
    description: 'Spring Musical Costumes',
    currentStage: 'Measurements',
    originalShipDate: new Date('2023-12-15'),
    currentShipDate: new Date('2023-12-20'),
    totalAmount: 5000.00,
    paymentStatus: 'Partial',
    isActive: true,
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-11-01'),
    organizationName: 'Test High School'
  },
  {
    id: '987fcdeb-51d2-45a3-9876-543210987654',
    orderNumber: 'CG-2023-002',
    description: 'Winter Play Costumes',
    currentStage: 'Production',
    originalShipDate: new Date('2023-11-30'),
    currentShipDate: new Date('2023-01-01'), // Overdue
    totalAmount: 3500.00,
    paymentStatus: 'Paid',
    isActive: true,
    createdAt: new Date('2023-09-15'),
    updatedAt: new Date('2023-10-15'),
    organizationName: 'Test High School'
  },
  {
    id: 'abc12345-def6-7890-ghij-klmnopqrstuv',
    orderNumber: 'CG-2023-003',
    description: 'Completed Fall Show',
    currentStage: 'Shipped',
    originalShipDate: new Date('2023-10-01'),
    currentShipDate: new Date('2023-10-01'),
    totalAmount: 2500.00,
    paymentStatus: 'Paid',
    isActive: false,
    createdAt: new Date('2023-08-01'),
    updatedAt: new Date('2023-09-01'),
    organizationName: 'Test High School'
  }
];

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'John Doe',
  role: 'Director',
  organizationId: 'org-456'
};

describe('Dashboard Component', () => {
  const mockFetchOrders = jest.fn();
  const mockClearOrdersError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseAppStore.mockReturnValue({
      orders: mockOrders.filter(order => order.isActive), // Default to active orders
      ordersLoading: false,
      ordersError: null,
      user: mockUser,
      fetchOrders: mockFetchOrders,
      clearOrdersError: mockClearOrdersError,
      // Add other required properties with default values
      organization: null,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
      refreshToken: jest.fn(),
      setUser: jest.fn(),
      setOrganization: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      clearState: jest.fn(),
      fetchOrder: jest.fn(),
      setOrdersLoading: jest.fn(),
      setOrdersError: jest.fn(),
    });
  });

  it('renders dashboard header with user name', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Order Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, John Doe! Here are your organization\'s orders.')).toBeInTheDocument();
  });

  it('displays summary cards with correct statistics', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show 2 active orders
    expect(screen.getByText('2')).toBeInTheDocument(); // Total orders shown (active only)
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    
    // Should show 1 overdue order
    expect(screen.getByText('1')).toBeInTheDocument(); // Overdue count
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    
    // Should show total value of active orders ($8,500.00)
    expect(screen.getByText('$8,500.00')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
  });

  it('fetches orders on component mount', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(mockFetchOrders).toHaveBeenCalledWith('Active', undefined);
  });

  it('displays order cards for each order', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();
    expect(screen.getByText('CG-2023-002')).toBeInTheDocument();
    expect(screen.getByText('Spring Musical Costumes')).toBeInTheDocument();
    expect(screen.getByText('Winter Play Costumes')).toBeInTheDocument();
  });

  it('shows loading state when orders are being fetched', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      ordersLoading: true,
      orders: []
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when orders fetch fails', () => {
    const errorMessage = 'Failed to fetch orders';
    
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      ordersError: errorMessage,
      orders: []
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch orders').closest('.MuiAlert-root')).toHaveClass('MuiAlert-standardError');
  });

  it('handles status filter changes', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const statusFilter = screen.getByLabelText('Status Filter');
    fireEvent.mouseDown(statusFilter);
    
    const allOption = screen.getByText('All Orders');
    fireEvent.click(allOption);

    await waitFor(() => {
      expect(mockFetchOrders).toHaveBeenCalledWith(undefined, undefined);
      expect(mockClearOrdersError).toHaveBeenCalled();
    });
  });

  it('handles stage filter changes', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const stageFilter = screen.getByLabelText('Stage Filter');
    fireEvent.mouseDown(stageFilter);
    
    const measurementsOption = screen.getByText('Measurements');
    fireEvent.click(measurementsOption);

    await waitFor(() => {
      expect(mockFetchOrders).toHaveBeenCalledWith('Active', 'Measurements');
      expect(mockClearOrdersError).toHaveBeenCalled();
    });
  });

  it('shows empty state when no orders are found', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      orders: []
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.getByText("Your organization doesn't have any orders yet.")).toBeInTheDocument();
  });

  it('shows filtered empty state message when filters are applied', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      orders: []
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Change filter first
    const stageFilter = screen.getByLabelText('Stage Filter');
    fireEvent.mouseDown(stageFilter);
    
    const measurementsOption = screen.getByText('Measurements');
    fireEvent.click(measurementsOption);

    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.getByText('No orders match the current filters. Try adjusting your search criteria.')).toBeInTheDocument();
  });

  it('handles error alert dismissal', () => {
    const errorMessage = 'Network error';
    
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      ordersError: errorMessage
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockClearOrdersError).toHaveBeenCalled();
  });

  it('displays all available stage options in filter dropdown', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const stageFilter = screen.getByLabelText('Stage Filter');
    fireEvent.mouseDown(stageFilter);

    // Check for some key stages
    expect(screen.getByText('Initial Consultation')).toBeInTheDocument();
    expect(screen.getByText('Measurements')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('calculates summary statistics correctly with mixed order statuses', () => {
    // Mock all orders (including inactive)
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      orders: mockOrders // All orders
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show total of all orders
    expect(screen.getByText('3')).toBeInTheDocument(); // Total orders
    
    // Should calculate total value correctly ($11,000.00)
    expect(screen.getByText('$11,000.00')).toBeInTheDocument();
    
    // Should show 2 active orders
    const activeText = screen.getByText('2');
    expect(activeText).toBeInTheDocument();
  });

  it('handles order card clicks by logging order id', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Click on first order card
    const orderCard = screen.getByText('CG-2023-001').closest('.MuiCard-root');
    fireEvent.click(orderCard!);

    expect(consoleSpy).toHaveBeenCalledWith('Order selected:', '123e4567-e89b-12d3-a456-426614174000');

    consoleSpy.mockRestore();
  });

  it('renders responsive layout on mobile', () => {
    // Mock mobile breakpoint
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width:599.95px)', // xs breakpoint
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Component should render without errors on mobile
    expect(screen.getByText('Order Dashboard')).toBeInTheDocument();
  });
});