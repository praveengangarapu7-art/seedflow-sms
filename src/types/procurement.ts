import type { LucideIcon } from 'lucide-react';

// ── Dashboard types ────────────────────────────────────────────
export interface KpiData {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: {
    direction: 'up' | 'down';
    percentage: string;
    isPositive: boolean;
  };
  comparison: string;
}

export interface SpendCategory {
  category: string;
  amount: number;
  percentage: number;
}

export type PoStatusValue = 'Draft' | 'Sent' | 'Acknowledged' | 'Received' | 'Closed';

export interface PoStatus {
  status: PoStatusValue;
  count: number;
  percentage: number;
}

export interface RecentPO {
  poNumber: string;
  supplier: string;
  amount: number;
  status: PoStatusValue;
  date: string;
}

export interface PendingApproval {
  id: number;
  type: 'PR' | 'PO' | 'Invoice';
  title: string;
  submittedBy: string;
  timeAgo: string;
  amount: number;
}

export interface TopSupplier {
  rank: number;
  name: string;
  score: number;
  poCount: number;
  totalSpend: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: number;
  severity: AlertSeverity;
  title: string;
  description: string;
  timeAgo: string;
}

// ── PR / PO types ──────────────────────────────────────────────
export type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to PO';
export type POStatus = 'Draft' | 'Sent' | 'Acknowledged' | 'Partially Received' | 'Received' | 'Closed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Department = 'Laboratory' | 'Procurement' | 'Warehouse' | 'R&D' | 'Processing' | 'Admin';

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  total: number;
}

export interface POLineItem extends LineItem {
  unitPrice: number;
  taxPercent: number;
}

export interface ApprovalStep {
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comment?: string;
}

export interface ActivityLogEntry {
  time: string;
  user: string;
  action: string;
  details?: string;
}

export interface PurchaseRequisition {
  id: string;
  title: string;
  department: Department;
  items: number;
  totalValue: number;
  priority: Priority;
  status: PRStatus;
  createdBy: string;
  createdDate: string;
  requiredBy: string;
  justification: string;
  lineItems: LineItem[];
  approvalTrail?: ApprovalStep[];
  activityLog?: ActivityLogEntry[];
}

export interface GRNReference {
  grnNumber: string;
  date: string;
  receivedQty: number;
  damagedQty?: number;
  acceptedQty?: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Partial';
}

export interface InvoiceReference {
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Disputed';
  matchStatus?: 'matched' | 'mismatch' | 'pending';
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  prReference?: string;
  totalAmount: number;
  status: POStatus;
  expectedDelivery: string;
  createdDate: string;
  paymentTerms: string;
  deliveryAddress: string;
  lineItems: POLineItem[];
  grns?: GRNReference[];
  invoices?: InvoiceReference[];
  activityLog: ActivityLogEntry[];
}

// ── Supplier / RFQ / GRN / Inspection types ────────────────────
export type SupplierClassification = 'Preferred' | 'Approved' | 'Registered' | 'Blacklisted';
export type RFQStatus = 'Draft' | 'Sent' | 'Responses Received' | 'Awarded' | 'Closed';
export type GRNStatus = 'Pending Inspection' | 'Inspected' | 'Accepted' | 'Rejected' | 'Partial';
export type InspectionPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type InspectionDecision = 'Accept' | 'Partial Accept' | 'Reject' | 'Hold';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  classification: SupplierClassification;
  contact: { person: string; email: string; phone: string };
  address: { line1?: string; city: string; state: string; pincode?: string; country: string };
  gst: string;
  pan: string;
  bankDetails: { accountHolder: string; accountNumber: string; ifsc: string; bank: string };
  paymentTerms: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  overallScore: number;
  totalPOs: number;
  totalSpend: number;
  lastPODate: string;
  onboardingDate: string;
  documents: Array<{ name: string; uploadedDate: string }>;
  notes?: string;
  blacklistReason?: string | null;
}

export interface RFQBid {
  supplierId: string;
  supplierName: string;
  submittedDate: string;
  unitPrice: number;
  deliveryDays: number;
  total: number;
  terms: string;
  notes?: string;
}

export interface RFQ {
  id: string;
  title: string;
  items: number;
  suppliersInvited: number;
  responsesReceived: number;
  deadline: string;
  status: RFQStatus;
  createdDate: string;
  createdBy: string;
  department: string;
  paymentTerms: string;
  expectedDelivery: string;
  lineItems: Array<{ description: string; quantity: number; unit: string; specs?: string }>;
  invitedSuppliers: string[];
  bids: RFQBid[];
  awardedTo: string | null;
}

export interface QualityChecks {
  moisture: number;
  moistureSpec: { min: number; max: number };
  moisturePass: boolean;
  impurity: number;
  impuritySpec: { min: number; max: number };
  impurityPass: boolean;
  visualInspection: string;
  aiImageGrade?: string;
  aiConfidence?: number;
  photos: string[];
}

export interface GRN {
  id: string;
  poReference: string;
  supplier: string;
  receivedDate: string;
  items: number;
  status: GRNStatus;
  aiQualityScore?: number;
  inspector?: string;
  vehicleEntry: {
    vehicleNumber: string;
    driverName: string;
    driverPhone?: string;
    entryTime: string;
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
  };
  lineItems: Array<{
    description: string;
    orderedQty: number;
    receivedQty: number;
    damagedQty: number;
    acceptedQty: number;
    unit: string;
  }>;
  qualityChecks?: QualityChecks;
  notes?: string;
  inspectionDate?: string;
  activityLog: ActivityLogEntry[];
}

export interface InspectionItem extends GRN {
  priority: InspectionPriority;
  assignedTo?: string;
}

export interface QualityParameter {
  name: string;
  spec: string;
  measuredValue: number | null;
  unit: string;
  method: string;
  notes: string;
  pass: boolean | null;
}

// ── Invoice / Budget / Approval / Workflow / Audit types ───────────
export type InvoiceMatchStatus = 'matched' | 'mismatch' | 'pending';
export type InvoicePaymentStatus = 'Pending' | 'Approved' | 'Paid' | 'Overdue' | 'Disputed';

export interface InvoiceVariance {
  field: string;
  poValue: number;
  grnValue: number;
  invoiceValue: number;
  variance: number;
}

export interface Invoice {
  id: string;
  supplier: string;
  poReference: string;
  grnReference: string;
  invoiceDate: string;
  amount: number;
  taxAmount: number;
  total: number;
  matchStatus: InvoiceMatchStatus;
  dueDate: string;
  paymentStatus: InvoicePaymentStatus;
  paidDate?: string;
  variances?: InvoiceVariance[];
}

export type CostCenterStatus = 'On Track' | 'Warning' | 'Critical' | 'Over Budget' | 'Underutilized';

export interface CostCenter {
  id: string;
  costCenter: string;
  department: string;
  allocated: number;
  committed: number;
  spent: number;
  available: number;
  utilization: number;
  status: CostCenterStatus;
  period: string;
}

export type ApprovalType = 'PR' | 'PO' | 'Invoice' | 'Supplier';

export interface ApprovalChainStep {
  approver: string;
  role: string;
  status: 'approved' | 'current' | 'pending' | 'rejected';
  timestamp?: string;
  comment?: string;
}

export interface Approval {
  id: string;
  type: ApprovalType;
  referenceId: string;
  title: string;
  submittedBy: { name: string; avatar: string };
  submittedAt: string;
  department: string;
  amount: number;
  priority: Priority;
  justification: string;
  approvalChain: ApprovalChainStep[];
  daysWaiting: number;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  appliesTo: ApprovalType;
  threshold: number;
  steps: Array<{ stepNumber: number; approverRole: string; specificUser?: string }>;
  active: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress: string;
}
