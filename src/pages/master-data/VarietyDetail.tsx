import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Edit3, Send, Trash2, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { AccountSwitcher } from '@/components/common/AccountSwitcher/AccountSwitcher';
import { VarietyStatusBadge } from '@/components/VarietyTable/VarietyTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useRealBackendSession } from './useRealBackendSession';
import {
  CROP_VARIETY_APPROVER_ROLES,
  approveCropVariety,
  deleteCropVariety,
  fetchCropVarietyById,
  rejectCropVariety,
  submitCropVarietyForReview,
  type CropVariety,
} from '@/services/seedLotRealtimeClient';
import styles from './master-data.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
export default function VarietyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { accounts, accountIndex, setAccountIndex, token, role } = useRealBackendSession();
  const [variety, setVariety] = useState<CropVariety | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = CROP_VARIETY_APPROVER_ROLES.includes(role);

  const load = async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const data = await fetchCropVarietyById(token, id);
      setVariety(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load variety';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const handleDelete = async () => {
    if (!variety || !token) return;
    const confirmed = window.confirm(`Delete ${variety.name}?`);
    if (!confirmed) return;

    try {
      await deleteCropVariety(token, variety.id);
      addToast('Variety deleted successfully', 'success');
      navigate('/varieties');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Deletion failed', 'error');
    }
  };

  const handleSubmitForReview = async () => {
    if (!variety || !token) return;
    try {
      await submitCropVarietyForReview(token, variety.id);
      addToast('Submitted for review', 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit for review', 'error');
    }
  };

  const handleApprove = async () => {
    if (!variety || !token) return;
    try {
      await approveCropVariety(token, variety.id);
      addToast('Variety approved', 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to approve variety', 'error');
    }
  };

  const handleReject = async () => {
    if (!variety || !token) return;
    const reason = window.prompt(`Reason for sending "${variety.name}" back to draft?`);
    if (!reason || !reason.trim()) return;
    try {
      await rejectCropVariety(token, variety.id, reason.trim());
      addToast('Variety sent back to draft', 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reject variety', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Variety Details</h1>
          <p className={styles.subtitle}>Inspect full variety details and manage the record.</p>
        </div>
        <div className={styles.actions}>
          <AccountSwitcher accounts={accounts} accountIndex={accountIndex} onChange={setAccountIndex} />
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/varieties')}>
            Back to list
          </Button>
          {variety && variety.status === 'draft' ? (
            <Button variant="secondary" leftIcon={Send} onClick={handleSubmitForReview}>
              Submit for Review
            </Button>
          ) : null}
          {variety && canApprove && variety.status !== 'approved' ? (
            <Button leftIcon={CheckCircle2} onClick={handleApprove}>
              Approve
            </Button>
          ) : null}
          {variety && canApprove && variety.status === 'reviewed' ? (
            <Button variant="secondary" leftIcon={XCircle} onClick={handleReject}>
              Reject
            </Button>
          ) : null}
          {variety && variety.status !== 'approved' ? (
            <Button variant="accent" leftIcon={Edit3} onClick={() => navigate(`/varieties/${id}/edit`)}>
              Edit
            </Button>
          ) : null}
          {variety && variety.status !== 'approved' ? (
            <Button variant="danger" leftIcon={Trash2} onClick={handleDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {variety ? <RecordAiPanel recordType="master.variety" record={variety} label={variety.name} /> : null}

      <div className={styles.card}>
        {loading ? <div className={styles.emptyState}>Loading variety…</div> : null}
        {error ? <div className={styles.errorText}>{error}</div> : null}
        {!loading && variety ? (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Name</span>
              <div className={styles.detailValue}>{variety.name}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Crop</span>
              <div className={styles.detailValue}>{variety.crop}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <div className={styles.detailValue}><VarietyStatusBadge status={variety.status} /></div>
            </div>
            {variety.category ? (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Category</span>
                <div className={styles.detailValue}>{variety.category}</div>
              </div>
            ) : null}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Description</span>
              <div className={styles.detailValue}>{variety.description ?? 'No description provided.'}</div>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created By</span>
              <div className={styles.detailValue}>{variety.created_by}</div>
            </div>
            {variety.reviewed_by ? (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Reviewed By</span>
                <div className={styles.detailValue}>{variety.reviewed_by}</div>
              </div>
            ) : null}
            {variety.approved_by ? (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Approved By</span>
                <div className={styles.detailValue}>{variety.approved_by}</div>
              </div>
            ) : null}
            {variety.rejection_reason ? (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Last Rejection Reason</span>
                <div className={styles.detailValue}>{variety.rejection_reason}</div>
              </div>
            ) : null}
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>ID</span>
              <div className={styles.detailValue}>{variety.id}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
