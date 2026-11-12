import { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { Badge } from '@/components/common/Badge/Badge';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Button } from '@/components/common/Button/Button';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { Atom, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { GermplasmAccession } from '@/types/rd';
import { PedigreeViewerModal } from '../PedigreeViewerModal/PedigreeViewerModal';
import styles from './AccessionDetailModal.module.css';

import { setCollection } from '@/hooks/persistentCollections';
import { accessions as accessionStarter } from '../../mockData/germplasmData';
import type { GermplasmTrait } from '@/types/rd';
import { downloadText, pickFile } from '@/utils/fileExport';
import { useNavigate } from 'react-router-dom';
interface AccessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accession: GermplasmAccession | null;
  allAccessions: GermplasmAccession[];
}

export function AccessionDetailModal({ isOpen, onClose, accession, allAccessions }: AccessionDetailModalProps) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showPedigreeViewer, setShowPedigreeViewer] = useState(false);

  if (!isOpen || !accession) return null;

  const tabs = [
    { key: 'Overview', label: 'Overview' },
    { key: 'Traits', label: 'Traits' },
    { key: 'Genomic data', label: 'Genomic data' },
    { key: 'Trials & uses', label: 'Trials & uses' },
    { key: 'Documents & photos', label: 'Documents & photos' },
  ];

  const parentMale = accession.parentMaleId ? allAccessions.find(a => a.id === accession.parentMaleId) : null;
  const parentFemale = accession.parentFemaleId ? allAccessions.find(a => a.id === accession.parentFemaleId) : null;
  const hasPedigree = !!(parentMale || parentFemale);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Agronomic': return 'primary';
      case 'Quality': return 'info';
      case 'Stress tolerance': return 'warning';
      case 'Disease resistance': return 'danger';
      case 'Morphological': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" title={`Accession ${accession.accessionNumber}`}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.accNumber}>{accession.accessionNumber}</span>
              <h2 className={styles.name}>{accession.name}</h2>
              <div className={styles.headerBadges}>
                <Badge variant="neutral">{accession.type}</Badge>
                <StatusBadge status={accession.status} />
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button variant="ghost" onClick={() => { const notes = window.prompt(`Notes for ${accession.name}`, accession.notes ?? ''); if (notes === null) return; const status = window.prompt('Status: Active, Archived, Quarantine or Restricted', accession.status) ?? accession.status; setCollection<GermplasmAccession>('rd.accessions', accessionStarter, (prev) => prev.map((a) => (a.id === accession.id ? { ...a, notes, status: (['Active', 'Archived', 'Quarantine', 'Restricted'].includes(status) ? status : a.status) as GermplasmAccession['status'] } : a))); addToast('Accession updated', 'success'); }}>Edit accession</Button>
              <Button variant="ghost" onClick={() => { onClose(); navigate('/rd/nurseries'); addToast(`Add ${accession.accessionNumber} as a parent in a crossing-block nursery`, 'info'); }}>Create breeding cross</Button>
              <ActionMenu 
                items={[
                  { label: 'Archive', onClick: () => addToast('Archived', 'success'), variant: 'danger' },
                  { label: 'Mark quarantine', onClick: () => addToast('Quarantined', 'success') },
                  { label: 'Export passport data', onClick: () => addToast('Exporting...', 'info') },
                ]}
              />
            </div>
          </div>

          <div className={styles.tabsWrap}>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <div className={styles.content}>
            {activeTab === 'Overview' && (
              <div className={styles.overviewGrid}>
                <div className={styles.infoCard}>
                  <h3>Basic information</h3>
                  <div className={styles.grid2}>
                    <div className={styles.field}><label>Crop</label><span>{accession.crop}</span></div>
                    <div className={styles.field}><label>Species</label><i>{accession.species}</i></div>
                    <div className={styles.field}><label>Type</label><span>{accession.type}</span></div>
                    <div className={styles.field}><label>Registered</label><span>{new Date(accession.registeredDate).toLocaleDateString()}</span></div>
                    <div className={styles.field}><label>Donor</label><span>{accession.donor || '-'}</span></div>
                    <div className={styles.field}><label>Custody</label><span>{accession.custody}</span></div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3>Origin & collection</h3>
                  <div className={styles.grid2}>
                    <div className={styles.field}><label>Country</label><span>{accession.origin.country}</span></div>
                    <div className={styles.field}><label>State</label><span>{accession.origin.state || '-'}</span></div>
                    <div className={styles.field}><label>Site</label><span>{accession.origin.collectionSite || '-'}</span></div>
                    <div className={styles.field}><label>Date</label><span>{accession.collectionDate}</span></div>
                    <div className={styles.field}><label>Coordinates</label><span>{accession.passportData.latitude || '-'}, {accession.passportData.longitude || '-'}</span></div>
                    <div className={styles.field}><label>Altitude</label><span>{accession.passportData.altitude ? `${accession.passportData.altitude}m` : '-'}</span></div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <h3>Custody chain</h3>
                  <ul className={styles.custodyList}>
                    <li><span className={styles.bullet}></span><b>{accession.custody}</b> (Current)</li>
                    {accession.donor && <li><span className={styles.bullet}></span><b>{accession.donor}</b> (Original donor)</li>}
                  </ul>
                </div>

                <div className={styles.infoCard}>
                  <h3>Pedigree</h3>
                  {hasPedigree ? (
                    <div className={styles.pedigreeMini}>
                      <div className={styles.parentsRow}>
                        <div className={styles.parentBox}>
                          <span className={styles.gender}>♂ Male</span>
                          <b>{parentMale ? parentMale.name : 'Unknown'}</b>
                        </div>
                        <span className={styles.crossSymbol}>×</span>
                        <div className={styles.parentBox}>
                          <span className={styles.gender}>♀ Female</span>
                          <b>{parentFemale ? parentFemale.name : 'Unknown'}</b>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowPedigreeViewer(true)}>
                        View full pedigree &rarr;
                      </Button>
                    </div>
                  ) : (
                    <p className={styles.mutedText}>No pedigree information available.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Traits' && (
              <div className={styles.traitsTab}>
                <div className={styles.tableHeader}>
                  <h3>Recorded traits</h3>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const name = window.prompt('Trait name (e.g. Days to maturity)');
                    if (!name?.trim()) return;
                    const value = window.prompt(`Value for ${name.trim()}`) ?? '';
                    const unit = window.prompt('Unit (optional)') ?? '';
                    const trait: GermplasmTrait = { name: name.trim(), category: 'Agronomic', value: value.trim(), unit: unit.trim() || undefined, measuredDate: new Date().toISOString().slice(0, 10), measuredBy: 'You' };
                    setCollection<GermplasmAccession>('rd.accessions', accessionStarter, (prev) => prev.map((a) => (a.id === accession.id ? { ...a, traits: [...a.traits, trait] } : a)));
                    addToast(`Trait ${trait.name} added`, 'success');
                  }}>+ Add trait</Button>
                </div>
                {accession.traits.length > 0 ? (
                  <table className={styles.traitsTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Value</th>
                        <th>Measured Date</th>
                        <th>Measured By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accession.traits.map((t, i) => (
                        <tr key={i}>
                          <td className={styles.fw500}>{t.name}</td>
                          <td><Badge variant={getCategoryColor(t.category) as any}>{t.category}</Badge></td>
                          <td>{t.value} {t.unit}</td>
                          <td>{t.measuredDate || '-'}</td>
                          <td>{t.measuredBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState icon={FileText} title="No traits recorded" description="Add traits to this accession to track performance." />
                )}
              </div>
            )}

            {activeTab === 'Genomic data' && (
              <div className={styles.genomicTab}>
                {accession.hasGenomicData ? (
                  <div className={styles.genomicCard}>
                    <div className={styles.genomicHeader}>
                      <Atom size={32} className={styles.genomicIcon} />
                      <div>
                        <h3>Genomic sequence available</h3>
                        <p>Illumina NovaSeq · 12,847 SNP markers</p>
                      </div>
                    </div>
                    <div className={styles.genomicActions}>
                      <Button variant="secondary" onClick={() => addToast('Marker data is stored with the genotyping provider; connect the genomics integration to browse markers here.', 'info')}>View markers</Button>
                      <Button variant="secondary" onClick={() => addToast('VCF files are held by the genotyping provider; request the file through the genomics integration.', 'info')} icon={<Download size={16}/>}>Download VCF</Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState 
                    icon={Atom} 
                    title="No genomic data uploaded" 
                    description="Upload sequence data or VCF files for this accession."
                    action={{ label: 'Upload genomic data', onClick: () => addToast('Upload flow', 'info') }}
                  />
                )}
              </div>
            )}

            {activeTab === 'Trials & uses' && (
              <div className={styles.trialsTab}>
                <div className={styles.infoCard}>
                  <h3>Breeding programs using this accession</h3>
                  <p className={styles.mutedText}>Mock data: Used in BP-2026-004 as male parent.</p>
                </div>
                <div className={styles.infoCard}>
                  <h3>Trials including this accession</h3>
                  <p className={styles.mutedText}>Mock data: Tested in TRL-2026-012 across 4 locations.</p>
                </div>
              </div>
            )}

            {activeTab === 'Documents & photos' && (
              <div className={styles.docsTab}>
                <div className={styles.tableHeader}>
                  <h3>Media & Files</h3>
                  <Button variant="secondary" size="sm" onClick={async () => {
                    const f = await pickFile();
                    if (!f) return;
                    setCollection<GermplasmAccession>('rd.accessions', accessionStarter, (prev) => prev.map((a) => (a.id === accession.id ? { ...a, documents: [...a.documents, f.name] } : a)));
                    addToast(`${f.name} attached`, 'success');
                  }}>+ Upload</Button>
                </div>
                <div className={styles.photosGrid}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className={styles.photoPlaceholder}>
                      <ImageIcon size={32} className={styles.mutedIcon} />
                      <span>Photo {i}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.docsList}>
                  {accession.documents.length > 0 ? (
                    accession.documents.map((doc, i) => (
                      <div key={i} className={styles.docItem}>
                        <FileText size={16} className={styles.docIcon} />
                        <span className={styles.docName}>{doc}</span>
                        <Button variant="ghost" size="sm" icon={<Download size={14}/>} onClick={() => downloadText(`${doc}.txt`, `Accession ${accession.accessionNumber} (${accession.id})\nDocument: ${doc}\n\nOnly the document name is stored for this record. Attach the file in the document store to download its contents.`)}>Download</Button>
                      </div>
                    ))
                  ) : (
                    <p className={styles.mutedText}>No documents attached.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <PedigreeViewerModal 
        isOpen={showPedigreeViewer}
        onClose={() => setShowPedigreeViewer(false)}
        rootAccession={accession}
        allAccessions={allAccessions}
      />
    </>
  );
}
