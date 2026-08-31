import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Award, Download, Link2, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  fetchLotCertificates,
  fetchLotChainIntegrity,
  fetchLotHashChain,
  fetchPublicCertificateBundle,
  fetchSeedLots,
  issueLotCertificate,
  login,
  revokeLotCertificate,
  type AuthenticityCertificate,
  type ChainIntegrityResult,
  type HashChainEntry,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedLotAuthenticity.module.css';

// Certificate issuance/revocation requires Admin or Inspector on the backend
// (authenticity.routes.ts) — same authority as the compliance module's
// existing certificate issuance.
const CAN_ISSUE_ROLES = new Set(['Admin', 'Inspector']);

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function SeedLotAuthenticity() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');

  const [chain, setChain] = useState<HashChainEntry[]>([]);
  const [integrity, setIntegrity] = useState<ChainIntegrityResult | null>(null);
  const [certificates, setCertificates] = useState<AuthenticityCertificate[]>([]);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrCertificateId, setQrCertificateId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});

  const selectedLot = lots.find((l) => l.id === selectedLotId) ?? null;

  const loadLotAuthenticity = useCallback(async (accessToken: string, seedLotId: string) => {
    setError(null);
    try {
      const [chainEntries, integrityResult, certs] = await Promise.all([
        fetchLotHashChain(accessToken, seedLotId),
        fetchLotChainIntegrity(accessToken, seedLotId),
        fetchLotCertificates(accessToken, seedLotId),
      ]);
      setChain(chainEntries);
      setIntegrity(integrityResult);
      setCertificates(certs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load authenticity data for this lot');
      setChain([]);
      setIntegrity(null);
      setCertificates([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      setQrDataUrl(null);
      setQrCertificateId(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        const lotList = await fetchSeedLots(accessToken);
        if (cancelled) return;
        setLots(lotList);
        // Preserve the current selection across an account switch when the
        // new account can still see the same lot, rather than always
        // snapping back to the first lot in the list.
        const preservedId = lotList.some((l) => l.id === selectedLotId) ? selectedLotId : (lotList[0]?.id ?? '');
        setSelectedLotId(preservedId);
        if (preservedId) await loadLotAuthenticity(accessToken, preservedId);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the authenticity service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (!token || !selectedLotId) return;
    setQrDataUrl(null);
    setQrCertificateId(null);
    void loadLotAuthenticity(token, selectedLotId);
  }, [token, selectedLotId, loadLotAuthenticity]);

  const handleRefresh = () => {
    if (token && selectedLotId) void loadLotAuthenticity(token, selectedLotId);
  };

  const handleIssueCertificate = async () => {
    if (!token || !selectedLotId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const certificate = await issueLotCertificate(token, selectedLotId);
      setMessage(`Certificate ${certificate.certificate_number} issued.`);
      await loadLotAuthenticity(token, selectedLotId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue certificate');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    if (!token) return;
    const reason = revokeReasons[certificateId]?.trim();
    if (!reason) {
      setError('Enter a reason before revoking a certificate.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeLotCertificate(token, certificateId, reason);
      setMessage('Certificate revoked.');
      setRevokeReasons((prev) => ({ ...prev, [certificateId]: '' }));
      if (selectedLotId) await loadLotAuthenticity(token, selectedLotId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke certificate');
    } finally {
      setBusy(false);
    }
  };

  const handleShowQr = async (certificateId: string) => {
    setError(null);
    try {
      // The QR encodes a link to the PUBLIC verification page — no login
      // needed on the other end, which is the entire point of this feature.
      const verifyUrl = `${window.location.origin}/verify-lot/${certificateId}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 240, margin: 1 });
      setQrDataUrl(dataUrl);
      setQrCertificateId(certificateId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate QR code');
    }
  };

  const handleDownloadBundle = async (certificateId: string) => {
    setBusy(true);
    setError(null);
    try {
      // Fetched through the PUBLIC endpoint deliberately — this is exactly
      // what an offline verifier (scripts/verifyLotCertificate.ts) consumes,
      // so downloading it here proves the same artifact a farmer gets from
      // scanning a QR code.
      const bundle = await fetchPublicCertificateBundle(certificateId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bundle.certificateNumber}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download certificate bundle');
    } finally {
      setBusy(false);
    }
  };

  const canIssue = CAN_ISSUE_ROLES.has(role);
  const activeCertificate = certificates.find((c) => !c.revoked) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Lot Authenticity &amp; Anti-Counterfeiting</h1>
          <p className={styles.subtitle}>
            Every create/update/allocate/release on a seed lot is chained into a tamper-evident, cryptographically
            hashed record. Issue a signed certificate and generate a QR code so anyone — including a farmer with no
            SeedSphere account — can verify a lot's authenticity without touching this database.
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
          <select className={styles.select} value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
            <option value="">Select a seed lot</option>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lot_code} — {lot.crop} ({lot.stage})
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      {!selectedLot ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>Select a seed lot to view its hash chain and certificates.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <KpiCard title="Chain Length" value={String(chain.length)} icon={ShieldCheck} />
            <KpiCard
              title="Chain Integrity"
              value={integrity ? (integrity.valid ? 'Valid' : 'Broken') : '—'}
              icon={integrity?.valid === false ? ShieldAlert : ShieldCheck}
            />
            <KpiCard title="Certificates Issued" value={String(certificates.length)} icon={Award} />
            <KpiCard title="Active Certificate" value={activeCertificate ? activeCertificate.certificate_number : 'None'} icon={Award} />
          </div>

          <div className={styles.grid}>
            <div>
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Hash Chain — {selectedLot.lot_code}</h2>
                <p className={styles.sectionSubtitle}>
                  Each entry's hash is computed from its own data plus the previous entry's hash — altering any past
                  entry, or the database directly, breaks every hash after it.
                </p>
                <div className={styles.chainSummary}>
                  {integrity?.valid ? (
                    <span className={`${styles.statusBadge} ${styles.statusOk}`}><ShieldCheck size={14} /> Chain verified — no tampering detected</span>
                  ) : integrity ? (
                    <span className={`${styles.statusBadge} ${styles.statusBad}`}>
                      <ShieldAlert size={14} /> Broken at sequence {integrity.brokenAtSequence}: {integrity.reason}
                    </span>
                  ) : (
                    <span className={`${styles.statusBadge} ${styles.statusNeutral}`}>No chain yet</span>
                  )}
                </div>
                {chain.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hash chain entries yet for this lot (it may predate this feature and need backfilling).
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Seq</th><th>Event</th><th>Record Hash</th><th>Recorded By</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {chain.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.sequence_number}</td>
                          <td>{entry.event_type}</td>
                          <td className={styles.hashCell}>{truncateHash(entry.record_hash)}</td>
                          <td>{entry.recorded_by}</td>
                          <td>{new Date(entry.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <h2 className={styles.sectionTitle}>Authenticity Certificates</h2>
                  {canIssue ? (
                    <Button size="sm" leftIcon={Award} isLoading={busy} disabled={chain.length === 0} onClick={() => void handleIssueCertificate()}>
                      Issue Certificate
                    </Button>
                  ) : null}
                </div>
                <p className={styles.sectionSubtitle}>
                  A certificate is a signed snapshot of the chain tip. Issuing/revoking requires Admin or Inspector.
                </p>
                {certificates.length === 0 ? (
                  <div className={styles.emptyState}>No certificates issued yet for this lot.</div>
                ) : (
                  certificates.map((cert) => (
                    <div key={cert.id} className={styles.certRow}>
                      <div>
                        <strong>{cert.certificate_number}</strong>
                        <span
                          className={`${styles.statusBadge} ${cert.revoked ? styles.statusBad : styles.statusOk}`}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          {cert.revoked ? <XCircle size={12} /> : <ShieldCheck size={12} />} {cert.revoked ? 'Revoked' : 'Active'}
                        </span>
                        <div className={styles.certMeta}>
                          Chain length {cert.chain_length} · issued by {cert.issued_by} on {new Date(cert.issued_at).toLocaleString()}
                          {cert.revoked ? ` · revoked: ${cert.revoked_reason ?? ''}` : ''}
                        </div>
                        {!cert.revoked && canIssue ? (
                          <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                            <input
                              className={styles.textInput}
                              placeholder="Reason to revoke (required)…"
                              value={revokeReasons[cert.id] ?? ''}
                              onChange={(e) => setRevokeReasons((prev) => ({ ...prev, [cert.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleRevoke(cert.id)}>
                              Revoke
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.certActions}>
                        <Button size="sm" variant="secondary" leftIcon={Link2} onClick={() => void handleShowQr(cert.id)}>
                          QR Code
                        </Button>
                        <Button size="sm" variant="secondary" leftIcon={Download} isLoading={busy} onClick={() => void handleDownloadBundle(cert.id)}>
                          Download
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Verification QR Code</h2>
              <p className={styles.sectionSubtitle}>
                Scanning this resolves to a public page — no login required — that independently recomputes the
                chain and signature to confirm authenticity.
              </p>
              {qrDataUrl && qrCertificateId ? (
                <div className={styles.qrPanel}>
                  <img className={styles.qrImage} src={qrDataUrl} alt={`Verification QR code for ${qrCertificateId}`} />
                  <span className={styles.verifyLink}>{window.location.origin}/verify-lot/{qrCertificateId}</span>
                </div>
              ) : (
                <div className={styles.emptyState}>Click "QR Code" on a certificate to generate one.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
