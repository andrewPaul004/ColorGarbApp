/**
 * Organization service for managing organization data.
 * Provides methods for fetching and managing organizations.
 * 
 * @fileoverview Organization service with API integration
 * @since 1.0.0
 */
import axios, { type AxiosInstance, AxiosError } from 'axios';

export interface Organization {
  id: string;
  name: string;
  type: string;
  contactEmail: string;
}

interface OrganizationServiceConfig {
  baseURL: string;
  tokenStorageKey: string;
}

/**
 * Organization service class for managing organization data
 * Handles API communication for organization operations
 * 
 * @class OrganizationService
 * @since 1.0.0
 */
export class OrganizationService {
  private apiClient: AxiosInstance;
  private tokenStorageKey: string;

  /**
   * Creates an instance of OrganizationService
   * @param {OrganizationServiceConfig} config - Service configuration
   */
  constructor(config: OrganizationServiceConfig) {
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
          // Token might be expired, redirect to login
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retrieves stored authentication token
   * @returns {string | null} Stored token or null if not found
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenStorageKey);
  }

  /**
   * Gets all organizations (ColorGarb staff only)
   * @returns {Promise<Organization[]>} Array of organizations
   * 
   * @throws {Error} When fetching organizations fails
   * 
   * @example
   * ```typescript
   * try {
   *   const organizations = await organizationService.getAllOrganizations();
   *   console.log('Organizations:', organizations);
   * } catch (error) {
   *   console.error('Failed to fetch organizations:', error.message);
   * }
   * ```
   */
  async getAllOrganizations(): Promise<Organization[]> {
    try {
      const response = await this.apiClient.get<Organization[]>('/api/organizations');
      
      // Convert Guid ID to string
      return response.data.map(org => ({
        ...org,
        id: org.id.toString()
      }));
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Gets a specific organization by ID
   * @param {string} id - Organization ID
   * @returns {Promise<Organization>} Organization details
   * 
   * @throws {Error} When fetching organization fails or not found
   * 
   * @example
   * ```typescript
   * try {
   *   const organization = await organizationService.getOrganization('12345');
   *   console.log('Organization:', organization.name);
   * } catch (error) {
   *   console.error('Failed to fetch organization:', error.message);
   * }
   * ```
   */
  async getOrganization(id: string): Promise<Organization> {
    try {
      const response = await this.apiClient.get<Organization>(`/api/organizations/${id}`);
      
      // Convert Guid ID to string
      return {
        ...response.data,
        id: response.data.id.toString()
      };
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Handles API errors with user-friendly messages
   * @param {AxiosError} error - Axios error object
   * @throws {Error} Formatted error with user-friendly message
   */
  private handleError(error: AxiosError): never {
    if (!error.response) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    switch (error.response.status) {
      case 400:
        throw new Error('Invalid request format.');
      case 401:
        throw new Error('Authentication required. Please log in again.');
      case 403:
        throw new Error('You don\'t have permission to access organizations.');
      case 404:
        throw new Error('Organization not found.');
      case 429:
        throw new Error('Too many requests. Please try again later.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error('An error occurred while accessing organization data.');
    }
  }
}

// Create and export default organization service instance
const organizationService = new OrganizationService({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132',
  tokenStorageKey: 'colorgarb_auth_token'
});

export default organizationService;