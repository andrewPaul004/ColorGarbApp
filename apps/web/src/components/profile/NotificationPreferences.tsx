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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Verified as VerifiedIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../../stores/notificationStore';
import PhoneVerificationDialog from '../notifications/PhoneVerificationDialog';
import SmsHistory from '../notifications/SmsHistory';

interface NotificationMilestone {
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notifyBefore?: number;
}

interface NotificationPreferencesProps {
  userId: string;
}

/**
 * NotificationPreferences component provides user interface for managing email and SMS notification settings.
 * Allows users to control which milestones trigger notifications, delivery methods, and frequency.
 * 
 * Features:
 * - Toggle email and SMS notifications on/off globally
 * - Phone number verification for SMS opt-in compliance
 * - Configure milestone-specific notification settings (email/SMS per milestone)
 * - Set notification frequency preferences
 * - View SMS notification history with delivery tracking
 * - Save changes with validation feedback
 * 
 * @since 3.2.0 (Extended from 3.1.0)
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
    smsEnabled: boolean;
    frequency: string;
    milestones: NotificationMilestone[];
  }>({
    emailEnabled: true,
    smsEnabled: false,
    frequency: 'Immediate',
    milestones: [],
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [phoneVerificationOpen, setPhoneVerificationOpen] = useState(false);

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
          smsEnabled: preferences.smsEnabled,
          frequency: preferences.frequency,
          milestones: milestones,
        });
      } catch (error) {
        console.error('Error parsing milestones JSON:', error);
        // Use default milestones if parsing fails
        setLocalPreferences({
          emailEnabled: preferences.emailEnabled,
          smsEnabled: preferences.smsEnabled,
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
      emailEnabled: true,
      smsEnabled: false,
      notifyBefore: 24,
    },
    {
      type: 'ProofApproval',
      name: 'Proof Approval',
      description: 'When design proof is ready for review',
      enabled: true,
      emailEnabled: true,
      smsEnabled: false,
    },
    {
      type: 'ProductionStart',
      name: 'Production Start',
      description: 'When production begins on your costumes',
      enabled: true,
      emailEnabled: true,
      smsEnabled: false,
    },
    {
      type: 'Shipping',
      name: 'Shipping',
      description: 'When your order is shipped',
      enabled: true,
      emailEnabled: true,
      smsEnabled: true, // Default SMS enabled for critical shipping notifications
    },
    {
      type: 'Delivery',
      name: 'Delivery',
      description: 'When your order is delivered',
      enabled: true,
      emailEnabled: true,
      smsEnabled: false,
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
   * Handles changes to the global SMS enabled setting
   */
  const handleSmsEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    
    // If enabling SMS and phone is not verified, open verification dialog
    if (enabled && !preferences?.phoneVerified) {
      setPhoneVerificationOpen(true);
      return;
    }
    
    setLocalPreferences(prev => ({
      ...prev,
      smsEnabled: enabled,
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
   * Handles tab change for switching between settings and history
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  /**
   * Handles phone verification completion
   */
  const handlePhoneVerificationComplete = async () => {
    setPhoneVerificationOpen(false);
    
    // Refresh preferences to get updated phone verification status
    await fetchPreferences(userId);
    
    // Enable SMS notifications after successful verification
    setLocalPreferences(prev => ({
      ...prev,
      smsEnabled: true,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  /**
   * Opens phone verification dialog
   */
  const handleVerifyPhone = () => {
    setPhoneVerificationOpen(true);
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
        smsEnabled: localPreferences.smsEnabled,
        frequency: localPreferences.frequency,
        milestones: localPreferences.milestones.map(m => ({
          type: m.type,
          enabled: m.enabled,
          emailEnabled: m.emailEnabled,
          smsEnabled: m.smsEnabled,
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
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <NotificationsIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" component="h1">
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage when and how you receive email and SMS notifications about your orders
              </Typography>
            </Box>
          </Box>

          {/* Tabs for switching between Settings and History */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="notification tabs">
              <Tab label="Settings" icon={<NotificationsIcon />} />
              <Tab label="SMS History" icon={<HistoryIcon />} />
            </Tabs>
          </Box>

          {/* Settings Tab */}
          {activeTab === 0 && (
            <Box>

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

          {/* Global SMS Toggle */}
          <Box sx={{ mb: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={localPreferences.smsEnabled}
                  onChange={handleSmsEnabledChange}
                  color="primary"
                  size="large"
                  disabled={!preferences?.phoneVerified}
                />
              }
              label={
                <Box sx={{ ml: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmsIcon />
                    SMS Notifications
                    {preferences?.phoneVerified && (
                      <VerifiedIcon color="success" fontSize="small" />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receive SMS alerts for critical order updates like shipping confirmations
                  </Typography>
                </Box>
              }
            />
            
            {/* Phone verification status and actions */}
            <Box sx={{ ml: 4, mt: 2 }}>
              {preferences?.phoneVerified ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2">
                        Phone Number Verified
                      </Typography>
                      <Typography variant="body2">
                        {preferences.phoneNumber && (
                          <>SMS notifications will be sent to {preferences.phoneNumber}</>
                        )}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={handleVerifyPhone}
                      startIcon={<PhoneIcon />}
                    >
                      Change Number
                    </Button>
                  </Box>
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2">
                        Phone Verification Required
                      </Typography>
                      <Typography variant="body2">
                        Verify your phone number to receive SMS notifications
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleVerifyPhone}
                      startIcon={<PhoneIcon />}
                    >
                      Verify Phone
                    </Button>
                  </Box>
                </Alert>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Notification Frequency */}
          <Box sx={{ mb: 4 }}>
            <FormControl component="fieldset" disabled={!localPreferences.emailEnabled && !localPreferences.smsEnabled}>
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
                        Receive a daily digest of all milestone updates (email only)
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
                        Receive a weekly digest of milestone updates (email only)
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
              Choose which order milestones you want to be notified about and how you want to receive them
            </Typography>

            <FormGroup>
              {localPreferences.milestones.map((milestone) => (
                <Card key={milestone.type} variant="outlined" sx={{ mb: 2, p: 3 }}>
                  <Box>
                    {/* Milestone Header */}
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                      <Box flex="1">
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                          {milestone.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {milestone.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={milestone.enabled ? 'Active' : 'Inactive'}
                        color={milestone.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    {/* Notification Method Toggles */}
                    <Box sx={{ pl: 2, borderLeft: 2, borderColor: milestone.enabled ? 'primary.light' : 'grey.300' }}>
                      {/* Email Toggle */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={milestone.emailEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              handleMilestoneChange(milestone.type, 'emailEnabled', enabled);
                              // Update overall milestone enabled state
                              handleMilestoneChange(milestone.type, 'enabled', enabled || milestone.smsEnabled);
                            }}
                            disabled={!localPreferences.emailEnabled}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <EmailIcon fontSize="small" color={milestone.emailEnabled && localPreferences.emailEnabled ? 'primary' : 'disabled'} />
                            <Typography variant="body2">
                              Email notification
                            </Typography>
                          </Box>
                        }
                      />

                      {/* SMS Toggle */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={milestone.smsEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              handleMilestoneChange(milestone.type, 'smsEnabled', enabled);
                              // Update overall milestone enabled state
                              handleMilestoneChange(milestone.type, 'enabled', milestone.emailEnabled || enabled);
                            }}
                            disabled={!localPreferences.smsEnabled || !preferences?.phoneVerified}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <SmsIcon fontSize="small" color={milestone.smsEnabled && localPreferences.smsEnabled ? 'primary' : 'disabled'} />
                            <Typography variant="body2">
                              SMS notification
                              {milestone.type === 'Shipping' && (
                                <Chip label="Recommended" size="small" color="warning" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                          </Box>
                        }
                      />

                      {/* Advanced notification timing for certain milestones */}
                      {milestone.type === 'MeasurementsDue' && milestone.enabled && (
                        <Box sx={{ mt: 2 }}>
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
                            disabled={!milestone.enabled}
                          />
                        </Box>
                      )}

                      {/* Show notification methods summary */}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {!milestone.enabled && 'No notifications'}
                          {milestone.enabled && milestone.emailEnabled && milestone.smsEnabled && 'Email + SMS notifications'}
                          {milestone.enabled && milestone.emailEnabled && !milestone.smsEnabled && 'Email notifications only'}
                          {milestone.enabled && !milestone.emailEnabled && milestone.smsEnabled && 'SMS notifications only'}
                        </Typography>
                      </Box>
                    </Box>
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
            </Box>
          )}

          {/* SMS History Tab */}
          {activeTab === 1 && (
            <Box>
              <SmsHistory userId={userId} />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            About Notifications
          </Typography>
          
          {/* Email Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EmailIcon fontSize="small" />
              Email Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Email notifications help you stay informed about your costume orders without having to constantly check the portal.
              You'll receive updates when your order reaches important milestones in our production process.
            </Typography>
          </Box>

          {/* SMS Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SmsIcon fontSize="small" />
              SMS Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              SMS notifications provide instant alerts for critical updates like shipping confirmations and urgent issues.
              Perfect for when you're away from email but need to stay informed about time-sensitive updates.
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Message and data rates may apply.</strong> SMS notifications require phone verification for TCPA compliance.
                You can opt out at any time by replying "STOP" to any SMS or disabling SMS here.
              </Typography>
            </Alert>
          </Box>

          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            You can unsubscribe from notifications at any time by clicking the unsubscribe link in any email, 
            replying "STOP" to any SMS, or by disabling notifications here in your preferences.
          </Typography>
        </CardContent>
      </Card>

      {/* Phone Verification Dialog */}
      <PhoneVerificationDialog
        open={phoneVerificationOpen}
        onClose={() => setPhoneVerificationOpen(false)}
        userId={userId}
        onVerificationComplete={handlePhoneVerificationComplete}
      />
    </Box>
  );
};

export default NotificationPreferences;