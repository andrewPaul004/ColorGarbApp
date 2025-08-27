import type { 
  Message, 
  MessageSearchRequest, 
  MessageSearchResponse, 
  SendMessageRequest, 
  MessageCreationResponse,
  BulkReadRequest,
  BulkReadResponse
} from '@colorgarb/shared';
import { apiClient } from './apiClient';

/**
 * Message service for handling order-specific communication API calls
 */
class MessageService {
  /**
   * Retrieves messages for a specific order with search and pagination
   * @param orderId - Order ID to get messages for
   * @param searchParams - Search and pagination parameters
   * @returns Promise containing message search results
   */
  async getOrderMessages(orderId: string, searchParams?: Partial<MessageSearchRequest>): Promise<MessageSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (searchParams) {
      if (searchParams.searchTerm) queryParams.append('searchTerm', searchParams.searchTerm);
      if (searchParams.messageType) queryParams.append('messageType', searchParams.messageType);
      if (searchParams.senderRole) queryParams.append('senderRole', searchParams.senderRole);
      if (searchParams.dateFrom) queryParams.append('dateFrom', searchParams.dateFrom);
      if (searchParams.dateTo) queryParams.append('dateTo', searchParams.dateTo);
      if (searchParams.includeAttachments !== undefined) queryParams.append('includeAttachments', searchParams.includeAttachments.toString());
      if (searchParams.page) queryParams.append('page', searchParams.page.toString());
      if (searchParams.pageSize) queryParams.append('pageSize', searchParams.pageSize.toString());
    }

    const queryString = queryParams.toString();
    const url = `/api/orders/${orderId}/messages${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<MessageSearchResponse>(url);
    return response;
  }

  /**
   * Sends a new message to an order thread
   * @param orderId - Order ID to send message to
   * @param messageData - Message content and metadata
   * @returns Promise containing the created message
   */
  async sendMessage(orderId: string, messageData: SendMessageRequest): Promise<MessageCreationResponse> {
    const formData = new FormData();
    formData.append('content', messageData.content);
    
    if (messageData.messageType) {
      formData.append('messageType', messageData.messageType);
    }
    if (messageData.recipientRole) {
      formData.append('recipientRole', messageData.recipientRole);
    }
    if (messageData.replyToMessageId) {
      formData.append('replyToMessageId', messageData.replyToMessageId);
    }
    
    // Add file attachments if present
    if (messageData.attachments && messageData.attachments.length > 0) {
      messageData.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await apiClient.post<MessageCreationResponse>(
      `/api/orders/${orderId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response;
  }

  /**
   * Retrieves a specific message by ID
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID to retrieve
   * @returns Promise containing the message
   */
  async getMessageById(orderId: string, messageId: string): Promise<Message> {
    const response = await apiClient.get<Message>(`/api/orders/${orderId}/messages/${messageId}`);
    return response;
  }

  /**
   * Marks a message as read
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID to mark as read
   * @returns Promise that resolves when operation is complete
   */
  async markMessageAsRead(orderId: string, messageId: string): Promise<void> {
    await apiClient.put(`/api/orders/${orderId}/messages/${messageId}/read`);
  }

  /**
   * Marks multiple messages as read in bulk
   * @param orderId - Order ID the messages belong to
   * @param messageIds - Array of message IDs to mark as read
   * @returns Promise containing bulk operation results
   */
  async markMessagesAsRead(orderId: string, messageIds: string[]): Promise<BulkReadResponse> {
    const request: BulkReadRequest = { messageIds };
    const response = await apiClient.put<BulkReadResponse>(
      `/api/orders/${orderId}/messages/mark-read`,
      request
    );
    return response;
  }

  /**
   * Downloads a message attachment
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID containing the attachment
   * @param attachmentId - Attachment ID to download
   * @returns Promise containing the file blob
   */
  async downloadAttachment(orderId: string, messageId: string, attachmentId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/api/orders/${orderId}/messages/${messageId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
    return response;
  }
}

// Export singleton instance
const messageService = new MessageService();
export default messageService;