import type { CustomEntityType } from '@/services/seedLotRealtimeClient';

/** Where a custom field can appear: record type, owning module, and what users call it. */
export const ENTITY_OPTIONS: { value: CustomEntityType; label: string; module: string }[] = [
  { value: 'seed_lot', label: 'Seed lot (shared across all modules)', module: 'All modules' },
  { value: 'supplier', label: 'Supplier', module: 'Procurement' },
  { value: 'purchase_order', label: 'Purchase order', module: 'Procurement' },
  { value: 'grn', label: 'Goods receipt (GRN)', module: 'Procurement' },
  { value: 'warehouse_item', label: 'Warehouse stock item', module: 'Warehouse' },
  { value: 'processing_batch', label: 'Processing batch', module: 'Processing' },
  { value: 'lab_submission', label: 'Lab sample submission', module: 'Laboratory' },
  { value: 'non_conformance', label: 'Non-conformance (NCR)', module: 'Quality' },
];

export const FIELD_TYPE_LABELS = { text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown', boolean: 'Yes / No' } as const;
