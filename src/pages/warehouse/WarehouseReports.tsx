import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Download, 
  Plus, 
  Bookmark,
  RefreshCcw,
  Edit,
  Trash2,
  Pause,
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';

import { ReportCard } from './components/ReportCard/ReportCard';
import { AIInsightCard } from './components/AIInsightCard/AIInsightCard';
import { ReportDetailModal } from './components/ReportDetailModal/ReportDetailModal';
import { ScheduleReportModal } from './components/ScheduleReportModal/ScheduleReportModal';
import { CustomReportModal } from './components/CustomReportModal/CustomReportModal';

import { 
  reportDefinitions as initialReports, 
  scheduledReports as initialScheduled, 
  aiInsights as initialInsights 
} from './mockData/reportsData';
import { warehouseNav } from '@/config/warehouseNav';
import { ReportDefinition, AIInsight, ScheduledReport } from '@/types/warehouse';
import { useToast } from '@/components/common/Toast/ToastContext';
import { ActionMenu } from '@/components/common/ActionMenu';

import styles from './WarehouseReports.module.css';

const WarehouseReports: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('library');
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [insightSeverityFilter, setInsightSeverityFilter] = useState<'All' | 'Critical' | 'Warning' | 'Info' | 'Opportunity'>('All');
  const [showDismissed, setShowDismissed] = useState(false);
  
  const [reports, setReports] = useState<ReportDefinition[]>(initialReports);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>(initialScheduled);
  const [insights, setInsights] = useState<AIInsight[]>(initialInsights);
  
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const tabs = [
    { key: 'library', label: 'Library' },
    { key: 'saved', label: 'Saved reports', count: reports.filter(r => r.saved).length },
    { key: 'scheduled', label: 'Scheduled reports', count: scheduled.length },
    { key: 'insights', label: 'AI insights', count: insights.filter(i => !i.dismissed).length }
  ];

  const categories = ['All', 'Inventory', 'Operational', 'Financial', 'Compliance', 'Quality', 'AI insights'];
  const warehouses = ['All', 'Main', 'North', 'South', 'East'];

  const filteredReports = useMemo(() => {
    return reports.filter(r => 
      categoryFilter === 'All' || r.category === categoryFilter
    );
  }, [reports, categoryFilter]);

  const toggleSaveReport = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, saved: !r.saved } : r));
    const target = reports.find((r) => r.id === id);
    if (target) {
      addToast({ type: 'success', message: target.saved ? `Removed from saved reports` : `Added to saved reports` });
    }
  };

  const handleDismissInsight = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, dismissed: true } : i));
    addToast({ message: 'Insight dismissed' });
  };

  const handleSaveInsight = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, saved: !i.saved } : i));
    const target = insights.find((i) => i.id === id);
    if (target) addToast({ type: 'success', message: target.saved ? 'Removed from saved insights' : 'Insight saved' });
  };

  const handleInsightAction = (id: string, action: string) => {
    console.log('insight action', id, action);
    addToast({ type: 'success', message: action === 'Generate PR' ? 'Purchase requisitions generated' : action === 'Schedule cycle count' ? 'Cycle count scheduled' : `Action "${action}" triggered` });
  };

  const handleScheduleToggle = (id: string) => {
    setScheduled((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
    const target = scheduled.find((s) => s.id === id);
    if (target) addToast({ type: target.active ? 'warning' : 'success', message: `${target.reportTitle} ${target.active ? 'paused' : 'resumed'}` });
  };

  const handleScheduleDelete = (id: string) => {
    setScheduled((prev) => prev.filter((s) => s.id !== id));
    addToast({ type: 'warning', message: 'Schedule deleted' });
  };

  const visibleInsights = useMemo(() => {
    return insights.filter((i) => {
      if (!showDismissed && i.dismissed) return false;
      if (insightSeverityFilter !== 'All' && i.severity !== insightSeverityFilter.toLowerCase()) return false;
      return true;
    });
  }, [insights, insightSeverityFilter, showDismissed]);

  const renderLibrary = () => {
    const categoriesToShow = categoryFilter === 'All' 
      ? categories.slice(1) 
      : [categoryFilter];

    return (
      <div className={styles.libraryGrid}>
        {categoriesToShow.map(cat => {
          const catReports = filteredReports.filter(r => r.category === cat);
          if (catReports.length === 0) return null;
          
          return (
            <section key={cat} className={styles.categorySection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{cat}</h2>
                <Badge variant="neutral">{catReports.length}</Badge>
              </div>
              <div className={styles.reportGrid}>
                {catReports.map(report => (
                  <ReportCard 
                    key={report.id} 
                    report={report} 
                    onClick={() => setSelectedReport(report)}
                    onToggleSave={toggleSaveReport}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderSaved = () => {
    const savedReports = reports.filter(r => r.saved);
    
    if (savedReports.length === 0) {
      return (
        <EmptyState 
          icon={Bookmark}
          title="No saved reports yet"
          description="Bookmark reports from the library to save them here for quick access."
        />
      );
    }

    return (
      <div className={styles.reportGrid}>
        {savedReports.map(report => (
          <ReportCard 
            key={report.id} 
            report={report} 
            onClick={() => setSelectedReport(report)}
            onToggleSave={toggleSaveReport}
          />
        ))}
      </div>
    );
  };

  const renderScheduled = () => (
    <div className={styles.scheduledView}>
      <div className={styles.viewHeader}>
        <h3 className={styles.viewTitle}>Active schedules</h3>
        <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setIsScheduleModalOpen(true)}>
          Schedule a report
        </Button>
      </div>
      
      <div className={styles.tableCard}>
        <table className={styles.scheduleTable}>
          <thead>
            <tr>
              <th>Report name</th>
              <th>Frequency</th>
              <th>Schedule</th>
              <th>Next run</th>
              <th>Recipients</th>
              <th>Format</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scheduled.map(s => (
              <tr key={s.id}>
                <td>
                  <div className={styles.reportNameCell}>
                    <span className={styles.reportTitle}>{s.reportTitle}</span>
                    <span className={styles.reportId}>{s.reportId}</span>
                  </div>
                </td>
                <td><Badge variant="neutral">{s.frequency}</Badge></td>
                <td>{s.frequency === 'Weekly' ? `Mondays at ${s.timeOfDay}` : `${s.dayOfMonth || 1}st at ${s.timeOfDay}`}</td>
                <td>{new Date(s.nextRun).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <div className={styles.recipientAvatars}>
                    {s.recipients.slice(0, 3).map((r, i) => (
                      <div key={i} className={styles.avatar} title={r}>{r[0]}</div>
                    ))}
                    {s.recipients.length > 3 && (
                      <div className={styles.avatarMore}>+{s.recipients.length - 3}</div>
                    )}
                  </div>
                </td>
                <td><Badge variant="info">{s.format}</Badge></td>
                <td>
                  <div className={styles.statusToggle} onClick={() => handleScheduleToggle(s.id)} style={{ cursor: 'pointer' }}>
                    <div className={`${styles.toggle} ${s.active ? styles.active : ''}`} />
                  </div>
                </td>
                <td>
                  <ActionMenu
                    items={[
                      { label: 'Edit', icon: Edit, onClick: () => addToast({ message: `Edit form opened for ${s.reportTitle}` }) },
                      { label: 'Run now', icon: RefreshCcw, onClick: () => addToast({ type: 'success', message: `${s.reportTitle} run triggered` }) },
                      { label: s.active ? 'Pause' : 'Resume', icon: Pause, onClick: () => handleScheduleToggle(s.id) },
                      { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => handleScheduleDelete(s.id) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAIInsights = () => {
    const activeInsights = insights.filter(i => !i.dismissed);

    return (
      <div className={styles.insightsView}>
        <div className={styles.insightsHeader}>
          <div className={styles.insightKpis}>
            <div className={styles.insightKpi}>
              <span className={styles.kpiLabel}>Active insights</span>
              <span className={styles.kpiValue}>{activeInsights.length}</span>
            </div>
            <div className={styles.insightKpi}>
              <span className={styles.kpiLabel}>Critical</span>
              <span className={styles.kpiValue} style={{color: 'var(--color-danger)'}}>
                {activeInsights.filter(i => i.severity === 'critical').length}
              </span>
            </div>
            <div className={styles.insightKpi}>
              <span className={styles.kpiLabel}>Saved</span>
              <span className={styles.kpiValue}>{insights.filter(i => i.saved).length}</span>
            </div>
            <div className={styles.insightKpi}>
              <span className={styles.kpiLabel}>Last refreshed</span>
              <span className={styles.kpiValue} style={{fontSize: '12px', fontWeight: '500'}}>12 min ago</span>
              <button className={styles.refreshBtn} onClick={() => addToast({ type: 'info', message: 'Insights refreshed' })}><RefreshCcw size={14} /></button>
            </div>
          </div>
        </div>

        <div className={styles.insightFilters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Severity</span>
            <div className={styles.chipGroup}>
              {(['All', 'Critical', 'Warning', 'Info', 'Opportunity'] as const).map(s => (
                <button
                  key={s}
                  className={`${styles.filterChip} ${insightSeverityFilter === s ? styles.activeChip : ''}`}
                  onClick={() => setInsightSeverityFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.toggleLabel}>
            <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} />
            <span>Show dismissed</span>
          </label>
        </div>

        <div className={styles.insightList}>
          {visibleInsights.map(insight => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              onDismiss={handleDismissInsight}
              onSave={handleSaveInsight}
              onAction={handleInsightAction}
            />
          ))}
          {visibleInsights.length === 0 && (
            <div className={styles.empty}>No insights match your filters.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={BarChart2} navItems={warehouseNav}>
      <div className={styles.page}>
        <PageHeader
          title="Reports & analytics"
          subtitle="Insights across warehouse operations"
          primaryAction={{
            label: 'Custom report',
            icon: Plus,
            onClick: () => setIsCustomModalOpen(true)
          }}
          secondaryActions={[
            {
              label: 'Saved reports',
              icon: Bookmark,
              onClick: () => setActiveTab('saved')
            },
            {
              label: 'Export all',
              icon: Download,
              onClick: () => addToast({ type: 'success', message: 'Exporting all reports as ZIP archive (15.2 MB)' })
            }
          ]}
        />

        <div className={styles.filterBar}>
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Date range</span>
            <div className={styles.chipGroup}>
              {['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom'].map(range => (
                <button 
                  key={range} 
                  className={`${styles.filterChip} ${dateRange === range ? styles.activeChip : ''}`}
                  onClick={() => setDateRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Category</span>
            <div className={styles.chipGroup}>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`${styles.filterChip} ${categoryFilter === cat ? styles.activeChip : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Warehouse</span>
            <div className={styles.warehouseSelect}>
              <select className={styles.select}>
                {warehouses.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.content}>
          {activeTab === 'library' && renderLibrary()}
          {activeTab === 'saved' && renderSaved()}
          {activeTab === 'scheduled' && renderScheduled()}
          {activeTab === 'insights' && renderAIInsights()}
        </div>

        {/* Modals */}
        <ReportDetailModal 
          report={selectedReport} 
          isOpen={!!selectedReport} 
          onClose={() => setSelectedReport(null)} 
          onToggleSave={toggleSaveReport}
        />

        <ScheduleReportModal 
          isOpen={isScheduleModalOpen} 
          onClose={() => setIsScheduleModalOpen(false)} 
          reports={reports}
        />

        <CustomReportModal 
          isOpen={isCustomModalOpen} 
          onClose={() => setIsCustomModalOpen(false)} 
        />
      </div>
    </ModuleLayout>
  );
};

export default WarehouseReports;
