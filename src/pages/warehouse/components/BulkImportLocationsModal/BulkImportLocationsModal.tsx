import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { FileUpload } from '@/components/common/FileUpload/FileUpload';
import { Download, CheckCircle2 } from 'lucide-react';
import styles from './BulkImportLocationsModal.module.css';

interface BulkImportLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => void;
}

export const BulkImportLocationsModal: React.FC<BulkImportLocationsModalProps> = ({ isOpen, onClose, onImport }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);

  const handleImport = () => {
    console.log('Importing locations', file);
    onImport(file);
    setStep(4);
    setTimeout(() => {
      onClose();
      setStep(1);
      setFile(null);
    }, 2000);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.step}>
            <div className={styles.stepInfo}>
              <h3>Step 1: Download Template</h3>
              <p>Download our standardized CSV template to ensure your location data is correctly formatted.</p>
            </div>
            <div className={styles.actionBox}>
              <Button variant="secondary" icon={<Download size={16} />}>
                Download Template.csv
              </Button>
            </div>
            <div className={styles.footer}>
              <Button variant="primary" onClick={() => setStep(2)}>Next: Upload File</Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.step}>
            <div className={styles.stepInfo}>
              <h3>Step 2: Upload CSV</h3>
              <p>Upload the completed CSV file with your warehouse location hierarchy.</p>
            </div>
            <FileUpload 
              onFilesAdded={(files) => setFile(files[0])} 
              accept=".csv"
            />
            <div className={styles.footer}>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(3)} disabled={!file}>Next: Preview</Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className={styles.step}>
            <div className={styles.stepInfo}>
              <h3>Step 3: Preview Parsed Data</h3>
              <p>We found 42 locations in your file. Review the sample below before confirming.</p>
            </div>
            <div className={styles.previewContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Zone</th>
                    <th>Rack</th>
                    <th>Shelf</th>
                    <th>Bin</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i}>
                      <td>TG-MAIN</td>
                      <td>Cold Zone A</td>
                      <td>R-04</td>
                      <td>S-2</td>
                      <td>B-0{i}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.footer}>
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={handleImport}>Confirm & Import</Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className={styles.success}>
            <CheckCircle2 size={48} className={styles.successIcon} />
            <h3>Import Successful!</h3>
            <p>42 locations have been added to Telangana Main warehouse.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk import locations"
      size="lg"
    >
      <div className={styles.container}>
        <div className={styles.stepper}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.stepIndicator} ${step >= i ? styles.activeStep : ''} ${step > i ? styles.completedStep : ''}`}>
              <div className={styles.stepCircle}>{i}</div>
              <div className={styles.stepLine} />
            </div>
          ))}
        </div>
        {renderStep()}
      </div>
    </Modal>
  );
};
