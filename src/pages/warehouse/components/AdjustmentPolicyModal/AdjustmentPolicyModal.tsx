import { BookOpen, ShieldCheck, AlertTriangle, Camera, Archive, Undo2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import styles from './AdjustmentPolicyModal.module.css';

interface AdjustmentPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdjustmentPolicyModal({ isOpen, onClose }: AdjustmentPolicyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjustment policy" size="lg">
      <div className={styles.headerCard}>
        <div className={styles.iconBadge}><BookOpen size={20} /></div>
        <p className={styles.headerText}>
          Reference document for stock adjustment workflows. Last revised 12 Mar 2026.
        </p>
      </div>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}><ShieldCheck size={14} /> Approval thresholds</h4>
        <ul className={styles.list}>
          <li><strong>&lt; ₹10,000</strong> impact — auto-approve eligible (system correction reasons only)</li>
          <li><strong>₹10,000 – ₹50,000</strong> impact — manager approval required</li>
          <li><strong>&gt; ₹50,000</strong> impact — dual approval (manager + operations head)</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}><AlertTriangle size={14} /> Required reason codes</h4>
        <div className={styles.chipGrid}>
          <span className={styles.chip}>Cycle count variance</span>
          <span className={styles.chip}>Damaged goods</span>
          <span className={styles.chip}>Expired stock</span>
          <span className={styles.chip}>Theft / shrinkage</span>
          <span className={styles.chip}>Quality rejection</span>
          <span className={styles.chip}>System correction</span>
          <span className={styles.chip}>Other (notes mandatory)</span>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}><Camera size={14} /> Photo evidence requirements</h4>
        <p className={styles.body}>
          Photo evidence is mandatory for: <strong>Damaged goods</strong>, <strong>Theft / shrinkage</strong>, and <strong>Quality rejection</strong>. Minimum 1 photo per affected line item.
        </p>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}><Archive size={14} /> Audit retention</h4>
        <p className={styles.body}>
          All adjustment records (including photos, approvals, and timestamps) are retained for <strong>7 years</strong> per regulatory requirements.
        </p>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}><Undo2 size={14} /> Reversal policy</h4>
        <p className={styles.body}>
          Posted adjustments may be reversed within <strong>30 days</strong> of posting. Reversals create a counter-adjustment and require operations head approval. Reversals beyond 30 days require finance team escalation.
        </p>
      </section>

      <div className={styles.footer}>
        <Button variant="primary" size="sm" onClick={onClose}>Acknowledged</Button>
      </div>
    </Modal>
  );
}
