import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Person,
  Notes,
  Timeline,
  Assignment,
  LocalShipping,
  Build,
  Palette,
  ContentCut,
  HighQuality,
  Inventory2,
  Done,
} from '@mui/icons-material';
import type { OrderStage, StageHistory } from '@colorgarb/shared';

/**
 * Props for the StageDetailModal component
 */
interface StageDetailModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The stage to display details for */
  stage: OrderStage | null;
  /** Stage history data for this stage */
  stageHistory?: StageHistory;
  /** Current stage status (completed, current, pending) */
  status: 'completed' | 'current' | 'pending';
}

/**
 * Stage Detail Modal component that displays comprehensive information about a manufacturing stage.
 * Shows stage description, timeline information, progress status, and relevant details.
 * 
 * @component
 * @param {StageDetailModalProps} props - Component props
 * @returns {JSX.Element} Stage detail modal component
 * 
 * @example
 * ```tsx
 * <StageDetailModal
 *   open={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   stage="Sewing"
 *   stageHistory={historyData}
 *   status="completed"
 * />
 * ```
 * 
 * @since 2.2.0
 */
export const StageDetailModal: React.FC<StageDetailModalProps> = ({
  open,
  onClose,
  stage,
  stageHistory,
  status
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!stage) {
    return null;
  }

  /**
   * Gets the display name for a stage
   */
  const getStageDisplayName = (stageName: OrderStage): string => {
    const stageDisplayNames: Record<OrderStage, string> = {
      'DesignProposal': 'Design Proposal',
      'ProofApproval': 'Proof Approval',
      'Measurements': 'Measurements',
      'ProductionPlanning': 'Production Planning',
      'Cutting': 'Cutting',
      'Sewing': 'Sewing',
      'QualityControl': 'Quality Control',
      'Finishing': 'Finishing',
      'FinalInspection': 'Final Inspection',
      'Packaging': 'Packaging',
      'ShippingPreparation': 'Shipping Preparation',
      'ShipOrder': 'Ship Order',
      'Delivery': 'Delivery'
    };
    return stageDisplayNames[stageName] || stageName;
  };

  /**
   * Gets the description for a stage
   */
  const getStageDescription = (stageName: OrderStage): string => {
    const stageDescriptions: Record<OrderStage, string> = {
      'DesignProposal': 'Initial design concepts and artwork creation. Our design team develops custom concepts based on your requirements and brand guidelines.',
      'ProofApproval': 'Client review and approval of design proof. You\'ll receive detailed mockups and have the opportunity to request revisions before production begins.',
      'Measurements': 'Collection and verification of performer measurements. Precise measurements ensure perfect fit and comfort for all performers.',
      'ProductionPlanning': 'Scheduling and material procurement. We coordinate production timelines and source all necessary materials and components.',
      'Cutting': 'Fabric cutting and pattern preparation. Materials are carefully cut according to approved patterns with precision and attention to detail.',
      'Sewing': 'Garment construction and assembly. Skilled craftspeople assemble your costumes using time-tested techniques and quality construction methods.',
      'QualityControl': 'Quality inspection and testing. Each garment undergoes thorough inspection to ensure it meets our high standards for fit, finish, and durability.',
      'Finishing': 'Final touches and embellishments. Application of decorative elements, trim work, and special details that bring your vision to life.',
      'FinalInspection': 'Complete quality verification. Final comprehensive review to ensure every detail meets specifications before packaging.',
      'Packaging': 'Protective packaging for shipment. Costumes are carefully packed with protective materials to ensure safe delivery.',
      'ShippingPreparation': 'Labeling and shipping logistics. Orders are prepared for shipment with proper documentation and tracking information.',
      'ShipOrder': 'Order shipped to destination. Your completed costumes are in transit to your specified delivery address.',
      'Delivery': 'Order delivered to client. Costumes have been successfully delivered and are ready for your production.'
    };
    return stageDescriptions[stageName] || 'Stage details not available.';
  };

  /**
   * Gets the icon for a stage
   */
  const getStageIcon = (stageName: OrderStage) => {
    const stageIcons: Record<OrderStage, React.ReactNode> = {
      'DesignProposal': <Palette />,
      'ProofApproval': <Assignment />,
      'Measurements': <Build />,
      'ProductionPlanning': <Timeline />,
      'Cutting': <ContentCut />,
      'Sewing': <Build />,
      'QualityControl': <HighQuality />,
      'Finishing': <Palette />,
      'FinalInspection': <CheckCircle />,
      'Packaging': <Inventory2 />,
      'ShippingPreparation': <LocalShipping />,
      'ShipOrder': <LocalShipping />,
      'Delivery': <Done />
    };
    return stageIcons[stageName] || <Assignment />;
  };

  /**
   * Gets estimated duration for a stage
   */
  const getEstimatedDuration = (stageName: OrderStage): string => {
    const stageDurations: Record<OrderStage, string> = {
      'DesignProposal': '3-5 business days',
      'ProofApproval': '2-3 business days (client dependent)',
      'Measurements': '1-2 business days',
      'ProductionPlanning': '2-3 business days',
      'Cutting': '2-4 business days',
      'Sewing': '5-10 business days',
      'QualityControl': '1-2 business days',
      'Finishing': '2-4 business days',
      'FinalInspection': '1 business day',
      'Packaging': '1 business day',
      'ShippingPreparation': '1 business day',
      'ShipOrder': '1-5 business days (shipping dependent)',
      'Delivery': 'Completed'
    };
    return stageDurations[stageName] || 'Duration varies';
  };

  /**
   * Gets the status color based on stage status
   */
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'current':
        return 'primary';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  /**
   * Gets the status text based on stage status
   */
  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'current':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  /**
   * Formats date for display
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            {getStageIcon(stage)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h2">
              {getStageDisplayName(stage)}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={getStatusText()}
                color={getStatusColor()}
                size="small"
                icon={status === 'completed' ? <CheckCircle /> : status === 'current' ? <Schedule /> : undefined}
              />
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Stage Description */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stage Overview
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {getStageDescription(stage)}
              </Typography>
            </CardContent>
          </Card>

          {/* Stage Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stage Information
              </Typography>
              <List disablePadding>
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Estimated Duration"
                    secondary={getEstimatedDuration(stage)}
                  />
                </ListItem>
                
                <Divider sx={{ my: 1 }} />
                
                <ListItem disablePadding sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Timeline color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Stage Status"
                    secondary={getStatusText()}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Stage History (if available) */}
          {stageHistory && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Completion Details
                </Typography>
                <List disablePadding>
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Completed On"
                      secondary={formatDate(stageHistory.enteredAt)}
                    />
                  </ListItem>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemIcon>
                      <Person color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Completed By"
                      secondary={stageHistory.updatedBy}
                    />
                  </ListItem>
                  
                  {stageHistory.notes && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemIcon>
                          <Notes color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Notes"
                          secondary={stageHistory.notes}
                        />
                      </ListItem>
                    </>
                  )}

                  {/* Ship Date Changes */}
                  {stageHistory.previousShipDate && stageHistory.newShipDate && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemIcon>
                          <LocalShipping color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Ship Date Updated"
                          secondary={
                            <Stack spacing={1}>
                              <Typography variant="body2">
                                <strong>From:</strong> {formatDate(stageHistory.previousShipDate)}
                              </Typography>
                              <Typography variant="body2">
                                <strong>To:</strong> {formatDate(stageHistory.newShipDate)}
                              </Typography>
                              {stageHistory.changeReason && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Reason:</strong> {stageHistory.changeReason}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StageDetailModal;