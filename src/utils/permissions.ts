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
  | 'resolve_lab_quality_flag';

const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
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
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role]?.includes(permission) ?? false;
}
