import { useState } from 'react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { PageHeader } from '@/components/common/PageHeader/PageHeader';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { Card } from '@/components/common/Card/Card';
import { Badge } from '@/components/common/Badge/Badge';
import { Button } from '@/components/common/Button/Button';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { procurementNav } from '@/config/procurementNav';
import { mockApprovals } from './mockData/approvalsData';
import { Approval } from '@/types/procurement';
import { 
  ShoppingCart, Inbox, CheckCircle2, Timer, AlertTriangle, 
  ChevronRight, Check, X, MessageSquare, ArrowRight, Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Approvals.module.css';

export default function Approvals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isPurchaseManager = user?.role === 'purchase_manager';
  const isFinanceManager = user?.role === 'finance_manager';

  const visibleApprovals = approvals.filter(item => {
    if (isPurchaseManager) return ['PR', 'PO', 'Supplier'].includes(item.type);
    if (isFinanceManager) return ['Invoice'].includes(item.type);
    return false;
  });
  
  // Modals state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'info';
    item: Approval | null;
  }>({ isOpen: false, type: 'approve', item: null });
  
  const [comment, setComment] = useState('');
  const { addToast } = useToast();

  const kpis = [
    { label: 'Awaiting your action', value: visibleApprovals.length.toString(), icon: Inbox, trend: { direction: 'down' as const, percentage: '2%', isPositive: true }, comparison: 'vs last week' },
    { label: 'Approved today', value: isFinanceManager ? '1' : '6', icon: CheckCircle2, trend: { direction: 'up' as const, percentage: '12%', isPositive: true }, comparison: 'vs yesterday' },
    { label: 'Avg approval time', value: '4.2 hrs', icon: Timer, trend: { direction: 'down' as const, percentage: '0.5 hrs', isPositive: true }, comparison: 'vs last month' },
    { label: 'Overdue (>2 days)', value: visibleApprovals.filter(a => a.daysWaiting > 2).length.toString(), icon: AlertTriangle, trend: { direction: 'down' as const, percentage: '1', isPositive: true }, comparison: 'vs last week' }
  ];

  const tabs = [
    { key: 'All', label: `All (${visibleApprovals.length})` },
    { key: 'PR', label: `Purchase Requisitions (${visibleApprovals.filter(a => a.type === 'PR').length})` },
    { key: 'PO', label: `Purchase Orders (${visibleApprovals.filter(a => a.type === 'PO').length})` },
    { key: 'Invoice', label: `Invoices (${visibleApprovals.filter(a => a.type === 'Invoice').length})` },
    { key: 'Supplier', label: `Supplier Onboarding (${visibleApprovals.filter(a => a.type === 'Supplier').length})` },
  ];

  const filteredApprovals = activeTab === 'All' 
    ? visibleApprovals 
    : visibleApprovals.filter(a => a.type === activeTab);

  const getTypeBadgeColor = (type: string) => {
    switch(type) {
      case 'PR': return 'primary';
      case 'PO': return 'success';
      case 'Invoice': return 'warning';
      case 'Supplier': return 'info';
      default: return 'neutral';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch(priority) {
      case 'Urgent': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'primary';
      default: return 'neutral';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredApprovals.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const submitAction = () => {
    if (!actionModal.item) return;
    
    console.log(`${actionModal.type} action submitted for ${actionModal.item.id} with comment: ${comment}`);
    
    if (actionModal.type === 'approve' || actionModal.type === 'reject') {
      setApprovals(approvals.filter(a => a.id !== actionModal.item!.id));
      setSelectedIds(new Set([...selectedIds].filter(id => id !== actionModal.item!.id)));
    }
    
    addToast(
      `${actionModal.item.referenceId} ${actionModal.type === 'approve' ? 'approved' : actionModal.type === 'reject' ? 'rejected' : 'information requested'}.`,
      actionModal.type === 'reject' ? 'error' : actionModal.type === 'info' ? 'info' : 'success'
    );
    
    setActionModal({ isOpen: false, type: 'approve', item: null });
    setComment('');
  };

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      <PageHeader
        title="Pending approvals"
        description="Items waiting for your decision"
        kpis={kpis}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        
        {selectedIds.size > 0 && (
          <div className={styles.actionBar}>
            <div className={styles.actionBarLeft}>
              <input 
                type="checkbox" 
                checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>{selectedIds.size} items selected</span>
            </div>
            <div className={styles.actionBarRight}>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              <Button variant="danger" icon={<X size={16} />}>Reject all</Button>
              <Button variant="primary" icon={<Check size={16} />}>Approve all</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {filteredApprovals.map(approval => (
            <Card key={approval.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div className={styles.checkboxContainer} style={{ marginTop: '4px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(approval.id)}
                      onChange={(e) => handleSelectItem(approval.id, e.target.checked)}
                    />
                  </div>
                  <div>
                    <div className={styles.cardTopRow}>
                      <Badge variant={getTypeBadgeColor(approval.type) as any}>{approval.type}</Badge>
                      <h3 className={styles.cardTitle}>{approval.referenceId} · {approval.title}</h3>
                    </div>
                  </div>
                </div>
                <Badge variant={getPriorityBadgeColor(approval.priority) as any}>{approval.priority}</Badge>
              </div>

              <div className={styles.cardInfoRow}>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Submitted by</span>
                  <span className={styles.infoValue}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {approval.submittedBy.avatar}
                    </div>
                    {approval.submittedBy.name} · {approval.submittedAt}
                  </span>
                </div>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Department</span>
                  <span className={styles.infoValue}>{approval.department}</span>
                </div>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Amount</span>
                  <span className={styles.infoValue}>
                    {approval.amount > 0 ? `₹${approval.amount.toLocaleString('en-IN')}` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className={styles.justification}>
                <p className={styles.justificationText}>"{approval.justification}"</p>
                <button className={styles.showMoreBtn}>Show more →</button>
              </div>

              <div className={styles.approvalFlow}>
                {approval.approvalChain.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <div className={styles.flowStep}>
                      <div className={`${styles.stepIcon} ${styles[step.status]}`}>
                        {step.status === 'approved' && <Check size={14} />}
                        {step.status === 'current' && <ArrowRight size={14} />}
                        {step.status === 'pending' && <span style={{fontSize: 10}}>○</span>}
                      </div>
                      <div className={styles.stepDetails}>
                        <span className={styles.stepRole}>{step.role}</span>
                        <span className={styles.stepName}>{step.approver}</span>
                      </div>
                    </div>
                    {idx < approval.approvalChain.length - 1 && (
                      <ChevronRight size={16} className={styles.flowArrow} style={{ margin: '0 8px' }} />
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.cardActions}>
                <Button 
                  variant="primary" 
                  icon={<Check size={16} />}
                  onClick={() => setActionModal({ isOpen: true, type: 'approve', item: approval })}
                >
                  Approve
                </Button>
                <Button 
                  variant="danger" 
                  style={{ backgroundColor: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  icon={<X size={16} />}
                  onClick={() => setActionModal({ isOpen: true, type: 'reject', item: approval })}
                >
                  Reject
                </Button>
                <Button 
                  variant="ghost" 
                  icon={<MessageSquare size={16} />}
                  onClick={() => setActionModal({ isOpen: true, type: 'info', item: approval })}
                >
                  Request info
                </Button>
                <div style={{ flex: 1 }}></div>
                <Button variant="ghost" icon={<Eye size={16} />}>
                  View details
                </Button>
              </div>
            </Card>
          ))}
          
          {filteredApprovals.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No pending approvals found.
            </div>
          )}
        </div>

      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: 'approve', item: null })}
        title={
          actionModal.type === 'approve' ? `Approve ${actionModal.item?.referenceId}?` :
          actionModal.type === 'reject' ? `Reject ${actionModal.item?.referenceId}?` :
          `Request Info for ${actionModal.item?.referenceId}`
        }
      >
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              {actionModal.type === 'reject' ? 'Rejection Reason (Required)' : 'Comments (Optional)'}
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                minHeight: '100px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder={
                actionModal.type === 'reject' ? 'Please provide a reason for rejection...' :
                actionModal.type === 'info' ? 'What additional information do you need?' :
                'Add any approval comments here...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setActionModal({ isOpen: false, type: 'approve', item: null })}>
              Cancel
            </Button>
            <Button 
              variant={actionModal.type === 'reject' ? 'danger' : 'primary'}
              disabled={actionModal.type === 'reject' && !comment.trim()}
              onClick={submitAction}
            >
              {actionModal.type === 'approve' ? 'Approve' : actionModal.type === 'reject' ? 'Reject' : 'Send Request'}
            </Button>
          </div>
        </div>
      </Modal>


    </ModuleLayout>
  );
}
