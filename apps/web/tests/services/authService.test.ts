/**
 * Test suite for AuthService
 * Tests authentication service methods, token handling, and error scenarios
 * 
 * @fileoverview AuthService tests
 * @since 1.0.0
 */
import axios from 'axios';
import { AuthService } from '../../src/services/authService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
} as Storage;

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.location
delete (window as unknown as { location?: unknown }).location;
(window as unknown as { location: { href: string } }).location = { href: '' };

describe('AuthService', () => {
  let authService: AuthService;
  const mockAxiosInstance = {
    post: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as jest.Mocked<typeof axios>);

    authService = new AuthService({
      baseURL: 'http://localhost:3000',
      tokenStorageKey: 'test_token',
    });
  });

  describe('Constructor', () => {
    test('creates axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('sets up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockAuthResponse = {
      data: {
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'client',
          organizationId: 'org-123',
        },
      },
    };

    test('successfully logs in user with valid credentials', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockAuthResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('test_token', 'mock-jwt-token');
      expect(result).toEqual(mockAuthResponse.data);
    });

    test('throws error for invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(authService.login('test@example.com', 'wrong-password')).rejects.toThrow();
    });

    test('handles network error gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );
    });

    test('handles different HTTP error status codes', async () => {
      const testCases = [
        { status: 400, expectedMessage: 'Invalid email or password format.' },
        { status: 401, expectedMessage: 'Invalid email or password.' },
        { status: 403, expectedMessage: 'Account is locked. Please contact support.' },
        { status: 404, expectedMessage: 'User not found.' },
        { status: 429, expectedMessage: 'Too many login attempts. Please try again later.' },
        { status: 500, expectedMessage: 'Server error. Please try again later.' },
      ];

      for (const testCase of testCases) {
        mockAxiosInstance.post.mockRejectedValue({
          response: { status: testCase.status },
        });

        await expect(authService.login('test@example.com', 'password')).rejects.toThrow(
          testCase.expectedMessage
        );
      }
    });
  });

  describe('logout', () => {
    test('clears stored token and redirects to login', () => {
      authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_token');
      expect(window.location.href).toBe('/auth/login');
    });
  });

  describe('requestPasswordReset', () => {
    test('successfully requests password reset', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { message: 'Reset email sent' } });

      await expect(authService.requestPasswordReset('test@example.com')).resolves.toBeUndefined();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'test@example.com',
      });
    });

    test('handles password reset request error', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 404 },
      });

      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'User not found.'
      );
    });
  });

  describe('confirmPasswordReset', () => {
    test('successfully confirms password reset', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { message: 'Password reset successful' } });

      await expect(
        authService.confirmPasswordReset('reset-token', 'newPassword123', 'newPassword123')
      ).resolves.toBeUndefined();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
    });
  });

  describe('refreshToken', () => {
    const mockRefreshResponse = {
      data: {
        accessToken: 'new-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'client',
        },
      },
    };

    test('successfully refreshes token', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockRefreshResponse);

      const result = await authService.refreshToken();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test_token', 'new-jwt-token');
      expect(result).toEqual(mockRefreshResponse.data);
    });

    test('handles refresh token failure', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 401 },
      });

      await expect(authService.refreshToken()).rejects.toThrow();
    });
  });

  describe('getStoredToken', () => {
    test('returns stored token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-token');

      const token = authService.getStoredToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('test_token');
      expect(token).toBe('stored-token');
    });

    test('returns null when no token is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const token = authService.getStoredToken();

      expect(token).toBeNull();
    });

    test('returns null in non-browser environment', () => {
      // Simulate server-side environment
      const originalWindow = global.window;
      delete (global as unknown as { window?: unknown }).window;

      const token = authService.getStoredToken();

      expect(token).toBeNull();

      // Restore window
      (global as unknown as { window: typeof window }).window = originalWindow;
    });
  });

  describe('isAuthenticated', () => {
    test('returns true for valid non-expired token', () => {
      // Create a mock JWT token that expires in the future
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockToken = btoa(JSON.stringify({ exp: futureTimestamp }));
      const validJwt = `header.${mockToken}.signature`;

      localStorageMock.getItem.mockReturnValue(validJwt);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    test('returns false for expired token', () => {
      // Create a mock JWT token that has expired
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const mockToken = btoa(JSON.stringify({ exp: pastTimestamp }));
      const expiredJwt = `header.${mockToken}.signature`;

      localStorageMock.getItem.mockReturnValue(expiredJwt);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    test('returns false when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    test('returns false for malformed token', () => {
      localStorageMock.getItem.mockReturnValue('invalid-token-format');

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('Request Interceptor', () => {
    test('adds authorization header when token exists', () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      // Get the request interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const mockConfig = { headers: {} };
      const result = requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    test('does not add authorization header when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      // Get the request interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];

      const mockConfig = { headers: {} };
      const result = requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    test('clears token and redirects on 401 error', () => {
      // Get the response interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const mockError = {
        response: { status: 401 },
      };

      expect(() => errorHandler(mockError)).rejects.toEqual(mockError);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_token');
      expect(window.location.href).toBe('/auth/login');
    });

    test('passes through non-401 errors without clearing token', () => {
      // Get the response interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const mockError = {
        response: { status: 500 },
      };

      expect(() => errorHandler(mockError)).rejects.toEqual(mockError);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });
});