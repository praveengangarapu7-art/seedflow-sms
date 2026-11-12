import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Info, Loader2, MessageSquareText, RefreshCw, Sparkles } from 'lucide-react';
import { useBackendSession } from '@/hooks/useBackendSession';
import { openAssistant } from '@/services/assistantBus';
import {
  fetchAiModuleInsights,
  type AiInsightSeverity,
  type AiModuleInsights,
  type AiModuleKey,
} from '@/services/seedLotRealtimeClient';
import styles from './ModuleAiStrip.module.css';

/** Maps a ModuleLayout name to the AI module key; undefined for modules without insights. */
export function aiModuleKeyFor(moduleName: string): AiModuleKey | undefined {
  switch (moduleName) {
    case 'Production Planning':
    case 'Production':
      return 'production';
    case 'Procurement':
      return 'procurement';
    case 'Warehouse':
      return 'warehouse';
    case 'Research & Development':
    case 'R&D':
      return 'rd';
    case 'Processing':
      return 'processing';
    case 'Laboratory':
      return 'laboratory';
    case 'Quality':
      return 'quality';
    case 'Administration':
      return 'administration';
    default:
      return undefined;
  }
}

/**
 * Insights are cached for a minute per module: every page in a module mounts
 * its own layout, so without this each click in the sidebar would re-query.
 * The written briefing (a model call when AI is connected) is only requested
 * when the strip is expanded, never on page load.
 */
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; withBriefing: boolean; data: AiModuleInsights }>();

const SEVERITY_ICON: Record<AiInsightSeverity, typeof Info> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
  good: CheckCircle2,
};

const SEVERITY_LABEL: Record<AiInsightSeverity, string> = { critical: 'Critical', warning: 'Attention', info: 'Note', good: 'OK' };

/** Briefing text from the model or the rules engine: bullets plus a "Next step" line. */
function Briefing({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className={styles.briefing}>
      {lines.map((line, i) =>
        line.startsWith('- ') ? (
          <p key={i}>{line.slice(2)}</p>
        ) : (
          <p key={i} className={line.toLowerCase().startsWith('next step') ? styles.nextStep : undefined}>
            {line}
          </p>
        ),
      )}
    </div>
  );
}

/**
 * The AI Center's view of one module, shown at the top of every module page:
 * a one-line headline with severity counts that expands into the full list of
 * findings, each linking to the records behind it. Everything shown is
 * computed from stored records; the assistant and AI Center links give the
 * deeper analysis. It stays out of the way: collapsed by default, and
 * renders nothing at all if the insights cannot be loaded.
 */
export function ModuleAiStrip({ moduleKey }: { moduleKey: AiModuleKey }) {
  const navigate = useNavigate();
  const { token } = useBackendSession();
  const [data, setData] = useState<AiModuleInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(
    async (withBriefing = false, force = false) => {
      if (!token) return;
      const hit = cache.get(moduleKey);
      if (!force && hit && Date.now() - hit.at < CACHE_MS && (hit.withBriefing || !withBriefing)) {
        setData(hit.data);
        setFailed(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await fetchAiModuleInsights(token, moduleKey, withBriefing);
      // request() returns [] for an unmapped read when the server is unreachable.
        if (!result || Array.isArray(result) || !('insights' in result)) throw new Error('unavailable');
        cache.set(moduleKey, { at: Date.now(), withBriefing, data: result });
        setData(result);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [token, moduleKey],
  );

  useEffect(() => {
    setData(null);
    setOpen(false);
    void load();
  }, [load]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load(true);
  };

  if (failed && !data) return null;
  if (!data) {
    return loading ? (
      <div className={styles.strip} aria-busy="true">
        <span className={styles.badge}>
          <Sparkles size={14} /> AI insights
        </span>
        <span className={styles.loading}>
          <Loader2 size={14} className={styles.spin} /> Reading {moduleKey === 'rd' ? 'R&D' : moduleKey} records…
        </span>
      </div>
    ) : null;
  }

  const counts = { critical: 0, warning: 0, info: 0, good: 0 } as Record<AiInsightSeverity, number>;
  data.insights.forEach((i) => (counts[i.severity] += 1));
  const worst: AiInsightSeverity = data.insights[0]?.severity ?? 'good';
  const go = (link: string | null) => link && navigate(link);

  return (
    <section className={`${styles.strip} ${styles[`tone_${worst}`]}`} aria-label={`${data.label} AI insights`}>
      <div className={styles.row}>
        <span className={styles.badge}>
          <Sparkles size={14} /> AI insights
        </span>
        <button type="button" className={styles.headline} onClick={toggle} aria-expanded={open}>
          {data.headline}
        </button>
        <div className={styles.counts}>
          {(['critical', 'warning', 'info'] as const).map(
            (sev) =>
              counts[sev] > 0 && (
                <span key={sev} className={`${styles.count} ${styles[`count_${sev}`]}`} title={`${counts[sev]} ${SEVERITY_LABEL[sev].toLowerCase()}`}>
                  {counts[sev]} {SEVERITY_LABEL[sev].toLowerCase()}
                </span>
              ),
          )}
        </div>
        <button type="button" className={styles.toggle} onClick={toggle} aria-expanded={open}>
          {open ? 'Hide' : 'View'}
          <ChevronDown size={14} className={open ? styles.chevOpen : undefined} />
        </button>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.metrics}>
            {data.metrics.map((m) => (
              <div key={m.label} className={`${styles.metric} ${styles[`metric_${m.tone}`]}`}>
                <span className={styles.metricValue}>{m.value}</span>
                <span className={styles.metricLabel}>{m.label}</span>
              </div>
            ))}
          </div>

          <ul className={styles.list}>
            {data.insights.map((i) => {
              const Icon = SEVERITY_ICON[i.severity];
              return (
                <li key={i.id} className={`${styles.item} ${styles[`item_${i.severity}`]}`}>
                  <Icon size={18} className={styles.itemIcon} />
                  <div className={styles.itemBody}>
                    <strong>{i.title}</strong>
                    <span>{i.detail}</span>
                    {i.action && <em>{i.action}</em>}
                  </div>
                  <div className={styles.itemActions}>
                    {i.link && (
                      <button type="button" className={styles.linkBtn} onClick={() => go(i.link)}>
                        Open <ArrowRight size={13} />
                      </button>
                    )}
                    {i.aiTab && (
                      <button type="button" className={styles.linkBtn} onClick={() => navigate(`/ai?tab=${i.aiTab}`)}>
                        Analysis <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {data.briefing && (
            <div className={styles.briefingBox}>
              <div className={styles.briefingHead}>
                <span>{data.briefingSource === 'model' ? `Briefing by ${data.model ?? 'AI model'}` : 'Briefing from the SeedSphere rules engine'}</span>
                <button type="button" className={styles.refresh} onClick={() => void load(true, true)} disabled={loading} aria-label="Refresh insights">
                  <RefreshCw size={13} className={loading ? styles.spin : undefined} />
                </button>
              </div>
              <Briefing text={data.briefing} />
            </div>
          )}

          <div className={styles.footer}>
            <span className={styles.askLabel}>
              <MessageSquareText size={14} /> Ask about {data.label}
            </span>
            {data.suggestedQuestions.map((q) => (
              <button key={q} type="button" className={styles.chip} onClick={() => openAssistant(q)}>
                {q}
              </button>
            ))}
            <button type="button" className={styles.centerBtn} onClick={() => navigate('/ai?tab=modules')}>
              Open AI Center <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
