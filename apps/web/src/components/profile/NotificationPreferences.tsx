import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  RadioGroup,
  Radio,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../../stores/notificationStore';

interface NotificationMilestone {
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  notifyBefore?: number;
}

interface AvailableMilestone {
  type: string;
  name: string;
  description: string;
}

interface NotificationPreferencesProps {
  userId: string;
}

/**
 * NotificationPreferences component provides user interface for managing email notification settings.
 * Allows users to control which milestones trigger notifications and delivery frequency.
 * 
 * Features:
 * - Toggle email notifications on/off globally
 * - Configure milestone-specific notification settings
 * - Set notification frequency preferences
 * - Save changes with validation feedback
 * 
 * @since 3.2.0
 */
export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ userId }) => {
  const { 
    preferences, 
    availableMilestones: storeAvailableMilestones,
    loading, 
    error, 
    fetchPreferences, 
    updatePreferences,
  } = useNotificationStore();

  const [localPreferences, setLocalPreferences] = useState<{
    emailEnabled: boolean;
    frequency: string;
    milestones: NotificationMilestone[];
  }>({
    emailEnabled: true,
    frequency: 'Immediate',
    milestones: [],
  });


  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load preferences on component mount
  useEffect(() => {
    fetchPreferences(userId);
  }, [userId, fetchPreferences]);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      try {
        const milestones = JSON.parse(preferences.milestonesJson || '[]');
        setLocalPreferences({
          emailEnabled: preferences.emailEnabled,
          frequency: preferences.frequency,
          milestones: milestones,
        });
      } catch (error) {
        console.error('Error parsing milestones JSON:', error);
        // Use default milestones if parsing fails
        setLocalPreferences({
          emailEnabled: preferences.emailEnabled,
          frequency: preferences.frequency,
          milestones: createDefaultMilestones(storeAvailableMilestones),
        });
      }
    }
  }, [preferences, storeAvailableMilestones]);

  // Initialize milestones when available milestones are loaded and no existing milestones
  useEffect(() => {
    if (storeAvailableMilestones.length > 0 && localPreferences.milestones.length === 0 && preferences) {
      setLocalPreferences(prev => ({
        ...prev,
        milestones: createDefaultMilestones(storeAvailableMilestones),
      }));
    }
  }, [storeAvailableMilestones, localPreferences.milestones.length, preferences]);

  /**
   * Creates default milestone configuration based on available milestones from API
   */
  const createDefaultMilestones = (availableMilestones: AvailableMilestone[]): NotificationMilestone[] => {
    return availableMilestones.map(milestone => ({
      type: milestone.type,
      name: milestone.name,
      description: milestone.description,
      enabled: true,
      emailEnabled: true,
      // Add special timing for measurements stage
      notifyBefore: milestone.type === 'Measurements' ? 24 : undefined,
    }));
  };

  /**
   * Handles changes to global email notification toggle
   */
  const handleEmailEnabledChange = (enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      emailEnabled: enabled,
    }));
    setHasChanges(true);
  };

  /**
   * Handles changes to notification frequency
   */
  const handleFrequencyChange = (frequency: string) => {
    setLocalPreferences(prev => ({
      ...prev,
      frequency,
    }));
    setHasChanges(true);
  };

  /**
   * Handles changes to milestone-specific notification settings
   */
  const handleMilestoneChange = (milestoneType: string, field: keyof NotificationMilestone, value: boolean | number) => {
    setLocalPreferences(prev => ({
      ...prev,
      milestones: prev.milestones.map(milestone =>
        milestone.type === milestoneType
          ? { ...milestone, [field]: value }
          : milestone
      ),
    }));
    setHasChanges(true);
  };

  /**
   * Saves notification preferences
   */
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences(userId, {
        emailEnabled: localPreferences.emailEnabled,
        smsEnabled: false, // SMS disabled - keep for API compatibility
        frequency: localPreferences.frequency,
        milestonesJson: JSON.stringify(localPreferences.milestones),
      });
      
      setHasChanges(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <NotificationsIcon color="primary" />
          <Typography variant="h6" component="h2">
            Email Notification Preferences
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
            Notification preferences saved successfully!
          </Alert>
        )}

        {/* Email Notifications Toggle */}
        <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon />
              Email Notifications
            </Box>
          </FormLabel>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={localPreferences.emailEnabled}
                  onChange={(e) => handleEmailEnabledChange(e.target.checked)}
                  color="primary"
                />
              }
              label="Receive email notifications for order updates"
            />
          </FormGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Notification Frequency */}
        <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon />
              Email Frequency
            </Box>
          </FormLabel>
          <RadioGroup
            value={localPreferences.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            disabled={!localPreferences.emailEnabled}
          >
            <FormControlLabel value="Immediate" control={<Radio />} label="Immediate - Send notifications right away" />
            <FormControlLabel value="Daily" control={<Radio />} label="Daily Digest - Send a summary once per day" />
            <FormControlLabel value="Weekly" control={<Radio />} label="Weekly Summary - Send a summary once per week" />
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Milestone Notifications */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Notification Milestones
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which order milestones should trigger email notifications.
          </Typography>

          {localPreferences.milestones.map((milestone) => (
            <Card key={milestone.type} variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {milestone.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {milestone.description}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={milestone.emailEnabled && localPreferences.emailEnabled}
                        onChange={(e) => handleMilestoneChange(milestone.type, 'emailEnabled', e.target.checked)}
                        disabled={!localPreferences.emailEnabled}
                        color="primary"
                      />
                    }
                    label="Email"
                    sx={{ ml: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            size="large"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;