import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FlaskConical, GitBranch, RefreshCw, Snowflake, Wifi, WifiOff, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { GenealogyTree } from '@/components/GenealogyTree/GenealogyTree';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from '@/pages/master-data/useRealBackendSession';
import {
  connectInventorySocket,
  fetchExpirationStatuses,
  fetchGenealogy,
  fetchLabQualityFlags,
  fetchLabSubmissions,
  fetchOrganizations,
  fetchSeedLotById,
  recordLabTestResult,
  submitSampleBatch,
  type ExpirationEntry,
  type GenealogyResult,
  type InventorySocketEvent,
  type LabQualityFlag,
  type LabTestSubmission,
  type LabTestType,
  type OrganizationRow,
  type RealtimeSeedLot,
  type TestingStatus,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedLotDetail.module.css';

const ALL_TEST_TYPES: LabTestType[] = ['germination', 'purity', 'vigor'];

const METRIC_FIELDS: Record<LabTestType, { a: string; b: string; aLabel: string; bLabel: string }> = {
  germination: { a: 'sampleSize', b: 'germinatedCount', aLabel: 'Sample Size', bLabel: 'Germinated Count' },
  purity: { a: 'sampleWeight', b: 'pureSeedWeight', aLabel: 'Sample Weight (g)', bLabel: 'Pure Seed Weight (g)' },
  vigor: { a: 'sampleSize', b: 'vigorCount', aLabel: 'Sample Size', bLabel: 'Vigor-Passing Count' },
};

const TESTING_STATUS_LABEL: Record<TestingStatus, string> = {
  not_submitted: 'Not Submitted',
  testing: 'Testing',
  certified: 'Certified',
  rejected: 'Rejected',
};

const TESTING_STATUS_BADGE_CLASS: Record<TestingStatus, string> = {
  not_submitted: 'badgeNotSubmitted',
  testing: 'badgeTesting',
  certified: 'badgeCertified',
  rejected: 'badgeRejected',
};

function TestingStatusBadge({ status }: { status: TestingStatus }) {
  const icon =
    status === 'certified' ? <CheckCircle2 size={13} /> : status === 'rejected' ? <XCircle size={13} /> : null;
  return (
    <span className={`${styles.badge} ${styles[TESTING_STATUS_BADGE_CLASS[status]]}`}>
      {icon}
      {TESTING_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Seed Testing & Certification Integration (Extend #15): submit a seed lot
 * for lab testing, watch it move through Testing -> Certified/Rejected as
 * results come back, and see the full test report for the lot — all on one
 * page, with the testing status kept live via the same WebSocket feed
 * SeedLotInventory.tsx uses (see server/src/modules/labTesting for the
 * server side of the status transition and the broadcast).
 */
export default function SeedLotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token, role, loading: sessionLoading } = useRealBackendSession();

  const [lot, setLot] = useState<RealtimeSeedLot | null>(null);
  const [labs, setLabs] = useState<OrganizationRow[]>([]);
  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [qualityFlags, setQualityFlags] = useState<LabQualityFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqLabId, setReqLabId] = useState('');
  const [reqTests, setReqTests] = useState<Set<LabTestType>>(new Set());
  const [reqQuantity, setReqQuantity] = useState('50');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [resultBySubmission, setResultBySubmission] = useState<
    Record<string, { testType: LabTestType | ''; valueA: string; valueB: string }>
  >({});
  const [recordingSubmissionId, setRecordingSubmissionId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'testing' | 'genealogy' | 'storage'>('testing');
  const [genealogy, setGenealogy] = useState<GenealogyResult | null>(null);
  const [genealogyLoading, setGenealogyLoading] = useState(false);
  const [genealogyError, setGenealogyError] = useState<string | null>(null);

  const [storageEntries, setStorageEntries] = useState<ExpirationEntry[] | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const canSubmit = ['Admin', 'Inspector', 'Breeder', 'Producer'].includes(role);
  const canRecord = ['Admin', 'Inspector'].includes(role);

  const refresh = useCallback(async (currentToken: string, lotId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [lotData, labsData, submissionsData, flagsData] = await Promise.all([
        fetchSeedLotById(currentToken, lotId),
        fetchOrganizations(currentToken, { type: 'laboratory' }),
        fetchLabSubmissions(currentToken, { seedLotId: lotId }),
        fetchLabQualityFlags(currentToken, { seedLotId: lotId, resolved: false }),
      ]);
      setLot(lotData);
      setLabs(labsData);
      setSubmissions(submissionsData);
      setQualityFlags(flagsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load seed lot';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && id) void refresh(token, id);
  }, [token, id, refresh]);

  // Genealogy is a bigger, less-often-needed payload (full ancestor/descendant
  // tree, allocations, audit trail, test submissions per node) — fetched lazily
  // the first time the Genealogy tab is opened, not alongside the testing data.
  useEffect(() => {
    if (activeTab !== 'genealogy' || !token || !id || genealogy) return;
    let cancelled = false;
    setGenealogyLoading(true);
    setGenealogyError(null);
    fetchGenealogy(token, id)
      .then((result) => {
        if (!cancelled) setGenealogy(result);
      })
      .catch((err) => {
        if (!cancelled) setGenealogyError(err instanceof Error ? err.message : 'Unable to load genealogy');
      })
      .finally(() => {
        if (!cancelled) setGenealogyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, token, id, genealogy]);

  // Storage location + days-to-expiry, per packaging batch made from this
  // lot (expiration is tracked per physical batch, not the raw lot — see
  // server/src/modules/storage). Same lazy-on-first-view pattern as Genealogy.
  const loadStorage = useCallback(async (currentToken: string, lotId: string) => {
    setStorageLoading(true);
    setStorageError(null);
    try {
      const all = await fetchExpirationStatuses(currentToken);
      setStorageEntries(all.filter((entry) => entry.seedLotId === lotId));
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : 'Unable to load storage & shelf-life data');
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'storage' || !token || !id || storageEntries) return;
    void loadStorage(token, id);
  }, [activeTab, token, id, storageEntries, loadStorage]);

  // Live updates: the backend broadcasts SEED_LOT_TESTING_STATUS_CHANGED
  // whenever this lot's testing_status moves (on submit, and again once a
  // submission's results are all in) — see labTesting.service.ts. Patch the
  // status in place and pull the fresh submission/result rows so the test
  // report reflects what just happened, without a manual refresh.
  // EXPIRATION_ALERT is the storage module's own periodic scan (every 5
  // minutes) for lots newly in the yellow/red window — invalidate the
  // cached storage tab data so it's fresh next time it's viewed.
  useEffect(() => {
    if (!token || !id) return undefined;

    setConnection('connecting');
    const socket = connectInventorySocket(token, {
      onOpen: () => setConnection('connected'),
      onClose: () => setConnection('disconnected'),
      onEvent: (event: InventorySocketEvent) => {
        if (event.event === 'EXPIRATION_ALERT') {
          setStorageEntries(null);
          return;
        }
        if (event.event !== 'SEED_LOT_TESTING_STATUS_CHANGED') return;
        if (event.payload.seedLotId !== id) return;
        setLot((prev) => (prev ? { ...prev, testing_status: event.payload.testingStatus } : prev));
        void refresh(token, id);
        setGenealogy(null); // stale — refetches next time the Genealogy tab is viewed
        addToast(`Testing status is now ${TESTING_STATUS_LABEL[event.payload.testingStatus]}`, 'info');
      },
    });
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const toggleReqTest = (testType: LabTestType) => {
    setReqTests((prev) => {
      const next = new Set(prev);
      if (next.has(testType)) next.delete(testType);
      else next.add(testType);
      return next;
    });
  };

  const handleRequestTesting = async () => {
    if (!token || !id) return;
    if (!reqLabId) {
      addToast('Choose a testing laboratory', 'error');
      return;
    }
    if (reqTests.size === 0) {
      addToast('Select at least one test to request', 'error');
      return;
    }
    const quantity = Number(reqQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      addToast('Sample quantity must be a positive number', 'error');
      return;
    }

    setSubmittingRequest(true);
    try {
      await submitSampleBatch(token, {
        seedLotId: id,
        labOrganizationId: reqLabId,
        requestedTests: Array.from(reqTests),
        sampleQuantity: quantity,
      });
      addToast('Testing requested — lot is now in Testing', 'success');
      setShowRequestForm(false);
      setReqTests(new Set());
      await refresh(token, id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to request testing', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRecordResult = async (submission: LabTestSubmission) => {
    if (!token) return;
    const draft = resultBySubmission[submission.id];
    if (!draft?.testType) {
      addToast('Choose which test this result is for', 'error');
      return;
    }
    const fields = METRIC_FIELDS[draft.testType];
    const valueA = Number(draft.valueA);
    const valueB = Number(draft.valueB);
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
      addToast('Both metric values are required', 'error');
      return;
    }

    setRecordingSubmissionId(submission.id);
    try {
      await recordLabTestResult(token, submission.id, {
        testType: draft.testType,
        metrics: { [fields.a]: valueA, [fields.b]: valueB },
      });
      addToast(`${draft.testType} result recorded`, 'success');
      setResultBySubmission((prev) => ({ ...prev, [submission.id]: { testType: '', valueA: '', valueB: '' } }));
      if (token && id) await refresh(token, id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to record result', 'error');
    } finally {
      setRecordingSubmissionId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{lot ? lot.lot_code : 'Seed Lot'}</h1>
          <p className={styles.subtitle}>Testing &amp; certification status, and the full test report for this lot.</p>
        </div>
        <div className={styles.actions}>
          <span className={styles.connectionDot}>
            {connection === 'connected' ? <Wifi size={14} color="#187a43" /> : <WifiOff size={14} color="#a3352b" />}
            {connection === 'connected' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Offline'}
          </span>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/seed-lot-inventory')}>
            Back to Inventory
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} isLoading={loading} onClick={() => token && id && refresh(token, id)}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className={styles.card}>
          <div className={styles.errorText}>{error}</div>
        </div>
      ) : null}

      {lot ? (
        <div className={styles.card}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Crop</span>
              <div className={styles.detailValue}>{lot.crop}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Variety</span>
              <div className={styles.detailValue}>{lot.variety}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Stage</span>
              <div className={styles.detailValue}>{lot.stage}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Quantity Available</span>
              <div className={styles.detailValue}>
                {lot.quantity_available} {lot.unit}
              </div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Inventory Status</span>
              <div className={styles.detailValue}>{lot.status}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Testing Status</span>
              <div className={styles.detailValue}>
                <TestingStatusBadge status={lot.testing_status} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && !error && !sessionLoading ? (
          <div className={styles.card}>
            <div className={styles.emptyState}>Seed lot not found.</div>
          </div>
        ) : null
      )}

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'testing' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('testing')}
        >
          <FlaskConical size={15} /> Testing
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'genealogy' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('genealogy')}
        >
          <GitBranch size={15} /> Genealogy
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'storage' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <Snowflake size={15} /> Storage
        </button>
      </div>

      {activeTab === 'genealogy' ? (
        <div className={styles.card}>
          {genealogyError ? <div className={styles.errorText}>{genealogyError}</div> : null}
          {genealogyLoading && !genealogy ? <div className={styles.emptyState}>Loading genealogy…</div> : null}
          {genealogy ? <GenealogyTree genealogy={genealogy} /> : null}
        </div>
      ) : null}

      {activeTab === 'storage' ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Storage &amp; Shelf-Life</h2>
          <p className={styles.sectionSubtitle}>
            Where each packaging batch made from this lot is stored, and its days remaining before expiry.
          </p>
          {storageError ? <div className={styles.errorText}>{storageError}</div> : null}
          {storageLoading && !storageEntries ? <div className={styles.emptyState}>Loading storage &amp; shelf-life data…</div> : null}
          {storageEntries && storageEntries.length === 0 ? (
            <div className={styles.emptyState}>No packaging batches from this lot are being tracked for storage yet.</div>
          ) : null}
          {storageEntries && storageEntries.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Days Remaining</th>
                  <th>Alert</th>
                  <th>Zone</th>
                  <th>Shelf</th>
                  <th>Temp</th>
                </tr>
              </thead>
              <tbody>
                {storageEntries.map((entry) => (
                  <tr key={entry.packagingBatchId}>
                    <td>{entry.batchCode}</td>
                    <td>{entry.daysRemaining}</td>
                    <td>
                      {entry.status === 'critical' || entry.status === 'expired' ? (
                        <span style={{ color: '#a3352b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <XCircle size={14} /> {entry.status === 'expired' ? 'Expired' : 'Red — expiring soon'}
                        </span>
                      ) : entry.status === 'warning' ? (
                        <span style={{ color: '#91650a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <AlertTriangle size={14} /> Yellow — 30 days or fewer
                        </span>
                      ) : (
                        <span style={{ color: '#187a43', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={14} /> OK
                        </span>
                      )}
                    </td>
                    <td>{entry.currentLocationZone ?? 'Not stored'}</td>
                    <td>{entry.currentLocationShelf ?? '—'}</td>
                    <td>{entry.currentLocationTemperatureC != null ? `${entry.currentLocationTemperatureC}°C` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}

      <div className={activeTab === 'testing' ? undefined : styles.hiddenTab}>
      <div className={styles.card}>
        <div className={styles.submissionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Request Testing</h2>
            <p className={styles.sectionSubtitle}>
              {canSubmit
                ? 'Submit a sample batch to a testing laboratory for this lot.'
                : `You're viewing as ${role} — only Admin, Inspector, Breeder, or Producer can request testing.`}
            </p>
          </div>
          {canSubmit ? (
            <Button leftIcon={FlaskConical} onClick={() => setShowRequestForm((v) => !v)}>
              {showRequestForm ? 'Cancel' : 'Request Testing'}
            </Button>
          ) : null}
        </div>

        {showRequestForm && canSubmit ? (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reqLab">Testing Laboratory</label>
              <select id="reqLab" className={styles.select} value={reqLabId} onChange={(e) => setReqLabId(e.target.value)}>
                <option value="">Select a lab…</option>
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Requested Tests</label>
              <div className={styles.checkboxRow}>
                {ALL_TEST_TYPES.map((testType) => (
                  <label key={testType} className={styles.checkboxLabel}>
                    <input type="checkbox" checked={reqTests.has(testType)} onChange={() => toggleReqTest(testType)} />
                    {testType}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reqQuantity">Sample Quantity (g)</label>
                <Input id="reqQuantity" value={reqQuantity} onChange={(e) => setReqQuantity(e.target.value)} />
              </div>
            </div>

            <Button leftIcon={FlaskConical} isLoading={submittingRequest} onClick={() => void handleRequestTesting()}>
              Submit Sample Batch
            </Button>
          </div>
        ) : null}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Test Report</h2>
        <p className={styles.sectionSubtitle}>Every sample batch submitted for this lot, and the results recorded so far.</p>

        {submissions.length === 0 && !loading ? (
          <div className={styles.emptyState}>No samples have been submitted for this lot yet.</div>
        ) : (
          submissions.map((submission) => {
            const draft = resultBySubmission[submission.id] ?? { testType: '' as const, valueA: '', valueB: '' };
            const canRecordHere =
              canRecord && (submission.status === 'submitted' || submission.status === 'in_progress');
            const outstandingTests = submission.requested_tests.filter(
              (t) => !submission.results.some((r) => r.test_type === t),
            );
            return (
              <div key={submission.id} className={styles.submissionRow}>
                <div className={styles.submissionHeader}>
                  <div>
                    <strong>{submission.lab_organization_name}</strong>
                    <div className={styles.rowMeta}>
                      Requested: {submission.requested_tests.join(', ')} · Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={styles.badge}>{submission.status.replace('_', ' ')}</span>
                </div>

                {submission.results.length > 0 ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Result</th>
                        <th>Threshold</th>
                        <th>Outcome</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submission.results.map((r) => (
                        <tr key={r.id}>
                          <td>{r.test_type}</td>
                          <td>{r.result_value}%</td>
                          <td>{r.threshold_used}%</td>
                          <td>
                            {r.passed ? (
                              <span style={{ color: '#187a43', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle2 size={14} /> Passed
                              </span>
                            ) : (
                              <span style={{ color: '#a3352b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <XCircle size={14} /> Failed
                              </span>
                            )}
                          </td>
                          <td>{r.recorded_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {canRecordHere && outstandingTests.length > 0 ? (
                  <div className={styles.form} style={{ marginTop: '0.75rem' }}>
                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Test</label>
                        <select
                          className={styles.select}
                          value={draft.testType}
                          onChange={(e) =>
                            setResultBySubmission((prev) => ({
                              ...prev,
                              [submission.id]: { ...draft, testType: e.target.value as LabTestType },
                            }))
                          }
                        >
                          <option value="">Select…</option>
                          {outstandingTests.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      {draft.testType ? (
                        <div className={styles.field}>
                          <label className={styles.label}>{METRIC_FIELDS[draft.testType].aLabel}</label>
                          <Input
                            value={draft.valueA}
                            onChange={(e) =>
                              setResultBySubmission((prev) => ({ ...prev, [submission.id]: { ...draft, valueA: e.target.value } }))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                    {draft.testType ? (
                      <div className={styles.field}>
                        <label className={styles.label}>{METRIC_FIELDS[draft.testType].bLabel}</label>
                        <Input
                          value={draft.valueB}
                          onChange={(e) =>
                            setResultBySubmission((prev) => ({ ...prev, [submission.id]: { ...draft, valueB: e.target.value } }))
                          }
                        />
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      isLoading={recordingSubmissionId === submission.id}
                      onClick={() => void handleRecordResult(submission)}
                    >
                      Record Result
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {qualityFlags.length > 0 ? (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Open Quality Flags</h2>
          {qualityFlags.map((flag) => (
            <div key={flag.id} className={styles.submissionRow}>
              <strong>{flag.test_type}</strong>
              <div className={styles.rowMeta}>{flag.reason}</div>
            </div>
          ))}
        </div>
      ) : null}
      </div>

      {sessionLoading ? <div className={styles.helperText}>Connecting to the backend…</div> : null}
    </div>
  );
}
