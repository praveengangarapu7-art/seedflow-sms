import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastContainer } from './Toast';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

type ToastInput =
  | string
  | { message: string; type?: ToastItem['type']; duration?: number };

interface ToastContextValue {
  addToast: (
    messageOrOptions: ToastInput,
    type?: ToastItem['type'],
    duration?: number
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timersRef.current.delete(id);
  }, []);

  const addToast = useCallback(
    (messageOrOptions: ToastInput, type: ToastItem['type'] = 'info', duration = 4000) => {
      let resolvedMessage: string;
      let resolvedType: ToastItem['type'] = type;
      let resolvedDuration = duration;

      if (typeof messageOrOptions === 'string') {
        resolvedMessage = messageOrOptions;
      } else if (messageOrOptions && typeof messageOrOptions === 'object') {
        resolvedMessage = messageOrOptions.message;
        resolvedType = messageOrOptions.type ?? type;
        resolvedDuration = messageOrOptions.duration ?? duration;
      } else {
        resolvedMessage = String(messageOrOptions ?? '');
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: ToastItem = { id, message: resolvedMessage, type: resolvedType, duration: resolvedDuration };
      setToasts((prev) => [...prev, item]);

      const timer = setTimeout(() => removeToast(id), resolvedDuration);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
