import { readCollection, setCollection, usePersistentCollection } from '@/hooks/persistentCollections';
import type {
  ActivityLogEntry, Approval, ApprovalWorkflow, CostCenter, Department, GRN, InspectionItem, Invoice, LineItem, Priority,
  PurchaseOrder, PurchaseRequisition, RFQ, Supplier,
} from '@/types/procurement';
import { mockPOs } from './mockData/ordersData';
import { mockPRs } from './mockData/requisitionsData';
import { mockSuppliers } from './mockData/suppliersData';
import { mockRFQs } from './mockData/rfqsData';
import { mockGRNs } from './mockData/grnsData';
import { mockInvoices } from './mockData/invoicesData';
import { mockInspections } from './mockData/inspectionsData';
import { mockApprovals } from './mockData/approvalsData';
import { mockCostCenters } from './mockData/costCentersData';
import { mockWorkflows } from './mockData/settingsData';

/**
 * Procurement data, saved to the SeedSphere database (module_records) and
 * shared by every Procurement page. The sample data is only the starting
 * content the first time the module is opened.
 */

export const C = {
  pos: 'procurement.purchase_orders',
  prs: 'procurement.requisitions',
  suppliers: 'procurement.suppliers',
  rfqs: 'procurement.rfqs',
  grns: 'procurement.grns',
  invoices: 'procurement.invoices',
  inspections: 'procurement.inspections',
  approvals: 'procurement.approvals',
  costCenters: 'procurement.cost_centers',
  workflows: 'procurement.workflows',
} as const;

export const usePOs = () => usePersistentCollection<PurchaseOrder>(C.pos, mockPOs);
export const usePRs = () => usePersistentCollection<PurchaseRequisition>(C.prs, mockPRs);
export const useSuppliers = () => usePersistentCollection<Supplier>(C.suppliers, mockSuppliers);
export const useRFQs = () => usePersistentCollection<RFQ>(C.rfqs, mockRFQs);
export const useGRNs = () => usePersistentCollection<GRN>(C.grns, mockGRNs);
export const useInvoices = () => usePersistentCollection<Invoice>(C.invoices, mockInvoices);
export const useInspections = () => usePersistentCollection<InspectionItem>(C.inspections, mockInspections);
export const useApprovals = () => usePersistentCollection<Approval>(C.approvals, mockApprovals);
export const useCostCenters = () => usePersistentCollection<CostCenter>(C.costCenters, mockCostCenters);
export const useWorkflows = () => usePersistentCollection<ApprovalWorkflow>(C.workflows, mockWorkflows);

// ------------------------------------------------------------------ helpers

/** Same display format as the sample data: "09 Nov 2026". */
export function today(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "2026-11-09" (from date inputs) -> "09 Nov 2026"; anything else unchanged. */
export function displayDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function nowStamp(): string {
  const d = new Date();
  return `${today()} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}`;
}

export function currentUserName(): string {
  try {
    const raw = localStorage.getItem('seedflow_auth');
    const u = raw ? (JSON.parse(raw) as { name?: string; email?: string }) : null;
    return u?.name || u?.email || 'You';
  } catch {
    return 'You';
  }
}

/** Next id in a series such as PO-2026-0146, from the ids already in use. */
export function nextId(prefix: string, ids: string[], width = 4): string {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`);
  let max = 0;
  ids.forEach((id) => {
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[2]));
  });
  return `${prefix}-${year}-${String(max + 1).padStart(width, '0')}`;
}

export function activity(action: string, details?: string): ActivityLogEntry {
  return { time: nowStamp(), user: currentUserName(), action, ...(details ? { details } : {}) };
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function addApproval(a: Omit<Approval, 'id' | 'submittedBy' | 'submittedAt' | 'daysWaiting' | 'approvalChain'>): void {
  const user = currentUserName();
  setCollection<Approval>(C.approvals, mockApprovals, (prev) => [
    {
      ...a,
      id: `APV-${Date.now().toString(36).toUpperCase()}`,
      submittedBy: { name: user, avatar: initials(user) },
      submittedAt: 'just now',
      daysWaiting: 0,
      approvalChain: [
        { approver: user, role: 'Requester', status: 'approved', timestamp: 'just now' },
        { approver: 'You', role: 'Procurement Manager', status: 'current' },
      ],
    },
    ...prev,
  ]);
}

// ------------------------------------------------------------------ actions

export function createRequisition(data: {
  title: string; department: Department; priority: Priority; requiredBy: string; justification: string;
  lineItems: { description: string; quantity: string; unit: string; estimatedPrice: string }[];
}): PurchaseRequisition {
  const lines: LineItem[] = data.lineItems
    .filter((l) => l.description.trim())
    .map((l) => {
      const q = Number(l.quantity) || 0;
      const p = Number(l.estimatedPrice) || 0;
      return { description: l.description.trim(), quantity: q, unit: l.unit || 'units', estimatedPrice: p, total: q * p };
    });
  const prs = readCollection<PurchaseRequisition>(C.prs, mockPRs);
  const pr: PurchaseRequisition = {
    id: nextId('PR', prs.map((p) => p.id)),
    title: data.title,
    department: data.department,
    items: lines.length,
    totalValue: lines.reduce((s, l) => s + l.total, 0),
    priority: data.priority,
    status: 'Pending Approval',
    createdBy: currentUserName(),
    createdDate: today(),
    requiredBy: displayDate(data.requiredBy),
    justification: data.justification,
    lineItems: lines,
    activityLog: [activity('Requisition created and submitted for approval')],
  };
  setCollection<PurchaseRequisition>(C.prs, mockPRs, (prev) => [pr, ...prev]);
  addApproval({ type: 'PR', referenceId: pr.id, title: pr.title, department: pr.department, amount: pr.totalValue, priority: pr.priority, justification: pr.justification });
  return pr;
}

export function createPurchaseOrder(data: { prId: string; supplierId: string; paymentTerms: string; deliveryAddress: string }): PurchaseOrder {
  const prs = readCollection<PurchaseRequisition>(C.prs, mockPRs);
  const suppliers = readCollection<Supplier>(C.suppliers, mockSuppliers);
  const pos = readCollection<PurchaseOrder>(C.pos, mockPOs);
  const pr = prs.find((p) => p.id === data.prId);
  const supplier = suppliers.find((s) => s.id === data.supplierId);
  const lines = (pr?.lineItems ?? []).map((l) => ({ ...l, unitPrice: l.estimatedPrice ?? (l.quantity ? l.total / l.quantity : 0), taxPercent: 0 }));
  const delivery = new Date(Date.now() + 14 * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const po: PurchaseOrder = {
    id: nextId('PO', pos.map((p) => p.id)),
    supplier: supplier?.name ?? data.supplierId,
    prReference: pr?.id,
    totalAmount: lines.reduce((s, l) => s + l.total, 0),
    status: 'Draft',
    expectedDelivery: delivery,
    createdDate: today(),
    paymentTerms: data.paymentTerms,
    deliveryAddress: data.deliveryAddress,
    lineItems: lines,
    grns: [],
    invoices: [],
    activityLog: [activity(`Created PO${pr ? ` from ${pr.id}` : ''}`)],
  };
  setCollection<PurchaseOrder>(C.pos, mockPOs, (prev) => [po, ...prev]);
  if (pr) updateRequisition(pr.id, { status: 'Converted to PO' }, `Converted to ${po.id}`);
  return po;
}

export function updatePO(id: string, patch: Partial<PurchaseOrder>, action?: string): void {
  setCollection<PurchaseOrder>(C.pos, mockPOs, (prev) =>
    prev.map((p) => (p.id === id ? { ...p, ...patch, activityLog: action ? [...(p.activityLog ?? []), activity(action)] : p.activityLog } : p)),
  );
}

export function updateRequisition(id: string, patch: Partial<PurchaseRequisition>, action?: string): void {
  setCollection<PurchaseRequisition>(C.prs, mockPRs, (prev) =>
    prev.map((p) => (p.id === id ? { ...p, ...patch, activityLog: action ? [...(p.activityLog ?? []), activity(action)] : p.activityLog } : p)),
  );
}

export function addSupplier(s: Omit<Supplier, 'id' | 'code'> & { code?: string }): Supplier {
  const all = readCollection<Supplier>(C.suppliers, mockSuppliers);
  const n = all.length + 1;
  const supplier: Supplier = { ...s, id: `SUP-${String(n).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`, code: s.code || `SUP-${String(n).padStart(4, '0')}` };
  setCollection<Supplier>(C.suppliers, mockSuppliers, (prev) => [supplier, ...prev]);
  if (supplier.classification !== 'Registered') {
    addApproval({ type: 'Supplier', referenceId: supplier.id, title: `New supplier: ${supplier.name}`, department: 'Procurement', amount: 0, priority: 'Medium', justification: supplier.notes ?? 'Supplier onboarding' });
  }
  return supplier;
}

export function updateSupplier(id: string, patch: Partial<Supplier>): void {
  setCollection<Supplier>(C.suppliers, mockSuppliers, (prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function createRFQ(data: {
  title: string; department: string; deadline: string; expectedDelivery: string; paymentTerms: string;
  lineItems: { description: string; quantity: string | number; unit: string; specs?: string }[]; invitedSuppliers: string[];
}, status: RFQ['status'] = 'Sent'): RFQ {
  const all = readCollection<RFQ>(C.rfqs, mockRFQs);
  const rfq: RFQ = {
    id: nextId('RFQ', all.map((r) => r.id)),
    title: data.title,
    items: data.lineItems.filter((l) => l.description).length,
    suppliersInvited: data.invitedSuppliers.length,
    responsesReceived: 0,
    deadline: displayDate(data.deadline),
    status,
    createdDate: today(),
    createdBy: currentUserName(),
    department: data.department || 'Procurement',
    paymentTerms: data.paymentTerms,
    expectedDelivery: displayDate(data.expectedDelivery),
    lineItems: data.lineItems.filter((l) => l.description).map((l) => ({ description: l.description, quantity: Number(l.quantity) || 0, unit: l.unit, specs: l.specs })),
    invitedSuppliers: data.invitedSuppliers,
    bids: [],
    awardedTo: null,
  };
  setCollection<RFQ>(C.rfqs, mockRFQs, (prev) => [rfq, ...prev]);
  return rfq;
}

export function updateRFQ(id: string, patch: Partial<RFQ>): void {
  setCollection<RFQ>(C.rfqs, mockRFQs, (prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function createGRN(data: {
  poReference: string; supplier: string; receivedDate: string;
  vehicleEntry: GRN['vehicleEntry'];
  lineItems: { description: string; orderedQty: number | string; receivedQty: number | string; damagedQty?: number | string; unit: string }[];
}): GRN {
  const all = readCollection<GRN>(C.grns, mockGRNs);
  const lines = data.lineItems.map((l) => {
    const rec = Number(l.receivedQty) || 0;
    const dmg = Number(l.damagedQty) || 0;
    return { description: l.description, orderedQty: Number(l.orderedQty) || 0, receivedQty: rec, damagedQty: dmg, acceptedQty: Math.max(0, rec - dmg), unit: l.unit };
  });
  const grn: GRN = {
    id: nextId('GRN', all.map((g) => g.id)),
    poReference: data.poReference,
    supplier: data.supplier,
    receivedDate: displayDate(data.receivedDate || '') || today(),
    items: lines.length,
    status: 'Pending Inspection',
    vehicleEntry: { ...data.vehicleEntry, entryTime: data.vehicleEntry.entryTime || new Date().toLocaleTimeString('en-IN') },
    lineItems: lines,
    activityLog: [activity('Goods received at gate', data.vehicleEntry.vehicleNumber)],
  };
  setCollection<GRN>(C.grns, mockGRNs, (prev) => [grn, ...prev]);
  setCollection<InspectionItem>(C.inspections, mockInspections, (prev) => [{ ...grn, priority: 'Medium' }, ...prev]);
  const received = lines.reduce((s, l) => s + l.receivedQty, 0);
  setCollection<PurchaseOrder>(C.pos, mockPOs, (prev) =>
    prev.map((p) =>
      p.id === data.poReference
        ? {
            ...p,
            status: 'Partially Received',
            grns: [...(p.grns ?? []), { grnNumber: grn.id, date: grn.receivedDate, receivedQty: received, status: 'Pending' }],
            activityLog: [...(p.activityLog ?? []), activity(`Goods received — ${grn.id} created`)],
          }
        : p,
    ),
  );
  return grn;
}

export function updateGRN(id: string, patch: Partial<GRN>, action?: string): void {
  const apply = <T extends GRN>(g: T): T => ({ ...g, ...patch, activityLog: action ? [...(g.activityLog ?? []), activity(action)] : g.activityLog });
  setCollection<GRN>(C.grns, mockGRNs, (prev) => prev.map((g) => (g.id === id ? apply(g) : g)));
  setCollection<InspectionItem>(C.inspections, mockInspections, (prev) => prev.map((g) => (g.id === id ? apply(g) : g)));
  if (patch.status) {
    const map: Record<string, 'Pending' | 'Accepted' | 'Rejected' | 'Partial'> = { Accepted: 'Accepted', Rejected: 'Rejected', Partial: 'Partial', Inspected: 'Pending', 'Pending Inspection': 'Pending' };
    setCollection<PurchaseOrder>(C.pos, mockPOs, (prev) =>
      prev.map((p) => (p.grns?.some((r) => r.grnNumber === id) ? { ...p, grns: p.grns.map((r) => (r.grnNumber === id ? { ...r, status: map[patch.status as string] ?? r.status } : r)) } : p)),
    );
  }
}

export function recordInvoice(data: { grnId: string; invoiceNumber?: string; amount?: number; taxAmount?: number; dueDays?: number }): Invoice {
  const grns = readCollection<GRN>(C.grns, mockGRNs);
  const pos = readCollection<PurchaseOrder>(C.pos, mockPOs);
  const grn = grns.find((g) => g.id === data.grnId);
  const po = pos.find((p) => p.id === grn?.poReference);
  const total = data.amount ?? po?.totalAmount ?? 0;
  const tax = data.taxAmount ?? 0;
  const matched = po ? Math.abs(po.totalAmount - total) <= Math.max(1, po.totalAmount * 0.005) : false;
  const due = new Date(Date.now() + (data.dueDays ?? 30) * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const inv: Invoice = {
    id: data.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`,
    supplier: grn?.supplier ?? po?.supplier ?? 'Unknown supplier',
    poReference: po?.id ?? grn?.poReference ?? '',
    grnReference: data.grnId,
    invoiceDate: today(),
    amount: total - tax,
    taxAmount: tax,
    total,
    matchStatus: grn ? (matched ? 'matched' : 'mismatch') : 'pending',
    dueDate: due,
    paymentStatus: 'Pending',
  };
  setCollection<Invoice>(C.invoices, mockInvoices, (prev) => [inv, ...prev]);
  if (po) {
    updatePO(po.id, { invoices: [...(po.invoices ?? []), { invoiceNumber: inv.id, date: inv.invoiceDate, amount: inv.total, status: 'Pending', matchStatus: inv.matchStatus }] }, `Invoice ${inv.id} recorded (${inv.matchStatus})`);
  }
  addApproval({ type: 'Invoice', referenceId: inv.id, title: `Invoice from ${inv.supplier}`, department: 'Finance', amount: inv.total, priority: 'Medium', justification: `3-way match: ${inv.matchStatus}` });
  return inv;
}

export function updateInvoice(id: string, patch: Partial<Invoice>): void {
  setCollection<Invoice>(C.invoices, mockInvoices, (prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

/** Applies an approval decision to the record it refers to, then removes it from the queue. */
export function decideApproval(approval: Approval, decision: 'approve' | 'reject', comment?: string): void {
  const ok = decision === 'approve';
  const note = comment ? ` — ${comment}` : '';
  switch (approval.type) {
    case 'PR':
      updateRequisition(approval.referenceId, { status: ok ? 'Approved' : 'Rejected' }, `${ok ? 'Approved' : 'Rejected'} by ${currentUserName()}${note}`);
      break;
    case 'PO':
      updatePO(approval.referenceId, ok ? { status: 'Sent' } : {}, `${ok ? 'Approved and sent to supplier' : 'Rejected'} by ${currentUserName()}${note}`);
      break;
    case 'Invoice':
      updateInvoice(approval.referenceId, { paymentStatus: ok ? 'Approved' : 'Disputed' });
      break;
    case 'Supplier':
      updateSupplier(approval.referenceId, ok ? { classification: 'Approved' } : { classification: 'Registered' });
      break;
  }
  setCollection<Approval>(C.approvals, mockApprovals, (prev) => prev.filter((a) => a.id !== approval.id));
}

/** Awards an RFQ to a bid and raises the purchase order for it. */
export function awardRFQ(rfq: RFQ, bid: RFQ['bids'][number]): PurchaseOrder {
  const pos = readCollection<PurchaseOrder>(C.pos, mockPOs);
  const lines = (rfq.lineItems.length ? rfq.lineItems : [{ description: rfq.title, quantity: 1, unit: 'lot' }]).map((l) => ({
    description: l.description, quantity: l.quantity, unit: l.unit, unitPrice: bid.unitPrice, taxPercent: 0, total: l.quantity * bid.unitPrice,
  }));
  const linesTotal = lines.reduce((s, l) => s + l.total, 0);
  const delivery = new Date(Date.now() + (bid.deliveryDays || 14) * 86_400_000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const po: PurchaseOrder = {
    id: nextId('PO', pos.map((p) => p.id)),
    supplier: bid.supplierName,
    totalAmount: bid.total || linesTotal,
    status: 'Draft',
    expectedDelivery: delivery,
    createdDate: today(),
    paymentTerms: bid.terms || rfq.paymentTerms,
    deliveryAddress: '',
    lineItems: lines,
    grns: [],
    invoices: [],
    activityLog: [activity(`Created from ${rfq.id} award`)],
  };
  setCollection<PurchaseOrder>(C.pos, mockPOs, (prev) => [po, ...prev]);
  updateRFQ(rfq.id, { status: 'Awarded', awardedTo: bid.supplierName });
  addApproval({ type: 'PO', referenceId: po.id, title: `${rfq.title} — ${bid.supplierName}`, department: rfq.department, amount: po.totalAmount, priority: 'Medium', justification: `Awarded from ${rfq.id}` });
  return po;
}

export interface RfqMessage { time: string; user: string; text: string }
