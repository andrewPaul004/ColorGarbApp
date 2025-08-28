/**
 * TypeScript type definitions for communication audit trail functionality.
 * Shared types between frontend and backend for type safety and consistency.
 * 
 * @since 3.4.0
 */

/**
 * Communication log entity representing a single communication event
 */
export interface CommunicationLog {
  /** Unique identifier for the communication log */
  id: string;
  
  /** ID of the order associated with this communication */
  orderId: string;
  
  /** Type of communication (Email, SMS, Message, SystemNotification) */
  communicationType: 'Email' | 'SMS' | 'Message' | 'SystemNotification';
  
  /** ID of the user who sent the communication */
  senderId: string;
  
  /** ID of the user who received the communication (optional) */
  recipientId?: string;
  
  /** Email address of the recipient (optional) */
  recipientEmail?: string;
  
  /** Phone number of the recipient (optional) */
  recipientPhone?: string;
  
  /** Subject line of the communication (optional) */
  subject?: string;
  
  /** Full content of the communication */
  content: string;
  
  /** Template used for generating the communication (optional) */
  templateUsed?: string;
  
  /** Current delivery status */
  deliveryStatus: 'Sent' | 'Delivered' | 'Read' | 'Failed' | 'Bounced';
  
  /** External message identifier from delivery provider (optional) */
  externalMessageId?: string;
  
  /** Timestamp when the communication was sent */
  sentAt: string;
  
  /** Timestamp when the communication was delivered (optional) */
  deliveredAt?: string;
  
  /** Timestamp when the communication was read (optional) */
  readAt?: string;
  
  /** Reason for delivery failure (optional) */
  failureReason?: string;
  
  /** Additional metadata stored as JSON (optional) */
  metadata?: string;
  
  /** Timestamp when the log entry was created */
  createdAt: string;
  
  /** Associated message ID if this is a message communication (optional) */
  messageId?: string;
}

/**
 * Notification delivery log for tracking external provider status
 */
export interface NotificationDeliveryLog {
  /** Unique identifier for the delivery log */
  id: string;
  
  /** Reference to the parent communication log */
  communicationLogId: string;
  
  /** Delivery service provider (SendGrid, Twilio, Internal) */
  deliveryProvider: string;
  
  /** External identifier from the delivery provider */
  externalId: string;
  
  /** Current delivery status from the provider */
  status: string;
  
  /** Additional status details or error information (optional) */
  statusDetails?: string;
  
  /** Timestamp when this status update was received */
  updatedAt: string;
  
  /** Raw webhook data from the provider (optional) */
  webhookData?: string;
}

/**
 * Message edit record for tracking content changes
 */
export interface MessageEdit {
  /** Unique identifier for the edit record */
  id: string;
  
  /** ID of the message that was edited */
  messageId: string;
  
  /** ID of the user who made the edit */
  editedBy: string;
  
  /** Content of the message before the edit */
  previousContent: string;
  
  /** Reason for making the edit (optional) */
  changeReason?: string;
  
  /** Timestamp when the edit was made */
  editedAt: string;
}

/**
 * Message audit trail for tracking message interactions
 */
export interface MessageAuditTrail {
  /** Unique identifier for the audit trail */
  id: string;
  
  /** ID of the message being tracked */
  messageId: string;
  
  /** IP address of the client (optional) */
  ipAddress?: string;
  
  /** User agent string from the client (optional) */
  userAgent?: string;
  
  /** Timestamp when the audit trail was created */
  createdAt: string;
}

/**
 * Search request parameters for communication audit logs
 */
export interface CommunicationAuditSearchRequest {
  /** Organization ID to filter communications (enforced for non-staff users) */
  organizationId?: string;
  
  /** Specific order ID to filter communications */
  orderId?: string;
  
  /** Communication types to include */
  communicationType?: string[];
  
  /** User ID of the communication sender */
  senderId?: string;
  
  /** User ID of the communication recipient */
  recipientId?: string;
  
  /** Delivery status values to filter by */
  deliveryStatus?: string[];
  
  /** Start date for filtering communications (inclusive) */
  dateFrom?: string;
  
  /** End date for filtering communications (inclusive) */
  dateTo?: string;
  
  /** Full-text search term for communication content and subjects */
  searchTerm?: string;
  
  /** Include full message content in results (default: false for performance) */
  includeContent?: boolean;
  
  /** Page number for pagination (1-based) */
  page?: number;
  
  /** Number of items per page (maximum 100) */
  pageSize?: number;
  
  /** Field to sort results by */
  sortBy?: string;
  
  /** Sort direction (asc or desc) */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Search result containing communication logs and pagination information
 */
export interface CommunicationAuditResult {
  /** List of communication logs matching the search criteria */
  logs: CommunicationLog[];
  
  /** Total number of communications matching the search criteria */
  totalCount: number;
  
  /** Current page number (1-based) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Indicates if there are more pages available */
  hasNextPage: boolean;
  
  /** Indicates if there are previous pages available */
  hasPreviousPage: boolean;
  
  /** Total number of pages available */
  totalPages: number;
  
  /** Summary of delivery status distribution in the result set */
  statusSummary: Record<string, number>;
  
  /** Summary of communication types distribution in the result set */
  typeSummary: Record<string, number>;
  
  /** Date range of the communications in the result set */
  dateRange?: {
    earliestDate: string;
    latestDate: string;
    daysSpanned: number;
  };
}

/**
 * Delivery status summary for reporting purposes
 */
export interface DeliveryStatusSummary {
  /** Organization ID for the summary */
  organizationId: string;
  
  /** Start date of the reporting period */
  from: string;
  
  /** End date of the reporting period */
  to: string;
  
  /** Total number of communications in the reporting period */
  totalCommunications: number;
  
  /** Breakdown of communications by delivery status */
  statusCounts: Record<string, number>;
  
  /** Breakdown of communications by type */
  typeCounts: Record<string, number>;
  
  /** Daily communication volume during the reporting period */
  dailyVolume: DailyCommunicationVolume[];
  
  /** Delivery success rate as a percentage (0-100) */
  deliverySuccessRate: number;
  
  /** Average delivery time in minutes (for delivered communications) */
  averageDeliveryTimeMinutes?: number;
  
  /** Top failure reasons (if any failures occurred) */
  topFailureReasons: FailureReasonSummary[];
  
  /** Peak communication hour (0-23) based on send volume */
  peakHour: number;
  
  /** Communication volume by hour of day */
  hourlyVolume: Record<number, number>;
}

/**
 * Daily communication volume summary
 */
export interface DailyCommunicationVolume {
  /** Date for this volume summary */
  date: string;
  
  /** Total communications sent on this date */
  totalSent: number;
  
  /** Number of communications delivered on this date */
  delivered: number;
  
  /** Number of communications that failed on this date */
  failed: number;
  
  /** Delivery rate for this date as a percentage (0-100) */
  deliveryRate: number;
}

/**
 * Summary of communication failure reasons
 */
export interface FailureReasonSummary {
  /** The failure reason text */
  reason: string;
  
  /** Number of communications that failed with this reason */
  count: number;
  
  /** Percentage of total failures represented by this reason */
  percentage: number;
  
  /** Most recent occurrence of this failure reason */
  lastOccurrence: string;
}

/**
 * Export request parameters
 */
export interface ExportCommunicationRequest {
  /** Search criteria to filter communications for export */
  searchCriteria: CommunicationAuditSearchRequest;
  
  /** Export format (CSV, Excel, PDF) */
  format: 'csv' | 'excel' | 'pdf';
  
  /** Include full message content in export */
  includeContent: boolean;
  
  /** Include metadata and technical details */
  includeMetadata: boolean;
  
  /** Maximum number of records to export (safety limit) */
  maxRecords: number;
}

/**
 * Export estimation result
 */
export interface ExportEstimation {
  /** Estimated number of records to be exported */
  estimatedRecords: number;
  
  /** Estimated file size in KB */
  estimatedSizeKB: number;
  
  /** Recommended export format based on data size */
  recommendedFormat: string;
  
  /** Whether async processing is recommended for this export size */
  requiresAsyncProcessing: boolean;
  
  /** Estimated processing time in minutes */
  estimatedProcessingMinutes: number;
  
  /** Additional recommendations or warnings */
  recommendations: string[];
}

/**
 * Export job result for asynchronous processing
 */
export interface ExportCommunicationResult {
  /** Unique identifier for the export job */
  jobId: string;
  
  /** Direct download URL (for small exports) */
  downloadUrl?: string;
  
  /** Estimated file size in bytes */
  estimatedSize: number;
  
  /** Current job status */
  status: 'Processing' | 'Completed' | 'Failed';
  
  /** Number of records included in the export */
  recordCount: number;
  
  /** Error message if export failed */
  errorMessage?: string;
}

/**
 * Search facets for filtering
 */
export interface SearchFacets {
  /** Communication type facets */
  communicationTypes: FacetItem[];
  
  /** Delivery status facets */
  deliveryStatuses: FacetItem[];
  
  /** Template facets */
  templates: FacetItem[];
  
  /** Date range facets */
  dateRanges: FacetItem[];
}

/**
 * Individual facet item
 */
export interface FacetItem {
  /** Facet value */
  value: string;
  
  /** Number of records with this value */
  count: number;
}

/**
 * Advanced search request with ranking options
 */
export interface AdvancedSearchRequest extends CommunicationAuditSearchRequest {
  /** Enable relevance-based ranking */
  enableRelevanceRanking?: boolean;
  
  /** Include search highlights in results */
  includeHighlights?: boolean;
  
  /** Minimum relevance score threshold */
  minRelevanceScore?: number;
}

/**
 * Ranked search result with relevance scoring
 */
export interface RankedSearchResult {
  /** The communication log record */
  communicationLog: CommunicationLog;
  
  /** Relevance score (0.0 to 10.0+) */
  relevanceScore: number;
  
  /** Fields that matched the search terms */
  matchFields: string[];
}

/**
 * Advanced search result with ranking information
 */
export interface AdvancedSearchResult {
  /** Ranked search results */
  results: RankedSearchResult[];
  
  /** Total count of matching records */
  totalCount: number;
  
  /** Original search term */
  searchTerm?: string;
  
  /** Current page number */
  page: number;
  
  /** Page size */
  pageSize: number;
  
  /** Search highlights by record ID */
  searchHighlights: Record<string, string[]>;
}