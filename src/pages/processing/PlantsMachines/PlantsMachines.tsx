import { useState, useMemo } from 'react';
import { Layers, Plus, Factory, Wrench, ShieldAlert, Sparkles } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Badge } from '@/components/common/Badge/Badge';
import { processingNav } from '@/config/processingNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { plants as initialPlants } from '@/data/processing/plants';
import { machines as initialMachines } from '@/data/processing/machines';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { PROCESSING_TODAY, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { Plant, Machine } from '@/types/processing';
import { usePermission } from '@/hooks/usePermission';
import styles from './PlantsMachines.module.css';

import { RecordEditModal } from '@/components/common/RecordEditModal/RecordEditModal';
export default function PlantsMachinesPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('plants');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: plantItems } = useRealtimeMockStore<Plant>(initialPlants, 'processing.plants');
  const { items: allMachines, update: updateMachine, add: addMachine } = useRealtimeMockStore<Machine>(initialMachines, 'processing.machines');
  const [showAddMachine, setShowAddMachine] = useState(false);

  // Machines are equipment, not events: the period narrows by last service,
  // and a machine with no service on record stays listed either way.
  const machineItems = useMemo(
    () => allMachines.filter((m) => !m.lastServiceDate || isDateInPeriod(m.lastServiceDate, period, PROCESSING_TODAY)),
    [allMachines, period]
  );

  const canConfigure = usePermission('configure_plant');
  const canScheduleMaintenance = usePermission('schedule_maintenance');
  const canMarkStatus = usePermission('mark_machine_status');

  const handleMaintenance = (id: string) => {
    updateMachine(id, { status: 'Maintenance' });
    addToast(`Machine ${id} status updated to Maintenance.`, 'warning');
  };

  const tabsConfig = [
    { key: 'plants', label: 'Processing Plants' },
    { key: 'machines', label: 'Machinery & Status' },
  ];

  const columns = [
    { key: 'id', label: 'Machine ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'status',
      label: 'Status',
      render: (m: Machine) => {
        let typeVal = 'neutral' as any;
        if (m.status === 'Running') typeVal = 'success' as any;
        if (m.status === 'Idle') typeVal = 'neutral' as any;
        if (m.status === 'Maintenance') typeVal = 'warning' as any;
        if (m.status === 'Down') typeVal = 'danger' as any;
        return <Badge variant={typeVal}>{m.status}</Badge>;
      },
    },
    { key: 'utilization30Days', label: '30d Util %', render: (m: Machine) => `${m.utilization30Days}%` },
    {
      key: 'actions',
      label: 'Actions',
      render: (m: Machine) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {m.status !== 'Maintenance' && m.status !== 'Down' && canScheduleMaintenance && (
            <Button variant="secondary" size="sm" onClick={() => handleMaintenance(m.id)}>
              Schedule Service
            </Button>
          )}
          {m.status === 'Maintenance' && canMarkStatus && (
            <Button variant="primary" size="sm" onClick={() => {
              updateMachine(m.id, { status: 'Idle' });
              addToast(`Machine ${m.id} is now back online and Idle.`, 'success');
            }}>
              Mark Ready
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Layers} navItems={processingNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Plants & Machines</h1>
          <p className={styles.pageSubtitle}>
            Configure seed processing factories, monitor machine status, utilization, and manage preventive services
          </p>
        </div>
        <div className={styles.pageActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canConfigure && (
            <Button variant="primary" leftIcon={Plus} onClick={() => setShowAddMachine(true)}>
              Add Machinery
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <KpiCard
          icon={Factory}
          title="Active Plants"
          value="3 Operational"
          subValue="Maharashtra, TS, MP"
        />
        <KpiCard
          icon={Layers}
          title="Avg Utilization"
          value="76%"
          subValue="Standard factory floor load"
          trend="up"
          change="+3% vs last month"
        />
        <KpiCard
          icon={Wrench}
          title="In Maintenance"
          value="2 machines"
          subValue="Cleaner-02, Dryer-04"
          trend="down"
          change="Under service"
        />
        <KpiCard
          icon={ShieldAlert}
          title="Downtime (Month)"
          value="38 hrs"
          subValue="5% of operating limit"
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        {activeTab === 'plants' ? (
          <div className={styles.plantsGrid}>
            {plantItems.map(p => (
              <div key={p.id} className={styles.plantCard}>
                <div className={styles.plantTitleRow}>
                  <h4 className={styles.plantName}>{p.name}</h4>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: p.status === 'Operational' ? '#e6f4ea' : '#fce8e6', color: p.status === 'Operational' ? '#137333' : '#c5221f', fontWeight: '500' }}>
                    {p.status}
                  </span>
                </div>
                <div className={styles.plantLocation}>{p.location}, {p.state}</div>
                <div className={styles.plantMetaRow}>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Manager:</span>
                    <span className={styles.metaVal}>{p.manager}</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Batches Running:</span>
                    <span className={styles.metaVal}>{p.activeBatchesCount} batches</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Machines Configured:</span>
                    <span className={styles.metaVal}>{p.activeMachinesCount} units</span>
                  </div>
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>Utilization:</span>
                    <span className={styles.metaVal}>{p.utilizationRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <DataTable columns={columns} data={machineItems} rowKey="id" />

            <div className={styles.aiPredictiveMaintenanceCard}>
              <Sparkles size={20} className={styles.aiIcon} />
              <div className={styles.aiText}>
                <div className={styles.aiTitle}>AI Predictive Maintenance Alert</div>
                <div>
                  Dryer-02 vibration sensor readings have increased 12% in the past 14 days. Recommended: schedule bearing inspection within 7 days to avoid unplanned downtime.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <RecordEditModal
        isOpen={showAddMachine}
        title="Add machinery"
        fields={[
          { key: 'name', label: 'Machine name', required: true, placeholder: 'e.g. Cleaner-04' },
          { key: 'type', label: 'Type', type: 'select', options: ['Cleaner', 'Dryer', 'Grader', 'Treater', 'Packager'], required: true },
          { key: 'plantId', label: 'Plant', type: 'select', options: plantItems.map((p) => p.id), required: true },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 5 tonnes/day' },
          { key: 'nextServiceDue', label: 'Next service due', type: 'date' },
        ]}
        values={{ type: 'Cleaner', plantId: plantItems[0]?.id ?? '' }}
        onClose={() => setShowAddMachine(false)}
        onSave={(v) => {
          const today = new Date().toISOString().slice(0, 10);
          addMachine({ id: `MC-${Date.now().toString(36).toUpperCase()}`, name: String(v.name), type: v.type as Machine['type'], plantId: String(v.plantId), manufacturer: String(v.manufacturer) || '—', capacity: String(v.capacity) || '—', status: 'Idle', utilization30Days: 0, lastServiceDate: today, nextServiceDue: String(v.nextServiceDue) || today });
          addToast(`${v.name} added`, 'success');
          setShowAddMachine(false);
        }}
      />
    </ModuleLayout>
  );
}
