/**
 * Local types for the web application
 * Re-exports shared types with proper type definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'colorgarb_staff';
  phone?: string;
  organizationId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  type: 'school' | 'theater' | 'dance_company' | 'other';
  contactEmail: string;
  contactPhone?: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  description: string;
  currentStage: string;
  originalShipDate: Date;
  currentShipDate: Date;
  totalAmount: number;
  paymentStatus: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationName: string;
}

/**
 * Extended order interface for detailed order view
 * Includes complete organization information and stage-specific actions
 * 
 * @interface OrderDetail
 * @since 2.1.0
 */
export interface OrderDetail extends Order {
  /** Complete organization information */
  organization: {
    id: string;
    name: string;
    type: string;
    contactEmail: string;
    contactPhone?: string;
    address: {
      street1: string;
      street2?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    paymentTerms: string;
  };
  /** Current order status */
  status: string;
  /** Available quick actions for current stage */
  nextActions: string[];
}