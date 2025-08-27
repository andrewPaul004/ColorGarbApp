/**
 * Shared message types for the ColorGarb order-specific message center
 */

/**
 * Message interface for order-specific communication
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** ID of the user who sent this message */
  senderId: string;
  /** Display name of the message sender */
  senderName: string;
  /** Role of the message sender */
  senderRole: string;
  /** Intended recipient role for the message */
  recipientRole: string;
  /** Content of the message */
  content: string;
  /** Type/category of the message */
  messageType: MessageType;
  /** Whether the message has been read */
  isRead: boolean;
  /** Timestamp when the message was marked as read */
  readAt?: string;
  /** ID of the message this is a reply to (if applicable) */
  replyToMessageId?: string;
  /** When this message was created */
  createdAt: string;
  /** When this message was last updated */
  updatedAt: string;
  /** Number of attachments on this message */
  attachmentCount: number;
  /** List of message attachments */
  attachments: MessageAttachment[];
}

/**
 * Message attachment interface
 */
export interface MessageAttachment {
  /** Unique identifier for the attachment */
  id: string;
  /** Original filename as uploaded by the user */
  originalFileName: string;
  /** Size of the file in bytes */
  fileSize: number;
  /** MIME type of the file */
  contentType: string;
  /** When this attachment was uploaded */
  uploadedAt: string;
  /** Name of the user who uploaded this attachment */
  uploadedByName: string;
}

/**
 * Message type enum for categorization
 */
export type MessageType = 'General' | 'Question' | 'Update' | 'Urgent';

/**
 * Message search request interface
 */
export interface MessageSearchRequest {
  /** Order ID to search messages within */
  orderId: string;
  /** Search term to match against message content */
  searchTerm?: string;
  /** Filter by specific sender ID */
  senderId?: string;
  /** Filter by message type */
  messageType?: MessageType;
  /** Filter by sender role */
  senderRole?: string;
  /** Filter messages from this date (inclusive) */
  dateFrom?: string;
  /** Filter messages to this date (inclusive) */
  dateTo?: string;
  /** Include only messages with attachments */
  includeAttachments?: boolean;
  /** Page number for pagination (1-based) */
  page?: number;
  /** Number of messages per page */
  pageSize?: number;
}

/**
 * Message search response interface
 */
export interface MessageSearchResponse {
  /** Messages matching the search criteria for current page */
  messages: Message[];
  /** Total number of messages matching search criteria (before pagination) */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Number of messages per page */
  pageSize: number;
  /** Whether there are more pages available */
  hasNextPage: boolean;
  /** Number of unread messages for the current user in this order */
  unreadCount: number;
}

/**
 * Send message request interface
 */
export interface SendMessageRequest {
  /** Content of the message (required, max 5000 characters) */
  content: string;
  /** Type of message (defaults to General) */
  messageType?: MessageType;
  /** Target recipient role (defaults to All) */
  recipientRole?: string;
  /** Optional ID of message being replied to */
  replyToMessageId?: string;
  /** Optional file attachments */
  attachments?: File[];
}

/**
 * Message creation response interface
 */
export interface MessageCreationResponse {
  /** The created message */
  message: Message;
  /** Any warnings about attachment processing */
  attachmentWarnings: Record<string, string>;
}

/**
 * Bulk read request interface
 */
export interface BulkReadRequest {
  /** List of message IDs to mark as read */
  messageIds: string[];
}

/**
 * Bulk read response interface
 */
export interface BulkReadResponse {
  /** Number of messages successfully marked as read */
  markedAsReadCount: number;
  /** Total number of messages requested to be marked as read */
  totalRequested: number;
}