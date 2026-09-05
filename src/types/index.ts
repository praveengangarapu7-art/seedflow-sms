import type { LucideIcon } from 'lucide-react';

export type UserRole =
  // Procurement roles (already existed)
  | 'purchase_executive'
  | 'purchase_manager'
  | 'finance_manager'
  | 'procurement_quality_field_inspector'
  // Warehouse roles (NEW)
  | 'warehouse_supervisor'
  | 'warehouse_manager'
  | 'warehouse_quality_field_inspector'
  | 'safety_officer'
  // R&D roles (NEW)
  | 'rd_executive'
  | 'rd_manager'
  | 'rd_quality_field_inspector'
  // Processing roles (NEW)
  | 'plant_supervisor'
  | 'plant_manager'
  | 'processing_quality_field_inspector'
  // Laboratory roles (NEW)
  | 'lab_manager'
  | 'lab_technician'
  | 'lab_quality_analyst'
  // Administration roles (NEW) — the only roles that are not scoped to a
  // single business module: they administer every module of the platform.
  | 'super_admin'
  | 'system_admin'
  | 'compliance_auditor';

export type ProcurementRole = Extract<UserRole,
  'purchase_executive' | 'purchase_manager' | 'finance_manager' | 'procurement_quality_field_inspector'>;
export type WarehouseRole = Extract<UserRole,
  'warehouse_supervisor' | 'warehouse_manager' | 'warehouse_quality_field_inspector' | 'safety_officer'>;
export type RDRole = Extract<UserRole,
  'rd_executive' | 'rd_manager' | 'rd_quality_field_inspector'>;
export type ProcessingRole = Extract<UserRole,
  'plant_supervisor' | 'plant_manager' | 'processing_quality_field_inspector'>;
export type LabRole = Extract<UserRole,
  'lab_manager' | 'lab_technician' | 'lab_quality_analyst'>;
export type AdminRole = Extract<UserRole,
  'super_admin' | 'system_admin' | 'compliance_auditor'>;

export interface User {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organizationName?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  purchase_executive: 'Purchase Executive',
  purchase_manager: 'Purchase Manager',
  finance_manager: 'Finance Manager',
  procurement_quality_field_inspector: 'Quality Field Inspector (Procurement)',
  warehouse_supervisor: 'Warehouse Supervisor',
  warehouse_manager: 'Warehouse Manager',
  warehouse_quality_field_inspector: 'Quality Field Inspector (Warehouse)',
  safety_officer: 'Safety Officer',
  rd_executive: 'R&D Executive',
  rd_manager: 'R&D Manager',
  rd_quality_field_inspector: 'Quality Field Inspector (R&D)',
  plant_supervisor: 'Plant Supervisor',
  plant_manager: 'Plant Manager',
  processing_quality_field_inspector: 'Quality Field Inspector (Processing)',
  lab_manager: 'Lab Manager',
  lab_technician: 'Lab Technician',
  lab_quality_analyst: 'Quality Analyst (Laboratory)',
  super_admin: 'Super Admin',
  system_admin: 'System Admin',
  compliance_auditor: 'Compliance Auditor',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  purchase_executive: 'Creates requisitions, RFQs, purchase orders, GRNs, and verifies invoices',
  purchase_manager: 'Approves PRs and POs, manages suppliers, awards RFQs',
  finance_manager: 'Owns budget control, approves invoices, releases payments',
  procurement_quality_field_inspector: 'Inspects delivered goods at procurement, accepts or rejects lots',
  warehouse_supervisor: 'Runs warehouse floor: receives goods, manages storage, prepares dispatches',
  warehouse_manager: 'Owns warehouse strategy: approves dispatches, manages adjustments, configures storage',
  warehouse_quality_field_inspector: 'Inspects incoming and returned lots in the warehouse',
  safety_officer: 'Monitors IoT conditions, ensures safe storage, manages safety alerts',
  rd_executive: 'Catalogs germplasm, plans crosses, executes trials, analyzes data, files registrations',
  rd_manager: 'Approves trial protocols, variety advancement, and final release',
  rd_quality_field_inspector: 'Verifies trial integrity and data accuracy in the field',
  plant_supervisor: 'Runs the processing line: operates cleaning, drying, grading, treatment, packaging',
  plant_manager: 'Approves recipes and finished lots, configures plants, machines, and production schedule',
  processing_quality_field_inspector: 'Three quality checkpoints: pre-processing, in-process, final inspection',
  lab_manager: 'Owns lab throughput: accepts samples, approves results, issues certificates, resolves quality flags',
  lab_technician: 'Runs the bench: records germination, purity and vigor results and uploads result files',
  lab_quality_analyst: 'Reviews results against certification thresholds and audits lab performance',
  super_admin: 'Unrestricted platform authority: users, roles, organizations, governance, privacy and every module setting',
  system_admin: 'Runs the platform day to day: user accounts, organizations, system health, notifications and module availability',
  compliance_auditor: 'Read-only oversight: audit trail, data governance violations, privacy compliance and retention policies',
};

export const PROCUREMENT_ROLES: UserRole[] = [
  'purchase_executive', 'purchase_manager', 'finance_manager', 'procurement_quality_field_inspector'
];
export const WAREHOUSE_ROLES: UserRole[] = [
  'warehouse_supervisor', 'warehouse_manager', 'warehouse_quality_field_inspector', 'safety_officer'
];
export const RD_ROLES: UserRole[] = [
  'rd_executive', 'rd_manager', 'rd_quality_field_inspector'
];
export const PROCESSING_ROLES: UserRole[] = [
  'plant_supervisor', 'plant_manager', 'processing_quality_field_inspector'
];
export const LAB_ROLES: UserRole[] = [
  'lab_manager', 'lab_technician', 'lab_quality_analyst'
];
export const ADMIN_ROLES: UserRole[] = [
  'super_admin', 'system_admin', 'compliance_auditor'
];


export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface ModuleCardData {
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  status: 'active' | 'coming-soon';
}
