import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Grid,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Nursery, GermplasmAccession } from '@/types/rd';
import styles from './NurseryDetailModal.module.css';

interface NurseryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nursery: Nursery | null;
  allAccessions?: GermplasmAccession[];
}

export const NurseryDetailModal: React.FC<NurseryDetailModalProps> = ({
  isOpen,
  onClose,
  nursery,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'entries' | 'activity'>('overview');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  if (!nursery) return null;

  const totalSlots = nursery.location.rows * nursery.location.plants;

  // Static/faux data for entries planted inside this nursery
  const entriesData = useMemo(() => {
    if (nursery.entriesPlanted && nursery.entriesPlanted.length > 0) {
      return nursery.entriesPlanted;
    }
    // Fallback entries if empty
    return [
      { entryCode: 'E01', parentMale: 'GRM-2026-004', parentFemale: 'GRM-2026-012', plotsAssigned: 12, survived: 110 },
      { entryCode: 'E02', parentMale: 'GRM-2026-008', parentFemale: 'GRM-2026-012', plotsAssigned: 15, survived: 145 },
      { entryCode: 'E03', parentMale: 'GRM-2026-015', parentFemale: 'GRM-2026-019', plotsAssigned: 10, survived: 95 },
      { entryCode: 'E04', parentMale: 'GRM-2026-022', parentFemale: 'GRM-2026-025', plotsAssigned: 8, survived: 72 },
    ];
  }, [nursery]);

  // SVG dimensions for plot map
  const numRows = Math.min(nursery.location.rows, 12); // Clamped for visual clarity
  const numCols = Math.min(nursery.location.plants, 24);

  // Deterministic cell entry assignment for SVG rendering
  const getCellEntry = (rowIdx: number, colIdx: number) => {
    const hash = (rowIdx * 7 + colIdx * 13) % 5;
    if (hash === 0) return { code: 'Empty', color: '#f3f4f6', label: 'Unoccupied' };
    if (hash === 1) return { code: entriesData[0]?.entryCode || 'E01', color: '#ccd5ae', label: 'Line A' };
    if (hash === 2) return { code: entriesData[1]?.entryCode || 'E02', color: '#e9edc9', label: 'Line B' };
    if (hash === 3) return { code: entriesData[2]?.entryCode || 'E03', color: '#faedcd', label: 'Line C' };
    return { code: entriesData[3]?.entryCode || 'E04', color: '#d4a373', label: 'Line D' };
  };

  // Cell selection details
  const cellDetails = useMemo(() => {
    if (!selectedCell) return null;
    const entry = getCellEntry(selectedCell.row, selectedCell.col);
    return {
      row: selectedCell.row + 1,
      col: selectedCell.col + 1,
      entryCode: entry.code,
      status: entry.code === 'Empty' ? 'Not Sown' : 'Healthy (Germinated)',
      vigourScore: entry.code === 'Empty' ? 'N/A' : '8.5 / 10',
    };
  }, [selectedCell]);

  // Columns for entries table
  const entriesColumns = [
    { key: 'entryCode', header: 'Entry Code', width: '120px', render: (row: any) => <strong className={styles.mono}>{row.entryCode}</strong> },
    { key: 'parentMale', header: 'Parent Male (♂)', render: (row: any) => row.parentMale || 'N/A' },
    { key: 'parentFemale', header: 'Parent Female (♀)', render: (row: any) => row.parentFemale || 'N/A' },
    { key: 'plotsAssigned', header: 'Plots Assigned', width: '130px', align: 'center' as const },
    { key: 'survived', header: 'Plants Survived', width: '140px', align: 'center' as const, render: (row: any) => row.survived || 'N/A' },
    { 
      key: 'survivalRate', 
      header: 'Survival Rate', 
      width: '130px', 
      align: 'right' as const,
      render: (row: any) => {
        if (!row.survived) return '0%';
        const rate = Math.round((row.survived / (row.plotsAssigned * 10)) * 100);
        return <span className={rate >= 80 ? styles.successRate : styles.warningRate}>{rate}%</span>;
      }
    },
  ];

  // Faux activity logs
  const activityLogs = [
    { date: '2026-06-28', event: 'First germination audit', details: 'Averages 92% emergence across blocks', user: 'Dr. Anita Desai' },
    { date: '2026-06-20', event: 'Nursery sowing completed', details: 'All plots sown; automated drip irrigation cycle initialized', user: 'S. Kulkarni' },
    { date: '2026-06-15', event: 'Plot preparation & marking', details: 'Added organic soil treatments and set row stakes', user: 'V. Kumar' },
    { date: '2026-06-10', event: 'Nursery layout configured', details: 'Configured layout for crossing parental lines', user: 'Dr. Anita Desai' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nursery details: ${nursery.name}`} size="lg">
      <div className={styles.container}>
        {/* Top Header Card */}
        <div className={styles.headerCard}>
          <div className={styles.headerInfo}>
            <div>
              <span className={styles.nurseryId}>{nursery.id}</span>
              <h3 className={styles.nurseryName}>{nursery.name}</h3>
            </div>
            <StatusBadge status={nursery.status} type="rd" />
          </div>

          <div className={styles.metaRow}>
            <div className={styles.metaBadge}>
              <MapPin size={13} />
              <span>{nursery.location.facility} • {nursery.location.block}</span>
            </div>
            <div className={styles.metaBadge}>
              <Calendar size={13} />
              <span>{nursery.season}</span>
            </div>
            <div className={styles.metaBadge}>
              <Grid size={13} />
              <span>Layout: {nursery.location.rows} x {nursery.location.plants} ({totalSlots.toLocaleString()} slots)</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabHeader}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'map' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('map')}
          >
            Plot layout map
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'entries' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('entries')}
          >
            Entry accessions
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity log
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabBody}>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className={styles.grid}>
              <div className={styles.detailsCard}>
                <h4 className={styles.sectionTitle}>Physical Specifications</h4>
                <div className={styles.specsList}>
                  <div className={styles.specRow}>
                    <span>Nursery Type</span>
                    <strong>{nursery.type}</strong>
                  </div>
                  <div className={styles.specRow}>
                    <span>Sown Date</span>
                    <strong>{nursery.sownDate || 'Planned'}</strong>
                  </div>
                  <div className={styles.specRow}>
                    <span>Harvest Date</span>
                    <strong>{nursery.harvestDate || 'Ongoing'}</strong>
                  </div>
                  <div className={styles.specRow}>
                    <span>Active Crop</span>
                    <strong>{nursery.crop}</strong>
                  </div>
                </div>

                <h4 className={styles.sectionTitle} style={{ marginTop: '20px' }}>Supervising Team</h4>
                <div className={styles.staffGrid}>
                  {nursery.responsibleStaff.map((staff, idx) => (
                    <div key={idx} className={styles.staffChip}>
                      <div className={styles.staffAvatar}>
                        {staff.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span>{staff}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.detailsCard}>
                <h4 className={styles.sectionTitle}>Linked breeding programs</h4>
                <div className={styles.programsList}>
                  {nursery.programRefs.length > 0 ? (
                    nursery.programRefs.map((ref) => (
                      <div key={ref} className={styles.programItem}>
                        <Activity size={16} className={styles.programIcon} />
                        <div>
                          <div className={styles.programRefId}>{ref}</div>
                          <div className={styles.programRefSub}>Click to view parent pedigree</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyPrograms}>
                      No programs linked directly. This nursery acts as a generic parental reservoir.
                    </div>
                  )}
                </div>

                <h4 className={styles.sectionTitle} style={{ marginTop: '20px' }}>Crosses & performance</h4>
                <div className={styles.performanceGrid}>
                  <div className={styles.perfItem}>
                    <span className={styles.perfLabel}>Crosses Made</span>
                    <span className={styles.perfVal}>{nursery.crossesMade || 0}</span>
                  </div>
                  <div className={styles.perfItem}>
                    <span className={styles.perfLabel}>Successful</span>
                    <span className={styles.perfVal}>{nursery.crossesSuccessful || 0}</span>
                  </div>
                  <div className={styles.perfItem}>
                    <span className={styles.perfLabel}>Success rate</span>
                    <span className={styles.perfVal}>
                      {nursery.crossesMade ? Math.round((nursery.crossesSuccessful || 0) / nursery.crossesMade * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLOT LAYOUT MAP */}
          {activeTab === 'map' && (
            <div className={styles.mapTab}>
              <div className={styles.mapGrid}>
                {/* SVG Visual Grid */}
                <div className={styles.svgWrapper}>
                  <div className={styles.axisLabelY}>R O W S</div>
                  <div className={styles.svgScrollable}>
                    <svg viewBox={`0 0 ${numCols * 28 + 40} ${numRows * 28 + 40}`} className={styles.svg}>
                      {/* Grid cells */}
                      {Array.from({ length: numRows }).map((_, rIdx) =>
                        Array.from({ length: numCols }).map((_, cIdx) => {
                          const cell = getCellEntry(rIdx, cIdx);
                          const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                          return (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx * 28 + 20}
                              y={rIdx * 28 + 20}
                              width={24}
                              height={24}
                              rx={4}
                              fill={cell.color}
                              stroke={isSelected ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)'}
                              strokeWidth={isSelected ? 2 : 1}
                              className={styles.svgCell}
                              onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                            >
                              <title>{`Row ${rIdx + 1}, Plant ${cIdx + 1} (${cell.code})`}</title>
                            </rect>
                          );
                        })
                      )}

                      {/* Y-axis indices */}
                      {Array.from({ length: numRows }).map((_, rIdx) => (
                        <text
                          key={`y-${rIdx}`}
                          x={6}
                          y={rIdx * 28 + 36}
                          fontSize={9}
                          fontWeight={600}
                          fill="var(--color-text-muted)"
                        >
                          {rIdx + 1}
                        </text>
                      ))}

                      {/* X-axis indices */}
                      {Array.from({ length: numCols }).map((_, cIdx) => (
                        <text
                          key={`x-${cIdx}`}
                          x={cIdx * 28 + 26}
                          y={numRows * 28 + 32}
                          fontSize={9}
                          fontWeight={600}
                          fill="var(--color-text-muted)"
                          textAnchor="middle"
                        >
                          {cIdx + 1}
                        </text>
                      ))}
                    </svg>
                  </div>
                  <div className={styles.axisLabelX}>P L A N T S  ( C E L L S )</div>
                </div>

                {/* Legend and selection overlay */}
                <div className={styles.mapSidebar}>
                  <h4 className={styles.sectionTitle}>Plot Details</h4>
                  
                  {cellDetails ? (
                    <div className={styles.selectedOverlay}>
                      <div className={styles.selectedTitle}>Row {cellDetails.row}, Plant {cellDetails.col}</div>
                      <div className={styles.overlaySpecs}>
                        <div className={styles.specRow}>
                          <span>Entry Line</span>
                          <strong className={styles.mono}>{cellDetails.entryCode}</strong>
                        </div>
                        <div className={styles.specRow}>
                          <span>Health Status</span>
                          <span className={styles.healthStatusChip}>{cellDetails.status}</span>
                        </div>
                        <div className={styles.specRow}>
                          <span>Vigour Score</span>
                          <strong>{cellDetails.vigourScore}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.emptyMapSidebar}>
                      Click any cell inside the plot map to view genetic and phenotypic observations.
                    </div>
                  )}

                  <div className={styles.legend}>
                    <h5 className={styles.legendTitle}>Map Legend</h5>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ backgroundColor: '#ccd5ae' }} />
                      <span>{entriesData[0]?.entryCode || 'E01'} Candidates</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ backgroundColor: '#e9edc9' }} />
                      <span>{entriesData[1]?.entryCode || 'E02'} Candidates</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ backgroundColor: '#faedcd' }} />
                      <span>{entriesData[2]?.entryCode || 'E03'} Candidates</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ backgroundColor: '#d4a373' }} />
                      <span>{entriesData[3]?.entryCode || 'E04'} Candidates</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }} />
                      <span>Unoccupied / Gap</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ENTRY ACCESSIONS */}
          {activeTab === 'entries' && (
            <div className={styles.tableWrap}>
              <div className={styles.tableHeader}>
                <h4 className={styles.sectionTitle}>Planted accession blocks</h4>
                <button className={styles.exportBtn}>
                  <FileSpreadsheet size={14} />
                  <span>Download entries (CSV)</span>
                </button>
              </div>
              <DataTable
                data={entriesData}
                columns={entriesColumns}
                rowKey="entryCode"
              />
            </div>
          )}

          {/* ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className={styles.activityTimeline}>
              {activityLogs.map((log, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={styles.timelinePoint} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineEvent}>{log.event}</span>
                      <span className={styles.timelineDate}>{log.date}</span>
                    </div>
                    <p className={styles.timelineDetails}>{log.details}</p>
                    <span className={styles.timelineUser}>Logged by {log.user}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
