import { useState, useMemo } from 'react';
import { FlaskConical, FileText, CheckCircle2, Sprout, Clock, Plus, Upload } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { KpiCard } from '@/pages/warehouse/components/KpiCard/KpiCard';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Button } from '@/components/common/Button/Button';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { useToast } from '@/components/common/Toast/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { rdNav } from '@/config/rdNav';
import { useRealtimeMockStore } from '@/hooks/useRealtimeMockStore';
import { registrations as mockRegistrations } from './mockData/registrationsData';
import { varieties as mockVarieties } from './mockData/varietiesData';
import { VarietyRegistration, Variety, RegStatus } from '@/types/rd';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { RD_TODAY, isDateInPeriod, isYearInPeriod, type PeriodValue } from '@/utils/periodFilter';
import { RegistrationDetailModal } from './components/RegistrationDetailModal/RegistrationDetailModal';
import { NewRegistrationModal } from './components/NewRegistrationModal/NewRegistrationModal';
import { VarietyDetailModal } from './components/VarietyDetailModal/VarietyDetailModal';
import styles from './Registrations.module.css';

export default function Registrations() {
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodValue>('all');
  const { items: allVarieties } = useRealtimeMockStore<Variety>(mockVarieties);
  const { items: allRegistrationItems, add, update } = useRealtimeMockStore<VarietyRegistration>(mockRegistrations);

  const items = useMemo(
    () => allRegistrationItems.filter((r) => isDateInPeriod(r.filedDate, period, RD_TODAY)),
    [allRegistrationItems, period]
  );

  const canFile = usePermission('file_variety_registration');
  const canApproveRelease = usePermission('approve_variety_release');

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Modals state
  const [selectedReg, setSelectedReg] = useState<VarietyRegistration | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Crossed variety details modal state
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [isVarietyModalOpen, setIsVarietyModalOpen] = useState(false);

  // KPIs calculations
  const kpis = useMemo(() => {
    const activeStates: RegStatus[] = ['Draft', 'Submitted', 'Under review', 'Approved'];
    const active = items.filter(r => activeStates.includes(r.status)).length;
    
    const currentYear = new Date().getFullYear().toString();
    const grantedThisYear = items.filter(
      r => r.status === 'Granted' && r.decisionDate?.startsWith(currentYear)
    ).length;
    
    const dusTesting = items.filter(r => r.dusStatus === 'In progress').length;
    
    return [
      { title: 'Active applications', value: active.toString(), icon: FileText, sublabel: 'In process' },
      { title: 'Granted (this year)', value: grantedThisYear.toString(), icon: CheckCircle2, sublabel: 'Successful filings' },
      { title: 'DUS testing in progress', value: dusTesting.toString(), icon: Sprout, sublabel: 'Field trials underway' },
      { title: 'Avg time to grant', value: '2.4 years', icon: Clock, sublabel: 'Filing to grant' }
    ];
  }, [items]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      All: items.length,
      Draft: items.filter(r => r.status === 'Draft').length,
      Submitted: items.filter(r => r.status === 'Submitted').length,
      'Under review': items.filter(r => r.status === 'Under review').length,
      Approved: items.filter(r => r.status === 'Approved').length,
      Granted: items.filter(r => r.status === 'Granted').length,
      Rejected: items.filter(r => r.status === 'Rejected').length,
      Expired: items.filter(r => r.status === 'Expired').length,
    };
  }, [items]);

  const tabs = [
    { key: 'All', label: `All (${tabCounts.All})` },
    { key: 'Draft', label: `Draft (${tabCounts.Draft})` },
    { key: 'Submitted', label: `Submitted (${tabCounts.Submitted})` },
    { key: 'Under review', label: `Under review (${tabCounts['Under review']})` },
    { key: 'Approved', label: `Approved (${tabCounts.Approved})` },
    { key: 'Granted', label: `Granted (${tabCounts.Granted})` },
    { key: 'Rejected', label: `Rejected (${tabCounts.Rejected})` },
    { key: 'Expired', label: `Expired (${tabCounts.Expired})` },
  ];

  // Filters Options
  const appTypes = ['PPV&FRA', 'CSC', 'UPOV', 'Patent', 'GMO biosafety'];
  const dusStatuses = ['Not started', 'In progress', 'Passed', 'Failed', 'Re-test required'];
  
  const yearsFiled = useMemo(() => {
    const years = items.map(r => r.filedDate ? new Date(r.filedDate).getFullYear().toString() : '').filter(Boolean);
    return Array.from(new Set(years)).sort();
  }, [items]);

  const applicantOptions = useMemo(() => {
    const applicants = items.map(r => r.applicant).filter(Boolean);
    return Array.from(new Set(applicants)).sort();
  }, [items]);

  const filterConfig = [
    {
      key: 'appType',
      label: 'Application Type',
      options: [{ value: 'all', label: 'All types' }, ...appTypes.map(t => ({ value: t, label: t }))],
      value: filters.appType || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, appType: val }))
    },
    {
      key: 'dusStatus',
      label: 'DUS Status',
      options: [{ value: 'all', label: 'All statuses' }, ...dusStatuses.map(s => ({ value: s, label: s }))],
      value: filters.dusStatus || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, dusStatus: val }))
    },
    {
      key: 'yearFiled',
      label: 'Year Filed',
      options: [{ value: 'all', label: 'All years' }, ...yearsFiled.map(y => ({ value: y, label: y }))],
      value: filters.yearFiled || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, yearFiled: val }))
    },
    {
      key: 'applicant',
      label: 'Applicant',
      options: [{ value: 'all', label: 'All applicants' }, ...applicantOptions.map(a => ({ value: a, label: a }))],
      value: filters.applicant || 'all',
      onChange: (val: string) => setFilters(p => ({ ...p, applicant: val }))
    }
  ];

  // Filter Logic
  const filteredRegistrations = useMemo(() => {
    return items.filter(r => {
      // Tab filter
      if (activeTab !== 'All' && r.status !== activeTab) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesVariety = r.varietyName.toLowerCase().includes(q) || r.varietyRef.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesAppNo = r.applicationNumber?.toLowerCase().includes(q);
        if (!matchesVariety && !matchesId && !matchesAppNo) return false;
      }
      // Dropdown filters
      if (filters.appType && filters.appType !== 'all' && r.applicationType !== filters.appType) {
        return false;
      }
      if (filters.dusStatus && filters.dusStatus !== 'all' && r.dusStatus !== filters.dusStatus) {
        return false;
      }
      if (filters.yearFiled && filters.yearFiled !== 'all' && (!r.filedDate || !r.filedDate.startsWith(filters.yearFiled))) {
        return false;
      }
      if (filters.applicant && filters.applicant !== 'all' && r.applicant !== filters.applicant) {
        return false;
      }
      return true;
    });
  }, [items, activeTab, searchTerm, filters]);

  // Actions handling
  const handleOpenDetails = (reg: VarietyRegistration) => {
    setSelectedReg(reg);
    setIsDetailModalOpen(true);
  };

  const handleOpenVariety = (varietyId: string) => {
    const variety = allVarieties.find(v => v.id === varietyId);
    if (variety) {
      setSelectedVariety(variety);
      setIsVarietyModalOpen(true);
    } else {
      addToast(`Variety ${varietyId} details not found.`, 'warning');
    }
  };

  const handleAction = (action: string, reg: VarietyRegistration) => {
    if (action === 'submit') {
      update(reg.id, { 
        status: 'Submitted', 
        filedDate: new Date().toISOString().split('T')[0],
        timeline: [
          ...(reg.timeline || []),
          { stage: 'Application Filed', date: new Date().toISOString().split('T')[0], user: 'Dr. Anita Desai', comment: 'Filing package uploaded' }
        ]
      });
      addToast(`Application ${reg.id} submitted for evaluation.`, 'success');
      setIsDetailModalOpen(false);
    } else if (action === 'withdraw') {
      update(reg.id, { 
        status: 'Rejected',
        timeline: [
          ...(reg.timeline || []),
          { stage: 'Application Withdrawn', date: new Date().toISOString().split('T')[0], user: 'Dr. Anita Desai', comment: 'Withdrawn by company applicant' }
        ]
      });
      addToast(`Application ${reg.id} withdrawn.`, 'warning');
      setIsDetailModalOpen(false);
    } else if (action === 'approve_release') {
      update(reg.id, {
        status: 'Granted',
        decisionDate: new Date().toISOString().split('T')[0],
        timeline: [
          ...(reg.timeline || []),
          { stage: 'Commercial Release Approved', date: new Date().toISOString().split('T')[0], user: 'Dr. Anita Desai', comment: 'Approved for commercial release' }
        ]
      });
      addToast(`Commercial release approved for ${reg.id}`, 'success');
      setIsDetailModalOpen(false);
    } else if (action === 'request_data') {
      update(reg.id, {
        status: 'Under review',
        timeline: [
          ...(reg.timeline || []),
          { stage: 'Data Requested', date: new Date().toISOString().split('T')[0], user: 'Dr. Anita Desai', comment: 'More information/data requested' }
        ]
      });
      addToast(`Requested more data for ${reg.id}`, 'info');
      setIsDetailModalOpen(false);
    } else if (action === 'edit') {
      addToast('Opening compliance editor wizard...', 'info');
    }
  };

  // DataTable columns
  const columns = [
    {
      key: 'id',
      label: 'Registration ID',
      width: '130px',
      render: (r: VarietyRegistration) => (
        <span 
          className={styles.idLink}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(r);
          }}
        >
          {r.id}
        </span>
      )
    },
    {
      key: 'variety',
      label: 'Variety Reference',
      render: (r: VarietyRegistration) => (
        <div>
          <strong className={styles.varName}>{r.varietyName}</strong>
          <span 
            className={styles.varRefLink}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVariety(r.varietyRef);
            }}
          >
            {r.varietyRef}
          </span>
        </div>
      )
    },
    {
      key: 'appType',
      label: 'Type',
      width: '120px',
      render: (r: VarietyRegistration) => {
        let typeClass = styles.typePpv;
        if (r.applicationType === 'UPOV') typeClass = styles.typeUpov;
        else if (r.applicationType === 'CSC') typeClass = styles.typeCsc;
        else if (r.applicationType === 'Patent') typeClass = styles.typePatent;
        else if (r.applicationType === 'GMO biosafety') typeClass = styles.typeGmo;
        return <span className={`${styles.typeBadge} ${typeClass}`}>{r.applicationType}</span>;
      }
    },
    {
      key: 'appNo',
      label: 'Application #',
      width: '140px',
      render: (r: VarietyRegistration) => <span className={styles.mono}>{r.applicationNumber || '—'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (r: VarietyRegistration) => {
        const badgeClass = r.status === 'Granted' || r.status === 'Approved'
          ? styles.releasedBadge
          : r.status === 'Under review'
          ? styles.prereleaseBadge
          : r.status === 'Submitted'
          ? styles.submittedBadge
          : r.status === 'Rejected'
          ? styles.withdrawnBadge
          : styles.candidateBadge;
        return <StatusBadge status={r.status} className={badgeClass} />;
      }
    },
    {
      key: 'dusStatus',
      label: 'DUS Status',
      width: '130px',
      render: (r: VarietyRegistration) => {
        let classLabel = styles.dusNotStarted;
        if (r.dusStatus === 'Passed') classLabel = styles.dusPassed;
        else if (r.dusStatus === 'In progress') classLabel = styles.dusInProgress;
        else if (r.dusStatus === 'Failed') classLabel = styles.dusFailed;
        return <span className={`${styles.dusBadge} ${classLabel}`}>{r.dusStatus}</span>;
      }
    },
    {
      key: 'filedDate',
      label: 'Filed Date',
      width: '110px',
      render: (r: VarietyRegistration) => <span>{r.filedDate || '—'}</span>
    },
    {
      key: 'decisionDate',
      label: 'Decision Date',
      width: '110px',
      render: (r: VarietyRegistration) => <span>{r.decisionDate || 'Pending'}</span>
    },
    {
      key: 'validity',
      label: 'Validity',
      width: '100px',
      render: (r: VarietyRegistration) => <span>{r.validityYears ? `${r.validityYears} yrs` : '—'}</span>
    },
    {
      key: 'applicant',
      label: 'Applicant',
      width: '140px',
      render: (r: VarietyRegistration) => <span className={styles.truncated}>{r.applicant}</span>
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (r: VarietyRegistration) => {
        const rowMenuItems = [
          { label: 'View application details', onClick: () => handleOpenDetails(r) },
          ...(canFile ? [
            { label: 'Edit application', onClick: () => handleAction('edit', r) },
            ...(r.status === 'Draft' ? [{ label: 'Submit application', onClick: () => handleAction('submit', r) }] : []),
            ...(r.status !== 'Granted' && r.status !== 'Expired' ? [{ label: 'Withdraw application', onClick: () => handleAction('withdraw', r), variant: 'danger' as const }] : [])
          ] : []),
          ...(canApproveRelease && (r.status === 'Submitted' || r.status === 'Under review') ? [
            { label: 'Approve commercial release', onClick: () => handleAction('approve_release', r) },
            { label: 'Request more data', onClick: () => handleAction('request_data', r) }
          ] : [])
        ];
        return <ActionMenu items={rowMenuItems} />;
      }
    }
  ];

  return (
    <ModuleLayout moduleName="R&D" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Inline Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Registrations & compliance</h1>
          <p className={styles.pageSubtitle}>DUS testing, UPOV/PPV&FRA filings, and IP protection</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button 
            variant="secondary" 
            leftIcon={Upload}
            onClick={() => addToast('Exporting registrations catalog as CSV...', 'info')}
          >
            Export
          </Button>
          {canFile && (
            <Button 
              variant="primary" 
              leftIcon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              New registration
            </Button>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* KPI strip */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, idx) => (
          <KpiCard
            key={idx}
            label={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            comparison={kpi.sublabel}
            trend={
              idx === 0
                ? { direction: 'up', percentage: '+15%', isPositive: true }
                : idx === 1
                ? { direction: 'up', percentage: '+8%', isPositive: true }
                : idx === 2
                ? { direction: 'up', percentage: '+5%', isPositive: true }
                : { direction: 'down', percentage: '-12%', isPositive: true }
            }
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters Bar */}
      <div className={styles.filtersSection}>
        <FilterBar
          searchPlaceholder="Search by variety reference, application number or ID..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filterConfig}
        />
      </div>

      {/* Data Table */}
      <div className={styles.contentArea}>
        {filteredRegistrations.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={48} className={styles.emptyIcon} />
            <h3>No filings matched your filters</h3>
            <p>Refine your keywords, year selections, or DUS status parameters above.</p>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <DataTable
              columns={columns}
              data={filteredRegistrations}
              rowKey="id"
              onRowClick={handleOpenDetails}
            />
          </div>
        )}
      </div>

      {/* Registration Details Modal */}
      {isDetailModalOpen && (
        <RegistrationDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          registration={selectedReg}
          onViewVariety={handleOpenVariety}
          onAction={handleAction}
        />
      )}

      {/* Variety Details Modal (Cross-Linked) */}
      {isVarietyModalOpen && (
        <VarietyDetailModal
          isOpen={isVarietyModalOpen}
          onClose={() => setIsVarietyModalOpen(false)}
          variety={selectedVariety}
          hasRegistration={true}
        />
      )}

      {/* New Registration wizard */}
      {isAddModalOpen && (
        <NewRegistrationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          varieties={allVarieties}
          onAddRegistration={add}
        />
      )}
    </ModuleLayout>
  );
}
