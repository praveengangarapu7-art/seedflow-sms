import { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { PhotoUpload } from '@/components/common/PhotoUpload/PhotoUpload';
import { useToast } from '@/components/common/Toast/ToastContext';
import { X } from 'lucide-react';
import type { GermplasmTrait, TraitCategory } from '@/types/rd';
import styles from './NewAccessionFormModal.module.css';

interface NewAccessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropOptions: string[];
}

const steps = [
  { key: 'basic', label: 'Basic info' },
  { key: 'origin', label: 'Origin & passport' },
  { key: 'traits', label: 'Traits' },
  { key: 'pedigree', label: 'Pedigree & docs' }
];

export function NewAccessionFormModal({ isOpen, onClose, cropOptions }: NewAccessionFormModalProps) {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Traits state
  const [traits, setTraits] = useState<GermplasmTrait[]>([]);
  const [traitForm, setTraitForm] = useState({ name: '', category: 'Agronomic' as TraitCategory, value: '', unit: '' });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
    }
  };

  const handleSubmit = () => {
    // In a real app we'd useRealtimeMockStore to append
    addToast('Accession GRM-2026-NEW added', 'success');
    onClose();
    setTimeout(() => setCurrentStep(0), 300);
  };

  const addTrait = () => {
    if (!traitForm.name || !traitForm.value) return;
    setTraits(prev => [...prev, { ...traitForm }]);
    setTraitForm({ name: '', category: 'Agronomic', value: '', unit: '' });
  };

  const removeTrait = (index: number) => {
    setTraits(prev => prev.filter((_, i) => i !== index));
  };

  const quickAddTrait = (name: string, category: TraitCategory) => {
    setTraitForm(prev => ({ ...prev, name, category }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Add new accession">
      <div className={styles.container}>
        <div className={styles.stepperWrap}>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <div className={styles.content}>
          {currentStep === 0 && (
            <div className={styles.stepForm}>
              <div className={styles.row}>
                <Input label="Accession number" placeholder="e.g. IC-12345" defaultValue="IC-AUTO-1" />
                <Input label="Name *" placeholder="Accession name" required />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Crop *</label>
                  <select className={styles.select}>
                    <option value="">Select crop</option>
                    {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Type *</label>
                  <select className={styles.select}>
                    <option value="Landrace">Landrace</option>
                    <option value="Wild relative">Wild relative</option>
                    <option value="Cultivar">Cultivar</option>
                    <option value="Breeding line">Breeding line</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Genetic stock">Genetic stock</option>
                  </select>
                </div>
              </div>
              <div className={styles.row}>
                <Input label="Species" placeholder="e.g., Gossypium hirsutum" />
                <Input label="Donor (optional)" placeholder="Institution or person" />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Custody</label>
                  <select className={styles.select}>
                    <option value="NBPGR">NBPGR</option>
                    <option value="IARI">IARI</option>
                    <option value="CICR">CICR</option>
                    <option value="ICRISAT">ICRISAT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select className={styles.select} defaultValue="Active">
                    <option value="Active">Active</option>
                    <option value="Quarantine">Quarantine</option>
                    <option value="Archived">Archived</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className={styles.stepForm}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Country</label>
                  <select className={styles.select} defaultValue="India">
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                    <option value="Mexico">Mexico</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>State</label>
                  <select className={styles.select}>
                    <option value="">Select state</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Karnataka">Karnataka</option>
                  </select>
                </div>
              </div>
              <div className={styles.row}>
                <Input label="Collection site" placeholder="e.g., District or village" />
                <DatePicker label="Collection date" value="" onChange={() => {}} />
              </div>
              <div className={styles.row}>
                <Input label="Latitude" type="number" placeholder="e.g., 23.25" />
                <Input label="Longitude" type="number" placeholder="e.g., 69.66" />
                <Input label="Altitude (m)" type="number" placeholder="Meters" />
              </div>
              <div className={styles.field}>
                <label>Biological status</label>
                <select className={styles.select}>
                  <option value="">Select status</option>
                  <option value="Wild">Wild</option>
                  <option value="Weedy">Weedy</option>
                  <option value="Cultivar">Cultivar</option>
                  <option value="Landrace">Landrace</option>
                  <option value="Breeding material">Breeding material</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepForm}>
              <div className={styles.quickAdd}>
                <span className={styles.quickAddLabel}>Quick add:</span>
                <button type="button" className={styles.chipBtn} onClick={() => quickAddTrait('Yield potential', 'Agronomic')}>Yield potential</button>
                <button type="button" className={styles.chipBtn} onClick={() => quickAddTrait('Days to maturity', 'Agronomic')}>Days to maturity</button>
                <button type="button" className={styles.chipBtn} onClick={() => quickAddTrait('Disease resistance', 'Disease resistance')}>Disease resistance</button>
                <button type="button" className={styles.chipBtn} onClick={() => quickAddTrait('Drought tolerance', 'Stress tolerance')}>Drought tolerance</button>
              </div>

              <div className={styles.traitInlineForm}>
                <Input 
                  placeholder="Trait name" 
                  value={traitForm.name} 
                  onChange={e => setTraitForm(p => ({...p, name: e.target.value}))} 
                />
                <select 
                  className={styles.select} 
                  value={traitForm.category}
                  onChange={e => setTraitForm(p => ({...p, category: e.target.value as TraitCategory}))}
                >
                  <option value="Agronomic">Agronomic</option>
                  <option value="Quality">Quality</option>
                  <option value="Stress tolerance">Stress tolerance</option>
                  <option value="Disease resistance">Disease resistance</option>
                  <option value="Morphological">Morphological</option>
                </select>
                <Input 
                  placeholder="Value" 
                  value={traitForm.value} 
                  onChange={e => setTraitForm(p => ({...p, value: e.target.value}))} 
                />
                <Input 
                  placeholder="Unit (opt)" 
                  value={traitForm.unit} 
                  onChange={e => setTraitForm(p => ({...p, unit: e.target.value}))} 
                />
                <Button variant="secondary" onClick={addTrait}>+ Add</Button>
              </div>

              {traits.length > 0 && (
                <div className={styles.traitList}>
                  {traits.map((t, i) => (
                    <div key={i} className={styles.traitItem}>
                      <div className={styles.traitInfo}>
                        <span className={styles.tName}>{t.name}</span>
                        <span className={styles.tCat}>{t.category}</span>
                        <span className={styles.tVal}>{t.value} {t.unit}</span>
                      </div>
                      <button className={styles.deleteBtn} onClick={() => removeTrait(i)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepForm}>
              <div className={styles.row}>
                <Input label="Parent male (ID or Name)" placeholder="Search accessions..." />
                <Input label="Parent female (ID or Name)" placeholder="Search accessions..." />
              </div>
              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input type="checkbox" className={styles.checkbox} />
                  Has genomic data available
                </label>
              </div>
              <div className={styles.field}>
                <label>Photos</label>
                <PhotoUpload maxPhotos={5} photos={[]} onAdd={() => {}} onRemove={() => {}} />
              </div>
              <div className={styles.field}>
                <label>Notes</label>
                <textarea className={styles.textarea} rows={3} placeholder="Additional context..."></textarea>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>
          <div className={styles.footerRight}>
            <Button variant="secondary" onClick={() => addToast('Draft saved', 'info')}>
              Save as draft
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button variant="primary" onClick={handleNext}>
                Next step
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit}>
                Save accession
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
