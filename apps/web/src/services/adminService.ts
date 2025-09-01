import type { Order, Organization } from '../types/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132';

/**
 * Admin-specific data transfer objects that match the backend DTOs
 */
export interface AdminOrder extends Order {
  organizationId: string;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  organizations: Organization[];
}

export interface UpdateOrderStageRequest {
  stage: string;
  shipDate?: string;
  reason: string;
}

export interface BulkUpdateRequest {
  orderIds: string[];
  stage?: string;
  shipDate?: string;
  reason: string;
}

export interface BulkUpdateResponse {
  successful: string[];
  failed: BulkUpdateFailure[];
}

export interface BulkUpdateFailure {
  orderId: string;
  error: string;
}

/**
 * Admin filters for order listing
 */
export interface AdminOrdersFilter {
  organizationId?: string;
  status?: string;
  stage?: string;
  page: number;
  pageSize: number;
}

/**
 * Service for admin-specific operations.
 * Handles cross-organization order management and bulk operations.
 * Only accessible to ColorGarbStaff role users.
 * 
 * @since 2.4.0
 */
class AdminService {
  /**
   * Retrieves all orders across all organizations for admin users.
   * Supports filtering by organization, status, stage, and pagination.
   * 
   * @param filters Filter and pagination options
   * @returns Promise<AdminOrdersResponse> Paginated orders with organization data
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {AuthorizationError} When user lacks ColorGarbStaff permissions
   * 
   * @example
   * ```typescript
   * const adminService = new AdminService();
   * 
   * // Get all orders with pagination
   * const response = await adminService.getAllOrders({ page: 1, pageSize: 50 });
   * 
   * // Filter by organization
   * const orgOrders = await adminService.getAllOrders({
   *   organizationId: '123-456-789',
   *   page: 1,
   *   pageSize: 25
   * });
   * ```
   */
  async getAllOrders(filters: AdminOrdersFilter): Promise<AdminOrdersResponse> {
    try {
      const params = new URLSearchParams();
      if (filters.organizationId) params.append('organizationId', filters.organizationId);
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      params.append('page', filters.page.toString());
      params.append('pageSize', filters.pageSize.toString());

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/orders/admin/orders?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have admin permissions.');
        }
        throw new Error(`Failed to fetch admin orders: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert date strings to Date objects
      return {
        ...data,
        orders: data.orders.map((order: any) => ({
          ...order,
          originalShipDate: new Date(order.originalShipDate),
          currentShipDate: new Date(order.currentShipDate),
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
        })),
        organizations: data.organizations.map((org: any) => ({
          ...org,
          createdAt: new Date(org.createdAt),
          updatedAt: new Date(org.updatedAt),
        })),
      };
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      throw error;
    }
  }

  /**
   * Updates the manufacturing stage and/or ship date for a specific order.
   * Only accessible to admin users with proper validation.
   * 
   * @param orderId Unique identifier of the order to update
   * @param updates Stage and ship date update details with reason
   * @returns Promise<void> Resolves when update is successful
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {ValidationError} When stage transition is invalid
   * @throws {NotFoundError} When order is not found
   * 
   * @example
   * ```typescript
   * const adminService = new AdminService();
   * 
   * await adminService.updateOrderStage('order-123', {
   *   stage: 'Production Planning',
   *   shipDate: '2024-12-01',
   *   reason: 'Design approved, moving to production'
   * });
   * ```
   */
  async updateOrderStage(orderId: string, updates: UpdateOrderStageRequest): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have admin permissions.');
        }
        if (response.status === 404) {
          throw new Error('Order not found.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Invalid update: ${errorData.message}`);
        }
        throw new Error(`Failed to update order: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating order stage:', error);
      throw error;
    }
  }

  /**
   * Performs bulk updates on multiple orders simultaneously.
   * Returns results for both successful and failed operations.
   * 
   * @param updates Bulk update request with order IDs and changes
   * @returns Promise<BulkUpdateResponse> Results of bulk update operation
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {ValidationError} When bulk request is invalid
   * 
   * @example
   * ```typescript
   * const adminService = new AdminService();
   * 
   * const result = await adminService.bulkUpdateOrders({
   *   orderIds: ['order-1', 'order-2', 'order-3'],
   *   stage: 'Quality Control',
   *   reason: 'Moving orders to QC phase'
   * });
   * 
   * console.log(`Successfully updated: ${result.successful.length}`);
   * console.log(`Failed to update: ${result.failed.length}`);
   * ```
   */
  async bulkUpdateOrders(updates: BulkUpdateRequest): Promise<BulkUpdateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/admin/orders/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have admin permissions.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Invalid bulk update request: ${errorData.message}`);
        }
        throw new Error(`Failed to perform bulk update: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error performing bulk update:', error);
      throw error;
    }
  }

  /**
   * Gets the current authentication token from localStorage.
   * 
   * @returns Authentication token string
   * @throws {Error} When no authentication token is found
   * 
   * @private
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('colorgarb_auth_token');
    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }
    return token;
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;