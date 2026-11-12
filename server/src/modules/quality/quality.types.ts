import type { Department, Severity } from './quality.common';

export interface SopDocumentRow {
  id: string;
  sop_code: string;
  title: string;
  department: Department;
  owner_email: string;
  review_interval_months: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SopVersionRow {
  id: string;
  sop_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string;
  status: 'draft' | 'in_review' | 'effective' | 'superseded' | 'rejected';
  created_by: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  effective_date: string | null;
  next_review_date: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NonConformanceRow {
  id: string;
  ncr_code: string;
  title: string;
  description: string;
  department: Department;
  source: string;
  severity: Severity;
  seed_lot_id: string | null;
  status: 'open' | 'investigating' | 'closed' | 'cancelled';
  raised_by: string;
  assigned_to: string | null;
  due_date: string | null;
  root_cause: string | null;
  closure_notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
  complaint_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CapaRow {
  id: string;
  capa_code: string;
  ncr_id: string | null;
  complaint_id: string | null;
  action_type: 'corrective' | 'preventive';
  title: string;
  description: string;
  owner_email: string;
  due_date: string;
  status: 'open' | 'in_progress' | 'implemented' | 'closed' | 'cancelled';
  implementation_notes: string | null;
  implemented_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  effectiveness_result: 'effective' | 'ineffective' | null;
  effectiveness_notes: string | null;
  verification_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintRow {
  id: string;
  complaint_code: string;
  source: string;
  complainant_name: string;
  complainant_contact: string | null;
  seed_lot_id: string | null;
  title: string;
  description: string;
  severity: Severity;
  status: 'received' | 'investigating' | 'resolved' | 'closed';
  received_date: string;
  assigned_to: string | null;
  root_cause: string | null;
  resolution: string | null;
  recall_recommended: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  ncr_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LotHoldRow {
  id: string;
  seed_lot_id: string;
  reason: string;
  source_type: 'ncr' | 'complaint' | 'manual';
  source_id: string | null;
  placed_by: string;
  placed_at: string;
  released_by: string | null;
  released_at: string | null;
  release_notes: string | null;
}
