import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { wasQueuedOffline, type QualitySeverity } from '@/services/seedLotRealtimeClient';
import styles from './Quality.module.css';

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Today as YYYY-MM-DD in local time — what <input type="date"> speaks. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function SeverityBadge({ severity }: { severity: QualitySeverity }) {
  const cls = severity === 'critical' ? styles.badgeCritical : severity === 'major' ? styles.badgeMajor : styles.badgeMinor;
  return <span className={`${styles.badge} ${cls}`}>{severity}</span>;
}

type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';
const TONE_CLASS: Record<Tone, string> = {
  good: styles.badgeGood,
  warn: styles.badgeWarn,
  bad: styles.badgeBad,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  open: 'bad',
  investigating: 'warn',
  received: 'bad',
  in_progress: 'warn',
  in_review: 'warn',
  draft: 'neutral',
  implemented: 'info',
  resolved: 'info',
  effective: 'good',
  closed: 'good',
  superseded: 'neutral',
  cancelled: 'neutral',
  rejected: 'bad',
};

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status] ?? 'neutral'}>{humanize(status)}</Pill>;
}

const REQ_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_assessed: { label: 'Not assessed', tone: 'neutral' },
  compliant: { label: 'Compliant', tone: 'good' },
  partially_compliant: { label: 'Partially compliant', tone: 'warn' },
  non_compliant: { label: 'Non-compliant', tone: 'bad' },
  not_applicable: { label: 'Not applicable', tone: 'info' },
};

export function RequirementStatusPill({ status }: { status: string }) {
  const meta = REQ_STATUS[status] ?? { label: humanize(status), tone: 'neutral' as Tone };
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

export const REQUIREMENT_STATUS_OPTIONS = [
  { value: 'compliant', label: 'Compliant' },
  { value: 'partially_compliant', label: 'Partially compliant' },
  { value: 'non_compliant', label: 'Non-compliant' },
  { value: 'not_applicable', label: 'Not applicable' },
];

export function RiskPill({ risk }: { risk: string | null }) {
  if (!risk) return <span>—</span>;
  const tone: Tone = risk === 'critical' || risk === 'high' ? 'bad' : risk === 'medium' ? 'warn' : 'neutral';
  return <Pill tone={tone}>{risk}</Pill>;
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'bad' | 'good'; children: ReactNode }) {
  const cls = tone === 'warn' ? styles.noticeWarn : tone === 'bad' ? styles.noticeBad : tone === 'good' ? styles.noticeGood : '';
  return <div className={`${styles.notice} ${cls}`}>{children}</div>;
}

export function ErrorCard({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.card}>
      <span className={styles.errorText}>{message}</span>
    </div>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Loads data through a token-bearing function and exposes loading/error/reload.
 * The loader is held in a ref so callers can pass an inline closure without
 * re-triggering the effect; `deps` decides when a reload happens.
 */
export function useQualityLoad<T>(token: string | null, loader: (token: string) => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, loading, error, reload };
}

/**
 * Runs a mutation and reports the outcome with a toast. A write that was only
 * queued offline is reported as queued — never as saved — because these are
 * compliance records.
 */
export function useQualityAction() {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, successMessage: string | ((result: T) => string)): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await action();
        if (wasQueuedOffline(result) || wasQueuedOffline((result as { ncr?: unknown })?.ncr)) {
          addToast('The server is unreachable — this change is queued and will be applied when the connection returns.', 'warning');
        } else {
          addToast(typeof successMessage === 'function' ? successMessage(result) : successMessage, 'success');
        }
        return result;
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Action failed', 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [addToast],
  );

  return { run, busy };
}

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  description?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void | Promise<void>;
}

/** A modal that collects one required piece of free text (a reason, notes, ...). */
export function PromptModal({ isOpen, title, label, placeholder, confirmLabel, confirmVariant = 'primary', description, busy, onClose, onSubmit }: PromptModalProps) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (isOpen) setText('');
  }, [isOpen]);
  const { addToast } = useToast();

  const submit = async () => {
    if (!text.trim()) {
      addToast(`${label} is required.`, 'error');
      return;
    }
    await onSubmit(text.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.modalStack}>
        {description}
        <div>
          <label className={styles.label} htmlFor="prompt-text">
            {label}
          </label>
          <textarea id="prompt-text" className={styles.textArea} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className={styles.actionsRow}>
          <Button variant={confirmVariant} isLoading={busy} onClick={() => void submit()}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
