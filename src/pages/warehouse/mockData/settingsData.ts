import type { 
  WarehouseConfig, 
  ItemCategoryConfig, 
  UoMConfig, 
  WorkflowRule, 
  WarehouseRole, 
  WarehousePermission, 
  RolePermissionMapping, 
  NotificationPreference, 
  Integration, 
  AuditLogEntry 
} from '@/types/warehouse';

export const warehouses: WarehouseConfig[] = [
  {
    id: 'WH-001',
    name: 'Telangana Main',
    code: 'TG-MAIN',
    type: 'Main',
    address: { line1: 'Survey No. 42, Jeedimetla Industrial Area', city: 'Hyderabad', state: 'Telangana', pincode: '500055' },
    manager: 'Rajesh Kumar',
    managerPhone: '+91 98480 12345',
    managerEmail: 'rajesh.kumar@seedflow.in',
    totalCapacity: 48000,
    currentlyStored: 38400,
    zonesCount: 12,
    active: true,
    createdDate: '12 Jan 2024',
    operatingHours: { open: '08:00', close: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
  },
  {
    id: 'WH-002',
    name: 'Karnataka',
    code: 'KA-RGNL',
    type: 'Regional',
    address: { line1: 'Plot 15, KIADB Industrial Area, Peenya', city: 'Bangalore', state: 'Karnataka', pincode: '560058' },
    manager: 'Priya Sharma',
    managerPhone: '+91 99000 54321',
    managerEmail: 'priya.sharma@seedflow.in',
    totalCapacity: 24000,
    currentlyStored: 15600,
    zonesCount: 8,
    active: true,
    createdDate: '15 Feb 2024',
    operatingHours: { open: '09:00', close: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
  },
  {
    id: 'WH-003',
    name: 'Maharashtra',
    code: 'MH-DIST',
    type: 'Distribution',
    address: { line1: 'Gat No. 234, Wagholi-Ahmednagar Road', city: 'Pune', state: 'Maharashtra', pincode: '412207' },
    manager: 'Vikram Singh',
    managerPhone: '+91 98220 98765',
    managerEmail: 'vikram.singh@seedflow.in',
    totalCapacity: 18000,
    currentlyStored: 12600,
    zonesCount: 6,
    active: true,
    createdDate: '20 Mar 2024',
    operatingHours: { open: '08:00', close: '22:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  },
  {
    id: 'WH-004',
    name: 'Tamil Nadu Cold Storage',
    code: 'TN-COLD',
    type: 'Cold storage',
    address: { line1: 'SF No. 128, Pollachi Main Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641021' },
    manager: 'Anand Murthy',
    managerPhone: '+91 94440 11223',
    managerEmail: 'anand.murthy@seedflow.in',
    totalCapacity: 12000,
    currentlyStored: 9600,
    zonesCount: 4,
    active: true,
    createdDate: '05 Apr 2024',
    operatingHours: { open: '00:00', close: '23:59', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  }
];

export const itemCategories: ItemCategoryConfig[] = [
  { id: 'CAT-01', name: 'Finished Seeds', description: 'Processed and packaged seeds ready for sale', defaultValuationMethod: 'FIFO', defaultZoneType: 'cold', activeItemsCount: 412, active: true },
  { id: 'CAT-02', name: 'Raw Material', description: 'Unprocessed seeds and raw components', defaultValuationMethod: 'FIFO', defaultZoneType: 'ambient', activeItemsCount: 187, active: true },
  { id: 'CAT-03', name: 'Packaging', description: 'Bags, labels, and boxes', defaultValuationMethod: 'WA', defaultZoneType: 'ambient', activeItemsCount: 56, active: true },
  { id: 'CAT-04', name: 'Chemicals', description: 'Fungicides, insecticides, and treatments', defaultValuationMethod: 'WA', defaultZoneType: 'controlled', activeItemsCount: 124, active: true },
  { id: 'CAT-05', name: 'Lab Supplies', description: 'Reagents, kits, and testing equipment', defaultValuationMethod: 'FIFO', defaultZoneType: 'controlled', activeItemsCount: 68, active: true },
  { id: 'CAT-06', name: 'Equipment', description: 'Machinery and tools', defaultValuationMethod: 'FIFO', defaultZoneType: 'staging', activeItemsCount: 24, active: true }
];

export const uomList: UoMConfig[] = [
  { id: 'UOM-01', code: 'kg', name: 'Kilograms', type: 'weight', conversionToBase: 1, usedByItemsCount: 412, active: true },
  { id: 'UOM-02', code: 'bags', name: 'Bags (25kg)', type: 'count', conversionToBase: 25, baseUnit: 'kg', usedByItemsCount: 856, active: true },
  { id: 'UOM-03', code: 'drums', name: 'Drums (10L)', type: 'count', conversionToBase: 10, baseUnit: 'liters', usedByItemsCount: 124, active: true },
  { id: 'UOM-04', code: 'kits', name: 'Kits', type: 'count', conversionToBase: 1, usedByItemsCount: 68, active: true },
  { id: 'UOM-05', code: 'pcs', name: 'Pieces', type: 'count', conversionToBase: 1, usedByItemsCount: 56, active: true },
  { id: 'UOM-06', code: 'units', name: 'Units', type: 'count', conversionToBase: 1, usedByItemsCount: 24, active: true },
  { id: 'UOM-07', code: 'liters', name: 'Liters', type: 'volume', conversionToBase: 1, usedByItemsCount: 96, active: true },
  { id: 'UOM-08', code: 'ml', name: 'Milliliters', type: 'volume', conversionToBase: 0.001, baseUnit: 'liters', usedByItemsCount: 32, active: true }
];

export const workflowRules: WorkflowRule[] = [
  {
    id: 'WR-001',
    name: 'Auto-approve cycle count variances under ₹5K',
    description: 'Automatically approve variances if the total value is below threshold',
    trigger: 'Cycle count variance',
    conditions: [{ field: 'amount', operator: 'less than', value: 5000 }],
    conditionLogic: 'AND',
    actions: [{ action: 'Auto-approve', config: {} }],
    active: true,
    triggerCount: 14,
    createdBy: 'Admin',
    createdAt: '10 Jan 2024'
  },
  {
    id: 'WR-002',
    name: 'Notify manager on cold zone temperature breach',
    description: 'Alert relevant personnel when temperature exceeds limits',
    trigger: 'Cold zone temperature breach',
    conditions: [{ field: 'severity', operator: 'equals', value: 'critical' }],
    conditionLogic: 'AND',
    actions: [{ action: 'Notify users', config: { recipients: ['Warehouse Manager'], channels: ['Email', 'SMS', 'In-app'] } }],
    active: true,
    triggerCount: 4,
    createdBy: 'Admin',
    createdAt: '12 Jan 2024'
  },
  {
    id: 'WR-003',
    name: 'Auto-trigger PR when stock below reorder point',
    description: 'Create a purchase requisition when inventory levels are low',
    trigger: 'Low stock detected',
    conditions: [{ field: 'quantity', operator: 'less than', value: 'reorderPoint' }],
    conditionLogic: 'AND',
    actions: [
      { action: 'Create record', config: { type: 'Purchase requisition' } },
      { action: 'Notify users', config: { recipients: ['Procurement Team'], channels: ['In-app'] } }
    ],
    active: true,
    triggerCount: 23,
    createdBy: 'Admin',
    createdAt: '15 Jan 2024'
  },
  {
    id: 'WR-004',
    name: 'Block dispatch if FEFO override without approval',
    trigger: 'Dispatch order created',
    conditions: [{ field: 'reason', operator: 'contains', value: 'FEFO override' }],
    conditionLogic: 'AND',
    actions: [
      { action: 'Block action', config: { reason: 'FEFO override requires manager approval' } },
      { action: 'Notify users', config: { recipients: ['Warehouse Manager'], channels: ['In-app'] } }
    ],
    active: true,
    triggerCount: 2,
    createdBy: 'Admin',
    createdAt: '20 Jan 2024'
  },
  {
    id: 'WR-005',
    name: 'Auto-quarantine items with quality score below 70',
    trigger: 'GRN inspected',
    conditions: [{ field: 'score', operator: 'less than', value: 70 }],
    conditionLogic: 'AND',
    actions: [
      { action: 'Create record', config: { type: 'Stock movement', to: 'Quarantine' } },
      { action: 'Notify users', config: { recipients: ['Quality Team'], channels: ['Email'] } }
    ],
    active: true,
    triggerCount: 8,
    createdBy: 'Admin',
    createdAt: '25 Jan 2024'
  }
];

export const warehouseRoles: WarehouseRole[] = [
  { id: 'ROLE-01', name: 'Warehouse Manager', description: 'Full control over warehouse operations', isSystemRole: true, userCount: 4 },
  { id: 'ROLE-02', name: 'Warehouse Staff', description: 'Daily operational tasks', isSystemRole: true, userCount: 12 },
  { id: 'ROLE-03', name: 'Quality Inspector', description: 'Quality checks and inspections', isSystemRole: true, userCount: 3 },
  { id: 'ROLE-04', name: 'Dispatch Operator', description: 'Outbound operations', isSystemRole: true, userCount: 6 },
  { id: 'ROLE-05', name: 'Procurement Manager', description: 'Procurement and stock viewing', isSystemRole: true, userCount: 2 },
  { id: 'ROLE-06', name: 'Auditor', description: 'Read-only access to all records', isSystemRole: true, userCount: 2 },
  { id: 'ROLE-07', name: 'Cold Chain Specialist', description: 'IoT and temperature monitoring', isSystemRole: false, userCount: 1 }
];

export const warehousePermissions: WarehousePermission[] = [
  { id: 'PERM-01', category: 'Receiving', name: 'Create GRN', description: 'Ability to create Goods Receipt Notes' },
  { id: 'PERM-02', category: 'Receiving', name: 'Approve GRN', description: 'Final approval of received goods' },
  { id: 'PERM-03', category: 'Receiving', name: 'Inspect quality', description: 'Enter quality inspection results' },
  { id: 'PERM-04', category: 'Inventory', name: 'View inventory', description: 'Access inventory levels and locations' },
  { id: 'PERM-05', category: 'Inventory', name: 'Adjust stock', description: 'Manual stock adjustments' },
  { id: 'PERM-06', category: 'Cycle counting', name: 'Schedule counts', description: 'Plan and schedule cycle counts' },
  { id: 'PERM-07', category: 'Cycle counting', name: 'Approve variance', description: 'Approve stock variances' },
  { id: 'PERM-08', category: 'Outbound', name: 'Create dispatch', description: 'Create dispatch orders' },
  { id: 'PERM-09', category: 'Settings', name: 'Manage warehouses', description: 'Configure warehouse metadata' },
  { id: 'PERM-10', category: 'Settings', name: 'Manage workflows', description: 'Configure automation rules' }
];

const generateMapping = () => {
  const mapping: RolePermissionMapping[] = [];
  warehouseRoles.forEach(role => {
    warehousePermissions.forEach(perm => {
      let granted = false;
      if (role.name === 'Warehouse Manager') granted = true;
      else if (role.name === 'Auditor') granted = perm.name.startsWith('View');
      else if (role.name === 'Warehouse Staff' && ['Create GRN', 'View inventory', 'Inspect quality'].includes(perm.name)) granted = true;
      mapping.push({ roleId: role.id, permissionId: perm.id, granted });
    });
  });
  return mapping;
};

export const rolePermissionMappings = generateMapping();

export const notificationPreferences: NotificationPreference[] = [
  { id: 'NOTIF-01', category: 'Stock alerts', name: 'Low stock threshold breached', channels: { Email: true, SMS: false, 'In-app': true } },
  { id: 'NOTIF-02', category: 'Quality alerts', name: 'GRN quality rejection', channels: { Email: true, SMS: true, 'In-app': true } },
  { id: 'NOTIF-03', category: 'Cold chain alerts', name: 'Temperature excursion', channels: { Email: true, SMS: true, 'In-app': true } },
  { id: 'NOTIF-04', category: 'Workflow alerts', name: 'Cycle count assigned to me', channels: { Email: false, SMS: false, 'In-app': true } }
];

export const integrations: Integration[] = [
  { id: 'INT-01', name: 'Tally Prime', description: 'Sync stock value to GL', iconName: 'CreditCard', category: 'Accounting', status: 'Connected', lastSync: '12 min ago' },
  { id: 'INT-02', name: 'GST e-way bill portal', description: 'Auto-generate e-way bills on dispatch', iconName: 'FileText', category: 'Compliance', status: 'Connected', lastSync: '1h ago' },
  { id: 'INT-03', name: 'Blue Dart API', description: 'Tracking integration', iconName: 'Truck', category: 'Logistics', status: 'Connected', lastSync: '30 min ago' },
  { id: 'INT-04', name: 'IoT sensor platform', description: 'Real-time sensor data ingestion', iconName: 'Cpu', category: 'Hardware', status: 'Connected', lastSync: '2 min ago' },
  { id: 'INT-05', name: 'RFID reader gateway', description: 'Connection lost 2 hrs ago', iconName: 'Zap', category: 'Hardware', status: 'Error' }
];

export const auditLogEntries: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: '24 Apr 2026, 11:30 AM',
    user: 'Rajesh Kumar',
    userRole: 'Warehouse Manager',
    action: 'Modified',
    entityType: 'Workflow rule',
    entityId: 'WR-001',
    details: 'Updated threshold for cycle count auto-approval from ₹2K to ₹5K',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'LOG-002',
    timestamp: '24 Apr 2026, 10:15 AM',
    user: 'Priya Sharma',
    userRole: 'Warehouse Manager',
    action: 'Created',
    entityType: 'GRN',
    entityId: 'GRN-2026-0452',
    details: 'Created new GRN for Cotton Seeds (Lot B-12)',
    ipAddress: '192.168.2.110'
  }
];
