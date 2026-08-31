export type StockStatus = 'Available' | 'Quarantine' | 'Reserved' | 'Damaged' | 'Sold';
export type ValuationMethod = 'FIFO' | 'LIFO' | 'WA';
export type ItemCategory =
  | 'Finished Seeds'
  | 'Raw Material'
  | 'Packaging'
  | 'Chemicals'
  | 'Lab Supplies'
  | 'Equipment';
export type AbcClass = 'A' | 'B' | 'C';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  variety?: string;
  batchNumber: string;
  lotNumber: string;
  quantity: number;
  uom: string;
  location: { warehouse: string; zone: string; rack: string; shelf: string; bin: string };
  status: StockStatus;
  expiryDate: string;
  receivedDate: string;
  valuationMethod: ValuationMethod;
  unitCost: number;
  totalValue: number;
  reorderPoint: number;
  abcClass: AbcClass;
  supplier?: string;
  grnReference?: string;
}

export type AsnStatus = 'Expected' | 'Arrived' | 'Receiving' | 'Completed' | 'Cancelled';
export interface ASN {
  id: string;
  poReference: string;
  supplier: string;
  expectedDate: string;
  expectedTime: string;
  status: AsnStatus;
  items: number;
  totalQuantity: number;
  uom: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  dockAssigned?: string;
  notes?: string;
}

export type PutawayPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type PutawayStatus = 'Pending' | 'In Progress' | 'Completed';
export interface PutawayTask {
  id: string;
  grnReference: string;
  itemName: string;
  sku: string;
  quantity: number;
  uom: string;
  fromLocation: string;
  suggestedLocation: { warehouse: string; zone: string; rack: string; shelf: string; bin: string };
  priority: PutawayPriority;
  status: PutawayStatus;
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
  reasoning?: string;
}

export type MovementType = 'Inbound' | 'Outbound' | 'Transfer' | 'Adjustment';
export interface StockMovement {
  id: string;
  type: MovementType;
  itemName: string;
  sku: string;
  quantity: number;
  uom: string;
  fromLocation?: string;
  toLocation?: string;
  reference: string;
  user: string;
  timestamp: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export interface WarehouseAlert {
  id: string;
  severity: AlertSeverity;
  category: 'Stock' | 'Expiry' | 'Temperature' | 'Capacity' | 'Quality';
  title: string;
  description: string;
  location?: string;
  timeAgo: string;
}

export interface ZoneUtilization {
  zone: string;
  warehouse: string;
  utilizationPct: number;
  capacity: number;
  used: number;
  type: 'ambient' | 'cold' | 'controlled' | 'staging';
  temperature?: number;
  humidity?: number;
}

export interface PendingReceipt {
  id: string;
  grnReference: string;
  supplier: string;
  itemCount: number;
  totalQuantity: number;
  uom: string;
  stagingLocation: string;
  receivedAt: string;
}

export interface MonthlyTrendPoint {
  month: string;
  value: number;
}

export interface CategoryBreakdown {
  category: string;
  value: number;
  percentage: number;
}

export type ZoneType = 'ambient' | 'cold' | 'controlled' | 'staging' | 'quarantine' | 'dispatch';

export interface StorageLocation {
  id: string;
  warehouse: string;
  zone: string;
  zoneType: ZoneType;
  rack: string;
  shelf: string;
  bin: string;
  capacity: number;
  occupied: number;
  occupancyPct: number;
  status: 'Available' | 'Full' | 'Reserved' | 'Blocked';
  currentSku?: string;
  currentItem?: string;
  currentBatch?: string;
  expiryDate?: string;
  lastMovement?: string;
  temperature?: number;
  humidity?: number;
  abcZone?: 'A' | 'B' | 'C';
}

export interface ZoneLayoutShape {
  zone: string;
  zoneType: ZoneType;
  warehouse: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  occupied: number;
  occupancyPct: number;
  temperature?: number;
  humidity?: number;
  topItems: Array<{ sku: string; itemName: string; quantity: number; uom: string; bin: string }>;
}

export interface SlottingRecommendation {
  id: string;
  title: string;
  itemName: string;
  sku: string;
  currentLocation: string;
  suggestedLocation: string;
  reasoning: string;
  impactMetric: string;
  type: 'velocity' | 'expiry' | 'temperature' | 'weight' | 'consolidation';
}

export interface CapacityTrendPoint {
  weekLabel: string;
  values: Record<string, number>;
}

export type DispatchStatus = 'Pending' | 'Picking' | 'Packed' | 'Dispatched' | 'Delivered' | 'Cancelled';
export type PickingStrategy = 'Wave' | 'Batch' | 'Single order';
export type DispatchType = 'Sales order' | 'Material request' | 'Inter-warehouse';

export interface DispatchLineItem {
  sku: string;
  itemName: string;
  batch: string;
  pickFrom: string;
  orderedQty: number;
  pickedQty: number;
  packedQty: number;
  uom: string;
  unitPrice: number;
}

export interface DispatchOrder {
  id: string;
  salesOrderRef: string;
  type: DispatchType;
  consignee: { name: string; address: string; city: string; state: string; phone: string };
  logisticsPartner?: string;
  vehicleNumber?: string;
  driverName?: string;
  expectedDispatchDate: string;
  status: DispatchStatus;
  pickingStrategy: PickingStrategy;
  totalItems: number;
  totalQuantity: number;
  uom: string;
  totalValue: number;
  pickerAssigned?: string;
  packerAssigned?: string;
  documents: { invoice?: string; deliveryChallan?: string; eWayBill?: string };
  lineItems: DispatchLineItem[];
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export type MovementCategory = 'Transfer' | 'Adjustment' | 'Return' | 'Material issue';
export type AdjustmentReason =
  | 'Cycle count variance'
  | 'Damaged goods'
  | 'Expired stock'
  | 'Theft / shrinkage'
  | 'Quality rejection'
  | 'System correction'
  | 'Other';

export type MovementStatus = 'Pending approval' | 'Approved' | 'In transit' | 'Completed' | 'Rejected';

export interface MovementApprovalStep {
  approver: string;
  role: string;
  status: 'approved' | 'pending' | 'rejected';
  timestamp?: string;
  comment?: string;
}

export interface MovementRecord {
  id: string;
  category: MovementCategory;
  subType: string;
  itemName: string;
  sku: string;
  batch: string;
  quantity: number;
  uom: string;
  fromLocation?: string;
  toLocation?: string;
  reason?: AdjustmentReason;
  reasonNotes?: string;
  reference?: string;
  initiatedBy: string;
  approvedBy?: string;
  status: MovementStatus;
  initiatedAt: string;
  completedAt?: string;
  approvalChain?: MovementApprovalStep[];
  varianceValue?: number;
  hasPhotoEvidence?: boolean;
}

export type AdjustmentDirection = 'Increase' | 'Decrease' | 'Replace';
export type AdjustmentImpact = 'Financial' | 'Operational' | 'None';
export type AdjustmentSource = 'Manual' | 'Cycle count' | 'Damage report' | 'Quality rejection' | 'System reconciliation';
export type AdjustmentStatus = 'Draft' | 'Pending approval' | 'Approved' | 'Posted' | 'Rejected';

export interface StockAdjustment {
  id: string;
  itemSku: string;
  itemName: string;
  batch: string;
  location: string;
  direction: AdjustmentDirection;
  systemQty: number;
  actualQty: number;
  varianceQty: number;
  uom: string;
  unitCost: number;
  varianceValue: number;
  reason: AdjustmentReason;
  reasonNotes?: string;
  photos: string[];
  initiatedBy: string;
  initiatedAt: string;
  status: AdjustmentStatus;
  approvalChain: Array<{ approver: string; role: string; status: 'approved' | 'pending' | 'rejected'; timestamp?: string; comment?: string }>;
  source?: AdjustmentSource;
  cycleCountRef?: string;
  postedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
  warehouse: string;
}

export type CountStatus = 'Scheduled' | 'In progress' | 'Pending review' | 'Variance approval' | 'Completed' | 'Cancelled';
export type CountFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'Ad-hoc';
export type CountStrategy = 'ABC-based' | 'Zone-based' | 'Random' | 'Full physical' | 'Specific items';

export interface CountLine {
  id: string;
  itemSku: string;
  itemName: string;
  batch: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
  varianceQty: number;
  countedBy?: string;
  countedAt?: string;
  scanMethod?: 'Barcode' | 'Manual';
  recountRequested: boolean;
  recountedQty?: number;
  status: 'Pending' | 'Counted' | 'Variance' | 'Recount needed' | 'Approved' | 'Posted';
  notes?: string;
}

export interface CycleCount {
  id: string;
  name: string;
  strategy: CountStrategy;
  frequency: CountFrequency;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  status: CountStatus;
  warehouse: string;
  zonesScope: string[];
  abcScope?: ('A' | 'B' | 'C')[];
  assignedCounters: string[];
  totalLines: number;
  countedLines: number;
  variancesFound: number;
  totalVarianceValue: number;
  accuracyPct?: number;
  notes?: string;
  lines: CountLine[];
}

export type LabelType = 'Item' | 'Bin' | 'Location' | 'Pallet' | 'Shipment';
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'QR';
export type ScanDevice = 'Handheld scanner' | 'Mobile phone' | 'Fixed RFID reader' | 'Manual entry';

export interface BarcodeRecord {
  id: string;
  type: LabelType;
  format: BarcodeFormat;
  code: string;
  linkedTo: { kind: LabelType; id: string; label: string };
  generatedAt: string;
  generatedBy: string;
  printedCount: number;
  lastPrintedAt?: string;
  active: boolean;
}

export interface ScanLogEntry {
  id: string;
  timestamp: string;
  user: string;
  device: ScanDevice;
  context: 'Receiving' | 'Putaway' | 'Picking' | 'Packing' | 'Cycle count' | 'Dispatch' | 'Movement';
  barcodeScanned: string;
  resolvedTo: string;
  result: 'Success' | 'Not found' | 'Mismatch' | 'Duplicate';
  contextRef?: string;
}

export type PrintJobStatus = 'Queued' | 'Printing' | 'Completed' | 'Failed';

export interface PrintJob {
  id: string;
  type: LabelType;
  codeCount: number;
  initiatedBy: string;
  initiatedAt: string;
  printer: string;
  status: PrintJobStatus;
  format: BarcodeFormat;
}

export type ScanDeviceStatus = 'Connected' | 'Idle' | 'Offline';

export interface ScanDeviceRecord {
  id: string;
  name: string;
  type: ScanDevice;
  status: ScanDeviceStatus;
  lastSeen: string;
  assignedTo: string;
  defaultZone: string;
  scansToday: number;
  battery?: number;
}

// Returns Management
export type ReturnDirection = 'Customer return' | 'Supplier return';
export type ReturnReason =
  | 'Damaged in transit'
  | 'Quality failure'
  | 'Wrong item shipped'
  | 'Excess quantity'
  | 'Customer cancellation'
  | 'Expired stock'
  | 'Mislabeled'
  | 'Performance complaint'
  | 'Other';
export type ReturnDisposition = 'Restock' | 'Quarantine' | 'Rework' | 'Dispose' | 'Return to supplier' | 'Pending decision';
export type ReturnStatus = 'Initiated' | 'In transit' | 'Received' | 'Inspecting' | 'Disposition pending' | 'Resolved' | 'Cancelled';

export interface ReturnLineItem {
  sku: string;
  itemName: string;
  batch: string;
  originalQty: number;
  returnedQty: number;
  uom: string;
  unitPrice: number;
  conditionAssessment: 'Good' | 'Damaged' | 'Defective' | 'Not assessed';
  itemDisposition: ReturnDisposition;
  inspectionNotes?: string;
}

export interface ReturnRecord {
  id: string;
  direction: ReturnDirection;
  reference: string;
  party: string;
  partyContact?: { person: string; phone: string; email: string };
  initiatedDate: string;
  receivedDate?: string;
  expectedReturnDate?: string;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonNotes?: string;
  totalItems: number;
  totalQuantity: number;
  uom: string;
  totalValue: number;
  disposition: ReturnDisposition;
  initiatedBy: string;
  inspectedBy?: string;
  resolvedBy?: string;
  refundProcessed?: boolean;
  refundAmount?: number;
  creditNoteRef?: string;
  debitNoteRef?: string;
  lineItems: ReturnLineItem[];
  photos: string[];
  notes?: string;
  resolutionTimeline: Array<{ stage: string; timestamp: string; user: string; comment?: string }>;
}
// Reports & Analytics
// Settings
export type WarehouseType = 'Main' | 'Regional' | 'Cold storage' | 'Distribution';

export interface WarehouseConfig {
  id: string;                          // WH-XXX
  name: string;
  code: string;                        // 3-4 letter code
  type: WarehouseType;
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  manager: string;                     // staff name
  managerPhone?: string;
  managerEmail?: string;
  totalCapacity: number;               // bags equivalent
  zonesCount: number;
  currentlyStored?: number;
  active: boolean;
  createdDate: string;
  notes?: string;
  operatingHours?: { open: string; close: string; days: string[] };
}

export interface ItemCategoryConfig {
  id: string;
  name: string;
  description?: string;
  defaultValuationMethod: ValuationMethod;
  defaultZoneType: ZoneType;
  activeItemsCount: number;
  active: boolean;
}

export interface UoMConfig {
  id: string;
  code: string;                        // 'kg', 'bags', 'drums'
  name: string;
  type: 'weight' | 'volume' | 'count' | 'distance';
  conversionToBase: number;            // e.g., 1 bag = 25 kg
  baseUnit?: string;                   // 'kg' for weight types
  usedByItemsCount: number;
  active: boolean;
}

export type WorkflowTrigger =
  | 'GRN created'
  | 'GRN inspected'
  | 'Low stock detected'
  | 'Cycle count variance'
  | 'Adjustment posted'
  | 'Cold zone temperature breach'
  | 'Sensor offline'
  | 'Germination decline alert'
  | 'Dispatch order created'
  | 'Material issue requested'
  | 'Return initiated';

export type WorkflowAction =
  | 'Notify users'
  | 'Auto-approve'
  | 'Auto-reject'
  | 'Block action'
  | 'Create record'
  | 'Trigger maintenance'
  | 'Generate report'
  | 'Send escalation';

export interface WorkflowCondition {
  field: string;                       // 'amount', 'quantity', 'reason', 'severity'
  operator: 'equals' | 'not equals' | 'greater than' | 'less than' | 'between' | 'contains';
  value: string | number;
  value2?: string | number;            // for 'between'
}

export interface WorkflowRule {
  id: string;                          // WR-XXX
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: Array<{ action: WorkflowAction; config: Record<string, any> }>;
  active: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdBy: string;
  createdAt: string;
}

export interface WarehouseRole {
  id: string;
  name: string;                        // 'Warehouse Manager', 'Quality Inspector'
  description: string;
  isSystemRole: boolean;               // true for built-in roles, can't be deleted
  userCount: number;                   // how many users assigned
}

export interface WarehousePermission {
  id: string;
  category: string;                    // 'Receiving', 'Inventory', 'Cycle counting', etc.
  name: string;                        // 'Create GRN', 'Approve variance', etc.
  description: string;
}

export interface RolePermissionMapping {
  roleId: string;
  permissionId: string;
  granted: boolean;
}

export type NotificationChannel = 'Email' | 'SMS' | 'In-app';

export interface NotificationPreference {
  id: string;
  category: string;                    // 'Stock alerts', 'Quality alerts', etc.
  name: string;                        // 'Low stock threshold breached'
  description?: string;
  channels: Record<NotificationChannel, boolean>;
}

export type IntegrationStatus = 'Connected' | 'Not connected' | 'Error' | 'Authentication required';

export interface Integration {
  id: string;
  name: string;
  description: string;
  iconName: string;                    // Lucide icon name
  category: 'Accounting' | 'Compliance' | 'Logistics' | 'Communication' | 'Hardware' | 'Analytics';
  status: IntegrationStatus;
  lastSync?: string;
  configFields?: string[];             // labels for config inputs
  documentation?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;                      // 'Created', 'Modified', 'Deleted', 'Approved', etc.
  entityType: string;                  // 'GRN', 'Cycle count', 'Workflow rule', etc.
  entityId: string;
  details: string;                     // human-readable summary
  ipAddress: string;
  userAgent?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
}

export type SensorType = 'Temperature' | 'Humidity' | 'CO2' | 'Air quality' | 'Door sensor' | 'Power meter';
export type SensorStatus = 'Online' | 'Offline' | 'Warning' | 'Critical' | 'Calibration due';

export interface IoTSensor {
  id: string;                        // SNS-XXXX
  type: SensorType;
  zone: string;
  warehouse: string;
  installedDate: string;
  lastCalibration: string;
  nextCalibration: string;
  status: SensorStatus;
  currentValue: number;
  unit: string;                      // °C, %, ppm, kWh
  thresholdMin?: number;
  thresholdMax?: number;
  rateOfChangeLimit?: number;        // per hour, for trend alerts
  batteryPct?: number;
  signalStrength?: number;           // 0-100
  lastReadingAt: string;
  firmwareVersion?: string;
  model?: string;
}

export interface IoTReading {
  timestamp: string;
  zone: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  energyKwh?: number;
}

export type IoTAlertSeverity = 'critical' | 'warning' | 'info';
export type IoTThresholdViolation = 'above max' | 'below min' | 'rate of change' | 'sensor offline' | 'calibration overdue' | 'battery low';

export interface IoTAlert {
  id: string;                        // IOT-AL-XXXX
  severity: IoTAlertSeverity;
  zone: string;
  sensor: string;                    // sensor ID
  metric: string;                    // 'Temperature', 'Humidity', etc.
  thresholdViolated: IoTThresholdViolation;
  measuredValue: number;
  thresholdValue: number;
  unit: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  notificationsSent: ('SMS' | 'Email' | 'In-app')[];
  durationMinutes?: number;          // how long the violation has lasted
}

export interface GerminationDeclineRecord {
  sku: string;
  itemName: string;
  batch: string;
  zone: string;
  storedSince: string;               // received date
  monthsInStorage: number;
  initialGerminationPct: number;
  currentGerminationPct: number;
  predictedExpiryDate: string;       // when germination drops below 75% threshold
  declineRate: number;               // % per month
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastTestedDate: string;
  historicalReadings: Array<{ month: number; germinationPct: number }>;  // for chart
}

export type MaintenanceType = 'Routine' | 'Calibration' | 'Repair' | 'Inspection' | 'Predictive';
export type MaintenanceStatus = 'Scheduled' | 'In progress' | 'Completed' | 'Overdue' | 'Cancelled';

export interface MaintenanceTask {
  id: string;                        // MNT-XXXX
  asset: string;                     // 'Cold Zone A compressor unit', 'Sensor SNS-0042', etc.
  zone: string;
  taskType: MaintenanceType;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo: string;
  status: MaintenanceStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedDurationHours: number;
  notes?: string;
  triggeredByAlert?: string;         // IoT alert ID if maintenance was triggered by an alert
}

export interface EnergyConsumption {
  zone: string;
  date: string;
  kwh: number;
  costRupees: number;
}

export type ReportCategory = 'Inventory' | 'Operational' | 'Financial' | 'Compliance' | 'Quality' | 'AI insights';
export type MiniPreviewType = 'bar' | 'line' | 'donut' | 'kpi' | 'rings' | 'sparkline';
export type ReportFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
export type ReportFormat = 'PDF' | 'Excel' | 'CSV';

export interface ReportDefinition {
  id: string;                          // RPT-XXXX
  title: string;
  category: ReportCategory;
  description: string;                 // 1-2 lines, used on card
  iconName: string;                    // Lucide icon name string for serialization
  miniPreviewType: MiniPreviewType;
  miniPreviewValue?: string;           // for 'kpi' type
  miniPreviewData?: number[];          // for 'bar', 'line', 'sparkline'
  miniPreviewSegments?: Array<{ label: string; value: number; color: string }>;  // for 'donut'
  lastGenerated?: string;
  saved: boolean;                      // appears in saved reports tab
  hasFullDetailView: boolean;          // false → uses placeholder shell
  scheduled?: { frequency: 'Daily' | 'Weekly' | 'Monthly'; recipients: string[] };
}

export interface ScheduledReport {
  id: string;
  reportId: string;                    // links to ReportDefinition
  reportTitle: string;
  frequency: ReportFrequency;
  dayOfWeek?: number;                  // 0-6 for weekly
  dayOfMonth?: number;                 // for monthly
  timeOfDay: string;                   // 'HH:mm'
  recipients: string[];
  format: ReportFormat;
  active: boolean;
  nextRun: string;
  lastRun?: string;
  createdBy: string;
  createdAt: string;
}

export type AIInsightCategory = 'Demand' | 'Anomaly' | 'Optimization' | 'Risk' | 'Compliance';
export type AIInsightSeverity = 'critical' | 'warning' | 'info' | 'opportunity';

export interface AIInsight {
  id: string;                          // AI-XXXX
  category: AIInsightCategory;
  severity: AIInsightSeverity;
  title: string;                       // headline
  description: string;                 // 2-3 sentences
  generatedAt: string;
  supportingDataType?: MiniPreviewType;
  supportingData?: any;                // chart data for the visualization
  affectedEntities?: Array<{ type: 'sku' | 'zone' | 'supplier' | 'batch'; label: string }>;
  recommendedActions?: Array<{ label: string; route?: string }>;
  dismissed?: boolean;
  saved?: boolean;
}
