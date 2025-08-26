import { apiClient } from './apiClient';

interface NotificationMilestone {
  type: string;
  enabled: boolean;
  notifyBefore?: number;
}

interface NotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
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
  frequency: string;
  milestones: NotificationMilestone[];
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
 * - Retrieve notification delivery history
 * - Handle unsubscribe operations
 * - Error handling and response validation
 * 
 * @since 3.1.0
 */
class NotificationService {
  private readonly baseUrl = '/api/notifications';

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
  async getNotificationHistory(userId: string, page = 1, pageSize = 50): Promise<EmailNotification[]> {
    try {
      const response = await apiClient.get<EmailNotification[]>(
        `${this.baseUrl}/users/${userId}/history`,
        {
          params: { page, pageSize }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get notification history:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to load notification history'));
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
   * Updates email delivery status (typically called by webhooks)
   */
  async updateDeliveryStatus(notificationId: string, status: string, errorMessage?: string): Promise<void> {
    try {
      await apiClient.post(
        `${this.baseUrl}/webhook/delivery-status/${notificationId}`,
        { status, errorMessage }
      );
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to update delivery status'));
    }
  }

  /**
   * Tests email notification delivery for debugging purposes
   */
  async testNotification(userId: string, templateName: string): Promise<void> {
    try {
      await apiClient.post(
        `${this.baseUrl}/test/${userId}`,
        { templateName }
      );
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to send test notification'));
    }
  }

  /**
   * Validates notification preferences before saving
   */
  validatePreferences(preferences: UpdatePreferencesRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate frequency
    if (!['Immediate', 'Daily', 'Weekly'].includes(preferences.frequency)) {
      errors.push('Invalid notification frequency');
    }

    // Validate milestones
    if (!Array.isArray(preferences.milestones)) {
      errors.push('Milestones must be an array');
    } else {
      preferences.milestones.forEach((milestone, index) => {
        if (!milestone.type) {
          errors.push(`Milestone ${index + 1}: Type is required`);
        }
        if (typeof milestone.enabled !== 'boolean') {
          errors.push(`Milestone ${index + 1}: Enabled must be a boolean`);
        }
        if (milestone.notifyBefore && (milestone.notifyBefore < 1 || milestone.notifyBefore > 168)) {
          errors.push(`Milestone ${index + 1}: Notify before must be between 1 and 168 hours`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets a user-friendly error message from API response
   */
  private getErrorMessage(error: any, fallback: string): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return fallback;
  }

  /**
   * Gets the status color for notification delivery status
   */
  getStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'failed':
      case 'bounced':
        return 'error';
      case 'pending':
        return 'warning';
      case 'sent':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Gets a human-readable status message for notification delivery
   */
  getStatusMessage(notification: EmailNotification): string {
    switch (notification.status?.toLowerCase()) {
      case 'delivered':
        return `Delivered ${this.formatDate(notification.deliveredAt)}`;
      case 'sent':
        return `Sent ${this.formatDate(notification.createdAt)}`;
      case 'failed':
        return `Failed: ${notification.errorMessage || 'Unknown error'}`;
      case 'bounced':
        return 'Email bounced - invalid address';
      case 'pending':
        return 'Pending delivery';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Formats a date string for display
   */
  private formatDate(dateString?: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;