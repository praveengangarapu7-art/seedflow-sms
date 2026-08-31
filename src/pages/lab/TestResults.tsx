import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { labNav } from '@/config/labNav';
import {
  fetchLabSubmissions,
  type LabTestSubmission,
  type LabTestType,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';

const TEST_FILTERS = ['all', 'germination', 'purity', 'vigor'] as const;
type TestFilter = (typeof TEST_FILTERS)[number];

interface FlatResult {
  id: string;
  submissionId: string;
  lotCode: string;
  labName: string;
  testType: LabTestType;
  resultValue: number;
  thresholdUsed: number;
  passed: boolean;
  source: string;
  recordedBy: string;
  recordedAt: string;
}

export default function TestResults() {
  const navigate = useNavigate();
  const { token, error: sessionError } = useLabSession();
  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [testFilter, setTestFilter] = useState<TestFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      setSubmissions(await fetchLabSubmissions(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load test results');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const allResults = useMemo<FlatResult[]>(
    () =>
      submissions.flatMap((s) =>
        (s.results ?? []).map((r) => ({
          id: r.id,
          submissionId: s.id,
          lotCode: s.lot_code,
          labName: s.lab_organization_name,
          testType: r.test_type,
          resultValue: Number(r.result_value),
          thresholdUsed: Number(r.threshold_used),
          passed: r.passed,
          source: r.source,
          recordedBy: r.recorded_by,
          recordedAt: r.recorded_at,
        })),
      ),
    [submissions],
  );

  const visible = useMemo(
    () =>
      (testFilter === 'all' ? allResults : allResults.filter((r) => r.testType === testFilter)).sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    [allResults, testFilter],
  );

  const stats = useMemo(() => {
    const passed = visible.filter((r) => r.passed).length;
    const avg = visible.length > 0 ? visible.reduce((sum, r) => sum + r.resultValue, 0) / visible.length : null;
    return {
      total: visible.length,
      passed,
      failed: visible.length - passed,
      avg,
    };
  }, [visible]);

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Test Results</h1>
            <p className={styles.subtitle}>
              Every germination, purity and vigor result recorded across all submissions, scored against its
              certification threshold.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void load(token)}>
              Refresh
            </Button>
          </div>
        </div>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        <div className={styles.kpiGrid}>
          <KpiCard title="Results" value={String(stats.total)} icon={FlaskConical} />
          <KpiCard title="Passed" value={String(stats.passed)} icon={FlaskConical} />
          <KpiCard title="Failed" value={String(stats.failed)} icon={FlaskConical} />
          <KpiCard title="Average Score" value={stats.avg === null ? '—' : `${stats.avg.toFixed(1)}%`} icon={FlaskConical} />
        </div>

        <div className={styles.filterBar}>
          {TEST_FILTERS.map((t) => (
            <button
              key={t}
              className={`${styles.chip} ${testFilter === t ? styles.chipActive : ''}`}
              onClick={() => setTestFilter(t)}
            >
              {t === 'all' ? 'All tests' : t}
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>No results recorded for this filter yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Laboratory</th>
                    <th>Test</th>
                    <th>Result</th>
                    <th>Threshold</th>
                    <th>Outcome</th>
                    <th>Source</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${r.submissionId}`)}>
                          {r.lotCode}
                        </button>
                      </td>
                      <td>{r.labName}</td>
                      <td>{r.testType}</td>
                      <td>{r.resultValue}%</td>
                      <td>{r.thresholdUsed}%</td>
                      <td>
                        <span className={`${styles.badge} ${r.passed ? styles.badgePassed : styles.badgeFailed}`}>
                          {r.passed ? 'passed' : 'failed'}
                        </span>
                      </td>
                      <td>{r.source.replace('_', ' ')}</td>
                      <td>{new Date(r.recordedAt).toLocaleDateString()}</td>
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
