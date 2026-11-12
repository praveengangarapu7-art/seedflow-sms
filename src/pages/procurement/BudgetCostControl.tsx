import { useState } from 'react';
import { ShoppingCart, Plus, Settings, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast';
import { useCostCenters } from './procurementStore';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import type { CostCenter } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import styles from './BudgetCostControl.module.css';

function utilColor(util: number): string {
  if (util > 100) return styles.spendBarDanger;
  if (util > 90)  return styles.spendBarWarning;
  if (util > 75)  return styles.spendBarPrimary;
  return styles.spendBarSuccess;
}

function statusClass(s: CostCenter['status']): string {
  if (s === 'On Track')       return styles.stOnTrack;
  if (s === 'Warning')        return styles.stWarning;
  if (s === 'Critical')       return styles.stCritical;
  if (s === 'Over Budget')    return styles.stOver;
  return styles.stUnderutilized;
}

const COLUMNS: DataTableColumn<CostCenter>[] = [
  { key: 'costCenter', header: 'Cost center', sortable: true },
  { key: 'department', header: 'Department', width: '130px', sortable: true },
  {
    key: 'allocated', header: 'Allocated', width: '120px', align: 'right',
    render: (row) => formatIndianCurrency(row.allocated),
  },
  {
    key: 'committed', header: 'Committed', width: '120px', align: 'right',
    render: (row) => formatIndianCurrency(row.committed),
  },
  {
    key: 'spent', header: 'Spent', width: '120px', align: 'right',
    render: (row) => formatIndianCurrency(row.spent),
  },
  {
    key: 'available', header: 'Available', width: '120px', align: 'right',
    render: (row) => (
      <span style={{ color: row.available < 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
        {row.available < 0 ? '-' : ''}{formatIndianCurrency(Math.abs(row.available))}
      </span>
    ),
  },
  {
    key: 'utilization', header: 'Utilization', width: '160px',
    render: (row) => (
      <div className={styles.utilCell}>
        <div className={styles.utilTrack}>
          <div className={`${styles.utilFill} ${utilColor(row.utilization)}`}
            style={{ width: `${Math.min(row.utilization, 100)}%` }} />
        </div>
        <span className={styles.utilPct}>{row.utilization.toFixed(1)}%</span>
      </div>
    ),
  },
  {
    key: 'status', header: 'Status', width: '120px',
    render: (row) => <span className={`${styles.statusBadge} ${statusClass(row.status)}`}>{row.status}</span>,
  },
];

// Quarterly trend chart (manual SVG)
function QuarterlyTrendChart() {
  const W = 380, H = 180, P = 30;
  const budgets = [50, 60, 65, 75]; // in lakhs
  const actuals = [45, 58, 70, 72];
  const xStep = (W - P * 2) / 3;
  const yScale = (v: number) => H - P - ((v - 30) / 60) * (H - P * 2);
  const budgetPath = budgets.map((b, i) => `${i === 0 ? 'M' : 'L'} ${P + i * xStep} ${yScale(b)}`).join(' ');
  const actualPath = actuals.map((a, i) => `${i === 0 ? 'M' : 'L'} ${P + i * xStep} ${yScale(a)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.qChart}>
      {[30, 50, 70, 90].map((g) => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={yScale(g)} y2={yScale(g)}
            stroke="var(--color-border-light)" strokeDasharray="3 3" />
          <text x={4} y={yScale(g) + 4} fontSize="10" fill="var(--color-text-muted)">{g}L</text>
        </g>
      ))}
      {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
        <text key={q} x={P + i * xStep} y={H - 8} fontSize="10"
          fill="var(--color-text-muted)" textAnchor="middle">{q}</text>
      ))}
      <path d={budgetPath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      <path d={actualPath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      {actuals.map((a, i) => (
        <circle key={i} cx={P + i * xStep} cy={yScale(a)} r="4" fill="var(--color-primary)" />
      ))}
    </svg>
  );
}

// Spend vs Budget chart
function SpendVsBudgetChart({ data }: { data: CostCenter[] }) {
  const top8 = [...data].sort((a, b) => b.spent - a.spent).slice(0, 8);
  return (
    <div>
      {top8.map((cc) => (
        <div key={cc.id} className={styles.spendBarRow}>
          <span className={styles.spendBarLabel}>{cc.costCenter}</span>
          <div className={styles.spendBarTrack}>
            <div className={`${styles.spendBarFill} ${utilColor(cc.utilization)}`}
              style={{ width: `${Math.min(cc.utilization, 100)}%` }} />
          </div>
          <span className={styles.spendBarPct}>{cc.utilization.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

// Manage Budgets Modal
function recalc(cc: CostCenter, allocated: number): CostCenter {
  const available = allocated - cc.committed - cc.spent;
  const utilization = allocated > 0 ? Math.round(((cc.committed + cc.spent) / allocated) * 100) : 0;
  const status: CostCenter['status'] = utilization > 100 ? 'Over Budget' : utilization >= 90 ? 'Critical' : utilization >= 75 ? 'Warning' : utilization < 30 ? 'Underutilized' : 'On Track';
  return { ...cc, allocated, available, utilization, status };
}

function ManageBudgetsModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useToast();
  const [mockCostCenters, setCostCenters] = useCostCenters();
  const [edits, setEdits] = useState<Record<string, string>>({});
  return (
    <Modal isOpen onClose={onClose} title="Manage budgets" size="lg" footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => {
          setCostCenters((prev) => prev.map((cc) => (edits[cc.id] !== undefined && edits[cc.id] !== '' ? recalc(cc, Number(edits[cc.id]) || 0) : cc)));
          addToast('Budget allocations saved', 'success'); onClose();
        }}>Save changes</Button>
      </div>
    }>
      <table className={styles.manageGrid}>
        <thead><tr><th>Cost center</th><th>Department</th><th>Period</th><th>Allocated (₹)</th></tr></thead>
        <tbody>
          {mockCostCenters.map((cc) => (
            <tr key={cc.id}>
              <td>{cc.costCenter}</td>
              <td>{cc.department}</td>
              <td>{cc.period}</td>
              <td><input className={styles.manageInput} type="number" value={edits[cc.id] ?? String(cc.allocated)} onChange={(e) => setEdits({ ...edits, [cc.id]: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

// Allocate Budget Modal
function AllocateBudgetModal({ onClose, initialCostCenter }: { onClose: () => void; initialCostCenter?: string }) {
  const { addToast } = useToast();
  const [mockCostCenters, setCostCenters] = useCostCenters();
  const [ccId, setCcId] = useState(initialCostCenter ?? mockCostCenters[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  return (
    <Modal isOpen onClose={onClose} title="Allocate budget" size="md" footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!ccId || !(Number(amount) > 0)} onClick={() => {
          const add = Number(amount) || 0;
          setCostCenters((prev) => prev.map((cc) => (cc.id === ccId ? recalc(cc, cc.allocated + add) : cc)));
          addToast(`₹${add.toLocaleString('en-IN')} allocated`, 'success'); onClose();
        }}>Allocate</Button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cost center</label>
          <select value={ccId} onChange={(e) => setCcId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 5 }}>
            {mockCostCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.costCenter}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Amount (₹)</label>
          <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 5 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Period</label>
          <select style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 5 }}>
            <option>FY 2026</option><option>FY 2027</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Justification</label>
          <textarea rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 4, marginTop: 5, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
      </div>
    </Modal>
  );
}

export default function BudgetCostControl() {
  const [showManage, setShowManage]     = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const canAllocate = usePermission('allocate_budget');
  const [mockCostCenters] = useCostCenters();

  const totalBudget    = mockCostCenters.reduce((s, c) => s + c.allocated, 0);
  const totalCommitted = mockCostCenters.reduce((s, c) => s + c.committed, 0);
  const totalSpent     = mockCostCenters.reduce((s, c) => s + c.spent, 0);
  const totalAvailable = mockCostCenters.reduce((s, c) => s + c.available, 0);
  const allocatedPct   = (totalBudget / 25000000) * 100;
  const spentPct       = (totalSpent / totalBudget) * 100;
  const availablePct   = (totalAvailable / totalBudget) * 100;

  const alerts = [
    { id: 1, severity: 'danger', icon: AlertTriangle, title: 'Office supplies has exceeded budget by ₹15,000',
      desc: 'Reallocate or approve overage.' },
    { id: 2, severity: 'warn', icon: AlertTriangle, title: 'Lab chemicals at 91.5%',
      desc: 'Forecast suggests overshoot by ₹40K — top up allocation.' },
    { id: 3, severity: 'info', icon: TrendingDown, title: 'Field trials at 35% with 2 months remaining',
      desc: 'Reallocate excess to other centers.' },
    { id: 4, severity: 'danger', icon: AlertTriangle, title: 'Packaging materials over budget by ₹4.5L',
      desc: 'Critical action required. Engage finance for review.' },
  ];

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Budget & cost control"
        subtitle="Monitor budgets and spending across departments"
        primaryAction={canAllocate ? { label: 'Allocate budget', icon: Plus, onClick: () => setShowAllocate(true) } : undefined}
        secondaryActions={canAllocate ? [{ label: 'Manage budgets', icon: Settings, onClick: () => setShowManage(true) }] : undefined}
      />

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total budget</p>
          <p className={styles.summaryValue}>{formatIndianCurrency(totalBudget)}</p>
          <p className={styles.summaryCompare}>FY 2026 · all departments</p>
          <div className={styles.summaryBar}><div className={styles.summaryBarFill} style={{ width: '100%' }} /></div>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Allocated</p>
          <p className={styles.summaryValue}>{formatIndianCurrency(totalBudget)}</p>
          <p className={styles.summaryCompare}>{allocatedPct.toFixed(0)}% of plan · vs last quarter +12%</p>
          <div className={styles.summaryBar}><div className={styles.summaryBarFill} style={{ width: `${Math.min(allocatedPct, 100)}%` }} /></div>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Spent + committed</p>
          <p className={styles.summaryValue}>{formatIndianCurrency(totalSpent + totalCommitted)}</p>
          <p className={styles.summaryCompare}>{spentPct.toFixed(0)}% utilized · YTD</p>
          <div className={styles.summaryBar}><div className={styles.summaryBarFill} style={{ width: `${Math.min(spentPct, 100)}%`, background: spentPct > 90 ? 'var(--color-warning)' : 'var(--color-primary)' }} /></div>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Available</p>
          <p className={styles.summaryValue} style={{ color: totalAvailable < 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
            {totalAvailable < 0 ? '-' : ''}{formatIndianCurrency(Math.abs(totalAvailable))}
          </p>
          <p className={styles.summaryCompare}>{availablePct.toFixed(0)}% remaining</p>
          <div className={styles.summaryBar}><div className={styles.summaryBarFill} style={{ width: `${Math.max(availablePct, 0)}%` }} /></div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Spend vs budget — top cost centers</p>
          <p className={styles.chartSub}>Color-coded by utilization</p>
          <SpendVsBudgetChart data={mockCostCenters} />
        </div>
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>Quarterly trend</p>
          <div className={styles.quarterlyLegend}>
            <span className={styles.legendItem}><span className={styles.legendBudget} /> Budget</span>
            <span className={styles.legendItem}><span className={styles.legendActual} /> Actual</span>
          </div>
          <QuarterlyTrendChart />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
            <TrendingUp size={11} style={{ verticalAlign: 'middle' }} /> Q3 actuals slightly above plan, watch Q4 closely.
          </p>
        </div>
      </div>

      {/* Cost centers table */}
      <div className={styles.tableCard}>
        <p className={styles.chartTitle}>Cost centers</p>
        <DataTable<CostCenter>
          columns={COLUMNS}
          data={mockCostCenters}
          rowKey="id"
        />
      </div>

      {/* Alerts panel */}
      <div className={styles.alertsCard}>
        <p className={styles.chartTitle}>Budget alerts</p>
        {alerts.map((a) => {
          const Icon = a.icon;
          const iconClass = a.severity === 'danger' ? styles.alertIconDanger
                          : a.severity === 'warn'   ? styles.alertIconWarn
                          : styles.alertIconInfo;
          return (
            <div key={a.id} className={styles.alertItem}>
              <div className={`${styles.alertIcon} ${iconClass}`}><Icon size={16} /></div>
              <div className={styles.alertBody}>
                <div className={styles.alertTitle}>{a.title}</div>
                <div className={styles.alertDesc}>{a.desc}</div>
              </div>
              {canAllocate && <Button variant="ghost" size="sm" onClick={() => setShowAllocate(true)}>Take action</Button>}
            </div>
          );
        })}
      </div>

      {showManage && <ManageBudgetsModal onClose={() => setShowManage(false)} />}
      {showAllocate && <AllocateBudgetModal onClose={() => setShowAllocate(false)} />}
    </ModuleLayout>
  );
}
