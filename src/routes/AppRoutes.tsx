import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const Login = lazy(() => import('@/pages/auth/Login/Login'));
const SignUp = lazy(() => import('@/pages/auth/SignUp/SignUp'));
const ModuleSelection = lazy(() => import('@/pages/dashboard/ModuleSelection/ModuleSelection'));
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const SearchResults = lazy(() => import('@/pages/search/SearchResults'));

// Account — global, not scoped to any one module
const Profile = lazy(() => import('@/pages/account/Profile'));
const AccountSettings = lazy(() => import('@/pages/account/AccountSettings'));

// Procurement
const ProcurementDashboard = lazy(() => import('@/pages/procurement/ProcurementDashboard'));
const PurchaseRequisitions = lazy(() => import('@/pages/procurement/PurchaseRequisitions'));
const PurchaseOrders = lazy(() => import('@/pages/procurement/PurchaseOrders'));
const PurchaseOrderDetail = lazy(() => import('@/pages/procurement/PurchaseOrderDetail'));
const Suppliers = lazy(() => import('@/pages/procurement/Suppliers'));
const SupplierDetail = lazy(() => import('@/pages/procurement/SupplierDetail'));
const RFQQuotations = lazy(() => import('@/pages/procurement/RFQQuotations'));
const RFQDetail = lazy(() => import('@/pages/procurement/RFQDetail'));
const GoodsReceipt = lazy(() => import('@/pages/procurement/GoodsReceipt'));
const GRNDetail = lazy(() => import('@/pages/procurement/GRNDetail'));
const InspectionQuality = lazy(() => import('@/pages/procurement/InspectionQuality'));
const InvoicesPayments = lazy(() => import('@/pages/procurement/InvoicesPayments'));
const BudgetCostControl = lazy(() => import('@/pages/procurement/BudgetCostControl'));
const Approvals = lazy(() => import('@/pages/procurement/Approvals'));
const ProcurementReports = lazy(() => import('@/pages/procurement/ProcurementReports'));
const ProcurementSettings = lazy(() => import('@/pages/procurement/ProcurementSettings'));

// Auth & Portal Special Pages
const Unauthorized = lazy(() => import('@/pages/auth/Unauthorized/Unauthorized'));
const LotAuthenticityVerify = lazy(() => import('@/pages/production/LotAuthenticityVerify'));
const DistributorPortal = lazy(() => import('@/pages/portal/distributor/DistributorPortal'));
const FarmerPortal = lazy(() => import('@/pages/portal/farmer/FarmerPortal'));

// Warehouse
const WarehouseDashboard = lazy(() => import('@/pages/warehouse/WarehouseDashboard'));
const Inventory = lazy(() => import('@/pages/warehouse/Inventory'));
const Inbound = lazy(() => import('@/pages/warehouse/Inbound'));
const StorageLocations = lazy(() => import('@/pages/warehouse/StorageLocations'));
const Outbound = lazy(() => import('@/pages/warehouse/Outbound'));
const StockMovements = lazy(() => import('@/pages/warehouse/StockMovements'));
const StockAdjustments = lazy(() => import('@/pages/warehouse/StockAdjustments'));
const CycleCounting = lazy(() => import('@/pages/warehouse/CycleCounting'));
const BarcodeRFID = lazy(() => import('@/pages/warehouse/BarcodeRFID'));
const ReturnsManagement = lazy(() => import('@/pages/warehouse/ReturnsManagement'));
const IoTMonitoring = lazy(() => import('@/pages/warehouse/IoTMonitoring'));
const WarehouseReports = lazy(() => import('@/pages/warehouse/WarehouseReports'));
const WarehouseSettings = lazy(() => import('@/pages/warehouse/WarehouseSettings'));

// R&D
const RDDashboard = lazy(() => import('../pages/rd/RDDashboard'));
const Germplasm = lazy(() => import('../pages/rd/Germplasm'));
const BreedingPrograms = lazy(() => import('../pages/rd/BreedingPrograms'));
const Nurseries = lazy(() => import('../pages/rd/Nurseries'));
const Trials = lazy(() => import('../pages/rd/Trials'));
const TrialDetail = lazy(() => import('../pages/rd/TrialDetail'));
const Phenotyping = lazy(() => import('../pages/rd/Phenotyping'));
const Varieties = lazy(() => import('../pages/rd/Varieties'));
const Registrations = lazy(() => import('../pages/rd/Registrations'));
const RDReports = lazy(() => import('../pages/rd/RDReports'));
const RDSettings = lazy(() => import('../pages/rd/RDSettings'));

const ProcurementPlaceholder = lazy(() => import('../pages/procurement/Placeholder'));
const WarehousePlaceholder = lazy(() => import('../pages/warehouse/Placeholder'));
const RDPlaceholder = lazy(() => import('../pages/rd/Placeholder'));

// Laboratory module
const LabDashboard = lazy(() => import('@/pages/lab/LabDashboard'));
const SampleSubmissions = lazy(() => import('@/pages/lab/SampleSubmissions'));
const SubmissionDetail = lazy(() => import('@/pages/lab/SubmissionDetail'));
const TestResults = lazy(() => import('@/pages/lab/TestResults'));
const LabQualityFlags = lazy(() => import('@/pages/lab/QualityFlags'));
const LabCertificates = lazy(() => import('@/pages/lab/Certificates'));
const LabPerformance = lazy(() => import('@/pages/lab/LabPerformance'));
const LabPlaceholder = lazy(() => import('@/pages/lab/Placeholder'));

// Processing
const ProcessingDashboard = lazy(() => import('@/pages/processing/ProcessingDashboard/ProcessingDashboard'));
const RawIntake = lazy(() => import('@/pages/processing/RawIntake/RawIntake'));
const ProcessingBatches = lazy(() => import('@/pages/processing/ProcessingBatches/ProcessingBatches'));
const BatchDetail = lazy(() => import('@/pages/processing/BatchDetail/BatchDetail'));
const ProductionPlanning = lazy(() => import('@/pages/processing/ProductionPlanning/ProductionPlanning'));
const PlantsMachines = lazy(() => import('@/pages/processing/PlantsMachines/PlantsMachines'));
const TreatmentsRecipes = lazy(() => import('@/pages/processing/TreatmentsRecipes/TreatmentsRecipes'));
const YieldAndLoss = lazy(() => import('@/pages/processing/YieldAndLoss/YieldAndLoss'));
const Packaging = lazy(() => import('@/pages/processing/Packaging/Packaging'));
const Certification = lazy(() => import('@/pages/processing/Certification/Certification'));
const Traceability = lazy(() => import('@/pages/processing/Traceability/Traceability'));
const ProcessingReports = lazy(() => import('@/pages/processing/ProcessingReports/ProcessingReports'));
const ProcessingSettings = lazy(() => import('@/pages/processing/ProcessingSettings/ProcessingSettings'));
const ProcessingPlaceholder = lazy(() => import('@/pages/processing/Placeholder'));

// Master data
const VarietyList = lazy(() => import('@/pages/master-data/VarietyList'));
const VarietyForm = lazy(() => import('@/pages/master-data/VarietyForm'));
const VarietyDetail = lazy(() => import('@/pages/master-data/VarietyDetail'));
const VarietyApprovalQueue = lazy(() => import('@/pages/master-data/VarietyApprovalQueue'));
const CropList = lazy(() => import('@/pages/master-data/CropList'));
const CropForm = lazy(() => import('@/pages/master-data/CropForm'));
const CropDetail = lazy(() => import('@/pages/master-data/CropDetail'));
const MasterDataReconcile = lazy(() => import('@/pages/master-data/MasterDataReconcile'));
const OrganizationList = lazy(() => import('@/pages/master-data/OrganizationList'));
const OrganizationForm = lazy(() => import('@/pages/master-data/OrganizationForm'));
const OrganizationDetail = lazy(() => import('@/pages/master-data/OrganizationDetail'));
const SeedLotRegister = lazy(() => import('@/pages/master-data/SeedLotRegister'));
const SeedLotForm = lazy(() => import('@/pages/master-data/SeedLotForm'));
const FarmerList = lazy(() => import('@/pages/master-data/FarmerList'));
const FarmerForm = lazy(() => import('@/pages/master-data/FarmerForm'));
const FarmerDetail = lazy(() => import('@/pages/master-data/FarmerDetail'));
const LabList = lazy(() => import('@/pages/master-data/LabList'));
const LabForm = lazy(() => import('@/pages/master-data/LabForm'));
const LabDetail = lazy(() => import('@/pages/master-data/LabDetail'));

// Production
const ProductionDashboard = lazy(() => import('@/pages/dashboard/ProductionDashboard'));
const CropPlanningList = lazy(() => import('@/pages/production/CropPlanningList'));
const CropPlanningForm = lazy(() => import('@/pages/production/CropPlanningForm'));
const CropPlanningDetail = lazy(() => import('@/pages/production/CropPlanningDetail'));
const FarmList = lazy(() => import('@/pages/production/FarmList'));
const FarmForm = lazy(() => import('@/pages/production/FarmForm'));
const FarmDetail = lazy(() => import('@/pages/production/FarmDetail'));
const FarmInspections = lazy(() => import('@/pages/production/FarmInspections'));
const ProductionFarmRegistry = lazy(() => import('@/pages/production/ProductionFarmRegistry'));
const ProductionTargets = lazy(() => import('@/pages/production/ProductionTargets'));
const SeedDemandPlanning = lazy(() => import('@/pages/production/SeedDemandPlanning'));
const SeedLotInventory = lazy(() => import('@/pages/production/SeedLotInventory'));
const SeedLotDetail = lazy(() => import('@/pages/production/SeedLotDetail'));
const SeedLotGenealogy = lazy(() => import('@/pages/production/SeedLotGenealogy'));
const SeedProductionAnalytics = lazy(() => import('@/pages/production/SeedProductionAnalytics'));
const SeedComplianceReport = lazy(() => import('@/pages/production/SeedComplianceReport'));
const SeedProductionWorkflow = lazy(() => import('@/pages/production/SeedProductionWorkflow'));
const SeedFarmerProgram = lazy(() => import('@/pages/production/SeedFarmerProgram'));
const FarmerSeedPortal = lazy(() => import('@/pages/production/FarmerSeedPortal'));
const SeedPackagingLabeling = lazy(() => import('@/pages/production/SeedPackagingLabeling'));
const SeedColdStorage = lazy(() => import('@/pages/production/SeedColdStorage'));
const SeedFeedbackLoop = lazy(() => import('@/pages/production/SeedFeedbackLoop'));
const SeedDataGovernance = lazy(() => import('@/pages/production/SeedDataGovernance'));
const SeedVarietyCatalog = lazy(() => import('@/pages/production/SeedVarietyCatalog'));
const SeedLabTesting = lazy(() => import('@/pages/production/SeedLabTesting'));
const SeedLotSearch = lazy(() => import('@/pages/production/SeedLotSearch'));
const SeedMonitoringDashboard = lazy(() => import('@/pages/production/SeedMonitoringDashboard'));
const SeedDataPrivacy = lazy(() => import('@/pages/production/SeedDataPrivacy'));
const SeedLotAuthenticity = lazy(() => import('@/pages/production/SeedLotAuthenticity'));
const SeedBankPartners = lazy(() => import('@/pages/production/SeedBankPartners'));
const GovernmentPrograms = lazy(() => import('@/pages/production/GovernmentPrograms'));
const MarketIntelligence = lazy(() => import('@/pages/production/MarketIntelligence'));
const BreedingAnalytics = lazy(() => import('@/pages/production/BreedingAnalytics'));
const ClimateSmartSelection = lazy(() => import('@/pages/production/ClimateSmartSelection'));
const SupplyChainFinancing = lazy(() => import('@/pages/production/SupplyChainFinancing'));
const FarmerEducation = lazy(() => import('@/pages/production/FarmerEducation'));
const BatchOperations = lazy(() => import('@/pages/production/BatchOperations'));
const FieldInspectionList = lazy(() => import('@/pages/production/FieldInspectionList'));
const FieldInspectionForm = lazy(() => import('@/pages/production/FieldInspectionForm'));
const FieldInspectionDetail = lazy(() => import('@/pages/production/FieldInspectionDetail'));
const CropLifecycleDetail = lazy(() => import('@/pages/production/CropLifecycleDetail'));
const HarvestRequestForm = lazy(() => import('@/pages/production/HarvestRequestForm'));
const HarvestApprovalList = lazy(() => import('@/pages/production/HarvestApprovalList'));
const HarvestApprovalDetail = lazy(() => import('@/pages/production/HarvestApprovalDetail'));
const HarvestList = lazy(() => import('@/pages/production/HarvestList'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading…</span>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Public — product-wide search works with or without an account.
            Results behind login carry a ?redirect= through the login screen. */}
        <Route path="/search" element={<SearchResults />} />

        {/* Public — reachable by scanning a QR code with no SeedSphere login at all */}
        <Route path="/verify-lot/:certificateId" element={<LotAuthenticityVerify />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/modules" element={<ModuleSelection />} />

          {/* Account — reached from the user menu in TopHeader on every module page */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<AccountSettings />} />

          {/* Procurement */}
          <Route path="/procurement" element={<Navigate to="/procurement/dashboard" replace />} />
          <Route path="/procurement/placeholder" element={<ProcurementPlaceholder />} />

          <Route element={<ProtectedRoute permission="view_procurement_dashboard" />}><Route path="/procurement/dashboard" element={<ProcurementDashboard />} /></Route>
          <Route element={<ProtectedRoute permission="view_requisitions" />}><Route path="/procurement/requisitions" element={<PurchaseRequisitions />} /></Route>
          <Route element={<ProtectedRoute permission="view_orders" />}><Route path="/procurement/orders" element={<PurchaseOrders />} /></Route>
          <Route element={<ProtectedRoute permission="view_orders" />}><Route path="/procurement/orders/:id" element={<PurchaseOrderDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_suppliers" />}><Route path="/procurement/suppliers" element={<Suppliers />} /></Route>
          <Route element={<ProtectedRoute permission="view_suppliers" />}><Route path="/procurement/suppliers/:id" element={<SupplierDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_rfq" />}><Route path="/procurement/rfq" element={<RFQQuotations />} /></Route>
          <Route element={<ProtectedRoute permission="view_rfq" />}><Route path="/procurement/rfq/:id" element={<RFQDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_grn" />}><Route path="/procurement/grn" element={<GoodsReceipt />} /></Route>
          <Route element={<ProtectedRoute permission="view_grn" />}><Route path="/procurement/grn/:id" element={<GRNDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_inspection" />}><Route path="/procurement/inspection" element={<InspectionQuality />} /></Route>
          <Route element={<ProtectedRoute permission="view_invoices" />}><Route path="/procurement/invoices" element={<InvoicesPayments />} /></Route>
          <Route element={<ProtectedRoute permission="view_budget" />}><Route path="/procurement/budget" element={<BudgetCostControl />} /></Route>
          <Route element={<ProtectedRoute permission="view_approvals" />}><Route path="/procurement/approvals" element={<Approvals />} /></Route>
          <Route element={<ProtectedRoute permission="view_procurement_reports" />}><Route path="/procurement/reports" element={<ProcurementReports />} /></Route>
          <Route element={<ProtectedRoute permission="view_procurement_settings" />}><Route path="/procurement/settings" element={<ProcurementSettings />} /></Route>

          {/* External portals */}
          <Route path="/portal/distributor/dashboard" element={<DistributorPortal />} />
          <Route path="/portal/farmer/dashboard" element={<FarmerPortal />} />

          {/* Warehouse */}
          <Route path="/warehouse" element={<Navigate to="/warehouse/dashboard" replace />} />
          <Route path="/warehouse/placeholder" element={<WarehousePlaceholder />} />

          <Route element={<ProtectedRoute permission="view_warehouse_dashboard" />}><Route path="/warehouse/dashboard" element={<WarehouseDashboard />} /></Route>
          <Route element={<ProtectedRoute permission="view_inventory" />}><Route path="/warehouse/inventory" element={<Inventory />} /></Route>
          <Route element={<ProtectedRoute permission="view_inbound" />}><Route path="/warehouse/inbound" element={<Inbound />} /></Route>
          <Route element={<ProtectedRoute permission="view_storage_locations" />}><Route path="/warehouse/locations" element={<StorageLocations />} /></Route>
          <Route element={<ProtectedRoute permission="view_outbound" />}><Route path="/warehouse/outbound" element={<Outbound />} /></Route>
          <Route element={<ProtectedRoute permission="view_stock_movements" />}><Route path="/warehouse/movements" element={<StockMovements />} /></Route>
          <Route element={<ProtectedRoute permission="view_stock_adjustments" />}><Route path="/warehouse/adjustments" element={<StockAdjustments />} /></Route>
          <Route element={<ProtectedRoute permission="view_cycle_counting" />}><Route path="/warehouse/cycle-counting" element={<CycleCounting />} /></Route>
          <Route element={<ProtectedRoute permission="view_barcode_rfid" />}><Route path="/warehouse/barcode" element={<BarcodeRFID />} /></Route>
          <Route element={<ProtectedRoute permission="view_returns" />}><Route path="/warehouse/returns" element={<ReturnsManagement />} /></Route>
          <Route element={<ProtectedRoute permission="view_iot_monitoring" />}><Route path="/warehouse/iot" element={<IoTMonitoring />} /></Route>
          <Route element={<ProtectedRoute permission="view_warehouse_reports" />}><Route path="/warehouse/reports" element={<WarehouseReports />} /></Route>
          <Route element={<ProtectedRoute permission="view_warehouse_settings" />}><Route path="/warehouse/settings" element={<WarehouseSettings />} /></Route>

          {/* R&D */}
          <Route path="/rd" element={<Navigate to="/rd/dashboard" replace />} />
          <Route path="/rd/placeholder" element={<RDPlaceholder />} />

          <Route element={<ProtectedRoute permission="view_rd_dashboard" />}><Route path="/rd/dashboard" element={<RDDashboard />} /></Route>
          <Route element={<ProtectedRoute permission="view_germplasm" />}><Route path="/rd/germplasm" element={<Germplasm />} /></Route>
          <Route element={<ProtectedRoute permission="view_breeding_programs" />}><Route path="/rd/breeding" element={<BreedingPrograms />} /></Route>
          <Route element={<ProtectedRoute permission="view_nurseries" />}><Route path="/rd/nurseries" element={<Nurseries />} /></Route>
          <Route element={<ProtectedRoute permission="view_trials" />}><Route path="/rd/trials" element={<Trials />} /></Route>
          <Route element={<ProtectedRoute permission="view_trial_detail" />}><Route path="/rd/trials/:id" element={<TrialDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_phenotyping" />}><Route path="/rd/phenotyping" element={<Phenotyping />} /></Route>
          <Route element={<ProtectedRoute permission="view_varieties" />}><Route path="/rd/varieties" element={<Varieties />} /></Route>
          <Route element={<ProtectedRoute permission="view_registrations" />}><Route path="/rd/registrations" element={<Registrations />} /></Route>
          <Route element={<ProtectedRoute permission="view_rd_reports" />}><Route path="/rd/reports" element={<RDReports />} /></Route>
          <Route element={<ProtectedRoute permission="view_rd_settings" />}><Route path="/rd/settings" element={<RDSettings />} /></Route>

          {/* ---------------------------- Laboratory ---------------------------- */}
          <Route path="/lab" element={<Navigate to="/lab/dashboard" replace />} />
          <Route path="/lab/placeholder" element={<LabPlaceholder />} />
          <Route element={<ProtectedRoute permission="view_lab_dashboard" />}><Route path="/lab/dashboard" element={<LabDashboard />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_submissions" />}><Route path="/lab/submissions" element={<SampleSubmissions />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_submission_detail" />}><Route path="/lab/submissions/:id" element={<SubmissionDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_results" />}><Route path="/lab/results" element={<TestResults />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_quality_flags" />}><Route path="/lab/quality-flags" element={<LabQualityFlags />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_certificates" />}><Route path="/lab/certificates" element={<LabCertificates />} /></Route>
          <Route element={<ProtectedRoute permission="view_lab_performance" />}><Route path="/lab/performance" element={<LabPerformance />} /></Route>

          {/* Master Data */}
          <Route path="/varieties" element={<VarietyList />} />
          <Route path="/varieties/approval-queue" element={<VarietyApprovalQueue />} />
          <Route path="/varieties/new" element={<VarietyForm />} />
          <Route path="/varieties/:id" element={<VarietyDetail />} />
          <Route path="/varieties/:id/edit" element={<VarietyForm />} />
          <Route path="/crops" element={<CropList />} />
          <Route path="/crops/new" element={<CropForm />} />
          <Route path="/crops/:id" element={<CropDetail />} />
          <Route path="/crops/:id/edit" element={<CropForm />} />
          <Route path="/organizations" element={<OrganizationList />} />
          <Route path="/organizations/new" element={<OrganizationForm />} />
          <Route path="/organizations/:id" element={<OrganizationDetail />} />
          <Route path="/organizations/:id/edit" element={<OrganizationForm />} />
          <Route path="/seed-lots" element={<SeedLotRegister />} />
          <Route path="/seed-lots/new" element={<SeedLotForm />} />
          <Route path="/seed-lots/:id/edit" element={<SeedLotForm />} />
          <Route path="/farmers" element={<FarmerList />} />
          <Route path="/farmers/new" element={<FarmerForm />} />
          <Route path="/farmers/:id" element={<FarmerDetail />} />
          <Route path="/farmers/:id/edit" element={<FarmerForm />} />
          <Route path="/labs" element={<LabList />} />
          <Route path="/labs/new" element={<LabForm />} />
          <Route path="/labs/:id" element={<LabDetail />} />
          <Route path="/labs/:id/edit" element={<LabForm />} />
          <Route path="/master-data/reconcile" element={<MasterDataReconcile />} />

          {/* Production Planning */}
          <Route path="/production/dashboard" element={<ProductionDashboard />} />
          <Route path="/crop-planning" element={<CropPlanningList />} />
          <Route path="/crop-planning/new" element={<CropPlanningForm />} />
          <Route path="/crop-planning/:id" element={<CropPlanningDetail />} />

          {/* Crop Lifecycle */}
          <Route path="/crop-planning/:id/lifecycle" element={<CropLifecycleDetail />} />
          <Route path="/farms/:farmId/lifecycle" element={<CropLifecycleDetail />} />

          {/* Farm Management */}
          <Route path="/farms" element={<FarmList />} />
          <Route path="/farms/new" element={<FarmForm />} />
          <Route path="/farms/:id" element={<FarmDetail />} />
          <Route path="/farms/:id/inspections" element={<FarmInspections />} />

          {/* Seed Production Planning — real backend (see seedLotRealtimeClient.ts): farm registry,
              read-only production targets, demand forecasting and purchase-order resource allocation.
              Additive alongside the existing mock Crop Planning/Farm Management pages above. */}
          <Route path="/farm-registry" element={<ProductionFarmRegistry />} />
          <Route path="/production-targets" element={<ProductionTargets />} />
          <Route path="/demand-forecast" element={<SeedDemandPlanning />} />

          {/* Real-Time Seed Lot Inventory (connects to the seedflow-server backend directly) */}
          <Route path="/seed-lot-inventory" element={<SeedLotInventory />} />
          <Route path="/seed-lot-detail/:id" element={<SeedLotDetail />} />
          <Route path="/seed-lot-genealogy" element={<SeedLotGenealogy />} />
          <Route path="/seed-lot-genealogy/:id" element={<SeedLotGenealogy />} />
          <Route path="/seed-production-analytics" element={<SeedProductionAnalytics />} />
          <Route path="/seed-compliance-report" element={<SeedComplianceReport />} />
          <Route path="/seed-production-workflow" element={<SeedProductionWorkflow />} />
          <Route path="/seed-farmer-program" element={<SeedFarmerProgram />} />
          <Route path="/farmer-seed-portal" element={<FarmerSeedPortal />} />
          <Route path="/seed-packaging-labeling" element={<SeedPackagingLabeling />} />
          <Route path="/seed-cold-storage" element={<SeedColdStorage />} />
          <Route path="/seed-feedback-loop" element={<SeedFeedbackLoop />} />
          <Route path="/seed-data-governance" element={<SeedDataGovernance />} />
          <Route path="/seed-variety-catalog" element={<SeedVarietyCatalog />} />
          <Route path="/seed-lab-testing" element={<SeedLabTesting />} />
          <Route path="/seed-lot-search" element={<SeedLotSearch />} />
          <Route path="/seed-monitoring" element={<SeedMonitoringDashboard />} />
          <Route path="/seed-data-privacy" element={<SeedDataPrivacy />} />
          <Route path="/seed-lot-authenticity" element={<SeedLotAuthenticity />} />
          <Route path="/seed-bank-partners" element={<SeedBankPartners />} />
          <Route path="/government-programs" element={<GovernmentPrograms />} />
          <Route path="/market-intelligence" element={<MarketIntelligence />} />
          <Route path="/breeding-analytics" element={<BreedingAnalytics />} />
          <Route path="/climate-smart-selection" element={<ClimateSmartSelection />} />
          <Route path="/supply-chain-financing" element={<SupplyChainFinancing />} />
          <Route path="/farmer-education" element={<FarmerEducation />} />
          <Route path="/batch-operations" element={<BatchOperations />} />

          {/* Harvest Management */}
          <Route path="/harvests" element={<HarvestList />} />
          <Route path="/harvests/request" element={<HarvestRequestForm />} />
          <Route path="/harvests/approval" element={<HarvestApprovalList />} />
          <Route path="/harvests/approval/:id" element={<HarvestApprovalDetail />} />

          {/* Field Inspection */}
          <Route path="/inspections" element={<FieldInspectionList />} />
          <Route path="/inspections/new" element={<FieldInspectionForm />} />
          <Route path="/inspections/:id" element={<FieldInspectionDetail />} />

          {/* Processing */}
          <Route path="/processing" element={<Navigate to="/processing/dashboard" replace />} />
          <Route path="/processing/placeholder" element={<ProcessingPlaceholder />} />

          <Route element={<ProtectedRoute permission="view_processing_dashboard" />}><Route path="/processing/dashboard" element={<ProcessingDashboard />} /></Route>
          <Route element={<ProtectedRoute permission="view_raw_intake" />}><Route path="/processing/intake" element={<RawIntake />} /></Route>
          <Route element={<ProtectedRoute permission="view_processing_batches" />}><Route path="/processing/batches" element={<ProcessingBatches />} /></Route>
          <Route element={<ProtectedRoute permission="view_batch_detail" />}><Route path="/processing/batches/:id" element={<BatchDetail />} /></Route>
          <Route element={<ProtectedRoute permission="view_production_planning" />}><Route path="/processing/planning" element={<ProductionPlanning />} /></Route>
          <Route element={<ProtectedRoute permission="view_plants_machines" />}><Route path="/processing/plants" element={<PlantsMachines />} /></Route>
          <Route element={<ProtectedRoute permission="view_recipes" />}><Route path="/processing/recipes" element={<TreatmentsRecipes />} /></Route>
          <Route element={<ProtectedRoute permission="view_yield_loss" />}><Route path="/processing/yield" element={<YieldAndLoss />} /></Route>
          <Route element={<ProtectedRoute permission="view_packaging" />}><Route path="/processing/packaging" element={<Packaging />} /></Route>
          <Route element={<ProtectedRoute permission="view_certification" />}><Route path="/processing/certification" element={<Certification />} /></Route>
          <Route element={<ProtectedRoute permission="view_traceability" />}><Route path="/processing/traceability" element={<Traceability />} /></Route>
          <Route element={<ProtectedRoute permission="view_processing_reports" />}><Route path="/processing/reports" element={<ProcessingReports />} /></Route>
          <Route element={<ProtectedRoute permission="view_processing_settings" />}><Route path="/processing/settings" element={<ProcessingSettings />} /></Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
