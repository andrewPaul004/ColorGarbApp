/**
 * Test suite for LoginPage component
 * Tests authentication form validation, submission, error handling, and user interactions
 * 
 * @fileoverview LoginPage component tests
 * @since 1.0.0
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

import LoginPage from '../../../src/pages/Auth/LoginPage';
import { useAppStore } from '../../../src/stores/appStore';

// Mock the app store
jest.mock('../../../src/stores/appStore');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

/**
 * Test wrapper component with required providers
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      token: null,
      organization: null,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
      refreshToken: jest.fn(),
      setUser: jest.fn(),
      setOrganization: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      clearError: mockClearError,
      clearState: jest.fn(),
    });
  });

  describe('Rendering', () => {
    test('renders login form with all required fields', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /ColorGarb Client Portal/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    });

    test('renders support contact information', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/need help/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /support@colorgarb.com/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('shows validation error for empty email', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test('shows validation error for empty password', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    test('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 't');

      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls login function with correct credentials on valid submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    test('navigates to dashboard on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('handles login failure gracefully', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Login should still be called
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
      });

      // Should not navigate on failure
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('shows loading state during login attempt', async () => {
      // Mock store to return loading state
      mockUseAppStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        token: null,
        organization: null,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        refreshToken: jest.fn(),
        setUser: jest.fn(),
        setOrganization: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearError: mockClearError,
        clearState: jest.fn(),
      });
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    test('disables form fields during loading', async () => {
      // Mock store to return loading state
      mockUseAppStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        token: null,
        organization: null,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        refreshToken: jest.fn(),
        setUser: jest.fn(),
        setOrganization: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearError: mockClearError,
        clearState: jest.fn(),
      });
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const forgotPasswordLink = screen.getByText(/forgot your password/i);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(forgotPasswordLink.closest('button')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    test('displays authentication error from store', () => {
      mockUseAppStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        token: null,
        organization: null,
        isLoading: false,
        error: 'Invalid email or password',
        login: mockLogin,
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        refreshToken: jest.fn(),
        setUser: jest.fn(),
        setOrganization: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearError: mockClearError,
        clearState: jest.fn(),
      });
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    test('allows user to dismiss error alert', async () => {
      const user = userEvent.setup();
      
      mockUseAppStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        token: null,
        organization: null,
        isLoading: false,
        error: 'Invalid email or password',
        login: mockLogin,
        logout: jest.fn(),
        initializeAuth: jest.fn(),
        refreshToken: jest.fn(),
        setUser: jest.fn(),
        setOrganization: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearError: mockClearError,
        clearState: jest.fn(),
      });
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    test('navigates to forgot password page when link is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      await user.click(forgotPasswordLink);

      expect(mockNavigate).toHaveBeenCalledWith('/auth/forgot-password');
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels and aria attributes', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('required');
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toHaveAttribute('required');
    });

    test('focuses email input on load', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveFocus();
    });
  });
});