import { useCallback, useEffect, useState } from 'react';
import { Download, FileJson, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  anonymizeFarmerRequest,
  downloadFarmerCsvExport,
  exportFarmerJson,
  fetchComplianceAudit,
  fetchDataAccessLogs,
  fetchFarmers,
  fetchRetentionCandidates,
  fetchRetentionPolicies,
  login,
  updateRetentionPolicy,
  type ComplianceAuditReport,
  type DataAccessLogRow,
  type FarmerRow,
  type RetentionCandidate,
  type RetentionPolicy,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedDataPrivacy.module.css';

export default function SeedDataPrivacy() {
  const [accountIndex, setAccountIndex] = useState(0); // Admin by default — this whole surface is Admin-only
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [audit, setAudit] = useState<ComplianceAuditReport | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [candidates, setCandidates] = useState<RetentionCandidate[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataAccessLogRow[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);

  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [forgetReason, setForgetReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    setForbidden(false);
    try {
      const [auditReport, retentionPolicies, retentionCandidates, logs, farmerList] = await Promise.all([
        fetchComplianceAudit(accessToken),
        fetchRetentionPolicies(accessToken),
        fetchRetentionCandidates(accessToken),
        fetchDataAccessLogs(accessToken),
        fetchFarmers(accessToken),
      ]);
      setAudit(auditReport);
      setPolicies(retentionPolicies);
      setCandidates(retentionCandidates);
      setAccessLogs(logs);
      setFarmers(farmerList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load privacy data';
      if (msg.includes('requires one of these roles')) setForbidden(true);
      else setError(msg);
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
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the privacy service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadAll(token);
  };

  const handleTogglePolicy = async (policy: RetentionPolicy) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await updateRetentionPolicy(token, policy.entity_type, { isActive: !policy.is_active });
      await loadAll(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update policy');
    } finally {
      setBusy(false);
    }
  };

  const handleAnonymize = async (farmerId: string) => {
    if (!token) return;
    if (!forgetReason.trim()) {
      setError('Enter a reason before anonymizing a farmer record.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await anonymizeFarmerRequest(token, farmerId, forgetReason.trim());
      setMessage('Farmer record anonymized.');
      setForgetReason('');
      await loadAll(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to anonymize farmer');
    } finally {
      setBusy(false);
    }
  };

  const handleExportJson = async (farmerId: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await exportFarmerJson(token, farmerId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `farmer-${farmerId}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export farmer data');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = async (farmerId: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await downloadFarmerCsvExport(token, farmerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export farmer data');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Data Privacy &amp; Compliance</h1>
          <p className={styles.subtitle}>
            Farmer PII is the only personal data this system holds. Roles without an operational need (Breeder,
            Inspector) see masked name/phone/location automatically; every read is logged here. Full data export,
            right-to-forget (anonymization), and retention policy controls are below.
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
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      {forbidden ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>{role} cannot view the privacy &amp; compliance dashboard — Admin only.</div>
        </div>
      ) : (
        <>
          <div className={styles.kpiRow}>
            <KpiCard title="Total Farmers" value={String(audit?.totalFarmers ?? 0)} icon={ShieldCheck} />
            <KpiCard title="Anonymized" value={String(audit?.anonymizedFarmers ?? 0)} icon={ShieldCheck} />
            <KpiCard title="Retention Candidates" value={String(audit?.retentionCandidateCount ?? 0)} icon={ShieldAlert} />
            <KpiCard title="Accesses (30d)" value={String(audit?.dataAccess.totalAccesses ?? 0)} icon={ShieldAlert} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Compliance Principles Checklist</h2>
            <p className={styles.sectionSubtitle}>
              General data-protection principles checked against what this system does today — not a certification of
              compliance with any specific named regulation.
            </p>
            {audit?.principles.map((p) => (
              <div key={p.principle} className={styles.principleRow}>
                <span className={`${styles.statusBadge} ${p.status === 'met' ? styles.statusMet : styles.statusAttention}`}>
                  {p.status === 'met' ? 'Met' : 'Needs Attention'}
                </span>
                <div>
                  <strong>{p.principle}</strong>
                  <div className={styles.rowMeta}>{p.note}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Data Retention Policies</h2>
            <table className={styles.table}>
              <thead>
                <tr><th>Entity</th><th>Retention</th><th>Action</th><th>Description</th><th>Status</th></tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td>{p.entity_type}</td>
                    <td>{p.retention_days} days</td>
                    <td>{p.action}</td>
                    <td className={styles.descCell}>{p.description}</td>
                    <td>
                      <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleTogglePolicy(p)}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Retention Candidates</h2>
            <p className={styles.sectionSubtitle}>Farmers past the configured retention window with no recent activity.</p>
            {candidates.length === 0 ? (
              <div className={styles.emptyState}>No farmer currently exceeds the retention window.</div>
            ) : (
              candidates.map((c) => (
                <div key={c.farmerId} className={styles.candidateRow}>
                  <div>
                    <strong>{c.name}</strong> ({c.region}) — {c.daysSinceActivity} days since last activity
                  </div>
                  <Button size="sm" isLoading={busy} onClick={() => void handleAnonymize(c.farmerId)}>Anonymize Now</Button>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Farmer Data Export &amp; Right to Forget</h2>
            <div className={styles.formRow}>
              <select className={styles.select} value={selectedFarmerId} onChange={(e) => setSelectedFarmerId(e.target.value)}>
                <option value="">Select a farmer</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.region}){f.anonymized ? ' — anonymized' : ''}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={FileJson}
                disabled={!selectedFarmerId}
                isLoading={busy}
                onClick={() => void handleExportJson(selectedFarmerId)}
              >
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={Download}
                disabled={!selectedFarmerId}
                isLoading={busy}
                onClick={() => void handleExportCsv(selectedFarmerId)}
              >
                Export CSV
              </Button>
            </div>
            <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
              <input
                className={styles.textInput}
                placeholder="Reason for anonymizing (required)…"
                value={forgetReason}
                onChange={(e) => setForgetReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="danger"
                disabled={!selectedFarmerId}
                isLoading={busy}
                onClick={() => void handleAnonymize(selectedFarmerId)}
              >
                Anonymize (Right to Forget)
              </Button>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Data Access Log</h2>
            {accessLogs.length === 0 ? (
              <div className={styles.emptyState}>No access logged yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>When</th><th>Accessed By</th><th>Role</th><th>Type</th><th>Masked</th><th>Route</th></tr>
                </thead>
                <tbody>
                  {accessLogs.slice(0, 30).map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.accessed_by}</td>
                      <td>{log.accessed_by_role}</td>
                      <td>{log.access_type}</td>
                      <td>{log.was_masked ? 'Yes' : 'No'}</td>
                      <td className={styles.routeCell}>{log.route}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
