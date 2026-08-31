import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, PlusCircle, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  bulkUploadLabResults,
  fetchLabPerformance,
  fetchLabQualityFlags,
  fetchLabSubmissionById,
  fetchLabSubmissions,
  fetchOrganizations,
  fetchSeedLots,
  generatePhytosanitaryFromSubmission,
  login,
  recordLabTestResult,
  resolveLabQualityFlag,
  submitSampleBatch,
  type LabPerformanceEntry,
  type LabQualityFlag,
  type LabSubmissionStatus,
  type LabTestSubmission,
  type LabTestType,
  type OrganizationRow,
  type RealtimeSeedLot,
  type RecordLabTestResultPayload,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedLabTesting.module.css';

const ALL_TEST_TYPES: LabTestType[] = ['germination', 'purity', 'vigor'];

const METRIC_FIELDS: Record<LabTestType, { a: string; b: string; aLabel: string; bLabel: string }> = {
  germination: { a: 'sampleSize', b: 'germinatedCount', aLabel: 'Sample Size', bLabel: 'Germinated Count' },
  purity: { a: 'sampleWeight', b: 'pureSeedWeight', aLabel: 'Sample Weight (g)', bLabel: 'Pure Seed Weight (g)' },
  vigor: { a: 'sampleSize', b: 'vigorCount', aLabel: 'Sample Size', bLabel: 'Vigor-Passing Count' },
};

function submissionStatusClass(status: LabSubmissionStatus): string {
  return (
    {
      submitted: styles.statusSubmitted,
      in_progress: styles.statusInProgress,
      completed: styles.statusCompleted,
      failed: styles.statusFailed,
    }[status] ?? styles.statusSubmitted
  );
}

function parseResultsCsv(text: string): RecordLabTestResultPayload[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().startsWith('testtype') ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const [testTypeRaw, valueARaw, valueBRaw, notes] = line.split(',').map((v) => v?.trim());
    const testType = testTypeRaw as LabTestType;
    if (!ALL_TEST_TYPES.includes(testType)) {
      throw new Error(`Invalid test type in CSV row: "${line}"`);
    }
    const fields = METRIC_FIELDS[testType];
    return {
      testType,
      metrics: { [fields.a]: Number(valueARaw), [fields.b]: Number(valueBRaw) },
      notes: notes || undefined,
    };
  });
}

export default function SeedLabTesting() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountIndex, setAccountIndex] = useState(1); // Breeder by default
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[1].role);

  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [seedLots, setSeedLots] = useState<RealtimeSeedLot[]>([]);
  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LabTestSubmission | null>(null);
  const [qualityFlags, setQualityFlags] = useState<LabQualityFlag[]>([]);
  const [labPerformance, setLabPerformance] = useState<LabPerformanceEntry[]>([]);
  const [flagNotes, setFlagNotes] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [subLotId, setSubLotId] = useState('');
  const [subLabId, setSubLabId] = useState('');
  const [subTests, setSubTests] = useState<Set<LabTestType>>(new Set());
  const [subQuantity, setSubQuantity] = useState('50');
  const [subUnit, setSubUnit] = useState('g');
  const [subExpectedDate, setSubExpectedDate] = useState('');

  const [resultTestType, setResultTestType] = useState<LabTestType | ''>('');
  const [resultValueA, setResultValueA] = useState('');
  const [resultValueB, setResultValueB] = useState('');
  const [resultNotes, setResultNotes] = useState('');

  const labs = organizations.filter((o) => o.type === 'laboratory');

  const refreshAll = useCallback(async (accessToken: string) => {
    const [subs, flags, performance] = await Promise.all([
      fetchLabSubmissions(accessToken),
      fetchLabQualityFlags(accessToken, { resolved: false }),
      fetchLabPerformance(accessToken),
    ]);
    setSubmissions(subs);
    setQualityFlags(flags);
    setLabPerformance(performance);
    return subs;
  }, []);

  const loadDetail = useCallback(async (accessToken: string, id: string) => {
    const result = await fetchLabSubmissionById(accessToken, id);
    setDetail(result);
    setResultTestType('');
    setResultValueA('');
    setResultValueB('');
    setResultNotes('');
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

        const [orgs, lots, subs] = await Promise.all([
          fetchOrganizations(accessToken),
          fetchSeedLots(accessToken),
          refreshAll(accessToken),
        ]);
        if (cancelled) return;
        setOrganizations(orgs);
        setSeedLots(lots);
        if (subs.length > 0) {
          setSelectedId(subs[0].id);
          await loadDetail(accessToken, subs[0].id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the lab testing service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const canSubmitBatch = role === 'Admin' || role === 'Inspector' || role === 'Breeder' || role === 'Producer';
  const canRecordResults = role === 'Admin' || role === 'Inspector';

  const handleSelect = async (id: string) => {
    if (!token) return;
    setSelectedId(id);
    try {
      await loadDetail(token, id);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load submission', 'error');
    }
  };

  const toggleTest = (test: LabTestType) => {
    setSubTests((prev) => {
      const next = new Set(prev);
      if (next.has(test)) next.delete(test);
      else next.add(test);
      return next;
    });
  };

  const handleSubmitBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (!subLotId || !subLabId || subTests.size === 0) {
      setError('Select a seed lot, a lab, and at least one test type.');
      return;
    }
    const quantity = Number(subQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Sample quantity must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitSampleBatch(token, {
        seedLotId: subLotId,
        labOrganizationId: subLabId,
        requestedTests: Array.from(subTests),
        sampleQuantity: quantity,
        sampleUnit: subUnit.trim() || undefined,
        expectedCompletionDate: subExpectedDate || undefined,
      });
      addToast('Sample batch submitted to lab', 'success');
      setSubLotId('');
      setSubLabId('');
      setSubTests(new Set());
      setSubQuantity('50');
      setSubExpectedDate('');
      await refreshAll(token);
      setSelectedId(created.id);
      await loadDetail(token, created.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit sample batch';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordResult = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token || !selectedId || !resultTestType) return;
    const fields = METRIC_FIELDS[resultTestType];
    const valueA = Number(resultValueA);
    const valueB = Number(resultValueB);
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
      setError('Enter valid numbers for both metric fields.');
      return;
    }

    setSubmitting(true);
    try {
      await recordLabTestResult(token, selectedId, {
        testType: resultTestType,
        metrics: { [fields.a]: valueA, [fields.b]: valueB },
        notes: resultNotes.trim() || undefined,
      });
      addToast('Test result recorded', 'success');
      await refreshAll(token);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to record result';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!token || !selectedId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseResultsCsv(text);
      setSubmitting(true);
      await bulkUploadLabResults(token, selectedId, rows);
      addToast(`Uploaded ${rows.length} result(s) from ${file.name}`, 'success');
      await refreshAll(token);
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to process uploaded file';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateCertificate = async () => {
    if (!token || !selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await generatePhytosanitaryFromSubmission(token, selectedId);
      addToast('Phytosanitary certificate generated', 'success');
      await loadDetail(token, selectedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate certificate';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveFlag = async (id: string) => {
    if (!token) return;
    const notes = (flagNotes[id] ?? '').trim();
    if (!notes) {
      setError('Enter resolution notes before resolving a flag.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resolveLabQualityFlag(token, id, notes);
      addToast('Quality flag resolved', 'success');
      setFlagNotes((prev) => ({ ...prev, [id]: '' }));
      await refreshAll(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to resolve flag';
      setError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const missingTests = detail ? detail.requested_tests.filter((t) => !detail.results.some((r) => r.test_type === t)) : [];
  const openCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'in_progress').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Testing &amp; Certification Integration</h1>
          <p className={styles.subtitle}>
            Submit sample batches to accredited testing labs, receive germination/purity/vigor results back (manually or via
            bulk file upload), auto-flag lots that miss certification thresholds, and issue phytosanitary certificates once
            every requested test passes.
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
        <KpiCard title="Total Submissions" value={String(submissions.length)} icon={FlaskConical} />
        <KpiCard title="Open / In Progress" value={String(openCount)} icon={FlaskConical} />
        <KpiCard title="Unresolved Quality Flags" value={String(qualityFlags.length)} icon={FlaskConical} />
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Submit Sample Batch</h2>
            <p className={styles.sectionSubtitle}>Send a physical sample to an accredited lab for one or more tests.</p>
            <form className={styles.form} onSubmit={handleSubmitBatch}>
              <div className={styles.field}>
                <label className={styles.label}>Seed Lot</label>
                <select className={styles.select} value={subLotId} onChange={(e) => setSubLotId(e.target.value)}>
                  <option value="">Select a lot</option>
                  {seedLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code} — {lot.crop}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Testing Lab</label>
                <select className={styles.select} value={subLabId} onChange={(e) => setSubLabId(e.target.value)}>
                  <option value="">Select a laboratory</option>
                  {labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Requested Tests</label>
                <div className={styles.checkboxRow}>
                  {ALL_TEST_TYPES.map((test) => (
                    <label key={test} className={styles.checkboxLabel}>
                      <input type="checkbox" checked={subTests.has(test)} onChange={() => toggleTest(test)} />
                      {test}
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Sample Quantity</label>
                  <Input type="number" min="0" step="0.01" value={subQuantity} onChange={(e) => setSubQuantity(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Unit</label>
                  <Input value={subUnit} onChange={(e) => setSubUnit(e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Expected Completion Date (optional)</label>
                <Input type="date" value={subExpectedDate} onChange={(e) => setSubExpectedDate(e.target.value)} />
              </div>
              <Button type="submit" leftIcon={PlusCircle} isLoading={submitting} disabled={!canSubmitBatch}>Submit Batch</Button>
              {!canSubmitBatch ? <span className={styles.hint}>{role} cannot submit sample batches.</span> : null}
            </form>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Lab Performance</h2>
            {labPerformance.length === 0 ? (
              <div className={styles.emptyState}>No testing labs registered yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Submissions</th>
                    <th>Pass Rate</th>
                    <th>Avg Turnaround</th>
                    <th>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {labPerformance.map((lab) => (
                    <tr key={lab.labOrganizationId}>
                      <td>{lab.labOrganizationName}</td>
                      <td>{lab.totalSubmissions}</td>
                      <td>{lab.passRate != null ? `${lab.passRate}%` : '—'}</td>
                      <td>{lab.avgTurnaroundDays != null ? `${lab.avgTurnaroundDays}d` : '—'}</td>
                      <td className={lab.overdueCount > 0 ? styles.overdueCell : undefined}>{lab.overdueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Unresolved Quality Flags</h2>
            <p className={styles.sectionSubtitle}>Auto-raised when a lab result falls below the certification threshold.</p>
            {qualityFlags.length === 0 ? (
              <div className={styles.emptyState}>No unresolved flags.</div>
            ) : (
              qualityFlags.map((flag) => (
                <div key={flag.id} className={styles.flagRow}>
                  <div>
                    <strong>{flag.lot_code}</strong> — {flag.reason}
                  </div>
                  <div className={styles.controls}>
                    <input
                      className={styles.inlineInput}
                      placeholder="Resolution notes…"
                      value={flagNotes[flag.id] ?? ''}
                      onChange={(e) => setFlagNotes((prev) => ({ ...prev, [flag.id]: e.target.value }))}
                      disabled={!canRecordResults}
                    />
                    <Button type="button" size="sm" isLoading={submitting} disabled={!canRecordResults} onClick={() => void handleResolveFlag(flag.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Submissions</h2>
            {submissions.length === 0 ? (
              <div className={styles.emptyState}>No sample batches submitted yet.</div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className={`${styles.submissionRow} ${selectedId === sub.id ? styles.submissionRowActive : ''}`}
                  onClick={() => void handleSelect(sub.id)}
                >
                  <div>
                    <strong>{sub.lot_code}</strong>
                    <div className={styles.rowMeta}>{sub.lab_organization_name} · {sub.requested_tests.join(', ')}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${submissionStatusClass(sub.status)}`}>{sub.status.replace('_', ' ')}</span>
                </div>
              ))
            )}
          </div>

          {detail ? (
            <>
              <div className={styles.card}>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>{detail.lot_code}</h2>
                    <p className={styles.sectionSubtitle}>
                      {detail.lab_organization_name} · submitted by {detail.submitted_by} on {new Date(detail.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`${styles.statusBadge} ${submissionStatusClass(detail.status)}`}>{detail.status.replace('_', ' ')}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/seed-lot-detail/${detail.seed_lot_id}`)}>
                      View Seed Lot
                    </Button>
                  </div>
                </div>
                {detail.results.length === 0 ? (
                  <div className={styles.emptyState}>No results recorded yet.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Result</th>
                        <th>Threshold</th>
                        <th>Outcome</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.results.map((result) => (
                        <tr key={result.id}>
                          <td>{result.test_type}</td>
                          <td>{result.result_value}%</td>
                          <td>{result.threshold_used}%</td>
                          <td>
                            <span className={`${styles.statusBadge} ${result.passed ? styles.statusCompleted : styles.statusFailed}`}>
                              {result.passed ? 'pass' : 'fail'}
                            </span>
                          </td>
                          <td>{result.source.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {detail.status === 'completed' ? (
                  <div className={styles.certBox}>
                    <Button type="button" leftIcon={ShieldCheck} isLoading={submitting} disabled={!canRecordResults} onClick={() => void handleGenerateCertificate()}>
                      Generate Phytosanitary Certificate
                    </Button>
                    {!canRecordResults ? <span className={styles.hint}>{role} cannot generate certificates.</span> : null}
                  </div>
                ) : null}
              </div>

              {missingTests.length > 0 && detail.status !== 'failed' ? (
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>Record a Test Result</h2>
                  <form className={styles.form} onSubmit={handleRecordResult}>
                    <div className={styles.field}>
                      <label className={styles.label}>Test Type</label>
                      <select className={styles.select} value={resultTestType} onChange={(e) => setResultTestType(e.target.value as LabTestType)}>
                        <option value="">Select a pending test</option>
                        {missingTests.map((test) => (
                          <option key={test} value={test}>{test}</option>
                        ))}
                      </select>
                    </div>
                    {resultTestType ? (
                      <div className={styles.formRow}>
                        <div className={styles.field}>
                          <label className={styles.label}>{METRIC_FIELDS[resultTestType].aLabel}</label>
                          <Input type="number" min="0" value={resultValueA} onChange={(e) => setResultValueA(e.target.value)} />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label}>{METRIC_FIELDS[resultTestType].bLabel}</label>
                          <Input type="number" min="0" value={resultValueB} onChange={(e) => setResultValueB(e.target.value)} />
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.field}>
                      <label className={styles.label}>Notes</label>
                      <textarea className={styles.textarea} value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} />
                    </div>
                    <Button type="submit" isLoading={submitting} disabled={!canRecordResults || !resultTestType}>Record Result</Button>
                    {!canRecordResults ? <span className={styles.hint}>{role} cannot record lab results.</span> : null}
                  </form>

                  <div className={styles.uploadBox}>
                    <label className={styles.label}>
                      <Upload size={14} /> Or auto-receive results via file upload (CSV: testType,value1,value2,notes)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      disabled={!canRecordResults || submitting}
                      onChange={(e) => void handleFileUpload(e)}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.card}>
              <div className={styles.emptyState}>Select a submission to view its results.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
