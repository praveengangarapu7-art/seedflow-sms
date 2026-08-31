import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, Loader2, ShieldCheck, ShieldX, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import {
  fetchPublicCertificateBundle,
  fetchPublicVerification,
  type AuthenticityVerificationResult,
} from '@/services/seedLotRealtimeClient';
import styles from './LotAuthenticityVerify.module.css';

/**
 * The page a QR code on a physical seed bag resolves to. Deliberately public
 * — no login, no ProtectedRoute — since a farmer scanning a bag in the field
 * has no SeedSphere account. Everything shown here comes from the backend's
 * three unauthenticated /authenticity/certificates/:id/* endpoints, which
 * independently recompute the hash chain and signature rather than trusting
 * a stored "is authentic" flag.
 */
export default function LotAuthenticityVerify() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [result, setResult] = useState<AuthenticityVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!certificateId) return;
      setLoading(true);
      setError(null);
      try {
        const verification = await fetchPublicVerification(certificateId);
        if (!cancelled) setResult(verification);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to verify this certificate');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  const handleDownload = async () => {
    if (!certificateId) return;
    setDownloading(true);
    try {
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
      setDownloading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>SeedSphere Authenticity Verification</p>

        {loading ? (
          <div className={styles.centerState}>
            <Loader2 size={28} className={styles.spinner} />
            <p>Verifying certificate…</p>
          </div>
        ) : error ? (
          <div className={styles.centerState}>
            <ShieldX size={40} color="#c0392b" />
            <p className={styles.errorText}>{error}</p>
          </div>
        ) : result ? (
          <>
            <div className={`${styles.banner} ${result.authentic ? styles.bannerAuthentic : styles.bannerNotAuthentic}`}>
              {result.authentic ? <ShieldCheck size={40} /> : <ShieldX size={40} />}
              <h1 className={styles.bannerTitle}>{result.authentic ? 'Authentic Seed Lot' : 'Not Authentic'}</h1>
              <p className={styles.bannerSubtitle}>
                {result.authentic
                  ? 'This certificate is genuine and its history is unaltered.'
                  : 'This certificate failed one or more independent checks below.'}
              </p>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Lot Code</span>
                <span className={styles.detailValue}>{result.lotCode}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Crop / Variety</span>
                <span className={styles.detailValue}>{result.crop} / {result.variety}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Certificate No.</span>
                <span className={styles.detailValue}>{result.certificateNumber}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Chain Length</span>
                <span className={styles.detailValue}>{result.chainLength} recorded event{result.chainLength === 1 ? '' : 's'}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Issued</span>
                <span className={styles.detailValue}>{new Date(result.issuedAt).toLocaleDateString()}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>{result.revoked ? 'Revoked' : 'Active'}</span>
              </div>
            </div>

            <div className={styles.checkList}>
              <div className={`${styles.checkRow} ${result.chainValid ? styles.checkOk : styles.checkBad}`}>
                {result.chainValid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                Hash chain is internally consistent (no tampering detected)
              </div>
              <div className={`${styles.checkRow} ${result.signatureValid ? styles.checkOk : styles.checkBad}`}>
                {result.signatureValid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                Digital signature matches the issuing key
              </div>
              <div className={`${styles.checkRow} ${!result.revoked ? styles.checkOk : styles.checkBad}`}>
                {!result.revoked ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                Certificate has not been revoked
              </div>
            </div>

            {result.reason ? <div className={styles.reasonText}>{result.reason}</div> : null}

            <div className={styles.actions}>
              <Button variant="secondary" leftIcon={Download} isLoading={downloading} onClick={() => void handleDownload()}>
                Download Certificate
              </Button>
            </div>

            <div className={styles.footer}>
              This page independently recomputes the seed lot's entire hash chain and signature — it does not trust a
              stored "verified" flag. The downloaded certificate can be re-checked offline, with no internet
              connection, using SeedSphere's open verification script.
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
