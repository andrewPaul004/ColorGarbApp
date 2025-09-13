/**
 * Shared order-related type definitions for the ColorGarb application.
 * These types are used across frontend and backend components.
 * 
 * @fileoverview Order types and interfaces
 * @since 1.0.0
 */

/**
 * Order stage enumeration for the 13-stage manufacturing process.
 * Represents the complete lifecycle from design to delivery.
 * 
 * @enum {string}
 * @since 1.0.0
 */
export type OrderStage = 
  | 'DesignProposal' | 'ProofApproval' | 'Measurements' | 'ProductionPlanning'
  | 'Cutting' | 'Sewing' | 'QualityControl' | 'Finishing'
  | 'FinalInspection' | 'Packaging' | 'ShippingPreparation' | 'ShipOrder'
  | 'Delivery';

/**
 * Stage history tracking interface for completed stages with timestamps.
 * Records the progression through manufacturing stages for audit and display purposes.
 * 
 * @interface StageHistory
 * @since 1.0.0
 */
export interface StageHistory {
  /** Unique identifier for the stage history entry */
  id: string;
  /** The manufacturing stage this entry represents */
  stage: OrderStage;
  /** When this stage was entered */
  enteredAt: Date;
  /** User who updated the stage */
  updatedBy: string;
  /** Optional notes about the stage transition */
  notes?: string;
  /** Previous ship date before this stage (if changed) */
  previousShipDate?: Date;
  /** New ship date set during this stage (if changed) */
  newShipDate?: Date;
  /** Reason for ship date change (if applicable) */
  changeReason?: string;
}

/**
 * Complete order interface representing a costume manufacturing order.
 * Contains all essential order information including current status and timeline.
 * 
 * @interface Order
 * @since 1.0.0
 */
export interface Order {
  /** Unique identifier for the order */
  id: string;
  /** Human-readable order number (e.g., "CG-2023-001") */
  orderNumber: string;
  /** ID of the client organization that owns this order */
  organizationId: string;
  /** Brief description of the costume order */
  description: string;
  /** Current stage in the 13-step manufacturing process */
  currentStage: OrderStage;
  /** Current ship date (may be revised) */
  currentShipDate: Date;
  /** When the order was created */
  createdAt: Date;
  /** When the order was last updated */
  updatedAt: Date;
}

/**
 * Organization information interface for contact and shipping details.
 * Contains complete organization data for order detail display.
 * 
 * @interface Organization
 * @since 1.0.0
 */
export interface Organization {
  /** Unique identifier for the organization */
  id: string;
  /** Organization name */
  name: string;
  /** Organization type (School, Theater, etc.) */
  type: string;
  /** Primary contact email address */
  contactEmail?: string;
  /** Primary contact phone number */
  contactPhone?: string;
  /** Complete address for shipping */
  address?: string;
  /** Payment terms for the organization */
  paymentTerms?: string;
}

/**
 * Extended order interface with complete organization details and financial information.
 * Used for order detail pages requiring comprehensive information display.
 * 
 * @interface OrderDetail
 * @extends Order
 * @since 1.0.0
 */
export interface OrderDetail extends Order {
  /** Complete organization information */
  organization: Organization;
  /** Total order amount in USD */
  totalAmount?: number;
  /** Current payment status */
  paymentStatus?: string;
  /** Additional order notes or special instructions */
  notes?: string;
  /** Organization name for backward compatibility */
  organizationName: string;
  /** Historical progression through manufacturing stages */
  stageHistory?: StageHistory[];
}