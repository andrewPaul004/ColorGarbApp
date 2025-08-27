/**
 * Shared TypeScript types for ColorGarb application
 * Used by both frontend and backend to ensure type consistency
 */

// Export authentication types
export * from './auth';

// Export user and role types
export * from './user';
export type { UserInfo } from './auth';

// Export order types
export * from './order';

// Export message types
export * from './message';

/**
 * Organization interface for client entities
 * @interface Organization
 */
export interface Organization {
  /** Unique identifier for the organization */
  id: string;
  /** Organization name */
  name: string;
  /** Organization type */
  type: 'school' | 'theater' | 'dance_company' | 'other';
  /** Primary contact email */
  contactEmail: string;
  /** Contact phone number */
  contactPhone?: string;
  /** Mailing address */
  address: string;
  /** Account active status */
  isActive: boolean;
  /** Organization creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Order stages in the 13-step manufacturing process
 * NOTE: OrderStage definition moved to ./order.ts to resolve conflicts
 * @deprecated Use OrderStage from './order' instead
 */
// export type OrderStage = 
//   | 'Initial Consultation'
//   | 'Measurements'
//   | 'Design Approval'
//   | 'Pattern Creation'
//   | 'Fabric Selection'
//   | 'Cutting'
//   | 'Initial Construction'
//   | 'First Fitting'
//   | 'Adjustments'
//   | 'Final Construction'
//   | 'Final Fitting'
//   | 'Quality Control'
//   | 'Shipping';

/**
 * Payment status options
 */
export type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Refunded';

/**
 * Order interface for costume manufacturing orders
 * NOTE: Order interface moved to ./order.ts for consistency
 * @deprecated Use Order from './order' instead
 * @interface Order
 */
// export interface Order {
//   /** Unique identifier for the order */
//   id: string;
//   /** Human-readable order number */
//   orderNumber: string;
//   /** Organization that owns this order */
//   organizationId: string;
//   /** Order description */
//   description: string;
//   /** Current manufacturing stage */
//   currentStage: OrderStage;
//   /** Original promised ship date */
//   originalShipDate: string;
//   /** Current ship date (may be revised) */
//   currentShipDate: string;
//   /** Total order value in USD */
//   totalAmount: number;
//   /** Payment status */
//   paymentStatus: PaymentStatus;
//   /** Additional notes */
//   notes?: string;
//   /** Order active status */
//   isActive: boolean;
//   /** Order creation timestamp */
//   createdAt: string;
//   /** Last update timestamp */
//   updatedAt: string;
// }

/**
 * API response wrapper for consistent error handling
 * @interface ApiResponse
 */
export interface ApiResponse<T = any> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  message?: string;
  /** Detailed error information */
  errors?: string[];
  /** Response timestamp */
  timestamp: string;
}

/**
 * Pagination metadata for list responses
 * @interface PaginationMeta
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 * @interface PaginatedResponse
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMeta;
}


/**
 * Health check response
 * @interface HealthCheckResponse
 */
export interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'unhealthy';
  /** Check timestamp */
  timestamp: string;
  /** Application version */
  version: string;
  /** Environment name */
  environment: string;
  /** Individual service checks */
  checks?: Record<string, {
    status: 'healthy' | 'unhealthy';
    [key: string]: any;
  }>;
}