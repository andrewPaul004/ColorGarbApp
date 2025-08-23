import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

/**
 * ColorGarb brand colors and design system
 * Official brand palette for consistent styling across the application
 */
const colorGarbPalette = {
  primary: {
    50: '#e8f4fd',
    100: '#c6e2fa',
    200: '#a1cef7',
    300: '#7bb9f3',
    400: '#5ea9f0',
    500: '#4198ed', // Primary brand color - Professional blue
    600: '#3b88d4',
    700: '#3274ba',
    800: '#2a61a0',
    900: '#1d4077',
  },
  secondary: {
    50: '#fdf2e9',
    100: '#fbe0c8',
    200: '#f8cca4',
    300: '#f5b880',
    400: '#f2a865',
    500: '#ef984a', // Secondary brand color - Warm orange
    600: '#ed8d43',
    700: '#ea7f3a',
    800: '#e87131',
    900: '#e45b21',
  },
  accent: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0', // Accent color - Creative purple
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#691b9a',
    900: '#4a148c',
  },
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50', // Success green
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336', // Error red
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
  warning: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800', // Warning orange
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

/**
 * ColorGarb Material-UI theme configuration
 * Implements the brand design system with consistent colors, typography, and components
 * Optimized for both mobile and desktop experiences
 * 
 * @since 1.0.0
 */
const colorGarbTheme: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colorGarbPalette.primary[500],
      light: colorGarbPalette.primary[300],
      dark: colorGarbPalette.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colorGarbPalette.secondary[500],
      light: colorGarbPalette.secondary[300],
      dark: colorGarbPalette.secondary[700],
      contrastText: '#ffffff',
    },
    success: {
      main: colorGarbPalette.success[500],
      light: colorGarbPalette.success[300],
      dark: colorGarbPalette.success[700],
      contrastText: '#ffffff',
    },
    error: {
      main: colorGarbPalette.error[500],
      light: colorGarbPalette.error[300],
      dark: colorGarbPalette.error[700],
      contrastText: '#ffffff',
    },
    warning: {
      main: colorGarbPalette.warning[500],
      light: colorGarbPalette.warning[300],
      dark: colorGarbPalette.warning[700],
      contrastText: '#ffffff',
    },
    info: {
      main: colorGarbPalette.primary[400],
      light: colorGarbPalette.primary[200],
      dark: colorGarbPalette.primary[600],
      contrastText: '#ffffff',
    },
    grey: colorGarbPalette.neutral,
    background: {
      default: colorGarbPalette.neutral[50],
      paper: '#ffffff',
    },
    text: {
      primary: colorGarbPalette.neutral[800],
      secondary: colorGarbPalette.neutral[600],
    },
    divider: colorGarbPalette.neutral[200],
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none' as const,
      letterSpacing: '0.02em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(65, 152, 237, 0.3)',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colorGarbPalette.primary[500]} 0%, ${colorGarbPalette.primary[600]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colorGarbPalette.primary[600]} 0%, ${colorGarbPalette.primary[700]} 100%)`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${colorGarbPalette.secondary[500]} 0%, ${colorGarbPalette.secondary[600]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colorGarbPalette.secondary[600]} 0%, ${colorGarbPalette.secondary[700]} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${colorGarbPalette.neutral[100]}`,
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${colorGarbPalette.primary[500]} 0%, ${colorGarbPalette.primary[700]} 100%)`,
          boxShadow: '0 2px 20px rgba(65, 152, 237, 0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
        },
        elevation3: {
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.16)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colorGarbPalette.primary[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colorGarbPalette.primary[500],
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
        },
        colorPrimary: {
          background: `linear-gradient(135deg, ${colorGarbPalette.primary[500]} 0%, ${colorGarbPalette.primary[600]} 100%)`,
          color: 'white',
        },
        colorSecondary: {
          background: `linear-gradient(135deg, ${colorGarbPalette.secondary[500]} 0%, ${colorGarbPalette.secondary[600]} 100%)`,
          color: 'white',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: colorGarbPalette.neutral[200],
        },
        bar: {
          borderRadius: 4,
          background: `linear-gradient(90deg, ${colorGarbPalette.primary[500]} 0%, ${colorGarbPalette.secondary[500]} 100%)`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardInfo: {
          backgroundColor: colorGarbPalette.primary[50],
          color: colorGarbPalette.primary[800],
          '& .MuiAlert-icon': {
            color: colorGarbPalette.primary[600],
          },
        },
        standardSuccess: {
          backgroundColor: colorGarbPalette.success[50],
          color: colorGarbPalette.success[800],
          '& .MuiAlert-icon': {
            color: colorGarbPalette.success[600],
          },
        },
        standardWarning: {
          backgroundColor: colorGarbPalette.warning[50],
          color: colorGarbPalette.warning[800],
          '& .MuiAlert-icon': {
            color: colorGarbPalette.warning[600],
          },
        },
        standardError: {
          backgroundColor: colorGarbPalette.error[50],
          color: colorGarbPalette.error[800],
          '& .MuiAlert-icon': {
            color: colorGarbPalette.error[600],
          },
        },
      },
    },
  },
};

/**
 * Creates the ColorGarb theme instance
 * @returns Material-UI theme configured with ColorGarb branding
 */
export const createColorGarbTheme = () => createTheme(colorGarbTheme);

/**
 * Default ColorGarb theme instance
 */
export default createColorGarbTheme();