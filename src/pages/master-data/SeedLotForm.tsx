import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { masterDataApi, type Organization, type SeedClass, type SeedLot, type SeedVariety } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  createSeedLotRecord,
  getSeedLotById,
  getSeedLotStore,
  seedLotClassOptions,
  seedLotCode,
  seedLotOrganizations,
  seedLotVarieties,
  updateSeedLotRecord,
} from './seedLotData';
import styles from './master-data.module.css';

export default function SeedLotForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { addToast } = useToast();

  const [varieties, setVarieties] = useState<SeedVariety[]>(seedLotVarieties);
  const [organizations, setOrganizations] = useState<Organization[]>(seedLotOrganizations);
  // Module-level store, read each render so a newly registered Breeder lot is
  // immediately selectable as a Foundation lot's parent.
  const allLots: SeedLot[] = getSeedLotStore();

  const [varietyId, setVarietyId] = useState(seedLotVarieties[0]?.id ?? '');
  const [seedClass, setSeedClass] = useState<SeedClass>('Breeder');
  const [sourceOrgId, setSourceOrgId] = useState(seedLotOrganizations[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [parentLotId, setParentLotId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageTitle = useMemo(() => (isEdit ? 'Edit Seed Lot' : 'Register Seed Lot'), [isEdit]);

  // Breeder lots for the selected variety — the pool a Foundation lot's parentLotId can point to.
  const eligibleParentLots = useMemo(
    () => allLots.filter((lot) => lot.seedClass === 'Breeder' && lot.varietyId === varietyId),
    [allLots, varietyId],
  );

  useEffect(() => {
    const loadReference = async () => {
      try {
        const [varietiesData, orgsData] = await Promise.all([
          masterDataApi.getVarieties(),
          masterDataApi.getOrganizations(),
        ]);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedLotVarieties);
        setOrganizations(Array.isArray(orgsData) && orgsData.length > 0 ? orgsData : seedLotOrganizations);
      } catch {
        setVarieties(seedLotVarieties);
        setOrganizations(seedLotOrganizations);
      }
    };
    void loadReference();
  }, []);

  useEffect(() => {
    function applyLot(data: SeedLot) {
      setVarietyId(data.varietyId ?? seedLotVarieties[0]?.id ?? '');
      setSeedClass(data.seedClass ?? 'Breeder');
      setSourceOrgId(data.sourceOrgId ?? seedLotOrganizations[0]?.id ?? '');
      setQuantity(String(data.quantity ?? ''));
      setProductionDate(data.productionDate ?? '');
      setParentLotId(data.parentLotId ?? '');
    }

    const load = async () => {
      if (!isEdit || !id) return;
      try {
        const data = await masterDataApi.getSeedLot(id);
        applyLot(data);
      } catch {
        const local = getSeedLotById(id);
        if (local) {
          applyLot(local);
        } else {
          setError('Unable to load seed lot.');
        }
      }
    };

    void load();
  }, [id, isEdit]);

  // Foundation lots must trace back to a Breeder lot; clear a stale selection if the variety changes.
  useEffect(() => {
    if (seedClass !== 'Foundation') {
      setParentLotId('');
      return;
    }
    if (parentLotId && !eligibleParentLots.some((lot) => lot.id === parentLotId)) {
      setParentLotId('');
    }
  }, [seedClass, eligibleParentLots, parentLotId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!varietyId) {
      setError('Please select a variety.');
      return;
    }
    if (!sourceOrgId) {
      setError('Please select a source organization.');
      return;
    }
    const quantityValue = Number(quantity);
    if (!quantity || Number.isNaN(quantityValue) || quantityValue <= 0) {
      setError('Quantity must be a positive number.');
      return;
    }
    if (!productionDate) {
      setError('Production date is required.');
      return;
    }
    if (seedClass === 'Foundation' && !parentLotId) {
      setError('A Foundation lot must link back to its Breeder source lot.');
      return;
    }

    setLoading(true);

    try {
      const payload: Partial<SeedLot> = {
        varietyId,
        seedClass,
        sourceOrgId,
        quantity: quantityValue,
        productionDate,
        parentLotId: seedClass === 'Foundation' ? parentLotId : undefined,
      };

      if (isEdit && id) {
        try {
          await masterDataApi.updateSeedLot(id, payload);
          addToast('Seed lot updated successfully', 'success');
        } catch {
          updateSeedLotRecord(id, payload);
          addToast('Seed lot updated (offline mode — no backend connected)', 'info');
        }
      } else {
        try {
          await masterDataApi.createSeedLot(payload);
          addToast('Seed lot registered successfully', 'success');
        } catch {
          const created = createSeedLotRecord(payload as Omit<SeedLot, 'id'>);
          addToast(`Seed lot ${seedLotCode(created)} registered (offline mode — no backend connected)`, 'info');
        }
      }
      navigate('/seed-lots');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save seed lot';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.subtitle}>Register Breeder or Foundation seed lots ahead of Certified Seed Production.</p>
        </div>
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/seed-lots')}>
          Back to list
        </Button>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? <div className={styles.errorText}>{error}</div> : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="variety">Variety</label>
            <select id="variety" className={styles.select} value={varietyId} onChange={(e) => setVarietyId(e.target.value)}>
              {varieties.map((variety) => (
                <option key={variety.id} value={variety.id}>
                  {variety.name} ({variety.crop})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="seedClass">Seed Class</label>
            <select
              id="seedClass"
              className={styles.select}
              value={seedClass}
              onChange={(e) => setSeedClass(e.target.value as SeedClass)}
            >
              {seedLotClassOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {seedClass === 'Foundation' ? (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="parentLot">Parent Breeder Lot</label>
              <select
                id="parentLot"
                className={styles.select}
                value={parentLotId}
                onChange={(e) => setParentLotId(e.target.value)}
                disabled={eligibleParentLots.length === 0}
              >
                <option value="">
                  {eligibleParentLots.length === 0 ? 'No Breeder lots for this variety yet' : 'Select the source Breeder lot'}
                </option>
                {eligibleParentLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {seedLotCode(lot)} — {lot.quantity.toLocaleString()}kg available
                  </option>
                ))}
              </select>
              <span className={styles.helperText}>
                Links this Foundation lot back to the Breeder lot it was multiplied from, for traceability.
              </span>
            </div>
          ) : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sourceOrg">Source Organization</label>
            <select id="sourceOrg" className={styles.select} value={sourceOrgId} onChange={(e) => setSourceOrgId(e.target.value)}>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="quantity">Quantity (kg)</label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 1800"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="productionDate">Production Date</label>
              <input
                id="productionDate"
                type="date"
                className={styles.input}
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              {isEdit ? 'Save changes' : 'Register seed lot'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/seed-lots')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
