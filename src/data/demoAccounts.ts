import type { UserRole } from '@/types';
import { PROCUREMENT_ROLES, WAREHOUSE_ROLES, RD_ROLES, PROCESSING_ROLES, LAB_ROLES, QUALITY_ROLES, ADMIN_ROLES } from '@/types';

/**
 * The demo staff directory, shared rather than owned by the login screen.
 *
 * The Access denied screen needs exactly what the login screen needs — which
 * module a role belongs to, and which demo employees hold it — so that a
 * person who opens a module they cannot reach is told which login WOULD reach
 * it, instead of just being turned away.
 */

/** The password every demo account shares. */
export const DEMO_PASSWORD = 'password123';

/** One demo employee. Several employees share a role, so picking a role shows
 *  that role's short staff list rather than the whole company. */
export interface DemoAccount {
  name: string;
  empId: string;
  location: string;
  email: string;
  /** Only set when an account deliberately differs from DEMO_PASSWORD. */
  password?: string;
}

/**
 * Demo staff directory keyed by role. The first employee of a role is the one
 * pre-filled when that role is picked; the rest are alternates the demo user
 * can switch to without leaving the role.
 */
export const DEMO_ACCOUNTS_BY_ROLE: Record<UserRole, DemoAccount[]> = {
  purchase_executive: [
    { name: 'Aarav Mehta', empId: 'EMP-PRC-101', location: 'Hyderabad', email: 'executive@seedsphere.com' },
    { name: 'Sneha Kulkarni', empId: 'EMP-PRC-102', location: 'Pune', email: 'executive2@seedsphere.com' },
    { name: 'Rahul Bansal', empId: 'EMP-PRC-103', location: 'Ludhiana', email: 'executive3@seedsphere.com' },
  ],
  purchase_manager: [
    { name: 'Priya Sharma', empId: 'EMP-PRC-201', location: 'Hyderabad', email: 'manager@seedsphere.com' },
    { name: 'Nikhil Ahuja', empId: 'EMP-PRC-202', location: 'Jaipur', email: 'manager2@seedsphere.com' },
    { name: 'Divya Menon', empId: 'EMP-PRC-203', location: 'Coimbatore', email: 'manager3@seedsphere.com' },
  ],
  finance_manager: [
    { name: 'Rohan Verma', empId: 'EMP-PRC-301', location: 'Hyderabad', email: 'finance@seedsphere.com' },
    { name: 'Lakshmi Narayan', empId: 'EMP-PRC-302', location: 'Bengaluru', email: 'finance2@seedsphere.com' },
    { name: 'Imran Qureshi', empId: 'EMP-PRC-303', location: 'Lucknow', email: 'finance3@seedsphere.com' },
  ],
  procurement_quality_field_inspector: [
    { name: 'Sanjay Iyer', empId: 'EMP-PRC-401', location: 'Guntur', email: 'inspector@seedsphere.com' },
    { name: 'Ritu Chandra', empId: 'EMP-PRC-402', location: 'Nashik', email: 'inspector2@seedsphere.com' },
    { name: 'Mahesh Yadav', empId: 'EMP-PRC-403', location: 'Indore', email: 'inspector3@seedsphere.com' },
  ],
  warehouse_supervisor: [
    { name: 'Vikram Nair', empId: 'EMP-WH-101', location: 'Hyderabad', email: 'supervisor@seedsphere.com' },
    { name: 'Farida Sheikh', empId: 'EMP-WH-102', location: 'Nagpur', email: 'supervisor2@seedsphere.com' },
    { name: 'Tarun Bose', empId: 'EMP-WH-103', location: 'Kolkata', email: 'supervisor3@seedsphere.com' },
  ],
  warehouse_manager: [
    { name: 'Anjali Rao', empId: 'EMP-WH-201', location: 'Bengaluru', email: 'whmanager@seedsphere.com' },
    { name: 'Suresh Babu', empId: 'EMP-WH-202', location: 'Vijayawada', email: 'whmanager2@seedsphere.com' },
    { name: 'Kavita Tandon', empId: 'EMP-WH-203', location: 'Bhopal', email: 'whmanager3@seedsphere.com' },
  ],
  warehouse_quality_field_inspector: [
    { name: 'Karthik Reddy', empId: 'EMP-WH-301', location: 'Guntur', email: 'whinspector@seedsphere.com' },
    { name: 'Nandini Ghosh', empId: 'EMP-WH-302', location: 'Kolkata', email: 'whinspector2@seedsphere.com' },
    { name: 'Ajay Solanki', empId: 'EMP-WH-303', location: 'Rajkot', email: 'whinspector3@seedsphere.com' },
  ],
  safety_officer: [
    { name: 'Neha Joshi', empId: 'EMP-WH-401', location: 'Pune', email: 'safety@seedsphere.com' },
    { name: 'Gopal Krishnan', empId: 'EMP-WH-402', location: 'Mysuru', email: 'safety2@seedsphere.com' },
    { name: 'Zoya Mirza', empId: 'EMP-WH-403', location: 'Lucknow', email: 'safety3@seedsphere.com' },
  ],
  rd_executive: [
    { name: 'Ishaan Gupta', empId: 'EMP-RND-101', location: 'Hyderabad', email: 'rdexecutive@seedsphere.com' },
    { name: 'Ananya Bose', empId: 'EMP-RND-102', location: 'Kolkata', email: 'rdexecutive2@seedsphere.com' },
    { name: 'Vivek Rathore', empId: 'EMP-RND-103', location: 'Indore', email: 'rdexecutive3@seedsphere.com' },
  ],
  rd_manager: [
    { name: 'Meera Pillai', empId: 'EMP-RND-201', location: 'Bengaluru', email: 'rdmanager@seedsphere.com' },
    { name: 'Dr. Samuel Thomas', empId: 'EMP-RND-202', location: 'Coimbatore', email: 'rdmanager2@seedsphere.com' },
    { name: 'Harshad Patel', empId: 'EMP-RND-203', location: 'Rajkot', email: 'rdmanager3@seedsphere.com' },
  ],
  rd_quality_field_inspector: [
    { name: 'Arjun Malhotra', empId: 'EMP-RND-301', location: 'Nashik', email: 'rdinspector@seedsphere.com' },
    { name: 'Swati Deshpande', empId: 'EMP-RND-302', location: 'Pune', email: 'rdinspector2@seedsphere.com' },
    { name: 'Rakesh Barman', empId: 'EMP-RND-303', location: 'Raipur', email: 'rdinspector3@seedsphere.com' },
  ],
  plant_supervisor: [
    { name: 'Deepak Chauhan', empId: 'EMP-PRO-101', location: 'Indore', email: 'plantsupervisor@seedsphere.com' },
    { name: 'Yasmin Ali', empId: 'EMP-PRO-102', location: 'Hyderabad', email: 'plantsupervisor2@seedsphere.com' },
    { name: 'Naveen Kamath', empId: 'EMP-PRO-103', location: 'Mysuru', email: 'plantsupervisor3@seedsphere.com' },
  ],
  plant_manager: [
    { name: 'Sunita Desai', empId: 'EMP-PRO-201', location: 'Nashik', email: 'plantmanager@seedsphere.com' },
    { name: 'Bhaskar Rout', empId: 'EMP-PRO-202', location: 'Raipur', email: 'plantmanager2@seedsphere.com' },
    { name: 'Alok Trivedi', empId: 'EMP-PRO-203', location: 'Bhopal', email: 'plantmanager3@seedsphere.com' },
  ],
  processing_quality_field_inspector: [
    { name: 'Kabir Sethi', empId: 'EMP-PRO-301', location: 'Ludhiana', email: 'procinspector@seedsphere.com' },
    { name: 'Preeti Saxena', empId: 'EMP-PRO-302', location: 'Lucknow', email: 'procinspector2@seedsphere.com' },
    { name: 'Manoj Dutta', empId: 'EMP-PRO-303', location: 'Kolkata', email: 'procinspector3@seedsphere.com' },
  ],
  lab_manager: [
    { name: 'Dr. Anita Krishnan', empId: 'EMP-LAB-101', location: 'Bengaluru', email: 'labmanager@seedsphere.com' },
    { name: 'Dr. Faisal Khan', empId: 'EMP-LAB-102', location: 'Hyderabad', email: 'labmanager2@seedsphere.com' },
    { name: 'Shalini Prabhu', empId: 'EMP-LAB-103', location: 'Pune', email: 'labmanager3@seedsphere.com' },
  ],
  lab_technician: [
    { name: 'Ravi Patil', empId: 'EMP-LAB-201', location: 'Bengaluru', email: 'labtechnician@seedsphere.com' },
    { name: 'Aisha Fernandes', empId: 'EMP-LAB-202', location: 'Coimbatore', email: 'labtechnician2@seedsphere.com' },
    { name: 'Gaurav Sinha', empId: 'EMP-LAB-203', location: 'Raipur', email: 'labtechnician3@seedsphere.com' },
  ],
  quality_manager: [
    { name: 'Dr. Sunita Deshmukh', empId: 'EMP-QMS-101', location: 'Pune', email: 'qualitymanager@seedsphere.com' },
    { name: 'Harish Kulkarni', empId: 'EMP-QMS-102', location: 'Nashik', email: 'qualitymanager2@seedsphere.com' },
  ],
  quality_officer: [
    { name: 'Rekha Jadhav', empId: 'EMP-QMS-201', location: 'Pune', email: 'qualityofficer@seedsphere.com' },
    { name: 'Omkar Shinde', empId: 'EMP-QMS-202', location: 'Nashik', email: 'qualityofficer2@seedsphere.com' },
    { name: 'Vaishali More', empId: 'EMP-QMS-203', location: 'Aurangabad', email: 'qualityofficer3@seedsphere.com' },
  ],
  lab_quality_analyst: [
    { name: 'Pooja Bhatt', empId: 'EMP-LAB-301', location: 'Bengaluru', email: 'labanalyst@seedsphere.com' },
    { name: 'Sridhar Acharya', empId: 'EMP-LAB-302', location: 'Vijayawada', email: 'labanalyst2@seedsphere.com' },
    { name: 'Ruchi Kapoor', empId: 'EMP-LAB-303', location: 'Jaipur', email: 'labanalyst3@seedsphere.com' },
  ],
  super_admin: [
    { name: 'Vikram Rao', empId: 'EMP-ADM-101', location: 'Hyderabad', email: 'superadmin@seedsphere.com' },
    { name: 'Meera Iyer', empId: 'EMP-ADM-102', location: 'Bengaluru', email: 'superadmin2@seedsphere.com' },
  ],
  system_admin: [
    { name: 'Arjun Nair', empId: 'EMP-ADM-201', location: 'Hyderabad', email: 'sysadmin@seedsphere.com' },
    { name: 'Farah Qureshi', empId: 'EMP-ADM-202', location: 'Pune', email: 'sysadmin2@seedsphere.com' },
  ],
  compliance_auditor: [
    { name: 'Deepak Joshi', empId: 'EMP-ADM-301', location: 'Delhi', email: 'auditor@seedsphere.com' },
    { name: 'Lakshmi Rangan', empId: 'EMP-ADM-302', location: 'Chennai', email: 'auditor2@seedsphere.com' },
  ],
};

export function getPostLoginRoute(role: UserRole): string {
  if (PROCUREMENT_ROLES.includes(role)) return '/procurement/dashboard';
  if (WAREHOUSE_ROLES.includes(role)) return '/warehouse/dashboard';
  if (RD_ROLES.includes(role)) return '/rd/dashboard';
  if (PROCESSING_ROLES.includes(role)) return '/processing/dashboard';
  if (LAB_ROLES.includes(role)) return '/lab/dashboard';
  if (QUALITY_ROLES.includes(role)) return '/quality/dashboard';
  if (ADMIN_ROLES.includes(role)) return '/admin/dashboard';
  return '/modules';
}

export interface DemoModule {
  key: string;
  label: string;
  roles: UserRole[];
}

/** Two-step demo picker: choose a module first, then a role scoped to it. */
export const DEMO_MODULES: DemoModule[] = [
  { key: 'procurement', label: 'Procurement Module', roles: PROCUREMENT_ROLES },
  { key: 'warehouse', label: 'Warehouse Module', roles: WAREHOUSE_ROLES },
  { key: 'rd', label: 'R&D Module', roles: RD_ROLES },
  { key: 'processing', label: 'Processing Module', roles: PROCESSING_ROLES },
  { key: 'lab', label: 'Laboratory Module', roles: LAB_ROLES },
  { key: 'quality', label: 'Quality Module', roles: QUALITY_ROLES },
  { key: 'admin', label: 'Administration Module', roles: ADMIN_ROLES },
];

export function moduleKeyForRole(role: UserRole): string {
  return DEMO_MODULES.find((m) => m.roles.includes(role))?.key ?? DEMO_MODULES[0].key;
}

/** Every role that can open the given module. */
export function rolesForModule(moduleKey: string): UserRole[] {
  return DEMO_MODULES.find((m) => m.key === moduleKey)?.roles ?? [];
}

/**
 * Which module an app path belongs to: '/warehouse/inventory' -> warehouse.
 * Returns null for paths outside the module shells (the landing page, account
 * settings and so on), where naming a module would be a guess.
 */
export function moduleForPath(pathname: string | undefined | null): DemoModule | null {
  if (!pathname) return null;
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  const aliases: Record<string, string> = {
    procurement: 'procurement',
    warehouse: 'warehouse',
    rd: 'rd',
    processing: 'processing',
    lab: 'lab',
    quality: 'quality',
    admin: 'admin',
    production: 'processing',
  };
  const key = aliases[segment];
  return DEMO_MODULES.find((m) => m.key === key) ?? null;
}

/** The first demo employee holding a role — the one a login form pre-fills. */
export function primaryAccountFor(role: UserRole): DemoAccount {
  return DEMO_ACCOUNTS_BY_ROLE[role][0];
}
