import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Settings, Save, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { processingNav } from '@/config/processingNav';
import { usePermission } from '@/hooks/usePermission';
import styles from './ProcessingSettings.module.css';

export default function ProcessingSettingsPage() {
  const { addToast } = useToast();
  const canManage = usePermission('manage_processing_settings');

  const [activeTab, setActiveTab] = useState<'plants' | 'recipes' | 'agencies'>('plants');
  const [isSaving, setIsSaving] = useState(false);

  if (!canManage) {
    return <Navigate to="/processing/dashboard" replace />;
  }

  // State values
  const [tempThreshold, setTempThreshold] = useState(45);
  const [moistureTarget, setMoistureTarget] = useState(10.0);
  const [germinationTarget, setGerminationTarget] = useState(90);
  const [purityTarget, setPurityTarget] = useState(98.0);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [enableAiSchedule, setEnableAiSchedule] = useState(true);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('Processing configuration settings saved successfully.', 'success');
    }, 1000);
  };

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Settings} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Processing Settings</h1>
          <p className={styles.pageSubtitle}>
            Configure plant operation parameters, recipe quality targets, and state seed certification authority profiles
          </p>
        </div>
        <div className={styles.pageActions}>
          <Button variant="primary" leftIcon={Save} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.settingsLayout}>
        {/* Sidebar Nav */}
        <div className={styles.settingsSidebar}>
          <button
            className={`${styles.sidebarBtn} ${activeTab === 'plants' ? styles.activeSidebarBtn : ''}`}
            onClick={() => setActiveTab('plants')}
          >
            Plant & Machine Calibration
          </button>
          <button
            className={`${styles.sidebarBtn} ${activeTab === 'recipes' ? styles.activeSidebarBtn : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Workflow & QC Standards
          </button>
          <button
            className={`${styles.sidebarBtn} ${activeTab === 'agencies' ? styles.activeSidebarBtn : ''}`}
            onClick={() => setActiveTab('agencies')}
          >
            Certifying Bodies (State Agencies)
          </button>
        </div>

        {/* Content Pane */}
        <div className={styles.settingsContent}>
          {activeTab === 'plants' && (
            <div className={styles.pane}>
              <h3>Plant & Machine Calibration Standards</h3>
              <p className={styles.paneSubtitle}>Configure operational ranges and trigger limits for processing machinery</p>
              
              <div className={styles.divider} />

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>Dryer Max Temperature Threshold (°C)</label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(Number(e.target.value))}
                    className={styles.input}
                  />
                  <span className={styles.unit}>°C</span>
                </div>
                <span className={styles.helperText}>Exceeding this value will auto-shut down elements to prevent seed cooking.</span>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.settingLabel} style={{ marginBottom: '2px', display: 'block' }}>Predictive Maintenance Alerts</span>
                    <span className={styles.helperText}>Use machine runtime telemetry to trigger pre-maintenance tasks.</span>
                  </div>
                  <button onClick={() => setEnableAlerts(!enableAlerts)} className={styles.toggleBtn}>
                    {enableAlerts ? <ToggleRight size={36} color="#0E5467" /> : <ToggleLeft size={36} color="#94A3AB" />}
                  </button>
                </div>
              </div>

              <div className={styles.settingGroup}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.settingLabel} style={{ marginBottom: '2px', display: 'block' }}>AI-Augmented Capacity Allocation</span>
                    <span className={styles.helperText}>Automatically recommend shifts in production batches based on plant loads.</span>
                  </div>
                  <button onClick={() => setEnableAiSchedule(!enableAiSchedule)} className={styles.toggleBtn}>
                    {enableAiSchedule ? <ToggleRight size={36} color="#0E5467" /> : <ToggleLeft size={36} color="#94A3AB" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className={styles.pane}>
              <h3>Workflow & QC Standards</h3>
              <p className={styles.paneSubtitle}>Configure target moisture thresholds, germination limits, and purity margins</p>
              
              <div className={styles.divider} />

              <div className={styles.formGrid}>
                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Target Moisture Level (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={moistureTarget}
                    onChange={(e) => setMoistureTarget(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Min Germination Standard (%)</label>
                  <input
                    type="number"
                    value={germinationTarget}
                    onChange={(e) => setGerminationTarget(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Min Physical Purity (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={purityTarget}
                    onChange={(e) => setPurityTarget(Number(e.target.value))}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.warningBox}>
                <AlertTriangle size={20} className={styles.warningIcon} />
                <div>
                  <h4>Compliance Threshold Alert</h4>
                  <p>Lowering Min Germination Standard below 90% requires executive approval to prevent MSSCA/APSSCA licensing suspension.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agencies' && (
            <div className={styles.pane}>
              <h3>State Seed Certification Agencies</h3>
              <p className={styles.paneSubtitle}>Register and manage regional seed licensing profiles and registration IDs</p>
              
              <div className={styles.divider} />

              <div className={styles.agencyCardsStack}>
                <div className={styles.agencyCard}>
                  <div className={styles.agencyCardHeader}>
                    <h4>MSSCA (Maharashtra State)</h4>
                    <span className={styles.activeTag}>Registered</span>
                  </div>
                  <p><strong>License Code:</strong> MSSCA-REG-2026-MH9281</p>
                  <p><strong>Lead Inspector:</strong> Dr. Vinay Kulkarni</p>
                  <p><strong>Contact:</strong> inspector@mssca.org</p>
                </div>

                <div className={styles.agencyCard}>
                  <div className={styles.agencyCardHeader}>
                    <h4>APSSCA (Andhra Pradesh State)</h4>
                    <span className={styles.activeTag}>Registered</span>
                  </div>
                  <p><strong>License Code:</strong> APSSCA-REG-2026-AP1120</p>
                  <p><strong>Lead Inspector:</strong> P. Srinivasa Rao</p>
                  <p><strong>Contact:</strong> compliance@apssca.gov.in</p>
                </div>

                <div className={styles.agencyCard}>
                  <div className={styles.agencyCardHeader}>
                    <h4>TSSCA (Telangana State)</h4>
                    <span className={styles.activeTag}>Registered</span>
                  </div>
                  <p><strong>License Code:</strong> TSSCA-REG-2026-TS8712</p>
                  <p><strong>Lead Inspector:</strong> K. Ramachandra Murthy</p>
                  <p><strong>Contact:</strong> certificates@tssca.org</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
