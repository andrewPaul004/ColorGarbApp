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
  /** Original promised ship date */
  originalShipDate: Date;
  /** Current ship date (may be revised) */
  currentShipDate: Date;
  /** When the order was created */
  createdAt: Date;
  /** When the order was last updated */
  updatedAt: Date;
}