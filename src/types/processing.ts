export type IntakeStatus = 'Pending QC' | 'Accepted' | 'Reprocess' | 'Rejected';

export interface RawIntake {
  id: string; // e.g., LOT-COT-2026-0142
  sourceType: 'Contract Farm' | 'R&D Unit' | 'Warehouse Transfer' | 'Direct Farmer';
  sourceName: string;
  farmerName?: string;
  plotId?: string;
  crop: string;
  variety: string;
  season: string;
  receivingPlant: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  arrivalTime: string;
  grossWeight: number; // kg
  tareWeight: number; // kg
  netWeight: number; // kg
  weighbridgeTicket: string;
  moisture: number; // %
  impurity: number; // %
  notes?: string;
  status: IntakeStatus;
  grnRef?: string;
}

export type BatchStage =
  | 'Planned'
  | 'Cleaning'
  | 'Drying'
  | 'Grading'
  | 'Treatment'
  | 'Packaging'
  | 'Completed'
  | 'Rejected';

export interface BatchStageLog {
  stage: BatchStage;
  timestamp: string;
  durationHours: number;
  operator: string;
  parameters: Record<string, string | number>;
}

export interface BatchQualityCheck {
  inspectorName: string;
  timestamp: string;
  moisture: number;
  purity: number;
  vigor?: string;
  visualNotes?: string;
  decision: 'Pass' | 'Fail' | 'Partial';
}

export interface BatchLabResult {
  sampleId: string;
  sentDate: string;
  receivedDate?: string;
  status: 'Pending' | 'Passed' | 'Failed';
  germination?: number; // %
  purity?: number; // %
  moisture?: number; // %
  vigor?: string;
  decision?: 'Pass' | 'Fail';
}

export interface ProcessingBatch {
  id: string; // e.g. BT-2026-1142
  sourceLots: string[]; // LOT-COT-2026-0142 etc.
  crop: string;
  variety: string;
  plant: string;
  inputQuantity: number; // kg
  currentStage: BatchStage;
  progress: number; // 0-100
  startedDate?: string;
  expectedCompletion?: string;
  outputQuantity?: number;
  recipeId: string;
  targetGrade: 'Foundation Seed' | 'Certified Seed' | 'Truthful Label';
  operator: string;
  operatorAvatar?: string;
  status: 'Planned' | 'In Progress' | 'Quality Hold' | 'Completed' | 'Rejected';
  stageHistory: BatchStageLog[];
  qualityCheckpoints: {
    pre?: BatchQualityCheck;
    inProcess?: BatchQualityCheck;
    final?: BatchQualityCheck;
  };
  labResults: BatchLabResult[];
  losses: {
    cleaning: number;
    drying: number;
    grading: number;
    treatment: number;
    rejected: number;
  };
}

export interface Plant {
  id: string; // e.g. PL-AUR
  name: string;
  location: string;
  state: string;
  manager: string;
  status: 'Operational' | 'Limited Capacity' | 'Maintenance';
  activeMachinesCount: number;
  activeBatchesCount: number;
  utilizationRate: number; // %
}

export type MachineType = 'Cleaner' | 'Dryer' | 'Grader' | 'Treater' | 'Packager';
export type MachineStatus = 'Running' | 'Idle' | 'Maintenance' | 'Down';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  plantId: string;
  manufacturer: string;
  capacity: string; // e.g. 5 tonnes/day
  status: MachineStatus;
  currentBatchId?: string;
  utilization30Days: number; // %
  lastServiceDate: string;
  nextServiceDue: string;
}

export interface ChemicalRequirement {
  chemical: string;
  dosage: number; // g/kg or ml/kg
  order: number;
}

export interface TreatmentRecipe {
  id: string;
  name: string;
  crop: string;
  variety: string;
  targetGrade: 'Foundation Seed' | 'Certified Seed' | 'Truthful Label';
  description: string;
  cleaningParams: {
    enabled: boolean;
    airFlowRate: number; // m3/min
    meshSize: string;
    targetPurity: number; // %
  };
  dryingParams: {
    enabled: boolean;
    tempMin: number;
    tempMax: number;
    targetMoisture: number; // %
    maxDurationHours: number;
  };
  gradingParams: {
    enabled: boolean;
    sieveSizeR1: string;
    sieveSizeR2: string;
  };
  treatmentParams: {
    enabled: boolean;
    chemicals: ChemicalRequirement[];
  };
  packagingParams: {
    enabled: boolean;
    allowedPackSizes: string[];
  };
  createdBy: string;
  approvedBy?: string;
  status: 'Active' | 'Draft' | 'Pending Approval' | 'Archived';
  timesUsed: number;
}

export interface ProductionSchedule {
  id: string;
  batchId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plantId: string;
  machineIds: string[];
  variety: string;
  qty: number;
  status: 'Planned' | 'Confirmed' | 'In Progress' | 'Completed';
}

export interface PackageRun {
  id: string; // PKG-BT-2026-1142-0001
  batchId: string;
  crop: string;
  variety: string;
  packSize: string; // e.g. 1kg, 5kg
  unitsPacked: number;
  totalWeight: number; // kg
  labelIssueDate: string;
  qrCodeStatus: 'Generated' | 'Printed' | 'Applied';
  certificationLevel: 'Foundation' | 'Certified' | 'Truthful Label';
  status: 'Created' | 'Labeled' | 'Stored' | 'Dispatched';
}

export interface CertificationRecord {
  id: string; // CERT-MH-2026-0142
  lotId: string; // Batch or Lot ID
  crop: string;
  variety: string;
  level: 'Foundation' | 'Certified' | 'Truthful Label';
  authority: string;
  issueDate: string;
  expiryDate: string;
  fieldInspectionDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Recalled';
  certificateUrl?: string;
}
