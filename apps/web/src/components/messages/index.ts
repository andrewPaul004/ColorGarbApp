/**
 * Message components for order-specific communication
 * 
 * This module provides a complete messaging system for order-specific communication
 * between clients and ColorGarb staff, including:
 * 
 * - MessageCenter: Main container component with real-time updates
 * - MessageList: Message thread display with pagination and infinite scroll
 * - MessageComposer: Message composition with file attachment support  
 * - MessageSearch: Advanced search and filtering capabilities
 * 
 * Features:
 * - Real-time message updates with auto-refresh
 * - File attachment support with drag-and-drop
 * - Advanced search with date ranges, message types, and sender roles
 * - Infinite scroll pagination for large message threads
 * - Read receipt tracking and unread indicators
 * - Responsive design for mobile and desktop
 * - Integration with existing authentication and API systems
 * 
 * @since 3.3.0
 */

export { MessageCenter } from './MessageCenter';
export { MessageList } from './MessageList';
export { MessageComposer } from './MessageComposer';
export { MessageSearch } from './MessageSearch';

// Re-export types for convenience
export type { 
  Message, 
  MessageSearchRequest, 
  MessageSearchResponse,
  SendMessageRequest,
  MessageCreationResponse,
  BulkReadRequest,
  BulkReadResponse
} from '@colorgarb/shared';