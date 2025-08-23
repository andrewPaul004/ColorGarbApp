import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { UserProfile } from '../../../src/pages/Profile/UserProfile';
import { useAppStore } from '../../../src/stores/appStore';

// Mock the store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock theme for Material-UI components
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

// Mock user and organization data
const mockUser = {
  id: 'user-123',
  email: 'director@testschool.edu',
  name: 'John Director',
  role: 'Director',
  organizationId: 'org-456'
};

const mockOrganization = {
  id: 'org-456',
  name: 'Test High School Drama Department',
  type: 'school',
  contactEmail: 'contact@testschool.edu',
  contactPhone: '555-123-4567',
  address: '123 School St, Test City, TS 12345',
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-11-01')
};

const mockStaffUser = {
  id: 'staff-123',
  email: 'staff@colorgarb.com',
  name: 'ColorGarb Admin',
  role: 'ColorGarbStaff',
  organizationId: undefined
};

describe('UserProfile Component', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseAppStore.mockReturnValue({
      user: mockUser,
      organization: mockOrganization,
      logout: mockLogout,
      // Add other required properties with default values
      orders: [],
      ordersLoading: false,
      ordersError: null,
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

  it('renders user profile information correctly', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('John Director')).toBeInTheDocument();
    expect(screen.getByText('director@testschool.edu')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('displays user initials in avatar', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('JD')).toBeInTheDocument(); // John Director initials
  });

  it('shows organization information when user has organization', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('Test High School Drama Department')).toBeInTheDocument();
    expect(screen.getByText('school')).toBeInTheDocument();
    expect(screen.getByText('contact@testschool.edu')).toBeInTheDocument();
    expect(screen.getByText('org-456')).toBeInTheDocument();
  });

  it('does not show organization card for staff users', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: mockStaffUser,
      organization: null,
    });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    expect(screen.getByText('ColorGarb Staff')).toBeInTheDocument();
  });

  it('shows correct role information for different roles', () => {
    const financeUser = { ...mockUser, role: 'Finance' };
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: financeUser,
    });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('Finance User')).toBeInTheDocument();
    expect(screen.getByText('Access to financial and payment operations')).toBeInTheDocument();
  });

  it('enables edit mode when edit button is clicked', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const editButton = screen.getByLabelText('edit profile');
    fireEvent.click(editButton);

    // Should show form inputs
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('handles form input changes in edit mode', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Enter edit mode
    const editButton = screen.getByLabelText('edit profile');
    fireEvent.click(editButton);

    // Change name input
    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'John Updated Director' } });

    expect(nameInput.value).toBe('John Updated Director');
  });

  it('cancels edit mode when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Enter edit mode
    const editButton = screen.getByLabelText('edit profile');
    fireEvent.click(editButton);

    // Modify input
    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Modified Name' } });

    // Cancel edit
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should reset to original data and exit edit mode
    expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument();
    expect(screen.getByText('John Director')).toBeInTheDocument(); // Original name
  });

  it('handles form submission in edit mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Enter edit mode
    const editButton = screen.getByLabelText('edit profile');
    fireEvent.click(editButton);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should log form data and exit edit mode
    expect(consoleSpy).toHaveBeenCalledWith('Profile update:', {
      name: 'John Director',
      email: 'director@testschool.edu'
    });

    expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('disables email field in edit mode', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Enter edit mode
    const editButton = screen.getByLabelText('edit profile');
    fireEvent.click(editButton);

    const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
    expect(emailInput).toBeDisabled();
  });

  it('opens logout confirmation dialog when logout button is clicked', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(screen.getByText('Confirm Logout')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to log out/)).toBeInTheDocument();
  });

  it('cancels logout when cancel is clicked in confirmation dialog', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Open logout dialog
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Cancel logout
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Dialog should close
    expect(screen.queryByText('Confirm Logout')).not.toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('performs logout when confirmed in dialog', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Open logout dialog
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Confirm logout
    const confirmButton = screen.getAllByText('Logout')[1]; // Second "Logout" button in dialog
    fireEvent.click(confirmButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
  });

  it('shows error message when user is not found', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: null,
    });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('User not found. Please log in again.')).toBeInTheDocument();
  });

  it('handles single name users correctly for initials', () => {
    const singleNameUser = { ...mockUser, name: 'Administrator' };
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      user: singleNameUser,
    });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('A')).toBeInTheDocument(); // Single initial
  });

  it('shows correct chip colors for different roles', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    const roleChip = screen.getByText('Director').closest('.MuiChip-root');
    expect(roleChip).toHaveClass('MuiChip-colorPrimary');
  });

  it('shows organization type with proper capitalization', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Organization type should be capitalized in the chip
    const typeChip = screen.getByText('school').closest('.MuiChip-root');
    expect(typeChip).toHaveStyle('text-transform: capitalize');
  });

  it('handles missing organization data gracefully', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      organization: null, // No organization data
    });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText('Organization Name')).toBeInTheDocument(); // Fallback name
    expect(screen.getByText('Not available')).toBeInTheDocument(); // Fallback contact email
  });

  it('renders responsive layout correctly', () => {
    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    // Check that main sections are present
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Account Actions')).toBeInTheDocument();
    
    // Should show information alert about logout
    expect(screen.getByText(/Logging out will end your current session/)).toBeInTheDocument();
  });
});