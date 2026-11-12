import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { formatIndianCurrency } from '@/utils/formatters';
import { usePRs, useSuppliers } from '@/pages/procurement/procurementStore';
import styles from './POCreateModal.module.css';

type Step = 1 | 2 | 3;

interface POCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { prId: string; supplierId: string; paymentTerms: string; deliveryAddress: string }) => void;
  /** If opened from a PR detail, pre-select that PR */
  preselectedPrId?: string;
}

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Advance', 'On Delivery'];

const STEP_LABELS = ['Select PR', 'Choose Supplier', 'Review & Send'];

export function POCreateModal({ isOpen, onClose, onSubmit, preselectedPrId }: POCreateModalProps) {
  const [step,            setStep]           = useState<Step>(1);
  const [selectedPrId,    setSelectedPrId]   = useState(preselectedPrId ?? '');
  const [selectedSupId,   setSelectedSupId]  = useState('');
  const [paymentTerms,    setPaymentTerms]   = useState('Net 30');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [prs] = usePRs();
  const [suppliers] = useSuppliers();
  const APPROVED_PRS = prs.filter((p) => p.status === 'Approved' || p.id === preselectedPrId);
  const MOCK_SUPPLIERS = suppliers.filter((s) => s.classification !== 'Blacklisted');
  const selectedPR  = APPROVED_PRS.find((p) => p.id === selectedPrId);
  const selectedSup = MOCK_SUPPLIERS.find((s) => s.id === selectedSupId);

  function handleClose() {
    setStep(1);
    setSelectedPrId(preselectedPrId ?? '');
    setSelectedSupId('');
    setPaymentTerms('Net 30');
    setDeliveryAddress('');
    onClose();
  }

  function handleSend() {
    if (!selectedPrId || !selectedSupId) return;
    onSubmit({ prId: selectedPrId, supplierId: selectedSupId, paymentTerms, deliveryAddress });
    handleClose();
  }

  /* ── Stepper ──────────────────────────────────────────────────────── */
  function Stepper() {
    return (
      <div className={styles.stepper}>
        {STEP_LABELS.map((label, idx) => {
          const num = (idx + 1) as Step;
          const isActive = num === step;
          const isDone   = num < step;
          return (
            <>
              <div key={num} className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : isDone ? styles.stepCircleDone : ''}`}
                >
                  {isDone ? <Check size={14} /> : num}
                </div>
                <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>{label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div key={`conn-${idx}`} className={`${styles.stepConnector} ${isDone ? styles.stepConnectorDone : ''}`} />
              )}
            </>
          );
        })}
      </div>
    );
  }

  /* ── Step 1: Select PR ────────────────────────────────────────────── */
  function Step1() {
    return (
      <div className={styles.prList}>
        {APPROVED_PRS.map((pr) => {
          const isSelected = selectedPrId === pr.id;
          return (
            <div
              key={pr.id}
              className={`${styles.prCard} ${isSelected ? styles.prCardSelected : ''}`}
              onClick={() => setSelectedPrId(pr.id)}
            >
              <div className={`${styles.radioCircle} ${isSelected ? styles.radioCircleSelected : ''}`}>
                {isSelected && <div className={styles.radioDot} />}
              </div>
              <span className={styles.prCardId}>{pr.id}</span>
              <div className={styles.prCardInfo}>
                <div className={styles.prCardTitle}>{pr.title}</div>
                <div className={styles.prCardMeta}>{pr.department} · {pr.items} items</div>
              </div>
              <span className={styles.prCardAmount}>{formatIndianCurrency(pr.totalValue)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Step 2: Choose Supplier ──────────────────────────────────────── */
  function Step2() {
    const badgeClass = (cls: string) =>
      cls === 'Preferred' ? styles.badgePreferred :
      cls === 'Approved'  ? styles.badgeApproved  :
      styles.badgeRegistered;

    return (
      <div className={styles.supplierGrid}>
        {MOCK_SUPPLIERS.map((sup) => {
          const isSelected = selectedSupId === sup.id;
          return (
            <div
              key={sup.id}
              className={`${styles.supplierCard} ${isSelected ? styles.supplierCardSelected : ''}`}
              onClick={() => setSelectedSupId(sup.id)}
            >
              <div className={styles.supplierName}>{sup.name}</div>
              <div className={styles.supplierMeta}>
                <span className={`${styles.supplierBadge} ${badgeClass(sup.classification)}`}>
                  {sup.classification}
                </span>
                <span>Q: {sup.qualityScore} · D: {sup.deliveryScore}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Last PO: {sup.lastPODate}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Step 3: Review ───────────────────────────────────────────────── */
  function Step3() {
    if (!selectedPR || !selectedSup) return null;
    return (
      <>
        <div className={styles.reviewSection}>
          <p className={styles.reviewTitle}>Order Summary</p>
          <div className={styles.reviewGrid}>
            <div className={styles.reviewItem}>
              <span className={styles.reviewKey}>PR Reference</span>
              <span className={styles.reviewVal}>{selectedPR.id}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewKey}>Supplier</span>
              <span className={styles.reviewVal}>{selectedSup.name}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewKey}>Department</span>
              <span className={styles.reviewVal}>{selectedPR.department}</span>
            </div>
            <div className={styles.reviewItem}>
              <span className={styles.reviewKey}>Items</span>
              <span className={styles.reviewVal}>{selectedPR.items} line items</span>
            </div>
          </div>
        </div>

        <div className={styles.reviewSection}>
          <p className={styles.reviewTitle}>Payment &amp; Delivery</p>
          <div className={styles.reviewGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Payment Terms</label>
              <select
                className={styles.select}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              >
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Delivery Address</label>
              <input
                className={styles.input}
                placeholder="Delivery location"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Estimated Order Value</span>
          <span className={styles.totalAmount}>{formatIndianCurrency(selectedPR.totalValue)}</span>
        </div>
      </>
    );
  }

  /* ── Footer ───────────────────────────────────────────────────────── */
  const footer = (
    <div className={styles.footer}>
      <div>
        {step > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => (s - 1) as Step)}>
            Back
          </Button>
        )}
      </div>
      <div className={styles.footerRight}>
        <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
        {step < 3 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={step === 1 ? !selectedPrId : !selectedSupId}
          >
            Next
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleSend}>
            Create &amp; Send PO
          </Button>
        )}
      </div>
    </div>
  );

  const title =
    step === 1 ? 'Create Purchase Order — Step 1 of 3: Select PR' :
    step === 2 ? 'Create Purchase Order — Step 2 of 3: Choose Supplier' :
                 'Create Purchase Order — Step 3 of 3: Review & Send';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg" footer={footer}>
      <Stepper />
      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
    </Modal>
  );
}
