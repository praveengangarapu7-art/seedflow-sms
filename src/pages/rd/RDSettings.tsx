import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Tag, 
  Sprout, 
  Workflow, 
  Users, 
  Bell, 
  Plug, 
  History, 
  Plus, 
  Search, 
  Download,
  Eye,
  Zap,
  ExternalLink
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import { Input } from '@/components/common/Input/Input';
import { Badge } from '@/components/common/Badge/Badge';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { DatePicker } from '@/components/common/DatePicker/DatePicker';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { rdNav } from '@/config/rdNav';
import { usePermission } from '@/hooks/usePermission';

// Subcomponents
import { WorkflowRuleEditorModal } from './components/WorkflowRuleEditorModal/WorkflowRuleEditorModal';
import { AuditLogDetailModal } from './components/AuditLogDetailModal/AuditLogDetailModal';

// Mock Data
import { 
  templates as initialTemplates,
  traits as initialTraits,
  crops as initialCrops,
  cultivars as initialCultivars,
  workflowRules as initialRules,
  users as initialUsers,
  integrations as initialIntegrations,
  auditLogEntries as initialAuditLogs,
  TrialTemplate,
  TraitDefinition,
  CropConfig,
  CultivarConfig,
  WorkflowRule,
  RDUserPermission,
  RDIntegration,
  RDAuditLog
} from './mockData/settingsData';

import styles from './RDSettings.module.css';

export default function RDSettings() {
  const { addToast } = useToast();
  
  const canViewSettings = usePermission('view_rd_settings');
  if (!canViewSettings) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Tab State
  const [activeTab, setActiveTab] = useState('templates');

  // Core Data Stores
  const [templates] = useState<TrialTemplate[]>(initialTemplates);
  const [traits, setTraits] = useState<TraitDefinition[]>(initialTraits);
  const [crops, setCrops] = useState<CropConfig[]>(initialCrops);
  const [cultivars, setCultivars] = useState<CultivarConfig[]>(initialCultivars);
  const [rules, setRules] = useState<WorkflowRule[]>(initialRules);
  const [usersList, setUsersList] = useState<RDUserPermission[]>(initialUsers);
  const [integrations, setIntegrations] = useState<RDIntegration[]>(initialIntegrations);
  const [auditLogs] = useState<RDAuditLog[]>(initialAuditLogs);

  // Search & Filter State
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('All');
  const [traitSearch, setTraitSearch] = useState('');
  const [traitCategoryFilter, setTraitCategoryFilter] = useState('All');
  const [cultivarCropFilter, setCultivarCropFilter] = useState('All crops');
  const [ruleSearch, setRuleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditStart, setAuditStart] = useState<string | null>('2026-05-01');
  const [auditEnd, setAuditEnd] = useState<string | null>('2026-05-24');

  // Modals state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WorkflowRule | null>(null);
  
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<RDAuditLog | null>(null);

  const tabs = [
    { key: 'templates', label: 'Trial templates', icon: FlaskConical },
    { key: 'traits', label: 'Trait catalog', icon: Tag },
    { key: 'crops', label: 'Crops & cultivars', icon: Sprout },
    { key: 'workflows', label: 'Workflow rules', icon: Workflow },
    { key: 'permissions', label: 'User permissions', icon: Users },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Integrations', icon: Plug },
    { key: 'audit', label: 'Audit logs', icon: History }
  ];

  // ================= ACTION HANDLERS =================
  const handleToggleActiveTrait = (id: string) => {
    setTraits(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
    const target = traits.find(t => t.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `Trait "${target.name}" ${target.active ? 'deactivated' : 'activated'}` 
      });
    }
  };

  const handleToggleActiveCrop = (id: string) => {
    setCrops(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    const target = crops.find(c => c.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `Crop "${target.name}" ${target.active ? 'deactivated' : 'activated'}` 
      });
    }
  };

  const handleToggleActiveCultivar = (id: string) => {
    setCultivars(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    const target = cultivars.find(c => c.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `Cultivar standard "${target.name}" ${target.active ? 'deactivated' : 'activated'}` 
      });
    }
  };

  const handleToggleActiveRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const target = rules.find(r => r.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `Rule "${target.name}" ${target.active ? 'disabled' : 'enabled'}` 
      });
    }
  };

  const handleToggleActiveUser = (id: string) => {
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
    const target = usersList.find(u => u.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `User access profile for "${target.name}" ${target.active ? 'deactivated' : 'activated'}` 
      });
    }
  };

  const handleSaveRule = (data: Partial<WorkflowRule>) => {
    if (selectedRule) {
      // Edit
      setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, ...data } as WorkflowRule : r));
    } else {
      // Add
      const newRule: WorkflowRule = {
        id: `WFR-ADD-${Math.floor(Math.random() * 1000)}`,
        name: data.name || '',
        description: data.description || '',
        trigger: data.trigger || 'Observation Schedule',
        triggerEvent: data.triggerEvent || '',
        conditions: data.conditions || '',
        actionText: data.actionText || '',
        triggerCount: 0,
        lastTriggered: '—',
        active: data.active ?? true
      };
      setRules(prev => [newRule, ...prev]);
    }
  };

  // ================= FILTERS LOGIC =================
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (templateTypeFilter !== 'All' && t.type !== templateTypeFilter) return false;
      if (templateSearch.trim()) {
        const q = templateSearch.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.crop.toLowerCase().includes(q) || t.design.toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, templateSearch, templateTypeFilter]);

  const filteredTraits = useMemo(() => {
    return traits.filter(t => {
      if (traitCategoryFilter !== 'All' && t.category !== traitCategoryFilter) return false;
      if (traitSearch.trim()) {
        const q = traitSearch.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.protocol.toLowerCase().includes(q);
      }
      return true;
    });
  }, [traits, traitSearch, traitCategoryFilter]);

  const filteredCultivars = useMemo(() => {
    return cultivars.filter(c => {
      if (cultivarCropFilter !== 'All crops' && c.crop !== cultivarCropFilter) return false;
      return true;
    });
  }, [cultivars, cultivarCropFilter]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (ruleSearch.trim()) {
        const q = ruleSearch.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rules, ruleSearch]);

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      if (userRoleFilter !== 'All' && u.role !== userRoleFilter) return false;
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [usersList, userSearch, userRoleFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      if (auditActionFilter !== 'All' && l.action !== auditActionFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        return l.user.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q);
      }
      if (auditStart && new Date(l.timestamp) < new Date(auditStart)) return false;
      if (auditEnd && new Date(l.timestamp) > new Date(auditEnd + 'T23:59:59')) return false;
      return true;
    });
  }, [auditLogs, auditSearch, auditActionFilter, auditStart, auditEnd]);

  // ================= TAB RENDERS =================

  // Tab 1: Trial templates
  const renderTemplatesTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.tabHeaderRow}>
        <div className={styles.headerFilters}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search templates by crop or layout..." 
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.chipGroup}>
            {['All', 'Single-location', 'Multi-location', 'On-farm'].map((type) => (
              <button
                key={type}
                className={`${styles.filterChip} ${templateTypeFilter === type ? styles.activeChip : ''}`}
                onClick={() => setTemplateTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <Button 
          variant="primary" 
          leftIcon={Plus}
          onClick={() => addToast({ message: 'Trial template wizard initialized' })}
        >
          Add template
        </Button>
      </div>

      <div className={styles.templatesGrid}>
        {filteredTemplates.map((temp) => (
          <div key={temp.id} className={styles.templateCard}>
            <div className={styles.cardHeaderRow}>
              <Badge variant="info">{temp.type}</Badge>
              <Badge variant="neutral">{temp.design}</Badge>
            </div>
            <h4 className={styles.cardTitle}>{temp.name}</h4>
            <div className={styles.cardInfoRow}>
              <span className={styles.infoLabel}>Applicable Target Crop</span>
              <span className={styles.infoVal}>{temp.crop}</span>
            </div>
            <div className={styles.cardStatsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Replications</span>
                <span className={styles.statVal}>{temp.replications}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Observations</span>
                <span className={styles.statVal}>{temp.observationsScheduled}</span>
              </div>
            </div>
            <div className={styles.cardFooterRow}>
              <span className={styles.lastUsed}>Last used: {temp.lastUsed}</span>
              <button 
                className={styles.useLink}
                onClick={() => addToast({ type: 'success', message: `Template "${temp.name}" loaded into workspace` })}
              >
                Use Template →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Tab 2: Trait catalog
  const renderTraitsTab = () => {
    const categoriesList = ['All', 'Agronomic', 'Quality', 'Stress tolerance', 'Disease resistance', 'Morphological'];
    
    const columns = [
      { key: 'name', label: 'Trait name', render: (t: TraitDefinition) => <strong>{t.name}</strong> },
      { key: 'category', label: 'Category', width: '130px', render: (t: TraitDefinition) => <Badge variant="neutral">{t.category}</Badge> },
      { key: 'unit', label: 'Unit', width: '100px', render: (t: TraitDefinition) => <code className={styles.mono}>{t.unit}</code> },
      { key: 'protocol', label: 'Measurement Protocol', render: (t: TraitDefinition) => <span className={styles.truncatedText} title={t.protocol}>{t.protocol}</span> },
      { key: 'ref', label: 'Standard reference', width: '100px', render: (t: TraitDefinition) => <Badge variant="info">{t.standardRef}</Badge> },
      { key: 'crops', label: 'Applicable crops', render: (t: TraitDefinition) => <span className={styles.cropsList}>{t.applicableCrops.join(', ')}</span> },
      { 
        key: 'active', 
        label: 'Active', 
        width: '80px',
        render: (t: TraitDefinition) => (
          <div 
            className={`${styles.toggleSwitch} ${styles.smallToggle} ${t.active ? styles.activeSwitch : ''}`}
            onClick={() => handleToggleActiveTrait(t.id)}
          >
            <div className={styles.toggleHandle} />
          </div>
        )
      },
      {
        key: 'actions',
        label: '',
        width: '50px',
        render: (t: TraitDefinition) => (
          <ActionMenu 
            items={[
              { label: 'Edit trait definition', onClick: () => addToast({ message: `Editing trait ${t.name}` }) },
              { label: t.active ? 'Archive trait' : 'Activate trait', variant: t.active ? 'danger' as const : 'default' as const, onClick: () => handleToggleActiveTrait(t.id) }
            ]}
          />
        )
      }
    ];

    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeaderRow}>
          <div className={styles.headerFilters}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search traits catalog..." 
                value={traitSearch}
                onChange={(e) => setTraitSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.chipGroup}>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.filterChip} ${traitCategoryFilter === cat ? styles.activeChip : ''}`}
                  onClick={() => setTraitCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.actionButtons}>
            <button 
              className={styles.linkButton}
              onClick={() => addToast({ type: 'info', message: 'Pulling UPOV reference standards...' })}
            >
              <ExternalLink size={14} /> Import from standards
            </button>
            <Button 
              variant="primary" 
              leftIcon={Plus}
              onClick={() => addToast({ message: 'New phenotype trait creator initialized' })}
            >
              Add trait
            </Button>
          </div>
        </div>

        <div className={styles.tableCard}>
          <DataTable 
            columns={columns}
            data={filteredTraits}
            rowKey="id"
          />
        </div>
      </div>
    );
  };

  // Tab 3: Crops & cultivars
  const renderCropsTab = () => {
    const cropColumns = [
      { key: 'name', label: 'Crop name', render: (c: CropConfig) => <strong>{c.name}</strong> },
      { key: 'scientific', label: 'Scientific name', render: (c: CropConfig) => <em>{c.scientificName}</em> },
      { key: 'family', label: 'Botanical Family', render: (c: CropConfig) => <Badge variant="neutral">{c.family}</Badge> },
      { key: 'count', label: 'Cultivars count', width: '110px', render: (c: CropConfig) => <Badge variant="info">{c.cultivarsCount} Standard checks</Badge> },
      { 
        key: 'active', 
        label: 'Active', 
        width: '80px',
        render: (c: CropConfig) => (
          <div 
            className={`${styles.toggleSwitch} ${styles.smallToggle} ${c.active ? styles.activeSwitch : ''}`}
            onClick={() => handleToggleActiveCrop(c.id)}
          >
            <div className={styles.toggleHandle} />
          </div>
        )
      },
      {
        key: 'actions',
        label: '',
        width: '50px',
        render: (c: CropConfig) => (
          <ActionMenu 
            items={[
              { label: 'Edit crop catalog', onClick: () => addToast({ message: `Editing crop ${c.name}` }) }
            ]}
          />
        )
      }
    ];

    const cultivarColumns = [
      { key: 'name', label: 'Cultivar name', render: (c: CultivarConfig) => <strong>{c.name}</strong> },
      { key: 'crop', label: 'Crop', render: (c: CultivarConfig) => c.crop },
      { key: 'type', label: 'Role Type', render: (c: CultivarConfig) => <Badge variant="neutral">{c.type}</Badge> },
      { key: 'source', label: 'Breeding source origin', render: (c: CultivarConfig) => <span className={styles.truncatedText}>{c.source}</span> },
      { 
        key: 'active', 
        label: 'Active', 
        width: '80px',
        render: (c: CultivarConfig) => (
          <div 
            className={`${styles.toggleSwitch} ${styles.smallToggle} ${c.active ? styles.activeSwitch : ''}`}
            onClick={() => handleToggleActiveCultivar(c.id)}
          >
            <div className={styles.toggleHandle} />
          </div>
        )
      },
      {
        key: 'actions',
        label: '',
        width: '50px',
        render: (c: CultivarConfig) => (
          <ActionMenu 
            items={[
              { label: 'Edit cultivar reference', onClick: () => addToast({ message: `Editing cultivar ${c.name}` }) }
            ]}
          />
        )
      }
    ];

    return (
      <div className={styles.tabContent}>
        <div className={styles.splitLayout}>
          {/* Left Block: Crops */}
          <div className={styles.splitPane}>
            <div className={styles.paneTitleHeaderRow}>
              <h3>Configured Sowing Species</h3>
              <Button 
                variant="secondary" 
                size="sm" 
                leftIcon={Plus}
                onClick={() => addToast({ message: 'Add crop modal initialized' })}
              >
                Add crop
              </Button>
            </div>
            <div className={styles.tableCard}>
              <DataTable 
                columns={cropColumns}
                data={crops}
                rowKey="id"
              />
            </div>
          </div>

          {/* Right Block: Cultivars */}
          <div className={styles.splitPane}>
            <div className={styles.paneTitleHeaderRow}>
              <h3>Notable Standard Checks & References</h3>
              <div className={styles.headerRowFilters}>
                <select 
                  value={cultivarCropFilter} 
                  onChange={(e) => setCultivarCropFilter(e.target.value)}
                  className={styles.select}
                  style={{ height: '32px', fontSize: '12px' }}
                  aria-label="Crops filter"
                >
                  <option value="All crops">All crops</option>
                  {crops.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={Plus}
                  onClick={() => addToast({ message: 'Add cultivar modal initialized' })}
                >
                  Add check
                </Button>
              </div>
            </div>
            <div className={styles.tableCard}>
              <DataTable 
                columns={cultivarColumns}
                data={filteredCultivars}
                rowKey="id"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab 4: Workflow rules
  const renderWorkflowsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.tabHeaderRow}>
        <div className={styles.headerFilters}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search active rules..." 
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        <Button 
          variant="primary" 
          leftIcon={Plus}
          onClick={() => {
            setSelectedRule(null);
            setIsRuleModalOpen(true);
          }}
        >
          Add rule
        </Button>
      </div>

      <div className={styles.rulesStack}>
        {filteredRules.map((rule) => (
          <div key={rule.id} className={styles.ruleCard}>
            <div className={styles.ruleCardHeader}>
              <div className={styles.ruleTitleGroup}>
                <h4>{rule.name}</h4>
                <Badge variant="neutral">Trigger: {rule.trigger}</Badge>
              </div>
              <div className={styles.ruleHeaderActions}>
                <div 
                  className={`${styles.toggleSwitch} ${styles.smallToggle} ${rule.active ? styles.activeSwitch : ''}`}
                  onClick={() => handleToggleActiveRule(rule.id)}
                >
                  <div className={styles.toggleHandle} />
                </div>
                <ActionMenu 
                  items={[
                    { label: 'Edit rule details', onClick: () => { setSelectedRule(rule); setIsRuleModalOpen(true); } },
                    { label: 'Delete rule', variant: 'danger' as const, onClick: () => setRules(prev => prev.filter(r => r.id !== rule.id)) }
                  ]}
                />
              </div>
            </div>

            <p className={styles.ruleDesc}>{rule.description}</p>

            <div className={styles.ruleLogicFlow}>
              <div className={styles.flowRow}>
                <span className={styles.flowConnector}>WHEN</span>
                <span className={styles.flowStatement}>{rule.triggerEvent}</span>
              </div>
              <div className={styles.flowRow}>
                <span className={styles.flowConnector}>IF</span>
                <span className={styles.flowStatement} style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{rule.conditions}</span>
              </div>
              <div className={styles.flowRow}>
                <span className={styles.flowConnector}>THEN</span>
                <span className={styles.flowStatement} style={{ fontWeight: '600' }}><Zap size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> {rule.actionText}</span>
              </div>
            </div>

            <div className={styles.ruleCardFooter}>
              <span>Automation Trigger Counter: <strong>{rule.triggerCount} runs</strong></span>
              <span>Last triggered: {rule.lastTriggered}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Tab 5: User permissions
  const renderPermissionsTab = () => {
    const columns = [
      { key: 'user', label: 'Research User Profile', render: (u: RDUserPermission) => <div className={styles.userCell}><div className={styles.avatar}>{u.name.charAt(0)}</div><div><div className={styles.bold}>{u.name}</div><div className={styles.muted}>{u.email}</div></div></div> },
      { key: 'role', label: 'R&D Module Permission', width: '150px', render: (u: RDUserPermission) => <Badge variant="info">{u.role}</Badge> },
      { key: 'programs', label: 'Programs assigned', render: (u: RDUserPermission) => <span className={styles.cropsList}>{u.assignedPrograms.join(', ')}</span> },
      { key: 'activeDate', label: 'Last active', width: '130px', render: (u: RDUserPermission) => <span className={styles.mono}>{u.lastActive}</span> },
      { 
        key: 'active', 
        label: 'Status', 
        width: '80px',
        render: (u: RDUserPermission) => (
          <div 
            className={`${styles.toggleSwitch} ${styles.smallToggle} ${u.active ? styles.activeSwitch : ''}`}
            onClick={() => handleToggleActiveUser(u.id)}
          >
            <div className={styles.toggleHandle} />
          </div>
        )
      },
      {
        key: 'actions',
        label: '',
        width: '50px',
        render: (u: RDUserPermission) => (
          <ActionMenu 
            items={[
              { label: 'Reassign programs', onClick: () => addToast({ message: `Edit user breeding scopes for ${u.name} initialized` }) },
              { label: 'Modify module role', onClick: () => addToast({ message: `Change role levels for ${u.name}` }) }
            ]}
          />
        )
      }
    ];

    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeaderRow}>
          <div className={styles.headerFilters}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search staff by email or name..." 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <select 
              value={userRoleFilter} 
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className={styles.select}
              style={{ width: '180px' }}
              aria-label="Roles filter"
            >
              <option value="All">All role assignments</option>
              <option value="Lead Breeder">Lead Breeder</option>
              <option value="Researcher">Researcher</option>
              <option value="Compliance Officer">Compliance Officer</option>
              <option value="Field Staff">Field Staff</option>
              <option value="Module Admin">Module Admin</option>
            </select>
          </div>
          <Button 
            variant="primary" 
            leftIcon={Plus}
            onClick={() => addToast({ message: 'User access delegation wizard initialized' })}
          >
            Add user
          </Button>
        </div>

        <div className={styles.tableCard}>
          <DataTable 
            columns={columns}
            data={filteredUsers}
            rowKey="id"
          />
        </div>

        {/* Expandable Role Definitions Info */}
        <div className={styles.roleDefinitionsBox}>
          <h4>Role Capabilities Reference Index</h4>
          <div className={styles.definitionsGrid}>
            <div className={styles.defCard}>
              <strong>Lead Breeder</strong>
              <p>Full research authority. Can authorize F6 advancements, manage breeding pipelines, and edit standard trial designs.</p>
            </div>
            <div className={styles.defCard}>
              <strong>Researcher</strong>
              <p>Standard data operations. Can initialize nursery layouts, configure sensor inputs, and record seasonal plot observations.</p>
            </div>
            <div className={styles.defCard}>
              <strong>Compliance Officer</strong>
              <p>Regulatory authority. Can manage PPV&FRA registrations, upload DUS trial matrices, and audit IP protection codes.</p>
            </div>
            <div className={styles.defCard}>
              <strong>Field Staff</strong>
              <p>Read-only access to catalogs. Write permissions restricted entirely to recording assigned plot observations in real-time.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab 6: Notifications preferences
  const renderNotificationsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.notificationsLayout}>
        {/* Section A */}
        <div className={styles.notifBlockCard}>
          <h3>Breeder Notification Dispatch Rules</h3>
          <p className={styles.notifBlockDesc}>Select how alert notifications are dispatched to your profile in real-time.</p>
          
          <div className={styles.notifPreferencesList}>
            {[
              { title: 'Trial observation overdue alert', desc: 'Triggers when field data entry skips scheduled sowing intervals.' },
              { title: 'Nursery analysis compilation ready', desc: 'Alerts breeder when all block stats have passed ANOVA verification.' },
              { title: 'Breeding program milestone reached', desc: 'Notifies when segregating lines advance generations (e.g. F4 to F5).' },
              { title: 'UPOV Variety registration update', desc: 'Fires when application statuses are modified by compliance authority.' },
              { title: 'Urgent DUS field testing deadline reminder', desc: 'Alerts 30 days prior to Year 2 descriptor upload requirements.' },
              { title: 'Generative AI insight logged', desc: 'Notifies when cross predictors or moisture warning triggers fire.' }
            ].map((item, idx) => (
              <div key={idx} className={styles.preferenceRow}>
                <div className={styles.preferenceMeta}>
                  <strong>{item.title}</strong>
                  <span>{item.desc}</span>
                </div>
                <div className={styles.preferenceToggles}>
                  {['Email', 'SMS', 'In-App'].map(channel => (
                    <label key={channel} className={styles.notifToggleLabel}>
                      <span className={styles.channelLabel}>{channel}</span>
                      <div className={`${styles.toggleSwitch} ${styles.smallToggle} ${styles.activeSwitch}`}>
                        <div className={styles.toggleHandle} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.preferencesSaveRow}>
            <Button 
              variant="primary"
              onClick={() => addToast({ type: 'success', message: 'Notification preferences saved successfully' })}
            >
              Save preferences
            </Button>
          </div>
        </div>

        {/* Section B */}
        <div className={styles.notifBlockCard}>
          <h3>System Alert Channels (SMTP / SMS Gateway)</h3>
          <p className={styles.notifBlockDesc}>Module administrator configurations linking operational relays.</p>

          <form className={styles.smtpForm} onSubmit={(e) => e.preventDefault()}>
            <Input 
              label="Primary SMTP Server Host" 
              value="smtp.seedsphere-internal.net"
              onChange={() => {}}
              disabled
            />
            <div className={styles.smtpRow}>
              <Input 
                label="Port" 
                value="587"
                onChange={() => {}}
                style={{ flex: 1 }}
                disabled
              />
              <Input 
                label="Auth Security Protocol" 
                value="TLS / StartTLS"
                onChange={() => {}}
                style={{ flex: 2 }}
                disabled
              />
            </div>
            <Input 
              label="SMS Gateway Provider endpoint" 
              value="https://api.twilio-india.com/sms/v1"
              onChange={() => {}}
              disabled
            />
            <div className={styles.preferencesSaveRow}>
              <Button 
                variant="secondary"
                onClick={() => addToast({ type: 'info', message: 'Sending test email ping to admin@seedsphere.in...' })}
              >
                Test connection
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Tab 7: Integrations
  const renderIntegrationsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.integrationsGrid}>
        {integrations.map((int) => (
          <div key={int.id} className={styles.integrationCard}>
            <div className={styles.integrationIconTitleRow}>
              <div className={styles.intIconPlaceholder}>
                <Plug size={22} className={styles.intIcon} />
              </div>
              <div className={styles.intTitleMeta}>
                <h4>{int.name}</h4>
                <Badge variant={int.status === 'Connected' ? 'success' : int.status === 'Setup required' ? 'warning' : 'neutral'}>
                  {int.status}
                </Badge>
              </div>
            </div>
            
            <p className={styles.intDesc}>{int.description}</p>
            
            <div className={styles.intFooterRow}>
              <span className={styles.intSyncLabel}>Last sync: {int.lastSync}</span>
              <Button 
                variant={int.status === 'Connected' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => {
                  if (int.status === 'Connected') {
                    addToast({ type: 'info', message: `Opening configuration settings for ${int.name}` });
                  } else {
                    addToast({ type: 'success', message: `${int.name} successfully connected` });
                    setIntegrations(prev => prev.map(i => i.id === int.id ? { ...i, status: 'Connected', lastSync: 'Just now' } : i));
                  }
                }}
              >
                {int.status === 'Connected' ? 'Configure' : 'Connect'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Tab 8: Audit logs
  const renderAuditTab = () => {
    const columns = [
      { key: 'timestamp', label: 'Timestamp', width: '130px', render: (l: RDAuditLog) => <span className={styles.mono}>{l.timestamp}</span> },
      { key: 'user', label: 'User', width: '180px', render: (l: RDAuditLog) => <div className={styles.userCell}><div className={styles.avatar}>{l.user.charAt(0)}</div><div><div className={styles.bold}>{l.user}</div><div className={styles.muted}>{l.userRole}</div></div></div> },
      { 
        key: 'action', 
        label: 'Action', 
        width: '100px', 
        render: (l: RDAuditLog) => {
          const actionVar = 
            l.action === 'Created' ? 'success' :
            l.action === 'Updated' ? 'info' :
            l.action === 'Deleted' ? 'danger' :
            l.action === 'Approved' ? 'success' : 'warning';
          return <Badge variant={actionVar}>{l.action.toUpperCase()}</Badge>;
        }
      },
      { key: 'entity', label: 'Affected Entity', width: '150px', render: (l: RDAuditLog) => <div><div className={styles.bold}>{l.entityType}</div><code className={styles.code}>{l.entityId}</code></div> },
      { key: 'details', label: 'Details', render: (l: RDAuditLog) => <span className={styles.truncatedText} title={l.details}>{l.details}</span> },
      {
        key: 'controls',
        label: '',
        width: '80px',
        render: (l: RDAuditLog) => (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedAuditLog(l);
              setIsAuditModalOpen(true);
            }}
          >
            <Eye size={14} style={{ marginRight: '4px' }} /> View
          </Button>
        )
      }
    ];

    return (
      <div className={styles.tabContent}>
        {/* Filters Toolbar */}
        <div className={styles.tabHeaderRow} style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className={styles.headerFilters} style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search audit trail..." 
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <select 
              value={auditActionFilter} 
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className={styles.select}
              style={{ width: '130px' }}
              aria-label="Actions filter"
            >
              <option value="All">All actions</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Deleted">Deleted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Submitted">Submitted</option>
            </select>

            <div className={styles.datePickerWrap}>
              <span className={styles.filterLabel}>Date Start</span>
              <DatePicker 
                value={auditStart} 
                onChange={(val) => setAuditStart(val)} 
              />
            </div>
            
            <div className={styles.datePickerWrap}>
              <span className={styles.filterLabel}>Date End</span>
              <DatePicker 
                value={auditEnd} 
                onChange={(val) => setAuditEnd(val)} 
              />
            </div>
          </div>

          <Button 
            variant="secondary" 
            leftIcon={Download}
            onClick={() => addToast({ type: 'success', message: `Exported ${filteredAuditLogs.length} audit log entries as CSV successfully` })}
          >
            Export audit logs
          </Button>
        </div>

        {/* Audit DataTable */}
        <div className={styles.tableCard}>
          <DataTable 
            columns={columns}
            data={filteredAuditLogs}
            rowKey="id"
          />
        </div>
      </div>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'templates': return renderTemplatesTab();
      case 'traits': return renderTraitsTab();
      case 'crops': return renderCropsTab();
      case 'workflows': return renderWorkflowsTab();
      case 'permissions': return renderPermissionsTab();
      case 'notifications': return renderNotificationsTab();
      case 'integrations': return renderIntegrationsTab();
      case 'audit': return renderAuditTab();
      default: return null;
    }
  };

  return (
    <ModuleLayout moduleName="R&D" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Page Header (Inline Markup) */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>R&D settings</h1>
          <p className={styles.pageSubtitle}>Configure research operations, taxonomies, integrations, and permissions</p>
        </div>
        <div className={styles.headerActions}>
          <Button 
            variant="secondary" 
            onClick={() => addToast({ message: 'Configuration backup downloaded' })}
          >
            Export config
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Main Split Layout */}
      <div className={styles.pageLayout}>
        {/* Sidebar Nav Strip */}
        <div className={styles.sidebar}>
          <div className={styles.tabsStrip}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`${styles.tabBtn} ${active ? styles.activeTabBtn : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Pane */}
        <div className={styles.mainContent}>
          {renderActiveTabContent()}
        </div>
      </div>

      {/* MODALS */}
      {isRuleModalOpen && (
        <WorkflowRuleEditorModal 
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setSelectedRule(null);
          }}
          rule={selectedRule}
          onSave={handleSaveRule}
        />
      )}

      {isAuditModalOpen && (
        <AuditLogDetailModal 
          isOpen={isAuditModalOpen}
          onClose={() => {
            setIsAuditModalOpen(false);
            setSelectedAuditLog(null);
          }}
          entry={selectedAuditLog}
        />
      )}
    </ModuleLayout>
  );
}
