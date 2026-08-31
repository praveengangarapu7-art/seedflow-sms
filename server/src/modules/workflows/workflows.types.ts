export const WORKFLOW_STAGE_KEYS = [
  'FOUNDATION_LOT',
  'PRE_CERTIFIED_INSPECTION',
  'CERTIFIED_PRODUCTION',
  'QUALITY_TESTING',
  'MARKET_READY_RELEASE',
] as const;

export type WorkflowStageKey = (typeof WORKFLOW_STAGE_KEYS)[number];

export interface WorkflowStageDefinition {
  key: WorkflowStageKey;
  sequence: number;
  label: string;
  department: string;
  approverRoles: string[];
  durationDays: number;
}

// The pipeline itself: order, owning department, who may approve/reject
// that stage, and how many days it's expected to take (drives the
// due_at timeline-compliance check).
export const WORKFLOW_STAGE_DEFINITIONS: WorkflowStageDefinition[] = [
  {
    key: 'FOUNDATION_LOT',
    sequence: 1,
    label: 'Foundation Lot',
    department: 'Production',
    approverRoles: ['Admin', 'Breeder', 'Producer'],
    durationDays: 0,
  },
  {
    key: 'PRE_CERTIFIED_INSPECTION',
    sequence: 2,
    label: 'Pre-Certified Inspection',
    department: 'Inspection',
    approverRoles: ['Admin', 'Inspector'],
    durationDays: 7,
  },
  {
    key: 'CERTIFIED_PRODUCTION',
    sequence: 3,
    label: 'Certified Production',
    department: 'Production',
    approverRoles: ['Admin', 'Breeder', 'Producer'],
    durationDays: 30,
  },
  {
    key: 'QUALITY_TESTING',
    sequence: 4,
    label: 'Quality Testing',
    department: 'Quality',
    approverRoles: ['Admin', 'Inspector'],
    durationDays: 14,
  },
  {
    key: 'MARKET_READY_RELEASE',
    sequence: 5,
    label: 'Market-Ready Release',
    department: 'Marketing',
    approverRoles: ['Admin', 'Warehouse Manager'],
    durationDays: 7,
  },
];

export function stageDefinition(key: WorkflowStageKey): WorkflowStageDefinition {
  const definition = WORKFLOW_STAGE_DEFINITIONS.find((stage) => stage.key === key);
  if (!definition) throw new Error(`Unknown workflow stage: ${key}`);
  return definition;
}

export interface WorkflowInstanceRow {
  id: string;
  seed_lot_id: string;
  certified_lot_id: string | null;
  status: string;
  started_by: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageRow {
  id: string;
  workflow_id: string;
  stage_key: WorkflowStageKey;
  sequence: number;
  department: string;
  status: string;
  started_at: string | null;
  due_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithStages extends WorkflowInstanceRow {
  stages: WorkflowStageRow[];
}
