import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminStore } from '../../src/stores/adminStore';
import adminService from '../../src/services/adminService';

// Mock the admin service
vi.mock('../../src/services/adminService');
const mockedAdminService = vi.mocked(adminService);

describe('useAdminStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const { result } = renderHook(() => useAdminStore());
    act(() => {
      result.current.resetAdminState();
    });
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAdminStore());
      
      expect(result.current.orders).toEqual([]);
      expect(result.current.organizations).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.selectedOrderIds).toEqual([]);
      expect(result.current.ordersLoading).toBe(false);
      expect(result.current.updateLoading).toBe(false);
      expect(result.current.bulkUpdateLoading).toBe(false);
      expect(result.current.ordersError).toBe(null);
      expect(result.current.updateError).toBe(null);
      expect(result.current.successMessage).toBe(null);
    });

    it('should have correct initial filters', () => {
      const { result } = renderHook(() => useAdminStore());
      
      expect(result.current.filters).toEqual({
        page: 1,
        pageSize: 50,
        status: 'Active',
      });
    });
  });

  describe('fetchAllOrders', () => {
    it('should fetch orders successfully', async () => {
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
            type: 'theater' as const,
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

      mockedAdminService.getAllOrders.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        await result.current.fetchAllOrders();
      });

      expect(result.current.ordersLoading).toBe(false);
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.ordersError).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch orders';
      mockedAdminService.getAllOrders.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        try {
          await result.current.fetchAllOrders();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.ordersLoading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(result.current.ordersError).toBe(errorMessage);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockedAdminService.getAllOrders.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useAdminStore());

      act(() => {
        result.current.fetchAllOrders();
      });

      expect(result.current.ordersLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          orders: [],
          organizations: [],
          totalCount: 0,
          page: 1,
          pageSize: 50,
        });
        await promise;
      });

      expect(result.current.ordersLoading).toBe(false);
    });
  });

  describe('updateFilters', () => {
    it('should update filters and fetch orders', async () => {
      mockedAdminService.getAllOrders.mockResolvedValue({
        orders: [],
        organizations: [],
        totalCount: 0,
        page: 1,
        pageSize: 25,
      });

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        await result.current.updateFilters({ pageSize: 25, organizationId: 'org-1' });
      });

      expect(result.current.filters.pageSize).toBe(25);
      expect(result.current.filters.organizationId).toBe('org-1');
      expect(result.current.filters.page).toBe(1); // Should reset to page 1
      expect(mockedAdminService.getAllOrders).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
        status: 'Active',
        organizationId: 'org-1',
      });
    });

    it('should clear selections when filters change', async () => {
      mockedAdminService.getAllOrders.mockResolvedValue({
        orders: [],
        organizations: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
      });

      const { result } = renderHook(() => useAdminStore());

      // Set some selections first
      act(() => {
        result.current.toggleOrderSelection('order-1');
        result.current.toggleOrderSelection('order-2');
      });

      expect(result.current.selectedOrderIds).toEqual(['order-1', 'order-2']);

      // Update filters should clear selections
      await act(async () => {
        await result.current.updateFilters({ status: 'Completed' });
      });

      expect(result.current.selectedOrderIds).toEqual([]);
    });
  });

  describe('updateOrderStage', () => {
    it('should update order stage successfully', async () => {
      mockedAdminService.updateOrderStage.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAdminStore());

      // Set initial orders
      act(() => {
        result.current.orders = [
          {
            id: 'order-1',
            orderNumber: 'CG-2025-001',
            description: 'Test Order',
            currentStage: 'Initial Consultation',
            originalShipDate: new Date('2025-01-01'),
            currentShipDate: new Date('2025-01-01'),
            totalAmount: 1000,
            paymentStatus: 'Pending',
            isActive: true,
            createdAt: new Date('2025-08-25'),
            updatedAt: new Date('2025-08-25'),
            organizationName: 'Test Theater',
            organizationId: 'org-1',
            notes: undefined,
          },
        ];
      });

      await act(async () => {
        await result.current.updateOrderStage('order-1', {
          stage: 'Production Planning',
          reason: 'Test update',
        });
      });

      expect(mockedAdminService.updateOrderStage).toHaveBeenCalledWith('order-1', {
        stage: 'Production Planning',
        reason: 'Test update',
      });

      // Check that the order was updated in state
      const updatedOrder = result.current.orders.find(o => o.id === 'order-1');
      expect(updatedOrder?.currentStage).toBe('Production Planning');
      expect(result.current.updateLoading).toBe(false);
      expect(result.current.updateError).toBe(null);
      expect(result.current.successMessage).toBe('Order updated successfully');
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Invalid stage transition';
      mockedAdminService.updateOrderStage.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        try {
          await result.current.updateOrderStage('order-1', {
            stage: 'Invalid Stage',
            reason: 'Test update',
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.updateLoading).toBe(false);
      expect(result.current.updateError).toBe(errorMessage);
    });
  });

  describe('Selection Management', () => {
    it('should toggle order selection', () => {
      const { result } = renderHook(() => useAdminStore());

      act(() => {
        result.current.toggleOrderSelection('order-1');
      });

      expect(result.current.selectedOrderIds).toEqual(['order-1']);
      expect(result.current.isOrderSelected('order-1')).toBe(true);

      act(() => {
        result.current.toggleOrderSelection('order-1');
      });

      expect(result.current.selectedOrderIds).toEqual([]);
      expect(result.current.isOrderSelected('order-1')).toBe(false);
    });

    it('should select all orders', () => {
      const { result } = renderHook(() => useAdminStore());

      // Set some orders
      act(() => {
        result.current.orders = [
          { id: 'order-1' } as any,
          { id: 'order-2' } as any,
          { id: 'order-3' } as any,
        ];
      });

      act(() => {
        result.current.selectAllOrders();
      });

      expect(result.current.selectedOrderIds).toEqual(['order-1', 'order-2', 'order-3']);
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useAdminStore());

      act(() => {
        result.current.toggleOrderSelection('order-1');
        result.current.toggleOrderSelection('order-2');
      });

      expect(result.current.selectedOrderIds).toHaveLength(2);

      act(() => {
        result.current.clearOrderSelection();
      });

      expect(result.current.selectedOrderIds).toEqual([]);
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk update successfully', async () => {
      const mockBulkResult = {
        successful: ['order-1', 'order-2'],
        failed: [],
      };

      mockedAdminService.bulkUpdateOrders.mockResolvedValueOnce(mockBulkResult);

      const { result } = renderHook(() => useAdminStore());

      // Set selections and orders
      act(() => {
        result.current.selectedOrderIds = ['order-1', 'order-2'];
        result.current.orders = [
          { id: 'order-1', currentStage: 'Initial Consultation' } as any,
          { id: 'order-2', currentStage: 'Initial Consultation' } as any,
        ];
      });

      const bulkResult = await act(async () => {
        return await result.current.bulkUpdateOrders({
          stage: 'Production Planning',
          reason: 'Bulk update test',
        });
      });

      expect(bulkResult.successful).toEqual(['order-1', 'order-2']);
      expect(result.current.selectedOrderIds).toEqual([]); // Should clear after bulk update
      expect(result.current.bulkUpdateLoading).toBe(false);
      expect(result.current.successMessage).toBe('Bulk update completed: 2 successful, 0 failed');
    });

    it('should handle bulk update with no selections', async () => {
      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        try {
          await result.current.bulkUpdateOrders({
            stage: 'Production Planning',
            reason: 'Test',
          });
        } catch (error) {
          expect(error).toEqual(new Error('No orders selected for bulk update'));
        }
      });
    });
  });

  describe('Message Management', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useAdminStore());

      act(() => {
        result.current.setOrdersError('Orders error');
        result.current.setUpdateError('Update error');
        result.current.setSuccessMessage('Success message');
      });

      expect(result.current.ordersError).toBe('Orders error');
      expect(result.current.updateError).toBe('Update error');
      expect(result.current.successMessage).toBe('Success message');

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.ordersError).toBe(null);
      expect(result.current.updateError).toBe(null);
      expect(result.current.successMessage).toBe(null);
    });

    it('should set individual messages', () => {
      const { result } = renderHook(() => useAdminStore());

      act(() => {
        result.current.setOrdersError('Orders error');
        result.current.setUpdateError('Update error');
        result.current.setSuccessMessage('Success message');
      });

      expect(result.current.ordersError).toBe('Orders error');
      expect(result.current.updateError).toBe('Update error');
      expect(result.current.successMessage).toBe('Success message');
    });
  });
});