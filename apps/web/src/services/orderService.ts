import type { Order, OrderDetail } from '../types/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/**
 * Service for managing costume order operations.
 * Handles API communication for retrieving and managing orders with proper authentication.
 * 
 * @since 1.0.0
 */
class OrderService {
  /**
   * Retrieves all active orders for the authenticated user's organization.
   * Automatically filtered by organization ID from JWT token.
   * 
   * @param status Optional filter by order status (Active, Completed, Cancelled)
   * @param stage Optional filter by current manufacturing stage
   * @returns Promise<Order[]> Array of orders for the user's organization
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {AuthorizationError} When user lacks permission to access orders
   * 
   * @example
   * ```typescript
   * const orderService = new OrderService();
   * 
   * // Get all active orders
   * const orders = await orderService.getOrders();
   * 
   * // Filter by status
   * const activeOrders = await orderService.getOrders('Active');
   * 
   * // Filter by stage
   * const measurementOrders = await orderService.getOrders(undefined, 'Measurements');
   * ```
   * 
   * @since 1.0.0
   */
  async getOrders(status?: string, stage?: string): Promise<Order[]> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (stage) params.append('stage', stage);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/orders${queryString ? `?${queryString}` : ''}`;

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
          throw new Error('Access denied. You do not have permission to view orders.');
        }
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const orders = await response.json();
      
      // Convert date strings to Date objects
      return orders.map((order: any) => ({
        ...order,
        originalShipDate: new Date(order.originalShipDate),
        currentShipDate: new Date(order.currentShipDate),
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Retrieves a specific order by ID with organization-based access control.
   * Users can only access orders that belong to their organization.
   * 
   * @param id Unique identifier of the order to retrieve
   * @returns Promise<Order> Order details if found and accessible
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {AuthorizationError} When user lacks permission to access the order
   * @throws {NotFoundError} When order is not found or not accessible
   * 
   * @example
   * ```typescript
   * const orderService = new OrderService();
   * 
   * try {
   *   const order = await orderService.getOrder('12345-67890');
   *   console.log('Order details:', order);
   * } catch (error) {
   *   if (error.message.includes('not found')) {
   *     console.error('Order not found or access denied');
   *   }
   * }
   * ```
   * 
   * @since 1.0.0
   */
  async getOrder(id: string): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
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
          throw new Error('Access denied. You do not have permission to view this order.');
        }
        if (response.status === 404) {
          throw new Error('Order not found or access denied.');
        }
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const order = await response.json();
      
      // Convert date strings to Date objects
      return {
        ...order,
        originalShipDate: new Date(order.originalShipDate),
        currentShipDate: new Date(order.currentShipDate),
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Retrieves detailed information for a specific order including organization data.
   * Provides complete order context for the order detail workspace view.
   * 
   * @param id Unique identifier of the order to retrieve detailed information for
   * @returns Promise<OrderDetail> Complete order details with organization information
   * 
   * @throws {Error} When API request fails or user is not authenticated
   * @throws {AuthorizationError} When user lacks permission to access the order
   * @throws {NotFoundError} When order is not found or not accessible
   * 
   * @example
   * ```typescript
   * const orderService = new OrderService();
   * 
   * try {
   *   const orderDetail = await orderService.getOrderDetail('12345-67890');
   *   console.log('Order details:', orderDetail);
   *   console.log('Organization:', orderDetail.organization.name);
   *   console.log('Available actions:', orderDetail.nextActions);
   * } catch (error) {
   *   if (error.message.includes('not found')) {
   *     console.error('Order not found or access denied');
   *   }
   * }
   * ```
   * 
   * @since 2.1.0
   */
  async getOrderDetail(id: string): Promise<OrderDetail> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
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
          throw new Error('Access denied. You do not have permission to view this order.');
        }
        if (response.status === 404) {
          throw new Error('Order not found or access denied.');
        }
        throw new Error(`Failed to fetch order detail: ${response.statusText}`);
      }

      const orderDetail = await response.json();
      
      // Convert date strings to Date objects
      return {
        ...orderDetail,
        originalShipDate: new Date(orderDetail.originalShipDate),
        currentShipDate: new Date(orderDetail.currentShipDate),
        createdAt: new Date(orderDetail.createdAt),
        updatedAt: new Date(orderDetail.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching order detail:', error);
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
export const orderService = new OrderService();
export default orderService;