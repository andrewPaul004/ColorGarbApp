import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserRole } from '@colorgarb/shared';
import ProtectedRoute from '../../../src/components/common/ProtectedRoute';
import { withRoleProtection } from '../../../src/components/common/withRoleProtection';
import { useAppStore } from '../../../src/stores/appStore';

// Mock the app store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock navigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to }: { to: string }) => {
    mockNavigate(to);
    return <div data-testid="navigate" data-to={to} />;
  },
  useLocation: () => ({ pathname: '/test' })
}));

/**
 * Test wrapper component
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

/**
 * Mock child component for testing
 */
const MockChild = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Authentication checks', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
        token: null,
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/auth/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render children when user is authenticated and no role required', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'Director',
          organizationId: 'org-1'
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('Role-based access control', () => {
    const mockDirectorUser = {
      id: '1',
      email: 'director@example.com',
      name: 'Director User',
      role: 'Director' as const,
      organizationId: 'org-1'
    };

    const mockFinanceUser = {
      id: '2',
      email: 'finance@example.com',
      name: 'Finance User',
      role: 'Finance' as const,
      organizationId: 'org-1'
    };

    const mockStaffUser = {
      id: '3',
      email: 'staff@colorgarb.com',
      name: 'Staff User',
      role: 'ColorGarbStaff' as const,
      organizationId: undefined
    };

    beforeEach(() => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockDirectorUser,
        token: 'mock-token',
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
        organization: null
      });
    });

    it('should allow Director access to Director-required routes', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.Director}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should allow Director access to Finance-required routes', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.Finance}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should deny Director access to ColorGarb staff routes', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.ColorGarbStaff}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should deny Finance access to Director-required routes', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockFinanceUser,
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.Director}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow ColorGarb staff access to all routes', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockStaffUser,
        token: 'mock-token',
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
        organization: null
      });

      // Test Director route access
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.Director}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('Organization-based access control', () => {
    const mockDirectorUser = {
      id: '1',
      email: 'director@example.com',
      name: 'Director User',
      role: 'Director' as const,
      organizationId: 'org-1'
    };

    const mockStaffUser = {
      id: '3',
      email: 'staff@colorgarb.com',
      name: 'Staff User',
      role: 'ColorGarbStaff' as const,
      organizationId: undefined
    };

    it('should allow access when user organization matches required organization', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockDirectorUser,
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute 
            requiredRole={UserRole.Director} 
            organizationId="org-1"
          >
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should deny access when user organization does not match required organization', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockDirectorUser,
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute 
            requiredRole={UserRole.Director} 
            organizationId="org-2"
          >
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow ColorGarb staff cross-organization access by default', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockStaffUser,
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute 
            requiredRole={UserRole.ColorGarbStaff} 
            organizationId="any-org"
          >
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should deny ColorGarb staff access when cross-organization is explicitly disabled', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: mockStaffUser,
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute 
            requiredRole={UserRole.ColorGarbStaff} 
            organizationId="any-org"
            allowCrossOrganization={false}
          >
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Default redirect behavior', () => {
    it('should redirect ColorGarb staff to admin dashboard by default', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'staff@colorgarb.com',
          name: 'Staff User',
          role: 'ColorGarbStaff' as const,
          organizationId: undefined
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.Director}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/admin/dashboard');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect Director and Finance users to dashboard by default', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'finance@example.com',
          name: 'Finance User',
          role: 'Finance' as const,
          organizationId: 'org-1'
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole={UserRole.ColorGarbStaff}>
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Custom redirects', () => {
    it('should redirect to custom path when provided', () => {
      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'Finance' as const,
          organizationId: 'org-1'
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedRoute 
            requiredRole={UserRole.ColorGarbStaff} 
            redirectTo="/custom-redirect"
          >
            <MockChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/custom-redirect');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Higher-order component withRoleProtection', () => {
    const TestComponent = () => <div data-testid="test-component">Test Component</div>;

    it('should wrap component with role protection', () => {
      const ProtectedComponent = withRoleProtection(TestComponent, UserRole.Director);

      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'director@example.com',
          name: 'Director User',
          role: 'Director' as const,
          organizationId: 'org-1'
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should deny access through HOC when role is insufficient', () => {
      const ProtectedComponent = withRoleProtection(TestComponent, UserRole.ColorGarbStaff);

      mockUseAppStore.mockReturnValue({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'finance@example.com',
          name: 'Finance User',
          role: 'Finance' as const,
          organizationId: 'org-1'
        },
        token: 'mock-token',
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
        organization: null
      });

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });
  });
});