import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, AuthTokenResponse, Order, OrderDetail } from '@colorgarb/shared';
import authService from '../services/authService';
import orderService from '../services/orderService';

/**
 * Global application state interface
 * @interface AppState
 */
interface AppState {
  /** Currently authenticated user */
  user: AuthTokenResponse['user'] | null;
  /** Current organization context */
  organization: Organization | null;
  /** Authentication token */
  token: string | null;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Global error message */
  error: string | null;
  
  // Orders State
  /** Current orders for the user's organization */
  orders: Order[];
  /** Loading state for orders */
  ordersLoading: boolean;
  /** Error message for orders operations */
  ordersError: string | null;
  
  // Authentication Actions
  /** Login action */
  login: (email: string, password: string) => Promise<void>;
  /** Logout action */
  logout: () => void;
  /** Initialize authentication state from stored token */
  initializeAuth: () => void;
  /** Refresh authentication token */
  refreshToken: () => Promise<void>;
  /** Update user profile */
  updateProfile: (profileData: { name?: string; email?: string }) => Promise<void>;
  
  // General Actions
  /** Set the current user */
  setUser: (user: AuthTokenResponse['user'] | null) => void;
  /** Set the current organization */
  setOrganization: (organization: Organization | null) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Clear authentication error */
  clearError: () => void;
  /** Clear all state */
  clearState: () => void;
  
  // Orders Actions
  /** Fetch orders for the user's organization */
  fetchOrders: (status?: string, stage?: string) => Promise<void>;
  /** Fetch a specific order by ID with complete details */
  fetchOrder: (id: string) => Promise<OrderDetail>;
  /** Set orders loading state */
  setOrdersLoading: (loading: boolean) => void;
  /** Set orders error message */
  setOrdersError: (error: string | null) => void;
  /** Clear orders error */
  clearOrdersError: () => void;
}

/**
 * Global application store using Zustand with persistence
 * Manages user authentication, organization context, and global UI state
 * 
 * @returns {AppState} Application state and actions
 * 
 * @example
 * ```tsx
 * const { user, login, logout, isAuthenticated } = useAppStore();
 * 
 * // Login user
 * try {
 *   await login('user@example.com', 'password123');
 *   console.log('Login successful');
 * } catch (error) {
 *   console.error('Login failed:', error.message);
 * }
 * 
 * // Check authentication status
 * if (isAuthenticated && user) {
 *   console.log('User is authenticated:', user.name);
 * }
 * ```
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Orders State
      orders: [],
      ordersLoading: false,
      ordersError: null,

      // Authentication Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const authResponse = await authService.login(email, password);
          
          set({
            user: authResponse.user,
            token: authResponse.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      initializeAuth: () => {
        const token = authService.getStoredToken();
        const isAuthenticated = authService.isAuthenticated();
        
        if (token && isAuthenticated) {
          set({ 
            token, 
            isAuthenticated: true 
          });
        } else {
          // Clear any invalid stored state but preserve error messages
          set((state) => ({
            ...state,
            user: null,
            token: null,
            isAuthenticated: false
          }));
        }
      },

      refreshToken: async () => {
        set({ isLoading: true });
        
        try {
          const authResponse = await authService.refreshToken();
          
          set({
            user: authResponse.user,
            token: authResponse.accessToken,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Token refresh failed'
          });
          throw error;
        }
      },

      updateProfile: async (profileData: { name?: string; email?: string }) => {
        set({ isLoading: true, error: null });
        
        try {
          const authResponse = await authService.updateProfile(profileData);
          
          set({
            user: authResponse.user,
            token: authResponse.accessToken,
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Profile update failed'
          });
          throw error;
        }
      },

      // General Actions
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      clearState: () => set({
        user: null,
        organization: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        orders: [],
        ordersLoading: false,
        ordersError: null,
      }),

      // Orders Actions
      fetchOrders: async (status?: string, stage?: string) => {
        set({ ordersLoading: true, ordersError: null });
        
        try {
          const orders = await orderService.getOrders(status, stage);
          set({
            orders,
            ordersLoading: false,
            ordersError: null,
          });
        } catch (error) {
          set({
            orders: [],
            ordersLoading: false,
            ordersError: error instanceof Error ? error.message : 'Failed to fetch orders',
          });
          throw error;
        }
      },

      fetchOrder: async (id: string): Promise<OrderDetail> => {
        set({ ordersError: null });
        
        try {
          const order = await orderService.getOrder(id);
          return order;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';
          set({ ordersError: errorMessage });
          throw error;
        }
      },

      setOrdersLoading: (ordersLoading: boolean) => set({ ordersLoading }),
      setOrdersError: (ordersError: string | null) => set({ ordersError }),
      clearOrdersError: () => set({ ordersError: null }),
    }),
    {
      name: 'colorgarb-app-store',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);