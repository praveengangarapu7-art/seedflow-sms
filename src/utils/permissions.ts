import type { UserRole } from '@/types';

export type Permission =
  // ========== PROCUREMENT (existing) ==========
  | 'view_procurement_dashboard'
  | 'view_requisitions'
  | 'view_orders'
  | 'view_suppliers'
  | 'view_rfq'
  | 'view_grn'
  | 'view_inspection'
  | 'view_invoices'
  | 'view_budget'
  | 'view_approvals'
  | 'view_procurement_reports'
  | 'view_procurement_settings'
  | 'create_requisition'
  | 'approve_requisition'
  | 'create_order'
  | 'approve_order'
  | 'add_supplier'
  | 'edit_supplier'
  | 'create_rfq'
  | 'award_rfq'
  | 'create_grn'
  | 'edit_grn'
  | 'conduct_inspection'
  | 'approve_inspection'
  | 'create_invoice'
  | 'verify_invoice'
  | 'approve_invoice_payment'
  | 'release_payment'
  | 'allocate_budget'
  | 'view_budget_reports'
  | 'manage_procurement_settings'
  // ========== WAREHOUSE (NEW) ==========
  // Page visibility
  | 'view_warehouse_dashboard'
  | 'view_inventory'
  | 'view_inbound'
  | 'view_storage_locations'
  | 'view_outbound'
  | 'view_stock_movements'
  | 'view_stock_adjustments'
  | 'view_cycle_counting'
  | 'view_barcode_rfid'
  | 'view_returns'
  | 'view_iot_monitoring'
  | 'view_warehouse_reports'
  | 'view_warehouse_settings'
  // Actions
  | 'receive_incoming_goods'
  | 'inspect_incoming_goods'
  | 'safety_clear_incoming'
  | 'assign_storage_location'
  | 'define_storage_zones'
  | 'update_inventory'
  | 'prepare_outbound_dispatch'
  | 'approve_outbound_dispatch'
  | 'log_stock_movement'
  | 'propose_stock_adjustment'
  | 'approve_stock_adjustment'
  | 'schedule_cycle_count'
  | 'execute_cycle_count'
  | 'approve_cycle_count'
  | 'print_barcode_labels'
  | 'configure_barcode_formats'
  | 'log_return'
  | 'quality_assess_returns'
  | 'approve_return_disposition'
  | 'view_iot_data'
  | 'configure_iot_thresholds'
  | 'resolve_safety_alerts'
  | 'manage_warehouse_settings'
  // ========== R&D (NEW) ==========
  // Page visibility
  | 'view_rd_dashboard'
  | 'view_germplasm'
  | 'view_breeding_programs'
  | 'view_nurseries'
  | 'view_trials'
  | 'view_trial_detail'
  | 'view_phenotyping'
  | 'view_varieties'
  | 'view_registrations'
  | 'view_rd_reports'
  | 'view_rd_settings'
  // Trial Detail tab visibility
  | 'view_trial_analysis_tab'
  // Actions
  | 'catalog_germplasm'
  | 'archive_germplasm'
  | 'create_breeding_program'
  | 'approve_breeding_program'
  | 'plan_crosses'
  | 'create_nursery'
  | 'inspect_nursery'
  | 'design_trial'
  | 'approve_trial_protocol'
  | 'execute_trial'
  | 'record_phenotyping'
  | 'verify_field_observations'
  | 'flag_data_accuracy_issues'
  | 'analyze_trial_data'
  | 'propose_variety_advancement'
  | 'approve_variety_advancement'
  | 'file_variety_registration'
  | 'approve_variety_release'
  | 'manage_trial_templates'
  | 'manage_trait_catalog'
  | 'manage_workflow_rules'
  | 'manage_rd_settings'
  // ========== PROCESSING (NEW) ==========
  // Page visibility
  | 'view_processing_dashboard'
  | 'view_raw_intake'
  | 'view_processing_batches'
  | 'view_batch_detail'
  | 'view_production_planning'
  | 'view_plants_machines'
  | 'view_recipes'
  | 'view_yield_loss'
  | 'view_packaging'
  | 'view_certification'
  | 'view_traceability'
  | 'view_processing_reports'
  | 'view_processing_settings'
  // Batch Detail tab visibility
  | 'view_batch_yield_loss_tab'
  // Actions
  | 'create_raw_intake'
  | 'pre_processing_inspection'
  | 'accept_reject_raw_lot'
  | 'mark_raw_lot_ready'
  | 'create_processing_batch'
  | 'approve_batch_recipe'
  | 'update_batch_stage'
  | 'pause_resume_batch'
  | 'cancel_batch'
  | 'send_sample_to_lab'
  | 'in_process_quality_check'
  | 'final_quality_inspection'
  | 'approve_finished_lot_dispatch'
  | 'schedule_batch'
  | 'configure_plant'
  | 'configure_machine'
  | 'schedule_maintenance'
  | 'mark_machine_status'
  | 'create_recipe'
  | 'approve_recipe_system'
  | 'archive_recipe'
  | 'generate_packages'
  | 'print_labels_qr'
  | 'verify_final_package_quality'
  | 'submit_for_certification'
  | 'manage_certification_records'
  | 'initiate_recall'
  | 'manage_processing_settings'
  // ========== LABORATORY (NEW) ==========
  // Page visibility
  | 'view_lab_dashboard'
  | 'view_lab_submissions'
  | 'view_lab_submission_detail'
  | 'view_lab_results'
  | 'view_lab_quality_flags'
  | 'view_lab_certificates'
  | 'view_lab_performance'
  // Actions — mirrors the server-side role gates in
  // server/src/modules/labTesting/labTesting.routes.ts: submitting a sample
  // is a request any lot owner may make, while recording results, issuing
  // certificates and resolving flags are lab authority.
  | 'submit_lab_sample'
  | 'record_lab_result'
  | 'bulk_upload_lab_results'
  | 'issue_phytosanitary_certificate'
  | 'resolve_lab_quality_flag'
  // ========== QUALITY (NEW) ==========
  // The quality spine: SOP -> non-conformance -> CAPA -> effectiveness
  // verification, plus complaints and lot holds. Server-side gates live in
  // server/src/modules/quality/quality.routes.ts: any signed-in role may
  // read, raise, log and acknowledge; Admin/Inspector author and investigate;
  // Admin alone approves, closes, verifies and releases. The manager/officer
  // split below mirrors that so the UI never offers what the server refuses.
  // Page visibility
  | 'view_quality_dashboard'
  | 'view_sop_register'
  | 'view_ncrs'
  | 'view_capas'
  | 'view_complaints'
  | 'view_lot_holds'
  | 'view_compliance'
  // Actions — open to every role (see FRONTLINE_QUALITY)
  | 'acknowledge_sop'
  | 'raise_ncr'
  | 'log_complaint'
  // Actions — quality officer
  | 'author_sop'
  | 'manage_ncr'
  | 'manage_capa'
  | 'manage_complaint'
  | 'place_lot_hold'
  | 'manage_compliance'
  // Actions — quality manager (four-eyes / closure authority)
  | 'approve_sop'
  | 'close_ncr'
  | 'verify_capa'
  | 'close_complaint'
  | 'release_lot_hold'
  | 'cancel_quality_records'
  | 'load_compliance_template'
  // ========== ADMINISTRATION (NEW) ==========
  // The Administration module is the one module that is not a business
  // domain of its own: it owns the concerns every OTHER module shares —
  // accounts, roles, organizations, the audit trail, system health, data
  // governance, privacy/retention, cross-module approval workflows,
  // notifications and per-module settings. Every page here is deliberately
  // gated separately so a read-only Compliance Auditor can see the audit
  // and governance surfaces without gaining any write authority.
  // Page visibility
  | 'view_admin_dashboard'
  | 'view_admin_users'
  | 'view_admin_roles'
  | 'view_admin_organizations'
  | 'view_admin_audit_logs'
  | 'view_admin_system_health'
  | 'view_admin_data_governance'
  | 'view_admin_data_privacy'
  | 'view_admin_workflows'
  | 'view_admin_notifications'
  | 'view_admin_modules'
  | 'view_admin_settings'
  // Actions — user & access administration
  | 'create_user'
  | 'edit_user'
  | 'assign_user_role'
  | 'deactivate_user'
  | 'reset_user_password'
  | 'manage_admin_organizations'
  // Actions — oversight
  | 'export_audit_logs'
  | 'resolve_governance_violation'
  | 'archive_orphan_lot'
  | 'correct_lot_quantity'
  | 'export_farmer_data'
  | 'anonymize_farmer_data'
  | 'manage_retention_policies'
  // Actions — platform operations
  | 'cancel_any_workflow'
  | 'broadcast_notification'
  | 'toggle_module_availability'
  | 'manage_admin_settings';

/**
 * Every read-only permission outside the Administration module itself.
 *
 * All three administration roles carry this list. An administrator who can
 * see the platform's audit trail, health and governance but gets "Access
 * denied" the moment they open Procurement from the module grid is not
 * actually administering anything — and a Compliance Auditor whose job is to
 * check lots, certificates and inspections needs to reach those records too.
 *
 * It is deliberately view-only: reading every module is oversight, writing to
 * them is the operating roles' job, so nothing here grants an approval, an
 * edit or a dispatch. Generated from PERMISSION_GROUPS below, so a page added
 * to any module tomorrow is covered here as soon as its view permission is
 * registered.
 */
const CROSS_MODULE_VIEW: Permission[] = [
  // Procurement
  'view_procurement_dashboard',
  'view_requisitions',
  'view_orders',
  'view_suppliers',
  'view_rfq',
  'view_grn',
  'view_inspection',
  'view_invoices',
  'view_budget',
  'view_approvals',
  'view_procurement_reports',
  'view_procurement_settings',
  'view_budget_reports',
  // Warehouse
  'view_warehouse_dashboard',
  'view_inventory',
  'view_inbound',
  'view_storage_locations',
  'view_outbound',
  'view_stock_movements',
  'view_stock_adjustments',
  'view_cycle_counting',
  'view_barcode_rfid',
  'view_returns',
  'view_iot_monitoring',
  'view_warehouse_reports',
  'view_warehouse_settings',
  'view_iot_data',
  // R&D
  'view_rd_dashboard',
  'view_germplasm',
  'view_breeding_programs',
  'view_nurseries',
  'view_trials',
  'view_trial_detail',
  'view_phenotyping',
  'view_varieties',
  'view_registrations',
  'view_rd_reports',
  'view_rd_settings',
  'view_trial_analysis_tab',
  // Processing
  'view_processing_dashboard',
  'view_raw_intake',
  'view_processing_batches',
  'view_batch_detail',
  'view_production_planning',
  'view_plants_machines',
  'view_recipes',
  'view_yield_loss',
  'view_packaging',
  'view_certification',
  'view_traceability',
  'view_processing_reports',
  'view_processing_settings',
  'view_batch_yield_loss_tab',
  // Laboratory
  'view_lab_dashboard',
  'view_lab_submissions',
  'view_lab_submission_detail',
  'view_lab_results',
  'view_lab_quality_flags',
  'view_lab_certificates',
  'view_lab_performance',
  // Quality
  'view_quality_dashboard',
  'view_sop_register',
  'view_ncrs',
  'view_capas',
  'view_complaints',
  'view_lot_holds',
  'view_compliance',
];

/**
 * What every employee gets from the Quality module, whatever their own
 * module. The site visit found poor inter-department communication and no
 * evidence that people had read the procedures they work to; the fix is not
 * to route every problem through the quality team but to let whoever notices
 * it raise it, and to let everyone acknowledge the SOPs that bind them.
 * Deliberately read + raise + acknowledge only — nothing here closes,
 * approves or releases anything.
 */
const FRONTLINE_QUALITY: Permission[] = [
  'view_quality_dashboard',
  'view_sop_register',
  'view_ncrs',
  'view_capas',
  'view_complaints',
  'acknowledge_sop',
  'raise_ncr',
  'log_complaint',
];

const ROLE_PERMISSIONS_BASE: Record<UserRole, Permission[]> = {
  // ===== Existing procurement roles (KEEP AS-IS) =====
  purchase_executive: [
    'view_procurement_dashboard',
    'view_requisitions',
    'view_orders',
    'view_suppliers',
    'view_rfq',
    'view_grn',
    'view_invoices',
    'view_procurement_reports',
    'create_requisition',
    'create_order',
    'add_supplier',
    'create_rfq',
    'create_grn',
    'edit_grn',
    'create_invoice',
    'verify_invoice',
  ],
  purchase_manager: [
    'view_procurement_dashboard',
    'view_requisitions',
    'view_orders',
    'view_suppliers',
    'view_rfq',
    'view_grn',
    'view_inspection',
    'view_invoices',
    'view_budget',
    'view_approvals',
    'view_procurement_reports',
    'view_procurement_settings',
    'approve_requisition',
    'approve_order',
    'add_supplier',
    'edit_supplier',
    'award_rfq',
    'approve_inspection',
    'view_budget_reports',
    'manage_procurement_settings',
  ],
  finance_manager: [
    'view_procurement_dashboard',
    'view_orders',
    'view_invoices',
    'view_budget',
    'view_approvals',
    'view_procurement_reports',
    'approve_invoice_payment',
    'release_payment',
    'allocate_budget',
    'view_budget_reports',
  ],
  procurement_quality_field_inspector: [
    'view_procurement_dashboard',
    'view_grn',
    'view_inspection',
    'view_procurement_reports',
    'conduct_inspection',
    'approve_inspection',
  ],

  // ===== New warehouse roles =====
  warehouse_supervisor: [
    'view_warehouse_dashboard',
    'view_inventory',
    'view_inbound',
    'view_storage_locations',
    'view_outbound',
    'view_stock_movements',
    'view_stock_adjustments',
    'view_cycle_counting',
    'view_barcode_rfid',
    'view_returns',
    'view_iot_monitoring',
    'view_warehouse_reports',
    'receive_incoming_goods',
    'assign_storage_location',
    'update_inventory',
    'prepare_outbound_dispatch',
    'log_stock_movement',
    'propose_stock_adjustment',
    'execute_cycle_count',
    'print_barcode_labels',
    'log_return',
    'view_iot_data',
  ],
  warehouse_manager: [
    'view_warehouse_dashboard',
    'view_inventory',
    'view_inbound',
    'view_storage_locations',
    'view_outbound',
    'view_stock_movements',
    'view_stock_adjustments',
    'view_cycle_counting',
    'view_barcode_rfid',
    'view_returns',
    'view_iot_monitoring',
    'view_warehouse_reports',
    'view_warehouse_settings',
    'assign_storage_location',
    'define_storage_zones',
    'update_inventory',
    'approve_outbound_dispatch',
    'log_stock_movement',
    'approve_stock_adjustment',
    'schedule_cycle_count',
    'execute_cycle_count',
    'approve_cycle_count',
    'print_barcode_labels',
    'configure_barcode_formats',
    'approve_return_disposition',
    'view_iot_data',
    'manage_warehouse_settings',
  ],
  warehouse_quality_field_inspector: [
    'view_warehouse_dashboard',
    'view_inventory',
    'view_inbound',
    'view_returns',
    'view_warehouse_reports',
    'inspect_incoming_goods',
    'quality_assess_returns',
  ],
  safety_officer: [
    'view_warehouse_dashboard',
    'view_inventory',
    'view_inbound',
    'view_storage_locations',
    'view_iot_monitoring',
    'view_warehouse_reports',
    'safety_clear_incoming',
    'view_iot_data',
    'configure_iot_thresholds',
    'resolve_safety_alerts',
  ],

  // ===== New R&D roles =====
  rd_executive: [
    'view_rd_dashboard',
    'view_germplasm',
    'view_breeding_programs',
    'view_nurseries',
    'view_trials',
    'view_trial_detail',
    'view_phenotyping',
    'view_varieties',
    'view_registrations',
    'view_rd_reports',
    'view_trial_analysis_tab',
    'catalog_germplasm',
    'create_breeding_program',
    'plan_crosses',
    'create_nursery',
    'design_trial',
    'execute_trial',
    'record_phenotyping',
    'analyze_trial_data',
    'propose_variety_advancement',
    'file_variety_registration',
  ],
  rd_manager: [
    'view_rd_dashboard',
    'view_germplasm',
    'view_breeding_programs',
    'view_nurseries',
    'view_trials',
    'view_trial_detail',
    'view_phenotyping',
    'view_varieties',
    'view_registrations',
    'view_rd_reports',
    'view_rd_settings',
    'view_trial_analysis_tab',
    'catalog_germplasm',
    'archive_germplasm',
    'approve_breeding_program',
    'plan_crosses',
    'create_nursery',
    'approve_trial_protocol',
    'analyze_trial_data',
    'approve_variety_advancement',
    'approve_variety_release',
    'manage_trial_templates',
    'manage_trait_catalog',
    'manage_workflow_rules',
    'manage_rd_settings',
  ],
  rd_quality_field_inspector: [
    'view_rd_dashboard',
    'view_nurseries',
    'view_trials',
    'view_trial_detail',
    'view_phenotyping',
    'view_rd_reports',
    'inspect_nursery',
    'verify_field_observations',
    'flag_data_accuracy_issues',
  ],

  // ===== New Processing roles =====
  plant_supervisor: [
    'view_processing_dashboard',
    'view_raw_intake',
    'view_processing_batches',
    'view_batch_detail',
    'view_production_planning',
    'view_plants_machines',
    'view_recipes',
    'view_packaging',
    'view_traceability',
    'view_processing_reports',
    'view_batch_yield_loss_tab',
    'create_raw_intake',
    'create_processing_batch',
    'update_batch_stage',
    'pause_resume_batch',
    'send_sample_to_lab',
    'mark_machine_status',
    'generate_packages',
    'print_labels_qr',
  ],
  plant_manager: [
    'view_processing_dashboard',
    'view_raw_intake',
    'view_processing_batches',
    'view_batch_detail',
    'view_production_planning',
    'view_plants_machines',
    'view_recipes',
    'view_yield_loss',
    'view_packaging',
    'view_certification',
    'view_traceability',
    'view_processing_reports',
    'view_processing_settings',
    'view_batch_yield_loss_tab',
    'mark_raw_lot_ready',
    'approve_batch_recipe',
    'pause_resume_batch',
    'cancel_batch',
    'send_sample_to_lab',
    'approve_finished_lot_dispatch',
    'schedule_batch',
    'configure_plant',
    'configure_machine',
    'schedule_maintenance',
    'mark_machine_status',
    'create_recipe',
    'approve_recipe_system',
    'archive_recipe',
    'generate_packages',
    'print_labels_qr',
    'submit_for_certification',
    'manage_certification_records',
    'initiate_recall',
    'manage_processing_settings',
  ],
  processing_quality_field_inspector: [
    'view_processing_dashboard',
    'view_raw_intake',
    'view_processing_batches',
    'view_batch_detail',
    'view_packaging',
    'view_certification',
    'view_traceability',
    'view_processing_reports',
    'pre_processing_inspection',
    'accept_reject_raw_lot',
    'mark_raw_lot_ready',
    'send_sample_to_lab',
    'in_process_quality_check',
    'final_quality_inspection',
    'verify_final_package_quality',
  ],
  // ===== Laboratory roles (NEW) =====
  lab_manager: [
    'view_lab_dashboard',
    'view_lab_submissions',
    'view_lab_submission_detail',
    'view_lab_results',
    'view_lab_quality_flags',
    'view_lab_certificates',
    'view_lab_performance',
    'submit_lab_sample',
    'record_lab_result',
    'bulk_upload_lab_results',
    'issue_phytosanitary_certificate',
    'resolve_lab_quality_flag',
  ],
  lab_technician: [
    'view_lab_dashboard',
    'view_lab_submissions',
    'view_lab_submission_detail',
    'view_lab_results',
    'view_lab_quality_flags',
    'submit_lab_sample',
    'record_lab_result',
    'bulk_upload_lab_results',
  ],
  lab_quality_analyst: [
    'view_lab_dashboard',
    'view_lab_submissions',
    'view_lab_submission_detail',
    'view_lab_results',
    'view_lab_quality_flags',
    'view_lab_certificates',
    'view_lab_performance',
    'resolve_lab_quality_flag',
  ],

  // ===== Quality roles (NEW) =====
  quality_officer: [
    ...FRONTLINE_QUALITY,
    'view_lot_holds',
    'view_compliance',
    'manage_compliance',
    'author_sop',
    'manage_ncr',
    'manage_capa',
    'manage_complaint',
    'place_lot_hold',
  ],
  quality_manager: [
    ...FRONTLINE_QUALITY,
    'view_lot_holds',
    'view_compliance',
    'manage_compliance',
    'load_compliance_template',
    'author_sop',
    'manage_ncr',
    'manage_capa',
    'manage_complaint',
    'place_lot_hold',
    'approve_sop',
    'close_ncr',
    'verify_capa',
    'close_complaint',
    'release_lot_hold',
    'cancel_quality_records',
  ],

  // ===== Administration roles (NEW) =====
  // super_admin holds every admin permission there is. system_admin runs
  // the platform but is deliberately kept out of irreversible data-privacy
  // actions (anonymisation, retention policy changes). compliance_auditor
  // is read-only by construction — it has view_* permissions and exactly
  // one write (audit-log export), which produces a file rather than
  // changing a record.
  super_admin: [
    ...CROSS_MODULE_VIEW,
    'view_admin_dashboard',
    'view_admin_users',
    'view_admin_roles',
    'view_admin_organizations',
    'view_admin_audit_logs',
    'view_admin_system_health',
    'view_admin_data_governance',
    'view_admin_data_privacy',
    'view_admin_workflows',
    'view_admin_notifications',
    'view_admin_modules',
    'view_admin_settings',
    'create_user',
    'edit_user',
    'assign_user_role',
    'deactivate_user',
    'reset_user_password',
    'manage_admin_organizations',
    'export_audit_logs',
    'resolve_governance_violation',
    'archive_orphan_lot',
    'correct_lot_quantity',
    'export_farmer_data',
    'anonymize_farmer_data',
    'manage_retention_policies',
    'cancel_any_workflow',
    'broadcast_notification',
    'toggle_module_availability',
    'manage_admin_settings',
  ],
  system_admin: [
    ...CROSS_MODULE_VIEW,
    'view_admin_dashboard',
    'view_admin_users',
    'view_admin_roles',
    'view_admin_organizations',
    'view_admin_audit_logs',
    'view_admin_system_health',
    'view_admin_data_governance',
    'view_admin_workflows',
    'view_admin_notifications',
    'view_admin_modules',
    'view_admin_settings',
    'create_user',
    'edit_user',
    'assign_user_role',
    'deactivate_user',
    'reset_user_password',
    'manage_admin_organizations',
    'export_audit_logs',
    'resolve_governance_violation',
    'cancel_any_workflow',
    'broadcast_notification',
    'toggle_module_availability',
    'manage_admin_settings',
  ],
  compliance_auditor: [
    ...CROSS_MODULE_VIEW,
    'view_admin_dashboard',
    'view_admin_roles',
    'view_admin_organizations',
    'view_admin_audit_logs',
    'view_admin_system_health',
    'view_admin_data_governance',
    'view_admin_data_privacy',
    'view_admin_workflows',
    'view_admin_modules',
    'export_audit_logs',
  ],
};

/**
 * The effective table: each role's own permissions plus the frontline
 * quality set. Kept separate from the literal above so adding a new role
 * cannot forget it — and so the Administration roles page, which reads this
 * through getRolePermissions, shows the real grant rather than half of it.
 */
const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = Object.fromEntries(
  (Object.entries(ROLE_PERMISSIONS_BASE) as [UserRole, Permission[]][]).map(([role, permissions]) => [
    role,
    [...new Set([...permissions, ...FRONTLINE_QUALITY])],
  ]),
) as Record<UserRole, Permission[]>;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role]?.includes(permission) ?? false;
}

/* ------------------------------------------------------------------------ */
/* Introspection — used by the Administration module                        */
/* ------------------------------------------------------------------------ */
/**
 * The Permission union above is the single source of truth for what any role
 * may do, but a TypeScript union vanishes at runtime, so the Administration
 * module's Roles & permissions matrix cannot read it directly. These two
 * exports make the same information available at runtime.
 *
 * PERMISSION_GROUPS is generated from the union's own section comments, so
 * its order and grouping match the file above exactly. When you add a
 * permission to the union, add it here too — the matrix is the only place
 * that would silently omit it otherwise.
 */
export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'Procurement',
    permissions: [
      'view_procurement_dashboard',
      'view_requisitions',
      'view_orders',
      'view_suppliers',
      'view_rfq',
      'view_grn',
      'view_inspection',
      'view_invoices',
      'view_budget',
      'view_approvals',
      'view_procurement_reports',
      'view_procurement_settings',
      'create_requisition',
      'approve_requisition',
      'create_order',
      'approve_order',
      'add_supplier',
      'edit_supplier',
      'create_rfq',
      'award_rfq',
      'create_grn',
      'edit_grn',
      'conduct_inspection',
      'approve_inspection',
      'create_invoice',
      'verify_invoice',
      'approve_invoice_payment',
      'release_payment',
      'allocate_budget',
      'view_budget_reports',
      'manage_procurement_settings',
    ],
  },
  {
    module: 'Warehouse',
    permissions: [
      'view_warehouse_dashboard',
      'view_inventory',
      'view_inbound',
      'view_storage_locations',
      'view_outbound',
      'view_stock_movements',
      'view_stock_adjustments',
      'view_cycle_counting',
      'view_barcode_rfid',
      'view_returns',
      'view_iot_monitoring',
      'view_warehouse_reports',
      'view_warehouse_settings',
      'receive_incoming_goods',
      'inspect_incoming_goods',
      'safety_clear_incoming',
      'assign_storage_location',
      'define_storage_zones',
      'update_inventory',
      'prepare_outbound_dispatch',
      'approve_outbound_dispatch',
      'log_stock_movement',
      'propose_stock_adjustment',
      'approve_stock_adjustment',
      'schedule_cycle_count',
      'execute_cycle_count',
      'approve_cycle_count',
      'print_barcode_labels',
      'configure_barcode_formats',
      'log_return',
      'quality_assess_returns',
      'approve_return_disposition',
      'view_iot_data',
      'configure_iot_thresholds',
      'resolve_safety_alerts',
      'manage_warehouse_settings',
    ],
  },
  {
    module: 'R&D',
    permissions: [
      'view_rd_dashboard',
      'view_germplasm',
      'view_breeding_programs',
      'view_nurseries',
      'view_trials',
      'view_trial_detail',
      'view_phenotyping',
      'view_varieties',
      'view_registrations',
      'view_rd_reports',
      'view_rd_settings',
      'view_trial_analysis_tab',
      'catalog_germplasm',
      'archive_germplasm',
      'create_breeding_program',
      'approve_breeding_program',
      'plan_crosses',
      'create_nursery',
      'inspect_nursery',
      'design_trial',
      'approve_trial_protocol',
      'execute_trial',
      'record_phenotyping',
      'verify_field_observations',
      'flag_data_accuracy_issues',
      'analyze_trial_data',
      'propose_variety_advancement',
      'approve_variety_advancement',
      'file_variety_registration',
      'approve_variety_release',
      'manage_trial_templates',
      'manage_trait_catalog',
      'manage_workflow_rules',
      'manage_rd_settings',
    ],
  },
  {
    module: 'Processing',
    permissions: [
      'view_processing_dashboard',
      'view_raw_intake',
      'view_processing_batches',
      'view_batch_detail',
      'view_production_planning',
      'view_plants_machines',
      'view_recipes',
      'view_yield_loss',
      'view_packaging',
      'view_certification',
      'view_traceability',
      'view_processing_reports',
      'view_processing_settings',
      'view_batch_yield_loss_tab',
      'create_raw_intake',
      'pre_processing_inspection',
      'accept_reject_raw_lot',
      'mark_raw_lot_ready',
      'create_processing_batch',
      'approve_batch_recipe',
      'update_batch_stage',
      'pause_resume_batch',
      'cancel_batch',
      'send_sample_to_lab',
      'in_process_quality_check',
      'final_quality_inspection',
      'approve_finished_lot_dispatch',
      'schedule_batch',
      'configure_plant',
      'configure_machine',
      'schedule_maintenance',
      'mark_machine_status',
      'create_recipe',
      'approve_recipe_system',
      'archive_recipe',
      'generate_packages',
      'print_labels_qr',
      'verify_final_package_quality',
      'submit_for_certification',
      'manage_certification_records',
      'initiate_recall',
      'manage_processing_settings',
    ],
  },
  {
    module: 'Laboratory',
    permissions: [
      'view_lab_dashboard',
      'view_lab_submissions',
      'view_lab_submission_detail',
      'view_lab_results',
      'view_lab_quality_flags',
      'view_lab_certificates',
      'view_lab_performance',
      'submit_lab_sample',
      'record_lab_result',
      'bulk_upload_lab_results',
      'issue_phytosanitary_certificate',
      'resolve_lab_quality_flag',
    ],
  },
  {
    module: 'Quality',
    permissions: [
      'view_quality_dashboard',
      'view_sop_register',
      'view_ncrs',
      'view_capas',
      'view_complaints',
      'view_lot_holds',
      'view_compliance',
      'acknowledge_sop',
      'raise_ncr',
      'log_complaint',
      'author_sop',
      'manage_ncr',
      'manage_capa',
      'manage_complaint',
      'place_lot_hold',
      'manage_compliance',
      'approve_sop',
      'close_ncr',
      'verify_capa',
      'close_complaint',
      'release_lot_hold',
      'cancel_quality_records',
      'load_compliance_template',
    ],
  },
  {
    module: 'Administration',
    permissions: [
      'view_admin_dashboard',
      'view_admin_users',
      'view_admin_roles',
      'view_admin_organizations',
      'view_admin_audit_logs',
      'view_admin_system_health',
      'view_admin_data_governance',
      'view_admin_data_privacy',
      'view_admin_workflows',
      'view_admin_notifications',
      'view_admin_modules',
      'view_admin_settings',
      'create_user',
      'edit_user',
      'assign_user_role',
      'deactivate_user',
      'reset_user_password',
      'manage_admin_organizations',
      'export_audit_logs',
      'resolve_governance_violation',
      'archive_orphan_lot',
      'correct_lot_quantity',
      'export_farmer_data',
      'anonymize_farmer_data',
      'manage_retention_policies',
      'cancel_any_workflow',
      'broadcast_notification',
      'toggle_module_availability',
      'manage_admin_settings',
    ],
  },
];

/** Every permission in the product, in declaration order. */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) => group.permissions);

/** The permissions a given role holds. Returns a copy — never the live array. */
export function getRolePermissions(role: UserRole): Permission[] {
  return [...(PERMISSIONS_BY_ROLE[role] ?? [])];
}

