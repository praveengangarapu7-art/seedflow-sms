import { useCallback, useEffect, useState } from 'react';
import { Banknote, FileCheck2, Landmark, RefreshCw, ScrollText } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  activateSubsidyProgram,
  approveGovRegistration,
  approveSubsidyClaim,
  createOrganization,
  createSubsidyProgram,
  deactivateSubsidyProgram,
  fetchAllRegistrations,
  fetchFarmers,
  fetchGovReports,
  fetchLotRegistrations,
  fetchOrganizations,
  fetchSeedLots,
  fetchSubsidyClaims,
  fetchSubsidyPrograms,
  generateGovReport,
  login,
  paySubsidyClaim,
  rejectGovRegistration,
  rejectSubsidyClaim,
  submitGovRegistration,
  submitSubsidyClaim,
  type DistributionReportEntry,
  type FarmerRow,
  type GovernmentReport,
  type GovernmentReportType,
  type LotGovernmentRegistration,
  type OrganizationRow,
  type ProductionReportEntry,
  type QualityReportEntry,
  type RealtimeSeedLot,
  type SeedLotStage,
  type SubsidyClaim,
  type SubsidyProgram,
} from '@/services/seedLotRealtimeClient';
import styles from './GovernmentPrograms.module.css';

const DECISION_ROLES = new Set(['Admin', 'Inspector']);
const SUBMIT_ROLES = new Set(['Admin', 'Breeder', 'Producer']);
const CLAIM_SUBMIT_ROLES = new Set(['Admin', 'Producer', 'Warehouse Manager']);
const STAGES: SeedLotStage[] = ['Breeder', 'Foundation', 'Certified'];

type Tab = 'registrations' | 'programs' | 'claims' | 'reports';

function statusBadgeClass(status: string): string {
  const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function GovernmentPrograms() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('registrations');

  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [authorityOrgId, setAuthorityOrgId] = useState('');

  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [lotRegistrations, setLotRegistrations] = useState<LotGovernmentRegistration[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<LotGovernmentRegistration[]>([]);

  const [programs, setPrograms] = useState<SubsidyProgram[]>([]);
  const [newProgram, setNewProgram] = useState({ name: '', crop: '', minStage: '' as SeedLotStage | '', subsidyAmountPerUnit: '', maxQuantityPerFarmer: '', eligibleRegions: '' });

  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [claims, setClaims] = useState<SubsidyClaim[]>([]);
  const [newClaim, setNewClaim] = useState({ programId: '', farmerId: '', seedLotId: '', quantity: '' });
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});

  const [reports, setReports] = useState<GovernmentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<GovernmentReport | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;
  const authorityOrgs = orgs.filter((o) => o.type === 'government_authority');

  const loadAll = useCallback(async (accessToken: string, authorityId: string) => {
    setError(null);
    try {
      const [lotList, farmerList, programList, claimList, reportList] = await Promise.all([
        fetchSeedLots(accessToken),
        fetchFarmers(accessToken),
        fetchSubsidyPrograms(accessToken),
        fetchSubsidyClaims(accessToken),
        fetchGovReports(accessToken),
      ]);
      setLots(lotList);
      setFarmers(farmerList);
      setPrograms(programList);
      setClaims(claimList);
      setReports(reportList);

      if (authorityId) {
        const pending = await fetchAllRegistrations(accessToken, { authorityOrgId: authorityId });
        setPendingRegistrations(pending.filter((r) => r.status === 'submitted' || r.status === 'under_review'));
      } else {
        setPendingRegistrations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load government programs data');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);

        const orgList = await fetchOrganizations(accessToken);
        if (cancelled) return;
        setOrgs(orgList);
        const firstAuthority = orgList.find((o) => o.type === 'government_authority')?.id ?? '';
        setAuthorityOrgId(firstAuthority);
        await loadAll(accessToken, firstAuthority);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the government programs service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (!token || !selectedLotId) {
      setLotRegistrations([]);
      return;
    }
    fetchLotRegistrations(token, selectedLotId).then(setLotRegistrations).catch(() => setLotRegistrations([]));
  }, [token, selectedLotId]);

  const handleRefresh = () => {
    if (token) void loadAll(token, authorityOrgId);
  };

  const handleAuthorityChange = (id: string) => {
    setAuthorityOrgId(id);
    if (token) void loadAll(token, id);
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAuthority = () =>
    withBusy(async () => {
      if (!token) return;
      const org = await createOrganization(token, { name: 'National Seed Certification Authority', type: 'government_authority' });
      const orgList = await fetchOrganizations(token);
      setOrgs(orgList);
      setAuthorityOrgId(org.id);
      setMessage(`Created government authority "${org.name}".`);
      await loadAll(token, org.id);
    });

  const handleSubmitRegistration = () =>
    withBusy(async () => {
      if (!token || !selectedLotId || !authorityOrgId) {
        setError('Select a seed lot and a government authority first.');
        return;
      }
      const registration = await submitGovRegistration(token, selectedLotId, authorityOrgId);
      setMessage(`Registration ${registration.status === 'approved' ? 'auto-approved' : 'submitted for review'}.`);
      const updated = await fetchLotRegistrations(token, selectedLotId);
      setLotRegistrations(updated);
      await loadAll(token, authorityOrgId);
    });

  const handleRegistrationDecision = (registrationId: string, decision: 'approve' | 'reject') =>
    withBusy(async () => {
      if (!token) return;
      if (decision === 'approve') await approveGovRegistration(token, registrationId);
      else {
        const reason = rejectReasons[registrationId]?.trim();
        if (!reason) {
          setError('Enter a rejection reason.');
          return;
        }
        await rejectGovRegistration(token, registrationId, reason);
      }
      setMessage(`Registration ${decision}d.`);
      await loadAll(token, authorityOrgId);
      if (selectedLotId) setLotRegistrations(await fetchLotRegistrations(token, selectedLotId));
    });

  const handleCreateProgram = () =>
    withBusy(async () => {
      if (!token) return;
      if (!newProgram.name.trim() || !authorityOrgId || !newProgram.subsidyAmountPerUnit) {
        setError('Program name, a government authority, and a subsidy rate are required.');
        return;
      }
      await createSubsidyProgram(token, {
        name: newProgram.name.trim(),
        authorityOrgId,
        crop: newProgram.crop.trim() || undefined,
        minStage: newProgram.minStage || undefined,
        subsidyAmountPerUnit: Number(newProgram.subsidyAmountPerUnit),
        eligibilityCriteria: {
          maxQuantityPerFarmer: newProgram.maxQuantityPerFarmer ? Number(newProgram.maxQuantityPerFarmer) : undefined,
          eligibleRegions: newProgram.eligibleRegions.trim()
            ? newProgram.eligibleRegions.split(',').map((r) => r.trim()).filter(Boolean)
            : undefined,
        },
      });
      setMessage('Subsidy program created.');
      setNewProgram({ name: '', crop: '', minStage: '', subsidyAmountPerUnit: '', maxQuantityPerFarmer: '', eligibleRegions: '' });
      await loadAll(token, authorityOrgId);
    });

  const handleToggleProgram = (program: SubsidyProgram) =>
    withBusy(async () => {
      if (!token) return;
      if (program.is_active) await deactivateSubsidyProgram(token, program.id);
      else await activateSubsidyProgram(token, program.id);
      await loadAll(token, authorityOrgId);
    });

  const handleSubmitClaim = () =>
    withBusy(async () => {
      if (!token) return;
      if (!newClaim.programId || !newClaim.farmerId || !newClaim.seedLotId || !newClaim.quantity) {
        setError('Program, farmer, seed lot, and quantity are all required.');
        return;
      }
      const claim = await submitSubsidyClaim(token, {
        programId: newClaim.programId,
        farmerId: newClaim.farmerId,
        seedLotId: newClaim.seedLotId,
        quantity: Number(newClaim.quantity),
      });
      setMessage(`Claim ${claim.claim_number} submitted for ${claim.claim_amount}.`);
      setNewClaim({ programId: '', farmerId: '', seedLotId: '', quantity: '' });
      await loadAll(token, authorityOrgId);
    });

  const handleClaimAction = (claimId: string, action: 'approve' | 'reject' | 'pay') =>
    withBusy(async () => {
      if (!token) return;
      if (action === 'approve') await approveSubsidyClaim(token, claimId);
      else if (action === 'reject') {
        const reason = rejectReasons[claimId]?.trim();
        if (!reason) {
          setError('Enter a rejection reason.');
          return;
        }
        await rejectSubsidyClaim(token, claimId, reason);
      } else {
        const ref = paymentRefs[claimId]?.trim();
        if (!ref) {
          setError('Enter a payment reference.');
          return;
        }
        await paySubsidyClaim(token, claimId, ref);
      }
      setMessage(`Claim ${action}d.`);
      await loadAll(token, authorityOrgId);
    });

  const handleGenerateReport = (reportType: GovernmentReportType) =>
    withBusy(async () => {
      if (!token) return;
      const report = await generateGovReport(token, reportType);
      setMessage(`${reportType} report generated.`);
      setSelectedReport(report);
      setReports(await fetchGovReports(token));
    });

  const canDecide = DECISION_ROLES.has(role);
  const canSubmitRegistration = SUBMIT_ROLES.has(role);
  const canSubmitClaim = CLAIM_SUBMIT_ROLES.has(role);
  const canManagePrograms = role === 'Admin';
  const activePrograms = programs.filter((p) => p.is_active);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Government Registration &amp; Subsidy Programs</h1>
          <p className={styles.subtitle}>
            Submit seed lots for registration with a government authority, define subsidy programs with eligibility
            criteria, manage farmer subsidy claims linked to seed lots, and generate the reports authorities require.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <select className={styles.select} value={authorityOrgId} onChange={(e) => handleAuthorityChange(e.target.value)}>
            <option value="">Select a government authority</option>
            {authorityOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                Authority: {org.name}
              </option>
            ))}
          </select>
          {role === 'Admin' && authorityOrgs.length === 0 ? (
            <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleCreateAuthority()}>
              Create Authority
            </Button>
          ) : null}
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Pending Registrations" value={String(pendingRegistrations.length)} icon={FileCheck2} />
        <KpiCard title="Active Subsidy Programs" value={String(activePrograms.length)} icon={Landmark} />
        <KpiCard title="Subsidy Claims" value={String(claims.length)} icon={Banknote} />
        <KpiCard title="Reports Generated" value={String(reports.length)} icon={ScrollText} />
      </div>

      <div className={styles.tabBar}>
        {(['registrations', 'programs', 'claims', 'reports'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'registrations' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Submit a Seed Lot for Registration</h2>
            <p className={styles.sectionSubtitle}>
              Certified lots with a valid phytosanitary certificate and germination ≥85% are auto-approved; everything
              else awaits manual review by the authority.
            </p>
            <div className={styles.formRow}>
              <select className={styles.select} value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                <option value="">Select a seed lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lot_code} — {lot.crop} ({lot.stage})
                  </option>
                ))}
              </select>
              <Button size="sm" isLoading={busy} disabled={!canSubmitRegistration} onClick={() => void handleSubmitRegistration()}>
                Submit Registration
              </Button>
            </div>
            {lotRegistrations.length === 0 ? (
              <div className={styles.emptyState}>{selectedLotId ? 'No registrations yet for this lot.' : 'Select a lot to view its registrations.'}</div>
            ) : (
              lotRegistrations.map((reg) => (
                <div key={reg.id} className={styles.row}>
                  <div>
                    <strong>{orgName(reg.authority_org_id)}</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(reg.status)}`} style={{ marginLeft: '0.5rem' }}>{reg.status}</span>
                    <div className={styles.rowMeta}>
                      {reg.registration_number ? `No. ${reg.registration_number}` : reg.rejection_reason ?? 'Awaiting decision'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Registrations Pending Decision{authorityOrgId ? `: ${orgName(authorityOrgId)}` : ''}</h2>
            <p className={styles.sectionSubtitle}>Registrations Inspector/Admin needs to manually approve or reject.</p>
            {!authorityOrgId ? (
              <div className={styles.emptyState}>Select a government authority above.</div>
            ) : pendingRegistrations.length === 0 ? (
              <div className={styles.emptyState}>Nothing pending review.</div>
            ) : (
              pendingRegistrations.map((reg) => (
                <div key={reg.id} className={styles.row}>
                  <div>
                    <strong>Lot {reg.seed_lot_id.slice(0, 8)}…</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(reg.status)}`} style={{ marginLeft: '0.5rem' }}>{reg.status}</span>
                    {canDecide && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <input
                          className={styles.textInput}
                          placeholder="Rejection reason…"
                          value={rejectReasons[reg.id] ?? ''}
                          onChange={(e) => setRejectReasons((prev) => ({ ...prev, [reg.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleRegistrationDecision(reg.id, 'reject')}>Reject</Button>
                      </div>
                    )}
                  </div>
                  {canDecide && (
                    <Button size="sm" isLoading={busy} onClick={() => void handleRegistrationDecision(reg.id, 'approve')}>Approve</Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'programs' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Subsidy Programs</h2>
            {programs.length === 0 ? (
              <div className={styles.emptyState}>No subsidy programs yet.</div>
            ) : (
              programs.map((program) => (
                <div key={program.id} className={styles.row}>
                  <div>
                    <strong>{program.name}</strong>
                    <span className={`${styles.statusBadge} ${program.is_active ? styles.statusActive : styles.statusInactive}`} style={{ marginLeft: '0.5rem' }}>
                      {program.is_active ? 'active' : 'inactive'}
                    </span>
                    <div className={styles.rowMeta}>
                      {program.crop ?? 'Any crop'} · min stage {program.min_stage ?? 'none'} · {program.subsidy_amount_per_unit}/{program.unit}
                      {program.eligibility_criteria.maxQuantityPerFarmer ? ` · cap ${program.eligibility_criteria.maxQuantityPerFarmer}/farmer` : ''}
                    </div>
                  </div>
                  {canManagePrograms && (
                    <Button size="sm" variant={program.is_active ? 'secondary' : 'primary'} isLoading={busy} onClick={() => void handleToggleProgram(program)}>
                      {program.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {canManagePrograms && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Create Subsidy Program</h2>
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="Program name" value={newProgram.name} onChange={(e) => setNewProgram((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="Crop (optional = any)" value={newProgram.crop} onChange={(e) => setNewProgram((p) => ({ ...p, crop: e.target.value }))} />
                <select className={styles.select} value={newProgram.minStage} onChange={(e) => setNewProgram((p) => ({ ...p, minStage: e.target.value as SeedLotStage | '' }))}>
                  <option value="">Any stage</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>Min stage: {s}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <input className={styles.numberInput} type="number" placeholder="Rate/unit" value={newProgram.subsidyAmountPerUnit} onChange={(e) => setNewProgram((p) => ({ ...p, subsidyAmountPerUnit: e.target.value }))} />
                <input className={styles.numberInput} type="number" placeholder="Max/farmer" value={newProgram.maxQuantityPerFarmer} onChange={(e) => setNewProgram((p) => ({ ...p, maxQuantityPerFarmer: e.target.value }))} />
                <input className={styles.textInput} placeholder="Eligible regions (comma-separated, optional)" value={newProgram.eligibleRegions} onChange={(e) => setNewProgram((p) => ({ ...p, eligibleRegions: e.target.value }))} />
              </div>
              <Button size="sm" isLoading={busy} disabled={!authorityOrgId} onClick={() => void handleCreateProgram()}>Create Program</Button>
              {!authorityOrgId ? <p className={styles.rowMeta}>Select (or create) a government authority above first.</p> : null}
            </div>
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Subsidy Claims</h2>
            {claims.length === 0 ? (
              <div className={styles.emptyState}>No subsidy claims yet.</div>
            ) : (
              claims.map((claim) => (
                <div key={claim.id} className={styles.row}>
                  <div>
                    <strong>{claim.claim_number}</strong>
                    <span className={`${styles.statusBadge} ${statusBadgeClass(claim.status)}`} style={{ marginLeft: '0.5rem' }}>{claim.status}</span>
                    <div className={styles.rowMeta}>
                      {farmers.find((f) => f.id === claim.farmer_id)?.name ?? claim.farmer_id} — {claim.quantity} units, amount {claim.claim_amount}
                    </div>
                    {(claim.status === 'submitted' || claim.status === 'under_review') && canDecide && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <input
                          className={styles.textInput}
                          placeholder="Rejection reason…"
                          value={rejectReasons[claim.id] ?? ''}
                          onChange={(e) => setRejectReasons((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleClaimAction(claim.id, 'reject')}>Reject</Button>
                      </div>
                    )}
                    {claim.status === 'approved' && role === 'Admin' && (
                      <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                        <input
                          className={styles.textInput}
                          placeholder="Payment reference…"
                          value={paymentRefs[claim.id] ?? ''}
                          onChange={(e) => setPaymentRefs((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                        />
                        <Button size="sm" isLoading={busy} onClick={() => void handleClaimAction(claim.id, 'pay')}>Mark Paid</Button>
                      </div>
                    )}
                  </div>
                  {(claim.status === 'submitted' || claim.status === 'under_review') && canDecide && (
                    <Button size="sm" isLoading={busy} onClick={() => void handleClaimAction(claim.id, 'approve')}>Approve</Button>
                  )}
                </div>
              ))
            )}
          </div>

          {canSubmitClaim && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Submit a Subsidy Claim</h2>
              <div className={styles.formRow}>
                <select className={styles.select} value={newClaim.programId} onChange={(e) => setNewClaim((c) => ({ ...c, programId: e.target.value }))}>
                  <option value="">Select a program</option>
                  {activePrograms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <select className={styles.select} value={newClaim.farmerId} onChange={(e) => setNewClaim((c) => ({ ...c, farmerId: e.target.value }))}>
                  <option value="">Select a farmer</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.region})</option>
                  ))}
                </select>
              </div>
              <div className={styles.formRow}>
                <select className={styles.select} value={newClaim.seedLotId} onChange={(e) => setNewClaim((c) => ({ ...c, seedLotId: e.target.value }))}>
                  <option value="">Select a seed lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.crop} ({lot.stage})</option>
                  ))}
                </select>
                <input className={styles.numberInput} type="number" placeholder="Quantity" value={newClaim.quantity} onChange={(e) => setNewClaim((c) => ({ ...c, quantity: e.target.value }))} />
              </div>
              <Button size="sm" isLoading={busy} onClick={() => void handleSubmitClaim()}>Submit Claim</Button>
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Government Reports</h2>
              {canDecide && (
                <div className={styles.rowActions}>
                  <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleGenerateReport('production')}>Generate Production</Button>
                  <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleGenerateReport('distribution')}>Generate Distribution</Button>
                  <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleGenerateReport('quality')}>Generate Quality</Button>
                </div>
              )}
            </div>
            {reports.length === 0 ? (
              <div className={styles.emptyState}>No reports generated yet.</div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className={styles.row}>
                  <div>
                    <strong>{report.report_type}</strong>
                    <div className={styles.rowMeta}>Generated by {report.generated_by} on {new Date(report.generated_at).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedReport(report)}>View</Button>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Report Detail</h2>
            {!selectedReport ? (
              <div className={styles.emptyState}>Click "View" on a report to see its data.</div>
            ) : selectedReport.report_type === 'production' ? (
              <table className={styles.table}>
                <thead><tr><th>Crop</th><th>Variety</th><th>Stage</th><th>Lots</th><th>Total Qty</th></tr></thead>
                <tbody>
                  {(selectedReport.snapshot as ProductionReportEntry[]).map((r, i) => (
                    <tr key={i}><td>{r.crop}</td><td>{r.variety}</td><td>{r.stage}</td><td>{r.lotCount}</td><td>{r.totalQuantity.toLocaleString()} {r.unit}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : selectedReport.report_type === 'distribution' ? (
              <table className={styles.table}>
                <thead><tr><th>Crop</th><th>Variety</th><th>Claims</th><th>Farmers</th><th>Qty Claimed</th><th>Subsidy Amount</th></tr></thead>
                <tbody>
                  {(selectedReport.snapshot as DistributionReportEntry[]).map((r, i) => (
                    <tr key={i}><td>{r.crop}</td><td>{r.variety}</td><td>{r.claimCount}</td><td>{r.farmerCount}</td><td>{r.totalQuantityClaimed.toLocaleString()}</td><td>{r.totalSubsidyAmount.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Crop</th><th>Variety</th><th>Lots</th><th>Germination</th><th>Purity</th><th>Viability</th></tr></thead>
                <tbody>
                  {(selectedReport.snapshot as QualityReportEntry[]).map((r, i) => (
                    <tr key={i}>
                      <td>{r.crop}</td><td>{r.variety}</td><td>{r.lotCount}</td>
                      <td>{r.germination.averagePercent != null ? `${r.germination.averagePercent}%` : '—'}</td>
                      <td>{r.purity.averagePercent != null ? `${r.purity.averagePercent}%` : '—'}</td>
                      <td>{r.viability.averagePercent != null ? `${r.viability.averagePercent}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
