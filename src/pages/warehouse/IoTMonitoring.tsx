import React, { useState } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  RefreshCw, 
  Settings,
  Search,
  Filter,
  Download,
  Zap,
  Thermometer,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Card } from '@/components/common/Card/Card';
import { ScoreRing } from '@/components/common/ScoreRing/ScoreRing';
import { KpiCard } from './components/KpiCard/KpiCard';

import { LiveStatsCard } from './components/LiveStatsCard/LiveStatsCard';
import { ZoneMonitoringCard } from './components/ZoneMonitoringCard/ZoneMonitoringCard';
import { IoTAlertsPanel } from './components/IoTAlertsPanel/IoTAlertsPanel';
import { HistoricalTrendChart } from './components/HistoricalTrendChart/HistoricalTrendChart';
import { InsightsPanel } from './components/InsightsPanel/InsightsPanel';
import { GerminationCard } from './components/GerminationCard/GerminationCard';
import { EnergyChart } from './components/EnergyChart/EnergyChart';
import { MaintenanceCalendar } from './components/MaintenanceCalendar/MaintenanceCalendar';
import { MaintenanceTaskCard } from './components/MaintenanceTaskCard/MaintenanceTaskCard';
import { SensorsTable } from './components/SensorsTable/SensorsTable';

// Modals
import { SensorDetailModal } from './components/SensorDetailModal/SensorDetailModal';
import { ZoneDetailModal } from './components/ZoneDetailModal/ZoneDetailModal';
import { AlertConfigurationModal } from './components/AlertConfigurationModal/AlertConfigurationModal';
import { AcknowledgeAlertModal, ResolveAlertModal } from './components/AlertActionModals/AlertActionModals';
import { ScheduleMaintenanceModal } from './components/ScheduleMaintenanceModal/ScheduleMaintenanceModal';

import { 
  iotKpis, 
  currentReadings, 
  historicalReadings,
  germinationDeclineRecords,
  maintenanceTasks,
  energyConsumption
} from './mockData/iotData';
import { PERIOD_OPTIONS, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { warehouseNav } from '@/config/warehouseNav';
import { IoTSensor } from '@/types/warehouse';

import styles from './IoTMonitoring.module.css';

import { usePermission } from '@/hooks/usePermission';

import { useWh, whUpdate, whUser } from './warehouseStore';
import { usePersistentCollection } from '@/hooks/persistentCollections';
import { downloadCsv } from '@/utils/fileExport';
import type { MaintenanceTask } from '@/types/warehouse';
const IoTMonitoring: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('live');
  const [mockSensors] = useWh('sensors');
  const [mockAlerts] = useWh('iotAlerts');
  const [maintenance, setMaintenance] = usePersistentCollection<MaintenanceTask>('warehouse.maintenance', maintenanceTasks);
  const TREND_ZONES = Object.keys(historicalReadings);
  const [trendZones, setTrendZones] = useState<string[]>(TREND_ZONES.slice(0, 2));
  const [trendMetric, setTrendMetric] = useState<'Temperature' | 'Humidity' | 'CO2' | 'Energy'>('Temperature');
  const METRIC: Record<string, { key: 'temperature' | 'humidity' | 'co2' | 'energyKwh'; unit: string; min?: number; max?: number }> = {
    Temperature: { key: 'temperature', unit: '°C', min: 14, max: 18 },
    Humidity: { key: 'humidity', unit: '%', min: 40, max: 60 },
    CO2: { key: 'co2', unit: ' ppm', max: 1000 },
    Energy: { key: 'energyKwh', unit: ' kWh' },
  };
  const [selectedSensor, setSelectedSensor] = useState<IoTSensor | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isAlertConfigOpen, setIsAlertConfigOpen] = useState(false);
  const [ackAlertId, setAckAlertId] = useState<string | null>(null);
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [isScheduleMaintenanceOpen, setIsScheduleMaintenanceOpen] = useState(false);

  const canConfigureIoT = usePermission('configure_iot_thresholds');

  // Germination tab filters
  const [germinationSearch, setGerminationSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'Low' | 'Medium' | 'High' | 'Critical'>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | string>('all');
  const [prioritizedSkus, setPrioritizedSkus] = useState<Set<string>>(new Set());

  // Alert filter
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [period, setPeriod] = useState<PeriodValue>('all');

  const filteredGermination = React.useMemo(() => {
    return germinationDeclineRecords.filter((g: any) => {
      if (riskFilter !== 'all' && g.riskLevel !== riskFilter) return false;
      if (zoneFilter !== 'all' && g.zone !== zoneFilter) return false;
      if (germinationSearch.trim() !== '') {
        const q = germinationSearch.trim().toLowerCase();
        const haystack = `${g.sku} ${g.batch} ${g.itemName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [germinationSearch, riskFilter, zoneFilter]);

  const germinationZones = React.useMemo(() => {
    return Array.from(new Set(germinationDeclineRecords.map((g: any) => g.zone)));
  }, []);

  const filteredAlerts = React.useMemo(() => {
    // Sensors are permanent equipment; alerts are events, so the period
    // filters the alert feed rather than the sensor list.
    const inPeriod = mockAlerts.filter((a: any) => isDateInPeriod(a.triggeredAt, period));
    if (alertSeverityFilter === 'all') return inPeriod;
    return inPeriod.filter((a: any) => a.severity === alertSeverityFilter);
  }, [alertSeverityFilter, period]);

  const tabs = [
    { key: 'live', label: 'Live monitoring' },
    { key: 'trends', label: 'Historical trends' },
    { key: 'germination', label: 'Germination tracking' },
    { key: 'energy', label: 'Energy & maintenance' },
    { key: 'sensors', label: 'Sensors' }
  ];

  const renderLiveMonitoring = () => (
    <div className={styles.liveGrid}>
      <div className={styles.zonesCol}>
        <div className={styles.grid2}>
          {Object.entries(currentReadings).map(([zone, reading]) => (
            <ZoneMonitoringCard
              key={zone}
              zoneName={zone}
              zoneType={zone.includes('Cold') ? 'Cold' : zone.includes('Controlled') ? 'Controlled' : 'Quarantine'}
              readings={reading}
              sensorCount={zone === 'Cold Zone A' ? 8 : 4}
              lastUpdated="2 min ago"
              history={[15, 15.5, 16, 16.2, 16.5, 16.3, 16.5]}
              onClick={() => setSelectedZone(zone)}
            />
          ))}
        </div>
      </div>
      <div className={styles.alertsCol}>
        <div className={styles.alertChipBar}>
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              className={`${styles.alertChip} ${alertSeverityFilter === sev ? styles.alertChipActive : ''}`}
              onClick={() => setAlertSeverityFilter(sev)}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        <IoTAlertsPanel
          alerts={filteredAlerts}
          onAcknowledge={(id) => setAckAlertId(id)}
          onResolve={(id) => setResolveAlertId(id)}
          onViewSensor={(id) => setSelectedSensor(mockSensors.find(s => s.id === id) || null)}
        />
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className={styles.trendsContent}>
      <div className={styles.trendsHeader}>
        <div className={styles.trendControls}>
          <div className={styles.multiSelect}>
            {TREND_ZONES.map(z => (
              <button
                key={z}
                className={`${styles.chip} ${trendZones.includes(z) ? styles.activeChip : ''}`}
                onClick={() => setTrendZones((prev) => (prev.includes(z) ? (prev.length > 1 ? prev.filter((x) => x !== z) : prev) : [...prev, z]))}
              >{z}</button>
            ))}
          </div>
          <div className={styles.metricTabs}>
            {['Temperature', 'Humidity', 'CO2', 'Energy'].map(m => (
              <button key={m} className={`${styles.metricTab} ${m === trendMetric ? styles.activeMetricTab : ''}`} onClick={() => setTrendMetric(m as typeof trendMetric)}>{m}</button>
            ))}
          </div>
        </div>
        <Button variant="secondary" leftIcon={Download} onClick={() => { const k = METRIC[trendMetric].key; const base = historicalReadings[trendZones[0]] ?? []; downloadCsv(`iot_${trendMetric.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`, base.map((r, i) => ({ timestamp: r.timestamp, ...Object.fromEntries(trendZones.map((z) => [z, historicalReadings[z]?.[i]?.[k] ?? ''])) }))); addToast({ type: 'success', message: 'Historical data exported as CSV' }); }}>Export data</Button>
      </div>

      <HistoricalTrendChart 
        data={(historicalReadings[trendZones[0]] ?? []).map((r, i) => ({
          timestamp: r.timestamp,
          values: Object.fromEntries(trendZones.map((z) => [z, Number(historicalReadings[z]?.[i]?.[METRIC[trendMetric].key] ?? 0)])),
        }))}
        zones={trendZones}
        metric={trendMetric}
        unit={METRIC[trendMetric].unit}
        thresholdMin={METRIC[trendMetric].min}
        thresholdMax={METRIC[trendMetric].max}
      />

      <div className={styles.trendsFooter}>
        <div className={styles.insightsArea}>
          <InsightsPanel insights={[
            { id: '1', type: 'warning', title: 'Temperature excursions', description: 'Cold Zone A had 4 excursions above threshold this week, all between 2-4 PM.' },
            { id: '2', type: 'trend', title: 'Energy efficiency', description: 'Energy consumption is 8% higher than last week — investigate compressor in Cold Zone B.' }
          ]} />
        </div>
        <div className={styles.statsArea}>
          <Card>
            <div className={styles.cardHeader}>Statistics summary</div>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Avg</th>
                  <th>Excursions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cold Zone A</td>
                  <td>16.2°C</td>
                  <td><span className={styles.dangerText}>4</span></td>
                </tr>
                <tr>
                  <td>Cold Zone B</td>
                  <td>15.8°C</td>
                  <td><span className={styles.successText}>0</span></td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderGermination = () => (
    <div className={styles.germinationContent}>
      <div className={styles.miniKpiRow}>
        <KpiCard 
          label="Items tracked" 
          value="42" 
          icon={Search} 
          trend={{ direction: 'up', percentage: '12%', isPositive: true }} 
          comparison="vs last month" 
        />
        <KpiCard 
          label="High risk" 
          value="4" 
          icon={AlertCircle} 
          trend={{ direction: 'up', percentage: '2%', isPositive: false }} 
          comparison="vs last month" 
        />
        <KpiCard 
          label="Predicted expiry" 
          value="7" 
          icon={Calendar} 
          trend={{ direction: 'down', percentage: '5%', isPositive: true }} 
          comparison="vs last month" 
        />
        <KpiCard 
          label="Avg decline" 
          value="1.2%" 
          icon={Zap} 
          trend={{ direction: 'down', percentage: '0.1%', isPositive: true }} 
          comparison="vs last month" 
        />
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input
            placeholder="Search by SKU/batch..."
            value={germinationSearch}
            onChange={(e) => setGerminationSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <select
            className={styles.iotSelect}
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as 'all' | 'Low' | 'Medium' | 'High' | 'Critical')}
            aria-label="Risk filter"
          >
            <option value="all">Risk: All</option>
            <option value="Critical">Risk: Critical</option>
            <option value="High">Risk: High</option>
            <option value="Medium">Risk: Medium</option>
            <option value="Low">Risk: Low</option>
          </select>
          <select
            className={styles.iotSelect}
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            aria-label="Zone filter"
          >
            <option value="all">Zone: All</option>
            {germinationZones.map((z) => <option key={z} value={z}>Zone: {z}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.grid3}>
        {filteredGermination.map((record: any) => (
          <GerminationCard
            key={record.sku + record.batch}
            record={record}
            onPrioritize={(sku) => {
              setPrioritizedSkus((prev) => new Set([...prev, sku]));
              addToast({ type: 'success', message: `${sku} marked for priority dispatch` });
            }}
            isPrioritized={prioritizedSkus.has(record.sku)}
          />
        ))}
        {filteredGermination.length === 0 && (
          <div className={styles.empty}>No batches match your filters.</div>
        )}
      </div>
    </div>
  );

  const renderEnergyMaintenance = () => (
    <div className={styles.energyMaintenanceGrid}>
      <div className={styles.energyCol}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Energy consumption</h3>
          <div className={styles.energyKpis}>
            <div className={styles.miniStat}>
              <span className={styles.statLabel}>Today</span>
              <span className={styles.statValue}>1,248 kWh</span>
            </div>
            <div className={styles.miniStat}>
              <span className={styles.statLabel}>This month</span>
              <span className={styles.statValue}>34,250 kWh</span>
            </div>
          </div>
        </div>
        <Card>
          <EnergyChart data={energyConsumption} />
        </Card>
        <div className={styles.efficiencyTable}>
          <Card>
            <div className={styles.cardHeader}>Efficiency rating</div>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>kWh/day</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cold Zone A</td>
                  <td>450</td>
                  <td><ScoreRing score={92} size="sm" /></td>
                </tr>
                <tr>
                  <td>Cold Zone B</td>
                  <td>520</td>
                  <td><ScoreRing score={78} size="sm" /></td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <div className={styles.maintenanceCol}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Equipment maintenance</h3>
          {canConfigureIoT && <Button variant="primary" size="sm" onClick={() => setIsScheduleMaintenanceOpen(true)}>+ Schedule</Button>}
        </div>
        <Card>
          <MaintenanceCalendar tasks={maintenance} />
        </Card>
        <div className={styles.maintenanceList}>
          {maintenance.map(task => (
            <MaintenanceTaskCard 
              key={task.id} 
              task={task} 
              onAction={(id, action) => {
                if (action === 'complete') {
                  setMaintenance((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Completed' as MaintenanceTask['status'], completedDate: new Date().toISOString().slice(0, 10) } : t)));
                  addToast({ type: 'success', message: `${id} marked complete` });
                } else {
                  const d = window.prompt('New date (YYYY-MM-DD)', task.scheduledDate.slice(0, 10));
                  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                    setMaintenance((prev) => prev.map((t) => (t.id === id ? { ...t, scheduledDate: d } : t)));
                    addToast({ type: 'success', message: `${id} rescheduled to ${d}` });
                  }
                }
              }} 
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSensors = () => (
    <div className={styles.sensorsContent}>
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input placeholder="Search sensors..." />
        </div>
        <div className={styles.filters}>
          <Button variant="secondary" leftIcon={Filter} onClick={() => addToast({ message: 'Type filter opened' })}>Type: All</Button>
          <Button variant="secondary" leftIcon={Filter} onClick={() => addToast({ message: 'Status filter opened' })}>Status: All</Button>
          <Button variant="secondary" leftIcon={Filter} onClick={() => addToast({ message: 'Zone filter opened' })}>Zone: All</Button>
        </div>
      </div>
      <SensorsTable 
        sensors={mockSensors} 
        onRowClick={(s) => setSelectedSensor(s)} 
      />
    </div>
  );

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={WarehouseIcon} navItems={warehouseNav}>
      <div className={styles.page}>
        <PageHeader
          title="IoT monitoring"
          subtitle="Real-time environment sensors and equipment health"
          primaryAction={canConfigureIoT ? {
            label: 'Configure alerts',
            icon: Settings,
            onClick: () => setIsAlertConfigOpen(true)
          } : undefined}
          secondaryActions={[
            {
              label: 'Refresh',
              icon: RefreshCw,
              onClick: () => addToast({ type: 'info', message: `Showing the latest saved readings from ${mockSensors.length} sensors. Live streaming starts when the sensor gateway is connected.` })
            }
          ]}
          period={{ value: period, onChange: (v) => setPeriod(v as PeriodValue), options: PERIOD_OPTIONS }}
        />

        <div className={styles.statsStrip}>
          {iotKpis.map(kpi => (
            <LiveStatsCard 
              key={kpi.label} 
              {...kpi} 
              icon={
                kpi.label.includes('sensors') ? RefreshCw : 
                kpi.label.includes('alerts') ? AlertCircle : 
                kpi.label.includes('temp') ? Thermometer : Zap
              } 
              trend={kpi.trend as any}
            />
          ))}
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.content}>
          {activeTab === 'live' && renderLiveMonitoring()}
          {activeTab === 'trends' && renderTrends()}
          {activeTab === 'germination' && renderGermination()}
          {activeTab === 'energy' && renderEnergyMaintenance()}
          {activeTab === 'sensors' && renderSensors()}
        </div>

        {/* Modals */}
        <SensorDetailModal 
          isOpen={!!selectedSensor} 
          onClose={() => setSelectedSensor(null)} 
          sensor={selectedSensor} 
        />
        
        <ZoneDetailModal 
          isOpen={!!selectedZone} 
          onClose={() => setSelectedZone(null)} 
          zoneName={selectedZone || ''}
          readings={currentReadings[selectedZone || ''] || {}}
          sensors={mockSensors.filter(s => s.zone === selectedZone)}
          alerts={mockAlerts.filter(a => a.zone === selectedZone)}
        />

        <AlertConfigurationModal 
          isOpen={isAlertConfigOpen} 
          onClose={() => setIsAlertConfigOpen(false)} 
        />

        <AcknowledgeAlertModal 
          isOpen={!!ackAlertId} 
          onClose={() => setAckAlertId(null)} 
          onConfirm={(notes) => { if (ackAlertId) { whUpdate('iotAlerts', ackAlertId, { acknowledgedAt: new Date().toISOString(), acknowledgedBy: whUser(), resolution: notes || undefined }); addToast({ type: 'success', message: 'Alert acknowledged' }); } setAckAlertId(null); }} 
        />

        <ResolveAlertModal 
          isOpen={!!resolveAlertId} 
          onClose={() => setResolveAlertId(null)} 
          onConfirm={(res, notes) => { if (resolveAlertId) { whUpdate('iotAlerts', resolveAlertId, { resolvedAt: new Date().toISOString(), resolution: [res, notes].filter(Boolean).join(' — ') }); addToast({ type: 'success', message: 'Alert resolved' }); } setResolveAlertId(null); }} 
        />

        <ScheduleMaintenanceModal 
          isOpen={isScheduleMaintenanceOpen} 
          onClose={() => setIsScheduleMaintenanceOpen(false)} 
          onSchedule={(f) => {
            const task: MaintenanceTask = {
              id: `MNT-${Date.now().toString(36).toUpperCase()}`, asset: f.asset || 'Unnamed asset', zone: f.zone, taskType: f.taskType as MaintenanceTask['taskType'],
              description: f.description, scheduledDate: f.scheduledDate || new Date().toISOString().slice(0, 10), assignedTo: f.assignedTo || whUser(),
              status: 'Scheduled', priority: f.priority as MaintenanceTask['priority'], estimatedDurationHours: Number(f.estimatedDuration) || 1,
            };
            setMaintenance((prev) => [task, ...prev]);
            addToast({ type: 'success', message: `Maintenance ${task.id} scheduled` });
          }} 
        />
      </div>
    </ModuleLayout>
  );
};

export default IoTMonitoring;
