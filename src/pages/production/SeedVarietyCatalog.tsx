import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Leaf, PlusCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  COMMITTEE_ROLES,
  DEMO_ACCOUNTS,
  createVariety,
  createVarietyVersion,
  deprecateVariety,
  fetchOrganizations,
  fetchVarietyById,
  fetchVarieties,
  reviewVariety,
  submitVarietyForReview,
  updateVarietyDraft,
  login,
  type DiseaseResistanceEntry,
  type MarketDemandTrend,
  type OrganizationRow,
  type ResistanceLevel,
  type ReviewDecision,
  type VarietyStatus,
  type VarietyWithLatestVersion,
  type VarietyWithVersions,
  type VersionStatus,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedVarietyCatalog.module.css';

const RESISTANCE_LEVELS: ResistanceLevel[] = ['high', 'moderate', 'low', 'susceptible'];
const MARKET_TRENDS: MarketDemandTrend[] = ['rising', 'stable', 'declining'];

function varietyStatusClass(status: VarietyStatus): string {
  return (
    {
      draft: styles.statusDraft,
      pending_review: styles.statusPendingReview,
      approved: styles.statusApproved,
      rejected: styles.statusRejected,
      deprecated: styles.statusDeprecated,
    }[status] ?? styles.statusDraft
  );
}

function versionStatusClass(status: VersionStatus): string {
  return (
    {
      draft: styles.statusDraft,
      issued: styles.statusApproved,
      superseded: styles.statusDeprecated,
    }[status] ?? styles.statusDraft
  );
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

interface DiseaseRow extends DiseaseResistanceEntry {}

function DiseaseResistanceEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: DiseaseRow[];
  onChange: (rows: DiseaseRow[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>Disease Resistance Profile</label>
      {rows.map((row, index) => (
        <div key={index} className={styles.diseaseRow}>
          <Input
            placeholder="Disease name"
            value={row.disease}
            disabled={disabled}
            onChange={(e) => onChange(rows.map((r, i) => (i === index ? { ...r, disease: e.target.value } : r)))}
          />
          <select
            className={styles.select}
            value={row.resistanceLevel}
            disabled={disabled}
            onChange={(e) =>
              onChange(rows.map((r, i) => (i === index ? { ...r, resistanceLevel: e.target.value as ResistanceLevel } : r)))
            }
          >
            {RESISTANCE_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          {!disabled ? (
            <button type="button" className={styles.removeRowBtn} onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              ×
            </button>
          ) : null}
        </div>
      ))}
      {!disabled ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...rows, { disease: '', resistanceLevel: 'moderate' }])}>
          + Add Disease
        </Button>
      ) : null}
    </div>
  );
}

export default function SeedVarietyCatalog() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(1); // Breeder by default
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[1].role);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);

  const [varieties, setVarieties] = useState<VarietyWithLatestVersion[]>([]);
  const [filterCrop, setFilterCrop] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VarietyWithVersions | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create-new-variety form
  const [newCrop, setNewCrop] = useState('');
  const [newVarietyName, setNewVarietyName] = useState('');
  const [newBotanicalName, setNewBotanicalName] = useState('');
  const [newLocalNames, setNewLocalNames] = useState('');
  const [newSeason, setNewSeason] = useState('');
  const [newOrgId, setNewOrgId] = useState('');

  // Edit-draft form (also reused for creating a new season version)
  const [editBotanicalName, setEditBotanicalName] = useState('');
  const [editLocalNames, setEditLocalNames] = useState('');
  const [editSeason, setEditSeason] = useState('');
  const [editAgroClimatic, setEditAgroClimatic] = useState('');
  const [editYield, setEditYield] = useState('');
  const [editYieldUnit, setEditYieldUnit] = useState('kg');
  const [editDiseaseRows, setEditDiseaseRows] = useState<DiseaseRow[]>([]);
  const [editTrend, setEditTrend] = useState<MarketDemandTrend | ''>('');
  const [editNotes, setEditNotes] = useState('');

  // Committee review form
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>('approved');
  const [reviewComments, setReviewComments] = useState('');

  // Deprecate form
  const [deprecateReason, setDeprecateReason] = useState('');
  const [showDeprecateInput, setShowDeprecateInput] = useState(false);

  const refreshList = useCallback(async (accessToken: string, crop?: string, status?: string) => {
    const list = await fetchVarieties(accessToken, { crop: crop || undefined, status: status || undefined });
    setVarieties(list);
    return list;
  }, []);

  const loadDetail = useCallback(async (accessToken: string, id: string) => {
    const result = await fetchVarietyById(accessToken, id);
    setDetail(result);
    const latest = result.versions[0];
    setEditBotanicalName(result.botanical_name);
    setEditLocalNames(result.local_names.join(', '));
    setEditSeason(latest?.season ?? '');
    setEditAgroClimatic(latest?.agro_climatic_suitability.join(', ') ?? '');
    setEditYield(latest?.yield_benchmark_per_acre != null ? String(latest.yield_benchmark_per_acre) : '');
    setEditYieldUnit(latest?.yield_unit ?? 'kg');
    setEditDiseaseRows(latest?.disease_resistance_profile ?? []);
    setEditTrend(latest?.market_demand_trend ?? '');
    setEditNotes(latest?.notes ?? '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      setSelectedId(null);
      setDetail(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);

        const [list] = await Promise.all([refreshList(accessToken), fetchOrganizations(accessToken).then(setOrganizations)]);
        if (cancelled) return;
        if (list.length > 0) {
          setSelectedId(list[0].id);
          await loadDetail(accessToken, list[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the variety catalog service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleSelect = async (id: string) => {
    if (!token) return;
    setSelectedId(id);
    setShowDeprecateInput(false);
    setReviewComments('');
    try {
      await loadDetail(token, id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load variety', 'error');
    }
  };

  const handleFilter = async () => {
    if (!token) return;
    await refreshList(token, filterCrop, filterStatus);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (!newCrop.trim() || !newVarietyName.trim() || !newBotanicalName.trim() || !newSeason.trim()) {
      setError('Crop, variety name, botanical name, and season are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createVariety(token, {
        crop: newCrop.trim(),
        varietyName: newVarietyName.trim(),
        botanicalName: newBotanicalName.trim(),
        localNames: splitList(newLocalNames),
        season: newSeason.trim(),
        organizationId: role === 'Admin' ? newOrgId || undefined : undefined,
      });
      addToast('Variety registered as draft', 'success');
      setNewCrop('');
      setNewVarietyName('');
      setNewBotanicalName('');
      setNewLocalNames('');
      setNewSeason('');
      await refreshList(token, filterCrop, filterStatus);
      setSelectedId(created.id);
      await loadDetail(token, created.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register variety';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const buildTraitPayload = () => ({
    botanicalName: editBotanicalName.trim() || undefined,
    localNames: splitList(editLocalNames),
    season: editSeason.trim() || undefined,
    agroClimaticSuitability: splitList(editAgroClimatic),
    yieldBenchmarkPerAcre: editYield ? Number(editYield) : undefined,
    yieldUnit: editYieldUnit.trim() || undefined,
    diseaseResistanceProfile: editDiseaseRows.filter((r) => r.disease.trim()),
    marketDemandTrend: editTrend || undefined,
    notes: editNotes.trim() || undefined,
  });

  const handleSaveDraft = async () => {
    if (!token || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateVarietyDraft(token, selectedId, buildTraitPayload());
      addToast('Draft saved', 'success');
      await refreshList(token, filterCrop, filterStatus);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save draft';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!token || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitVarietyForReview(token, selectedId);
      addToast('Submitted for breeding committee review', 'success');
      await refreshList(token, filterCrop, filterStatus);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit for review';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!token || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createVarietyVersion(token, selectedId, buildTraitPayload());
      addToast('New season version drafted', 'success');
      await refreshList(token, filterCrop, filterStatus);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to draft a new version';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!token || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await reviewVariety(token, selectedId, { decision: reviewDecision, comments: reviewComments.trim() || undefined });
      addToast('Review recorded', 'success');
      setReviewComments('');
      await refreshList(token, filterCrop, filterStatus);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record review';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeprecate = async () => {
    if (!token || !selectedId) return;
    if (!deprecateReason.trim()) {
      setError('Enter a reason before deprecating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deprecateVariety(token, selectedId, deprecateReason.trim());
      addToast('Variety deprecated', 'success');
      setShowDeprecateInput(false);
      setDeprecateReason('');
      await refreshList(token, filterCrop, filterStatus);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to deprecate variety';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isCommittee = COMMITTEE_ROLES.includes(role);
  const canManage = role === 'Admin' || role === 'Breeder';
  const latestVersion = detail?.versions[0] ?? null;
  const canEditDraft = detail && (detail.status === 'draft' || detail.status === 'rejected') && latestVersion?.status === 'draft';
  const canReview = detail && detail.status === 'pending_review' && isCommittee;
  const canCreateVersion = detail && detail.status === 'approved';
  const approvedCount = varieties.filter((v) => v.status === 'approved').length;
  const pendingCount = varieties.filter((v) => v.status === 'pending_review').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Variety Catalog &amp; Breeding Committee Approval</h1>
          <p className={styles.subtitle}>
            Botanical identity, agro-climatic suitability, yield benchmarks, disease resistance, and market demand — every
            trait version-controlled across seasons and gated by breeding-committee review before registration.
          </p>
        </div>
        <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
          {DEMO_ACCOUNTS.map((account, index) => (
            <option key={account.email} value={index}>
              Viewing as: {account.role}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.kpiRow}>
        <KpiCard title="Catalog Size" value={String(varieties.length)} icon={Leaf} />
        <KpiCard title="Approved Varieties" value={String(approvedCount)} icon={Leaf} />
        <KpiCard title="Pending Committee Review" value={String(pendingCount)} icon={Leaf} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Register New Variety</h2>
            <p className={styles.sectionSubtitle}>Admin or Breeder. Fill in trait data afterward before submitting for review.</p>
            <form className={styles.form} onSubmit={handleCreate}>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="newCrop">Crop</label>
                  <Input id="newCrop" value={newCrop} onChange={(e) => setNewCrop(e.target.value)} placeholder="e.g. Paddy" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="newVarietyName">Variety Name</label>
                  <Input id="newVarietyName" value={newVarietyName} onChange={(e) => setNewVarietyName(e.target.value)} placeholder="e.g. PaddyGold-99" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="newBotanicalName">Botanical Name</label>
                <Input id="newBotanicalName" value={newBotanicalName} onChange={(e) => setNewBotanicalName(e.target.value)} placeholder="e.g. Oryza sativa" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="newLocalNames">Local Names (comma-separated)</label>
                <Input id="newLocalNames" value={newLocalNames} onChange={(e) => setNewLocalNames(e.target.value)} placeholder="e.g. Bangaru Vadlu, Swarna" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="newSeason">Season</label>
                <Input id="newSeason" value={newSeason} onChange={(e) => setNewSeason(e.target.value)} placeholder="e.g. Kharif 2026" />
              </div>
              {role === 'Admin' ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="newOrgId">Owning Organization</label>
                  <select id="newOrgId" className={styles.select} value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)}>
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <Button type="submit" leftIcon={PlusCircle} isLoading={submitting} disabled={!canManage}>Register Variety</Button>
              {!canManage ? <span className={styles.hint}>{role} cannot register varieties.</span> : null}
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Catalog</h2>
            <div className={styles.controls}>
              <Input placeholder="Filter by crop…" value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)} />
              <select className={styles.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="deprecated">Deprecated</option>
              </select>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleFilter()}>Apply</Button>
            </div>
            {varieties.length === 0 ? (
              <div className={styles.emptyState}>No varieties in the catalog yet.</div>
            ) : (
              varieties.map((variety) => (
                <div
                  key={variety.id}
                  className={`${styles.varietyRow} ${selectedId === variety.id ? styles.varietyRowActive : ''}`}
                  onClick={() => void handleSelect(variety.id)}
                >
                  <div>
                    <strong>{variety.variety_name}</strong>
                    <div className={styles.rowMeta}>{variety.crop} · {variety.botanical_name} · v{variety.latestVersion?.version ?? '—'}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${varietyStatusClass(variety.status)}`}>{variety.status.replace('_', ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          {detail ? (
            <>
              <div className={styles.card}>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>{detail.variety_name}</h2>
                    <p className={styles.sectionSubtitle}>{detail.crop} · {detail.botanical_name}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${varietyStatusClass(detail.status)}`}>{detail.status.replace('_', ' ')}</span>
                </div>
                <div className={styles.traitGrid}>
                  <div><span className={styles.traitLabel}>Local Names</span>{detail.local_names.join(', ') || '—'}</div>
                  {latestVersion ? (
                    <>
                      <div><span className={styles.traitLabel}>Season</span>{latestVersion.season}</div>
                      <div><span className={styles.traitLabel}>Agro-Climatic Suitability</span>{latestVersion.agro_climatic_suitability.join(', ') || '—'}</div>
                      <div><span className={styles.traitLabel}>Yield Benchmark</span>{latestVersion.yield_benchmark_per_acre != null ? `${latestVersion.yield_benchmark_per_acre} ${latestVersion.yield_unit}/acre` : '—'}</div>
                      <div><span className={styles.traitLabel}>Disease Resistance</span>{latestVersion.disease_resistance_profile.length > 0 ? latestVersion.disease_resistance_profile.map((d) => `${d.disease} (${d.resistanceLevel})`).join(', ') : '—'}</div>
                      <div><span className={styles.traitLabel}>Market Demand Trend</span>{latestVersion.market_demand_trend ?? '—'}</div>
                    </>
                  ) : null}
                </div>

                {role === 'Admin' && detail.status !== 'deprecated' ? (
                  <div className={styles.deprecateBox}>
                    {showDeprecateInput ? (
                      <>
                        <textarea className={styles.textarea} placeholder="Reason for deprecating…" value={deprecateReason} onChange={(e) => setDeprecateReason(e.target.value)} />
                        <Button type="button" variant="danger" size="sm" isLoading={submitting} onClick={() => void handleDeprecate()}>Confirm Deprecate</Button>
                      </>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowDeprecateInput(true)}>Deprecate Variety</Button>
                    )}
                  </div>
                ) : null}
              </div>

              {canEditDraft ? (
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Edit Draft</h2>
                  <p className={styles.sectionSubtitle}>All fields below must be complete before the committee will accept a submission.</p>
                  <div className={styles.form}>
                    <div className={styles.field}>
                      <label className={styles.label}>Botanical Name</label>
                      <Input value={editBotanicalName} onChange={(e) => setEditBotanicalName(e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Local Names (comma-separated)</label>
                      <Input value={editLocalNames} onChange={(e) => setEditLocalNames(e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Season</label>
                      <Input value={editSeason} onChange={(e) => setEditSeason(e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Agro-Climatic Suitability (comma-separated zones)</label>
                      <Input value={editAgroClimatic} onChange={(e) => setEditAgroClimatic(e.target.value)} />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Yield Benchmark (per acre)</label>
                        <Input type="number" min="0" step="0.01" value={editYield} onChange={(e) => setEditYield(e.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Unit</label>
                        <Input value={editYieldUnit} onChange={(e) => setEditYieldUnit(e.target.value)} />
                      </div>
                    </div>
                    <DiseaseResistanceEditor rows={editDiseaseRows} onChange={setEditDiseaseRows} />
                    <div className={styles.field}>
                      <label className={styles.label}>Market Demand Trend</label>
                      <select className={styles.select} value={editTrend} onChange={(e) => setEditTrend(e.target.value as MarketDemandTrend)}>
                        <option value="">Select trend</option>
                        {MARKET_TRENDS.map((trend) => (
                          <option key={trend} value={trend}>{trend}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Notes</label>
                      <textarea className={styles.textarea} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                    </div>
                    <div className={styles.controls}>
                      <Button type="button" variant="secondary" isLoading={submitting} disabled={!canManage} onClick={() => void handleSaveDraft()}>Save Draft</Button>
                      <Button type="button" leftIcon={CheckCircle2} isLoading={submitting} disabled={!canManage} onClick={() => void handleSubmitForReview()}>Submit for Committee Review</Button>
                    </div>
                    {!canManage ? <span className={styles.hint}>{role} cannot edit or submit varieties.</span> : null}
                  </div>
                </div>
              ) : null}

              {canCreateVersion ? (
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Draft a New Season Version</h2>
                  <p className={styles.sectionSubtitle}>Traits drift season to season — start a new version without touching the currently issued one.</p>
                  <div className={styles.form}>
                    <div className={styles.field}>
                      <label className={styles.label}>Season</label>
                      <Input value={editSeason} onChange={(e) => setEditSeason(e.target.value)} placeholder="e.g. Rabi 2026" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Agro-Climatic Suitability (comma-separated zones)</label>
                      <Input value={editAgroClimatic} onChange={(e) => setEditAgroClimatic(e.target.value)} />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Yield Benchmark (per acre)</label>
                        <Input type="number" min="0" step="0.01" value={editYield} onChange={(e) => setEditYield(e.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Unit</label>
                        <Input value={editYieldUnit} onChange={(e) => setEditYieldUnit(e.target.value)} />
                      </div>
                    </div>
                    <DiseaseResistanceEditor rows={editDiseaseRows} onChange={setEditDiseaseRows} />
                    <div className={styles.field}>
                      <label className={styles.label}>Market Demand Trend</label>
                      <select className={styles.select} value={editTrend} onChange={(e) => setEditTrend(e.target.value as MarketDemandTrend)}>
                        <option value="">Select trend</option>
                        {MARKET_TRENDS.map((trend) => (
                          <option key={trend} value={trend}>{trend}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Notes</label>
                      <textarea className={styles.textarea} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                    </div>
                    <Button type="button" leftIcon={PlusCircle} isLoading={submitting} disabled={!canManage} onClick={() => void handleCreateVersion()}>Create Draft Version</Button>
                    {!canManage ? <span className={styles.hint}>{role} cannot draft new versions.</span> : null}
                  </div>
                </div>
              ) : null}

              {canReview ? (
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Breeding Committee Review</h2>
                  <p className={styles.sectionSubtitle}>Admin or Breeder — but never the same account that submitted this version.</p>
                  <div className={styles.form}>
                    <div className={styles.field}>
                      <label className={styles.label}>Decision</label>
                      <select className={styles.select} value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as ReviewDecision)}>
                        <option value="approved">Approve</option>
                        <option value="changes_requested">Request Changes</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Comments</label>
                      <textarea className={styles.textarea} value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} placeholder="Trial data, field notes, rationale…" />
                    </div>
                    <Button
                      type="button"
                      leftIcon={reviewDecision === 'rejected' ? XCircle : CheckCircle2}
                      variant={reviewDecision === 'rejected' ? 'danger' : 'primary'}
                      isLoading={submitting}
                      onClick={() => void handleReview()}
                    >
                      Submit Review
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Version History</h2>
                {detail.versions.map((version) => (
                  <div key={version.id} className={styles.versionBlock}>
                    <div className={styles.versionHeader}>
                      <strong>v{version.version} — {version.season}</strong>
                      <span className={`${styles.statusBadge} ${versionStatusClass(version.status)}`}>{version.status}</span>
                    </div>
                    <div className={styles.rowMeta}>Submitted by {version.submitted_by} on {new Date(version.created_at).toLocaleString()}</div>
                    {version.reviews.length > 0 ? (
                      <div className={styles.reviewList}>
                        {version.reviews.map((review) => (
                          <div key={review.id} className={styles.reviewItem}>
                            <span className={`${styles.statusBadge} ${varietyStatusClass(review.decision === 'approved' ? 'approved' : review.decision === 'rejected' ? 'rejected' : 'draft')}`}>
                              {review.decision.replace('_', ' ')}
                            </span>
                            {' '}by {review.reviewer} ({review.reviewer_role}) — {review.comments || 'no comments'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.rowMeta}>No committee reviews yet.</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.card}>
              <div className={styles.emptyState}>Select a variety from the catalog to see its details.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
