import React, { useState } from 'react';
import { Trash2, CheckCircle2, XCircle, Brain, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Trial } from '@/types/rd';
import styles from './AIImageAnalysisModal.module.css';

interface AIImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAddObservations: (newObsList: any[]) => void;
  trialsList?: Trial[];
}

interface BatchImageRow {
  id: string;
  name: string;
  url: string;
  selectedPlot: string;
  height: number;
  heightConf: number;
  lai: number;
  laiConf: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  extracting: boolean;
}

export const AIImageAnalysisModal: React.FC<AIImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  onBulkAddObservations,
  trialsList = []
}) => {
  const { addToast } = useToast();
  const [selectedTrialId, setSelectedTrialId] = useState<string>(trialsList[0]?.id || 'TRL-2026-001');
  const [batchRows, setBatchRows] = useState<BatchImageRow[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // Sync available plots for dropdowns based on selected trial
  const selectedTrial = trialsList.find(t => t.id === selectedTrialId);
  const plotOptions = selectedTrial 
    ? selectedTrial.locations.flatMap(loc => 
        loc.plotMap.map(cell => ({
          plotNumber: cell.plotNumber,
          entryCode: cell.entryCode,
          locationId: loc.id,
          locationName: loc.name
        }))
      )
    : [];

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Create batch rows
    const newRows: BatchImageRow[] = files.map((file, idx) => {
      // Pick a random plot from available to pre-fill
      const randomPlot = plotOptions[Math.floor(Math.random() * plotOptions.length)]?.plotNumber || `P-00${idx + 1}`;
      
      return {
        id: `${Date.now()}-${idx}`,
        name: file.name,
        url: URL.createObjectURL(file),
        selectedPlot: randomPlot,
        height: 0,
        heightConf: 0,
        lai: 0,
        laiConf: 0,
        status: 'Pending',
        extracting: true
      };
    });

    setBatchRows(prev => [...prev, ...newRows]);
    setIsProcessingAll(true);

    // Simulate batch AI pipeline processing sequentially or in small intervals
    newRows.forEach((row, i) => {
      setTimeout(() => {
        setBatchRows(current => 
          current.map(r => r.id === row.id ? {
            ...r,
            height: Number((45 + Math.random() * 20).toFixed(1)),
            heightConf: Math.floor(88 + Math.random() * 10),
            lai: Number((1.2 + Math.random() * 0.9).toFixed(2)),
            laiConf: Math.floor(85 + Math.random() * 12),
            extracting: false
          } : r)
        );

        if (i === newRows.length - 1) {
          setIsProcessingAll(false);
          addToast(`AI model successfully completed extraction for ${newRows.length} canopy images!`, 'success');
        }
      }, (i + 1) * 800);
    });
  };

  const handleRemoveRow = (id: string) => {
    setBatchRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdatePlot = (id: string, plotNo: string) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, selectedPlot: plotNo } : r));
  };

  const handleUpdateHeight = (id: string, height: number) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, height } : r));
  };

  const handleUpdateLai = (id: string, lai: number) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, lai } : r));
  };

  const handleRowStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleBulkApprove = () => {
    const unextracted = batchRows.some(r => r.extracting);
    if (unextracted) {
      addToast('Please wait for AI vision models to finish analyzing', 'warning');
      return;
    }
    // Set all pending to Approved
    setBatchRows(prev => prev.map(r => r.status === 'Pending' ? { ...r, status: 'Approved' } : r));
    addToast('All processed images approved!', 'success');
  };

  const handleCommitBatch = () => {
    const approvedRows = batchRows.filter(r => r.status === 'Approved');
    if (approvedRows.length === 0) {
      addToast('No approved rows in the batch to record', 'warning');
      return;
    }

    // Convert approved rows to PhenotypeObservations
    const newObservations = approvedRows.map(r => {
      const plotDetails = plotOptions.find(p => p.plotNumber === r.selectedPlot);
      return {
        id: `OBS-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        trialId: selectedTrialId,
        locationId: plotDetails?.locationId || 'TLOC-001',
        plotNumber: r.selectedPlot,
        entryCode: plotDetails?.entryCode || 'E01',
        date: new Date().toISOString().split('T')[0],
        growthStage: 'Vegetative',
        observedBy: 'AI Analyzer (Batch)',
        method: 'AI image analysis' as const,
        measurements: [
          { trait: 'Plant height', value: r.height, unit: 'cm', aiConfidence: r.heightConf, protocol: 'Camera projection mapping' },
          { trait: 'Leaf area index', value: r.lai, aiConfidence: r.laiConf, protocol: 'Green canopy pixel index' }
        ],
        photos: [r.url],
        notes: 'Recorded via AI Batch Image Upload.'
      };
    });

    onBulkAddObservations(newObservations);
    addToast(`Successfully recorded ${newObservations.length} batch observations to database!`, 'success');
    setBatchRows([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Batch Vision Trait Scanner (Foliage Analysis)"
      size="xl"
    >
      <div className={styles.container}>
        <div className={styles.topControlRow}>
          <div className={styles.trialSelectorWrap}>
            <label className={styles.label}>Link Batch to Trial:</label>
            <select
              className={styles.select}
              value={selectedTrialId}
              onChange={e => {
                setSelectedTrialId(e.target.value);
                setBatchRows([]); // Clear current batch as plot mappings differ
              }}
            >
              {trialsList.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.crop} ({t.name.substring(0, 20)}...)</option>
              ))}
            </select>
          </div>

          <div className={styles.bulkActionsWrap}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkApprove}
              disabled={batchRows.length === 0 || isProcessingAll}
              leftIcon={CheckCircle2}
            >
              Bulk Approve Pending
            </Button>
          </div>
        </div>

        {/* Upload drop zone */}
        <div className={styles.uploadBox}>
          <input 
            type="file" 
            id="batch-photo-upload" 
            multiple 
            accept="image/*" 
            className={styles.hiddenInput} 
            onChange={handleFilesAdded}
          />
          <label htmlFor="batch-photo-upload" className={styles.uploadLabel}>
            <Brain size={32} className={styles.brainIcon} />
            <strong>Select or Drop Crop Canopy Photos for AI Batch Analysis</strong>
            <p>Runs SeedFlow Computer Vision (ResNet-101 pipeline) on upload to extract vegetative growth height & LAI values</p>
          </label>
        </div>

        {/* Batch Rows Table */}
        {batchRows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Foliage</th>
                  <th>Image Filename</th>
                  <th>Map to Plot Cell</th>
                  <th>Extracted Height</th>
                  <th>Extracted LAI</th>
                  <th style={{ width: 140 }}>AI Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map(row => {
                  const isRowPending = row.status === 'Pending';
                  
                  return (
                    <tr key={row.id} className={styles.row}>
                      <td>
                        <div className={styles.thumbnail} style={{ backgroundImage: `url(${row.url})` }} />
                      </td>
                      <td>
                        <span className={styles.fileName}>{row.name}</span>
                      </td>
                      <td>
                        <select
                          className={styles.innerSelect}
                          value={row.selectedPlot}
                          onChange={e => handleUpdatePlot(row.id, e.target.value)}
                        >
                          {plotOptions.map(p => (
                            <option key={p.plotNumber} value={p.plotNumber}>
                              {p.plotNumber} ({p.entryCode} - {p.locationName.split(' ')[0]})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {row.extracting ? (
                          <div className={styles.loaderSmall} />
                        ) : (
                          <div className={styles.extractedValRow}>
                            <input
                              type="number"
                              className={styles.innerNumInput}
                              value={row.height}
                              onChange={e => handleUpdateHeight(row.id, parseFloat(e.target.value) || 0)}
                            />
                            <span className={styles.unitText}>cm</span>
                            <span className={styles.confBadge}>{row.heightConf}% conf</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {row.extracting ? (
                          <div className={styles.loaderSmall} />
                        ) : (
                          <div className={styles.extractedValRow}>
                            <input
                              type="number"
                              step="0.05"
                              className={styles.innerNumInput}
                              value={row.lai}
                              onChange={e => handleUpdateLai(row.id, parseFloat(e.target.value) || 0)}
                            />
                            <span className={styles.confBadge}>{row.laiConf}% conf</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {row.extracting ? (
                          <span className={styles.extractingBadge}>
                            <RefreshCw size={10} className={styles.spin} />
                            Extracting...
                          </span>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles[row.status.toLowerCase()]}`}>
                            {row.status}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionBtnGroup}>
                          {!row.extracting && isRowPending && (
                            <>
                              <button 
                                type="button" 
                                className={styles.actionBtnCheck}
                                onClick={() => handleRowStatus(row.id, 'Approved')}
                                title="Approve"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button 
                                type="button" 
                                className={styles.actionBtnX}
                                onClick={() => handleRowStatus(row.id, 'Rejected')}
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button 
                            type="button" 
                            className={styles.actionBtnTrash}
                            onClick={() => handleRemoveRow(row.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state inside modal */}
        {batchRows.length === 0 && (
          <div className={styles.emptyState}>
            <Brain size={48} className={styles.emptyIcon} />
            <h4>No canopy photos uploaded yet</h4>
            <p>Upload files above to run real-time AI visual segmentation processing.</p>
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={() => { setBatchRows([]); onClose(); }}>
            Clear & Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleCommitBatch}
            disabled={batchRows.length === 0 || isProcessingAll || !batchRows.some(r => r.status === 'Approved')}
            leftIcon={CheckCircle2}
          >
            Commit Approved Records ({batchRows.filter(r => r.status === 'Approved').length})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
