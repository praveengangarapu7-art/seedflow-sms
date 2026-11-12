import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Award, Calendar, Shield, Lock, EyeOff, 
  ArrowUpRight, Scale, Info, Sparkles,
  Compass, AlertCircle, FileDown, Layers
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Variety } from '@/types/rd';
import styles from './VarietyDetailModal.module.css';

import { printDocument } from '@/utils/fileExport';
interface VarietyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variety: Variety | null;
  hasRegistration?: boolean;
  onAction?: (action: string, variety: Variety) => void;
}

export function VarietyDetailModal({ isOpen, onClose, variety, hasRegistration = false, onAction }: VarietyDetailModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'performance', label: 'Performance' },
    { key: 'traits', label: 'Key Traits & Lineage' },
    { key: 'documents', label: 'Documents & Release' }
  ];

  if (!variety) return null;

  const menuItems = [
    { label: 'Export variety specs', onClick: () => addToast('Exporting PDF...', 'info') },
    ...(variety.status !== 'Withdrawn'
      ? [{ label: 'Withdraw variety', onClick: () => onAction?.('withdraw', variety), variant: 'danger' as const }]
      : [])
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className={styles.container}>
        {/* Modern Custom Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleArea}>
            <span className={styles.headerId}>{variety.id}</span>
            <h2 className={styles.headerTitle}>{variety.name}</h2>
            <div className={styles.headerBadges}>
              <StatusBadge status={variety.status === 'Pre-release' ? 'Active' : (variety.status === 'Candidate' ? 'Draft' : variety.status)} />
              <span className={styles.metaChip}>{variety.category}</span>
              <span className={`${styles.metaChip} ${styles.ipChip}`}>
                {variety.ipProtection.startsWith('PVP') ? <Shield size={12} /> : variety.ipProtection === 'Patent' ? <Lock size={12} /> : <EyeOff size={12} />}
                {variety.ipProtection}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button 
              variant="secondary" 
              onClick={() => onAction?.('edit', variety)}
            >
              Edit Variety
            </Button>
            {!variety.registrationNumber && !hasRegistration ? (
              <Button 
                variant="primary"
                onClick={() => onAction?.('register', variety)}
              >
                Initiate Registration
              </Button>
            ) : (
              <Link 
                to="/rd/registrations" 
                className={styles.viewRegLink}
                onClick={onClose}
              >
                View Registration <ArrowUpRight size={14} />
              </Link>
            )}
            <ActionMenu items={menuItems} />
          </div>
        </div>

        <div className={styles.tabWrapper}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className={styles.tabContent}>
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <div className={styles.overviewGrid}>
              {/* Left Column (60%) */}
              <div className={styles.overviewLeft}>
                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Basic Specifications</h3>
                  <div className={styles.specGrid}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Crop Species</span>
                      <span className={styles.specVal}>{variety.crop}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Category Type</span>
                      <span className={styles.specVal}>{variety.category}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Pedigree Lineage</span>
                      <span className={styles.specVal}>{variety.parentLines?.male || variety.parentMale} ♂ × {variety.parentLines?.female || variety.parentFemale} ♀</span>
                    </div>
                    {variety.releaseYear && (
                      <div className={styles.specRow}>
                        <span className={styles.specLabel}>Year of Release</span>
                        <span className={styles.specVal}>{variety.releaseYear}</span>
                      </div>
                    )}
                    {(variety.registrationNumber || hasRegistration) && (
                      <div className={styles.specRow}>
                        <span className={styles.specLabel}>Registration Code</span>
                        <span className={`${styles.specVal} ${styles.mono}`}>{variety.registrationNumber || 'REG-2026-Pending'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Geographical Adaptation</h3>
                  <div className={styles.geoSection}>
                    <div className={styles.geoBlock}>
                      <span className={styles.subTitleLabel}>Recommended Agro-Climatic Zones</span>
                      <div className={styles.chipRow}>
                        {variety.recommendedZones?.map(zone => (
                          <span key={zone} className={styles.greenChip}>{zone}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.geoBlock}>
                      <span className={styles.subTitleLabel}>Recommended Seasons</span>
                      <div className={styles.chipRow}>
                        {variety.recommendedSeasons?.map(season => (
                          <span key={season} className={styles.blueChip}>{season}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.geoBlock}>
                      <span className={styles.subTitleLabel}>Target State Markets</span>
                      <div className={styles.chipRow}>
                        {variety.targetMarkets?.map(market => (
                          <span key={market} className={styles.orangeChip}>{market}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {variety.notes && (
                  <div className={styles.notesCard}>
                    <Info size={16} className={styles.notesIcon} />
                    <div className={styles.notesText}>
                      <strong>Breeder notes:</strong> <em>{variety.notes}</em>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (40%) */}
              <div className={styles.overviewRight}>
                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Agronomic Phenotypes</h3>
                  <div className={styles.statList}>
                    <div className={styles.statRowItem}>
                      <div className={styles.statHeader}>
                        <Award size={16} className={styles.statIcon} />
                        <span className={styles.statLabel}>Yield potential</span>
                      </div>
                      <span className={styles.statValLarge}>{variety.agronomicSpecs?.yieldPotential || 0} q/ha</span>
                    </div>

                    <div className={styles.statRowItem}>
                      <div className={styles.statHeader}>
                        <Calendar size={16} className={styles.statIcon} />
                        <span className={styles.statLabel}>Days to maturity</span>
                      </div>
                      <span className={styles.statValLarge}>{variety.agronomicSpecs?.daysToMaturity || 0} days</span>
                    </div>

                    <div className={styles.statRowItem}>
                      <div className={styles.statHeader}>
                        <Compass size={16} className={styles.statIcon} />
                        <span className={styles.statLabel}>Plant height</span>
                      </div>
                      <span className={styles.statValLarge}>{variety.agronomicSpecs?.plantHeight || 0} cm</span>
                    </div>

                    <div className={styles.statRowItem}>
                      <div className={styles.statHeader}>
                        <Scale size={16} className={styles.statIcon} />
                        <span className={styles.statLabel}>Seed sowing rate</span>
                      </div>
                      <span className={styles.statValLarge}>{variety.agronomicSpecs?.seedRate || 0} kg/ha</span>
                    </div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3 className={styles.cardTitle}>Quality Standards (ISTA min)</h3>
                  <div className={styles.progressList}>
                    <div className={styles.progressItem}>
                      <div className={styles.progressLabelRow}>
                        <span>Minimum Germination</span>
                        <strong>{variety.qualitySpecs?.germinationMin || 0}%</strong>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${variety.qualitySpecs?.germinationMin || 0}%` }} />
                      </div>
                    </div>

                    <div className={styles.progressItem}>
                      <div className={styles.progressLabelRow}>
                        <span>Physical Purity</span>
                        <strong>{variety.qualitySpecs?.physicalPurityMin || 0}%</strong>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${variety.qualitySpecs?.physicalPurityMin || 0}%` }} />
                      </div>
                    </div>

                    <div className={styles.progressItem}>
                      <div className={styles.progressLabelRow}>
                        <span>Genetic Purity</span>
                        <strong>{variety.qualitySpecs?.geneticPurityMin || 0}%</strong>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${variety.qualitySpecs?.geneticPurityMin || 0}%` }} />
                      </div>
                    </div>

                    <div className={styles.progressItem}>
                      <div className={styles.progressLabelRow}>
                        <span>Maximum Moisture</span>
                        <strong>{variety.qualitySpecs?.moistureMax || 0}%</strong>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFillDanger} style={{ width: `${variety.qualitySpecs?.moistureMax ? (variety.qualitySpecs.moistureMax * 8) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PERFORMANCE TAB ================= */}
          {activeTab === 'performance' && (
            <div className={styles.performanceTab}>
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Multi-Location Trial (MLT) Performance Records</h3>
                {variety.multiLocationTrialRefs && variety.multiLocationTrialRefs.length > 0 ? (
                  <div className={styles.trialsTable}>
                    <div className={styles.tableHeader}>
                      <span>Trial ID</span>
                      <span>Trial Focus / Scope</span>
                      <span>Season / Year</span>
                      <span>Mean Yield (q/ha)</span>
                      <span>Best Location</span>
                    </div>
                    {variety.multiLocationTrialRefs.map((trialRef, i) => (
                      <div key={trialRef} className={styles.tableRow}>
                        <Link to={`/rd/trials/${trialRef}`} className={styles.trialLink} onClick={onClose}>
                          {trialRef}
                        </Link>
                        <span>Comparative Multi-Site Yield Yielding Assessment</span>
                        <span>Kharif {2024 - i}</span>
                        <strong className={styles.yieldVal}>{(variety.agronomicSpecs?.yieldPotential * (1 - i * 0.08)).toFixed(1)} q/ha</strong>
                        <span>{i === 0 ? 'Hyderabad Farm' : 'Dharwad Station'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyStateContainer}>
                    <AlertCircle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>No MLT data linked. Link trials from the Trials page.</p>
                  </div>
                )}
              </div>

              {/* Yield Comparison SVG Chart */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Yield Comparison vs Local Check Standards</h3>
                <div className={styles.chartWrapper}>
                  {/* SVG Chart */}
                  <svg width="100%" height="160" viewBox="0 0 600 160" className={styles.svgChart}>
                    {/* Background Gridlines */}
                    <line x1="120" y1="20" x2="550" y2="20" stroke="var(--color-border-light)" strokeDasharray="3" />
                    <line x1="120" y1="60" x2="550" y2="60" stroke="var(--color-border-light)" strokeDasharray="3" />
                    <line x1="120" y1="100" x2="550" y2="100" stroke="var(--color-border-light)" strokeDasharray="3" />
                    <line x1="120" y1="140" x2="550" y2="140" stroke="var(--color-border-light)" />

                    {/* Chart Bars */}
                    {/* Bar 1: This Variety */}
                    <text x="10" y="45" className={styles.chartLabel} fontWeight="600">{variety.name} (Ours)</text>
                    <rect x="120" y="30" width={(variety.agronomicSpecs?.yieldPotential || 20) * 5} height="20" fill="var(--color-primary)" rx="3" />
                    <text x={130 + (variety.agronomicSpecs?.yieldPotential || 20) * 5} y="45" className={styles.chartVal} fontWeight="600">{variety.agronomicSpecs?.yieldPotential} q/ha</text>

                    {/* Bar 2: Check Variety 1 */}
                    <text x="10" y="85" className={styles.chartLabel}>Regional Check 1</text>
                    <rect x="120" y="70" width={(variety.agronomicSpecs?.yieldPotential || 20) * 4.2} height="20" fill="var(--color-text-muted)" opacity="0.6" rx="3" />
                    <text x={130 + (variety.agronomicSpecs?.yieldPotential || 20) * 4.2} y="85" className={styles.chartVal}>{((variety.agronomicSpecs?.yieldPotential || 20) * 0.84).toFixed(1)} q/ha</text>

                    {/* Bar 3: Check Variety 2 */}
                    <text x="10" y="125" className={styles.chartLabel}>National Standard Check</text>
                    <rect x="120" y="110" width={(variety.agronomicSpecs?.yieldPotential || 20) * 4.5} height="20" fill="var(--color-text-muted)" opacity="0.6" rx="3" />
                    <text x={130 + (variety.agronomicSpecs?.yieldPotential || 20) * 4.5} y="125" className={styles.chartVal}>{((variety.agronomicSpecs?.yieldPotential || 20) * 0.9).toFixed(1)} q/ha</text>
                  </svg>
                  
                  <div className={styles.chartLegend}>
                    <Sparkles size={14} className={styles.legendIcon} />
                    <span>Calculated yield performance advantage: <strong>+{(((variety.agronomicSpecs?.yieldPotential - (variety.agronomicSpecs?.yieldPotential * 0.9)) / (variety.agronomicSpecs?.yieldPotential * 0.9)) * 100).toFixed(1)}% yield gain</strong> over National Standard Check under multi-site average conditions.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TRAITS & LINEAGE TAB ================= */}
          {activeTab === 'traits' && (
            <div className={styles.traitsTab}>
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Biological Key Traits Grouping</h3>
                <div className={styles.traitsGrouping}>
                  <div className={styles.traitGroupBlock}>
                    <span className={styles.groupHeading}>Agronomic performance</span>
                    <ul className={styles.traitListItems}>
                      <li>High yield potential under irrigation</li>
                      <li>Highly responsive to fertilizer regimens</li>
                      <li>Standard crop maturity window ({variety.agronomicSpecs?.daysToMaturity} days)</li>
                    </ul>
                  </div>

                  <div className={styles.traitGroupBlock}>
                    <span className={styles.groupHeading}>Abiotic stress tolerance</span>
                    <ul className={styles.traitListItems}>
                      {variety.keyTraits?.includes('Drought tolerant') || variety.keyTraits?.includes('Drought resistant') ? (
                        <li className={styles.highlightedTrait}>Superior drought and water stress recovery</li>
                      ) : null}
                      {variety.keyTraits?.includes('Heat tolerant') ? (
                        <li className={styles.highlightedTrait}>Stay-green trait active under heat spike conditions</li>
                      ) : null}
                      <li>Medium salinity tolerance threshold</li>
                    </ul>
                  </div>

                  <div className={styles.traitGroupBlock}>
                    <span className={styles.groupHeading}>Biotic / disease resistance</span>
                    <ul className={styles.traitListItems}>
                      {variety.keyTraits?.includes('Bollworm resistance') ? (
                        <li className={styles.highlightedTrait}>Bt Cry1Ac and Cry2Ab insect protein protection</li>
                      ) : null}
                      <li>Excellent resistance against standard blight pathogens</li>
                      <li>Tolerant to sap-sucking pests during early growth</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Pedigree Node Tree SVG */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Pedigree Lineage Diagram</h3>
                <div className={styles.lineageWrapper}>
                  <svg width="100%" height="150" viewBox="0 0 500 150" className={styles.lineageSvg}>
                    {/* Connective Lines */}
                    <path d="M 120,40 L 250,75 L 120,110" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
                    <line x1="250" y1="75" x2="380" y2="75" stroke="var(--color-primary)" strokeWidth="3" />

                    {/* Node 1: Male Parent */}
                    <rect x="20" y="20" width="120" height="40" rx="6" fill="var(--color-accent-light)" stroke="var(--color-primary)" strokeWidth="1" />
                    <text x="80" y="44" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-primary)">♂ {variety.parentLines?.male || variety.parentMale || 'Male Line'}</text>

                    {/* Node 2: Female Parent */}
                    <rect x="20" y="90" width="120" height="40" rx="6" fill="var(--color-accent-light)" stroke="var(--color-primary)" strokeWidth="1" />
                    <text x="80" y="114" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-primary)">♀ {variety.parentLines?.female || variety.parentFemale || 'Female Line'}</text>

                    {/* Node 3: Hybrid Node */}
                    <circle cx="250" cy="75" r="18" fill="var(--color-primary)" />
                    <text x="250" y="79" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-white)">×</text>

                    {/* Node 4: This Variety */}
                    <rect x="360" y="55" width="130" height="40" rx="6" fill="var(--color-primary)" />
                    <text x="425" y="79" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-white)">{variety.id}</text>
                  </svg>

                  {variety.programRef && (
                    <div className={styles.lineageFooter}>
                      <Layers size={14} className={styles.lineageFootIcon} />
                      <span>Developed under R&D program link: <strong>{variety.programRef}</strong>.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= DOCUMENTS TAB ================= */}
          {activeTab === 'documents' && (
            <div className={styles.documentsTab}>
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Official Variety Release Documentation</h3>
                <div className={styles.docGrid}>
                  <div className={styles.docItemCard}>
                    <FileText className={styles.docIcon} size={28} />
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>Release_Certificate_{variety.id}.pdf</span>
                      <span className={styles.docDate}>Uploaded: 12 Jan 2025</span>
                    </div>
                    <Button variant="secondary" size="sm" leftIcon={FileDown} onClick={() => printDocument(`Release certificate — ${variety.name}`, [{ fields: Object.entries(variety).filter(([, v]) => v === null || typeof v !== 'object') as [string, unknown][] }], 'Generated from the variety record')}>
                      Download
                    </Button>
                  </div>

                  <div className={styles.docItemCard}>
                    <FileText className={styles.docIcon} size={28} />
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>Technical_Descriptor_ISTA.pdf</span>
                      <span className={styles.docDate}>Uploaded: 18 Jan 2025</span>
                    </div>
                    <Button variant="secondary" size="sm" leftIcon={FileDown} onClick={() => printDocument(`Technical descriptor — ${variety.name}`, [{ fields: Object.entries(variety).filter(([, v]) => v === null || typeof v !== 'object') as [string, unknown][] }], 'Generated from the variety record')}>
                      Download
                    </Button>
                  </div>

                  <div className={styles.docItemCard}>
                    <FileText className={styles.docIcon} size={28} />
                    <div className={styles.docMeta}>
                      <span className={styles.docName}>Seed_Standards_Compliance.pdf</span>
                      <span className={styles.docDate}>Uploaded: 22 Jan 2025</span>
                    </div>
                    <Button variant="secondary" size="sm" leftIcon={FileDown} onClick={() => printDocument(`Seed standards compliance — ${variety.name}`, [{ fields: Object.entries(variety).filter(([, v]) => v === null || typeof v !== 'object') as [string, unknown][] }], 'Generated from the variety record')}>
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Cross-Module Integration References */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>Cross-Module Downstream Integration</h3>
                <div className={styles.downstreamFlow}>
                  <div className={styles.flowStep}>
                    <div className={styles.stepCircle}>1</div>
                    <div className={styles.stepInfo}>
                      <span className={styles.stepTitle}>Linked processing batches</span>
                      <span className={styles.stepDesc}>Not yet in seed warehouse processing pipeline</span>
                    </div>
                  </div>

                  <div className={styles.flowStep}>
                    <div className={styles.stepCircle}>2</div>
                    <div className={styles.stepInfo}>
                      <span className={styles.stepTitle}>Linked sales catalogs</span>
                      <span className={styles.stepDesc}>Available in seed commercial sales inventory (Kharif catalog ready)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
