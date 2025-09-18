import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Collapse,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import { 
  ExpandMore,
  ExpandLess,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { StageHistory } from '@colorgarb/shared';

/**
 * Ship date change history entry interface extending StageHistory
 * for ship date specific tracking requirements.
 * 
 * @interface ShipDateChangeHistory
 * @since 1.0.0
 */
export interface ShipDateChangeHistory extends StageHistory {
  /** Previous ship date before the change */
  previousShipDate?: Date;
  /** New ship date after the change */
  newShipDate?: Date;
  /** Reason code for the ship date change */
  changeReason?: string;
}

/**
 * Props for the ShipDateDisplay component.
 * 
 * @interface ShipDateDisplayProps
 * @since 1.0.0
 */
interface ShipDateDisplayProps {
  /** Unique identifier of the order */
  orderId: string;
  /** Current delivery date */
  currentShipDate: Date;
  /** Array of ship date change history entries */
  changeHistory: ShipDateChangeHistory[];
  /** Optional callback when history is expanded */
  onHistoryExpand?: () => void;
}

/**
 * Displays ship date information with change history tracking.
 * Shows current ship date without delay indicators.
 * 
 * @component
 * @param {ShipDateDisplayProps} props - Component props
 * @returns {JSX.Element} Ship date display component
 * 
 * @example
 * ```tsx
 * <ShipDateDisplay
 *   orderId="12345"
 *   currentShipDate={new Date('2024-03-20')}
 *   changeHistory={shipDateChanges}
 *   onHistoryExpand={handleHistoryExpand}
 * />
 * ```
 * 
 * @since 1.0.0
 */
export const ShipDateDisplay: React.FC<ShipDateDisplayProps> = ({
  orderId,
  currentShipDate,
  changeHistory,
  onHistoryExpand
}) => {
  // orderId preserved for API compatibility but currently unused
  void orderId;
  
  const theme = useTheme();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);


  /**
   * Formats a date using locale-aware formatting.
   * 
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  /**
   * Handles expanding/collapsing the change history.
   */
  const handleHistoryToggle = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
    if (onHistoryExpand) {
      onHistoryExpand();
    }
  };

  /**
   * Gets predefined reason display names for ship date changes.
   * 
   * @param {string} reasonCode - The reason code
   * @returns {string} Display-friendly reason text
   */
  const getReasonDisplayText = (reasonCode?: string): string => {
    const reasons: Record<string, string> = {
      'material-delay': 'Material delay',
      'design-revision': 'Design revision',
      'production-scheduling': 'Production scheduling',
      'quality-control-issue': 'Quality control issue',
      'client-request': 'Client request',
      'weather-shipping-delay': 'Weather/shipping delay'
    };
    
    return reasons[reasonCode || ''] || reasonCode || 'Unspecified';
  };

  return (
    <Card data-testid="ship-date-display" sx={{ mb: theme.spacing(2) }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: theme.spacing(2) }}>
          <Schedule sx={{ mr: theme.spacing(1), color: 'text.secondary' }} />
          <Typography variant="h6">Ship Date Information</Typography>
          {changeHistory.length > 0 && (
            <Chip
              label={`${changeHistory.length} changes`}
              size="small"
              sx={{ ml: 'auto' }}
              onClick={handleHistoryToggle}
            />
          )}
        </Box>

        {/* Ship Date Display */}
        <Box sx={{ mb: theme.spacing(2) }}>
          <Typography 
            variant="body2" 
            sx={{ color: 'text.secondary', mb: theme.spacing(0.5) }}
          >
            Ship Date
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ fontWeight: 'medium' }}
            data-testid="current-ship-date"
          >
            {formatDate(currentShipDate)}
          </Typography>
        </Box>

        {/* Change History Section */}
        {changeHistory.length > 0 && (
          <>
            <Divider sx={{ my: theme.spacing(2) }} />
            <Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  minHeight: '44px' // Touch-friendly target
                }}
                onClick={handleHistoryToggle}
                data-testid="history-toggle"
              >
                <Typography variant="subtitle2">
                  Change History ({changeHistory.length})
                </Typography>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                  {isHistoryExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={isHistoryExpanded}>
                <Box sx={{ mt: theme.spacing(1) }}>
                  {changeHistory.map((change, index) => (
                    <Box 
                      key={change.id || `change-${index}`}
                      sx={{ 
                        p: theme.spacing(2),
                        backgroundColor: theme.palette.grey[50],
                        borderRadius: theme.spacing(1),
                        mb: theme.spacing(1)
                      }}
                      data-testid={`history-entry-${index}`}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: theme.spacing(1) }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {formatDate(change.enteredAt)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          by {change.updatedBy}
                        </Typography>
                      </Box>
                      
                      {change.previousShipDate && change.newShipDate && (
                        <Typography variant="body2" sx={{ mb: theme.spacing(0.5) }}>
                          {formatDate(change.previousShipDate)} → {formatDate(change.newShipDate)}
                        </Typography>
                      )}
                      
                      {change.changeReason && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: theme.spacing(0.5) }}>
                          Reason: {getReasonDisplayText(change.changeReason)}
                        </Typography>
                      )}
                      
                      {change.notes && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {change.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipDateDisplay;