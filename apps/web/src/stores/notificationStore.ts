import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

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

interface UpdatePreferencesRequest {
  emailEnabled: boolean;
  frequency: string;
  milestones: NotificationMilestone[];
}

interface NotificationState {
  // State
  preferences: NotificationPreference | null;
  history: EmailNotification[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, preferences: UpdatePreferencesRequest) => Promise<void>;
  fetchNotificationHistory: (userId: string, page?: number, pageSize?: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Zustand store for managing notification preferences and email notification state.
 * Provides centralized state management for notification-related data and operations.
 * 
 * Features:
 * - Load and manage user notification preferences
 * - Update preference settings with optimistic updates
 * - Fetch notification delivery history
 * - Error handling and loading states
 * - Store reset functionality
 * 
 * @since 3.1.0
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  preferences: null,
  history: [],
  loading: false,
  error: null,

  /**
   * Fetches notification preferences for a specific user
   */
  fetchPreferences: async (userId: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await notificationService.getPreferences(userId);
      set({ 
        preferences: response.preferences,
        loading: false,
        error: null 
      });
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load preferences' 
      });
    }
  },

  /**
   * Updates notification preferences for a specific user
   */
  updatePreferences: async (userId: string, preferencesUpdate: UpdatePreferencesRequest) => {
    const currentPreferences = get().preferences;
    
    // Optimistic update
    if (currentPreferences) {
      set({
        preferences: {
          ...currentPreferences,
          emailEnabled: preferencesUpdate.emailEnabled,
          frequency: preferencesUpdate.frequency,
          milestonesJson: JSON.stringify(preferencesUpdate.milestones),
          updatedAt: new Date().toISOString(),
        },
        error: null,
      });
    }

    try {
      await notificationService.updatePreferences(userId, preferencesUpdate);
      
      // Refresh preferences after successful update
      await get().fetchPreferences(userId);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      
      // Revert optimistic update on error
      set({ 
        preferences: currentPreferences,
        error: error instanceof Error ? error.message : 'Failed to save preferences' 
      });
      
      throw error; // Re-throw to allow component to handle the error
    }
  },

  /**
   * Fetches email notification history for a specific user
   */
  fetchNotificationHistory: async (userId: string, page = 1, pageSize = 50) => {
    set({ loading: true, error: null });
    
    try {
      const history = await notificationService.getNotificationHistory(userId, page, pageSize);
      set({ 
        history,
        loading: false,
        error: null 
      });
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load notification history' 
      });
    }
  },

  /**
   * Clears any error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    set({
      preferences: null,
      history: [],
      loading: false,
      error: null,
    });
  },
}));