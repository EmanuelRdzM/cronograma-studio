import { createTheme } from '@mui/material/styles';

const FONT = '"Inter Variable", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4F46E5', dark: '#4338CA', light: '#EEF2FF', contrastText: '#FFFFFF' },
    secondary: { main: '#0E7490', light: '#ECFEFF' },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    background: { default: '#F5F7FB', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FONT,
    h1: { fontSize: 30, fontWeight: 760, letterSpacing: '-0.03em', lineHeight: 1.15 },
    h2: { fontSize: 22, fontWeight: 720, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h3: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontSize: 15, fontWeight: 680 },
    h5: { fontSize: 13, fontWeight: 650 },
    h6: { fontSize: 12, fontWeight: 650 },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 650, letterSpacing: '-0.005em' },
    caption: { fontSize: 11.5 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        body: { backgroundColor: '#F5F7FB' },
        '::selection': { backgroundColor: '#C7D2FE' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, paddingInline: 16, minHeight: 36 },
        sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: 12.5 },
        containedPrimary: {
          backgroundImage: 'linear-gradient(180deg, #5B52EA 0%, #4F46E5 100%)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, .16), inset 0 1px 0 rgba(255,255,255,.18)',
          '&:hover': { backgroundImage: 'linear-gradient(180deg, #4F46E5 0%, #4338CA 100%)' },
        },
        outlined: { borderColor: '#D7DEEA', color: '#334155', '&:hover': { borderColor: '#A5B4FC', backgroundColor: '#F8FAFF' } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 24px 70px rgba(15,23,42,.22)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: 18, fontWeight: 720, letterSpacing: '-0.02em', padding: '22px 24px 6px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '12px 24px 8px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '16px 24px 22px', gap: 8 } },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D7DEEA' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B9C4D4' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: '#0F172A', fontSize: 11.5, borderRadius: 6, padding: '6px 9px' },
        arrow: { color: '#0F172A' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 16px 40px rgba(15,23,42,.16)', marginTop: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { fontSize: 13, minHeight: 36 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 7 } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, height: 6, backgroundColor: '#EEF2F7' },
        bar: { borderRadius: 999 },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 2, borderRadius: 2 } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontSize: 13, fontWeight: 650, minHeight: 40 } },
    },
    MuiSnackbarContent: {
      styleOverrides: { root: { borderRadius: 9 } },
    },
  },
});
