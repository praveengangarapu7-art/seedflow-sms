import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, FileDown, Lock, RefreshCw, ShieldCheck, UserMinus } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  anonymizeFarmerRequest,
  downloadFarmerCsvExport,
  fetchComplianceAudit,
  fetchDataAccessLogs,
  fetchFarmers,
  fetchRetentionCandidates,
  fetchRetentionPolicies,
  updateRetentionPolicy,
  type ComplianceAuditReport,
  type DataAccessLogRow,
  type FarmerRow,
  type RetentionCandidate,
  type RetentionPolicy,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * Data privacy and retention — the personal-data side of administration.
 *
 * Farmers are the only real people whose records this platform holds, so
 * everything here concerns them: subject-access exports, the right to be
 * forgotten (anonymisation, which keeps the agronomic history and removes the
 * identity), retention policies per entity type, and the access log showing
 * who looked at unmasked personal data.
 *
 * Note the split between the two admin roles: only super_admin holds
 * anonymize_farmer_data and manage_retention_policies. A system_admin can run
 * the platform without ever being able to irreversibly erase someone's
 * identity or shorten how long records are kept — those are the two actions
 * here that cannot be undone.
 */
export default function AdminDataPrivacy() {
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();

  const canExport = usePermission('export_farmer_data');
  const canAnonymize = usePermission('anonymize_farmer_data');
  const canManagePolicies = usePermission('manage_retention_policies');

  const [audit, setAudit] = useState<ComplianceAuditReport | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [candidates, setCandidates] = useState<RetentionCandidate[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataAccessLogRow[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [tab, setTab] = useState<'policies' | 'candidates' | 'access'>('policies');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [report, pol, cand, logs, farmerRows] = await Promise.all([
        fetchComplianceAudit(accessToken),
        fetchRetentionPolicies(accessToken),
        fetchRetentionCandidates(accessToken),
        fetchDataAccessLogs(accessToken),
        fetchFarmers(accessToken),
      ]);
      setAudit(report);
      setPolicies(pol);
      setCandidates(cand);
      setAccessLogs(logs);
      setFarmers(farmerRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load privacy data');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token && canAdminister) void load(token);
  }, [token, canAdminister, load]);

  async function handleExport(farmerId: string) {
    if (!token || !farmerId) return;
    setPendingId(`export-${farmerId}`);
    try {
      await downloadFarmerCsvExport(token, farmerId);
      addToast('Subject-access export downloaded.', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to produce the export', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleAnonymize(farmerId: string, name: string) {
    if (!token) return;
    const reason = window.prompt(
      `Anonymise ${name}? Their agronomic history is kept, their identity is removed, and this cannot be undone. Reason:`,
    );
    if (!reason?.trim()) return;
    setPendingId(`anon-${farmerId}`);
    try {
      await anonymizeFarmerRequest(token, farmerId, reason.trim());
      addToast(`${name} anonymised.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to anonymise the record', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handlePolicyChange(policy: RetentionPolicy, retentionDays: number) {
    if (!token || retentionDays === policy.retention_days) return;
    setPendingId(policy.id);
    try {
      await updateRetentionPolicy(token, policy.entity_type, { retentionDays });
      addToast(`${policy.entity_type} retention set to ${retentionDays} days.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to update the policy', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handlePolicyToggle(policy: RetentionPolicy) {
    if (!token) return;
    setPendingId(policy.id);
    try {
      await updateRetentionPolicy(token, policy.entity_type, { isActive: !policy.is_active });
      addToast(`${policy.entity_type} policy ${policy.is_active ? 'paused' : 'enabled'}.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to update the policy', 'error');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Data privacy</h1>
            <p className={styles.subtitle}>
              Subject-access exports, anonymisation, retention policies and the record of who viewed unmasked personal
              data. Farmers are the only people whose personal records this platform holds.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
            </Button>
          </div>
        </div>

        {sessionError && (
          <div className={styles.card}>
            <span className={styles.errorText}>{sessionError}</span>
          </div>
        )}
        {error && (
          <div className={styles.card}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <Lock size={16} />
            Privacy endpoints are Admin-only on the server. This session cannot read personal-data records at all,
            which is the intended behaviour for an oversight role.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard title="Farmer records" value={audit ? String(audit.totalFarmers) : '—'} icon={ShieldCheck} />
          <KpiCard title="Anonymised" value={audit ? String(audit.anonymizedFarmers) : '—'} icon={UserMinus} />
          <KpiCard
            title="Retention candidates"
            value={audit ? String(audit.retentionCandidateCount) : '—'}
            subValue="past their retention window"
            icon={Lock}
          />
          <KpiCard
            title="Unmasked accesses"
            value={audit?.dataAccess ? String(audit.dataAccess.unmaskedAccesses) : '—'}
            subValue={audit?.dataAccess ? `of ${audit.dataAccess.totalAccesses} in ${audit.dataAccess.windowDays} days` : undefined}
            icon={Eye}
          />
        </div>

        {audit && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Compliance principles</h2>
            <p className={styles.sectionSubtitle}>
              How the platform currently stands against each data-protection principle it is designed around.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Principle</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.principles ?? []).map((p) => (
                    <tr key={p.principle}>
                      <td>{p.principle}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${p.status === 'met' ? styles.badgeActive : styles.badgeWarning}`}
                        >
                          {p.status === 'met' ? 'met' : 'needs attention'}
                        </span>
                      </td>
                      <td className={styles.muted}>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {canExport && canAdminister && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Subject-access request</h2>
            <p className={styles.sectionSubtitle}>
              Produces a complete export of one farmer's records — their profile, farms, seed requests, ratings, crop
              plans and inspections — as a CSV they can be handed.
            </p>
            <div className={styles.inlineForm}>
              <div className={styles.field}>
                <label className={styles.label}>Farmer</label>
                <select
                  className={styles.select}
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                >
                  <option value="">— select a farmer —</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.region ? ` — ${f.region}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.actionRow}>
                <Button
                  leftIcon={FileDown}
                  disabled={!selectedFarmerId}
                  isLoading={pendingId === `export-${selectedFarmerId}`}
                  onClick={() => void handleExport(selectedFarmerId)}
                >
                  Download export
                </Button>
                {canAnonymize && (
                  <Button
                    variant="danger"
                    leftIcon={UserMinus}
                    disabled={!selectedFarmerId}
                    isLoading={pendingId === `anon-${selectedFarmerId}`}
                    onClick={() => {
                      const farmer = farmers.find((f) => f.id === selectedFarmerId);
                      if (farmer) void handleAnonymize(farmer.id, farmer.name);
                    }}
                  >
                    Anonymise
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filterBar}>
            <button
              className={`${styles.chip} ${tab === 'policies' ? styles.chipActive : ''}`}
              onClick={() => setTab('policies')}
            >
              Retention policies ({policies.length})
            </button>
            <button
              className={`${styles.chip} ${tab === 'candidates' ? styles.chipActive : ''}`}
              onClick={() => setTab('candidates')}
            >
              Retention candidates ({candidates.length})
            </button>
            <button
              className={`${styles.chip} ${tab === 'access' ? styles.chipActive : ''}`}
              onClick={() => setTab('access')}
            >
              Access log ({accessLogs.length})
            </button>
          </div>

          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : tab === 'policies' ? (
            policies.length === 0 ? (
              <div className={styles.emptyState}>
                {canAdminister ? 'No retention policies defined.' : 'Withheld from this session.'}
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Entity type</th>
                      <th>Retention (days)</th>
                      <th>Action at expiry</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Last changed by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p.id}>
                        <td>{p.entity_type}</td>
                        <td>
                          {canManagePolicies && canAdminister ? (
                            <input
                              className={styles.textInput}
                              type="number"
                              min={1}
                              defaultValue={p.retention_days}
                              disabled={pendingId === p.id}
                              style={{ maxWidth: 110 }}
                              onBlur={(e) => void handlePolicyChange(p, Number(e.target.value))}
                            />
                          ) : (
                            p.retention_days
                          )}
                        </td>
                        <td>{p.action}</td>
                        <td className={styles.muted}>{p.description}</td>
                        <td>
                          {canManagePolicies && canAdminister ? (
                            <button
                              type="button"
                              aria-label={p.is_active ? 'Pause this policy' : 'Enable this policy'}
                              className={`${styles.switch} ${p.is_active ? styles.switchOn : ''}`}
                              disabled={pendingId === p.id}
                              onClick={() => void handlePolicyToggle(p)}
                            >
                              <span className={styles.switchKnob} />
                            </button>
                          ) : (
                            <span
                              className={`${styles.badge} ${p.is_active ? styles.badgeActive : styles.badgeInactive}`}
                            >
                              {p.is_active ? 'Active' : 'Paused'}
                            </span>
                          )}
                        </td>
                        <td>{p.updated_by ?? <span className={styles.muted}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === 'candidates' ? (
            candidates.length === 0 ? (
              <div className={styles.emptyState}>
                No records are past their retention window — nothing is being kept longer than policy allows.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Region</th>
                      <th>Last activity</th>
                      <th>Days inactive</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.farmerId}>
                        <td>{c.name}</td>
                        <td>{c.region}</td>
                        <td>
                          {c.lastActivityAt ? (
                            new Date(c.lastActivityAt).toLocaleDateString()
                          ) : (
                            <span className={styles.muted}>never</span>
                          )}
                        </td>
                        <td>{c.daysSinceActivity ?? '—'}</td>
                        <td>
                          <div className={styles.rowActions}>
                            {canExport && (
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={Download}
                                isLoading={pendingId === `export-${c.farmerId}`}
                                onClick={() => void handleExport(c.farmerId)}
                              >
                                Export first
                              </Button>
                            )}
                            {canAnonymize && canAdminister && (
                              <Button
                                size="sm"
                                variant="danger"
                                leftIcon={UserMinus}
                                isLoading={pendingId === `anon-${c.farmerId}`}
                                onClick={() => void handleAnonymize(c.farmerId, c.name)}
                              >
                                Anonymise
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : accessLogs.length === 0 ? (
            <div className={styles.emptyState}>No personal-data access has been recorded.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Role</th>
                    <th>Access</th>
                    <th>Masked</th>
                    <th>Route</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs.slice(0, 100).map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.accessed_by}</td>
                      <td>{log.accessed_by_role}</td>
                      <td>{log.access_type}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${log.was_masked ? styles.badgeActive : styles.badgeWarning}`}
                        >
                          {log.was_masked ? 'masked' : 'unmasked'}
                        </span>
                      </td>
                      <td className={styles.mono}>{log.route ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
