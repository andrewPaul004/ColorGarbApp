# Frontend Architecture

## Component Architecture

### Component Organization
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Input, Modal)
│   ├── forms/           # Form-specific components
│   ├── layout/          # Layout components (Header, Navigation)
│   └── timeline/        # Timeline-specific components
├── pages/               # Page-level components
│   ├── Dashboard/       # Main dashboard
│   ├── OrderDetail/     # Order detail workspace
│   ├── Measurements/    # Measurement collection
│   └── Auth/           # Authentication pages
├── hooks/               # Custom React hooks
├── services/           # API communication layer
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Component Template
```typescript
import React from 'react';
import { Box, Typography } from '@mui/material';

interface OrderTimelineProps {
  orderId: string;
  currentStage: OrderStage;
  stageHistory: StageHistory[];
  onStageClick?: (stage: OrderStage) => void;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  orderId,
  currentStage,
  stageHistory,
  onStageClick
}) => {
  const stages = [
    'DesignProposal', 'ProofApproval', 'Measurements', 'ProductionPlanning',
    'Cutting', 'Sewing', 'QualityControl', 'Finishing',
    'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'
  ] as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Order Progress</Typography>
      {stages.map((stage, index) => (
        <TimelineStage
          key={stage}
          stage={stage}
          isCurrent={stage === currentStage}
          isCompleted={stages.indexOf(currentStage) > index}
          history={stageHistory.find(h => h.stage === stage)}
          onClick={() => onStageClick?.(stage)}
        />
      ))}
    </Box>
  );
};

export default OrderTimeline;
```

## State Management Architecture

### State Structure
```typescript
// Global app state using Zustand
interface AppState {
  // Authentication state
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
  };

  // Orders state
  orders: {
    items: Order[];
    selectedOrder: OrderDetail | null;
    loading: boolean;
    error: string | null;
    fetchOrders: () => Promise<void>;
    selectOrder: (orderId: string) => Promise<void>;
    updateOrderStage: (orderId: string, stage: OrderStage) => Promise<void>;
  };

  // Measurements state
  measurements: {
    items: Measurement[];
    loading: boolean;
    submitMeasurements: (orderId: string, measurements: MeasurementSubmission[]) => Promise<void>;
    approveSizes: (measurementIds: string[], sizes: string[]) => Promise<void>;
  };

  // Notifications state
  notifications: {
    items: Notification[];
    unreadCount: number;
    markAsRead: (notificationId: string) => void;
    clearAll: () => void;
  };

  // UI state
  ui: {
    sidebarOpen: boolean;
    currentView: 'dashboard' | 'orders' | 'messages' | 'profile';
    toggleSidebar: () => void;
    setCurrentView: (view: string) => void;
  };
}

// Store implementation
export const useAppStore = create<AppState>((set, get) => ({
  auth: {
    user: null,
    token: localStorage.getItem('auth_token'),
    isAuthenticated: !!localStorage.getItem('auth_token'),
    login: async (credentials) => {
      const response = await authService.login(credentials);
      set(state => ({
        auth: {
          ...state.auth,
          user: response.user,
          token: response.token,
          isAuthenticated: true
        }
      }));
    },
    logout: () => {
      localStorage.removeItem('auth_token');
      set(state => ({
        auth: {
          ...state.auth,
          user: null,
          token: null,
          isAuthenticated: false
        }
      }));
    }
  },
  // ... other state slices
}));
```

### State Management Patterns
- **Single Store Pattern:** Centralized state management with Zustand for simplicity
- **Slice Pattern:** Logical separation of concerns (auth, orders, measurements, etc.)
- **Async Action Pattern:** Async operations encapsulated in store actions with loading/error states
- **Optimistic Updates:** Immediate UI updates for better perceived performance
- **Local State for UI:** Component-local state for form inputs and temporary UI state

## Routing Architecture

### Route Organization
```
/                        # Dashboard (default)
/login                   # Authentication
/orders                  # Order list
/orders/:orderId         # Order detail workspace
/orders/:orderId/measurements  # Measurement collection
/orders/:orderId/payments      # Payment processing
/orders/:orderId/messages      # Order communication
/profile                 # User profile and settings
/admin                   # ColorGarb staff admin (role-protected)
/admin/orders            # All client orders
/admin/communications    # Communication center
```

### Protected Route Pattern
```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/app-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Director' | 'Finance' | 'ColorGarbStaff';
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions = []
}) => {
  const { isAuthenticated, user } = useAppStore(state => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasPermissions = requiredPermissions.every(permission =>
      user?.permissions?.includes(permission)
    );
    
    if (!hasPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// Usage in routing configuration
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/*" element={
      <ProtectedRoute requiredRole="ColorGarbStaff">
        <AdminRoutes />
      </ProtectedRoute>
    } />
  </Routes>
);
```

## Frontend Services Layer

### API Client Setup
```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAppStore } from '../stores/app-store';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAppStore.getState().auth.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAppStore.getState().auth.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_BASE_URL!);
```

### Service Example
```typescript
import { apiClient } from './api-client';
import { Order, OrderDetail, OrderStage } from '../types/order';

export class OrderService {
  async getOrders(filters?: {
    status?: string;
    stage?: OrderStage;
  }): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.stage) params.append('stage', filters.stage);

    return apiClient.get<Order[]>(`/orders?${params.toString()}`);
  }

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    return apiClient.get<OrderDetail>(`/orders/${orderId}`);
  }

  async updateOrderStage(
    orderId: string,
    stage: OrderStage,
    shipDate?: Date,
    reason?: string
  ): Promise<void> {
    await apiClient.patch(`/orders/${orderId}`, {
      stage,
      shipDate: shipDate?.toISOString(),
      reason
    });
  }

  async submitMeasurements(
    orderId: string,
    measurements: MeasurementSubmission[]
  ): Promise<void> {
    await apiClient.post(`/orders/${orderId}/measurements`, measurements);
  }

  async uploadMeasurementFile(
    orderId: string,
    file: File
  ): Promise<MeasurementImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<MeasurementImportResult>(
      `/orders/${orderId}/measurements/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }
}

export const orderService = new OrderService();
```
