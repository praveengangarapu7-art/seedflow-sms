import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Card } from '@/components/common/Card/Card';
import { Badge } from '@/components/common/Badge/Badge';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { procurementNav } from '@/config/procurementNav';
import { mockMonthlySpend, mockSpendByCategory, mockSpendBySupplier } from './mockData/reportsData';
import { 
  ShoppingCart, BarChart3, Award, Clock, TrendingUp, Sparkles, 
  FileCheck, TrendingDown, AlertTriangle, Workflow, Wallet, Download
} from 'lucide-react';
import styles from './ProcurementReports.module.css';

export default function ProcurementReports() {
  const [activeReport, setActiveReport] = useState<any>(null);

  const reports = [
    {
      id: 'spend-analysis',
      title: 'Spend Analysis Dashboard',
      description: 'Detailed breakdown of procurement spend by category, supplier, and time',
      tag: 'Financial',
      icon: BarChart3,
      previewType: 'bar',
      lastGenerated: '2h ago'
    },
    {
      id: 'supplier-scorecard',
      title: 'Supplier Performance Scorecard',
      description: 'Quality, delivery, and cost ratings per supplier',
      tag: 'Performance',
      icon: Award,
      previewType: 'rings',
      lastGenerated: '1d ago'
    },
    {
      id: 'cycle-time',
      title: 'Procurement Cycle Time',
      description: 'Time from PR to delivery, broken down by stage',
      tag: 'Operational',
      icon: Clock,
      previewType: 'line',
      lastGenerated: '3h ago'
    },
    {
      id: 'price-variance',
      title: 'Purchase Price Variance',
      description: 'Actual price vs budgeted price across categories',
      tag: 'Financial',
      icon: TrendingUp,
      previewType: 'kpi',
      kpiValue: '2.4% fav',
      lastGenerated: '5h ago'
    },
    {
      id: 'demand-forecast',
      title: 'Demand Forecasting (AI)',
      description: 'Predicted procurement needs for next quarter',
      tag: 'AI',
      icon: Sparkles,
      previewType: 'line',
      lastGenerated: '12h ago'
    },
    {
      id: 'contract-compliance',
      title: 'Contract Compliance Rate',
      description: '% of POs adhering to contracted rates',
      tag: 'Compliance',
      icon: FileCheck,
      previewType: 'kpi',
      kpiValue: '96.4%',
      lastGenerated: '1d ago'
    },
    {
      id: 'cost-savings',
      title: 'Cost Savings Report',
      description: 'Savings from RFQ negotiations and bulk discounts',
      tag: 'Financial',
      icon: TrendingDown,
      previewType: 'kpi',
      kpiValue: '₹18.5L',
      lastGenerated: '2d ago'
    },
    {
      id: '3way-exceptions',
      title: '3-Way Match Exceptions',
      description: 'Invoices with discrepancies and resolution status',
      tag: 'Compliance',
      icon: AlertTriangle,
      previewType: 'kpi',
      kpiValue: '12',
      lastGenerated: '4h ago'
    },
    {
      id: 'approval-bottleneck',
      title: 'Approval Bottleneck Analysis',
      description: 'Average approval times by stage and approver',
      tag: 'Operational',
      icon: Workflow,
      previewType: 'bar',
      lastGenerated: '1w ago'
    },
    {
      id: 'budget-utilization',
      title: 'Budget Utilization Report',
      description: 'Real-time budget consumption across departments',
      tag: 'Financial',
      icon: Wallet,
      previewType: 'donut',
      lastGenerated: '1h ago'
    }
  ];

  const reportPageRef = useRef<HTMLDivElement>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const handleExportAll = async () => {
    if (!reportPageRef.current) return;

    setIsExportingAll(true);
    try {
      const element = reportPageRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => {
          return el.getAttribute('data-export-ignore') === 'true';
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Procurement_Reports_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting all reports:', error);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleExport = (format: string) => {
    console.log(`Exporting ${activeReport?.title} as ${format}`);
  };

  const renderMiniPreview = (report: any) => {
    switch(report.previewType) {
      case 'bar':
        return (
          <div className={styles.miniBarChart}>
            <div className={styles.miniBar} style={{ height: '40%' }}></div>
            <div className={styles.miniBar} style={{ height: '60%' }}></div>
            <div className={styles.miniBar} style={{ height: '30%' }}></div>
            <div className={styles.miniBar} style={{ height: '80%' }}></div>
            <div className={styles.miniBar} style={{ height: '100%' }}></div>
          </div>
        );
      case 'kpi':
        return <div className={styles.miniKpi}>{report.kpiValue}</div>;
      case 'line':
        return (
          <svg width="60" height="30" viewBox="0 0 60 30">
            <polyline points="0,25 15,15 30,20 45,5 60,10" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
          </svg>
        );
      case 'donut':
      case 'rings':
        return (
          <svg width="30" height="30" viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="10" fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle cx="15" cy="15" r="10" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeDasharray="40 20" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <div ref={reportPageRef} className={styles.reportsContainer}>
        <PageHeader
          title="Reports & analytics"
          description="Insights into procurement operations"
          primaryAction={{
            label: isExportingAll ? 'Exporting...' : 'Export all',
            onClick: handleExportAll,
            disabled: isExportingAll
          }}
        />

        <div className={styles.filterBar} data-export-ignore="true">
        <select className={styles.filterSelect}>
          <option>Last 30 Days</option>
          <option>Last Quarter</option>
          <option>Year to Date</option>
          <option>Last 12 Months</option>
        </select>
        <select className={styles.filterSelect}>
          <option>All Departments</option>
          <option>Laboratory</option>
          <option>Warehouse</option>
          <option>Procurement</option>
        </select>
        <select className={styles.filterSelect}>
          <option>All Categories</option>
          <option>Raw Seeds</option>
          <option>Packaging</option>
          <option>Chemicals</option>
        </select>
        <select className={styles.filterSelect}>
          <option>All Suppliers</option>
          <option>Preferred Only</option>
          <option>Top 10 by Spend</option>
        </select>
      </div>

      <div className={styles.reportGrid}>
        {reports.map(report => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className={styles.reportCard} onClick={() => setActiveReport(report)}>
              <div className={styles.cardTop}>
                <div className={styles.iconWrapper}>
                  <Icon size={18} />
                </div>
                <Badge variant="neutral">{report.tag}</Badge>
              </div>
              <h3 className={styles.cardTitle}>{report.title}</h3>
              <p className={styles.cardDesc}>{report.description}</p>
              
              <div className={styles.miniPreview}>
                {renderMiniPreview(report)}
              </div>
              
              <div className={styles.cardBottom}>
                <span className={styles.lastGenerated}>Last generated: {report.lastGenerated}</span>
                <span className={styles.viewReport}>View report →</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!activeReport}
        onClose={() => setActiveReport(null)}
        title=""
        size="xl"
      >
        {activeReport && (
          <div style={{ padding: '0 24px 24px' }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{activeReport.title}</h2>
                <p className={styles.modalDesc}>{activeReport.description} · Last 12 Months</p>
              </div>
              <div className={styles.exportButtons}>
                <Button variant="ghost" icon={<Download size={16} />} onClick={() => handleExport('PDF')}>PDF</Button>
                <Button variant="ghost" icon={<Download size={16} />} onClick={() => handleExport('Excel')}>Excel</Button>
                <Button variant="ghost" icon={<Download size={16} />} onClick={() => handleExport('CSV')}>CSV</Button>
              </div>
            </div>

            {/* Spend Analysis Specific Content */}
            {activeReport.id === 'spend-analysis' ? (
              <>
                <div className={styles.kpiGrid}>
                  <Card style={{ padding: 16 }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Total Spend</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>₹2.45 Cr</div>
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>vs Last Period</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-danger)' }}>+14.2%</div>
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Top Category</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Raw Seeds (45%)</div>
                  </Card>
                  <Card style={{ padding: 16 }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Top Supplier</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>AgriChem Ind.</div>
                  </Card>
                </div>

                <div className={styles.chartRow}>
                  <div className={styles.chartContainer}>
                    <h3 className={styles.chartTitle}>Monthly Spend Trend</h3>
                    <div className={styles.barChartArea}>
                      {mockMonthlySpend.map((item, idx) => {
                        const maxAmount = Math.max(...mockMonthlySpend.map(i => i.amount));
                        const heightPct = (item.amount / maxAmount) * 100;
                        return (
                          <div key={idx} className={styles.barCol}>
                            <div className={styles.barFill} style={{ height: `${heightPct}%` }} title={`₹${item.amount}L`}></div>
                            <div className={styles.barLabel}>{item.month}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.chartContainer}>
                    <h3 className={styles.chartTitle}>Breakdowns</h3>
                    <div className={styles.donutRow}>
                      <div className={styles.donutContainer}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>By Category</h4>
                        {mockSpendByCategory.map((cat, idx) => (
                          <div key={idx} className={styles.donutRowItem}>
                            <div className={styles.donutLabel}>{cat.category}</div>
                            <div className={styles.donutBarTrack}>
                              <div className={styles.donutBarFill} style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div>
                            </div>
                            <div className={styles.donutValue}>{cat.percentage}%</div>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '12px 0' }}></div>
                      
                      <div className={styles.donutContainer}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>By Supplier</h4>
                        {mockSpendBySupplier.map((sup, idx) => (
                          <div key={idx} className={styles.donutRowItem}>
                            <div className={styles.donutLabel}>{sup.supplier}</div>
                            <div className={styles.donutBarTrack}>
                              <div className={styles.donutBarFill} style={{ width: `${sup.percentage}%`, backgroundColor: sup.color }}></div>
                            </div>
                            <div className={styles.donutValue}>{sup.percentage}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Generic simple content for other reports */
              <div className={styles.chartRow}>
                <div className={styles.chartContainer} style={{ height: 300, justifyContent: 'center', alignItems: 'center', gridColumn: 'span 2' }}>
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <activeReport.icon size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                    <p>Detailed visualization for {activeReport.title}</p>
                    <p style={{ fontSize: '0.85rem' }}>Full implementation omitted for this demo.</p>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.insightsPanel}>
              <h3 className={styles.insightsTitle}>
                <Sparkles size={18} /> AI Generated Insights
              </h3>
              <ul className={styles.insightsList}>
                {activeReport.id === 'spend-analysis' ? (
                  <>
                    <li>Spending in Q4 is projected to be 15% higher than Q1, primarily driven by the Raw Seeds category.</li>
                    <li>Consolidating Packaging spend from 3 suppliers to 1 could yield estimated savings of ₹4.5L annually.</li>
                    <li>AgriChem Industries accounts for 35% of total spend; consider negotiating volume discounts for the upcoming fiscal year.</li>
                  </>
                ) : (
                  <>
                    <li>Key metric shows a 12% improvement compared to the same period last year.</li>
                    <li>An anomaly was detected in last month's data, requiring manual review of affected records.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </ModuleLayout>
  );
}
