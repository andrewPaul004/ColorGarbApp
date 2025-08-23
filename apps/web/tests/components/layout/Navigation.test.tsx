import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../../../src/components/layout/Navigation';
import { useAppStore } from '../../../src/stores/appStore';

// Mock the store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock theme for Material-UI components
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

// Mock user data
const mockDirectorUser = {
  id: 'user-123',
  email: 'director@testschool.edu',
  name: 'John Director',
  role: 'Director',
  organizationId: 'org-456'
};

const mockFinanceUser = {
  id: 'user-789',
  email: 'finance@testschool.edu',
  name: 'Jane Finance',
  role: 'Finance',
  organizationId: 'org-456'
};

const mockStaffUser = {
  id: 'user-999',
  email: 'staff@colorgarb.com',
  name: 'ColorGarb Staff',
  role: 'ColorGarbStaff',
  organizationId: undefined
};

describe('Navigation Component', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseAppStore.mockReturnValue({
      user: mockDirectorUser,
      logout: mockLogout,
      // Add other required properties with default values
      orders: [],
      ordersLoading: false,
      ordersError: null,
      organization: null,
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      initializeAuth: jest.fn(),
      refreshToken: jest.fn(),
      setUser: jest.fn(),
      setOrganization: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      clearState: jest.fn(),
      fetchOrders: jest.fn(),
      fetchOrder: jest.fn(),
      setOrdersLoading: jest.fn(),
      setOrdersError: jest.fn(),
      clearOrdersError: jest.fn(),
    });
  });

  it('renders navigation with user information', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('ColorGarb')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument(); // Role chip
  });

  it('shows appropriate navigation items for Director role', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('shows limited navigation items for Finance role', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: mockFinanceUser,
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.queryByText('Organization')).not.toBeInTheDocument(); // Finance users don't see this
  });

  it('does not render when user is not authenticated', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: null,
    });

    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles navigation click events', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('opens profile menu when user avatar is clicked', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    const avatarButton = screen.getByLabelText('user account');
    fireEvent.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText('John Director')).toBeInTheDocument();
      expect(screen.getByText('director@testschool.edu')).toBeInTheDocument();
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('handles logout from profile menu', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Open profile menu
    const avatarButton = screen.getByLabelText('user account');
    fireEvent.click(avatarButton);

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
  });

  it('handles profile settings navigation', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Open profile menu
    const avatarButton = screen.getByLabelText('user account');
    fireEvent.click(avatarButton);

    await waitFor(() => {
      const profileButton = screen.getByText('Profile Settings');
      fireEvent.click(profileButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('displays user initials in avatar', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('JD')).toBeInTheDocument(); // John Director initials
  });

  it('handles single name users correctly', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: { ...mockDirectorUser, name: 'Administrator' },
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('A')).toBeInTheDocument(); // Single letter for single name
  });

  it('opens mobile drawer when menu button is clicked', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width:899.95px)', // md breakpoint
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
        <Navigation />
      </TestWrapper>
    );

    const menuButton = screen.getByLabelText('open drawer');
    fireEvent.click(menuButton);

    await waitFor(() => {
      // Should show mobile drawer content
      expect(screen.getAllByText('Dashboard')).toHaveLength(2); // One in drawer, one might be in desktop nav
    });
  });

  it('shows ColorGarb staff user correctly', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: mockStaffUser,
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    expect(screen.getByText('ColorGarbStaff')).toBeInTheDocument(); // Role chip
    expect(screen.getByText('CS')).toBeInTheDocument(); // ColorGarb Staff initials
  });

  it('filters navigation items based on organization requirement', () => {
    // User without organization should not see org-specific items
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: { ...mockDirectorUser, organizationId: undefined },
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Should not show any navigation items since they all require organization
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization')).not.toBeInTheDocument();
  });

  it('highlights active route correctly', () => {
    // Mock current location as /orders
    jest.mocked(require('react-router-dom').useLocation).mockReturnValue({
      pathname: '/orders'
    });

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Should apply active styling to Orders button
    const ordersButton = screen.getByText('Orders').closest('button');
    expect(ordersButton).toHaveStyle('background-color: rgba(255, 255, 255, 0.1)');
  });

  it('closes mobile drawer after navigation', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width:899.95px)',
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
        <Navigation />
      </TestWrapper>
    );

    // Open drawer
    const menuButton = screen.getByLabelText('open drawer');
    fireEvent.click(menuButton);

    await waitFor(async () => {
      // Click on navigation item in drawer
      const dashboardItems = screen.getAllByText('Dashboard');
      const drawerDashboard = dashboardItems[dashboardItems.length - 1]; // Get the last one (drawer)
      fireEvent.click(drawerDashboard);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles profile menu close on outside click', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    );

    // Open profile menu
    const avatarButton = screen.getByLabelText('user account');
    fireEvent.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });

    // Click outside to close menu (simulate by pressing escape)
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument();
    });
  });
});