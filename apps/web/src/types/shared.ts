/**
 * Local types for the web application
 * Re-exports shared types with proper type definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Director' | 'Finance' | 'ColorGarbStaff';
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
  totalAmount: number | null;
  paymentStatus: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationName: string;
  customerName?: string;
}

// Communication Audit Trail Types
export interface CommunicationLog {
  id: string;
  orderId: string;
  communicationType: 'Email' | 'SMS' | 'Message' | 'SystemNotification';
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  content: string;
  templateUsed?: string;
  deliveryStatus: 'Sent' | 'Delivered' | 'Read' | 'Failed' | 'Bounced' | 'Queued' | 'Opened' | 'Clicked';
  externalMessageId?: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  metadata?: string;
  createdAt: Date;
}

export interface CommunicationAuditSearchRequest {
  organizationId?: string;
  orderId?: string;
  communicationType?: string[];
  senderId?: string;
  recipientId?: string;
  deliveryStatus?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  includeContent?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CommunicationAuditResult {
  logs: CommunicationLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  statusSummary: Record<string, number>;
}

export interface DeliveryStatusSummary {
  organizationId: string;
  from: Date;
  to: Date;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  totalCommunications: number;
}

export interface ExportCommunicationRequest {
  searchCriteria: CommunicationAuditSearchRequest;
  format: 'CSV' | 'Excel' | 'PDF';
  includeContent?: boolean;
  includeMetadata?: boolean;
  maxRecords?: number;
}

export interface ExportCommunicationResult {
  jobId: string;
  status: 'Processing' | 'Completed' | 'Failed';
  downloadUrl?: string;
  estimatedSize: number;
  recordCount: number;
  errorMessage?: string;
}

// Message System Types
export interface Message {
  id: string;
  orderId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  messageType: string;
  createdAt: Date;
  readAt?: Date;
  attachments?: any[];
}

export interface MessageSearchRequest {
  searchTerm?: string;
  messageType?: string;
  senderRole?: string;
  dateFrom?: string;
  dateTo?: string;
  includeAttachments?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MessageSearchResponse {
  messages: Message[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SendMessageRequest {
  content: string;
  messageType?: string;
  recipientRole?: string;
  replyToMessageId?: string;
  attachments?: File[];
}

export interface MessageCreationResponse {
  message: Message;
  success: boolean;
}

export interface BulkReadRequest {
  messageIds: string[];
}

export interface BulkReadResponse {
  successCount: number;
  failedIds: string[];
}

// Order Detail and Stage Types
export interface OrderStage {
  id: string;
  stageName: string;
  stageNumber: number;
  description: string;
  isCompleted: boolean;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
}

export interface StageHistory {
  id: string;
  orderId: string;
  stageId: string;
  stageName: string;
  previousStage?: string;
  completedAt: Date;
  completedBy: string;
  completedByName: string;
  notes?: string;
  durationHours?: number;
}

export interface OrderDetail {
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
  customerName?: string;
  stages: OrderStage[];
  stageHistory: StageHistory[];
  shipDateHistory?: ShipDateChangeHistory[];
}

export interface ShipDateChangeHistory {
  id: string;
  orderId: string;
  oldShipDate: Date;
  newShipDate: Date;
  reason: string;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
}

export interface ComplianceReportRequest {
  organizationId: string;
  dateFrom: Date;
  dateTo: Date;
  includeFailureAnalysis?: boolean;
  includeCharts?: boolean;
  reportTitle?: string;
}