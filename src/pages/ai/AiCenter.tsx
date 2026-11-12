import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Camera,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ImagePlus,
  Loader2,
  MessageSquareText,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TopHeader } from '@/components/layout/TopHeader/TopHeader';
import { useBackendSession } from '@/hooks/useBackendSession';
import { openAssistant } from '@/services/assistantBus';
import {
  analyzeCropPhoto,
  fetchAiAllModules,
  fetchAiForecasts,
  fetchAiLabRisk,
  fetchAiStatus,
  type AiForecastReport,
  type AiInsightSeverity,
  type AiLabRiskReport,
  type AiModuleSummary,
  type AiPhotoAnalysis,
  type AiRiskLevel,
  type AiStatus,
  type AiKnowledgeHit,
  searchAiKnowledge,
  reindexAiKnowledge,
} from '@/services/seedLotRealtimeClient';
import { screenPhoto } from '@/services/photoScreening';
import styles from './AiCenter.module.css';

type TabKey = 'overview' | 'modules' | 'risk' | 'forecast' | 'photo' | 'assistant';

const TABS: { key: TabKey; label: string; icon: typeof Sparkles }[] = [
  { key: 'overview', label: 'Overview', icon: Sparkles },
  { key: 'modules', label: 'Across modules', icon: LayoutGrid },
  { key: 'risk', label: 'Lab quality risk', icon: ShieldAlert },
  { key: 'forecast', label: 'Forecasts', icon: TrendingUp },
  { key: 'photo', label: 'Photo analysis', icon: Camera },
  { key: 'assistant', label: 'Assistant', icon: MessageSquareText },
];

const LEVEL_LABEL: Record<AiRiskLevel, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

const STATUS_LABEL: Record<string, string> = {
  shortage: 'Shortage',
  tight: 'Tight',
  healthy: 'Healthy',
  'slow-moving': 'Slow-moving',
};

const STATUS_COLOR: Record<string, string> = {
  shortage: '#C0392B',
  tight: '#D9A521',
  healthy: '#23845A',
  'slow-moving': '#7C8F97',
};

const ASSISTANT_PROMPTS = [
  'Which lots are low on stock?',
  'Any failing lab results?',
  'Show inventory by crop',
  'What is awaiting my approval?',
  'Which seed lots are certified?',
  'Summarise storage conditions',
];

const fmt = (n: number) => n.toLocaleString('en-IN');

/** Renders the model's or rules engine's bullet text as a list. */
function Narrative({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith('- ') || l.startsWith('• '));
  const rest = lines.filter((l) => !(l.startsWith('- ') || l.startsWith('• ')));
  return (
    <div className={styles.narrative}>
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>{b.replace(/^[-•]\s*/, '')}</li>
          ))}
        </ul>
      )}
      {rest.map((r, i) => (
        <p key={i} className={r.toLowerCase().startsWith('next step') ? styles.nextStep : undefined}>
          {r}
        </p>
      ))}
    </div>
  );
}

function SourceChip({ source, model }: { source: 'model' | 'rules'; model: string | null }) {
  return (
    <span className={source === 'model' ? styles.chipModel : styles.chipRules}>
      {source === 'model' ? <Sparkles size={12} /> : <Bot size={12} />}
      {source === 'model' ? `Written by ${model ?? 'AI model'}` : 'SeedSphere rules engine'}
    </span>
  );
}

/** Downscale a photo in the browser so uploads stay well under the API limit. */
async function resizeImage(file: File, maxSide = 1600): Promise<{ base64: string; mediaType: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image'));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AiCenter() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'overview';
  const setTab = (key: TabKey) => setParams(key === 'overview' ? {} : { tab: key }, { replace: true });

  const { token, error: sessionError } = useBackendSession();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [risk, setRisk] = useState<AiLabRiskReport | null>(null);
  const [forecast, setForecast] = useState<AiForecastReport | null>(null);
  const [modules, setModules] = useState<AiModuleSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [s, r, f, m] = await Promise.all([
        fetchAiStatus(token),
        fetchAiLabRisk(token),
        fetchAiForecasts(token),
        fetchAiAllModules(token),
      ]);
      setStatus(s);
      setRisk(r);
      setForecast(f);
      setModules(Array.isArray(m) && m.length > 0 ? m : null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load AI insights');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.root}>
      <TopHeader />
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              <Sparkles size={14} /> SeedSphere AI Center
            </span>
            <h1 className={styles.title}>AI insights across the seed lifecycle</h1>
            <p className={styles.subtitle}>
              Quality-risk scoring for every seed lot, stock and label-expiry forecasts, crop and seed photo analysis, findings
              for every module, and an assistant that answers from live SeedSphere data.
            </p>
          </div>
          <div className={styles.headerActions}>
            <span className={status?.configured ? styles.statusOn : styles.statusOff}>
              <span className={styles.dot} />
              {status === null
                ? 'Checking AI…'
                : status.configured
                  ? `AI model connected · ${status.model}`
                  : 'Rules engine active · AI model not connected'}
            </span>
            <button type="button" className={styles.refresh} onClick={() => void load()} disabled={loading || !token}>
              <RefreshCw size={15} className={loading ? styles.spin : undefined} /> Refresh
            </button>
          </div>
        </header>

        <nav className={styles.tabs} role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? styles.tabActive : styles.tab}
              onClick={() => setTab(key)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        {(sessionError || loadError) && <div className={styles.errorBox}>{sessionError ?? loadError}</div>}

        {tab === 'overview' && (
          <OverviewTab risk={risk} forecast={forecast} modules={modules} loading={loading} onTab={setTab} />
        )}
        {tab === 'modules' && <ModulesTab modules={modules} loading={loading} />}
        {tab === 'risk' && <RiskTab risk={risk} loading={loading} onOpenLot={(id) => navigate(`/seed-lot-detail/${id}`)} />}
        {tab === 'forecast' && <ForecastTab forecast={forecast} loading={loading} />}
        {tab === 'photo' && <PhotoTab token={token} configured={status?.configured ?? false} />}
        {tab === 'assistant' && <AssistantTab token={token} status={status} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Skeleton({ height = 120 }: { height?: number }) {
  return <div className={styles.skeleton} style={{ height }} />;
}

const MODULE_ROUTE: Record<string, string> = {
  production: '/production/dashboard',
  procurement: '/procurement/dashboard',
  warehouse: '/warehouse/dashboard',
  rd: '/rd/dashboard',
  processing: '/processing/dashboard',
  laboratory: '/lab/dashboard',
  quality: '/quality/dashboard',
  administration: '/admin/dashboard',
};

const SEVERITY_CLASS: Record<AiInsightSeverity, string> = {
  critical: styles.sevCritical,
  warning: styles.sevWarning,
  info: styles.sevInfo,
  good: styles.sevGood,
};

const SEVERITY_TEXT: Record<AiInsightSeverity, string> = { critical: 'Critical', warning: 'Attention', info: 'Note', good: 'Healthy' };

function ModulesTab({ modules, loading }: { modules: AiModuleSummary[] | null; loading: boolean }) {
  const navigate = useNavigate();
  if (loading && !modules) {
    return (
      <div className={styles.moduleGrid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={220} />
        ))}
      </div>
    );
  }
  if (!modules) return <div className={styles.errorBox}>Module insights are not available right now.</div>;
  const order: AiInsightSeverity[] = ['critical', 'warning', 'info', 'good'];
  const sorted = [...modules].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  return (
    <>
      <p className={styles.moduleIntro}>
        Every module has its own AI findings, computed from that module's records and linked to the same lot scores and
        forecasts as the rest of the AI Center. The most urgent module is first.
      </p>
      <div className={styles.moduleGrid}>
        {sorted.map((m) => (
          <section key={m.module} className={`${styles.moduleCard} ${SEVERITY_CLASS[m.severity]}`}>
            <div className={styles.moduleHead}>
              <h2>{m.label}</h2>
              <span className={styles.sevChip}>{SEVERITY_TEXT[m.severity]}</span>
            </div>
            <p className={styles.moduleHeadline}>{m.headline}</p>
            <div className={styles.moduleMetrics}>
              {m.metrics.slice(0, 4).map((x) => (
                <div key={x.label} className={styles[`tone_${x.tone}`]}>
                  <strong>{x.value}</strong>
                  <span>{x.label}</span>
                </div>
              ))}
            </div>
            <ul className={styles.moduleList}>
              {m.top.map((i) => (
                <li key={i.id}>
                  <span className={`${styles.dotSev} ${SEVERITY_CLASS[i.severity]}`} />
                  <button type="button" onClick={() => (i.link ? navigate(i.link) : undefined)} disabled={!i.link}>
                    {i.title}
                  </button>
                </li>
              ))}
              {m.top.length === 0 && <li className={styles.moduleOk}>Nothing needs attention.</li>}
            </ul>
            <button type="button" className={styles.linkBtn} onClick={() => navigate(MODULE_ROUTE[m.module])}>
              Open {m.label} <ChevronRight size={14} />
            </button>
          </section>
        ))}
      </div>
    </>
  );
}

function OverviewTab({
  risk,
  forecast,
  modules,
  loading,
  onTab,
}: {
  risk: AiLabRiskReport | null;
  forecast: AiForecastReport | null;
  modules: AiModuleSummary[] | null;
  loading: boolean;
  onTab: (key: TabKey) => void;
}) {
  if (loading && !risk) {
    return (
      <div className={styles.kpiGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={112} />
        ))}
      </div>
    );
  }
  if (!risk || !forecast) return null;
  const expQty = forecast.expiring.reduce((s, l) => s + l.quantityAvailable, 0);
  const short = forecast.crops.filter((c) => c.status === 'shortage' || c.status === 'tight');

  return (
    <>
      <div className={styles.kpiGrid}>
        <button type="button" className={styles.kpi} onClick={() => onTab('risk')}>
          <span className={`${styles.kpiIcon} ${styles.kpiDanger}`}>
            <ShieldAlert size={18} />
          </span>
          <span className={styles.kpiValue}>{risk.summary.critical}</span>
          <span className={styles.kpiLabel}>Critical-risk lots</span>
          <span className={styles.kpiSub}>{risk.summary.high} more at high risk</span>
        </button>
        <button type="button" className={styles.kpi} onClick={() => onTab('risk')}>
          <span className={`${styles.kpiIcon} ${styles.kpiWarn}`}>
            <AlertTriangle size={18} />
          </span>
          <span className={styles.kpiValue}>{fmt(risk.summary.quantityAtRisk)} kg</span>
          <span className={styles.kpiLabel}>Stock exposed to quality risk</span>
          <span className={styles.kpiSub}>across {risk.summary.total} active lots</span>
        </button>
        <button type="button" className={styles.kpi} onClick={() => onTab('forecast')}>
          <span className={`${styles.kpiIcon} ${styles.kpiGold}`}>
            <CalendarClock size={18} />
          </span>
          <span className={styles.kpiValue}>{forecast.expiring.length}</span>
          <span className={styles.kpiLabel}>Lots expiring in {forecast.horizonDays} days</span>
          <span className={styles.kpiSub}>{fmt(expQty)} kg to sell or re-validate</span>
        </button>
        <button type="button" className={styles.kpi} onClick={() => onTab('forecast')}>
          <span className={`${styles.kpiIcon} ${styles.kpiInfo}`}>
            <PackageSearch size={18} />
          </span>
          <span className={styles.kpiValue}>{short.length}</span>
          <span className={styles.kpiLabel}>Crops short of stock</span>
          <span className={styles.kpiSub}>{short.length ? short.map((c) => c.crop).join(', ') : 'all crops covered'}</span>
        </button>
      </div>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>
              <ShieldAlert size={17} /> Quality briefing
            </h2>
            <SourceChip source={risk.narrativeSource} model={risk.model} />
          </div>
          <Narrative text={risk.narrative} />
          <button type="button" className={styles.linkBtn} onClick={() => onTab('risk')}>
            See all lot scores <ChevronRight size={14} />
          </button>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>
              <TrendingUp size={17} /> Supply briefing
            </h2>
            <SourceChip source={forecast.narrativeSource} model={forecast.model} />
          </div>
          <Narrative text={forecast.narrative} />
          <button type="button" className={styles.linkBtn} onClick={() => onTab('forecast')}>
            Open forecasts <ChevronRight size={14} />
          </button>
        </section>
      </div>

      {modules && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>
              <LayoutGrid size={17} /> Across modules
            </h2>
            <button type="button" className={styles.linkBtn} onClick={() => onTab('modules')}>
              See all findings <ChevronRight size={14} />
            </button>
          </div>
          <div className={styles.moduleStrip}>
            {modules.map((m) => (
              <button key={m.module} type="button" className={`${styles.moduleChip} ${SEVERITY_CLASS[m.severity]}`} onClick={() => onTab('modules')}>
                <span className={`${styles.dotSev} ${SEVERITY_CLASS[m.severity]}`} />
                <strong>{m.label}</strong>
                <span>{m.counts.critical + m.counts.warning > 0 ? `${m.counts.critical + m.counts.warning} to review` : 'healthy'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <MessageSquareText size={17} /> Ask SeedSphere
          </h2>
        </div>
        <div className={styles.promptRow}>
          {ASSISTANT_PROMPTS.slice(0, 4).map((q) => (
            <button key={q} type="button" className={styles.prompt} onClick={() => openAssistant(q)}>
              {q}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function RiskTab({
  risk,
  loading,
  onOpenLot,
}: {
  risk: AiLabRiskReport | null;
  loading: boolean;
  onOpenLot: (id: string) => void;
}) {
  const [level, setLevel] = useState<'all' | AiRiskLevel>('all');
  const [open, setOpen] = useState<string | null>(null);
  const lots = useMemo(
    () => (risk?.lots ?? []).filter((l) => level === 'all' || l.riskLevel === level),
    [risk, level],
  );

  if (loading && !risk) return <Skeleton height={360} />;
  if (!risk) return null;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>
          <ShieldAlert size={17} /> Seed lot quality risk
        </h2>
        <div className={styles.segment}>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((l) => (
            <button key={l} type="button" className={level === l ? styles.segActive : styles.seg} onClick={() => setLevel(l)}>
              {l === 'all' ? `All ${risk.summary.total}` : `${LEVEL_LABEL[l]} ${risk.summary[l]}`}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.method}>
        Score 0–100 from the latest germination, purity and viability results against each crop&apos;s certification
        minimum, storage age, lab status and open quality flags. The 90-day germination forecast applies a typical
        storage decline rate per crop.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-label="Expand" />
              <th>Lot</th>
              <th>Crop · variety</th>
              <th className={styles.num}>Germination</th>
              <th className={styles.num}>In 90 days</th>
              <th className={styles.num}>Age</th>
              <th className={styles.num}>Available</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => {
              const expanded = open === l.seedLotId;
              const below = l.germination !== null && l.germination < l.minGermination;
              const willFall =
                l.predictedGermination90d !== null && l.predictedGermination90d < l.minGermination && !below;
              return (
                <Fragment key={l.seedLotId}>
                  <tr className={styles.row} onClick={() => setOpen(expanded ? null : l.seedLotId)}>
                    <td>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                    <td className={styles.code}>{l.lotCode}</td>
                    <td>
                      {l.crop}
                      <span className={styles.muted}> · {l.variety}</span>
                    </td>
                    <td className={`${styles.num} ${below ? styles.bad : ''}`}>
                      {l.germination === null ? '—' : `${l.germination}%`}
                      <span className={styles.muted}> / {l.minGermination}%</span>
                    </td>
                    <td className={`${styles.num} ${willFall ? styles.warnText : ''}`}>
                      {l.predictedGermination90d === null ? '—' : `${l.predictedGermination90d}%`}
                    </td>
                    <td className={styles.num}>{l.ageDays} d</td>
                    <td className={styles.num}>
                      {fmt(l.quantityAvailable)} {l.unit}
                    </td>
                    <td>
                      <div className={styles.scoreCell}>
                        <div className={styles.scoreBar}>
                          <span className={styles[`fill_${l.riskLevel}`]} style={{ width: `${Math.max(4, l.riskScore)}%` }} />
                        </div>
                        <span className={styles[`pill_${l.riskLevel}`]}>
                          {LEVEL_LABEL[l.riskLevel]} {l.riskScore}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className={styles.detailRow}>
                      <td />
                      <td colSpan={7}>
                        <div className={styles.detail}>
                          <div>
                            <h4>Why this score</h4>
                            {l.factors.length === 0 ? (
                              <p className={styles.muted}>No risk factors found.</p>
                            ) : (
                              <ul>
                                {l.factors.map((f) => (
                                  <li key={f.label}>
                                    <span>{f.label}</span>
                                    <b>+{f.points}</b>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <h4>Recommended action</h4>
                            <p>{l.recommendation}</p>
                            <p className={styles.muted}>
                              Purity {l.purity ?? '—'}% · Viability {l.viability ?? '—'}% · Lab status{' '}
                              {l.testingStatus.replace('_', ' ')} · {l.stage} seed
                            </p>
                            <div className={styles.detailActions}>
                              <button type="button" className={styles.linkBtn} onClick={() => onOpenLot(l.seedLotId)}>
                                Open lot <ChevronRight size={14} />
                              </button>
                              <button
                                type="button"
                                className={styles.linkBtn}
                                onClick={() => openAssistant(`Tell me about seed lot ${l.lotCode}`)}
                              >
                                Ask the assistant <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ForecastTab({ forecast, loading }: { forecast: AiForecastReport | null; loading: boolean }) {
  if (loading && !forecast) return <Skeleton height={360} />;
  if (!forecast) return null;
  const chartData = [...forecast.crops]
    .map((c) => ({ ...c, cover: c.monthsOfCover === null ? 24 : Math.min(c.monthsOfCover, 24) }))
    .sort((a, b) => a.cover - b.cover);

  return (
    <>
      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>
              <TrendingUp size={17} /> Months of stock cover by crop
            </h2>
          </div>
          <p className={styles.method}>
            Available stock divided by the average monthly dispatch over the last 90 days. Below 1.5 months is a
            shortage; above 12 months is slow-moving. Crops with no recent dispatch show at the 24-month cap.
          </p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34 + 40)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border-light)" />
                <XAxis type="number" domain={[0, 24]} tick={{ fontSize: 12 }} unit=" mo" />
                <YAxis type="category" dataKey="crop" width={84} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(_v, _n, item) => {
                    const c = item.payload as (typeof chartData)[number];
                    return [
                      c.monthsOfCover === null ? 'No dispatch in 90 days' : `${c.monthsOfCover} months`,
                      STATUS_LABEL[c.status],
                    ];
                  }}
                />
                <ReferenceLine x={1.5} stroke="#C0392B" strokeDasharray="4 4" />
                <ReferenceLine x={12} stroke="#7C8F97" strokeDasharray="4 4" />
                <Bar dataKey="cover" radius={[0, 6, 6, 0]} barSize={18}>
                  {chartData.map((c) => (
                    <Cell key={c.crop} fill={STATUS_COLOR[c.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>
              <Sparkles size={17} /> Supply briefing
            </h2>
            <SourceChip source={forecast.narrativeSource} model={forecast.model} />
          </div>
          <Narrative text={forecast.narrative} />
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <PackageSearch size={17} /> Stock position
          </h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Crop</th>
                <th className={styles.num}>Lots</th>
                <th className={styles.num}>Available (kg)</th>
                <th className={styles.num}>Dispatched, 90 days</th>
                <th className={styles.num}>Per month</th>
                <th className={styles.num}>Cover</th>
                <th>Projected stock-out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {forecast.crops.map((c) => (
                <tr key={c.crop}>
                  <td className={styles.code}>{c.crop}</td>
                  <td className={styles.num}>{c.lots}</td>
                  <td className={styles.num}>{fmt(c.quantityAvailable)}</td>
                  <td className={styles.num}>{fmt(c.allocatedLast90d)}</td>
                  <td className={styles.num}>{fmt(c.monthlyVelocity)}</td>
                  <td className={styles.num}>{c.monthsOfCover === null ? '—' : `${c.monthsOfCover} mo`}</td>
                  <td>{c.projectedStockoutDate ?? '—'}</td>
                  <td>
                    <span className={styles.statusPill} style={{ color: STATUS_COLOR[c.status], borderColor: STATUS_COLOR[c.status] }}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <CalendarClock size={17} /> Lots reaching label validity in {forecast.horizonDays} days
          </h2>
        </div>
        {forecast.expiring.length === 0 ? (
          <p className={styles.muted}>No lots reach label validity in this window.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Crop · variety</th>
                  <th className={styles.num}>Available</th>
                  <th>Validity ends</th>
                  <th className={styles.num}>Days left</th>
                </tr>
              </thead>
              <tbody>
                {forecast.expiring.map((l) => (
                  <tr key={l.seedLotId}>
                    <td className={styles.code}>{l.lotCode}</td>
                    <td>
                      {l.crop}
                      <span className={styles.muted}> · {l.variety}</span>
                    </td>
                    <td className={styles.num}>
                      {fmt(l.quantityAvailable)} {l.unit}
                    </td>
                    <td>{l.expiryDate}</td>
                    <td className={`${styles.num} ${l.daysToExpiry <= 30 ? styles.bad : styles.warnText}`}>{l.daysToExpiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function PhotoTab({ token, configured }: { token: string | null; configured: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<'field' | 'seed'>('field');
  const [crop, setCrop] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiPhotoAnalysis | null>(null);
  const [dragging, setDragging] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPEG, PNG or WebP).');
      return;
    }
    try {
      setImage(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this image');
    }
  }

  async function analyse() {
    if (!token || !image) return;
    setBusy(true);
    setError(null);
    try {
      let analysed: AiPhotoAnalysis | null = null;
      try {
        analysed = await analyzeCropPhoto(token, {
          imageBase64: image.base64,
          mediaType: image.mediaType,
          kind,
          crop: crop || undefined,
          notes: notes || undefined,
        });
      } catch {
        analysed = null;
      }
      // No vision model (or the server is unreachable): fall back to the
      // on-device colour screening so the photo is still screened.
      if (!analysed || !analysed.configured) {
        analysed = await screenPhoto(image.preview, kind, crop || undefined);
      }
      setResult(analysed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.twoCol}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <Camera size={17} /> Analyse a photo
          </h2>
        </div>
        {!configured && (
          <div className={styles.notice}>
            No vision model is connected, so photos get an on-device colour screening (runs in your browser, nothing is
            uploaded). Add <code>AI_API_KEY</code> to the server environment for full AI photo analysis.
          </div>
        )}
        <div className={styles.segment}>
          <button type="button" className={kind === 'field' ? styles.segActive : styles.seg} onClick={() => setKind('field')}>
            Field crop (inspection)
          </button>
          <button type="button" className={kind === 'seed' ? styles.segActive : styles.seg} onClick={() => setKind('seed')}>
            Seed sample (lab)
          </button>
        </div>
        <div
          className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pick(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          {image ? (
            <img src={image.preview} alt="Selected for analysis" className={styles.preview} />
          ) : (
            <>
              <ImagePlus size={30} />
              <strong>Drop a photo here or click to choose</strong>
              <span className={styles.muted}>
                {kind === 'field'
                  ? 'Leaves, plants or a plot: disease, pests, off-types, nutrient stress'
                  : 'Seed spread on a plain tray: purity, damage, discolouration, coating'}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </div>
        <div className={styles.formRow}>
          <label>
            Crop
            <input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="e.g. Maize, Cotton, Soybean" />
          </label>
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Field, lot or symptoms seen" />
          </label>
        </div>
        <button type="button" className={styles.primary} disabled={!image || busy || !token} onClick={() => void analyse()}>
          {busy ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
          {busy ? 'Analysing…' : 'Analyse photo'}
        </button>
        {error && <div className={styles.errorBox}>{error}</div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <Sparkles size={17} /> Result
          </h2>
          {result && <span className={styles.chipModel}>{result.configured ? `Analysed by ${result.model}` : result.model}</span>}
        </div>
        {!result ? (
          <p className={styles.muted}>Choose a photo and select Analyse. Results appear here.</p>
        ) : (
          <div className={styles.result}>
            <div className={styles.resultHead}>
              <span className={styles[`sev_${result.overallSeverity}`]}>
                {result.overallSeverity === 'none' ? 'No issue' : `${result.overallSeverity} severity`}
              </span>
              <span className={styles.muted}>
                {result.subject}
                {result.cropGuess ? ` · ${result.cropGuess}` : ''}
              </span>
            </div>
            <p>{result.summary}</p>
            {result.findings.length > 0 && (
              <>
                <h4>Findings</h4>
                <ul className={styles.findings}>
                  {result.findings.map((f, i) => (
                    <li key={i}>
                      <div className={styles.findingTop}>
                        <b>{f.issue}</b>
                        <span className={styles[`sev_${f.severity}`]}>{f.severity}</span>
                      </div>
                      <span className={styles.muted}>{f.evidence}</span>
                      <div className={styles.conf}>
                        <span style={{ width: `${Math.round(f.confidence * 100)}%` }} />
                      </div>
                      <span className={styles.confLabel}>{Math.round(f.confidence * 100)}% confidence</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.recommendations.length > 0 && (
              <>
                <h4>Recommendations</h4>
                <ul className={styles.bullets}>
                  {result.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
            {result.followUpTests.length > 0 && (
              <>
                <h4>Follow-up tests</h4>
                <ul className={styles.bullets}>
                  {result.followUpTests.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}
            <p className={styles.disclaimer}>
              AI photo analysis supports, but does not replace, a field inspector&apos;s or seed analyst&apos;s
              judgement. Confirm findings with a physical inspection or lab test before acting on a lot.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function AssistantTab({ token, status }: { token: string | null; status: AiStatus | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AiKnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [counts, setCounts] = useState(status?.knowledge ?? null);
  useEffect(() => setCounts(status?.knowledge ?? null), [status]);

  async function search(query: string) {
    const text = query.trim();
    if (!token || !text) return;
    setSearching(true);
    try {
      setHits(await searchAiKnowledge(token, text));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  async function reindex() {
    if (!token) return;
    setInfo('Re-indexing…');
    try {
      const r = await reindexAiKnowledge(token);
      setCounts({ total: r.indexed, bySource: r.bySource });
      setInfo(`Indexed ${r.indexed} documents.`);
    } catch {
      setInfo('Only an administrator can re-index the knowledge base.');
    }
  }

  const modelLine = status?.configured
    ? `${status.provider ?? 'model'} · ${status.models?.chat ?? status.model}`
    : 'built-in engine (no model key)';

  return (
    <div className={styles.twoCol}>
      <section className={`${styles.panel} ${styles.assistantPanel}`}>
        <div className={styles.assistantIcon}>
          <MessageSquareText size={28} />
        </div>
        <h2>Ask SeedSphere anything about your operation</h2>
        <p className={styles.muted}>
          The assistant answers from live records (seed lots, lab results, storage, approvals, farmer requests) and from
          the knowledge base (your SOPs, compliance register, quality records and seed-science guides). Every answer
          shows the records and sources it used, and it remembers the conversation. It is available on every page from
          the Ask SeedSphere button.
        </p>
        <div className={styles.aiFacts}>
          <span>
            <b>Model</b> {modelLine}
          </span>
          {status?.models && (
            <span>
              <b>Vision</b> {status.models.vision}
            </span>
          )}
          <span>
            <b>Knowledge</b> {counts ? `${counts.total} documents` : '—'}
          </span>
        </div>
        <div className={styles.promptRow}>
          {ASSISTANT_PROMPTS.map((p) => (
            <button key={p} type="button" className={styles.prompt} onClick={() => openAssistant(p)}>
              {p}
            </button>
          ))}
        </div>
        <button type="button" className={styles.primary} onClick={() => openAssistant()}>
          <Sparkles size={16} /> Open the assistant
        </button>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>
            <BookOpen size={17} /> Knowledge base
          </h2>
          <button type="button" className={styles.linkBtn} onClick={() => void reindex()}>
            Re-index
          </button>
        </div>
        <p className={styles.muted}>
          This is the search the assistant runs before it answers. Try it directly to see which passages it would use.
        </p>
        <form
          className={styles.kbSearch}
          onSubmit={(e) => {
            e.preventDefault();
            void search(q);
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. germination failed, quality hold, seed treatment" />
          <button type="submit" className={styles.primary} disabled={!q.trim() || searching || !token}>
            {searching ? <Loader2 size={16} className={styles.spin} /> : <Search size={16} />} Search
          </button>
        </form>
        {counts && (
          <div className={styles.kbCounts}>
            {Object.entries(counts.bySource).map(([k, v]) => (
              <span key={k}>
                {k} · {v}
              </span>
            ))}
          </div>
        )}
        {info && <p className={styles.muted}>{info}</p>}
        {hits && hits.length === 0 && <p className={styles.muted}>No matching passages. Try different words.</p>}
        <ul className={styles.kbHits}>
          {(hits ?? []).map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => navigate(h.path)}>
                <b>{h.title}</b>
                <span className={styles.kbMeta}>
                  {h.module} · {h.sourceType}
                </span>
              </button>
              <p>{h.passage}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
