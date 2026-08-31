import { useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './PrintLabelsModal.module.css';

interface PrintLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LabelScope = 'all' | 'zones' | 'specific';
const FORMATS = ['50×30 mm', '75×50 mm', '100×75 mm'];

const ZONE_OPTIONS = ['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Ambient Zone 1', 'Ambient Zone 2', 'Quarantine', 'Controlled Zone', 'Dispatch Bay'];

export function PrintLabelsModal({ isOpen, onClose }: PrintLabelsModalProps) {
  const { addToast } = useToast();
  const [scope, setScope] = useState<LabelScope>('all');
  const [zones, setZones] = useState<string[]>([]);
  const [bins, setBins] = useState('');
  const [format, setFormat] = useState(FORMATS[0]);
  const [perBin, setPerBin] = useState('1');

  const toggleZone = (z: string) => {
    setZones((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]);
  };

  const estimatedCount = scope === 'all' ? 124 : scope === 'zones' ? zones.length * 18 : Math.max(1, bins.split(',').filter((b) => b.trim()).length) * parseInt(perBin, 10);

  const handleAddToQueue = () => {
    console.log('add to print queue', { scope, zones, bins, format, perBin });
    addToast({ type: 'success', message: `Added ${estimatedCount} labels to print queue` });
    onClose();
  };

  const handleGeneratePdf = () => {
    console.log('generate PDF', { scope, zones, bins, format, perBin });
    addToast({ type: 'success', message: `PDF generated with ${estimatedCount} labels` });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print bin labels" size="md">
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Label scope</h4>
        <div className={styles.radioRow}>
          {([
            { v: 'all',       label: 'All bins' },
            { v: 'zones',     label: 'Selected zones' },
            { v: 'specific',  label: 'Specific bins' },
          ] as Array<{ v: LabelScope; label: string }>).map((opt) => (
            <label key={opt.v} className={`${styles.radioCard} ${scope === opt.v ? styles.radioActive : ''}`}>
              <input type="radio" name="label-scope" checked={scope === opt.v} onChange={() => setScope(opt.v)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        {scope === 'zones' && (
          <div className={styles.zoneGrid}>
            {ZONE_OPTIONS.map((z) => (
              <label key={z} className={`${styles.zoneChip} ${zones.includes(z) ? styles.zoneActive : ''}`}>
                <input type="checkbox" checked={zones.includes(z)} onChange={() => toggleZone(z)} />
                <span>{z}</span>
              </label>
            ))}
          </div>
        )}

        {scope === 'specific' && (
          <label className={styles.field}>
            <span>Bin codes (comma separated)</span>
            <input type="text" className={styles.input} placeholder="A-R5-S2-B14, B-R3-S1-B07" value={bins} onChange={(e) => setBins(e.target.value)} />
          </label>
        )}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Format</h4>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Label size</span>
            <select className={styles.input} value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Quantity per bin</span>
            <select className={styles.input} value={perBin} onChange={(e) => setPerBin(e.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.summary}>
        Estimated total: <strong>{estimatedCount} labels</strong>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" leftIcon={FileDown} onClick={handleGeneratePdf}>Generate PDF</Button>
          <Button variant="primary" size="sm" leftIcon={Printer} onClick={handleAddToQueue}>Add to print queue</Button>
        </div>
      </div>
    </Modal>
  );
}
