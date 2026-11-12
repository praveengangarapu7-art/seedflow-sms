import { readCollection, setCollection, usePersistentCollection } from '@/hooks/persistentCollections';
import type {
  ASN, CycleCount, DispatchOrder, InventoryItem, IoTSensor, MovementRecord, PrintJob, PutawayTask, ReturnRecord,
  ScanDeviceRecord, StockAdjustment, StorageLocation, WarehouseConfig, BarcodeRecord,
} from '@/types/warehouse';
import { inventoryItems } from './mockData/inventoryData';
import { dispatchOrders } from './mockData/outboundData';
import { asnList, putawayTasks } from './mockData/inboundData';
import { adjustments } from './mockData/adjustmentsData';
import { movementRecords } from './mockData/movementsData';
import { cycleCounts } from './mockData/cycleCountData';
import { returnRecords } from './mockData/returnsData';
import { bins } from './mockData/storageData';
import { warehouses } from './mockData/settingsData';
import { printJobs, barcodes, devices } from './mockData/barcodeData';
import { sensors, iotAlerts } from './mockData/iotData';

/**
 * Warehouse data saved to the SeedSphere database (module_records). The
 * collection names match the ones the Warehouse pages pass to
 * useRealtimeMockStore, so a modal that writes here updates every page.
 */
export const WH = {
  items: { name: 'warehouse.items', starter: inventoryItems as InventoryItem[] },
  dispatch: { name: 'warehouse.dispatch_orders', starter: dispatchOrders as DispatchOrder[] },
  asn: { name: 'warehouse.asn_list', starter: asnList as ASN[] },
  putaway: { name: 'warehouse.putaway_tasks', starter: putawayTasks as PutawayTask[] },
  adjustments: { name: 'warehouse.adjustments', starter: adjustments as StockAdjustment[] },
  movements: { name: 'warehouse.movement_records', starter: movementRecords as MovementRecord[] },
  counts: { name: 'warehouse.cycle_counts', starter: cycleCounts as CycleCount[] },
  returns: { name: 'warehouse.return_records', starter: returnRecords as ReturnRecord[] },
  bins: { name: 'warehouse.bins', starter: bins as StorageLocation[] },
  warehouses: { name: 'warehouse.warehouses', starter: warehouses as WarehouseConfig[] },
  printJobs: { name: 'warehouse.print_jobs', starter: printJobs as PrintJob[] },
  barcodes: { name: 'warehouse.barcodes', starter: barcodes as BarcodeRecord[] },
  devices: { name: 'warehouse.devices', starter: devices as ScanDeviceRecord[] },
  sensors: { name: 'warehouse.sensors', starter: sensors as IoTSensor[] },
  iotAlerts: { name: 'warehouse.iot_alerts', starter: iotAlerts as (typeof iotAlerts)[number][] },
} as const;

type Key = keyof typeof WH;
type ItemOf<K extends Key> = (typeof WH)[K]['starter'][number];

export function useWh<K extends Key>(key: K) {
  return usePersistentCollection<ItemOf<K>>(WH[key].name, WH[key].starter as ItemOf<K>[]);
}

export function whRead<K extends Key>(key: K): ItemOf<K>[] {
  return readCollection<ItemOf<K>>(WH[key].name, WH[key].starter as ItemOf<K>[]);
}

export function whUpdate<K extends Key>(key: K, id: string, patch: Partial<ItemOf<K>> | ((item: ItemOf<K>) => ItemOf<K>)): void {
  setCollection<ItemOf<K>>(WH[key].name, WH[key].starter as ItemOf<K>[], (prev) =>
    prev.map((item) => ((item as { id: string }).id === id ? (typeof patch === 'function' ? patch(item) : { ...item, ...patch }) : item)),
  );
}

export function whAdd<K extends Key>(key: K, item: ItemOf<K>): void {
  setCollection<ItemOf<K>>(WH[key].name, WH[key].starter as ItemOf<K>[], (prev) => [item, ...prev]);
}

export function whRemove<K extends Key>(key: K, id: string): void {
  setCollection<ItemOf<K>>(WH[key].name, WH[key].starter as ItemOf<K>[], (prev) => prev.filter((i) => (i as { id: string }).id !== id));
}

export function whNextId(prefix: string, ids: string[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  ids.forEach((id) => {
    const m = id.match(/(\d+)$/);
    if (m && id.startsWith(prefix)) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

export function whUser(): string {
  try {
    const raw = localStorage.getItem('seedflow_auth');
    const u = raw ? (JSON.parse(raw) as { name?: string; email?: string }) : null;
    return u?.name || u?.email || 'Warehouse user';
  } catch {
    return 'Warehouse user';
  }
}

export const nowIso = () => new Date().toISOString();

/** Display date used by the sample data: "09 Nov 2026". */
export const whDate = (d: Date = new Date()) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** "2026-11-09" from a date input -> "09 Nov 2026"; other values unchanged. */
export const whDisplayDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? whDate(new Date(`${v}T00:00:00`)) : v);

/** Adds (or removes, with a negative qty) stock for a SKU, keeping value in step. */
export function adjustStock(sku: string, delta: number): void {
  setCollection<InventoryItem>(WH.items.name, WH.items.starter, (prev) =>
    prev.map((i) => {
      if (i.sku !== sku) return i;
      const quantity = Math.max(0, i.quantity + delta);
      return { ...i, quantity, totalValue: Math.round(quantity * i.unitCost) };
    }),
  );
}

/** Records a stock movement so it shows in Stock Movements. */
export function logMovement(m: Omit<MovementRecord, 'id' | 'initiatedBy' | 'initiatedAt'> & Partial<Pick<MovementRecord, 'initiatedBy' | 'initiatedAt'>>): MovementRecord {
  const all = whRead('movements');
  const rec: MovementRecord = { id: whNextId('MV', all.map((x) => x.id)), initiatedBy: whUser(), initiatedAt: nowIso(), ...m };
  whAdd('movements', rec);
  return rec;
}

/** Adds a label print job to the shared print queue (Barcode & RFID page). */
export function queuePrint(type: PrintJob['type'], codeCount: number, format: PrintJob['format'] = 'CODE128', printer = 'Zebra ZT230 — Dock 1'): PrintJob {
  const job: PrintJob = { id: whNextId('PJ', whRead('printJobs').map((j) => j.id)), type, codeCount, initiatedBy: whUser(), initiatedAt: nowIso(), printer, status: 'Queued', format };
  whAdd('printJobs', job);
  return job;
}
