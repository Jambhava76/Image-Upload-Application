import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f7f8f5',
      paper: '#ffffff'
    },
    primary: {
      main: '#146c67',
      dark: '#0f4d49',
      light: '#dcefed'
    },
    secondary: {
      main: '#b47b1d',
      light: '#f4e2bd'
    },
    text: {
      primary: '#24302f',
      secondary: '#64706d'
    },
    divider: '#dfe5df'
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '2rem',
      lineHeight: 1.1,
      fontWeight: 750
    },
    h2: {
      fontSize: '1.25rem',
      lineHeight: 1.25,
      fontWeight: 700
    },
    button: {
      textTransform: 'none',
      fontWeight: 700
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 12px 34px rgba(40, 51, 48, 0.08)'
        }
      }
    }
  }
});
