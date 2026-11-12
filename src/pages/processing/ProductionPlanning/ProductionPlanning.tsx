import { useState, useMemo } from 'react';
import { Calendar, Plus, Activity, PieChart, AlertCircle } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { ViewToggle } from '@/components/common/ViewToggle/ViewToggle';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { productionSchedule as mockSchedule } from '@/data/processing/productionSchedule';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { PROCESSING_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { ProductionSchedule } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './ProductionPlanning.module.css';

import { useNavigate } from 'react-router-dom';
const CALENDAR_DAYS = [
  { day: 10, batch: 'BT-2026-1142 (Cotton)', isToday: false },
  { day: 11, batch: 'BT-2026-1140 (Paddy)', isToday: false },
  { day: 12, batch: '', isToday: false },
  { day: 13, batch: 'BT-2026-1143 (Paddy)', isToday: false },
  { day: 14, batch: '', isToday: false },
  { day: 15, batch: 'BT-2026-1144 (Cotton)', isToday: true },
  { day: 16, batch: '', isToday: false },
];

export default function ProductionPlanningPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { items: allSchedule, add } = useRealtimeMockStore<ProductionSchedule>(mockSchedule, 'processing.schedule');
  const [period, setPeriod] = useState<PeriodValue>('all');

  const items = useMemo(
    () => allSchedule.filter((s) => isDateInPeriod(s.plannedStartDate, period, PROCESSING_TODAY)),
    [allSchedule, period]
  );
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid'); // 'grid' represents calendar/timeline, 'table' represents list
  const [activeSubView, setActiveSubView] = useState<'calendar' | 'gantt'>('calendar');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canSchedule = usePermission('schedule_batch');

  // Form states
  const [batchId, setBatchId] = useState('BT-2026-1142');
  const [startDate, setStartDate] = useState('2026-06-16');
  const [endDate, setEndDate] = useState('2026-06-19');
  const [plantId, setPlantId] = useState('PL-AUR');

  const handleScheduleNew = () => {
    const newSch: ProductionSchedule = {
      id: `SCH-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      batchId,
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      plantId,
      machineIds: ['MAC-AUR-CL-01'],
      variety: 'Bt RCH-2 BG-II',
      qty: 6000,
      status: 'Planned',
    };
    add(newSch);
    addToast(`Batch ${batchId} scheduled successfully for ${startDate}.`, 'success');
    setIsAddOpen(false);
  };

  const columns = [
    { key: 'batchId', label: 'Batch ID', sortable: true },
    { key: 'plannedStartDate', label: 'Planned Start', sortable: true },
    { key: 'plannedEndDate', label: 'Planned End' },
    { key: 'plantId', label: 'Plant ID' },
    { key: 'variety', label: 'Variety' },
    { key: 'qty', label: 'Planned Qty (kg)', render: (s: ProductionSchedule) => s.qty.toLocaleString() },
    { key: 'status', label: 'Status', render: (s: ProductionSchedule) => <span style={{ fontWeight: '500' }}>{s.status}</span> },
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Calendar} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Production Planning</h1>
          <p className={styles.pageSubtitle}>
            Schedule upcoming batches, balance machine capacity, and plan runs against confirmed demand
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canSchedule && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddOpen(true)}>
              Schedule Batch
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <KpiCard
          icon={Calendar}
          title="Scheduled This Week"
          value="14 batches"
          subValue="118 tonnes planned"
        />
        <KpiCard
          icon={Activity}
          title="Capacity Utilization"
          value="76%"
          subValue="Steady efficiency load"
          trend="up"
          change="+4% vs last week"
        />
        <KpiCard
          icon={PieChart}
          title="Demand Coverage"
          value="92%"
          subValue="Against confirmed orders"
        />
        <KpiCard
          icon={AlertCircle}
          title="Unscheduled Demand"
          value="8.5 tonnes"
          subValue="Awaiting line allocation"
          trend="up"
          change="Needs allocation"
        />
      </div>

      <div className={styles.viewHeader}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {viewMode === 'grid' && (
            <>
              <Button variant={activeSubView === 'calendar' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveSubView('calendar')}>
                Calendar View
              </Button>
              <Button variant={activeSubView === 'gantt' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveSubView('gantt')}>
                Gantt Timeline
              </Button>
            </>
          )}
        </div>
        <ViewToggle view={viewMode} onChange={setViewMode} />
      </div>

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        {viewMode === 'table' ? (
          <DataTable columns={columns} data={items} rowKey="id" />
        ) : (
          <>
            {activeSubView === 'calendar' ? (
              <div>
                <h3 className={styles.viewTitle}>Weekly Production Calendar — June 2026</h3>
                <div className={styles.calendarGrid}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(h => (
                    <div key={h} className={styles.calendarHeaderCell}>{h}</div>
                  ))}
                  {CALENDAR_DAYS.map((d, idx) => (
                    <div key={idx} className={`${styles.calendarCell} ${d.isToday ? styles.calendarCellToday : ''}`}>
                      <div className={styles.dayNumber}>{d.day} Jun {d.isToday && '(Today)'}</div>
                      {d.batch && (
                        <div className={`${styles.scheduleBlock} ${idx % 2 === 0 ? styles.scheduleBlockAlt : ''}`} onClick={() => navigate(`/processing/batches/${d.batch.split(' ')[0]}`)}>
                          {d.batch}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.ganttGrid}>
                <h3 className={styles.viewTitle}>Gantt Machine Allocation — Auragabad Plant</h3>
                <div className={styles.ganttRow}>
                  <span className={styles.ganttMachineName}>Aurangabad Cleaner-01</span>
                  <div className={styles.ganttTimelineTrack}>
                    <div className={styles.ganttBar} style={{ left: '10%', width: '40%' }}>
                      BT-2026-1142 (Cleaning)
                    </div>
                  </div>
                </div>
                <div className={styles.ganttRow}>
                  <span className={styles.ganttMachineName}>Aurangabad Dryer-01</span>
                  <div className={styles.ganttTimelineTrack}>
                    <div className={styles.ganttBar} style={{ left: '40%', width: '35%', backgroundColor: '#2D7A8F' }}>
                      BT-2026-1142 (Drying)
                    </div>
                  </div>
                </div>
                <div className={styles.ganttRow}>
                  <span className={styles.ganttMachineName}>Aurangabad Treater-01</span>
                  <div className={styles.ganttTimelineTrack}>
                    <div className={styles.ganttBar} style={{ left: '20%', width: '50%', backgroundColor: '#F5AF12' }}>
                      BT-2026-1141 (Treatment)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Schedule Modal */}
      {isAddOpen && (
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Schedule Batch Run" size="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px' }}>
            <div>
              <label className={styles.label}>Select Planned Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={styles.select}>
                <option value="BT-2026-1142">BT-2026-1142 (Cotton — Bt RCH-2)</option>
                <option value="BT-2026-1144">BT-2026-1144 (Cotton — Suraj)</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Planned Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Planned End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Plant</label>
              <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className={styles.select}>
                <option value="PL-AUR">Aurangabad Plant</option>
                <option value="PL-HYD">Hyderabad Plant</option>
                <option value="PL-IND">Indore Plant</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleScheduleNew}>
                Confirm Schedule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModuleLayout>
  );
}
