import { apiClient } from './apiClient';

interface NotificationMilestone {
  type: string;
  enabled: boolean;
  emailEnabled: boolean;
  notifyBefore?: number;
}

interface NotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean; // Keep for API compatibility but will always be false
  milestonesJson: string;
  frequency: string;
  isActive: boolean;
  unsubscribeToken?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationPreferencesResponse {
  preferences: NotificationPreference;
  availableMilestones: {
    type: string;
    name: string;
    description: string;
  }[];
}

interface UpdatePreferencesRequest {
  emailEnabled: boolean;
  smsEnabled: boolean; // Keep for API compatibility but will always be false
  frequency: string;
  milestonesJson: string;
}

interface EmailNotification {
  id: string;
  templateName: string;
  subject: string;
  status: string;
  deliveryAttempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface UnsubscribeResponse {
  success: boolean;
  userId: string;
  message: string;
}

/**
 * Service for managing notification preferences and email notification operations.
 * Provides API communication layer for notification-related functionality.
 * 
 * Features:
 * - Get/update user notification preferences
 * - Retrieve email notification delivery history
 * - Handle unsubscribe operations
 * - Error handling and response validation
 * 
 * @since 3.2.0 (SMS functionality removed)
 */
class NotificationService {
  private baseUrl = '/api/notifications';

  /**
   * Retrieves notification preferences for a specific user
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesResponse> {
    try {
      const response = await apiClient.get<NotificationPreferencesResponse>(
        `${this.baseUrl}/users/${userId}/preferences`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to load notification preferences'));
    }
  }

  /**
   * Updates notification preferences for a specific user
   */
  async updatePreferences(userId: string, preferences: UpdatePreferencesRequest): Promise<void> {
    try {
      await apiClient.put(
        `${this.baseUrl}/users/${userId}/preferences`,
        preferences
      );
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to save notification preferences'));
    }
  }

  /**
   * Retrieves email notification history for a specific user
   */
  async getEmailHistory(userId: string, page = 1, pageSize = 50): Promise<EmailNotification[]> {
    try {
      const response = await apiClient.get<EmailNotification[]>(
        `${this.baseUrl}/users/${userId}/email-history`,
        {
          params: { page, pageSize }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get email history:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to load email history'));
    }
  }

  /**
   * Unsubscribes a user from email notifications using unsubscribe token
   */
  async unsubscribe(token: string): Promise<UnsubscribeResponse> {
    try {
      const response = await apiClient.get<UnsubscribeResponse>(
        `${this.baseUrl}/unsubscribe/${token}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to process unsubscribe request'));
    }
  }

  /**
   * Gets a human-readable status message for email delivery
   */
  getEmailStatusMessage(notification: EmailNotification): string {
    switch (notification.status?.toLowerCase()) {
      case 'delivered':
        return `Delivered ${this.formatDate(notification.deliveredAt)}`;
      case 'sent':
        return `Sent ${this.formatDate(notification.createdAt)}`;
      case 'failed':
        return `Failed: ${notification.errorMessage || 'Unknown error'}`;
      case 'bounced':
        return 'Email bounced - invalid address or full mailbox';
      case 'pending':
        return 'Pending delivery';
      case 'queued':
        return 'Queued for delivery';
      default:
        return notification.status || 'Unknown status';
    }
  }

  /**
   * Gets appropriate color for email delivery status
   */
  getEmailStatusColor(notification: EmailNotification): 'success' | 'error' | 'warning' | 'info' {
    switch (notification.status?.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'failed':
      case 'bounced':
        return 'error';
      case 'pending':
      case 'queued':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Formats a date string for display
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  }

  /**
   * Extracts error message from API response
   */
  private getErrorMessage(error: any, defaultMessage: string): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return defaultMessage;
  }
}

// Export singleton instance
export default new NotificationService();