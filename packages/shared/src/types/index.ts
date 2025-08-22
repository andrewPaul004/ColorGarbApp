/**
 * Shared TypeScript types for ColorGarb application
 * Used by both frontend and backend to ensure type consistency
 */

// Export authentication types
export * from './auth';

/**
 * User interface for authentication and authorization
 * @interface User
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's full name */
  name: string;
  /** User's role in the system */
  role: 'client' | 'colorgarb_staff';
  /** Phone number (optional) */
  phone?: string;
  /** Organization ID (null for ColorGarb staff) */
  organizationId?: string;
  /** Account active status */
  isActive: boolean;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

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
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Order stages in the 13-step manufacturing process
 */
export type OrderStage = 
  | 'Initial Consultation'
  | 'Measurements'
  | 'Design Approval'
  | 'Pattern Creation'
  | 'Fabric Selection'
  | 'Cutting'
  | 'Initial Construction'
  | 'First Fitting'
  | 'Adjustments'
  | 'Final Construction'
  | 'Final Fitting'
  | 'Quality Control'
  | 'Shipping';

/**
 * Payment status options
 */
export type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Refunded';

/**
 * Order interface for costume manufacturing orders
 * @interface Order
 */
export interface Order {
  /** Unique identifier for the order */
  id: string;
  /** Human-readable order number */
  orderNumber: string;
  /** Organization that owns this order */
  organizationId: string;
  /** Order description */
  description: string;
  /** Current manufacturing stage */
  currentStage: OrderStage;
  /** Original promised ship date */
  originalShipDate: Date;
  /** Current ship date (may be revised) */
  currentShipDate: Date;
  /** Total order value in USD */
  totalAmount: number;
  /** Payment status */
  paymentStatus: PaymentStatus;
  /** Additional notes */
  notes?: string;
  /** Order active status */
  isActive: boolean;
  /** Order creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

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
  timestamp: Date;
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
 * Authentication token response
 * @interface AuthTokenResponse
 */
export interface AuthTokenResponse {
  /** JWT access token */
  accessToken: string;
  /** Token type (typically "Bearer") */
  tokenType: string;
  /** Token expiration in seconds */
  expiresIn: number;
  /** User information */
  user: User;
}

/**
 * Login request payload
 * @interface LoginRequest
 */
export interface LoginRequest {
  /** User email */
  email: string;
  /** User password */
  password: string;
}

/**
 * Health check response
 * @interface HealthCheckResponse
 */
export interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'unhealthy';
  /** Check timestamp */
  timestamp: Date;
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