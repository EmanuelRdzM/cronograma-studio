import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastContextValue {
  toast: (message: string, severity?: Severity) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Severity>('success');
  const queue = useRef<{ message: string; severity: Severity }[]>([]);

  const showNext = useCallback(() => {
    const next = queue.current.shift();
    if (!next) return;
    setMessage(next.message);
    setSeverity(next.severity);
    setOpen(true);
  }, []);

  const toast = useCallback(
    (text: string, level: Severity = 'success') => {
      queue.current.push({ message: text, severity: level });
      if (!open) showNext();
    },
    [open, showNext],
  );

  const handleClose = () => {
    setOpen(false);
    window.setTimeout(showNext, 150);
  };

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (text: string) => toast(text, 'success'),
      error: (text: string) => toast(text, 'error'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4200}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{ borderRadius: 2, boxShadow: '0 10px 32px rgba(15,23,42,.25)', fontSize: 13.5 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
