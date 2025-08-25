import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization } from '../types/shared';
import adminService from '../services/adminService';
import type {
  AdminOrder,
  AdminOrdersFilter,
  AdminOrdersResponse,
  UpdateOrderStageRequest,
  BulkUpdateRequest,
  BulkUpdateResponse,
} from '../services/adminService';

/**
 * Admin-specific state interface for managing cross-organization orders
 * @interface AdminState
 */
interface AdminState {
  // Orders Data
  /** All orders across organizations for admin view */
  orders: AdminOrder[];
  /** List of all active organizations for filtering */
  organizations: Organization[];
  /** Current filter and pagination settings */
  filters: AdminOrdersFilter;
  /** Total count of orders matching current filters */
  totalCount: number;
  /** Currently selected order IDs for bulk operations */
  selectedOrderIds: string[];
  
  // UI State
  /** Loading state for orders fetch operations */
  ordersLoading: boolean;
  /** Loading state for order update operations */
  updateLoading: boolean;
  /** Loading state for bulk update operations */
  bulkUpdateLoading: boolean;
  /** Error message for orders operations */
  ordersError: string | null;
  /** Error message for update operations */
  updateError: string | null;
  /** Success message for completed operations */
  successMessage: string | null;
  
  // Data Actions
  /** Fetch all orders with current filters */
  fetchAllOrders: () => Promise<void>;
  /** Update orders with new filters and fetch data */
  updateFilters: (newFilters: Partial<AdminOrdersFilter>) => Promise<void>;
  /** Refresh current orders data */
  refreshOrders: () => Promise<void>;
  
  // Order Management Actions
  /** Update a single order's stage and/or ship date */
  updateOrderStage: (orderId: string, updates: UpdateOrderStageRequest) => Promise<void>;
  /** Perform bulk updates on selected orders */
  bulkUpdateOrders: (updates: Omit<BulkUpdateRequest, 'orderIds'>) => Promise<BulkUpdateResponse>;
  /** Update an order in the local state after successful API call */
  updateOrderInState: (orderId: string, updates: Partial<AdminOrder>) => void;
  
  // Selection Actions
  /** Toggle selection of a single order */
  toggleOrderSelection: (orderId: string) => void;
  /** Select all visible orders */
  selectAllOrders: () => void;
  /** Clear all order selections */
  clearOrderSelection: () => void;
  /** Check if an order is currently selected */
  isOrderSelected: (orderId: string) => boolean;
  
  // UI State Actions
  /** Set orders loading state */
  setOrdersLoading: (loading: boolean) => void;
  /** Set update loading state */
  setUpdateLoading: (loading: boolean) => void;
  /** Set bulk update loading state */
  setBulkUpdateLoading: (loading: boolean) => void;
  /** Set orders error message */
  setOrdersError: (error: string | null) => void;
  /** Set update error message */
  setUpdateError: (error: string | null) => void;
  /** Set success message */
  setSuccessMessage: (message: string | null) => void;
  /** Clear all error and success messages */
  clearMessages: () => void;
  /** Reset admin state to initial values */
  resetAdminState: () => void;
}

/**
 * Initial filter state for admin orders
 */
const initialFilters: AdminOrdersFilter = {
  page: 1,
  pageSize: 50,
  status: 'Active', // Default to active orders only
};

/**
 * Admin store for managing ColorGarbStaff-specific operations
 * Handles cross-organization order management, filtering, and bulk operations
 * 
 * @returns {AdminState} Admin state and actions
 * 
 * @example
 * ```tsx
 * const { 
 *   orders, 
 *   fetchAllOrders, 
 *   updateOrderStage,
 *   bulkUpdateOrders,
 *   selectedOrderIds,
 *   toggleOrderSelection
 * } = useAdminStore();
 * 
 * // Fetch admin orders
 * useEffect(() => {
 *   fetchAllOrders();
 * }, [fetchAllOrders]);
 * 
 * // Update order stage
 * const handleStageUpdate = async (orderId: string) => {
 *   try {
 *     await updateOrderStage(orderId, {
 *       stage: 'Production Planning',
 *       reason: 'Ready for production'
 *     });
 *   } catch (error) {
 *     console.error('Update failed:', error);
 *   }
 * };
 * ```
 */
export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // Initial State
      orders: [],
      organizations: [],
      filters: initialFilters,
      totalCount: 0,
      selectedOrderIds: [],
      
      ordersLoading: false,
      updateLoading: false,
      bulkUpdateLoading: false,
      ordersError: null,
      updateError: null,
      successMessage: null,

      // Data Actions
      fetchAllOrders: async () => {
        const state = get();
        set({ ordersLoading: true, ordersError: null });

        try {
          const response: AdminOrdersResponse = await adminService.getAllOrders(state.filters);
          
          set({
            orders: response.orders,
            organizations: response.organizations,
            totalCount: response.totalCount,
            ordersLoading: false,
            ordersError: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
          set({
            orders: [],
            organizations: [],
            totalCount: 0,
            ordersLoading: false,
            ordersError: errorMessage,
          });
          throw error;
        }
      },

      updateFilters: async (newFilters: Partial<AdminOrdersFilter>) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters };
        
        // Reset to page 1 when changing filters (except for page changes)
        if (!newFilters.page) {
          updatedFilters.page = 1;
        }

        set({ 
          filters: updatedFilters,
          selectedOrderIds: [], // Clear selections when filters change
        });

        // Fetch data with new filters
        await get().fetchAllOrders();
      },

      refreshOrders: async () => {
        await get().fetchAllOrders();
      },

      // Order Management Actions
      updateOrderStage: async (orderId: string, updates: UpdateOrderStageRequest) => {
        set({ updateLoading: true, updateError: null, successMessage: null });

        try {
          await adminService.updateOrderStage(orderId, updates);

          // Update the order in local state
          const state = get();
          const updatedOrders = state.orders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  currentStage: updates.stage,
                  currentShipDate: updates.shipDate ? new Date(updates.shipDate) : order.currentShipDate,
                  updatedAt: new Date(),
                }
              : order
          );

          set({
            orders: updatedOrders,
            updateLoading: false,
            updateError: null,
            successMessage: 'Order updated successfully',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update order';
          set({
            updateLoading: false,
            updateError: errorMessage,
          });
          throw error;
        }
      },

      bulkUpdateOrders: async (updates: Omit<BulkUpdateRequest, 'orderIds'>): Promise<BulkUpdateResponse> => {
        const state = get();
        const selectedIds = state.selectedOrderIds;

        if (selectedIds.length === 0) {
          throw new Error('No orders selected for bulk update');
        }

        set({ bulkUpdateLoading: true, updateError: null, successMessage: null });

        try {
          const bulkRequest: BulkUpdateRequest = {
            ...updates,
            orderIds: selectedIds,
          };

          const result = await adminService.bulkUpdateOrders(bulkRequest);

          // Update successful orders in local state
          if (result.successful.length > 0) {
            const updatedOrders = state.orders.map(order => {
              if (result.successful.includes(order.id)) {
                return {
                  ...order,
                  currentStage: updates.stage || order.currentStage,
                  currentShipDate: updates.shipDate ? new Date(updates.shipDate) : order.currentShipDate,
                  updatedAt: new Date(),
                };
              }
              return order;
            });

            set({ orders: updatedOrders });
          }

          const successCount = result.successful.length;
          const failureCount = result.failed.length;
          const successMsg = `Bulk update completed: ${successCount} successful, ${failureCount} failed`;

          set({
            bulkUpdateLoading: false,
            updateError: failureCount > 0 ? `${failureCount} orders failed to update` : null,
            successMessage: successMsg,
            selectedOrderIds: [], // Clear selections after bulk update
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk update';
          set({
            bulkUpdateLoading: false,
            updateError: errorMessage,
          });
          throw error;
        }
      },

      updateOrderInState: (orderId: string, updates: Partial<AdminOrder>) => {
        const state = get();
        const updatedOrders = state.orders.map(order =>
          order.id === orderId ? { ...order, ...updates } : order
        );
        set({ orders: updatedOrders });
      },

      // Selection Actions
      toggleOrderSelection: (orderId: string) => {
        const state = get();
        const isSelected = state.selectedOrderIds.includes(orderId);
        
        const newSelectedIds = isSelected
          ? state.selectedOrderIds.filter(id => id !== orderId)
          : [...state.selectedOrderIds, orderId];

        set({ selectedOrderIds: newSelectedIds });
      },

      selectAllOrders: () => {
        const state = get();
        const allOrderIds = state.orders.map(order => order.id);
        set({ selectedOrderIds: allOrderIds });
      },

      clearOrderSelection: () => {
        set({ selectedOrderIds: [] });
      },

      isOrderSelected: (orderId: string) => {
        return get().selectedOrderIds.includes(orderId);
      },

      // UI State Actions
      setOrdersLoading: (ordersLoading: boolean) => set({ ordersLoading }),
      setUpdateLoading: (updateLoading: boolean) => set({ updateLoading }),
      setBulkUpdateLoading: (bulkUpdateLoading: boolean) => set({ bulkUpdateLoading }),
      setOrdersError: (ordersError: string | null) => set({ ordersError }),
      setUpdateError: (updateError: string | null) => set({ updateError }),
      setSuccessMessage: (successMessage: string | null) => set({ successMessage }),

      clearMessages: () => set({
        ordersError: null,
        updateError: null,
        successMessage: null,
      }),

      resetAdminState: () => set({
        orders: [],
        organizations: [],
        filters: initialFilters,
        totalCount: 0,
        selectedOrderIds: [],
        ordersLoading: false,
        updateLoading: false,
        bulkUpdateLoading: false,
        ordersError: null,
        updateError: null,
        successMessage: null,
      }),
    }),
    {
      name: 'colorgarb-admin-store',
      partialize: (state) => ({
        filters: state.filters,
        // Don't persist orders, selections, or UI state - always fetch fresh data
      }),
    }
  )
);