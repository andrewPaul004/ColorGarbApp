import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import adminService from '../../src/services/adminService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('AdminService', () => {
  const mockToken = 'mock-jwt-token';
  const API_BASE_URL = 'http://localhost:5001/api';

  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(mockToken);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAllOrders', () => {
    it('should fetch all orders with filters successfully', async () => {
      const mockResponse = {
        orders: [
          {
            id: 'order-1',
            orderNumber: 'CG-2025-001',
            description: 'Test Order 1',
            currentStage: 'Production Planning',
            originalShipDate: '2025-01-01T00:00:00Z',
            currentShipDate: '2025-01-01T00:00:00Z',
            totalAmount: 1000,
            paymentStatus: 'Pending',
            isActive: true,
            createdAt: '2025-08-25T00:00:00Z',
            updatedAt: '2025-08-25T00:00:00Z',
            organizationName: 'Test Theater',
            organizationId: 'org-1',
          },
        ],
        organizations: [
          {
            id: 'org-1',
            name: 'Test Theater',
            type: 'theater',
            contactEmail: 'test@theater.com',
            address: '123 Theater St',
            isActive: true,
            createdAt: '2025-08-25T00:00:00Z',
            updatedAt: '2025-08-25T00:00:00Z',
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 50,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const filters = {
        organizationId: 'org-1',
        status: 'Active',
        page: 1,
        pageSize: 50,
      };

      const result = await adminService.getAllOrders(filters);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/orders/admin/orders?organizationId=org-1&status=Active&page=1&pageSize=50`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
        }
      );

      expect(result.orders).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.orders[0].originalShipDate).toBeInstanceOf(Date);
      expect(result.organizations[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const filters = { page: 1, pageSize: 50 };

      await expect(adminService.getAllOrders(filters)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should handle authorization error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const filters = { page: 1, pageSize: 50 };

      await expect(adminService.getAllOrders(filters)).rejects.toThrow(
        'Access denied. You do not have admin permissions.'
      );
    });

    it('should handle general API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const filters = { page: 1, pageSize: 50 };

      await expect(adminService.getAllOrders(filters)).rejects.toThrow(
        'Failed to fetch admin orders: Internal Server Error'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const filters = { page: 1, pageSize: 50 };

      await expect(adminService.getAllOrders(filters)).rejects.toThrow('Network error');
    });

    it('should build query string correctly with all filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [],
          organizations: [],
          totalCount: 0,
          page: 2,
          pageSize: 25,
        }),
      });

      const filters = {
        organizationId: 'org-123',
        status: 'Completed',
        stage: 'Delivery',
        page: 2,
        pageSize: 25,
      };

      await adminService.getAllOrders(filters);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/orders/admin/orders?organizationId=org-123&status=Completed&stage=Delivery&page=2&pageSize=25`,
        expect.any(Object)
      );
    });
  });

  describe('updateOrderStage', () => {
    it('should update order stage successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const orderId = 'order-1';
      const updates = {
        stage: 'Production Planning',
        shipDate: '2025-01-15',
        reason: 'Client approved design',
      };

      await adminService.updateOrderStage(orderId, updates);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/orders/${orderId}/admin`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify(updates),
        }
      );
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid stage transition' }),
      });

      const orderId = 'order-1';
      const updates = {
        stage: 'Invalid Stage',
        reason: 'Test',
      };

      await expect(adminService.updateOrderStage(orderId, updates)).rejects.toThrow(
        'Invalid update: Invalid stage transition'
      );
    });

    it('should handle order not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const orderId = 'nonexistent-order';
      const updates = {
        stage: 'Production Planning',
        reason: 'Test',
      };

      await expect(adminService.updateOrderStage(orderId, updates)).rejects.toThrow(
        'Order not found.'
      );
    });
  });

  describe('bulkUpdateOrders', () => {
    it('should perform bulk update successfully', async () => {
      const mockResult = {
        successful: ['order-1', 'order-2'],
        failed: [
          {
            orderId: 'order-3',
            error: 'Invalid stage transition',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const updates = {
        orderIds: ['order-1', 'order-2', 'order-3'],
        stage: 'Quality Control',
        reason: 'Bulk progression to QC',
      };

      const result = await adminService.bulkUpdateOrders(updates);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/orders/admin/orders/bulk-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify(updates),
        }
      );

      expect(result.successful).toEqual(['order-1', 'order-2']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].orderId).toBe('order-3');
    });

    it('should handle bulk update validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'At least one order ID is required' }),
      });

      const updates = {
        orderIds: [],
        stage: 'Production Planning',
        reason: 'Test',
      };

      await expect(adminService.bulkUpdateOrders(updates)).rejects.toThrow(
        'Invalid bulk update request: At least one order ID is required'
      );
    });

    it('should handle bulk update authorization error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const updates = {
        orderIds: ['order-1'],
        stage: 'Production Planning',
        reason: 'Test',
      };

      await expect(adminService.bulkUpdateOrders(updates)).rejects.toThrow(
        'Access denied. You do not have admin permissions.'
      );
    });
  });

  describe('Authentication', () => {
    it('should throw error when no auth token is available', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const filters = { page: 1, pageSize: 50 };

      await expect(adminService.getAllOrders(filters)).rejects.toThrow(
        'No authentication token found. Please log in.'
      );
    });

    it('should use correct auth token from localStorage', async () => {
      const customToken = 'custom-jwt-token';
      mockLocalStorage.getItem.mockReturnValue(customToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orders: [],
          organizations: [],
          totalCount: 0,
          page: 1,
          pageSize: 50,
        }),
      });

      const filters = { page: 1, pageSize: 50 };
      await adminService.getAllOrders(filters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${customToken}`,
          }),
        })
      );
    });
  });
});