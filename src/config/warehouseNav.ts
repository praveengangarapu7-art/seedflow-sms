import type { Permission } from '@/utils/permissions';
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  MapPin,
  PackageMinus,
  ArrowLeftRight,
  Edit3,
  ClipboardList,
  ScanLine,
  Undo2,
  Thermometer,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { NavItem } from '@/types';

export interface WarehouseNavItem extends NavItem {
  permission: Permission;
}

export const warehouseNav: WarehouseNavItem[] = [
  { label: 'Dashboard', path: '/warehouse/dashboard', icon: LayoutDashboard, permission: 'view_warehouse_dashboard' },
  { label: 'Inventory', path: '/warehouse/inventory', icon: Boxes, permission: 'view_inventory' },
  { label: 'Inbound (Receiving)', path: '/warehouse/inbound', icon: PackagePlus, permission: 'view_inbound' },
  { label: 'Storage & Locations', path: '/warehouse/locations', icon: MapPin, permission: 'view_storage_locations' },
  { label: 'Outbound (Dispatch)', path: '/warehouse/outbound', icon: PackageMinus, permission: 'view_outbound' },
  { label: 'Stock Movements', path: '/warehouse/movements', icon: ArrowLeftRight, permission: 'view_stock_movements' },
  { label: 'Stock Adjustments', path: '/warehouse/adjustments', icon: Edit3, permission: 'view_stock_adjustments' },
  { label: 'Cycle Counting', path: '/warehouse/cycle-counting', icon: ClipboardList, permission: 'view_cycle_counting' },
  { label: 'Barcode / RFID', path: '/warehouse/barcode', icon: ScanLine, permission: 'view_barcode_rfid' },
  { label: 'Returns Management', path: '/warehouse/returns', icon: Undo2, permission: 'view_returns' },
  { label: 'IoT Monitoring', path: '/warehouse/iot', icon: Thermometer, permission: 'view_iot_monitoring' },
  { label: 'Reports & Analytics', path: '/warehouse/reports', icon: BarChart3, permission: 'view_warehouse_reports' },
  { label: 'Settings', path: '/warehouse/settings', icon: Settings, permission: 'view_warehouse_settings' },
];
