import { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Download, 
  Plus, 
  Bookmark,
  BookmarkCheck,
  RefreshCcw,
  Trash2,
  Pause,
  Play
} from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { useToast } from '@/components/common/Toast/ToastContext';
import { ActionMenu } from '@/components/common/ActionMenu/ActionMenu';
import { rdNav } from '@/config/rdNav';

// Subcomponents
import { ReportDetailModal } from './components/ReportDetailModal/ReportDetailModal';
import { ScheduleReportModal } from './components/ScheduleReportModal/ScheduleReportModal';
import { CustomReportBuilderModal } from './components/CustomReportBuilderModal/CustomReportBuilderModal';

// Mock Data
import { 
  reportDefinitions as initialReports, 
  scheduledReports as initialScheduled, 
  aiInsights as initialInsights,
  ReportDefinition,
  ScheduledReport,
  RDInsight
} from './mockData/reportsData';
import { PeriodSelect } from '@/components/common/PeriodSelect/PeriodSelect';
import { type PeriodValue } from '@/utils/periodFilter';

import styles from './RDReports.module.css';

export default function RDReports() {
  const { addToast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('library');
  const [period, setPeriod] = useState<PeriodValue>('month');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [seasonFilter, setSeasonFilter] = useState('All seasons');
  const [cropFilter, setCropFilter] = useState('All crops');
  const [insightSeverityFilter, setInsightSeverityFilter] = useState<'All' | 'Critical' | 'Warning' | 'Info' | 'Opportunity'>('All');
  const [showDismissed, setShowDismissed] = useState(false);

  const [reports, setReports] = useState<ReportDefinition[]>(initialReports);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>(initialScheduled);
  const [insights, setInsights] = useState<RDInsight[]>(initialInsights);

  // Modal triggers
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const tabs = [
    { key: 'library', label: 'Library' },
    { key: 'saved', label: `Saved reports (${reports.filter(r => r.saved).length})` },
    { key: 'scheduled', label: `Scheduled reports (${scheduled.length})` },
    { key: 'insights', label: `AI insights (${insights.filter(i => !i.dismissed).length})` }
  ];

  const categories = ['All', 'Breeding', 'Trials', 'Phenotyping', 'Varieties', 'Compliance', 'AI insights'];
  const seasons = ['All seasons', 'Kharif 2026', 'Rabi 2026-27', 'Kharif 2027'];
  const crops = ['All crops', 'Cotton', 'Maize', 'Paddy', 'Sorghum', 'Sunflower', 'Soybean', 'Tomato'];

  // Toggle saved reports state
  const handleToggleSave = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, saved: !r.saved } : r));
    const target = reports.find(r => r.id === id);
    if (target) {
      addToast({ 
        type: 'success', 
        message: target.saved ? 'Removed from saved reports' : 'Added to saved reports' 
      });
    }
  };

  // Add scheduled report
  const handleAddSchedule = (newSchedule: ScheduledReport) => {
    setScheduled(prev => [newSchedule, ...prev]);
  };

  // Add custom compiled report
  const handleAddCustomReport = (title: string) => {
    const newReport: ReportDefinition = {
      id: `RPT-CST-${Math.floor(Math.random() * 1000)}`,
      title,
      category: 'Trials',
      description: 'Custom-generated research analytics and data correlations compilation.',
      format: 'PDF',
      lastRunAt: new Date().toISOString().split('T')[0],
      saved: true
    };
    setReports(prev => [newReport, ...prev]);
  };

  // Toggle active scheduled report
  const handleScheduleToggle = (id: string) => {
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    const target = scheduled.find(s => s.id === id);
    if (target) {
      addToast({ 
        type: target.active ? 'warning' : 'success', 
        message: `Schedule for "${target.reportTitle}" ${target.active ? 'paused' : 'activated'}` 
      });
    }
  };

  // Delete scheduled report
  const handleScheduleDelete = (id: string) => {
    setScheduled(prev => prev.filter(s => s.id !== id));
    addToast({ type: 'warning', message: 'Report schedule deleted' });
  };

  // Dismiss AI insights
  const handleDismissInsight = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, dismissed: true } : i));
    addToast({ message: 'Agronomic insight dismissed' });
  };

  // Save AI insights
  const handleSaveInsight = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, saved: !i.saved } : i));
    const target = insights.find(i => i.id === id);
    if (target) {
      addToast({ 
        type: 'success', 
        message: target.saved ? 'Removed from saved insights' : 'Insight saved to bookmarks' 
      });
    }
  };

  // Action on AI insight
  const handleInsightAction = (insight: RDInsight) => {
    addToast({ 
      type: 'success', 
      message: `Action triggered for: "${insight.title}"` 
    });
  };

  // Filters Library
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [reports, categoryFilter]);

  // Filters Saved Reports
  const savedReports = useMemo(() => {
    return reports.filter(r => r.saved);
  }, [reports]);

  // Filters AI Insights
  const visibleInsights = useMemo(() => {
    return insights.filter(i => {
      if (!showDismissed && i.dismissed) return false;
      if (insightSeverityFilter !== 'All' && i.severity !== insightSeverityFilter.toLowerCase()) return false;
      return true;
    });
  }, [insights, insightSeverityFilter, showDismissed]);

  // Render Category/Season/Crop Toolbar
  const renderLibraryToolbar = () => (
    <div className={styles.libraryToolbar}>
      {/* Category Chips */}
      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>R&D Category</span>
        <div className={styles.chipGroup}>
          {categories.map((cat) => (
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

      {/* Dropdowns row */}
      <div className={styles.dropdownsRow}>
        <div className={styles.dropdownSelect}>
          <span className={styles.filterLabel}>Research Season</span>
          <select 
            value={seasonFilter} 
            onChange={(e) => setSeasonFilter(e.target.value)}
            className={styles.select}
            aria-label="Season filter"
          >
            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.dropdownSelect}>
          <span className={styles.filterLabel}>Research Crop</span>
          <select 
            value={cropFilter} 
            onChange={(e) => setCropFilter(e.target.value)}
            className={styles.select}
            aria-label="Crop filter"
          >
            {crops.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  // Render Library Cards
  const renderLibrary = () => {
    if (filteredReports.length === 0) {
      return (
        <EmptyState 
          icon={FlaskConical} 
          title="No reports match your filters" 
          description="Try adjusting your category selection or search keywords." 
        />
      );
    }

    return (
      <div className={styles.libraryGrid}>
        {filteredReports.map((report) => (
          <div 
            key={report.id} 
            className={styles.reportCard}
            onClick={() => setSelectedReport(report)}
          >
            <div className={styles.cardHeader}>
              <Badge variant="info">{report.category}</Badge>
              <button
                className={styles.cardBookmark}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSave(report.id);
                }}
                aria-label={report.saved ? 'Remove bookmark' : 'Bookmark report'}
              >
                {report.saved ? (
                  <BookmarkCheck size={18} className={styles.activeStar} />
                ) : (
                  <Bookmark size={18} className={styles.emptyStar} />
                )}
              </button>
            </div>
            <h4 className={styles.cardTitle}>{report.title}</h4>
            <p className={styles.cardDesc}>{report.description}</p>
            <div className={styles.cardFooter}>
              <span className={styles.cardMeta}>Last run: {report.lastRunAt}</span>
              <span className={styles.cardFormat}>{report.format}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Saved Reports Cards
  const renderSaved = () => {
    if (savedReports.length === 0) {
      return (
        <EmptyState 
          icon={Bookmark} 
          title="No saved reports yet" 
          description="Bookmark reports from the Library tab to quickly access them here." 
        />
      );
    }

    return (
      <div className={styles.libraryGrid}>
        {savedReports.map((report) => (
          <div 
            key={report.id} 
            className={styles.reportCard}
            onClick={() => setSelectedReport(report)}
          >
            <div className={styles.cardHeader}>
              <Badge variant="info">{report.category}</Badge>
              <button
                className={styles.cardBookmark}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSave(report.id);
                }}
              >
                <BookmarkCheck size={18} className={styles.activeStar} />
              </button>
            </div>
            <h4 className={styles.cardTitle}>{report.title}</h4>
            <p className={styles.cardDesc}>{report.description}</p>
            <div className={styles.cardFooter}>
              <span className={styles.cardMeta}>Last run: {report.lastRunAt}</span>
              <span className={styles.cardFormat}>{report.format}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Scheduled delivery timelines
  const renderScheduled = () => (
    <div className={styles.scheduledPane}>
      <div className={styles.paneHeaderRow}>
        <h3>Automated Delivery Schedules</h3>
        <Button 
          variant="primary" 
          size="sm" 
          leftIcon={Plus}
          onClick={() => setIsScheduleModalOpen(true)}
        >
          Schedule new report
        </Button>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.scheduleTable}>
          <thead>
            <tr>
              <th>Report template</th>
              <th>Frequency</th>
              <th>Schedule</th>
              <th>Next run time</th>
              <th>Recipients</th>
              <th>Format</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scheduled.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className={styles.tableReportInfo}>
                    <span className={styles.tableReportTitle}>{s.reportTitle}</span>
                    <span className={styles.tableReportId}>{s.reportId}</span>
                  </div>
                </td>
                <td><Badge variant="neutral">{s.frequency}</Badge></td>
                <td>
                  {s.frequency === 'Weekly' 
                    ? `${s.dayOfWeek}s at ${s.timeOfDay}` 
                    : `${s.dayOfMonth || 1}st at ${s.timeOfDay}`}
                </td>
                <td className={styles.mono}>
                  {new Date(s.nextRun).toLocaleDateString([], { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </td>
                <td>
                  <div className={styles.recipientGroup}>
                    {s.recipients.slice(0, 2).map((r, i) => (
                      <div key={i} className={styles.avatar} title={r}>{r[0]}</div>
                    ))}
                    {s.recipients.length > 2 && (
                      <span className={styles.avatarMore}>+{s.recipients.length - 2}</span>
                    )}
                  </div>
                </td>
                <td><Badge variant="info">{s.format}</Badge></td>
                <td>
                  <div 
                    className={`${styles.toggleSwitch} ${s.active ? styles.activeSwitch : ''}`}
                    onClick={() => handleScheduleToggle(s.id)}
                  >
                    <div className={styles.toggleHandle} />
                  </div>
                </td>
                <td>
                  <ActionMenu 
                    items={[
                      { label: 'Run manual dispatch', icon: Play, onClick: () => addToast({ type: 'success', message: `Dispatched scheduled pdf to ${s.recipients.length} recipients` }) },
                      { label: s.active ? 'Pause delivery' : 'Activate delivery', icon: Pause, onClick: () => handleScheduleToggle(s.id) },
                      { label: 'Remove schedule', icon: Trash2, variant: 'danger' as const, onClick: () => handleScheduleDelete(s.id) }
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

  // Render AI Insights
  const renderAIInsights = () => (
    <div className={styles.insightsPane}>
      {/* Metrics Row */}
      <div className={styles.insightsStats}>
        <div className={styles.insightStatCard}>
          <span className={styles.statLabel}>Active AI Alerts</span>
          <span className={styles.statValue}>{insights.filter(i => !i.dismissed).length}</span>
        </div>
        <div className={styles.insightStatCard}>
          <span className={styles.statLabel}>Critical Compliance Warnings</span>
          <span className={styles.statValue} style={{ color: 'var(--color-danger)' }}>
            {insights.filter(i => !i.dismissed && i.severity === 'critical').length}
          </span>
        </div>
        <div className={styles.insightStatCard}>
          <span className={styles.statLabel}>Opportunities Logged</span>
          <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>
            {insights.filter(i => !i.dismissed && i.severity === 'opportunity').length}
          </span>
        </div>
        <div className={styles.insightStatCard}>
          <span className={styles.statLabel}>Telemetry Analysis Sync</span>
          <span className={styles.statValue} style={{ fontSize: '13px', fontWeight: '600' }}>Last checked 12 mins ago</span>
          <button 
            className={styles.refreshBtn}
            onClick={() => addToast({ type: 'info', message: 'Agronomic telemetry inputs refreshed' })}
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={styles.insightsFilters}>
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Severity Level</span>
          <div className={styles.chipGroup}>
            {(['All', 'Critical', 'Warning', 'Info', 'Opportunity'] as const).map((sev) => (
              <button
                key={sev}
                className={`${styles.filterChip} ${insightSeverityFilter === sev ? styles.activeChip : ''}`}
                onClick={() => setInsightSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.toggleCheckboxRow}>
          <input 
            type="checkbox" 
            checked={showDismissed} 
            onChange={(e) => setShowDismissed(e.target.checked)} 
          />
          <span>Show dismissed alerts</span>
        </label>
      </div>

      {/* Grid List */}
      <div className={styles.insightsGrid}>
        {visibleInsights.map((insight) => {
          const badgeVar = 
            insight.severity === 'critical' ? 'danger' :
            insight.severity === 'warning' ? 'warning' :
            insight.severity === 'opportunity' ? 'success' : 'info';
          return (
            <div 
              key={insight.id} 
              className={`${styles.insightCard} ${insight.dismissed ? styles.dismissedInsightCard : ''} ${insight.severity === 'opportunity' ? styles.severityOpportunity : ''}`}
            >
              <div className={styles.insightCardHeader}>
                <div className={styles.badgeLabelRow}>
                  <Badge variant={badgeVar}>{insight.severity.toUpperCase()}</Badge>
                  <span className={styles.insightSource}>{insight.source}</span>
                </div>
                <div className={styles.insightCardActions}>
                  <button 
                    className={styles.cardBookmark}
                    onClick={() => handleSaveInsight(insight.id)}
                    aria-label="Bookmark insight"
                  >
                    {insight.saved ? (
                      <BookmarkCheck size={16} className={styles.activeStar} />
                    ) : (
                      <Bookmark size={16} className={styles.emptyStar} />
                    )}
                  </button>
                </div>
              </div>
              <h4 className={styles.insightCardTitle}>{insight.title}</h4>
              <p className={styles.insightCardDesc}>{insight.description}</p>
              <div className={styles.insightCardFooter}>
                <span className={styles.cardMeta}>Generated: {new Date(insight.generatedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <div className={styles.insightFooterBtnGroup}>
                  {!insight.dismissed && (
                    <button 
                      className={styles.dismissBtn}
                      onClick={() => handleDismissInsight(insight.id)}
                    >
                      Dismiss
                    </button>
                  )}
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleInsightAction(insight)}
                  >
                    Take Action →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {visibleInsights.length === 0 && (
          <div className={styles.emptyInsightsState}>
            No AI insights match your selected criteria.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ModuleLayout moduleName="R&D" moduleIcon={FlaskConical} navItems={rdNav}>
      {/* Page Header (Inline Markup) */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & analytics</h1>
          <p className={styles.pageSubtitle}>Research insights, trial summaries, and breeding analytics</p>
        </div>
        <div className={styles.headerActions}>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Button 
            variant="secondary" 
            leftIcon={Download}
            onClick={() => addToast({ type: 'info', message: 'Exporting report catalog index...' })}
          >
            Export library
          </Button>
          <Button 
            variant="primary" 
            leftIcon={Plus}
            onClick={() => setIsCustomModalOpen(true)}
          >
            Custom report
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Filter Toolbars */}
      {activeTab === 'library' && renderLibraryToolbar()}

      {/* Tab Views */}
      <div className={styles.contentArea}>
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'saved' && renderSaved()}
        {activeTab === 'scheduled' && renderScheduled()}
        {activeTab === 'insights' && renderAIInsights()}
      </div>

      {/* MODALS */}
      {selectedReport && (
        <ReportDetailModal 
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          onToggleSave={handleToggleSave}
        />
      )}

      {isScheduleModalOpen && (
        <ScheduleReportModal 
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          reports={reports}
          onAddSchedule={handleAddSchedule}
        />
      )}

      {isCustomModalOpen && (
        <CustomReportBuilderModal 
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          onAddReport={handleAddCustomReport}
        />
      )}
    </ModuleLayout>
  );
}
