import { useMemo, useState } from 'react';
import {
  Warehouse,
  Upload,
  Download,
  Plus,
  Boxes,
  IndianRupee,
  AlertTriangle,
  TrendingDown,
  ArrowRightLeft,
  Edit3,
  Printer,
  History,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { warehouseNav } from '@/config/warehouseNav';
import { KpiCard } from './components/KpiCard/KpiCard';
import { InventoryFilters, DEFAULT_FILTERS, type InventoryFilterState } from './components/InventoryFilters/InventoryFilters';
import { ItemDetailModal } from './components/ItemDetailModal/ItemDetailModal';
import { AddItemModal } from './components/AddItemModal';
import { BulkImportModal } from './components/BulkImportModal/BulkImportModal';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { ActionMenu } from '@/components/common/ActionMenu';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { useToast } from '@/components/common/Toast/ToastContext';
import { inventoryItems as initialItems, inventoryWarehouses } from './mockData/inventoryData';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import type { InventoryItem, ItemCategory, StockStatus } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import { usePermission } from '@/hooks/usePermission';
import styles from './Inventory.module.css';

import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/utils/fileExport';
import { logMovement, queuePrint } from './warehouseStore';
const PAGE_SIZE = 10;

const CATEGORIES: ItemCategory[] = ['Finished Seeds', 'Raw Material', 'Packaging', 'Chemicals', 'Lab Supplies', 'Equipment'];
const STATUSES: StockStatus[] = ['Available', 'Quarantine', 'Reserved', 'Damaged', 'Sold'];
const TAB_KEYS = ['all', 'Available', 'Quarantine', 'Reserved', 'Damaged', 'low'] as const;
type TabKey = typeof TAB_KEYS[number];

function getStockHealth(item: InventoryItem): 'out' | 'low' | 'healthy' | 'excess' {
  if (item.quantity === 0) return 'out';
  if (item.quantity <= item.reorderPoint) return 'low';
  if (item.quantity > item.reorderPoint * 4) return 'excess';
  return 'healthy';
}

function daysToExpiry(expiryDate: string): number {
  const t = Date.parse(expiryDate);
  if (Number.isNaN(t)) return Infinity;
  return Math.round((t - Date.now()) / (1000 * 60 * 60 * 24));
}

function statusClass(s: StockStatus): string {
  switch (s) {
    case 'Available':  return styles.stAvailable;
    case 'Quarantine': return styles.stQuarantine;
    case 'Reserved':   return styles.stReserved;
    case 'Damaged':    return styles.stDamaged;
    case 'Sold':       return styles.stSold;
  }
}

export default function Inventory() {
  const [filters, setFilters] = useState<InventoryFilterState>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodValue>('all');

  const { items: allItems, add, bulkUpdate, update } = useRealtimeMockStore(initialItems, 'warehouse.items');
  const navigate = useNavigate();
  const exportItems = (rows: InventoryItem[], label: string) => {
    downloadCsv(`inventory_${label}_${new Date().toISOString().slice(0, 10)}.csv`, rows.map((i) => ({
      sku: i.sku, name: i.name, category: i.category, variety: i.variety ?? '', batch: i.batchNumber, lot: i.lotNumber,
      quantity: i.quantity, uom: i.uom, warehouse: i.location.warehouse, zone: i.location.zone, bin: `${i.location.rack}-${i.location.shelf}-${i.location.bin}`,
      status: i.status, expiry: i.expiryDate, received: i.receivedDate, unitCost: i.unitCost, totalValue: i.totalValue, abc: i.abcClass, supplier: i.supplier ?? '',
    })));
  };

  // Everything below — tab counts, the table and the KPI row — reads from the
  // period-filtered set, so the numbers always describe the same slice of time
  // the header is showing.
  const inventoryItems = useMemo(
    () => allItems.filter((it) => isDateInPeriod(it.receivedDate, period)),
    [allItems, period]
  );
  const { addToast } = useToast();

  const canUpdateInventory = usePermission('update_inventory');
  const canPrintBarcode = usePermission('print_barcode_labels');
  const canLogMovement = usePermission('log_stock_movement');
  const canProposeAdjustment = usePermission('propose_stock_adjustment');

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, Available: 0, Quarantine: 0, Reserved: 0, Damaged: 0, low: 0 };
    counts.all = inventoryItems.length;
    for (const it of inventoryItems) {
      if (it.status === 'Available')  counts.Available++;
      if (it.status === 'Quarantine') counts.Quarantine++;
      if (it.status === 'Reserved')   counts.Reserved++;
      if (it.status === 'Damaged')    counts.Damaged++;
      const h = getStockHealth(it);
      if (h === 'low' || h === 'out') counts.low++;
    }
    return counts;
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((it) => {
      if (activeTab === 'low') {
        const h = getStockHealth(it);
        if (h !== 'low' && h !== 'out') return false;
      } else if (activeTab !== 'all') {
        if (it.status !== activeTab) return false;
      }
      if (filters.warehouse !== 'all' && it.location.warehouse !== filters.warehouse) return false;
      if (filters.category !== 'all' && it.category !== filters.category) return false;
      if (filters.status !== 'all' && it.status !== filters.status) return false;
      if (filters.abcClass !== 'all' && it.abcClass !== filters.abcClass) return false;
      if (filters.stockLevel !== 'all') {
        const h = getStockHealth(it);
        if (h !== filters.stockLevel) return false;
      }
      if (filters.search.trim() !== '') {
        const q = filters.search.trim().toLowerCase();
        const haystack = `${it.sku} ${it.name} ${it.batchNumber} ${it.lotNumber}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [inventoryItems, filters, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE);

  const kpis = useMemo(() => {
    const totalValue = inventoryItems.reduce((s, it) => s + it.totalValue, 0);
    const lowStock = inventoryItems.filter((it) => {
      const h = getStockHealth(it);
      return h === 'low' || h === 'out';
    }).length;
    const expiring = inventoryItems.filter((it) => {
      const d = daysToExpiry(it.expiryDate);
      return d >= 0 && d <= 30;
    }).length;
    return {
      totalSkus: inventoryItems.length,
      totalValue,
      lowStock,
      expiring,
    };
  }, [inventoryItems]);

  const togglePageSelection = () => {
    const ids = pageItems.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      ids.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...ids]));
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleFilterChange = (next: InventoryFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    setPage(1);
  };

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((it) => selectedIds.has(it.id));

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={warehouseNav}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Inventory</h1>
          <p className={styles.pageSubtitle}>Track every item across warehouses, batches, and lots</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={(v) => { setPeriod(v); setPage(1); }} />
          {canUpdateInventory && <Button variant="secondary" size="sm" leftIcon={Upload} onClick={() => setIsImportOpen(true)}>Import</Button>}
          <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => { exportItems(inventoryItems, 'all'); addToast({ type: 'success', message: `Exported ${inventoryItems.length} items to CSV` }) }}>Export</Button>
          {canUpdateInventory && <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsAddModalOpen(true)}>Add item</Button>}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.kpiGrid}>
        <KpiCard
          label="Total SKUs"
          value={formatIndianNumber(kpis.totalSkus)}
          icon={Boxes}
          trend={{ direction: 'up', percentage: '3.2%', isPositive: true }}
          comparison="38 new this month"
        />
        <KpiCard
          label="Total inventory value"
          value={formatRupees(kpis.totalValue).replace('.00', '')}
          icon={IndianRupee}
          trend={{ direction: 'up', percentage: '8.4%', isPositive: true }}
          comparison="vs last month"
        />
        <KpiCard
          label="Low stock alerts"
          value={String(kpis.lowStock)}
          icon={AlertTriangle}
          trend={{ direction: 'up', percentage: '2', isPositive: false }}
          comparison="requires reorder"
        />
        <KpiCard
          label="Expiring in 30 days"
          value={String(kpis.expiring)}
          icon={TrendingDown}
          trend={{ direction: 'down', percentage: '1', isPositive: true }}
          comparison="prioritize dispatch"
        />
      </div>

      <Tabs
        tabs={[
          { key: 'all',         label: 'All',         count: tabCounts.all },
          { key: 'Available',   label: 'Available',   count: tabCounts.Available },
          { key: 'Quarantine',  label: 'Quarantine',  count: tabCounts.Quarantine },
          { key: 'Reserved',    label: 'Reserved',    count: tabCounts.Reserved },
          { key: 'Damaged',     label: 'Damaged',     count: tabCounts.Damaged },
          { key: 'low',         label: 'Low stock',   count: tabCounts.low },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <InventoryFilters
        value={filters}
        onChange={handleFilterChange}
        warehouses={inventoryWarehouses}
        categories={CATEGORIES}
        statuses={STATUSES}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            ...(canLogMovement ? [{ label: 'Transfer', icon: ArrowRightLeft, onClick: () => { addToast({ type: 'info', message: `Record the transfer for ${selectedIds.size} item(s) on Stock Movements` }); setSelectedIds(new Set()); navigate('/warehouse/movements'); } }] : []),
            ...(canProposeAdjustment ? [{ label: 'Adjust', icon: Edit3, onClick: () => { setSelectedIds(new Set()); navigate('/warehouse/adjustments'); } }] : []),
            { label: 'Export', icon: Download, onClick: () => { exportItems(allItems.filter((i) => selectedIds.has(i.id)), 'selected'); addToast({ type: 'success', message: `Exported ${selectedIds.size} selected items` }); setSelectedIds(new Set()); } },
            ...(canUpdateInventory ? [{ label: 'Update Status', icon: AlertTriangle, variant: 'secondary' as const, onClick: () => { bulkUpdate(Array.from(selectedIds), { status: 'Quarantine' }); setSelectedIds(new Set()); addToast({ type: 'success', message: 'Status updated to Quarantine' }); } }] : []),
          ]}
        />
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="Inventory items">
            <thead>
              <tr>
                <th className={styles.checkCell}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePageSelection}
                    aria-label="Select all on page"
                  />
                </th>
                <th>SKU / item</th>
                <th>Category</th>
                <th>Batch / lot</th>
                <th className={styles.alignRight}>Quantity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>ABC</th>
                <th className={styles.alignRight}>Value</th>
                <th className={styles.actionsCell}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it) => {
                const health = getStockHealth(it);
                const dte = daysToExpiry(it.expiryDate);
                const expiryClass = dte < 0 ? styles.expiryExpired : dte < 30 ? styles.expiryWarn : '';
                const selected = selectedIds.has(it.id);
                return (
                  <tr
                    key={it.id}
                    className={`${styles.row} ${styles[`health_${health}`]} ${selected ? styles.rowSelected : ''}`}
                    onClick={() => setDetailItem(it)}
                  >
                    <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(it.id)}
                        aria-label={`Select ${it.name}`}
                      />
                    </td>
                    <td className={styles.itemCell}>
                      <div className={styles.itemName} title={it.name}>{it.name}</div>
                      <div className={styles.itemSku}>{it.sku}</div>
                    </td>
                    <td><span className={styles.categoryChip}>{it.category}</span></td>
                    <td className={styles.mono}>
                      <div>{it.batchNumber}</div>
                      <div className={styles.subText}>{it.lotNumber}</div>
                    </td>
                    <td className={styles.alignRight}>
                      <div className={styles.qtyValue}>{formatIndianNumber(it.quantity)} {it.uom}</div>
                      {health === 'low' && <span className={`${styles.flag} ${styles.flagLow}`}>Low</span>}
                      {health === 'out' && <span className={`${styles.flag} ${styles.flagOut}`}>Out</span>}
                      {health === 'excess' && <span className={`${styles.flag} ${styles.flagExcess}`}>Excess</span>}
                    </td>
                    <td>
                      <div className={styles.locZone}>{it.location.zone}</div>
                      <div className={styles.subText}>{it.location.rack} / {it.location.shelf} / {it.location.bin}</div>
                    </td>
                    <td><span className={`${styles.statusChip} ${statusClass(it.status)}`}>{it.status}</span></td>
                    <td className={expiryClass}>{it.expiryDate}</td>
                    <td><span className={`${styles.abcChip} ${styles[`abc_${it.abcClass}`]}`}>{it.abcClass}</span></td>
                    <td className={`${styles.alignRight} ${styles.valueCell}`}>{formatRupees(it.totalValue)}</td>
                    <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const items = [
                          { label: 'View Timeline', icon: History, onClick: () => { setDetailItem(it) } },
                          ...(canUpdateInventory ? [{ label: 'Update Stock', icon: Edit3, onClick: () => {
                            const v = window.prompt(`New quantity for ${it.name} (${it.uom}). Current: ${it.quantity}`, String(it.quantity));
                            const qty = v === null ? NaN : Number(v);
                            if (!Number.isFinite(qty) || qty < 0) return;
                            const delta = qty - it.quantity;
                            update(it.id, { quantity: qty, totalValue: Math.round(qty * it.unitCost) });
                            if (delta !== 0) logMovement({ category: 'Adjustment', subType: delta > 0 ? 'Increase' : 'Decrease', itemName: it.name, sku: it.sku, batch: it.batchNumber, quantity: Math.abs(delta), uom: it.uom, fromLocation: `${it.location.zone}-${it.location.bin}`, reason: 'System correction', status: 'Completed', completedAt: new Date().toISOString() });
                            addToast({ type: 'success', message: `${it.sku} stock set to ${qty} ${it.uom}` });
                          } }] : []),
                          ...(canPrintBarcode ? [{ label: 'Print Label', icon: Printer, onClick: () => { queuePrint('Item', 1); addToast({ type: 'success', message: `Label for ${it.sku} queued for printing` }); } }] : []),
                        ];
                        return items.length > 0 ? <ActionMenu items={items} /> : null;
                      })()}
                    </td>
                  </tr>
                );
              })}

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={11} className={styles.emptyRow}>
                    No items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.pageStatus}>
            Showing {filteredItems.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className={styles.pageOf}>Page {safePage} of {totalPages}</span>
            <button
              className={styles.pageBtn}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <ItemDetailModal
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
        item={detailItem}
      />

      {isAddModalOpen && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(data) => {
            add(data as InventoryItem);
            addToast({ type: 'success', message: 'Item added successfully' });
          }}
        />
      )}

      <BulkImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </ModuleLayout>
  );
}
