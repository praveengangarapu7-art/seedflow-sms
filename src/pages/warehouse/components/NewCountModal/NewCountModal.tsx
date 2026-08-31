import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { CountStrategy, CountFrequency, CycleCount } from '@/types/warehouse';
import styles from './NewCountModal.module.css';

interface NewCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: CycleCount) => void;
}

const STEPS = [
  { key: 'plan',     label: 'Plan' },
  { key: 'scope',    label: 'Scope' },
  { key: 'counters', label: 'Counters' },
  { key: 'review',   label: 'Review' },
];

const STRATEGIES: Array<{ value: CountStrategy; description: string }> = [
  { value: 'ABC-based',     description: 'Count Class A items more frequently (recommended).' },
  { value: 'Zone-based',    description: 'Count one or more entire zones.' },
  { value: 'Random',        description: 'Count randomly selected line items.' },
  { value: 'Full physical', description: 'Count entire warehouse (use sparingly).' },
  { value: 'Specific items',description: 'Count specific SKUs you select.' },
];

const FREQUENCIES: CountFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'Ad-hoc'];

const ZONES = ['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Ambient Zone 1', 'Ambient Zone 2', 'Ambient Zone 3', 'Controlled Zone', 'Quarantine', 'Staging Area', 'Dispatch Bay'];

const STAFF = ['Anjali Reddy', 'Mohammed Khan', 'Sunita Rao', 'Priya Sharma', 'Vikram Singh', 'Ramesh Kumar'];

export function NewCountModal({ isOpen, onClose, onSave }: NewCountModalProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<CountStrategy>('ABC-based');
  const [frequency, setFrequency] = useState<CountFrequency>('Weekly');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [recurring, setRecurring] = useState(false);
  const [recurringEnd, setRecurringEnd] = useState('');

  const [warehouse, setWarehouse] = useState('Telangana Main');
  const [abcClasses, setAbcClasses] = useState<string[]>(['A']);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState('20');
  const [specificSkus, setSpecificSkus] = useState('');

  const [counters, setCounters] = useState<string[]>([]);

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(0); setName(''); setStrategy('ABC-based'); setFrequency('Weekly');
      setScheduledDate(''); setScheduledTime('09:00'); setRecurring(false); setRecurringEnd('');
      setWarehouse('Telangana Main'); setAbcClasses(['A']); setSelectedZones([]);
      setRandomCount('20'); setSpecificSkus(''); setCounters([]); setNotes('');
    }
  }, [isOpen]);

  const toggleAbc = (cls: string) => setAbcClasses((p) => p.includes(cls) ? p.filter((x) => x !== cls) : [...p, cls]);
  const toggleZone = (z: string) => setSelectedZones((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z]);
  const toggleCounter = (s: string) => setCounters((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const previewLines =
    strategy === 'Full physical' ? 1850
    : strategy === 'ABC-based'  ? abcClasses.includes('A') ? 220 : abcClasses.includes('B') ? 480 : 920
    : strategy === 'Zone-based' ? selectedZones.length * 18
    : strategy === 'Random'     ? parseInt(randomCount, 10) || 0
    : specificSkus.split(/[,\n]+/).filter(Boolean).length;

  const linesPerCounter = counters.length > 0 ? Math.ceil(previewLines / counters.length) : 0;

  const canNext =
    step === 0 ? name.trim() !== '' && scheduledDate.trim() !== ''
    : step === 1 ? (
        strategy === 'ABC-based' ? abcClasses.length > 0
        : strategy === 'Zone-based' ? selectedZones.length > 0
        : strategy === 'Random' ? parseInt(randomCount, 10) > 0
        : strategy === 'Specific items' ? specificSkus.trim() !== ''
        : true
      )
    : step === 2 ? counters.length > 0
    : true;

  const submit = () => {
    const data: CycleCount = {
      id: `CYC-${Math.floor(Math.random() * 9000) + 1000}`,
      name,
      strategy,
      frequency,
      scheduledDate,
      status: 'Scheduled',
      warehouse,
      zonesScope: selectedZones,
      abcScope: abcClasses as ('A' | 'B' | 'C')[],
      assignedCounters: counters,
      totalLines: previewLines,
      countedLines: 0,
      variancesFound: 0,
      totalVarianceValue: 0,
      accuracyPct: 100,
      notes,
      lines: [],
    };

    console.log('schedule cycle count', data);
    onSave?.(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New cycle count" size="xl">
      <div className={styles.stepperWrap}>
        <Stepper steps={STEPS} currentStep={step} onStepClick={(i) => setStep(i)} />
      </div>

      {step === 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Plan</h4>
          <label className={styles.field}>
            <span>Count name</span>
            <input type="text" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold Zone A — weekly count, week 19" />
          </label>

          <div className={styles.field}>
            <span>Strategy</span>
            <div className={styles.strategyList}>
              {STRATEGIES.map((s) => (
                <label key={s.value} className={`${styles.strategyCard} ${strategy === s.value ? styles.strategyActive : ''}`}>
                  <input type="radio" name="strategy" value={s.value} checked={strategy === s.value} onChange={() => setStrategy(s.value)} />
                  <div className={styles.strategyBody}>
                    <strong>{s.value}</strong>
                    <span>{s.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Frequency</span>
              <select className={styles.input} value={frequency} onChange={(e) => setFrequency(e.target.value as CountFrequency)}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Scheduled date</span>
              <input type="text" className={styles.input} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} placeholder="DD MMM YYYY" />
            </label>
            <label className={styles.field}>
              <span>Time</span>
              <input type="text" className={styles.input} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="HH:MM" />
            </label>
            <label className={`${styles.field} ${styles.toggleField}`}>
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              <span>Repeat per frequency</span>
            </label>
            {recurring && (
              <label className={styles.field}>
                <span>End date (optional)</span>
                <input type="text" className={styles.input} value={recurringEnd} onChange={(e) => setRecurringEnd(e.target.value)} />
              </label>
            )}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Scope</h4>

          <label className={styles.field}>
            <span>Warehouse</span>
            <select className={styles.input} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <option value="Telangana Main">Telangana Main</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </label>

          {strategy === 'ABC-based' && (
            <div className={styles.field}>
              <span>ABC classes to count</span>
              <div className={styles.checkRow}>
                {(['A', 'B', 'C'] as const).map((cls) => (
                  <label key={cls} className={`${styles.checkCard} ${abcClasses.includes(cls) ? styles.checkActive : ''}`}>
                    <input type="checkbox" checked={abcClasses.includes(cls)} onChange={() => toggleAbc(cls)} />
                    <span>Class {cls}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {strategy === 'Zone-based' && (
            <div className={styles.field}>
              <span>Zones</span>
              <div className={styles.zoneChips}>
                {ZONES.map((z) => (
                  <label key={z} className={`${styles.chip} ${selectedZones.includes(z) ? styles.chipActive : ''}`}>
                    <input type="checkbox" checked={selectedZones.includes(z)} onChange={() => toggleZone(z)} />
                    <span>{z}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {strategy === 'Random' && (
            <label className={styles.field}>
              <span>How many lines to count?</span>
              <input type="number" className={styles.input} value={randomCount} min={1} onChange={(e) => setRandomCount(e.target.value)} />
            </label>
          )}

          {strategy === 'Specific items' && (
            <label className={styles.field}>
              <span>SKUs (comma- or newline-separated)</span>
              <textarea className={`${styles.input} ${styles.textarea}`} rows={4} value={specificSkus} onChange={(e) => setSpecificSkus(e.target.value)} placeholder="SD-CT-102-A, SD-MZ-204, ..." />
            </label>
          )}

          <div className={styles.preview}>
            This count will include approximately <strong>{previewLines}</strong> lines.
          </div>
        </section>
      )}

      {step === 2 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Assign counters</h4>
          <div className={styles.field}>
            <span>Select counters</span>
            <div className={styles.zoneChips}>
              {STAFF.map((s) => (
                <label key={s} className={`${styles.chip} ${counters.includes(s) ? styles.chipActive : ''}`}>
                  <input type="checkbox" checked={counters.includes(s)} onChange={() => toggleCounter(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          {counters.length > 0 && (
            <div className={styles.preview}>
              Each counter will be responsible for ~<strong>{linesPerCounter}</strong> lines.
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Review</h4>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryRow}><span>Name</span><strong>{name || '—'}</strong></div>
            <div className={styles.summaryRow}><span>Strategy</span><strong>{strategy}</strong></div>
            <div className={styles.summaryRow}><span>Frequency</span><strong>{frequency}</strong></div>
            <div className={styles.summaryRow}><span>Scheduled</span><strong>{scheduledDate} · {scheduledTime}</strong></div>
            <div className={styles.summaryRow}><span>Recurring</span><strong>{recurring ? `Yes${recurringEnd ? ` until ${recurringEnd}` : ''}` : 'No'}</strong></div>
            <div className={styles.summaryRow}><span>Warehouse</span><strong>{warehouse}</strong></div>
            <div className={styles.summaryRow}><span>Scope</span><strong>
              {strategy === 'ABC-based' ? `Class ${abcClasses.join(', ')}`
                : strategy === 'Zone-based' ? selectedZones.join(', ')
                : strategy === 'Random' ? `${randomCount} random lines`
                : strategy === 'Specific items' ? `${specificSkus.split(/[,\n]+/).filter(Boolean).length} SKUs`
                : 'Full physical inventory'}
            </strong></div>
            <div className={styles.summaryRow}><span>Counters</span><strong>{counters.join(', ') || '—'}</strong></div>
            <div className={styles.summaryRow}><span>Approx lines</span><strong>{previewLines}</strong></div>
          </div>
          <label className={styles.field}>
            <span>Notes (optional)</span>
            <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={() => { console.log('save count draft'); addToast({ type: 'success', message: 'Count saved as draft' }); onClose(); }}>Save as draft</Button>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={submit}>Schedule count</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
