import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GenealogyTree } from '@/components/GenealogyTree/GenealogyTree';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  fetchGenealogy,
  fetchSeedLots,
  login,
  type GenealogyResult,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedLotGenealogy.module.css';

export default function SeedLotGenealogy() {
  const { id: routeLotId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(1); // Breeder by default
  const [token, setToken] = useState<string | null>(null);

  const [allLots, setAllLots] = useState<RealtimeSeedLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>(routeLotId ?? '');
  const [genealogy, setGenealogy] = useState<GenealogyResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);

        const lots = await fetchSeedLots(accessToken);
        if (cancelled) return;
        setAllLots(lots);

        if (!routeLotId && lots.length > 0) {
          const preferred = lots.find((lot) => lot.stage === 'Certified') ?? lots[0];
          // Functional update: if the user already picked a lot from the
          // dropdown while this async bootstrap was still in flight, don't
          // clobber their choice.
          setSelectedLotId((current) => current || preferred.id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the inventory service');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const loadGenealogy = useCallback(
    async (lotId: string) => {
      if (!token || !lotId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchGenealogy(token, lotId);
        setGenealogy(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load genealogy';
        setError(message);
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [token, addToast],
  );

  useEffect(() => {
    if (token && selectedLotId) {
      void loadGenealogy(selectedLotId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedLotId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Lot Genealogy &amp; Traceability</h1>
          <p className={styles.subtitle}>
            Parent Lot → Harvest → Test → Split → Current Lot, built from real seed lot, lab-testing, and allocation records.
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
          <select
            className={styles.select}
            value={selectedLotId}
            onChange={(e) => {
              setSelectedLotId(e.target.value);
              navigate(`/seed-lot-genealogy/${e.target.value}`, { replace: true });
            }}
          >
            <option value="">Select a seed lot</option>
            {allLots
              .slice()
              .sort((a, b) => a.lot_code.localeCompare(b.lot_code))
              .map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code} — {lot.stage}
                </option>
              ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.card} style={{ marginBottom: '1rem' }}><span className={styles.errorText}>{error}</span></div> : null}

      {!genealogy && !loading ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>Select a seed lot to view its genealogy.</div>
        </div>
      ) : genealogy ? (
        <GenealogyTree genealogy={genealogy} />
      ) : null}
    </div>
  );
}
