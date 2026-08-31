import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock, MessageSquareWarning, Plus, RotateCcw, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable/DataTable';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { masterDataApi, type Farm, type SeedVariety } from '@/services/api';
import { seedFarms, seedVarieties } from './cropPlanningData';
import {
  approveHarvestRequest,
  formatHarvestDate,
  formatKg,
  harvestStatusClass,
  harvestStatusOptions,
  isPendingStatus,
  rejectHarvestRequest,
  requestHarvestChanges,
  resetHarvestRequests,
  useHarvestRequests,
  type HarvestRequest,
} from './harvestData';
import styles from './production.module.css';
import harvestStyles from './harvest.module.css';

interface ApprovalRow {
  id: string;
  requestCode: string;
  farmName: string;
  varietyName: string;
  requestedQuantityKg: number;
  requestedHarvestDate: string;
  status: HarvestRequest['status'];
  request: HarvestRequest;
}

type ReviewAction = 'reject' | 'changes';

export default function HarvestApprovalList() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const requests = useHarvestRequests();
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | HarvestRequest['status']>('pending');
  const [search, setSearch] = useState('');

  const [reviewTarget, setReviewTarget] = useState<{ request: HarvestRequest; action: ReviewAction } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const inspectorName = user?.name?.trim() || 'Field Inspector';

  useEffect(() => {
    const load = async () => {
      try {
        const [farmsData, varietiesData] = await Promise.all([
          masterDataApi.getFarms(),
          masterDataApi.getVarieties(),
        ]);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
      } catch {
        setFarms(seedFarms);
        setVarieties(seedVarieties);
      }
    };

    void load();
  }, []);

  const rows = useMemo<ApprovalRow[]>(
    () =>
      requests.map((request) => ({
        id: request.id,
        requestCode: request.requestCode,
        farmName: farms.find((farm) => farm.id === request.farmId)?.name ?? 'Unknown farm',
        varietyName: varieties.find((variety) => variety.id === request.varietyId)?.name ?? request.crop,
        requestedQuantityKg: request.estimatedQuantityKg,
        requestedHarvestDate: request.requestedHarvestDate,
        status: request.status,
        request,
      })),
    [requests, farms, varieties],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (statusFilter === 'pending') return isPendingStatus(row.status);
        if (statusFilter === 'all') return true;
        return row.status === statusFilter;
      })
      .filter((row) => {
        if (!term) return true;
        return [row.requestCode, row.farmName, row.varietyName, row.status]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => b.request.requestedAt.localeCompare(a.request.requestedAt));
  }, [rows, statusFilter, search]);

  const pendingCount = rows.filter((row) => row.status === 'Pending Approval').length;
  const changesCount = rows.filter((row) => row.status === 'Changes Requested').length;
  const approvedCount = rows.filter((row) => row.request.lotId).length;
  const rejectedCount = rows.filter((row) => row.status === 'Rejected').length;
  const pendingVolume = rows
    .filter((row) => isPendingStatus(row.status))
    .reduce((total, row) => total + row.requestedQuantityKg, 0);

  function handleApprove(request: HarvestRequest) {
    const updated = approveHarvestRequest(request.id, { inspectorName });
    if (updated) {
      addToast(`${updated.requestCode} approved · lot ${updated.lotId} created`, 'success');
    }
  }

  function openReview(request: HarvestRequest, action: ReviewAction) {
    setReviewTarget({ request, action });
    setReviewNote('');
    setReviewError(null);
  }

  function submitReview() {
    if (!reviewTarget) return;
    if (!reviewNote.trim()) {
      setReviewError('Please add a note explaining your decision — the farmer will see it.');
      return;
    }

    const { request, action } = reviewTarget;
    const updated =
      action === 'reject'
        ? rejectHarvestRequest(request.id, { inspectorName, inspectorNotes: reviewNote })
        : requestHarvestChanges(request.id, { inspectorName, inspectorNotes: reviewNote });

    if (updated) {
      addToast(
        action === 'reject'
          ? `${updated.requestCode} rejected`
          : `Changes requested on ${updated.requestCode}`,
        action === 'reject' ? 'error' : 'info',
      );
    }
    setReviewTarget(null);
    setReviewNote('');
  }

  const columns: DataTableColumn<ApprovalRow>[] = [
    {
      key: 'requestCode',
      header: 'Request',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          className={harvestStyles.tableLink}
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/harvests/approval/${row.id}`);
          }}
        >
          {row.requestCode}
        </button>
      ),
    },
    { key: 'farmName', header: 'Farm', sortable: true },
    { key: 'varietyName', header: 'Variety', sortable: true },
    {
      key: 'requestedQuantityKg',
      header: 'Requested Qty',
      sortable: true,
      align: 'right',
      render: (row) => <span className={harvestStyles.quantityCell}>{formatKg(row.requestedQuantityKg)}</span>,
    },
    {
      key: 'requestedHarvestDate',
      header: 'Requested Date',
      sortable: true,
      render: (row) => formatHarvestDate(row.requestedHarvestDate),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`${harvestStyles.status} ${harvestStyles[harvestStatusClass(row.status)]}`}>{row.status}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const actionable = isPendingStatus(row.status);
        return (
          <div className={harvestStyles.rowActions} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={`${harvestStyles.iconAction} ${harvestStyles.approveAction}`}
              disabled={!actionable}
              onClick={() => handleApprove(row.request)}
              title={actionable ? 'Approve and create the seed lot' : 'Already reviewed'}
            >
              <CheckCircle2 size={13} /> Approve
            </button>
            <button
              type="button"
              className={`${harvestStyles.iconAction} ${harvestStyles.rejectAction}`}
              disabled={!actionable}
              onClick={() => openReview(row.request, 'reject')}
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              type="button"
              className={harvestStyles.iconAction}
              disabled={!actionable}
              onClick={() => openReview(row.request, 'changes')}
            >
              <MessageSquareWarning size={13} /> Request Changes
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Harvest Approvals</h1>
          <p className={styles.subtitle}>
            Verify field readiness before harvest. Approving a request creates the seed lot and its tracking ID.
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            leftIcon={RotateCcw}
            onClick={() => {
              resetHarvestRequests();
              addToast('Demo harvest data restored', 'info');
            }}
          >
            Reset demo data
          </Button>
          <Button variant="secondary" leftIcon={ClipboardCheck} onClick={() => navigate('/harvests')}>
            Harvest register
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/harvests/request')}>
            New Request
          </Button>
        </div>
      </div>

      <div className={harvestStyles.kpiGrid}>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><Clock size={13} /> Awaiting Approval</span>
          <span className={harvestStyles.kpiValue}>{pendingCount}</span>
          <span className={harvestStyles.kpiHint}>{formatKg(pendingVolume)} in the queue</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><MessageSquareWarning size={13} /> Changes Requested</span>
          <span className={harvestStyles.kpiValue}>{changesCount}</span>
          <span className={harvestStyles.kpiHint}>Waiting on the farmer</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><CheckCircle2 size={13} /> Lots Created</span>
          <span className={harvestStyles.kpiValue}>{approvedCount}</span>
          <span className={harvestStyles.kpiHint}>Approved and tracked</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><XCircle size={13} /> Rejected</span>
          <span className={harvestStyles.kpiValue}>{rejectedCount}</span>
          <span className={harvestStyles.kpiHint}>Not cleared for harvest</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controls}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search request, farm or variety…"
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="pending">Pending queue</option>
            <option value="all">All requests</option>
            {harvestStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          data={filteredRows}
          rowKey="id"
          onRowClick={(row) => navigate(`/harvests/approval/${row.id}`)}
          emptyState={{
            icon: ClipboardCheck,
            title: 'Nothing to review',
            description: 'No harvest requests match this filter.',
          }}
        />
      </div>

      <Modal
        isOpen={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        title={reviewTarget?.action === 'reject' ? 'Reject harvest request' : 'Request changes'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.action === 'reject' ? 'danger' : 'primary'}
              onClick={submitReview}
            >
              {reviewTarget?.action === 'reject' ? 'Reject request' : 'Send back to farmer'}
            </Button>
          </>
        }
      >
        <div className={harvestStyles.modalForm}>
          {reviewTarget ? (
            <div className={harvestStyles.modalSummary}>
              {reviewTarget.request.requestCode} ·{' '}
              {farms.find((farm) => farm.id === reviewTarget.request.farmId)?.name ?? 'Unknown farm'} ·{' '}
              {formatKg(reviewTarget.request.estimatedQuantityKg)} requested for{' '}
              {formatHarvestDate(reviewTarget.request.requestedHarvestDate)}
            </div>
          ) : null}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reviewNote">Inspector notes</label>
            <textarea
              id="reviewNote"
              className={styles.textarea}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder={
                reviewTarget?.action === 'reject'
                  ? 'Why is this request being rejected?'
                  : 'What does the farmer need to change before resubmitting?'
              }
            />
            {reviewError ? <span className={styles.errorText}>{reviewError}</span> : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
