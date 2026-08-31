import { useState } from 'react';
import { Search, ArrowRight, Truck, Factory, Package, BadgeCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { processingNav } from '@/config/processingNav';
import { usePermission } from '@/hooks/usePermission';
import styles from './Traceability.module.css';

export default function TraceabilityPage() {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('BT-2026-1142');
  const [searched, setSearched] = useState(true);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [recallReason, setRecallReason] = useState('');
  const [isRecalled, setIsRecalled] = useState(false);

  const canRecall = usePermission('initiate_recall');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      addToast('Please enter a valid search ID.', 'warning');
      return;
    }
    setSearched(true);
    addToast(`Trace results loaded for ${searchQuery}`, 'success');
  };

  const triggerRecall = () => {
    if (!recallReason) {
      addToast('Please specify a reason for recall.', 'warning');
      return;
    }
    setIsRecalled(true);
    setShowRecallModal(false);
    addToast(`Recall initiated for all child lots of ${searchQuery}. Status updated.`, 'error');
  };

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Search} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Genealogy & Traceability</h1>
          <p className={styles.pageSubtitle}>
            Perform end-to-end forward and backward lot tracing by Lot ID, Batch ID, or QR code serial number
          </p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Search Input Panel */}
      <div className={styles.searchPanel}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchFieldWrap}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Enter Batch ID (e.g. BT-2026-1142), Lot ID, or QR tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <Button variant="primary" type="submit">
            Trace Lot
          </Button>
        </form>
        <div className={styles.suggestions}>
          <span>Try tracing:</span>
          <button onClick={() => { setSearchQuery('BT-2026-1142'); setSearched(true); }}>BT-2026-1142 (Batch)</button>
          <button onClick={() => { setSearchQuery('LOT-COT-2026-0142'); setSearched(true); }}>LOT-COT-2026-0142 (Intake)</button>
          <button onClick={() => { setSearchQuery('PKG-BT-2026-1142-0001'); setSearched(true); }}>PKG-BT-2026-1142-0001 (Pack)</button>
        </div>
      </div>

      {/* Trace Tree Visualizer */}
      {searched && (
        <div className={styles.traceContainer}>
          <div className={styles.traceHeader}>
            <div className={styles.traceSummary}>
              <h3>Trace Results for: <span className={styles.queryHighlight}>{searchQuery}</span></h3>
              <p>Path: Raw Intake Lot ➜ Processing Batch ➜ Pack Runs ➜ Quality Certificate</p>
            </div>
            {canRecall && (
              <div>
                <Button
                  variant={isRecalled ? 'secondary' : 'danger'}
                  leftIcon={AlertTriangle}
                  onClick={() => {
                    if (isRecalled) {
                      addToast('Recall has already been triggered for this lot.', 'info');
                    } else {
                      setShowRecallModal(true);
                    }
                  }}
                >
                  {isRecalled ? 'Recall Active' : 'Simulate Recall'}
                </Button>
              </div>
            )}
          </div>

          {isRecalled && (
            <div className={styles.recallAlert}>
              <ShieldAlert className={styles.alertIcon} size={24} />
              <div>
                <h4>RECALL UNDERWAY</h4>
                <p>This lot and all related packaged materials are flagged as <strong>RECALLED</strong> in the ERP. Reason: {recallReason || 'Seed viability testing failure'}</p>
              </div>
            </div>
          )}

          {/* Genealogy Tree Visual Render */}
          <div className={styles.treeViewport}>
            {/* Stage 1: Raw Intake */}
            <div className={styles.treeNode}>
              <div className={styles.nodeIconWrap} style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                <Truck size={24} />
              </div>
              <div className={styles.nodeContent}>
                <span className={styles.nodeLabel}>1. Raw Intake Lot</span>
                <h4 className={styles.nodeTitle}>LOT-COT-2026-0142</h4>
                <p className={styles.nodeMeta}>Cotton (Bt RCH-2 BG-II)</p>
                <p className={styles.nodeMeta}>Supplier: Patel Cotton Growers</p>
                <span className={styles.nodeBadge}>Accepted (32,400 kg)</span>
              </div>
            </div>

            <div className={styles.connector}>
              <ArrowRight size={20} className={styles.connectorArrow} />
            </div>

            {/* Stage 2: Processing Batch */}
            <div className={`${styles.treeNode} ${styles.activeNode}`}>
              <div className={styles.nodeIconWrap} style={{ background: '#fef7e0', color: '#f5af12' }}>
                <Factory size={24} />
              </div>
              <div className={styles.nodeContent}>
                <span className={styles.nodeLabel}>2. Processing Batch</span>
                <h4 className={styles.nodeTitle}>BT-2026-1142</h4>
                <p className={styles.nodeMeta}>Aurangabad Plant</p>
                <p className={styles.nodeMeta}>Yield Recovery: 82.4%</p>
                <span className={`${styles.nodeBadge} ${isRecalled ? styles.recalledBadge : ''}`}>
                  {isRecalled ? 'RECALLED' : 'Completed (26,690 kg)'}
                </span>
              </div>
            </div>

            <div className={styles.connector}>
              <ArrowRight size={20} className={styles.connectorArrow} />
            </div>

            {/* Stage 3: Packaging Runs */}
            <div className={styles.treeNode}>
              <div className={styles.nodeIconWrap} style={{ background: '#e6f4ea', color: '#137333' }}>
                <Package size={24} />
              </div>
              <div className={styles.nodeContent}>
                <span className={styles.nodeLabel}>3. Pack Runs (30 lots)</span>
                <h4 className={styles.nodeTitle}>PKG-BT-2026-1142-0001..30</h4>
                <p className={styles.nodeMeta}>1 kg Bags (50 units each)</p>
                <p className={styles.nodeMeta}>Applied Secure QR labels</p>
                <span className={`${styles.nodeBadge} ${isRecalled ? styles.recalledBadge : ''}`}>
                  {isRecalled ? 'RECALLED' : 'Stored in Warehouse B'}
                </span>
              </div>
            </div>

            <div className={styles.connector}>
              <ArrowRight size={20} className={styles.connectorArrow} />
            </div>

            {/* Stage 4: Certifications */}
            <div className={styles.treeNode}>
              <div className={styles.nodeIconWrap} style={{ background: '#fce8e6', color: '#d93025' }}>
                <BadgeCheck size={24} />
              </div>
              <div className={styles.nodeContent}>
                <span className={styles.nodeLabel}>4. Certification</span>
                <h4 className={styles.nodeTitle}>CERT-MH-2026-0142</h4>
                <p className={styles.nodeMeta}>MSSCA Agency (Maharashtra)</p>
                <p className={styles.nodeMeta}>Expiry: 2027-05-14</p>
                <span className={`${styles.nodeBadge} ${isRecalled ? styles.recalledBadge : ''}`}>
                  {isRecalled ? 'Revoked' : 'Active (Foundation)'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Table of Associated Items */}
          <div className={styles.detailsSection}>
            <h3>Associated Trace Logs</h3>
            <div className={styles.gridDetails}>
              <div className={styles.detailCard}>
                <h4>Quality Checkpoints</h4>
                <ul>
                  <li><strong>Intake Moisture:</strong> 10.2% (Target &lt;12%) - Pass</li>
                  <li><strong>Drying Temp:</strong> 42°C - Normal</li>
                  <li><strong>In-process Purity:</strong> 99.1% - Pass</li>
                  <li><strong>Final Germination:</strong> 92% - Pass</li>
                </ul>
              </div>

              <div className={styles.detailCard}>
                <h4>Logistics & Custody</h4>
                <ul>
                  <li><strong>Vehicle ID:</strong> MH-12-AB-1234</li>
                  <li><strong>Driver:</strong> Ramesh Rao</li>
                  <li><strong>Warehouse Loc:</strong> Bin-A12, Aurangabad</li>
                  <li><strong>Dispatch:</strong> None (In Stock)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recall Trigger Modal */}
      {showRecallModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <AlertTriangle color="#d93025" size={24} />
              <h3>Simulate Lot Recall</h3>
            </div>
            <div className={styles.modalBody}>
              <p>You are initiating a simulated recall trigger for batch <strong>{searchQuery}</strong>. This will tag the batch, all 30 packaging run units, and its certificate as <strong>RECALLED / Revoked</strong>.</p>
              
              <label className={styles.modalLabel}>Reason for Recall</label>
              <textarea
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                placeholder="e.g. In-field certification failure, customer complaint on germination, packaging seal defect"
                className={styles.modalTextarea}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setShowRecallModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={triggerRecall}>
                Confirm Recall Trigger
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
