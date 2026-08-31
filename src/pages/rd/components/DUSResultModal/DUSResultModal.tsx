import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { useToast } from '@/components/common/Toast/ToastContext';
import styles from './DUSResultModal.module.css';

interface DUSResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName?: string;
  year?: string;
  onSave?: (result: any) => void;
}

export const DUSResultModal: React.FC<DUSResultModalProps> = ({
  isOpen,
  onClose,
  locationName = '',
  year = 'Year 1',
  onSave,
}) => {
  const { addToast } = useToast();

  // Form states
  const [location, setLocation] = useState(locationName);
  const [testYear, setTestYear] = useState(year);
  const [testDate, setTestDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [testedBy, setTestedBy] = useState('');

  // DUS parameters
  const [distinctness, setDistinctness] = useState<'Pass' | 'Fail'>('Pass');
  const [distinctnessNotes, setDistinctnessNotes] = useState('Distinct from 12 reference varieties on 8 traits');
  
  const [uniformity, setUniformity] = useState<'Pass' | 'Fail'>('Pass');
  const [uniformityNotes, setUniformityNotes] = useState('Plant height CV: 4.2% within tolerance');

  const [stability, setStability] = useState<'Pass' | 'Fail'>('Pass');
  const [stabilityNotes, setStabilityNotes] = useState('Year 1 vs Year 2 trait values within ±5%');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      addToast('Location is required', 'warning');
      return;
    }
    if (!testedBy.trim()) {
      addToast('Tested by technician name is required', 'warning');
      return;
    }

    const payload = {
      location,
      year: testYear,
      testDate,
      testedBy,
      results: {
        distinctness: { status: distinctness, notes: distinctnessNotes },
        uniformity: { status: uniformity, notes: uniformityNotes },
        stability: { status: stability, notes: stabilityNotes },
      }
    };

    onSave?.(payload);
    addToast(`DUS test result saved for ${location} (${testYear})`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add DUS Field Test Result"
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.container}>
        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Trial Location <span className={styles.required}>*</span></label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Hyderabad Research Farm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Trial Year <span className={styles.required}>*</span></label>
            <select
              className={styles.select}
              value={testYear}
              onChange={(e) => setTestYear(e.target.value)}
            >
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <DatePicker
              label="Evaluation Date"
              value={testDate}
              onChange={setTestDate}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Evaluated By <span className={styles.required}>*</span></label>
            <input
              type="text"
              className={styles.input}
              placeholder="Technician/Breeder name"
              value={testedBy}
              onChange={(e) => setTestedBy(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.divider} />

        {/* Distinctness Section */}
        <div className={styles.testSection}>
          <div className={styles.testHeader}>
            <h4 className={styles.sectionTitle}>1. Distinctness (D)</h4>
            <div className={styles.statusRadios}>
              <label className={`${styles.radioLabel} ${distinctness === 'Pass' ? styles.passActive : ''}`}>
                <input
                  type="radio"
                  name="distinctness"
                  checked={distinctness === 'Pass'}
                  onChange={() => setDistinctness('Pass')}
                />
                Pass
              </label>
              <label className={`${styles.radioLabel} ${distinctness === 'Fail' ? styles.failActive : ''}`}>
                <input
                  type="radio"
                  name="distinctness"
                  checked={distinctness === 'Fail'}
                  onChange={() => setDistinctness('Fail')}
                />
                Fail
              </label>
            </div>
          </div>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Document traits that differentiate this candidate variety from regional standard check references..."
            value={distinctnessNotes}
            onChange={(e) => setDistinctnessNotes(e.target.value)}
          />
        </div>

        {/* Uniformity Section */}
        <div className={styles.testSection}>
          <div className={styles.testHeader}>
            <h4 className={styles.sectionTitle}>2. Uniformity (U)</h4>
            <div className={styles.statusRadios}>
              <label className={`${styles.radioLabel} ${uniformity === 'Pass' ? styles.passActive : ''}`}>
                <input
                  type="radio"
                  name="uniformity"
                  checked={uniformity === 'Pass'}
                  onChange={() => setUniformity('Pass')}
                />
                Pass
              </label>
              <label className={`${styles.radioLabel} ${uniformity === 'Fail' ? styles.failActive : ''}`}>
                <input
                  type="radio"
                  name="uniformity"
                  checked={uniformity === 'Fail'}
                  onChange={() => setUniformity('Fail')}
                />
                Fail
              </label>
            </div>
          </div>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="Record coefficients of variation (CV) for phenotypes to show intra-variety consistency..."
            value={uniformityNotes}
            onChange={(e) => setUniformityNotes(e.target.value)}
          />
        </div>

        {/* Stability Section */}
        <div className={styles.testSection}>
          <div className={styles.testHeader}>
            <h4 className={styles.sectionTitle}>3. Stability (S)</h4>
            <div className={styles.statusRadios}>
              <label className={`${styles.radioLabel} ${stability === 'Pass' ? styles.passActive : ''}`}>
                <input
                  type="radio"
                  name="stability"
                  checked={stability === 'Pass'}
                  onChange={() => setStability('Pass')}
                />
                Pass
              </label>
              <label className={`${styles.radioLabel} ${stability === 'Fail' ? styles.failActive : ''}`}>
                <input
                  type="radio"
                  name="stability"
                  checked={stability === 'Fail'}
                  onChange={() => setStability('Fail')}
                />
                Fail
              </label>
            </div>
          </div>
          <textarea
            className={styles.textarea}
            rows={2}
            placeholder="State phenotypic measurements over seasonal generations (Year 1 vs Year 2 comparisons)..."
            value={stabilityNotes}
            onChange={(e) => setStabilityNotes(e.target.value)}
          />
        </div>

        <div className={styles.footer}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" leftIcon={Check}>
            Save DUS Result
          </Button>
        </div>
      </form>
    </Modal>
  );
};
