import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Warehouse as WarehouseIcon, 
  LayoutGrid, 
  Package, 
  Workflow, 
  Users, 
  Bell, 
  Plug, 
  History,
  Plus,
  Search,
  Activity,
  Download
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Input } from '@/components/common/Input/Input';
import { Badge } from '@/components/common/Badge/Badge';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { SettingsTabs } from './components/SettingsTabs/SettingsTabs';
import { WarehouseCard } from './components/WarehouseCard/WarehouseCard';
import { WarehouseFormModal } from './components/WarehouseFormModal/WarehouseFormModal';
import { LocationTree, LocationNode } from './components/LocationTree/LocationTree';
import { BulkImportLocationsModal } from './components/BulkImportLocationsModal/BulkImportLocationsModal';
import { CategoryFormModal } from './components/CategoryFormModal/CategoryFormModal';
import { UoMFormModal } from './components/UoMFormModal/UoMFormModal';
import { WorkflowRuleEditorModal } from './components/WorkflowRuleEditorModal/WorkflowRuleEditorModal';
import { RolePermissionsTable } from './components/RolePermissionsTable/RolePermissionsTable';
import { IntegrationCard } from './components/IntegrationCard/IntegrationCard';
import { AuditLogDetailModal } from './components/AuditLogDetailModal/AuditLogDetailModal';
import { MapPreviewModal } from './components/MapPreviewModal/MapPreviewModal';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import type { WarehouseConfig } from '@/types/warehouse';

import { 
  warehouses as mockWarehouses,
  itemCategories as categoriesStarter,
  uomList as uomStarter,
  workflowRules as rulesStarter,
  warehouseRoles as rolesStarter,
  warehousePermissions as mockPermissions,
  rolePermissionMappings as mappingsStarter,
  notificationPreferences as notifsStarter,
  integrations as integrationsStarter,
  auditLogEntries as mockAuditLogs
} from './mockData/settingsData';

import styles from './WarehouseSettings.module.css';

import { warehouseNav } from '@/config/warehouseNav';
import { NotificationChannel } from '@/types/warehouse';
import { usePermission } from '@/hooks/usePermission';

import { usePersistentCollection } from '@/hooks/persistentCollections';
import type { WarehouseRole, RolePermissionMapping, NotificationPreference, Integration } from '@/types/warehouse';
const locationStarter: LocationNode[] = [
  {
    id: 'WH-001',
    label: 'Telangana Main',
    type: 'warehouse',
    capacity: 48000,
    occupied: 38400,
    children: [
      {
        id: 'Z-01',
        label: 'Cold Zone A',
        type: 'zone',
        capacity: 5000,
        occupied: 4600,
        children: [
          { id: 'R-01', label: 'Rack 01', type: 'rack', capacity: 1000, occupied: 900 },
          { id: 'R-02', label: 'Rack 02', type: 'rack', capacity: 1000, occupied: 850 }
        ]
      },
      { id: 'Z-02', label: 'Ambient Zone 1', type: 'zone', capacity: 8000, occupied: 6800 }
    ]
  }
];

const WarehouseSettings: React.FC = () => {
  const { addToast } = useToast();
  const [mockCategories, setCategories] = usePersistentCollection<any>('warehouse.categories', categoriesStarter);
  const [mockUomList, setUomList] = usePersistentCollection<any>('warehouse.uom', uomStarter);
  const [mockRules, setRules] = usePersistentCollection<any>('warehouse.workflow_rules', rulesStarter);
  const [mockRoles, setRoles] = usePersistentCollection<WarehouseRole>('warehouse.roles', rolesStarter);
  const [mockMappings, setMappings] = usePersistentCollection<RolePermissionMapping>('warehouse.role_permissions', mappingsStarter);
  const [mockNotifs, setNotifs] = usePersistentCollection<NotificationPreference>('warehouse.notifications', notifsStarter);
  const [mockIntegrations, setIntegrations] = usePersistentCollection<Integration>('warehouse.integrations', integrationsStarter);
  const [locationData, setLocationData] = usePersistentCollection<LocationNode>('warehouse.location_tree', locationStarter);
  const [nodeForm, setNodeForm] = useState<{ label: string; capacity: string; zoneType: string }>({ label: '', capacity: '', zoneType: 'Cold' });
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [integrationFilter, setIntegrationFilter] = useState<'All' | 'Accounting' | 'Logistics' | 'Hardware'>('All');
  const [notifPaused, setNotifPaused] = useState(false);
  const upsert = <T extends { id?: string }>(set: (fn: (prev: T[]) => T[]) => void, data: T, prefix: string) => {
    set((prev) => (data.id && prev.some((x) => x.id === data.id) ? prev.map((x) => (x.id === data.id ? { ...x, ...data } : x)) : [{ ...data, id: data.id || `${prefix}-${Date.now().toString(36).toUpperCase()}` }, ...prev]));
  };
  const mapTree = (nodes: LocationNode[], fn: (n: LocationNode) => LocationNode | null): LocationNode[] =>
    nodes.map((n) => fn(n)).filter((n): n is LocationNode => n !== null).map((n) => (n.children ? { ...n, children: mapTree(n.children, fn) } : n));
  const canManageSettings = usePermission('manage_warehouse_settings');

  const [activeTab, setActiveTab] = useState('warehouses');
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [selectedWh, setSelectedWh] = useState<any>(null);

  if (!canManageSettings) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<LocationNode | null>(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [selectedUom, setSelectedUom] = useState<any>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const [whSearch, setWhSearch] = useState('');
  const [whTypeFilter, setWhTypeFilter] = useState<'all' | string>('all');
  const [mapWh, setMapWh] = useState<WarehouseConfig | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState<'all' | string>('all');

  const { items: warehousesStore, update: updateWh, add: addWh } = useRealtimeMockStore<WarehouseConfig>(mockWarehouses, 'warehouse.warehouses');

  const filteredWarehouses = React.useMemo(() => {
    return warehousesStore.filter((w) => {
      if (whTypeFilter !== 'all' && w.type !== whTypeFilter) return false;
      if (whSearch.trim() !== '') {
        const q = whSearch.trim().toLowerCase();
        const haystack = `${w.name} ${w.code} ${w.manager} ${w.address.city} ${w.address.state}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [warehousesStore, whSearch, whTypeFilter]);

  const filteredAuditLogs = React.useMemo(() => {
    return mockAuditLogs.filter((l: any) => {
      if (auditAction !== 'all' && l.action !== auditAction) return false;
      if (auditSearch.trim() !== '') {
        const q = auditSearch.trim().toLowerCase();
        const haystack = `${l.user ?? ''} ${l.action ?? ''} ${l.entityId ?? ''} ${l.details ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [auditSearch, auditAction]);

  const tabs = [
    { key: 'warehouses', label: 'Warehouses', icon: WarehouseIcon },
    { key: 'zones', label: 'Zones & locations', icon: LayoutGrid },
    { key: 'items', label: 'Items & categories', icon: Package },
    { key: 'workflows', label: 'Workflow rules', icon: Workflow },
    { key: 'permissions', label: 'User permissions', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Integrations', icon: Plug },
    { key: 'audit', label: 'Audit logs', icon: History }
  ];


  const renderWarehouses = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input type="text" placeholder="Search warehouses..." value={whSearch} onChange={(e) => setWhSearch(e.target.value)} />
          </div>
          <div className={styles.filterChips}>
            <button className={`${styles.chip} ${whTypeFilter === 'all' ? styles.activeChip : ''}`} onClick={() => setWhTypeFilter('all')}>All</button>
            <button className={`${styles.chip} ${whTypeFilter === 'Main' ? styles.activeChip : ''}`} onClick={() => setWhTypeFilter('Main')}>Main</button>
            <button className={`${styles.chip} ${whTypeFilter === 'Regional' ? styles.activeChip : ''}`} onClick={() => setWhTypeFilter('Regional')}>Regional</button>
            <button className={`${styles.chip} ${whTypeFilter === 'Cold storage' ? styles.activeChip : ''}`} onClick={() => setWhTypeFilter('Cold storage')}>Cold Storage</button>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setSelectedWh(null); setIsWhModalOpen(true); }}>
          Add warehouse
        </Button>
      </div>
      <div className={styles.whGrid}>
        {filteredWarehouses.map(wh => (
          <WarehouseCard
            key={wh.id}
            warehouse={wh}
            onEdit={(w) => { setSelectedWh(w); setIsWhModalOpen(true); }}
            onDeactivate={(id) => {
              const target = warehousesStore.find((x) => x.id === id);
              if (target) {
                updateWh(id, { active: !target.active });
                addToast({ type: target.active ? 'warning' : 'success', message: `${target.name} ${target.active ? 'deactivated' : 'activated'}` });
              }
            }}
            onViewMap={(w) => setMapWh(w)}
          />
        ))}
        {filteredWarehouses.length === 0 && (
          <div className={styles.empty}>No warehouses match your filters.</div>
        )}
      </div>
    </div>
  );

  const renderZones = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <select className={styles.whSelector}>
            <option>Telangana Main (TG-MAIN)</option>
            <option>Karnataka (KA-RGNL)</option>
          </select>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => {
            const parent = selectedNode?.type === 'warehouse' ? selectedNode : locationData[0];
            if (!parent) return;
            const name = window.prompt(`New zone name in ${parent.label}`);
            if (!name?.trim()) return;
            const zone: LocationNode = { id: `${parent.id}-Z${Date.now().toString(36).slice(-4).toUpperCase()}`, label: name.trim(), type: 'zone', capacity: 0, occupied: 0, children: [] };
            setLocationData((prev) => mapTree(prev, (n) => (n.id === parent.id ? { ...n, children: [...(n.children ?? []), zone] } : n)));
            addToast({ type: 'success', message: `Zone ${zone.label} added to ${parent.label}` });
          }}>Add zone</Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => setIsImportModalOpen(true)}>Bulk import</Button>
        </div>
      </div>
      <div className={styles.zonesLayout}>
        <div className={styles.treePanel}>
          <LocationTree 
            data={locationData} 
            selectedId={selectedNode?.id}
            onSelect={(n) => { setSelectedNode(n); setNodeForm({ label: n.label, capacity: String(n.capacity ?? ''), zoneType: 'Cold' }); }}
            onAction={(n) => {
              if (n.type === 'warehouse') { setSelectedNode(n); return; }
              if (window.confirm(`Delete ${n.type} "${n.label}"${n.children?.length ? ` and its ${n.children.length} child location(s)` : ''}?`)) {
                setLocationData((prev) => mapTree(prev, (x) => (x.id === n.id ? null : x)));
                if (selectedNode?.id === n.id) setSelectedNode(null);
                addToast({ type: 'warning', message: `${n.label} deleted` });
              }
            }}
          />
        </div>
        <div className={styles.detailPanel}>
          {selectedNode ? (
            <div className={styles.nodeForm}>
              <h3 className={styles.nodeTitle}>Edit {selectedNode.type}: {selectedNode.label}</h3>
              <div className={styles.formRow}>
                <Input label="Name" value={nodeForm.label} onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })} />
                <Input label="Identifier" value={selectedNode.id} />
              </div>
              {selectedNode.type === 'zone' && (
                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Zone type</label>
                    <select className={styles.select} value={nodeForm.zoneType} onChange={(e) => setNodeForm({ ...nodeForm, zoneType: e.target.value })}>
                      <option>Cold</option>
                      <option>Ambient</option>
                      <option>Controlled</option>
                    </select>
                  </div>
                  <Input label="Capacity (bags)" value={nodeForm.capacity} type="number" onChange={(e) => setNodeForm({ ...nodeForm, capacity: e.target.value })} />
                </div>
              )}
              <div className={styles.formFooter}>
                <Button variant="primary" onClick={() => { const cap = Number(nodeForm.capacity); setLocationData((prev) => mapTree(prev, (n) => (n.id === selectedNode.id ? { ...n, label: nodeForm.label.trim() || n.label, capacity: Number.isFinite(cap) && nodeForm.capacity !== '' ? cap : n.capacity } : n))); setSelectedNode({ ...selectedNode, label: nodeForm.label.trim() || selectedNode.label }); addToast({ type: 'success', message: 'Location updated' }); }}>Save changes</Button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyDetail}>
              <LayoutGrid size={48} className={styles.emptyIcon} />
              <p>Select a node from the tree to view or edit its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderItems = () => (
    <div className={styles.tabContent}>
      <div className={styles.splitView}>
        <div className={styles.splitSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Item categories</h3>
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => { setSelectedCat(null); setIsCatModalOpen(true); }}>Add</Button>
          </div>
          <DataTable
            columns={[
              { key: 'category', label: 'Category', render: (c: any) => <div><div className={styles.bold}>{c.name}</div><div className={styles.muted}>{c.description}</div></div> },
              { key: 'valuation', label: 'Valuation', render: (c: any) => <Badge variant="neutral">{c.defaultValuationMethod}</Badge> },
              { key: 'items', label: 'Items', render: (c: any) => c.activeItemsCount },
              { key: 'status', label: 'Status', render: (c: any) => <div className={`${styles.dot} ${c.active ? styles.activeDot : ''}`} /> }
            ]}
            data={mockCategories}
            rowKey="id"
          />
        </div>
        <div className={styles.splitSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Units of Measure</h3>
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => { setSelectedUom(null); setIsUomModalOpen(true); }}>Add</Button>
          </div>
          <DataTable
            columns={[
              { key: 'uom', label: 'UoM', render: (u: any) => <div><div className={styles.bold}>{u.code}</div><div className={styles.muted}>{u.name}</div></div> },
              { key: 'type', label: 'Type', render: (u: any) => <Badge variant="info">{u.type}</Badge> },
              { key: 'conversion', label: 'Conversion', render: (u: any) => u.baseUnit ? `1 ${u.code} = ${u.conversionToBase} ${u.baseUnit}` : 'Base unit' },
              { key: 'items', label: 'Items', render: (u: any) => u.usedByItemsCount }
            ]}
            data={mockUomList}
            rowKey="id"
          />
        </div>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input type="text" placeholder="Search rules..." />
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setSelectedRule(null); setIsRuleModalOpen(true); }}>
          New rule
        </Button>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Rule name', render: (r: any) => <div><div className={styles.bold}>{r.name}</div><div className={styles.muted}>{r.description}</div></div> },
          { key: 'trigger', label: 'Trigger', render: (r: any) => <Badge variant="info">{r.trigger}</Badge> },
          { key: 'actions', label: 'Actions', render: (r: any) => <div className={styles.actionsList}>{r.actions.map((a: any, i: number) => <Badge key={i} variant="neutral">{a.action}</Badge>)}</div> },
          { key: 'usage', label: 'Usage', render: (r: any) => <div className={styles.usage}><Activity size={12} /> {r.triggerCount}</div> },
          { key: 'active', label: 'Active', render: (r: any) => <div role="switch" aria-checked={r.active} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setRules((prev) => prev.map((x: any) => (x.id === r.id ? { ...x, active: !x.active } : x))); }} className={`${styles.toggle} ${r.active ? styles.active : ''}`}><div className={styles.toggleHandle} /></div> },
          { key: 'controls', label: 'Actions', render: (r: any) => <Button variant="ghost" size="sm" onClick={() => { setSelectedRule(r); setIsRuleModalOpen(true); }}>Edit</Button> }
        ]}
        data={mockRules}
        rowKey="id"
      />
    </div>
  );

  const renderPermissions = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <div className={styles.roleChips}>
            {mockRoles.map(role => (
              <button key={role.id} className={`${styles.roleChip} ${role.isSystemRole ? styles.systemRole : ''}`} style={roleFilter === role.id ? { outline: '2px solid var(--color-primary)' } : undefined} onClick={() => setRoleFilter((r) => (r === role.id ? null : role.id))}>
                {role.name}
                <span className={styles.count}>{role.userCount}</span>
              </button>
            ))}
            <button className={styles.addRoleBtn} onClick={() => { const name = window.prompt('Custom role name'); if (name?.trim()) { setRoles((prev) => [...prev, { id: `ROLE-${Date.now().toString(36).toUpperCase()}`, name: name.trim(), description: 'Custom role', isSystemRole: false, userCount: 0 }]); addToast({ type: 'success', message: `Role ${name.trim()} added` }); } }}><Plus size={14} /> Custom Role</button>
          </div>
        </div>
      </div>
      <RolePermissionsTable 
        roles={roleFilter ? mockRoles.filter((r) => r.id === roleFilter) : mockRoles}
        permissions={mockPermissions}
        mappings={mockMappings}
        onToggle={(r, p) => setMappings((prev) => (prev.some((m) => m.roleId === r && m.permissionId === p) ? prev.map((m) => (m.roleId === r && m.permissionId === p ? { ...m, granted: !m.granted } : m)) : [...prev, { roleId: r, permissionId: p, granted: true }]))}
      />
    </div>
  );

  const renderNotifications = () => (
    <div className={styles.tabContent}>
      <div className={styles.masterControl}>
        <div className={styles.masterInfo}>
          <h3 className={styles.masterTitle}>Global notification controls</h3>
          <p className={styles.masterDesc}>Manage how you receive alerts across the warehouse module.</p>
        </div>
        <div className={styles.masterActions}>
          <button className={styles.resetLink} onClick={() => { setNotifs(notifsStarter.slice()); setNotifPaused(false); addToast({ type: 'info', message: 'Notification preferences reset to defaults' }); }}>Reset to defaults</button>
          <div className={styles.pauseControl}>
            <span className={styles.label}>Pause all</span>
            <div className={`${styles.toggle} ${notifPaused ? styles.active : ''}`} role="switch" aria-checked={notifPaused} style={{ cursor: 'pointer' }} onClick={() => setNotifPaused((v) => !v)}><div className={styles.toggleHandle} /></div>
          </div>
        </div>
      </div>
      <div className={styles.notifGrid}>
        {['Stock alerts', 'Quality alerts', 'Cold chain alerts', 'Workflow alerts'].map(section => (
          <div key={section} className={styles.notifSection}>
            <h4 className={styles.notifSectionTitle}>{section}</h4>
            <div className={styles.notifList}>
              {mockNotifs.filter(n => n.category === section || section === 'Stock alerts').slice(0, 4).map(notif => (
                <div key={notif.id} className={styles.notifRow}>
                  <div className={styles.notifInfo}>
                    <span className={styles.notifName}>{notif.name}</span>
                    <span className={styles.notifDesc}>Receive alert when this event occurs</span>
                  </div>
                  <div className={styles.notifToggles}>
                    {['Email', 'SMS', 'In-app'].map(channel => (
                      <label key={channel} className={styles.notifToggleLabel} style={{ cursor: 'pointer', opacity: notifPaused ? 0.5 : 1 }} onClick={(e) => { e.preventDefault(); setNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, channels: { ...n.channels, [channel]: !n.channels[channel as NotificationChannel] } } : n))); }}>
                        <span className={styles.channelName}>{channel}</span>
                        <div className={`${styles.toggle} ${styles.smallToggle} ${notif.channels[channel as NotificationChannel] ? styles.active : ''}`}>
                          <div className={styles.toggleHandle} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.stickyFooter}>
        <Button variant="primary" onClick={() => { if (notifPaused) setNotifs((prev) => prev.map((n) => ({ ...n, channels: { Email: false, SMS: false, 'In-app': false } }))); addToast({ type: 'success', message: notifPaused ? 'All notifications paused' : 'Notification preferences saved' }); }}>Save preferences</Button>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <div className={styles.filterChips}>
            {(['All', 'Accounting', 'Logistics', 'Hardware'] as const).map((c) => (
              <button key={c} className={`${styles.chip} ${integrationFilter === c ? styles.activeChip : ''}`} onClick={() => setIntegrationFilter(c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.integrationsGrid}>
        {mockIntegrations.filter((i) => integrationFilter === 'All' || i.category === integrationFilter).map(int => (
          <IntegrationCard 
            key={int.id} 
            integration={int} 
            onConfigure={(i) => { const v = window.prompt(`${i.name}: endpoint or account ID`, ''); if (v !== null) { setIntegrations((prev) => prev.map((x) => (x.id === i.id ? { ...x, status: 'Connected', lastSync: 'just now' } : x))); addToast({ type: 'success', message: `${i.name} configuration saved` }); } }}
            onConnect={(id) => { setIntegrations((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Connected', lastSync: 'just now' } : x))); addToast({ type: 'success', message: 'Integration connected' }); }}
            onDisconnect={(id) => { setIntegrations((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Not connected' } : x))); addToast({ type: 'warning', message: 'Integration disconnected' }); }}
          />
        ))}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className={styles.tabContent}>
      <div className={styles.contentHeader}>
        <div className={styles.headerFilters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input type="text" placeholder="Search logs..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
          </div>
          <select className={styles.whSelector} value={auditAction} onChange={(e) => setAuditAction(e.target.value)} aria-label="Action filter">
            <option value="all">All actions</option>
            <option value="Created">Created</option>
            <option value="Updated">Updated</option>
            <option value="Deleted">Deleted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Posted">Posted</option>
          </select>
        </div>
        <Button variant="secondary" icon={<Download size={16} />} onClick={() => addToast({ type: 'success', message: `Exported ${filteredAuditLogs.length} log entries as CSV` })}>Export logs</Button>
      </div>
      <DataTable
        columns={[
          { key: 'timestamp', label: 'Timestamp', render: (l: any) => l.timestamp },
          { key: 'user', label: 'User', render: (l: any) => <div className={styles.userCell}><div className={styles.avatar}>{l.user.charAt(0)}</div><div><div className={styles.bold}>{l.user}</div><div className={styles.muted}>{l.userRole}</div></div></div> },
          { key: 'action', label: 'Action', render: (l: any) => <Badge variant="info">{l.action}</Badge> },
          { key: 'entity', label: 'Entity', render: (l: any) => <div><div className={styles.bold}>{l.entityType}</div><code className={styles.code}>{l.entityId}</code></div> },
          { key: 'details', label: 'Details', render: (l: any) => <div className={styles.detailsCell}>{l.details}</div> },
          { key: 'controls', label: 'Actions', render: (l: any) => <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(l); setIsLogModalOpen(true); }}>View</Button> }
        ]}
        data={filteredAuditLogs}
        rowKey="id"
      />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'warehouses': return renderWarehouses();
      case 'zones': return renderZones();
      case 'items': return renderItems();
      case 'workflows': return renderWorkflows();
      case 'permissions': return renderPermissions();
      case 'notifications': return renderNotifications();
      case 'integrations': return renderIntegrations();
      case 'audit': return renderAudit();
      default: return null;
    }
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={WarehouseIcon} navItems={warehouseNav}>
      <div className={styles.page}>
        <PageHeader 
          title="Warehouse settings"
          description="Configure warehouses, zones, workflows, permissions, and integrations"
          noDivider
        />

        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <SettingsTabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onChange={setActiveTab} 
            />
          </div>
          <div className={styles.main}>
            {renderContent()}
          </div>
        </div>
      </div>

      <WarehouseFormModal
        isOpen={isWhModalOpen}
        onClose={() => setIsWhModalOpen(false)}
        warehouse={selectedWh}
        onSave={(data) => {
          if (selectedWh) {
            updateWh(selectedWh.id, data as Partial<WarehouseConfig>);
            addToast({ type: 'success', message: `${(data as WarehouseConfig).name ?? selectedWh.name} updated` });
          } else {
            addWh(data as WarehouseConfig);
            addToast({ type: 'success', message: `Warehouse added — ${(data as WarehouseConfig).code ?? ''}` });
          }
        }}
      />

      <BulkImportLocationsModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={(file) => {
          if (!(file instanceof File)) return;
          void file.text().then((text) => {
            const rows = text.split(/\r?\n/).slice(1).map((l) => l.split(',').map((c) => c.trim())).filter((r) => r.length >= 2 && r[0]);
            const parent = locationData[0];
            if (!parent || rows.length === 0) { addToast({ type: 'warning', message: 'No rows found in the file' }); return; }
            const zones: LocationNode[] = rows.map((r, i) => ({ id: `${parent.id}-IMP${Date.now().toString(36).slice(-3)}${i}`, label: r[0], type: 'zone', capacity: Number(r[1]) || 0, occupied: 0, children: [] }));
            setLocationData((prev) => mapTree(prev, (n) => (n.id === parent.id ? { ...n, children: [...(n.children ?? []), ...zones] } : n)));
            addToast({ type: 'success', message: `${zones.length} location(s) imported into ${parent.label}` });
          });
        }}
      />

      <CategoryFormModal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        category={selectedCat}
        onSave={(data) => { upsert(setCategories, data, 'CAT'); setIsCatModalOpen(false); addToast({ type: 'success', message: 'Category saved' }); }}
      />

      <UoMFormModal 
        isOpen={isUomModalOpen} 
        onClose={() => setIsUomModalOpen(false)} 
        uom={selectedUom}
        onSave={(data) => { upsert(setUomList, data, 'UOM'); setIsUomModalOpen(false); addToast({ type: 'success', message: 'Unit saved' }); }}
      />

      <WorkflowRuleEditorModal 
        isOpen={isRuleModalOpen} 
        onClose={() => setIsRuleModalOpen(false)} 
        rule={selectedRule}
        onSave={(data) => { upsert(setRules, { triggerCount: 0, actions: [], conditions: [], ...data }, 'RULE'); setIsRuleModalOpen(false); addToast({ type: 'success', message: 'Workflow rule saved' }); }}
      />

      <AuditLogDetailModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        entry={selectedLog}
      />

      <MapPreviewModal
        isOpen={mapWh !== null}
        onClose={() => setMapWh(null)}
        warehouse={mapWh}
      />
    </ModuleLayout>
  );
};

export default WarehouseSettings;
