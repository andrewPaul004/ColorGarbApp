import type {
  Message,
  MessageSearchRequest,
  MessageSearchResponse,
  SendMessageRequest,
  MessageCreationResponse,
  BulkReadRequest,
  BulkReadResponse
} from '../types/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132';

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
    try {
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
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view messages.');
        }
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
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
      messageData.attachments.forEach((file: File) => {
        formData.append('attachments', file);
      });
    }

    try {
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to send messages.');
        }
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Retrieves a specific message by ID
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID to retrieve
   * @returns Promise containing the message
   */
  async getMessageById(orderId: string, messageId: string): Promise<Message> {
    try {
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages/${messageId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view this message.');
        }
        if (response.status === 404) {
          throw new Error('Message not found.');
        }
        throw new Error(`Failed to fetch message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  }

  /**
   * Marks a message as read
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID to mark as read
   * @returns Promise that resolves when operation is complete
   */
  async markMessageAsRead(orderId: string, messageId: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages/${messageId}/read`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to mark this message as read.');
        }
        throw new Error(`Failed to mark message as read: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Marks multiple messages as read in bulk
   * @param orderId - Order ID the messages belong to
   * @param messageIds - Array of message IDs to mark as read
   * @returns Promise containing bulk operation results
   */
  async markMessagesAsRead(orderId: string, messageIds: string[]): Promise<BulkReadResponse> {
    try {
      const request: BulkReadRequest = { messageIds };
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages/mark-read`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to mark messages as read.');
        }
        throw new Error(`Failed to mark messages as read: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Downloads a message attachment
   * @param orderId - Order ID the message belongs to
   * @param messageId - Message ID containing the attachment
   * @param attachmentId - Attachment ID to download
   * @returns Promise containing the file blob
   */
  async downloadAttachment(orderId: string, messageId: string, attachmentId: string): Promise<Blob> {
    try {
      const url = `${API_BASE_URL}/api/orders/${orderId}/messages/${messageId}/attachments/${attachmentId}/download`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to download this attachment.');
        }
        if (response.status === 404) {
          throw new Error('Attachment not found.');
        }
        throw new Error(`Failed to download attachment: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  /**
   * Gets authentication token from storage
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('colorgarb_auth_token');
    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }
    return token;
  }
}

// Export singleton instance
const messageService = new MessageService();
export default messageService;