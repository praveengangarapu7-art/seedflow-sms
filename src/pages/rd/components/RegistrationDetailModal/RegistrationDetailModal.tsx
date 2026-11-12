import React, { useState } from 'react';
import { 
  FileText, Shield, CheckCircle2, 
  AlertCircle, FileDown, Plus, CreditCard, Clock, MapPin, 
  ArrowUpRight, Trash2, User
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { useToast } from '@/components/common/Toast/ToastContext';
import { VarietyRegistration } from '@/types/rd';
import { DUSResultModal } from '../DUSResultModal/DUSResultModal';
import { formatIndianCurrency } from '@/utils/formatters';
import { usePermission } from '@/hooks/usePermission';
import styles from './RegistrationDetailModal.module.css';

import { setCollection } from '@/hooks/persistentCollections';
import { registrations as registrationStarter } from '../../mockData/registrationsData';
import { pickFile, printDocument } from '@/utils/fileExport';
interface RegistrationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: VarietyRegistration | null;
  onViewVariety?: (varietyId: string) => void;
  onAction?: (action: string, registration: VarietyRegistration) => void;
}

export const RegistrationDetailModal: React.FC<RegistrationDetailModalProps> = ({
  isOpen,
  onClose,
  registration,
  onViewVariety,
  onAction,
}) => {
  const { addToast } = useToast();
  const saveReg = (patch: Partial<VarietyRegistration>) => {
    if (!registration) return;
    setCollection<VarietyRegistration>('rd.registrations', registrationStarter, (prev) => prev.map((r) => (r.id === registration.id ? { ...r, ...patch } : r)));
  };
  const [activeTab, setActiveTab] = useState('details');
  const [isDUSModalOpen, setIsDUSModalOpen] = useState(false);
  const [selectedDUSLoc, setSelectedDUSLoc] = useState<string>('');
  const [selectedDUSYear, setSelectedDUSYear] = useState<string>('');

  const canFile = usePermission('file_variety_registration');
  const canApproveRelease = usePermission('approve_variety_release');

  if (!registration) return null;

  const tabs = [
    { key: 'details', label: 'Application Details' },
    { key: 'dus', label: 'DUS Testing' },
    { key: 'documents', label: 'Documents' },
    { key: 'fees', label: 'Fees & Payments' },
    { key: 'timeline', label: 'Timeline' }
  ];

  const menuItems = [
    { label: 'Export documents package', onClick: () => addToast('Exporting ZIP package...', 'info') },
    ...(canFile && registration.status === 'Draft'
      ? [{ label: 'Submit Application', onClick: () => onAction?.('submit', registration) }]
      : []),
    ...(canFile && registration.status !== 'Granted' && registration.status !== 'Expired'
      ? [{ label: 'Withdraw Application', onClick: () => onAction?.('withdraw', registration), variant: 'danger' as const }]
      : []),
    ...(canApproveRelease && (registration.status === 'Submitted' || registration.status === 'Under review')
      ? [
          { label: 'Approve commercial release', onClick: () => onAction?.('approve_release', registration) },
          { label: 'Request more data', onClick: () => onAction?.('request_data', registration) }
        ]
      : [])
  ];

  const handleOpenDUS = (loc: string, yr: string) => {
    setSelectedDUSLoc(loc);
    setSelectedDUSYear(yr);
    setIsDUSModalOpen(true);
  };

  const handleSaveDUSResult = (_result: any) => {
    // Mutations will be done via useRealtimeMockStore in the main page
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className={styles.container}>
        {/* Custom Premium Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleArea}>
            <span className={styles.headerId}>{registration.id}</span>
            <h2 className={styles.headerTitle}>{registration.varietyName}</h2>
            <div className={styles.headerBadges}>
              <StatusBadge status={registration.status === 'Under review' ? 'warning' : (registration.status === 'Granted' ? 'success' : (registration.status === 'Draft' ? 'neutral' : 'info'))} />
              <span className={`${styles.metaChip} ${styles.typeChip}`}>
                {registration.applicationType}
              </span>
              {registration.applicationNumber && (
                <span className={styles.appNo}>{registration.applicationNumber}</span>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {canApproveRelease && (registration.status === 'Submitted' || registration.status === 'Under review') && (
              <>
                <Button 
                  variant="primary" 
                  onClick={() => onAction?.('approve_release', registration)}
                >
                  Approve commercial release
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => onAction?.('request_data', registration)}
                >
                  Request more data
                </Button>
              </>
            )}
            {canFile && registration.status !== 'Granted' && (
              <Button 
                variant="secondary" 
                onClick={() => onAction?.('edit', registration)}
              >
                Edit Application
              </Button>
            )}
            {registration.status === 'Granted' && (
              <Button 
                variant="primary"
                onClick={() => printDocument(`Registration certificate — ${registration.varietyName}`, [{ fields: [['Registration', registration.id], ['Application number', registration.applicationNumber ?? '—'], ['Application type', registration.applicationType], ['Applicant', registration.applicant], ['Status', registration.status], ['Filed', registration.filedDate ?? '—'], ['Decision', registration.decisionDate ?? '—'], ['Validity (years)', registration.validityYears ?? '—'], ['DUS status', registration.dusStatus]] }, { heading: 'Timeline', table: { columns: ['Stage', 'Date', 'By'], rows: registration.timeline.map((t) => [t.stage, t.date, t.user]) } }])}
              >
                Generate Certificate
              </Button>
            )}
            {onViewVariety && (
              <Button
                variant="ghost"
                onClick={() => onViewVariety(registration.varietyRef)}
              >
                View Variety Details <ArrowUpRight size={14} />
              </Button>
            )}
            <ActionMenu items={menuItems} />
          </div>
        </div>

        <div className={styles.tabWrapper}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className={styles.tabContent}>
          {/* ================= TAB 1: DETAILS ================= */}
          {activeTab === 'details' && (
            <div className={styles.detailsGrid}>
              {/* Left Column */}
              <div className={styles.detailsLeft}>
                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Application Information</h3>
                  <div className={styles.specGrid}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Filing Type</span>
                      <span className={styles.specVal}>{registration.applicationType}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Filing Number</span>
                      <span className={`${styles.specVal} ${styles.mono}`}>{registration.applicationNumber || 'Pending Filing'}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Date Filed</span>
                      <span className={styles.specVal}>{registration.filedDate || 'Not yet filed'}</span>
                    </div>
                    {registration.decisionDate && (
                      <div className={styles.specRow}>
                        <span className={styles.specLabel}>Decision Date</span>
                        <span className={styles.specVal}>{registration.decisionDate}</span>
                      </div>
                    )}
                    {registration.validityYears && (
                      <div className={styles.specRow}>
                        <span className={styles.specLabel}>Validity Duration</span>
                        <span className={styles.specVal}>{registration.validityYears} Years</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Applicant Information</h3>
                  <div className={styles.specGrid}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Applicant Entity</span>
                      <span className={styles.specVal}>{registration.applicant}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Submitting Authority</span>
                      <span className={styles.specVal}>{registration.submittedBy}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Contact Office</span>
                      <span className={styles.specVal}>SeedFlow R&D Compliance Desk</span>
                    </div>
                  </div>
                </div>

                {registration.notes && (
                  <div className={styles.notesCard}>
                    <AlertCircle size={16} className={styles.notesIcon} />
                    <div className={styles.notesText}>
                      <strong>Filing remarks:</strong> <em>{registration.notes}</em>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className={styles.detailsRight}>
                <div className={styles.varietyRefCard}>
                  <h4 className={styles.refTitle}>Target Variety Reference</h4>
                  <div className={styles.refBody}>
                    <span className={styles.refId}>{registration.varietyRef}</span>
                    <h5 className={styles.refName}>{registration.varietyName}</h5>
                    <div className={styles.refChips}>
                      <span className={styles.refChip}>Target: India</span>
                      <span className={styles.refChip}>IP protection pending</span>
                    </div>
                    {onViewVariety && (
                      <button 
                        type="button"
                        className={styles.refBtn}
                        onClick={() => onViewVariety(registration.varietyRef)}
                      >
                        View variety details →
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Filing Progress Timeline</h3>
                  <div className={styles.miniStepper}>
                    <div className={`${styles.miniStep} ${registration.filedDate ? styles.done : styles.current}`}>
                      <div className={styles.stepIndicator}>
                        {registration.filedDate ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      </div>
                      <div className={styles.stepTexts}>
                        <span className={styles.stepTitleText}>Application Filed</span>
                        <span className={styles.stepSubtitleText}>{registration.filedDate || 'Pending filing'}</span>
                      </div>
                    </div>

                    <div className={`${styles.miniStep} ${registration.dusStatus === 'Passed' ? styles.done : (registration.dusStatus === 'In progress' ? styles.current : '')}`}>
                      <div className={styles.stepIndicator}>
                        {registration.dusStatus === 'Passed' ? <CheckCircle2 size={14} /> : <MapPin size={14} />}
                      </div>
                      <div className={styles.stepTexts}>
                        <span className={styles.stepTitleText}>DUS Field Trials</span>
                        <span className={styles.stepSubtitleText}>Status: {registration.dusStatus}</span>
                      </div>
                    </div>

                    <div className={`${styles.miniStep} ${registration.decisionDate ? styles.done : (registration.status === 'Approved' ? styles.current : '')}`}>
                      <div className={styles.stepIndicator}>
                        {registration.decisionDate ? <CheckCircle2 size={14} /> : <Shield size={14} />}
                      </div>
                      <div className={styles.stepTexts}>
                        <span className={styles.stepTitleText}>Authority Review</span>
                        <span className={styles.stepSubtitleText}>{registration.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: DUS TESTING ================= */}
          {activeTab === 'dus' && (
            <div className={styles.dusTab}>
              <div className={`${styles.dusBanner} ${styles[registration.dusStatus.replace(' ', '')]}`}>
                <div className={styles.bannerInfo}>
                  <span className={styles.bannerSubtitle}>Distinctness, Uniformity, Stability testing</span>
                  <h4 className={styles.bannerTitle}>DUS Trial Evaluation: {registration.dusStatus}</h4>
                </div>
                <div className={styles.bannerYears}>
                  <span className={styles.yearBadge}>Year 1 Completed</span>
                  <span className={styles.yearBadge}>Year 2 In Progress</span>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.cardHeaderFlex}>
                  <h3 className={styles.cardTitle}>Testing Farm Trial Locations</h3>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    leftIcon={Plus}
                    onClick={() => handleOpenDUS('Coimbatore Farm', 'Year 2')}
                  >
                    Add DUS Result
                  </Button>
                </div>

                <div className={styles.dusTable}>
                  <div className={styles.dusTableHeader}>
                    <span>Trial Location</span>
                    <span>State</span>
                    <span>Evaluation Stage</span>
                    <span>Status</span>
                    <span>Results</span>
                    <span>Actions</span>
                  </div>
                  {registration.dusLocations?.map((loc, idx) => (
                    <div key={loc} className={styles.dusTableRow}>
                      <span className={styles.locName}><MapPin size={12} /> {loc}</span>
                      <span>{idx === 0 ? 'Telangana' : 'Tamil Nadu'}</span>
                      <span>{registration.dusYears?.[idx] || 'Year 1'}</span>
                      <span>
                        <StatusBadge status={registration.dusStatus === 'Passed' ? 'success' : 'warning'} />
                      </span>
                      <span className={styles.resultBrief}>Passed D/U/S criteria</span>
                      <button 
                        type="button"
                        className={styles.rowLink}
                        onClick={() => handleOpenDUS(loc, registration.dusYears?.[idx] || 'Year 1')}
                      >
                        Edit Results
                      </button>
                    </div>
                  )) || (
                    <div className={styles.emptyTable}>
                      <AlertCircle size={28} />
                      <p>No testing locations added. Plan location results below.</p>
                    </div>
                  )}
                </div>
              </div>

              {registration.dusStatus !== 'Not started' && (
                <div className={styles.dusParamsGrid}>
                  <div className={styles.paramCard}>
                    <div className={styles.paramHeader}>
                      <span className={styles.paramLabel}>Distinctness (D)</span>
                      <span className={`${styles.paramStatus} ${styles.pass}`}>Pass</span>
                    </div>
                    <p className={styles.paramText}>Botanical descriptors are distinct from all listed commercial and reference varieties on 8 separate traits (morphology, flower shape).</p>
                  </div>

                  <div className={styles.paramCard}>
                    <div className={styles.paramHeader}>
                      <span className={styles.paramLabel}>Uniformity (U)</span>
                      <span className={`${styles.paramStatus} ${styles.pass}`}>Pass</span>
                    </div>
                    <p className={styles.paramText}>The phenotypic coefficient of variation (CV) for critical agronomic metrics stands at 4.2%, well within the ISTA standard tolerance threshold.</p>
                  </div>

                  <div className={styles.paramCard}>
                    <div className={styles.paramHeader}>
                      <span className={styles.paramLabel}>Stability (S)</span>
                      <span className={`${styles.paramStatus} ${styles.pass}`}>Pass</span>
                    </div>
                    <p className={styles.paramText}>Successive crop cycles exhibit phenotypic consistency under standard growth environments, with variance strictly within ±5% bounds.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: DOCUMENTS ================= */}
          {activeTab === 'documents' && (
            <div className={styles.docsTab}>
              <div className={styles.cardHeaderFlex}>
                <h3 className={styles.cardTitle}>Filing Document Repository</h3>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={Plus}
                  onClick={async () => { const f = await pickFile('.pdf,.doc,.docx,.jpg,.png'); if (!f) return; saveReg({ documents: [...registration.documents, { name: f.name, uploadedAt: new Date().toISOString().slice(0, 10), type: 'Supporting document' }] }); addToast(`${f.name} added to the filing`, 'success'); }}
                >
                  Upload Document
                </Button>
              </div>

              <div className={styles.docsGridList}>
                {registration.documents.map((doc) => (
                  <div key={doc.name} className={styles.docRowCard}>
                    <FileText className={styles.docFileIcon} size={28} />
                    <div className={styles.docRowInfo}>
                      <span className={styles.docRowName}>{doc.name}</span>
                      <span className={styles.docRowMeta}>Type: {doc.type} · Uploaded: {doc.uploadedAt}</span>
                    </div>
                    <div className={styles.docRowBtns}>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        leftIcon={FileDown}
                        onClick={() => addToast(`Downloading ${doc.name}...`, 'success')}
                      >
                        Download
                      </Button>
                      <button 
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => addToast('Document deletion requires admin rights.', 'warning')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className={styles.docRowCard}>
                  <FileText className={styles.docFileIcon} size={28} />
                  <div className={styles.docRowInfo}>
                    <span className={styles.docRowName}>Technical Questionnaire (UPOV Standard).pdf</span>
                    <span className={styles.docRowMeta}>Type: Technical Questionnaire · Uploaded: 22 Feb 2025</span>
                  </div>
                  <div className={styles.docRowBtns}>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      leftIcon={FileDown}
                      onClick={() => addToast(`Downloading Questionnaire...`, 'success')}
                    >
                      Download
                    </Button>
                    <button type="button" className={styles.deleteBtn} onClick={() => addToast('Document deletion requires admin rights.', 'warning')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: FEES & PAYMENTS ================= */}
          {activeTab === 'fees' && (
            <div className={styles.feesTab}>
              <div className={styles.cardHeaderFlex}>
                <h3 className={styles.cardTitle}>Regulatory Filing & Maintenance Fees</h3>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={CreditCard}
                  onClick={() => { const kind = window.prompt('Fee type: application, testing or renewal', 'application'); const key = kind?.trim().toLowerCase(); if (!key || !['application', 'testing', 'renewal'].includes(key)) return; const amt = Number(window.prompt('Amount paid (₹)') ?? ''); if (!Number.isFinite(amt) || amt <= 0) return; saveReg({ fees: { ...registration.fees, [`${key}Fee`]: amt }, timeline: [...registration.timeline, { stage: `${key} fee paid`, date: new Date().toISOString().slice(0, 10), user: 'You', comment: `₹${amt.toLocaleString('en-IN')}` }] }); addToast(`₹${amt.toLocaleString('en-IN')} ${key} fee recorded`, 'success'); }}
                >
                  Add Payment Receipt
                </Button>
              </div>

              <div className={styles.feesTableWrap}>
                <div className={styles.feesTableHeader}>
                  <span>Fee Category</span>
                  <span>Due Date</span>
                  <span>Filing Amount</span>
                  <span>Payment Status</span>
                  <span>Payment Date</span>
                  <span>Receipt Code</span>
                </div>
                
                <div className={styles.feesTableRow}>
                  <strong className={styles.feeTitle}>Filing Registration Fee</strong>
                  <span>10 Mar 2024</span>
                  <span>{formatIndianCurrency(registration.fees.applicationFee || 15000)}</span>
                  <span><StatusBadge status="success" /></span>
                  <span>12 Mar 2024</span>
                  <span className={styles.mono}>REC-CT-90142</span>
                </div>

                <div className={styles.feesTableRow}>
                  <strong className={styles.feeTitle}>DUS Field Testing Levy</strong>
                  <span>18 Jun 2024</span>
                  <span>{formatIndianCurrency(registration.fees.testingFee || 50000)}</span>
                  <span><StatusBadge status="success" /></span>
                  <span>20 Jun 2024</span>
                  <span className={styles.mono}>REC-DUS-88021</span>
                </div>

                {registration.status === 'Granted' && (
                  <div className={styles.feesTableRow}>
                    <strong className={styles.feeTitle}>Annual Variety PVP Maintenance Fee</strong>
                    <span>10 Nov 2026</span>
                    <span>{formatIndianCurrency(5000)}</span>
                    <span><StatusBadge status="warning" /></span>
                    <span>Pending</span>
                    <span>—</span>
                  </div>
                )}
              </div>

              <div className={styles.totalRow}>
                <span>Total Settled Fees:</span>
                <strong>{formatIndianCurrency((registration.fees.applicationFee || 15000) + (registration.fees.testingFee || 50000))}</strong>
              </div>
            </div>
          )}

          {/* ================= TAB 5: TIMELINE ================= */}
          {activeTab === 'timeline' && (
            <div className={styles.timelineTab}>
              <h3 className={styles.cardTitle}>Filing Authority Event Log</h3>
              <div className={styles.timelineWrap}>
                {registration.timeline && registration.timeline.length > 0 ? (
                  registration.timeline.map((event, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineIndicator}>
                        <div className={styles.timelineDot} />
                        {idx < registration.timeline.length - 1 && <div className={styles.timelineLine} />}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineHeader}>
                          <strong className={styles.eventStage}>{event.stage}</strong>
                          <span className={styles.eventDate}>{event.date}</span>
                        </div>
                        <div className={styles.timelineUser}>
                          <User size={12} /> Filed by {event.user}
                        </div>
                        {event.comment && (
                          <p className={styles.eventComment}>"{event.comment}"</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyTable}>
                    <Clock size={28} />
                    <p>No historical events logged for this draft application.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <DUSResultModal
        isOpen={isDUSModalOpen}
        onClose={() => setIsDUSModalOpen(false)}
        locationName={selectedDUSLoc}
        year={selectedDUSYear}
        onSave={handleSaveDUSResult}
      />
    </Modal>
  );
};
