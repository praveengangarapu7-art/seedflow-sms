import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, PlusCircle, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { labNav } from '@/config/labNav';
import { usePermission } from '@/hooks/usePermission';
import {
  fetchLabSubmissions,
  fetchOrganizations,
  fetchSeedLots,
  submitSampleBatch,
  type LabTestSubmission,
  type LabTestType,
  type OrganizationRow,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';

const ALL_TEST_TYPES: LabTestType[] = ['germination', 'purity', 'vigor'];
const STATUS_FILTERS = ['all', 'submitted', 'in_progress', 'completed', 'failed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusBadgeClass(status: string): string {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function SampleSubmissions() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, loading: sessionLoading, error: sessionError } = useLabSession();
  const canSubmit = usePermission('submit_lab_sample');

  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [labs, setLabs] = useState<OrganizationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [seedLotId, setSeedLotId] = useState('');
  const [labOrganizationId, setLabOrganizationId] = useState('');
  const [requestedTests, setRequestedTests] = useState<LabTestType[]>(['germination']);
  const [sampleQuantity, setSampleQuantity] = useState('100');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [subs, lotList, orgs] = await Promise.all([
        fetchLabSubmissions(accessToken),
        fetchSeedLots(accessToken),
        fetchOrganizations(accessToken, { type: 'laboratory' }),
      ]);
      setSubmissions(subs);
      setLots(lotList);
      setLabs(orgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load submissions');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const visible = useMemo(
    () => (statusFilter === 'all' ? submissions : submissions.filter((s) => s.status === statusFilter)),
    [submissions, statusFilter],
  );

  const toggleTest = (test: LabTestType) => {
    setRequestedTests((prev) => (prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]));
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!seedLotId || !labOrganizationId || requestedTests.length === 0) {
      addToast('Pick a seed lot, a laboratory and at least one test.', 'error');
      return;
    }
    setBusy(true);
    try {
      await submitSampleBatch(token, {
        seedLotId,
        labOrganizationId,
        requestedTests,
        sampleQuantity: Number(sampleQuantity),
        expectedCompletionDate: expectedCompletionDate || undefined,
      });
      addToast('Sample batch submitted to the laboratory', 'success');
      setModalOpen(false);
      setSeedLotId('');
      setRequestedTests(['germination']);
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit sample', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Sample Submissions</h1>
            <p className={styles.subtitle}>
              Every seed lot sample sent to a partner laboratory. Submitting a sample moves the lot's testing status to
              "testing" in the Production module — the same record the seed lot detail page reads.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void load(token)}>
              Refresh
            </Button>
            {canSubmit && (
              <Button leftIcon={PlusCircle} onClick={() => setModalOpen(true)}>
                Submit Sample
              </Button>
            )}
          </div>
        </div>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        <div className={styles.filterBar}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
              {s !== 'all' ? ` (${submissions.filter((x) => x.status === s).length})` : ` (${submissions.length})`}
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {sessionLoading || busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>No submissions match this filter.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Laboratory</th>
                    <th>Requested tests</th>
                    <th>Sample</th>
                    <th>Status</th>
                    <th>Results</th>
                    <th>Submitted</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${s.id}`)}>
                          {s.lot_code}
                        </button>
                      </td>
                      <td>{s.lab_organization_name}</td>
                      <td>{(s.requested_tests ?? []).join(', ')}</td>
                      <td>{s.sample_quantity} {s.sample_unit}</td>
                      <td>
                        <span className={`${styles.badge} ${statusBadgeClass(s.status)}`}>{s.status.replace('_', ' ')}</span>
                      </td>
                      <td>{(s.results ?? []).length}/{(s.requested_tests ?? []).length}</td>
                      <td>{new Date(s.submitted_at).toLocaleDateString()}</td>
                      <td>{new Date(s.expected_completion_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Submit Sample Batch" size="lg">
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-seed-lot">Seed lot</label>
              <select id="lab-seed-lot" className={styles.select} value={seedLotId} onChange={(e) => setSeedLotId(e.target.value)}>
                <option value="">Select a seed lot</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>{l.lot_code} — {l.crop}/{l.variety}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-org">Laboratory</label>
              <select id="lab-org" className={styles.select} value={labOrganizationId} onChange={(e) => setLabOrganizationId(e.target.value)}>
                <option value="">Select a laboratory</option>
                {labs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          {labs.length === 0 && (
            <p className={styles.errorText}>
              No laboratory organizations exist yet — add one under Master Data → Labs, or run the lab demo seed.
            </p>
          )}

          <div className={styles.formRow}>
            <div className={styles.field}>
              <span className={styles.label}>Requested tests</span>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {ALL_TEST_TYPES.map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="checkbox" checked={requestedTests.includes(t)} onChange={() => toggleTest(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-qty">Sample quantity (g)</label>
              <input
                id="lab-qty"
                className={styles.textInput}
                type="number"
                value={sampleQuantity}
                onChange={(e) => setSampleQuantity(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-due">Expected completion (optional)</label>
              <input
                id="lab-due"
                className={styles.textInput}
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <Button isLoading={busy} onClick={() => void handleSubmit()}>Submit to Laboratory</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </Modal>
      </div>
    </ModuleLayout>
  );
}
