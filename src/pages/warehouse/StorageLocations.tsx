import { useMemo, useState } from 'react';
import {
  Warehouse,
  MapPin,
  LayoutGrid,
  PackagePlus,
  Clock,
  Plus,
  Printer,
  Search,
  Edit2,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { WarehouseLayout } from './components/WarehouseLayout/WarehouseLayout';
import { ZoneSummaryPanel } from './components/ZoneSummaryPanel/ZoneSummaryPanel';
import { BinDetailModal } from './components/BinDetailModal/BinDetailModal';
import { SlottingRecommendationsList } from './components/SlottingRecommendationsList/SlottingRecommendationsList';
import { CapacityTrendChart } from './components/CapacityTrendChart/CapacityTrendChart';
import { ActionMenu } from '@/components/common/ActionMenu';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { LocationModal } from './components/LocationModal';
import { PrintLabelsModal } from './components/PrintLabelsModal/PrintLabelsModal';
import { AddLocationModal } from './components/AddLocationModal/AddLocationModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  storageKpis,
  zonesLayout,
  bins as initialBins,
  slottingRecommendations,
  capacityTrendData,
  trackedZones,
  buildBinCode,
  type StorageKpiIcon,
} from './mockData/storageData';
import type { StorageLocation } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './StorageLocations.module.css';

const ICON_MAP: Record<StorageKpiIcon, LucideIcon> = { MapPin, LayoutGrid, PackagePlus, Clock };

type StorageTab = 'bins' | 'slotting' | 'capacity';

const PAGE_SIZE = 10;

import { usePermission } from '@/hooks/usePermission';

export default function StorageLocations() {
  const [warehouse, setWarehouse] = useState('Telangana Main');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StorageTab>('bins');
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [binStatusFilter, setBinStatusFilter] = useState<string>('all');
  const [abcFilter, setAbcFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailBin, setDetailBin] = useState<StorageLocation | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPrintLabelsOpen, setIsPrintLabelsOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const { items: bins, add, update, bulkUpdate } = useRealtimeMockStore(initialBins);
  const { addToast } = useToast();

  const canPrintLabels = usePermission('print_barcode_labels');
  const canDefineZones = usePermission('define_storage_zones');

  const selectedZoneData = useMemo(
    () => zonesLayout.find((z) => z.zone === selectedZone) ?? null,
    [selectedZone],
  );

  const filteredBins = useMemo(() => {
    return bins.filter((b) => {
      if (zoneFilter !== 'all' && b.zone !== zoneFilter) return false;
      if (binStatusFilter !== 'all' && b.status !== binStatusFilter) return false;
      if (abcFilter !== 'all' && b.abcZone !== abcFilter) return false;
      if (search.trim() !== '') {
        const q = search.trim().toLowerCase();
        const code = buildBinCode(b.zone, b.rack, b.shelf, b.bin).toLowerCase();
        const haystack = `${code} ${b.zone} ${b.currentItem ?? ''} ${b.currentSku ?? ''} ${b.currentBatch ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [bins, search, zoneFilter, binStatusFilter, abcFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBins.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageBins = filteredBins.slice(pageStart, pageStart + PAGE_SIZE);

  const allZoneNames = Array.from(new Set(bins.map((b) => b.zone)));

  const handleViewBins = (zone: string) => {
    setActiveTab('bins');
    setZoneFilter(zone);
    setPage(1);
  };

  const setFilter = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === pageBins.length && pageBins.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageBins.map(b => b.id)));
    }
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Storage & locations</h1>
          <p className={styles.pageSubtitle}>Warehouse layout, zones, and bin-level occupancy ({warehouse})</p>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.warehouseSelect}
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            aria-label="Warehouse"
          >
            <option value="Telangana Main">Telangana Main</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="all">All warehouses</option>
          </select>
          {canPrintLabels && <Button variant="secondary" size="sm" leftIcon={Printer} onClick={() => setIsPrintLabelsOpen(true)}>Print labels</Button>}
          {canDefineZones && <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsAddLocationOpen(true)}>Add location</Button>}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        {storageKpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={ICON_MAP[kpi.iconName]}
            trend={kpi.trend}
            comparison={kpi.comparison}
          />
        ))}
      </div>

      <div className={styles.layoutGrid}>
        <WarehouseLayout
          zones={zonesLayout}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
        />
        <ZoneSummaryPanel zone={selectedZoneData} onViewBins={handleViewBins} />
      </div>

      <Tabs
        tabs={[
          { key: 'bins',     label: 'Bins overview',           count: bins.length },
          { key: 'slotting', label: 'Slotting recommendations', count: slottingRecommendations.length },
          { key: 'capacity', label: 'Capacity trends' },
        ]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as StorageTab)}
      />

      {activeTab === 'bins' && (
        <>
          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              actions={[
                ...(canPrintLabels ? [{ label: 'Print Labels', icon: Printer, onClick: () => { console.log('Bulk print'); addToast({ type: 'success', message: `Printing ${selectedIds.size} labels` }); setSelectedIds(new Set()); } }] : []),
                ...(canDefineZones ? [{ label: 'Deactivate', icon: Ban, variant: 'danger' as const, onClick: () => { bulkUpdate(Array.from(selectedIds), { status: 'Blocked' }); setSelectedIds(new Set()); addToast({ type: 'success', message: 'Locations blocked' }); } }] : []),
              ]}
            />
          )}
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.search}
                placeholder="Search bin code, zone, SKU, batch..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search bins"
              />
            </div>
            <select className={styles.select} value={zoneFilter} onChange={(e) => setFilter(setZoneFilter)(e.target.value)} aria-label="Zone">
              <option value="all">All zones</option>
              {allZoneNames.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className={styles.select} value={binStatusFilter} onChange={(e) => setFilter(setBinStatusFilter)(e.target.value)} aria-label="Status">
              <option value="all">All statuses</option>
              <option value="Available">Available</option>
              <option value="Full">Full</option>
              <option value="Reserved">Reserved</option>
              <option value="Blocked">Blocked</option>
            </select>
            <select className={styles.select} value={abcFilter} onChange={(e) => setFilter(setAbcFilter)(e.target.value)} aria-label="ABC class">
              <option value="all">All ABC</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-label="Storage bins">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input 
                        type="checkbox" 
                        checked={pageBins.length > 0 && selectedIds.size === pageBins.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Bin code</th>
                    <th>Zone</th>
                    <th>Rack / shelf / bin</th>
                    <th className={styles.alignRight}>Capacity</th>
                    <th>Occupied</th>
                    <th>Status</th>
                    <th>Current SKU</th>
                    <th>Batch</th>
                    <th>Expiry</th>
                    <th>ABC</th>
                    <th className={styles.actionsCell}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageBins.length === 0 ? (
                    <tr><td colSpan={12} className={styles.emptyRow}>No bins match your filters.</td></tr>
                  ) : pageBins.map((b) => {
                    const code = buildBinCode(b.zone, b.rack, b.shelf, b.bin);
                    return (
                      <tr key={b.id} className={styles.row} onClick={() => setDetailBin(b)}>
                        <td onClick={(e) => e.stopPropagation()}>
                           <input 
                            type="checkbox" 
                            checked={selectedIds.has(b.id)}
                            onChange={() => toggleSelection(b.id)}
                          />
                        </td>
                        <td className={styles.binCode}>{code}</td>
                        <td>{b.zone}</td>
                        <td className={styles.mono}>{b.rack} / {b.shelf} / {b.bin}</td>
                        <td className={styles.alignRight}>{formatIndianNumber(b.capacity)}</td>
                        <td>
                          <div className={styles.occupiedCell}>
                            <span className={styles.occupiedLabel}>{formatIndianNumber(b.occupied)} · {b.occupancyPct}%</span>
                            <div className={styles.miniBarTrack}>
                              <div
                                className={`${styles.miniBarFill} ${b.occupancyPct >= 90 ? styles.fillCritical : b.occupancyPct >= 75 ? styles.fillHigh : styles.fillNormal}`}
                                style={{ width: `${b.occupancyPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td><span className={`${styles.statusChip} ${styles[`st_${b.status}`]}`}>{b.status}</span></td>
                        <td className={styles.mono}>{b.currentSku ?? '—'}</td>
                        <td className={styles.mono}>{b.currentBatch ?? '—'}</td>
                        <td>{b.expiryDate ?? '—'}</td>
                        <td>{b.abcZone ? <span className={`${styles.abcChip} ${styles[`abc_${b.abcZone}`]}`}>{b.abcZone}</span> : '—'}</td>
                        <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                          {(() => {
                            const items = [
                              { label: 'View details', icon: MapPin, onClick: () => setDetailBin(b) },
                              ...(canDefineZones ? [{ label: 'Edit', icon: Edit2, onClick: () => { console.log('Edit', b.id); addToast({ message: 'Edit bin clicked' }) } }] : []),
                              ...(canPrintLabels ? [{ label: 'Print label', icon: Printer, onClick: () => addToast({ type: 'success', message: 'Label queued for printing' }) }] : []),
                              ...(canDefineZones ? [{ label: b.status === 'Blocked' ? 'Activate' : 'Deactivate', icon: Ban, variant: 'danger' as const, onClick: () => update(b.id, { status: b.status === 'Blocked' ? 'Available' : 'Blocked' }) }] : []),
                            ];
                            return items.length > 0 ? <ActionMenu items={items} /> : null;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span className={styles.pageStatus}>
                Showing {filteredBins.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredBins.length)} of {filteredBins.length}
              </span>
              <div className={styles.pageControls}>
                <button className={styles.pageBtn} disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Previous</button>
                <span className={styles.pageOf}>Page {safePage} of {totalPages}</span>
                <button className={styles.pageBtn} disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'slotting' && (
        <SlottingRecommendationsList data={slottingRecommendations} />
      )}

      {activeTab === 'capacity' && (
        <CapacityTrendChart data={capacityTrendData} zones={trackedZones} />
      )}

      <BinDetailModal
        isOpen={detailBin !== null}
        onClose={() => setDetailBin(null)}
        bin={detailBin}
      />
      
      {isLocationModalOpen && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSave={(data) => {
            add(data);
            addToast({ type: 'success', message: 'Storage location added' });
          }}
        />
      )}

      <PrintLabelsModal isOpen={isPrintLabelsOpen} onClose={() => setIsPrintLabelsOpen(false)} />
      <AddLocationModal isOpen={isAddLocationOpen} onClose={() => setIsAddLocationOpen(false)} />
    </ModuleLayout>
  );
}
