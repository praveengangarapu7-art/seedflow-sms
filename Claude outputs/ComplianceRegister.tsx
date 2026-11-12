import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Download, ListChecks, Plus, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { qualityNav } from '@/config/qualityNav';
import { usePermission } from '@/hooks/usePermission';
import {
  QUALITY_DEPARTMENTS,
  REQUIREMENT_CATEGORIES,
  createRequirement,
  downloadComplianceGapReport,
  fetchComplianceDashboard,
  fetchRequirements,
  loadComplianceStarterTemplate,
  requirementCategoryLabel,
  type ComplianceDashboardData,
  type QualityDepartment,
  type RequirementCategory,
  type RequirementItem,
} from '@/services/seedLotRealtimeClient';
import { useQualitySession } from './useQualitySession';
import { ErrorCard, Field, Notice, RequirementStatusPill, RiskPill, fmtDate, useQualityAction, useQualityLoad } from './shared';
import styles from './Quality.module.css';

/** The client degrades to [] when the server is unreachable; a dashboard of zeros would read as "all clear". */
function isComplianceDashboard(value: unknown): value is ComplianceDashboardData {
  return typeof value === 'object' && value !== null && 'totals' in value && 'byCategory' in value;
}

type View = 'all' | 'gaps' | 'overdue' | 'not_assessed' | 'compliant';

const blankForm = {
  regulation: '',
  reference: '',
  title: '',
  description: '',
  category: 'licensing' as RequirementCategory,
  department: 'operations' as QualityDepartment,
};

export default function ComplianceRegister() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, error: sessionError } = useQualitySession();
  const canManage = usePermission('manage_compliance');
  const canLoadTemplate = usePermission('load_compliance_template');
  const { run, busy } = useQualityAction();

  const [view, setView] = useState<View>('all');
  const [category, setCategory] = useState('');
  const [risk, setRisk] = useState('');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const requirements = useQualityLoad<RequirementItem[]>(
    token,
    (t) => fetchRequirements(t, { category: category || undefined, risk: risk || undefined, q: search.trim() || undefined }),
    [category, risk, search],
  );
  const dashboard = useQualityLoad<unknown>(token, fetchComplianceDashboard);
  const rows = Array.isArray(requirements.data) ? requirements.data : [];
  const stats = isComplianceDashboard(dashboard.data) ? dashboard.data : null;

  const isGap = (r: RequirementItem) => r.status === 'partially_compliant' || r.status === 'non_compliant';
  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (view === 'gaps') return isGap(r);
        if (view === 'overdue') return r.is_overdue;
        if (view === 'not_assessed') return r.status === 'not_assessed';
        if (view === 'compliant') return r.status === 'compliant';
        return true;
      }),
    [rows, view],
  );

  const views: { key: View; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'gaps', label: 'Gaps', count: rows.filter(isGap).length },
    { key: 'overdue', label: 'Overdue', count: rows.filter((r) => r.is_overdue).length },
    { key: 'not_assessed', label: 'Not assessed', count: rows.filter((r) => r.status === 'not_assessed').length },
    { key: 'compliant', label: 'Compliant', count: rows.filter((r) => r.status === 'compliant').length },
  ];

  const refresh = () => {
    void requirements.reload();
    void dashboard.reload();
  };

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blankForm);

  const submit = async () => {
    if (!token) return;
    if (!form.regulation.trim() || !form.title.trim() || !form.description.trim()) {
      addToast('Regulation, requirement title and description are required.', 'error');
      return;
    }
    const created = await run(
      () =>
        createRequirement(token, {
          regulation: form.regulation.trim(),
          reference: form.reference.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          department: form.department,
        }),
      (r) => `${r.req_code} added to the register`,
    );
    if (created) {
      setShowAdd(false);
      setForm(blankForm);
      refresh();
    }
  };

  const loadTemplate = async () => {
    if (!token) return;
    const done = await run(
      () => loadComplianceStarterTemplate(token),
      (r) => (r.added ? `${r.added} starter requirement(s) added` : 'The starter checklist is already loaded'),
    );
    if (done) refresh();
  };

  const download = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      await downloadComplianceGapReport(token, { category: category || undefined, risk: risk || undefined, q: search.trim() || undefined });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to download the report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const empty = !requirements.loading && rows.length === 0 && !category && !risk && !search;

  return (
    <ModuleLayout moduleName="Quality" moduleIcon={ClipboardCheck} navItems={qualityNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Compliance register</h1>
            <p className={styles.subtitle}>
              Every regulatory, licensing and customer requirement the company must meet, with an assessed status, the gap, its risk, an owner and a
              deadline. A requirement can only be marked compliant once evidence is attached, and a gap is tracked to closure through a non-conformance.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={refresh}>
              Refresh
            </Button>
            <Button variant="secondary" leftIcon={Download} isLoading={downloading} onClick={() => void download()}>
              Gap report (CSV)
            </Button>
            {canManage && (
              <Button leftIcon={Plus} onClick={() => setShowAdd(true)}>
                Add requirement
              </Button>
            )}
          </div>
        </div>

        <ErrorCard message={sessionError ?? requirements.error} />

        {stats && stats.totals.total > 0 && (
          <div className={styles.kpiGrid}>
            <KpiCard
              title="Assessed"
              value={`${stats.assessedOfApplicable.assessed} / ${stats.assessedOfApplicable.applicable}`}
              subValue={`${stats.totals.not_assessed} applicable requirement(s) not yet assessed`}
              icon={ListChecks}
            />
            <KpiCard title="Compliant" value={String(stats.totals.compliant)} subValue={`${stats.totals.not_applicable} not applicable`} icon={ClipboardCheck} />
            <KpiCard
              title="Open gaps"
              value={String(stats.totals.partially_compliant + stats.totals.non_compliant)}
              subValue={`${stats.openGapsByRisk.critical} critical · ${stats.openGapsByRisk.high} high · ${stats.openGapsByRisk.medium} medium · ${stats.openGapsByRisk.low} low`}
              icon={ClipboardCheck}
            />
            <KpiCard
              title="Overdue gaps"
              value={String(stats.totals.overdue_gaps)}
              subValue={`${stats.totals.gaps_without_ncr} gap(s) not yet raised as a non-conformance`}
              icon={ClipboardCheck}
            />
          </div>
        )}

        {empty ? (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p>The register is empty. Start from a checklist of common seed-company requirements, or add your own.</p>
              {canLoadTemplate && (
                <Button leftIcon={ListChecks} isLoading={busy} onClick={() => void loadTemplate()}>
                  Load starter checklist
                </Button>
              )}
              <p className={styles.sectionSubtitle} style={{ marginTop: '0.75rem' }}>
                The starter entries are a neutral first draft. Confirm applicability and the current wording of each with your regulatory counsel.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.filterBar}>
              {views.map((v) => (
                <button key={v.key} className={`${styles.chip} ${view === v.key ? styles.chipActive : ''}`} onClick={() => setView(v.key)}>
                  {v.label} ({v.count})
                </button>
              ))}
              <select className={`${styles.select} ${styles.textInput}`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {REQUIREMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select className={`${styles.select} ${styles.textInput}`} value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk">
                <option value="">Any risk</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                className={styles.textInput}
                type="search"
                placeholder="Search code, title or regulation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search requirements"
              />
            </div>

            <div className={styles.card}>
              {requirements.loading ? (
                <div className={styles.emptyState}>Loading…</div>
              ) : visible.length === 0 ? (
                <div className={styles.emptyState}>Nothing to show for this filter.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Requirement</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Risk</th>
                        <th>Owner</th>
                        <th>Target</th>
                        <th>Evidence</th>
                        <th>NCR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button className={styles.rowButton} onClick={() => navigate(`/quality/compliance/${r.id}`)}>
                              {r.req_code}
                            </button>
                          </td>
                          <td>
                            {r.title}
                            <div className={styles.thresholdNote}>{r.regulation}</div>
                          </td>
                          <td>{requirementCategoryLabel(r.category)}</td>
                          <td>
                            <RequirementStatusPill status={r.status} />
                          </td>
                          <td>
                            <RiskPill risk={r.risk} />
                          </td>
                          <td>{r.responsible_email ?? '—'}</td>
                          <td className={r.is_overdue ? styles.overdue : undefined}>
                            {fmtDate(r.target_date)}
                            {r.is_overdue ? ' · overdue' : ''}
                          </td>
                          <td>{r.evidence_count}</td>
                          <td>{r.ncr_code ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {canLoadTemplate && (
              <p className={styles.sectionSubtitle}>
                <button className={styles.backLink} onClick={() => void loadTemplate()}>
                  Add any missing starter checklist items
                </button>
              </p>
            )}
          </>
        )}

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add a requirement" size="lg">
          <div className={styles.modalStack}>
            <div className={styles.twoCol}>
              <Field label="Regulation / source" htmlFor="req-reg">
                <input id="req-reg" className={styles.textInput} value={form.regulation} maxLength={150} placeholder="e.g. Seeds Rules, 1968" onChange={(e) => setForm({ ...form, regulation: e.target.value })} />
              </Field>
              <Field label="Clause / reference (optional)" htmlFor="req-ref">
                <input id="req-ref" className={styles.textInput} value={form.reference} maxLength={100} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
            </div>
            <Field label="Requirement" htmlFor="req-title">
              <input id="req-title" className={styles.textInput} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div>
              <label className={styles.label} htmlFor="req-desc">
                What the company must be able to show
              </label>
              <textarea id="req-desc" className={styles.textArea} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className={styles.twoCol}>
              <Field label="Category" htmlFor="req-cat">
                <select id="req-cat" className={styles.select} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RequirementCategory })}>
                  {REQUIREMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department" htmlFor="req-dept">
                <select id="req-dept" className={styles.select} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as QualityDepartment })}>
                  {QUALITY_DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Notice>After adding it, open the requirement to record its assessment and attach evidence.</Notice>
            <div className={styles.actionsRow}>
              <Button isLoading={busy} onClick={() => void submit()}>
                Add requirement
              </Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ModuleLayout>
  );
}
