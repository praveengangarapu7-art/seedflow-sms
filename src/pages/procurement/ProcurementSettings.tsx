import { useState } from 'react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { procurementNav } from '@/config/procurementNav';
import { mockWorkflows, mockAuditLogs } from './mockData/settingsData';
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { 
  ShoppingCart, Settings, Workflow, Users, Bell, 
  Link as LinkIcon, History, Plus, Edit2, Trash2
} from 'lucide-react';
import styles from './ProcurementSettings.module.css';

export default function ProcurementSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const { addToast } = useToast();
  const canManage = usePermission('manage_procurement_settings');

  if (!canManage) {
    return <Navigate to="/procurement/dashboard" replace />;
  }

  const handleSave = () => {
    console.log(`Saved settings for ${activeTab}`);
    addToast('Settings saved successfully', 'success');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'workflows', label: 'Approval Workflows', icon: Workflow },
    { id: 'roles', label: 'User Roles & Permissions', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'audit', label: 'Audit Logs', icon: History }
  ];

  const renderGeneral = () => (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Company Information</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Company Name</label>
            <input type="text" className={styles.input} defaultValue="AgriSeed Solutions Pvt. Ltd." />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>GST Number</label>
            <input type="text" className={styles.input} defaultValue="27AADCA4526P1Z3" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone</label>
            <input type="text" className={styles.input} defaultValue="+91 9876543210" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input type="email" className={styles.input} defaultValue="procurement@agriseed.com" />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Currency & Localization</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Default Currency</label>
            <select className={styles.input} defaultValue="INR">
              <option value="INR">INR (₹) - Indian Rupee</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Date Format</label>
            <select className={styles.input} defaultValue="DD MMM YYYY">
              <option value="DD MMM YYYY">DD MMM YYYY (24 Apr 2026)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (24/04/2026)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Time Zone</label>
            <select className={styles.input} defaultValue="Asia/Kolkata">
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Fiscal Year & Taxes</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Fiscal Year Start</label>
            <select className={styles.input} defaultValue="April">
              <option value="April">April</option>
              <option value="January">January</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Default GST Rate (%)</label>
            <input type="number" className={styles.input} defaultValue="18" />
          </div>
        </div>
      </div>

      <div className={styles.saveBar}>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 className={styles.sectionTitle} style={{ border: 'none', margin: 0, padding: 0 }}>Approval Workflows</h3>
        <Button variant="primary" icon={<Plus size={16} />}>New workflow</Button>
      </div>

      <div className={styles.workflowList}>
        {mockWorkflows.map(wf => (
          <div key={wf.id} className={styles.workflowItem}>
            <div className={styles.workflowInfo}>
              <span className={styles.workflowName}>{wf.name}</span>
              <div className={styles.workflowMeta}>
                <span>Applies to: {wf.appliesTo}</span>
                <span>Threshold: &gt; ₹{wf.threshold.toLocaleString('en-IN')}</span>
                <span>Steps: {wf.steps.length}</span>
              </div>
            </div>
            <div className={styles.workflowActions}>
              <label className={styles.switch}>
                <input type="checkbox" defaultChecked={wf.active} />
                <span className={styles.slider}></span>
              </label>
              <Button variant="ghost" icon={<Edit2 size={16} />} aria-label="Edit" />
              <Button variant="ghost" icon={<Trash2 size={16} />} aria-label="Delete" style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRoles = () => {
    const roles = ['Procurement Executive', 'Procurement Manager', 'Department Head', 'Finance Manager', 'CFO'];
    const perms = ['Create PR', 'Approve PR', 'Create PO', 'Approve PO', 'Manage Suppliers', 'Manage Budgets'];
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 className={styles.sectionTitle} style={{ border: 'none', margin: 0, padding: 0 }}>Roles & Permissions</h3>
          <Button variant="primary" icon={<Plus size={16} />}>Add role</Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.permTable}>
            <thead>
              <tr>
                <th>Role</th>
                {perms.map(p => <th key={p} style={{ textAlign: 'center' }}>{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role}>
                  <td style={{ fontWeight: 500 }}>{role}</td>
                  {perms.map(p => {
                    // Random-ish default checked state based on role
                    const isChecked = 
                      (role.includes('Manager') || role.includes('CFO')) || 
                      (role === 'Department Head' && p.includes('PR')) ||
                      (role === 'Procurement Executive' && (p.includes('Create') || p.includes('Suppliers')));
                      
                    return (
                      <td key={p} style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className={styles.permCheckbox} 
                          defaultChecked={isChecked}
                          onChange={() => console.log(`Toggled ${p} for ${role}`)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className={styles.saveBar}>
          <Button variant="primary" onClick={handleSave}>Save Permissions</Button>
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    const notifGroups = [
      {
        title: 'Approval Notifications',
        items: ['New PR/PO/Invoice for approval', 'Approval received', 'Approval rejected', 'Reminder for pending approvals']
      },
      {
        title: 'Status Updates',
        items: ['PO acknowledged', 'Goods received', 'Invoice received', 'Payment processed']
      },
      {
        title: 'Alerts',
        items: ['Budget warnings', 'Overdue payments', 'Quality failures']
      }
    ];

    return (
      <div>
        {notifGroups.map((group, gIdx) => (
          <div key={gIdx} className={styles.section}>
            <h3 className={styles.sectionTitle}>{group.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {group.items.map((item, iIdx) => (
                <div key={iIdx} className={styles.notifRow}>
                  <span className={styles.notifName}>{item}</span>
                  <div className={styles.notifToggles}>
                    <label className={styles.toggleLabel}>
                      Email
                      <label className={styles.switch}>
                        <input type="checkbox" defaultChecked={true} />
                        <span className={styles.slider}></span>
                      </label>
                    </label>
                    <label className={styles.toggleLabel}>
                      In-app
                      <label className={styles.switch}>
                        <input type="checkbox" defaultChecked={true} />
                        <span className={styles.slider}></span>
                      </label>
                    </label>
                    <label className={styles.toggleLabel}>
                      SMS
                      <label className={styles.switch}>
                        <input type="checkbox" defaultChecked={iIdx === 0} />
                        <span className={styles.slider}></span>
                      </label>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className={styles.saveBar}>
          <Button variant="primary" onClick={handleSave}>Save Preferences</Button>
        </div>
      </div>
    );
  };

  const renderIntegrations = () => {
    const integrations = [
      { name: 'Tally', desc: 'Accounting sync and ledger updates', status: 'Connected', color: 'success' },
      { name: 'Zoho Books', desc: 'Alternative accounting integration', status: 'Not Connected', color: 'neutral' },
      { name: 'SAP', desc: 'Enterprise ERP sync', status: 'Not Connected', color: 'neutral' },
      { name: 'GST Portal', desc: 'E-way bill & returns filing', status: 'Connected', color: 'success' },
      { name: 'Banking API', desc: 'Direct payment processing', status: 'Connected', color: 'success' },
      { name: 'Email (SMTP)', desc: 'Custom email server for notifications', status: 'Connected', color: 'success' },
      { name: 'WhatsApp', desc: 'Supplier communication', status: 'Error', color: 'danger' }
    ];

    return (
      <div>
        <h3 className={styles.sectionTitle}>Active Integrations</h3>
        <div className={styles.integrationGrid}>
          {integrations.map((int, idx) => (
            <div key={idx} className={styles.integrationCard}>
              <div className={styles.integrationHeader}>
                <h4 className={styles.integrationName}>{int.name}</h4>
                <Badge variant={int.color as any}>{int.status}</Badge>
              </div>
              <p className={styles.integrationDesc}>{int.desc}</p>
              <div style={{ marginTop: 'auto' }}>
                <Button 
                  variant={int.status === 'Connected' ? 'ghost' : 'primary'} 
                  onClick={() => console.log(`Configuring ${int.name}`)}
                  style={{ width: '100%' }}
                >
                  {int.status === 'Connected' ? 'Configure' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAudit = () => {
    const columns = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'user', label: 'User' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Entity' },
      { key: 'entityId', label: 'Ref ID' },
      { key: 'ipAddress', label: 'IP Address' }
    ];

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 className={styles.sectionTitle}>System Audit Logs</h3>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DataTable
            data={mockAuditLogs}
            columns={columns}
            rowKey={(item: any) => item.id}
            onRowClick={(item: any) => console.log('View log details', item)}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'general': return renderGeneral();
      case 'workflows': return renderWorkflows();
      case 'roles': return renderRoles();
      case 'notifications': return renderNotifications();
      case 'integrations': return renderIntegrations();
      case 'audit': return renderAudit();
      default: return null;
    }
  };

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Settings"
        description="Configure procurement rules, workflows, and system preferences"
        noDivider
      />
      
      <div className={styles.container}>
        <div className={styles.sidebar}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className={styles.content}>
          {renderContent()}
        </div>
      </div>


    </ModuleLayout>
  );
}
