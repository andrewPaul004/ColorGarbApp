/**
 * Authentication service for handling login, logout, and token management.
 * Provides centralized authentication logic with proper error handling.
 * 
 * @fileoverview Authentication service with JWT token handling
 * @since 1.0.0
 */
import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { 
  LoginRequest, 
  AuthTokenResponse, 
  PasswordResetRequest,
  PasswordResetConfirmation 
} from '../types/shared';

interface AuthServiceConfig {
  baseURL: string;
  tokenStorageKey: string;
}

/**
 * Authentication service class for managing user authentication
 * Handles login, logout, token storage, and API communication
 * 
 * @class AuthService
 * @since 1.0.0
 */
export class AuthService {
  private apiClient: AxiosInstance;
  private tokenStorageKey: string;

  /**
   * Creates an instance of AuthService
   * @param {AuthServiceConfig} config - Service configuration
   */
  constructor(config: AuthServiceConfig) {
    this.tokenStorageKey = config.tokenStorageKey;
    
    // Create axios instance with base configuration
    this.apiClient = axios.create({
      baseURL: config.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup request interceptor to add auth token
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Setup response interceptor to handle 401 errors
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearStoredToken();
          // Only redirect to login page if we're not already on login/auth pages
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticates user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<AuthTokenResponse>} Authentication response with token and user data
   * 
   * @throws {Error} When authentication fails or network error occurs
   * 
   * @example
   * ```typescript
   * try {
   *   const authData = await authService.login('user@example.com', 'password123');
   *   console.log('Login successful:', authData.user.name);
   * } catch (error) {
   *   console.error('Login failed:', error.message);
   * }
   * ```
   */
  async login(email: string, password: string): Promise<AuthTokenResponse> {
    try {
      const loginData: LoginRequest = { email, password };
      
      const response = await this.apiClient.post<AuthTokenResponse>('/api/auth/login', loginData);
      
      // Store token in localStorage
      this.storeToken(response.data.accessToken);
      
      return response.data;
    } catch (error) {
      this.handleAuthError(error as AxiosError);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Logs out the current user by clearing stored tokens
   * @returns {void}
   * 
   * @example
   * ```typescript
   * authService.logout();
   * // User is now logged out, token cleared
   * ```
   */
  logout(): void {
    this.clearStoredToken();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }

  /**
   * Initiates password reset process by sending reset email
   * @param {string} email - Email address for password reset
   * @returns {Promise<void>} Resolves when reset email is sent
   * 
   * @throws {Error} When email sending fails or user not found
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.requestPasswordReset('user@example.com');
   *   console.log('Password reset email sent');
   * } catch (error) {
   *   console.error('Reset request failed:', error.message);
   * }
   * ```
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const resetData: PasswordResetRequest = { email };
      
      await this.apiClient.post('/api/auth/forgot-password', resetData);
    } catch (error) {
      this.handleAuthError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Confirms password reset with token and new password
   * @param {string} token - Password reset token from email
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Promise<void>} Resolves when password is successfully reset
   * 
   * @throws {Error} When token is invalid or passwords don't match
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.confirmPasswordReset('reset-token', 'newPass123', 'newPass123');
   *   console.log('Password reset successful');
   * } catch (error) {
   *   console.error('Password reset failed:', error.message);
   * }
   * ```
   */
  async confirmPasswordReset(
    token: string, 
    newPassword: string, 
    confirmPassword: string
  ): Promise<void> {
    try {
      const resetData: PasswordResetConfirmation = {
        token,
        newPassword,
        confirmPassword
      };
      
      await this.apiClient.post('/api/auth/reset-password', resetData);
    } catch (error) {
      this.handleAuthError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Refreshes the current authentication token
   * @returns {Promise<AuthTokenResponse>} New authentication data
   * 
   * @throws {Error} When token refresh fails
   * 
   * @example
   * ```typescript
   * try {
   *   const newAuthData = await authService.refreshToken();
   *   console.log('Token refreshed successfully');
   * } catch (error) {
   *   console.error('Token refresh failed:', error.message);
   *   // User will be redirected to login
   * }
   * ```
   */
  async refreshToken(): Promise<AuthTokenResponse> {
    try {
      const response = await this.apiClient.post<AuthTokenResponse>('/api/auth/refresh');
      
      // Store new token
      this.storeToken(response.data.accessToken);
      
      return response.data;
    } catch (error) {
      this.handleAuthError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Retrieves stored authentication token
   * @returns {string | null} Stored token or null if not found
   */
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenStorageKey);
  }

  /**
   * Checks if user is currently authenticated
   * @returns {boolean} True if user has valid token
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;

    // Check if token is expired
    try {
      const payload = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp != null && payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Decodes JWT token to extract payload
   * @param {string} token - JWT token to decode
   * @returns {object} Decoded token payload
   * 
   * @throws {Error} When token format is invalid
   */
  private decodeToken(token: string): { exp?: number; [key: string]: unknown } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  }

  /**
   * Stores authentication token in localStorage
   * @param {string} token - Token to store
   */
  private storeToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenStorageKey, token);
    }
  }

  /**
   * Clears stored authentication token
   */
  private clearStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenStorageKey);
    }
  }

  /**
   * Updates user profile information
   * @param {object} profileData - Profile update data
   * @returns {Promise<AuthTokenResponse>} Updated user data
   * 
   * @throws {Error} When profile update fails
   * 
   * @example
   * ```typescript
   * try {
   *   const updatedUser = await authService.updateProfile({ name: 'New Name' });
   *   console.log('Profile updated:', updatedUser.user.name);
   * } catch (error) {
   *   console.error('Profile update failed:', error.message);
   * }
   * ```
   */
  async updateProfile(profileData: { name?: string; email?: string }): Promise<AuthTokenResponse> {
    try {
      const response = await this.apiClient.put<AuthTokenResponse>('/api/users/profile', profileData);
      
      // Store updated token if returned
      if (response.data.accessToken) {
        this.storeToken(response.data.accessToken);
      }
      
      return response.data;
    } catch (error) {
      this.handleAuthError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Handles authentication errors with user-friendly messages
   * @param {AxiosError} error - Axios error object
   * @throws {Error} Formatted error with user-friendly message
   */
  private handleAuthError(error: AxiosError): never {
    if (!error.response) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    switch (error.response.status) {
      case 400:
        throw new Error('Invalid email or password format.');
      case 401:
        throw new Error('Invalid email or password.');
      case 403:
        throw new Error('Account is locked. Please contact support.');
      case 404:
        throw new Error('User not found.');
      case 429:
        throw new Error('Too many login attempts. Please try again later.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error('Authentication failed. Please try again.');
    }
  }
}

// Create and export default auth service instance
const authService = new AuthService({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001',
  tokenStorageKey: 'colorgarb_auth_token'
});

export default authService;