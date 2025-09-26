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
  contactPhone?: string;
  address?: string;
  shippingAddress?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationDetails extends Organization {
  totalOrders: number;
  activeOrders: number;
  totalOrderValue: number;
  lastOrderDate?: string;
}

export interface CreateOrganizationData {
  name: string;
  type: string;
  contactEmail: string;
  contactPhone?: string;
  address: string;
  shippingAddress?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  type?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  shippingAddress?: string;
}

export interface BulkImportResult {
  successCount: number;
  failureCount: number;
  failures: OrganizationImportFailure[];
  processingTime: number;
}

export interface OrganizationImportFailure {
  rowNumber: number;
  organizationName: string;
  error: string;
  validationErrors: string[];
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
   * Gets detailed organization information with statistics
   * @param {string} id - Organization ID
   * @returns {Promise<OrganizationDetails>} Detailed organization information
   *
   * @throws {Error} When fetching organization details fails
   *
   * @example
   * ```typescript
   * try {
   *   const details = await organizationService.getOrganizationDetails('12345');
   *   console.log('Total orders:', details.totalOrders);
   * } catch (error) {
   *   console.error('Failed to fetch organization details:', error.message);
   * }
   * ```
   */
  async getOrganizationDetails(id: string): Promise<OrganizationDetails> {
    try {
      const response = await this.apiClient.get<OrganizationDetails>(`/api/organizations/${id}/details`);

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
   * Creates a new organization
   * @param {CreateOrganizationData} data - Organization creation data
   * @returns {Promise<OrganizationDetails>} Created organization with details
   *
   * @throws {Error} When creating organization fails
   *
   * @example
   * ```typescript
   * try {
   *   const newOrg = await organizationService.createOrganization({
   *     name: 'Test School',
   *     type: 'school',
   *     contactEmail: 'test@school.edu',
   *     address: '123 Main St, City, State 12345'
   *   });
   *   console.log('Created organization:', newOrg.name);
   * } catch (error) {
   *   console.error('Failed to create organization:', error.message);
   * }
   * ```
   */
  async createOrganization(data: CreateOrganizationData): Promise<OrganizationDetails> {
    try {
      const response = await this.apiClient.post<OrganizationDetails>('/api/organizations', data);

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
   * Updates an existing organization
   * @param {string} id - Organization ID
   * @param {UpdateOrganizationData} data - Organization update data
   * @returns {Promise<OrganizationDetails>} Updated organization with details
   *
   * @throws {Error} When updating organization fails
   *
   * @example
   * ```typescript
   * try {
   *   const updatedOrg = await organizationService.updateOrganization('12345', {
   *     name: 'Updated School Name'
   *   });
   *   console.log('Updated organization:', updatedOrg.name);
   * } catch (error) {
   *   console.error('Failed to update organization:', error.message);
   * }
   * ```
   */
  async updateOrganization(id: string, data: UpdateOrganizationData): Promise<OrganizationDetails> {
    try {
      const response = await this.apiClient.put<OrganizationDetails>(`/api/organizations/${id}`, data);

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
   * Deactivates an organization (soft delete)
   * @param {string} id - Organization ID
   * @returns {Promise<void>}
   *
   * @throws {Error} When deactivating organization fails
   *
   * @example
   * ```typescript
   * try {
   *   await organizationService.deactivateOrganization('12345');
   *   console.log('Organization deactivated');
   * } catch (error) {
   *   console.error('Failed to deactivate organization:', error.message);
   * }
   * ```
   */
  async deactivateOrganization(id: string): Promise<void> {
    try {
      await this.apiClient.delete(`/api/organizations/${id}`);
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Bulk imports organizations from CSV data
   * @param {CreateOrganizationData[]} organizations - Array of organizations to import
   * @returns {Promise<BulkImportResult>} Import results with success/failure counts
   *
   * @throws {Error} When bulk import fails
   *
   * @example
   * ```typescript
   * try {
   *   const result = await organizationService.bulkImportOrganizations([
   *     { name: 'School 1', type: 'school', contactEmail: 'school1@edu', address: '123 Main St' }
   *   ]);
   *   console.log('Import completed:', result.successCount, 'successful');
   * } catch (error) {
   *   console.error('Bulk import failed:', error.message);
   * }
   * ```
   */
  async bulkImportOrganizations(organizations: CreateOrganizationData[]): Promise<BulkImportResult> {
    try {
      const response = await this.apiClient.post<BulkImportResult>('/api/organizations/bulk-import', {
        organizations
      });

      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error; // Re-throw for component handling
    }
  }

  /**
   * Exports organization data as CSV
   * @param {boolean} includeInactive - Include inactive organizations in export
   * @returns {Promise<Blob>} CSV file blob
   *
   * @throws {Error} When export fails
   *
   * @example
   * ```typescript
   * try {
   *   const csvBlob = await organizationService.exportOrganizations(false);
   *   const url = URL.createObjectURL(csvBlob);
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = 'organizations.csv';
   *   a.click();
   * } catch (error) {
   *   console.error('Export failed:', error.message);
   * }
   * ```
   */
  async exportOrganizations(includeInactive: boolean = false): Promise<Blob> {
    try {
      const response = await this.apiClient.get(`/api/organizations/export?includeInactive=${includeInactive}`, {
        responseType: 'blob'
      });

      return response.data;
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
        const errorMessage = error.response?.data?.message || 'Invalid request format.';
        throw new Error(errorMessage);
      case 401:
        throw new Error('Authentication required. Please log in again.');
      case 403:
        throw new Error('You don\'t have permission to access organizations.');
      case 404:
        throw new Error('Organization not found.');
      case 409:
        throw new Error('Organization with this name already exists.');
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