import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastItem } from './ToastContext';
import styles from './Toast.module.css';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const TYPE_CONFIG = {
  success: {
    Icon: CheckCircle2,
    iconClass: 'iconSuccess',
    barClass: 'barSuccess',
  },
  error: {
    Icon: XCircle,
    iconClass: 'iconError',
    barClass: 'barError',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'iconWarning',
    barClass: 'barWarning',
  },
  info: {
    Icon: Info,
    iconClass: 'iconInfo',
    barClass: 'barInfo',
  },
} as const;

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => {
        const { Icon, iconClass, barClass } = TYPE_CONFIG[toast.type];
        return (
          <div key={toast.id} className={styles.card}>
            <div className={`${styles.accentBar} ${styles[barClass]}`} />
            <Icon size={18} className={`${styles.icon} ${styles[iconClass]}`} />
            <p className={styles.message}>{toast.message}</p>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
