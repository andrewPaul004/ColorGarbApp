import { apiClient } from './apiClient';

interface NotificationMilestone {
  type: string;
  enabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notifyBefore?: number;
}

interface NotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  phoneVerifiedAt?: string;
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
  smsEnabled: boolean;
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

interface SmsNotification {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  deliveryAttempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  cost?: number;
}

interface PhoneVerificationRequest {
  phoneNumber: string;
}

interface PhoneVerificationResponse {
  success: boolean;
  message: string;
  expiresAt: string;
}

interface VerifyPhoneRequest {
  verificationToken: string;
}

interface VerifyPhoneResponse {
  success: boolean;
  phoneNumber: string;
  verifiedAt: string;
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
   * Sends a verification code to a phone number for SMS opt-in verification
   */
  async sendPhoneVerification(userId: string, phoneNumber: string): Promise<PhoneVerificationResponse> {
    try {
      const response = await apiClient.post<PhoneVerificationResponse>(
        `${this.baseUrl}/users/${userId}/phone/verify`,
        { phoneNumber }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send phone verification:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to send verification code'));
    }
  }

  /**
   * Verifies a phone number using the provided verification token
   */
  async verifyPhoneNumber(userId: string, verificationToken: string): Promise<VerifyPhoneResponse> {
    try {
      const response = await apiClient.put<VerifyPhoneResponse>(
        `${this.baseUrl}/users/${userId}/phone/verify`,
        { verificationToken }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to verify phone number:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to verify phone number'));
    }
  }

  /**
   * Retrieves SMS notification history for a specific user
   */
  async getSmsHistory(userId: string, page = 1, pageSize = 50): Promise<SmsNotification[]> {
    try {
      const response = await apiClient.get<SmsNotification[]>(
        `${this.baseUrl}/users/${userId}/sms-history`,
        {
          params: { page, pageSize }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get SMS history:', error);
      throw new Error(this.getErrorMessage(error, 'Failed to load SMS history'));
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
        if (typeof milestone.emailEnabled !== 'boolean') {
          errors.push(`Milestone ${index + 1}: Email enabled must be a boolean`);
        }
        if (typeof milestone.smsEnabled !== 'boolean') {
          errors.push(`Milestone ${index + 1}: SMS enabled must be a boolean`);
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
   * Gets the status color for SMS delivery status
   */
  getSmsStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'failed':
      case 'undelivered':
        return 'error';
      case 'pending':
      case 'queued':
        return 'warning';
      case 'sent':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Gets a human-readable status message for SMS delivery
   */
  getSmsStatusMessage(notification: SmsNotification): string {
    switch (notification.status?.toLowerCase()) {
      case 'delivered':
        return `Delivered ${this.formatDate(notification.deliveredAt)}`;
      case 'sent':
        return `Sent ${this.formatDate(notification.createdAt)}`;
      case 'failed':
        return `Failed: ${notification.errorMessage || 'Unknown error'}`;
      case 'undelivered':
        return 'SMS not delivered - invalid number or network issue';
      case 'pending':
        return 'Pending delivery';
      case 'queued':
        return 'Queued for delivery';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Validates phone number format
   */
  validatePhoneNumber(phoneNumber: string): { isValid: boolean; error?: string } {
    if (!phoneNumber) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Basic phone number validation - should be E.164 format or US format
    const e164Pattern = /^\+[1-9]\d{1,14}$/;
    const usPattern = /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
    
    if (!e164Pattern.test(phoneNumber) && !usPattern.test(phoneNumber.replace(/\D/g, ''))) {
      return { 
        isValid: false, 
        error: 'Please enter a valid phone number (e.g., +1234567890 or 234-567-8901)' 
      };
    }

    return { isValid: true };
  }

  /**
   * Formats phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // US number formatting
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // International format - just add + if not present
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
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