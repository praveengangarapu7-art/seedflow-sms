import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, FlaskConical, RefreshCw } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { labNav } from '@/config/labNav';
import {
  fetchLabIssuedCertificates,
  fetchLabSubmissions,
  type LabIssuedCertificate,
  type LabTestSubmission,
} from '@/services/seedLotRealtimeClient';
import { useLabSession } from './useLabSession';
import styles from './Lab.module.css';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, labToday, type PeriodValue } from '@/utils/periodFilter';

function isExpired(cert: LabIssuedCertificate): boolean {
  return cert.expiry_date !== null && new Date(cert.expiry_date) < new Date();
}

export default function Certificates() {
  const navigate = useNavigate();
  const { token, error: sessionError } = useLabSession();
  const [certificates, setCertificates] = useState<LabIssuedCertificate[]>([]);
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [submissions, setSubmissions] = useState<LabTestSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const [certs, subs] = await Promise.all([
        fetchLabIssuedCertificates(accessToken),
        fetchLabSubmissions(accessToken, { status: 'completed' }),
      ]);
      setCertificates(certs);
      setSubmissions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load certificates');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  // A submission that passed every test but has no certificate yet is the
  // actionable queue for a Lab Manager — surfaced rather than left implicit.
  const awaitingCertificate = useMemo(() => {
    const certified = new Set(certificates.map((c) => c.submission_id));
    return submissions.filter((s) => !certified.has(s.id));
  }, [certificates, submissions]);

  const visibleCertificates = useMemo(
    () => certificates.filter((c) => isDateInPeriod(c.issue_date, period, labToday())),
    [certificates, period]
  );

  const expiredCount = useMemo(() => visibleCertificates.filter(isExpired).length, [visibleCertificates]);

  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={labNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Certificates</h1>
            <p className={styles.subtitle}>
              Phytosanitary certificates issued from completed lab submissions. Each one links back to the tests that
              justified it and appears on that seed lot's compliance chain in the Production module.
            </p>
          </div>
          <div className={styles.controls}>
            <PeriodSelect value={period} onChange={setPeriod} />
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void load(token)}>
              Refresh
            </Button>
          </div>
        </div>

        {sessionError && <div className={styles.card}><span className={styles.errorText}>{sessionError}</span></div>}
        {error && <div className={styles.card}><span className={styles.errorText}>{error}</span></div>}

        <div className={styles.kpiGrid}>
          <KpiCard title="Certificates Issued" value={String(certificates.length)} icon={FileCheck2} />
          <KpiCard title="Awaiting Certificate" value={String(awaitingCertificate.length)} icon={FlaskConical} />
          <KpiCard title="Expired" value={String(expiredCount)} icon={FileCheck2} />
        </div>

        {awaitingCertificate.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Awaiting Certificate</h2>
            <p className={styles.sectionSubtitle}>
              These submissions passed every requested test but have not had a certificate issued yet.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Laboratory</th>
                    <th>Tests</th>
                    <th>Completed</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {awaitingCertificate.map((s) => (
                    <tr key={s.id}>
                      <td>{s.lot_code}</td>
                      <td>{s.lab_organization_name}</td>
                      <td>{(s.requested_tests ?? []).join(', ')}</td>
                      <td>{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${s.id}`)}>
                          Open submission
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Issued Certificates</h2>
          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : certificates.length === 0 ? (
            <div className={styles.emptyState}>
              No certificates issued from lab submissions yet — complete a submission, then issue one from its detail page.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Certificate</th>
                    <th>Lot</th>
                    <th>Laboratory</th>
                    <th>Issuing authority</th>
                    <th>Issued</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCertificates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.certificate_number}</td>
                      <td>
                        {c.submission_id ? (
                          <button className={styles.rowButton} onClick={() => navigate(`/lab/submissions/${c.submission_id}`)}>
                            {c.lot_code}
                          </button>
                        ) : (
                          c.lot_code
                        )}
                      </td>
                      <td>{c.lab_organization_name ?? '—'}</td>
                      <td>{c.issuing_authority}</td>
                      <td>{new Date(c.issue_date).toLocaleDateString()}</td>
                      <td>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`${styles.badge} ${isExpired(c) ? styles.badgeFailed : styles.badgePassed}`}>
                          {isExpired(c) ? 'expired' : c.status}
                        </span>
                      </td>
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
