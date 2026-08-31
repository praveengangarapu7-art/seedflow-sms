import { AuditLogEntry, ApprovalWorkflow } from '@/types/procurement';

export const mockWorkflows: ApprovalWorkflow[] = [
  {
    id: 'WF-001',
    name: 'PR Auto-Approve (< ₹10K)',
    appliesTo: 'PR',
    threshold: 10000,
    steps: [],
    active: true
  },
  {
    id: 'WF-002',
    name: 'Standard PR Approval (₹10K-₹1L)',
    appliesTo: 'PR',
    threshold: 100000,
    steps: [
      { stepNumber: 1, approverRole: 'Manager' },
      { stepNumber: 2, approverRole: 'Department Head' }
    ],
    active: true
  },
  {
    id: 'WF-003',
    name: 'High Value PR (₹1L-₹10L)',
    appliesTo: 'PR',
    threshold: 1000000,
    steps: [
      { stepNumber: 1, approverRole: 'Manager' },
      { stepNumber: 2, approverRole: 'Department Head' },
      { stepNumber: 3, approverRole: 'Procurement Head' }
    ],
    active: true
  },
  {
    id: 'WF-004',
    name: 'Critical PO (> ₹10L)',
    appliesTo: 'PO',
    threshold: 1000000,
    steps: [
      { stepNumber: 1, approverRole: 'Manager' },
      { stepNumber: 2, approverRole: 'Department Head' },
      { stepNumber: 3, approverRole: 'Procurement Head' },
      { stepNumber: 4, approverRole: 'CFO' }
    ],
    active: true
  }
];

export const mockAuditLogs: AuditLogEntry[] = Array.from({ length: 30 }).map((_, i) => {
  const actions = ['Created', 'Updated', 'Approved', 'Rejected', 'Deleted', 'Logged In', 'Exported Report'];
  const entities = ['Purchase Requisition', 'Purchase Order', 'Invoice', 'Supplier', 'User', 'Settings', 'Report'];
  const users = ['Priya Sharma', 'Rahul Desai', 'Vikram Singh', 'Admin', 'System'];
  
  const date = new Date();
  date.setHours(date.getHours() - Math.floor(Math.random() * 72)); // random time in last 3 days
  
  return {
    id: `LOG-${1000 + i}`,
    timestamp: date.toISOString().replace('T', ' ').substring(0, 16),
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    entity: entities[Math.floor(Math.random() * entities.length)],
    entityId: `REF-${2000 + i}`,
    details: 'User performed an action on the system. Status updated successfully.',
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`
  };
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
