# Data Models

## Core Business Entities

### User

**Purpose:** Represents all system users including band directors, finance users, and ColorGarb staff with role-based access control

**Key Attributes:**
- Id: Guid - Unique identifier
- Email: string - Login credential and communication
- OrganizationId: Guid - Links to client organization (null for ColorGarb staff)
- Role: UserRole enum - Director, Finance, ColorGarbStaff
- FirstName: string - Personal identification
- LastName: string - Personal identification
- PhoneNumber: string - SMS notification delivery
- IsActive: bool - Account status
- CreatedAt: DateTime - Audit trail

#### TypeScript Interface
```typescript
interface User {
  id: string;
  email: string;
  organizationId: string | null;
  role: 'Director' | 'Finance' | 'ColorGarbStaff';
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Relationships
- Belongs to one Organization (except ColorGarb staff)
- Has many NotificationPreferences
- Creates many Messages
- Participates in many Orders (through Organization)

### Organization

**Purpose:** Represents client schools/booster organizations with complete data isolation for security and privacy

**Key Attributes:**
- Id: Guid - Unique identifier
- Name: string - School or organization name
- Type: OrganizationType enum - School, BoosterClub, Other
- Address: Address object - Shipping and billing
- ContactEmail: string - Primary communication
- ContactPhone: string - Emergency contact
- TaxId: string - Financial compliance
- PaymentTerms: string - Billing configuration
- IsActive: bool - Account status

#### TypeScript Interface
```typescript
interface Organization {
  id: string;
  name: string;
  type: 'School' | 'BoosterClub' | 'Other';
  address: Address;
  contactEmail: string;
  contactPhone: string;
  taxId?: string;
  paymentTerms: string;
  isActive: boolean;
  createdAt: Date;
}

interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
```

#### Relationships
- Has many Users (directors, finance users)
- Has many Orders
- Has many PaymentMethods

### Order

**Purpose:** Central entity representing a costume order through the complete 13-stage manufacturing process

**Key Attributes:**
- Id: Guid - Unique identifier
- OrderNumber: string - Human-readable identifier
- OrganizationId: Guid - Client organization
- Description: string - Order summary
- CurrentStage: OrderStage enum - One of 13 manufacturing stages
- OriginalShipDate: DateTime - Initial promised delivery
- CurrentShipDate: DateTime - Latest revised delivery
- TotalAmount: decimal - Financial total
- Status: OrderStatus enum - Active, Completed, Cancelled
- CreatedAt: DateTime - Order initiation

#### TypeScript Interface
```typescript
interface Order {
  id: string;
  orderNumber: string;
  organizationId: string;
  description: string;
  currentStage: OrderStage;
  originalShipDate: Date;
  currentShipDate: Date;
  totalAmount: number;
  status: 'Active' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

type OrderStage = 
  | 'DesignProposal' 
  | 'ProofApproval' 
  | 'Measurements' 
  | 'ProductionPlanning'
  | 'Cutting' 
  | 'Sewing' 
  | 'QualityControl' 
  | 'Finishing'
  | 'FinalInspection' 
  | 'Packaging' 
  | 'ShippingPreparation' 
  | 'ShipOrder'
  | 'Delivery';
```

#### Relationships
- Belongs to one Organization
- Has many OrderStageHistories (timeline tracking)
- Has many Measurements
- Has many Payments
- Has many Messages
- Has many Documents (proofs, contracts)

### Measurement

**Purpose:** Stores performer measurement data with validation and size mapping approval workflows

**Key Attributes:**
- Id: Guid - Unique identifier
- OrderId: Guid - Associated order
- PerformerName: string - Individual identification
- Measurements: JSON object - Flexible measurement storage
- SuggestedSize: string - ColorGarb size mapping
- ApprovedSize: string - Client-approved final size
- Status: MeasurementStatus enum - Submitted, Mapped, Approved
- SubmittedAt: DateTime - Collection timestamp

#### TypeScript Interface
```typescript
interface Measurement {
  id: string;
  orderId: string;
  performerName: string;
  measurements: Record<string, number>; // chest: 36, waist: 32, etc.
  suggestedSize?: string;
  approvedSize?: string;
  status: 'Submitted' | 'Mapped' | 'Approved' | 'Rejected';
  submittedAt: Date;
  approvedAt?: Date;
}
```

#### Relationships
- Belongs to one Order
- Has many MeasurementHistories (size change tracking)

### Payment

**Purpose:** Tracks all financial transactions with PO integration and approval workflows

**Key Attributes:**
- Id: Guid - Unique identifier
- OrderId: Guid - Associated order
- Amount: decimal - Payment amount
- Method: PaymentMethod enum - CreditCard, ACH, Check
- Status: PaymentStatus enum - Pending, Approved, Completed, Failed
- PurchaseOrderNumber: string - PO tracking
- TransactionId: string - External payment reference
- ProcessedAt: DateTime - Payment completion

#### TypeScript Interface
```typescript
interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'CreditCard' | 'ACH' | 'Check' | 'PurchaseOrder';
  status: 'Pending' | 'Approved' | 'Completed' | 'Failed' | 'Refunded';
  purchaseOrderNumber?: string;
  transactionId?: string;
  processedAt?: Date;
  createdAt: Date;
}
```

#### Relationships
- Belongs to one Order
- Has many PaymentApprovals (workflow tracking)
