import { useMemo, useState, type FormEvent } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, Copy, Info, Loader2, MessageSquareText, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useBackendSession } from '@/hooks/useBackendSession';
import { openAssistant } from '@/services/assistantBus';
import { runRecordCopilot } from '@/services/seedLotRealtimeClient';
import { copilotActions, runCopilotRules, type CopilotRecord, type CopilotResult, type CopilotSeverity } from '@/ai/copilot';
import styles from './RecordAiPanel.module.css';

const ICON: Record<CopilotSeverity, typeof Info> = { critical: AlertOctagon, warning: AlertTriangle, info: Info, good: CheckCircle2 };

function isResult(value: unknown): value is CopilotResult {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'findings' in (value as object) && 'summary' in (value as object));
}

/** Strips React elements, functions and cycles so any page object can be sent. */
function plainRecord(value: unknown): CopilotRecord {
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(value ?? {}, (_k, v) => {
      if (typeof v === 'function') return undefined;
      if (v && typeof v === 'object') {
        if ('$$typeof' in v) return undefined;
        if (seen.has(v)) return undefined;
        seen.add(v);
      }
      return v;
    });
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as CopilotRecord) : {};
  } catch {
    return {};
  }
}

interface Props {
  /** A record type from src/ai/copilot, e.g. "quality.ncr". */
  recordType: string;
  /** The record the page is showing (API row or mock object); extra context fields are welcome. */
  record: unknown;
  /** Short name of the record for the header, e.g. "NCR-2026-014". */
  label?: string;
  /** Start expanded with the first action already run. */
  defaultOpen?: boolean;
}

/**
 * "AI assist" for one record. Every detail page drops this in with the record
 * it shows. The server runs the shared rules and, when a model is connected,
 * lets the model refine them; if the API is unreachable the same rules run
 * here in the browser, so the panel always answers.
 */
export function RecordAiPanel({ recordType, record, label, defaultOpen = false }: Props) {
  const { token } = useBackendSession();
  const actions = useMemo(() => copilotActions(recordType), [recordType]);
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);

  if (actions.length === 0) return null;

  const run = async (action: string, q?: string) => {
    setOpen(true);
    setActive(q ? 'ask' : action);
    setBusy(true);
    setCopied(false);
    const plain = plainRecord(record);
    try {
      if (!token) throw new Error('no session');
      const data = await runRecordCopilot(token, { recordType, action, question: q, record: plain });
      if (!isResult(data)) throw new Error('unavailable');
      setResult(data);
    } catch {
      const local = runCopilotRules(recordType, q ? 'summarize' : action, plain);
      setResult({
        ...local,
        offline: true,
        ...(q ? { action: 'ask', actionLabel: 'Question', findings: [{ severity: 'info' as const, text: 'Free-text questions need the SeedSphere server with an AI model. Showing the offline summary instead.' }, ...local.findings] } : {}),
      });
    } finally {
      setBusy(false);
    }
  };

  const ask = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q) void run('summarize', q);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const sourceLabel = result
    ? result.source === 'model'
      ? `Written by ${result.model ?? 'AI model'} over SeedSphere rules`
      : result.offline
        ? 'SeedSphere rules (offline, in your browser)'
        : 'SeedSphere rules engine'
    : '';

  return (
    <section className={styles.panel} aria-label="AI assist">
      <div className={styles.head}>
        <span className={styles.badge}>
          <Sparkles size={14} /> AI assist
        </span>
        <span className={styles.headText}>{label ? `for ${label}` : 'for this record'}</span>
        <div className={styles.actions}>
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`${styles.chip} ${active === a.id ? styles.chipActive : ''}`}
              title={a.description}
              disabled={busy}
              onClick={() => void run(a.id)}
            >
              {busy && active === a.id ? <Loader2 size={13} className={styles.spin} /> : null}
              {a.label}
            </button>
          ))}
        </div>
        {result && (
          <button type="button" className={styles.toggle} onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Hide' : 'Show'} <ChevronDown size={14} className={open ? styles.chevOpen : undefined} />
          </button>
        )}
      </div>

      {open && (
        <div className={styles.body}>
          {busy && !result && (
            <p className={styles.loading}>
              <Loader2 size={14} className={styles.spin} /> Analysing…
            </p>
          )}
          {result && (
            <div className={busy ? styles.dim : undefined}>
              <div className={styles.resultHead}>
                <div>
                  <h4 className={styles.title}>{result.title}</h4>
                  <p className={styles.summary}>{result.summary}</p>
                </div>
                {result.score && (
                  <div className={`${styles.score} ${styles[`score_${result.score.tone}`]}`}>
                    <span className={styles.scoreValue}>{Math.round(result.score.value)}</span>
                    <span className={styles.scoreLabel}>{result.score.label}</span>
                  </div>
                )}
              </div>

              {result.findings.length > 0 && (
                <ul className={styles.findings}>
                  {result.findings.map((f, i) => {
                    const Icon = ICON[f.severity];
                    return (
                      <li key={i} className={`${styles.finding} ${styles[`f_${f.severity}`]}`}>
                        <Icon size={16} className={styles.fIcon} />
                        <span>{f.text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {result.suggestions.length > 0 && (
                <div className={styles.block}>
                  <h5>Recommended next steps</h5>
                  <ol className={styles.steps}>
                    {result.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.draft && (
                <div className={styles.block}>
                  <div className={styles.draftHead}>
                    <h5>{result.draft.label}</h5>
                    <button type="button" className={styles.linkBtn} onClick={() => void copy(result.draft?.text ?? '')}>
                      <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className={styles.draft}>{result.draft.text}</pre>
                </div>
              )}

              <div className={styles.footer}>
                <span className={styles.source}>{sourceLabel}</span>
                <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => void run(result.action === 'ask' ? 'summarize' : result.action, result.action === 'ask' ? question.trim() || undefined : undefined)}>
                  <RefreshCw size={13} className={busy ? styles.spin : undefined} /> Re-run
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => openAssistant(`${label ? `About ${label}: ` : ''}${result.summary}`)}>
                  <MessageSquareText size={13} /> Continue in assistant
                </button>
              </div>
            </div>
          )}

          <form className={styles.ask} onSubmit={ask}>
            <input
              className={styles.askInput}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything about ${label ?? 'this record'}…`}
              maxLength={600}
              aria-label="Ask AI about this record"
            />
            <button type="submit" className={styles.askBtn} disabled={busy || !question.trim()} aria-label="Ask">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default RecordAiPanel;
