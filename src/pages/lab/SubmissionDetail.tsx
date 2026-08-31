import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileCheck2, FlaskConical, Upload } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { labNav } from '@/config/labNav';
import { usePermission } from '@/hooks/usePermission';
import {
  bulkUploadLabResults,
  fetchLabSubmissionById,
  generatePhytosanitaryFromSubmission,
  recordLabTestResult,
  type LabTestSubmission,
  type LabTestType,
  type RecordLabTestResultPayload,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';

// Mirrors CERTIFICATION_THRESHOLDS in
// server/src/modules/labTesting/labTesting.types.ts — shown here so the bench
// operator sees the bar their reading is about to be judged against. The
// server recomputes and enforces it; this is display only.
const THRESHOLDS: Record<LabTestType, number> = { germination: 85, purity: 98, vigor: 70 };

const METRIC_FIELDS: Record<LabTestType, { key: string; label: string }[]> = {
  germination: [
    { key: 'sampleSize', label: 'Sample size (seeds)' },
    { key: 'germinatedCount', label: 'Germinated count' },
  ],
  purity: [
    { key: 'sampleWeight', label: 'Sample weight (g)' },
    { key: 'pureSeedWeight', label: 'Pure seed weight (g)' },
  ],
  vigor: [
    { key: 'sampleSize', label: 'Sample size (seeds)' },
    { key: 'vigorCount', label: 'Vigorous count' },
  ],
};

function statusBadgeClass(status: string): string {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token, error: sessionError } = useLabSession();
  const canRecord = usePermission('record_lab_result');
  const canBulkUpload = usePermission('bulk_upload_lab_results');
  const canIssueCertificate = usePermission('issue_phytosanitary_certificate');

  const [submission, setSubmission] = useState<LabTestSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resultsFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTest, setActiveTest] = useState<LabTestType | ''>('');
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const load = useCallback(
    async (accessToken: string, submissionId: string) => {
      setBusy(true);
      setError(null);
      try {
        setSubmission(await fetchLabSubmissionById(accessToken, submissionId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load this submission');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (token && id) void load(token, id);
  }, [token, id, load]);

  const pendingTests = useMemo(() => {
    if (!submission) return [];
    const recorded = new Set((submission.results ?? []).map((r) => r.test_type));
    return (submission.requested_tests ?? []).filter((t) => !recorded.has(t));
  }, [submission]);

  useEffect(() => {
    if (pendingTests.length > 0 && !pendingTests.includes(activeTest as LabTestType)) {
      setActiveTest(pendingTests[0]);
      setMetrics({});
    } else if (pendingTests.length === 0) {
      setActiveTest('');
    }
  }, [pendingTests, activeTest]);

  const previewValue = useMemo(() => {
    if (!activeTest) return null;
    const m = Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, Number(v)]));
    if (activeTest === 'purity') {
      if (!m.sampleWeight || m.pureSeedWeight === undefined || Number.isNaN(m.pureSeedWeight)) return null;
      return Math.round((m.pureSeedWeight / m.sampleWeight) * 1000) / 10;
    }
    const countKey = activeTest === 'germination' ? 'germinatedCount' : 'vigorCount';
    if (!m.sampleSize || m[countKey] === undefined || Number.isNaN(m[countKey])) return null;
    return Math.round((m[countKey] / m.sampleSize) * 1000) / 10;
  }, [activeTest, metrics]);

  const handleRecord = async () => {
    if (!token || !id || !activeTest) return;
    const payload: RecordLabTestResultPayload = {
      testType: activeTest,
      metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, Number(v)])),
      notes: notes.trim() || undefined,
    };
    setBusy(true);
    try {
      const updated = await recordLabTestResult(token, id, payload);
      setSubmission(updated);
      setMetrics({});
      setNotes('');
      addToast(`${activeTest} result recorded`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to record result', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      if (!token || !id) return;
      try {
        const parsed = JSON.parse(String(reader.result ?? '[]')) as RecordLabTestResultPayload[];
        if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array of results');
        setBusy(true);
        const updated = await bulkUploadLabResults(token, id, parsed);
        setSubmission(updated);
        addToast(`Uploaded ${parsed.length} result(s) from ${file.name}`, 'success');
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Unable to process the uploaded file', 'error');
      } finally {
        setBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const handleIssueCertificate = async () => {
    if (!token || !id) return;
    setBusy(true);
    try {
      const cert = await generatePhytosanitaryFromSubmission(token, id);
      addToast(`Phytosanitary certificate ${cert.certificate_number} issued`, 'success');
      await load(token, id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to issue certificate', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/lab/submissions')}>
          <ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> Back to submissions
        </button>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        {!submission ? (
          <div className={styles.card}><div className={styles.emptyState}>{busy ? 'Loading…' : 'Submission not found.'}</div></div>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>Submission — {submission.lot_code}</h1>
                <p className={styles.subtitle}>
                  Sent to {submission.lab_organization_name}. When every requested test has a result, the seed lot's
                  testing status automatically becomes <strong>certified</strong> (all passed) or{' '}
                  <strong>rejected</strong> (any failed), and a live update is pushed to the Production module.
                </p>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={`${styles.badge} ${statusBadgeClass(submission.status)}`}>
                    {submission.status.replace('_', ' ')}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Sample</span>
                  {submission.sample_quantity} {submission.sample_unit}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Submitted by</span>
                  {submission.submitted_by}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Submitted</span>
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Expected</span>
                  {new Date(submission.expected_completion_date).toLocaleDateString()}
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Progress</span>
                  {(submission.results ?? []).length}/{(submission.requested_tests ?? []).length} tests
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.round(
                          ((submission.results ?? []).length / Math.max((submission.requested_tests ?? []).length, 1)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Recorded Results</h2>
              <p className={styles.sectionSubtitle}>
                Each result is scored against its certification threshold by the server; a failing result automatically
                raises a quality flag.
              </p>
              {(submission.results ?? []).length === 0 ? (
                <div className={styles.emptyState}>No results recorded yet.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Result</th>
                        <th>Threshold</th>
                        <th>Outcome</th>
                        <th>Source</th>
                        <th>Recorded by</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(submission.results ?? []).map((r) => (
                        <tr key={r.id}>
                          <td>{r.test_type}</td>
                          <td>{r.result_value}%</td>
                          <td>{r.threshold_used}%</td>
                          <td>
                            <span className={`${styles.badge} ${r.passed ? styles.badgePassed : styles.badgeFailed}`}>
                              {r.passed ? 'passed' : 'failed'}
                            </span>
                          </td>
                          <td>{r.source.replace('_', ' ')}</td>
                          <td>{r.recorded_by}</td>
                          <td>{r.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {canRecord && pendingTests.length > 0 && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Record a Result</h2>
                <p className={styles.sectionSubtitle}>
                  Enter the raw bench readings — the percentage and pass/fail are computed server-side from them, so the
                  original measurements are never lost.
                </p>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="lab-test-type">Test</label>
                    <select
                      id="lab-test-type"
                      className={styles.select}
                      value={activeTest}
                      onChange={(e) => {
                        setActiveTest(e.target.value as LabTestType);
                        setMetrics({});
                      }}
                    >
                      {pendingTests.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {activeTest &&
                    METRIC_FIELDS[activeTest].map((f) => (
                      <div className={styles.field} key={f.key}>
                        <label className={styles.label} htmlFor={`metric-${f.key}`}>{f.label}</label>
                        <input
                          id={`metric-${f.key}`}
                          className={styles.textInput}
                          type="number"
                          value={metrics[f.key] ?? ''}
                          onChange={(e) => setMetrics((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                </div>
                {activeTest && (
                  <p className={styles.thresholdNote}>
                    {previewValue === null
                      ? `Certification threshold for ${activeTest}: ${THRESHOLDS[activeTest]}%`
                      : `This reading computes to ${previewValue}% — threshold is ${THRESHOLDS[activeTest]}%, so it would ${
                          previewValue >= THRESHOLDS[activeTest] ? 'PASS' : 'FAIL'
                        }.`}
                  </p>
                )}
                <div className={styles.formRow} style={{ marginTop: '0.75rem' }}>
                  <div className={styles.field} style={{ flexBasis: '100%' }}>
                    <label className={styles.label} htmlFor="lab-notes">Notes (optional)</label>
                    <textarea
                      id="lab-notes"
                      className={styles.textArea}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <Button isLoading={busy} disabled={!activeTest} onClick={() => void handleRecord()}>
                    Record Result
                  </Button>
                  {canBulkUpload && (
                    <>
                      <input
                        ref={resultsFileInputRef}
                        type="file"
                        accept="application/json,.json"
                        style={{ display: 'none' }}
                        onChange={(e) => e.target.files?.[0] && handleBulkUploadFile(e.target.files[0])}
                      />
                      <Button variant="secondary" leftIcon={Upload} onClick={() => resultsFileInputRef.current?.click()}>
                        Upload Results File
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {canIssueCertificate && submission.status === 'completed' && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Phytosanitary Certificate</h2>
                <p className={styles.sectionSubtitle}>
                  All tests passed. Issuing a certificate links it back to this submission and makes it visible on the
                  seed lot's compliance chain.
                </p>
                <Button leftIcon={FileCheck2} isLoading={busy} onClick={() => void handleIssueCertificate()}>
                  Issue Certificate
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
