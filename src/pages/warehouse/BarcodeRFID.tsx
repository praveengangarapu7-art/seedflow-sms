import { useMemo, useState } from 'react';
import {
  Warehouse,
  Plus,
  Printer,
  Search,
  QrCode,
  ScanBarcode,
  Target,
  ScanLine,
  Smartphone,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { useToast } from '@/components/common/Toast/ToastContext';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { BarcodeRenderer } from './components/BarcodeRenderer/BarcodeRenderer';
import { QuickGeneratorCard } from './components/QuickGeneratorCard/QuickGeneratorCard';
import { BatchGenerationModal } from './components/BatchGenerationModal/BatchGenerationModal';
import { LabelPreviewModal } from './components/LabelPreviewModal/LabelPreviewModal';
import { DevicePairingModal } from './components/DevicePairingModal/DevicePairingModal';
import { PrintQueueModal } from './components/PrintQueueModal/PrintQueueModal';
import {
  barcodeKpis,
  barcodes,
  printJobs,
  scanLog,
  devices,
  type BarcodeKpiIcon,
} from './mockData/barcodeData';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import type { BarcodeRecord, ScanLogEntry, PrintJob, ScanDeviceRecord, LabelType, BarcodeFormat, ScanDevice } from '@/types/warehouse';
import { usePermission } from '@/hooks/usePermission';
import styles from './BarcodeRFID.module.css';

const ICON_MAP: Record<BarcodeKpiIcon, LucideIcon> = { QrCode, ScanBarcode, Target, Printer };

type BCTab = 'catalog' | 'jobs' | 'scans' | 'devices';

const DEVICE_ICON: Record<ScanDevice, LucideIcon> = {
  'Handheld scanner': ScanLine,
  'Mobile phone':     Smartphone,
  'Fixed RFID reader': Radio,
  'Manual entry':     ScanBarcode,
};

export default function BarcodeRFID() {
  const [activeTab, setActiveTab] = useState<BCTab>('catalog');
  const [period, setPeriod] = useState<PeriodValue>('all');

  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogType, setCatalogType] = useState<'all' | LabelType>('all');
  const [catalogFormat, setCatalogFormat] = useState<'all' | BarcodeFormat>('all');
  const [showInactive, setShowInactive] = useState(false);

  const [scanSearch, setScanSearch] = useState('');
  const [scanContext, setScanContext] = useState<string>('all');
  const [scanResult, setScanResult] = useState<string>('all');
  const [scanDevice, setScanDevice] = useState<string>('all');

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);
  const [printQueueOpen, setPrintQueueOpen] = useState(false);

  // Labels are keyed on when they were generated, scans on when they happened.
  const periodBarcodes = useMemo(() => barcodes.filter((b) => isDateInPeriod(b.generatedAt, period)), [period]);
  const periodScans = useMemo(() => scanLog.filter((s) => isDateInPeriod(s.timestamp, period)), [period]);

  const tabCounts = useMemo(() => ({
    catalog: periodBarcodes.filter((b) => showInactive || b.active).length,
    jobs:    printJobs.length,
    scans:   periodScans.length,
    devices: devices.length,
  }), [showInactive, periodBarcodes, periodScans]);

  const filteredCatalog = useMemo(() => {
    return periodBarcodes.filter((b) => {
      if (!showInactive && !b.active) return false;
      if (catalogType !== 'all' && b.type !== catalogType) return false;
      if (catalogFormat !== 'all' && b.format !== catalogFormat) return false;
      if (catalogSearch.trim() !== '') {
        const q = catalogSearch.trim().toLowerCase();
        const haystack = `${b.code} ${b.linkedTo.label} ${b.linkedTo.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [catalogSearch, catalogType, catalogFormat, showInactive, periodBarcodes]);

  const filteredScans = useMemo(() => {
    return periodScans.filter((s) => {
      if (scanContext !== 'all' && s.context !== scanContext) return false;
      if (scanResult !== 'all' && s.result !== scanResult) return false;
      if (scanDevice !== 'all' && s.device !== scanDevice) return false;
      if (scanSearch.trim() !== '') {
        const q = scanSearch.trim().toLowerCase();
        const haystack = `${s.barcodeScanned} ${s.resolvedTo} ${s.user} ${s.contextRef ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [scanSearch, scanContext, scanResult, scanDevice, periodScans]);

  const successCount = periodScans.filter((s) => s.result === 'Success').length;
  const successRate = periodScans.length === 0 ? '0.0' : ((successCount / periodScans.length) * 100).toFixed(1);

  const queuedJobsCount = printJobs.filter((j) => j.status === 'Queued' || j.status === 'Printing').length;

  const canPrint = usePermission('print_barcode_labels');
  const canConfigure = usePermission('configure_barcode_formats');

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Barcodes & RFID</h1>
          <p className={styles.pageSubtitle}>Generate, print, and track scannable codes across the warehouse</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          {canPrint && (
            <Button variant="secondary" size="sm" leftIcon={Printer} onClick={() => setPrintQueueOpen(true)}>
              Print queue
              {queuedJobsCount > 0 && <span className={styles.queueBadge}>{queuedJobsCount}</span>}
            </Button>
          )}
          {canPrint && (
            <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setBatchModalOpen(true)}>
              Generate codes
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {barcodeKpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={ICON_MAP[k.iconName]} trend={k.trend} comparison={k.comparison} />
        ))}
      </div>

      <div className={styles.layoutGrid}>
        <div className={styles.tabsWrap}>
          <Tabs
            tabs={[
              { key: 'catalog', label: 'Codes catalog', count: tabCounts.catalog },
              { key: 'jobs',    label: 'Print jobs',    count: tabCounts.jobs },
              { key: 'scans',   label: 'Scan log',      count: tabCounts.scans },
              { key: 'devices', label: 'Devices',       count: tabCounts.devices },
            ]}
            activeTab={activeTab}
            onChange={(k) => setActiveTab(k as BCTab)}
          />

          {activeTab === 'catalog' && (
            <>
              <div className={styles.filterBar}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="text"
                    className={styles.search}
                    placeholder="Search by code, linked label, or SKU..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    aria-label="Search catalog"
                  />
                </div>
                <select className={styles.select} value={catalogType} onChange={(e) => setCatalogType(e.target.value as 'all' | LabelType)} aria-label="Type">
                  <option value="all">All types</option>
                  <option value="Item">Item</option>
                  <option value="Bin">Bin</option>
                  <option value="Location">Location</option>
                  <option value="Pallet">Pallet</option>
                  <option value="Shipment">Shipment</option>
                </select>
                <select className={styles.select} value={catalogFormat} onChange={(e) => setCatalogFormat(e.target.value as 'all' | BarcodeFormat)} aria-label="Format">
                  <option value="all">All formats</option>
                  <option value="CODE128">CODE128</option>
                  <option value="QR">QR</option>
                  <option value="EAN13">EAN13</option>
                  <option value="CODE39">CODE39</option>
                </select>
                <label className={styles.toggleLabel}>
                  <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                  <span>Show inactive</span>
                </label>
              </div>

              <div className={styles.codeGrid}>
                {filteredCatalog.length === 0 ? (
                  <div className={styles.empty}>No codes match your filters.</div>
                ) : filteredCatalog.map((b) => <CodeCard key={b.id} record={b} />)}
              </div>
            </>
          )}

          {activeTab === 'jobs' && (
            <div className={styles.tableCard}>
              <div className={styles.tableScroll}>
                <table className={styles.table} aria-label="Print jobs">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Type</th>
                      <th className={styles.alignRight}>Codes</th>
                      <th>Format</th>
                      <th>Initiated by</th>
                      <th>Initiated at</th>
                      <th>Printer</th>
                      <th>Status</th>
                      <th className={styles.actionsCell}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {printJobs.map((j) => (
                      <tr key={j.id} className={styles.row} onClick={() => setPreviewJob(j)}>
                        <td className={styles.id}>{j.id}</td>
                        <td>{j.type}</td>
                        <td className={`${styles.alignRight} ${styles.bold}`}>{j.codeCount}</td>
                        <td className={styles.mono}>{j.format}</td>
                        <td className={styles.byCell}>{j.initiatedBy}</td>
                        <td className={styles.timeCell}>{j.initiatedAt}</td>
                        <td>{j.printer}</td>
                        <td><span className={`${styles.statusChip} ${styles[`pj_${j.status}`]}`}>{j.status}</span></td>
                        <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                          <button className={styles.iconBtn} aria-label={`Open ${j.id}`} onClick={() => setPreviewJob(j)}>→</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'scans' && (
            <>
              <div className={styles.statsStrip}>
                <strong>{periodScans.length}</strong> scans
                <span className={styles.dot}>·</span>
                <strong>{successRate}%</strong> success rate
                <span className={styles.dot}>·</span>
                Avg scan time: <strong>1.2s</strong>
              </div>

              <div className={styles.filterBar}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="text"
                    className={styles.search}
                    placeholder="Search code, item, user, reference..."
                    value={scanSearch}
                    onChange={(e) => setScanSearch(e.target.value)}
                    aria-label="Search scans"
                  />
                </div>
                <select className={styles.select} value={scanContext} onChange={(e) => setScanContext(e.target.value)} aria-label="Context">
                  <option value="all">All contexts</option>
                  <option value="Receiving">Receiving</option>
                  <option value="Putaway">Putaway</option>
                  <option value="Picking">Picking</option>
                  <option value="Packing">Packing</option>
                  <option value="Cycle count">Cycle count</option>
                  <option value="Dispatch">Dispatch</option>
                  <option value="Movement">Movement</option>
                </select>
                <select className={styles.select} value={scanResult} onChange={(e) => setScanResult(e.target.value)} aria-label="Result">
                  <option value="all">All results</option>
                  <option value="Success">Success</option>
                  <option value="Not found">Not found</option>
                  <option value="Mismatch">Mismatch</option>
                  <option value="Duplicate">Duplicate</option>
                </select>
                <select className={styles.select} value={scanDevice} onChange={(e) => setScanDevice(e.target.value)} aria-label="Device">
                  <option value="all">All devices</option>
                  <option value="Handheld scanner">Handheld scanner</option>
                  <option value="Mobile phone">Mobile phone</option>
                  <option value="Fixed RFID reader">Fixed RFID reader</option>
                </select>
              </div>

              <div className={styles.tableCard}>
                <div className={styles.tableScroll}>
                  <table className={styles.table} aria-label="Scan log">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Device</th>
                        <th>Context</th>
                        <th>Code scanned</th>
                        <th>Resolved to</th>
                        <th>Result</th>
                        <th>Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScans.length === 0 ? (
                        <tr><td colSpan={8} className={styles.emptyRow}>No scans match your filters.</td></tr>
                      ) : filteredScans.map((s) => <ScanRow key={s.id} entry={s} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'devices' && (
            <>
              {canConfigure && (
                <div className={styles.devicesHeader}>
                  <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setPairModalOpen(true)}>
                    Pair new device
                  </Button>
                </div>
              )}
              <div className={styles.deviceGrid}>
                {devices.map((d) => <DeviceCard key={d.id} device={d} icon={DEVICE_ICON[d.type]} />)}
              </div>
            </>
          )}
        </div>

        <QuickGeneratorCard />
      </div>

      <BatchGenerationModal isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} />
      <PrintQueueModal isOpen={printQueueOpen} onClose={() => setPrintQueueOpen(false)} jobs={printJobs} />
      <LabelPreviewModal isOpen={previewJob !== null} onClose={() => setPreviewJob(null)} job={previewJob} />
      <DevicePairingModal isOpen={pairModalOpen} onClose={() => setPairModalOpen(false)} />
    </ModuleLayout>
  );
}

function CodeCard({ record }: { record: BarcodeRecord }) {
  const { addToast } = useToast();
  const canPrint = usePermission('print_barcode_labels');
  return (
    <div className={styles.codeCard}>
      <div className={styles.codeCardHeader}>
        <span className={styles.codeTypeChip}>{record.type}</span>
        <span className={styles.codeFormatChip}>{record.format}</span>
      </div>
      <div className={styles.codePreview}>
        <BarcodeRenderer value={record.code} format={record.format} width={180} height={record.format === 'QR' ? 140 : 70} showCaption={false} />
      </div>
      <div className={styles.codeBody}>
        <div className={styles.codeName} title={record.linkedTo.label}>{record.linkedTo.label}</div>
        <div className={styles.codeValue}>{record.code}</div>
        <div className={styles.codeFooter}>
          <span>{record.printedCount.toLocaleString()} printed</span>
          {record.lastPrintedAt && <span> · last {record.lastPrintedAt}</span>}
        </div>
      </div>
      {canPrint && (
        <div className={styles.codeActions}>
          <button className={styles.codeActionBtn} onClick={() => { console.log('print', record.id); addToast({ type: 'success', message: `Sent ${record.code} to printer` }); }}>Print</button>
          <button className={styles.codeActionBtn} onClick={() => { console.log('reprint', record.id); addToast({ type: 'info', message: `Reprint queued for ${record.code}` }); }}>Reprint</button>
          <button className={styles.codeActionBtn} onClick={() => { console.log('edit', record.id); addToast({ message: `Edit dialog opened for ${record.code}` }); }}>Edit</button>
        </div>
      )}
    </div>
  );
}

function ScanRow({ entry }: { entry: ScanLogEntry }) {
  const cls =
    entry.result === 'Success' ? styles.resultSuccess
    : entry.result === 'Not found' ? styles.resultNotFound
    : entry.result === 'Mismatch' ? styles.resultMismatch
    : styles.resultDuplicate;
  return (
    <tr className={styles.scanRow}>
      <td className={styles.timeCell}>{entry.timestamp}</td>
      <td className={styles.byCell}>{entry.user}</td>
      <td className={styles.byCell}>{entry.device}</td>
      <td><span className={styles.contextChip}>{entry.context}</span></td>
      <td className={styles.mono}>{entry.barcodeScanned}</td>
      <td>{entry.resolvedTo}</td>
      <td><span className={`${styles.resultChip} ${cls}`}>{entry.result}</span></td>
      <td className={styles.mono}>{entry.contextRef ?? '—'}</td>
    </tr>
  );
}

function DeviceCard({ device, icon: Icon }: { device: ScanDeviceRecord; icon: LucideIcon }) {
  const { addToast } = useToast();
  const canConfigure = usePermission('configure_barcode_formats');
  const statusClass =
    device.status === 'Connected' ? styles.devConnected
    : device.status === 'Idle' ? styles.devIdle
    : styles.devOffline;
  return (
    <div className={styles.deviceCard}>
      <div className={styles.deviceIcon}><Icon size={20} /></div>
      <div className={styles.deviceBody}>
        <div className={styles.deviceHeader}>
          <span className={styles.deviceName}>{device.name}</span>
          <span className={`${styles.devStatusChip} ${statusClass}`}>{device.status}</span>
        </div>
        <div className={styles.deviceMeta}>
          <span>{device.lastSeen}</span>
          <span className={styles.dot}>·</span>
          <span>Assigned to <strong>{device.assignedTo}</strong></span>
        </div>
        <div className={styles.deviceMeta}>
          <span>{device.defaultZone}</span>
        </div>
        <div className={styles.deviceStats}>
          <span><strong>{device.scansToday}</strong> scans today</span>
          {device.battery !== undefined && (
            <span className={device.battery < 20 ? styles.batteryLow : ''}>
              <strong>{device.battery}%</strong> battery
            </span>
          )}
        </div>
      </div>
      {canConfigure && (
        <div className={styles.deviceActions}>
          <button className={styles.codeActionBtn} onClick={() => { console.log('reassign', device.id); addToast({ message: `Reassign dialog opened for ${device.name}` }); }}>Reassign</button>
          <button className={styles.codeActionBtn} onClick={() => { console.log('view activity', device.id); addToast({ message: `Activity log opened for ${device.name}` }); }}>Activity</button>
        </div>
      )}
    </div>
  );
}
