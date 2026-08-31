import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, RefreshCw, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { MasterDataNav } from '@/components/layout/MasterDataNav/MasterDataNav';
import { VarietyTable } from '@/components/VarietyTable/VarietyTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import {
  CROP_VARIETY_APPROVER_ROLES,
  approveCropVariety,
  deleteCropVariety,
  fetchCropVarieties,
  rejectCropVariety,
  submitCropVarietyForReview,
  type CropVariety,
  type CropVarietyStatus,
} from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

const STATUS_TABS: { key: 'all' | CropVarietyStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'approved', label: 'Approved' },
];

export default function VarietyList() {
  const { accounts, accountIndex, setAccountIndex, token, role, loading: sessionLoading, error: sessionError } = useRealBackendSession();
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CropVarietyStatus>('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const canApprove = CROP_VARIETY_APPROVER_ROLES.includes(role);

  const loadVarieties = async (currentToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCropVarieties(currentToken, { status: statusFilter === 'all' ? undefined : statusFilter });
      setVarieties(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load varieties';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadVarieties(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const filteredVarieties = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return varieties;
    return varieties.filter((item) => item.name.toLowerCase().includes(query) || item.crop.toLowerCase().includes(query));
  }, [search, varieties]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: varieties.length, draft: 0, reviewed: 0, approved: 0 };
    for (const v of varieties) counts[v.status] = (counts[v.status] ?? 0) + 1;
    return counts;
  }, [varieties]);

  const handleDelete = async (variety: CropVariety) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete ${variety.name}?`);
    if (!confirmed) return;

    try {
      await deleteCropVariety(token, variety.id);
      addToast('Variety deleted successfully', 'success');
      await loadVarieties(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deletion failed';
      addToast(message, 'error');
    }
  };

  const handleSubmitForReview = async (variety: CropVariety) => {
    if (!token) return;
    try {
      await submitCropVarietyForReview(token, variety.id);
      addToast(`${variety.name} submitted for review`, 'success');
      await loadVarieties(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit for review', 'error');
    }
  };

  const handleApprove = async (variety: CropVariety) => {
    if (!token) return;
    try {
      await approveCropVariety(token, variety.id);
      addToast(`${variety.name} approved`, 'success');
      await loadVarieties(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to approve variety', 'error');
    }
  };

  const handleReject = async (variety: CropVariety) => {
    if (!token) return;
    const reason = window.prompt(`Reason for sending "${variety.name}" back to draft?`);
    if (!reason || !reason.trim()) return;
    try {
      await rejectCropVariety(token, variety.id, reason.trim());
      addToast(`${variety.name} sent back to draft`, 'success');
      await loadVarieties(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reject variety', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Variety Management</h1>
          <p className={styles.subtitle}>Create, edit, and manage seed varieties in SeedSphere.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ClipboardList} onClick={() => navigate('/varieties/approval-queue')}>
            Approval Queue
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => token && void loadVarieties(token)}>
            Refresh
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/varieties/new')}>
            Create New
          </Button>
        </div>
      </div>

      <MasterDataNav />

      <div className={styles.card}>
        <Tabs
          tabs={STATUS_TABS.map((t) => ({ key: t.key, label: t.label, count: statusCounts[t.key] }))}
          activeTab={statusFilter}
          onChange={(key) => setStatusFilter(key as 'all' | CropVarietyStatus)}
        />

        <div className={styles.controls} style={{ marginTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Search size={16} />
            <input
              className={styles.searchInput}
              placeholder="Search by variety or crop"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {sessionError ? <div className={styles.errorText}>{sessionError}</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}

        {filteredVarieties.length === 0 && !loading && !sessionLoading ? (
          <div className={styles.emptyState}>No varieties match your current filter.</div>
        ) : (
          <VarietyTable
            varieties={filteredVarieties}
            loading={loading || sessionLoading}
            canApprove={canApprove}
            onView={(item) => navigate(`/varieties/${item.id}`)}
            onEdit={(item) => navigate(`/varieties/${item.id}/edit`)}
            onDelete={handleDelete}
            onSubmitForReview={handleSubmitForReview}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>
    </div>
  );
}
