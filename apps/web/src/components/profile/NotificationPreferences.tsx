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
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
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
  notifyBefore?: number;
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
 * @since 3.1.0
 */
export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ userId }) => {
  const { 
    preferences, 
    loading, 
    error, 
    fetchPreferences, 
    updatePreferences,
    fetchNotificationHistory 
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
          milestones: getDefaultMilestones(),
        });
      }
    }
  }, [preferences]);

  /**
   * Returns default milestone configuration with all notifications enabled
   */
  const getDefaultMilestones = (): NotificationMilestone[] => [
    {
      type: 'MeasurementsDue',
      name: 'Measurements Due',
      description: 'When performer measurements need to be submitted',
      enabled: true,
      notifyBefore: 24,
    },
    {
      type: 'ProofApproval',
      name: 'Proof Approval',
      description: 'When design proof is ready for review',
      enabled: true,
    },
    {
      type: 'ProductionStart',
      name: 'Production Start',
      description: 'When production begins on your costumes',
      enabled: true,
    },
    {
      type: 'Shipping',
      name: 'Shipping',
      description: 'When your order is shipped',
      enabled: true,
    },
    {
      type: 'Delivery',
      name: 'Delivery',
      description: 'When your order is delivered',
      enabled: true,
    },
  ];

  /**
   * Handles changes to the global email enabled setting
   */
  const handleEmailEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setLocalPreferences(prev => ({
      ...prev,
      emailEnabled: enabled,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  /**
   * Handles changes to notification frequency setting
   */
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frequency = event.target.value;
    setLocalPreferences(prev => ({
      ...prev,
      frequency,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  /**
   * Handles changes to milestone-specific notification settings
   */
  const handleMilestoneChange = (milestoneType: string, field: keyof NotificationMilestone, value: any) => {
    setLocalPreferences(prev => ({
      ...prev,
      milestones: prev.milestones.map(milestone =>
        milestone.type === milestoneType
          ? { ...milestone, [field]: value }
          : milestone
      ),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  /**
   * Saves notification preference changes
   */
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences(userId, {
        emailEnabled: localPreferences.emailEnabled,
        frequency: localPreferences.frequency,
        milestones: localPreferences.milestones.map(m => ({
          type: m.type,
          enabled: m.enabled,
          notifyBefore: m.notifyBefore,
        })),
      });

      setHasChanges(false);
      setSaveSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">Error Loading Preferences</Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <NotificationsIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" component="h1">
                Email Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage when and how you receive email notifications about your orders
              </Typography>
            </Box>
          </Box>

          {/* Global Email Toggle */}
          <Box sx={{ mb: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={localPreferences.emailEnabled}
                  onChange={handleEmailEnabledChange}
                  color="primary"
                  size="large"
                />
              }
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon />
                    Email Notifications
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receive email updates when your orders reach important milestones
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Notification Frequency */}
          <Box sx={{ mb: 4 }}>
            <FormControl component="fieldset" disabled={!localPreferences.emailEnabled}>
              <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScheduleIcon />
                <Typography variant="h6">Notification Frequency</Typography>
              </FormLabel>
              <RadioGroup
                value={localPreferences.frequency}
                onChange={handleFrequencyChange}
                sx={{ ml: 4 }}
              >
                <FormControlLabel
                  value="Immediate"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography>Immediate</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive notifications as soon as milestones are reached
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="Daily"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography>Daily Summary</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive a daily digest of all milestone updates
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="Weekly"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography>Weekly Summary</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Receive a weekly digest of milestone updates
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Milestone-Specific Settings */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Milestone Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose which order milestones you want to be notified about
            </Typography>

            <FormGroup>
              {localPreferences.milestones.map((milestone) => (
                <Card key={milestone.type} variant="outlined" sx={{ mb: 2, p: 2 }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                    <Box flex="1">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={milestone.enabled}
                            onChange={(e) => handleMilestoneChange(milestone.type, 'enabled', e.target.checked)}
                            disabled={!localPreferences.emailEnabled}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                              {milestone.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {milestone.description}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      {/* Advanced notification timing for certain milestones */}
                      {milestone.type === 'MeasurementsDue' && milestone.enabled && localPreferences.emailEnabled && (
                        <Box sx={{ mt: 2, ml: 4 }}>
                          <TextField
                            size="small"
                            type="number"
                            label="Notify before deadline"
                            value={milestone.notifyBefore || 24}
                            onChange={(e) => handleMilestoneChange(milestone.type, 'notifyBefore', parseInt(e.target.value) || 24)}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                            }}
                            sx={{ width: 200 }}
                            inputProps={{ min: 1, max: 168 }}
                          />
                        </Box>
                      )}
                    </Box>

                    <Chip
                      label={milestone.enabled ? 'Enabled' : 'Disabled'}
                      color={milestone.enabled ? 'success' : 'default'}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Box>
                </Card>
              ))}
            </FormGroup>
          </Box>

          {/* Success Message */}
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
              <Typography>Notification preferences saved successfully!</Typography>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
              <Typography>Failed to save preferences. Please try again.</Typography>
            </Alert>
          )}

          {/* Save Button */}
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="contained"
              color="primary"
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

      {/* Information Card */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            About Email Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Email notifications help you stay informed about your costume orders without having to constantly check the portal.
            You'll receive updates when your order reaches important milestones in our production process.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can unsubscribe from emails at any time by clicking the unsubscribe link in any notification email, 
            or by disabling notifications here in your preferences.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationPreferences;