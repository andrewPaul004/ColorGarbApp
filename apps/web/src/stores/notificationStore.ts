import { create } from 'zustand';
import notificationService from '../services/notificationService';

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

interface NotificationState {
  preferences: NotificationPreference | null;
  availableMilestones: { type: string; name: string; description: string; }[];
  emailHistory: EmailNotification[];
  loading: boolean;
  error: string | null;
}

interface NotificationActions {
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, preferences: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    frequency: string;
    milestonesJson: string;
  }) => Promise<void>;
  fetchNotificationHistory: (userId: string) => Promise<void>;
  clearError: () => void;
  setError: (error: string | null) => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // State
  preferences: null,
  availableMilestones: [],
  emailHistory: [],
  loading: false,
  error: null,

  // Actions
  fetchPreferences: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await notificationService.getPreferences(userId);
      set({ 
        preferences: response.preferences, 
        availableMilestones: response.availableMilestones || [],
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load preferences',
        loading: false 
      });
    }
  },

  updatePreferences: async (userId: string, preferences) => {
    set({ loading: true, error: null });
    try {
      await notificationService.updatePreferences(userId, preferences);
      // Refresh preferences after update
      const response = await notificationService.getPreferences(userId);
      set({ preferences: response.preferences, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save preferences',
        loading: false 
      });
      throw error;
    }
  },

  fetchNotificationHistory: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const emailHistory = await notificationService.getEmailHistory(userId);
      set({ emailHistory, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load notification history',
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
  setError: (error: string | null) => set({ error }),
}));