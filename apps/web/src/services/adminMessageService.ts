/**
 * Admin Message Service - Frontend service for admin message inbox functionality
 * Handles API communication for unified admin message management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132';

export interface AdminMessage {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDescription: string;
  organizationName: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientRole: string;
  content: string;
  contentPreview: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  replyToMessageId?: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  isUrgent: boolean;
}

export interface AdminMessageSearchRequest {
  searchTerm?: string;
  clientName?: string;
  organizationId?: string;
  orderNumber?: string;
  messageType?: string;
  senderRole?: string;
  dateFrom?: string;
  dateTo?: string;
  includeAttachments?: boolean;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminMessageSearchResponse {
  messages: AdminMessage[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  unreadCount: number;
}

export interface AdminUnreadCountResponse {
  unreadCount: number;
}

export interface AdminBulkReadRequest {
  messageIds: string[];
}

export interface AdminBulkReadResponse {
  markedAsReadCount: number;
  totalRequested: number;
}

/**
 * Admin Message service for handling admin message inbox API calls
 */
class AdminMessageService {
  /**
   * Retrieves all messages across all orders for admin users
   * @param searchParams - Search and filter parameters
   * @returns Promise containing admin message search results
   */
  async getAllMessages(searchParams?: Partial<AdminMessageSearchRequest>): Promise<AdminMessageSearchResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (searchParams) {
        if (searchParams.searchTerm) queryParams.append('searchTerm', searchParams.searchTerm);
        if (searchParams.clientName) queryParams.append('clientName', searchParams.clientName);
        if (searchParams.organizationId) queryParams.append('organizationId', searchParams.organizationId);
        if (searchParams.orderNumber) queryParams.append('orderNumber', searchParams.orderNumber);
        if (searchParams.messageType) queryParams.append('messageType', searchParams.messageType);
        if (searchParams.senderRole) queryParams.append('senderRole', searchParams.senderRole);
        if (searchParams.dateFrom) queryParams.append('dateFrom', searchParams.dateFrom);
        if (searchParams.dateTo) queryParams.append('dateTo', searchParams.dateTo);
        if (searchParams.includeAttachments !== undefined) queryParams.append('includeAttachments', searchParams.includeAttachments.toString());
        if (searchParams.unreadOnly !== undefined) queryParams.append('unreadOnly', searchParams.unreadOnly.toString());
        if (searchParams.page) queryParams.append('page', searchParams.page.toString());
        if (searchParams.pageSize) queryParams.append('pageSize', searchParams.pageSize.toString());
      }

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/api/admin/messages${queryString ? `?${queryString}` : ''}`;

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
          throw new Error('Access denied. ColorGarb staff role required.');
        }
        throw new Error(`Failed to fetch admin messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching admin messages:', error);
      throw error;
    }
  }

  /**
   * Gets the total count of unread messages across all orders for admin user
   * @returns Promise containing the unread count
   */
  async getUnreadCount(): Promise<AdminUnreadCountResponse> {
    try {
      const url = `${API_BASE_URL}/api/admin/messages/unread-count`;

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
          throw new Error('Access denied. ColorGarb staff role required.');
        }
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching admin unread count:', error);
      throw error;
    }
  }

  /**
   * Marks multiple messages as read for the admin user
   * @param messageIds - Array of message IDs to mark as read
   * @returns Promise containing bulk operation results
   */
  async markMessagesAsRead(messageIds: string[]): Promise<AdminBulkReadResponse> {
    try {
      const request: AdminBulkReadRequest = { messageIds };
      const url = `${API_BASE_URL}/api/admin/messages/mark-read`;
      
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
          throw new Error('Access denied. ColorGarb staff role required.');
        }
        throw new Error(`Failed to mark messages as read: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking admin messages as read:', error);
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
const adminMessageService = new AdminMessageService();
export default adminMessageService;