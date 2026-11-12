import { useState, useEffect, useMemo } from 'react';
import { ScanBarcode, FileText, Check, AlertTriangle, RotateCw, Circle } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { useToast } from '@/components/common/Toast/ToastContext';
import type { CycleCount, CountLine } from '@/types/warehouse';
import { formatIndianNumber } from '@/utils/formatters';
import styles from './CountExecutionModal.module.css';

import { whUpdate } from '../../warehouseStore';
interface CountExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: CycleCount | null;
  onComplete?: (count: CycleCount) => void;
}

type LineFilter = 'all' | 'pending' | 'variance';

export function CountExecutionModal({ isOpen, onClose, count, onComplete }: CountExecutionModalProps) {
  const { addToast } = useToast();
  const [scanInput, setScanInput] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [filter, setFilter] = useState<LineFilter>('all');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && count) {
      const initial: Record<string, number> = {};
      count.lines.forEach((l) => {
        if (l.countedQty !== null) initial[l.id] = l.countedQty;
      });
      setCounts(initial);
      setActiveLineId(null);
      setScanInput('');
      setFilter('all');
    }
  }, [isOpen, count]);

  const sortedLines = useMemo(() => {
    if (!count) return [];
    const order: Record<CountLine['status'], number> = {
      'Pending': 0, 'Recount needed': 1, 'Variance': 2, 'Counted': 3, 'Approved': 4, 'Posted': 5,
    };
    return [...count.lines].sort((a, b) => order[a.status] - order[b.status]);
  }, [count]);

  const visibleLines = useMemo(() => {
    if (filter === 'pending') return sortedLines.filter((l) => l.status === 'Pending' || l.status === 'Recount needed');
    if (filter === 'variance') return sortedLines.filter((l) => l.status === 'Variance');
    return sortedLines;
  }, [sortedLines, filter]);

  if (!count) return null;

  const handleScan = () => {
    if (!scanInput.trim()) return;
    const v = scanInput.trim().toLowerCase();
    const matchedLine = count.lines.find((l) =>
      l.itemSku.toLowerCase() === v || l.location.toLowerCase() === v || l.batch.toLowerCase() === v
    );
    if (matchedLine) setActiveLineId(matchedLine.id);
    setScanInput('');
  };

  const setCountFor = (id: string, qty: number) => setCounts((m) => ({ ...m, [id]: Math.max(0, qty) }));

  const computeStatus = (l: CountLine): CountLine['status'] => {
    const c = counts[l.id];
    if (c === undefined) return 'Pending';
    if (c !== l.systemQty) return 'Variance';
    return 'Counted';
  };

  const totalCounted = sortedLines.filter((l) => counts[l.id] !== undefined).length;
  const totalVariances = sortedLines.filter((l) => counts[l.id] !== undefined && counts[l.id] !== l.systemQty).length;
  const allCounted = totalCounted === sortedLines.length;

  const submit = () => {
    if (!count) return;
    const updated: CycleCount = {
      ...count,
      status: 'Pending review',
      countedLines: totalCounted,
      variancesFound: totalVariances,
      lines: count.lines.map(l => ({
        ...l,
        countedQty: counts[l.id] ?? null,
        status: computeStatus(l)
      }))
    };
    onComplete?.(updated);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Counting — ${count.id}`} size="lg">
      <div className={styles.headerCard}>
        <div>
          <div className={styles.countName}>{count.name}</div>
          <div className={styles.headerMeta}>
            {count.assignedCounters.join(', ')} · {count.zonesScope.join(', ')}
          </div>
        </div>
        <span className={styles.statusChip}>{count.status}</span>
      </div>

      <div className={styles.scanBox}>
        <ScanBarcode size={26} className={styles.scanIcon} />
        <div className={styles.scanContent}>
          <div className={styles.scanLabel}>{manualMode ? 'Manual entry' : 'Scan barcode or enter SKU/location'}</div>
          <div className={styles.scanRow}>
            <input
              type="text"
              className={styles.scanInput}
              placeholder={manualMode ? 'Type SKU or bin code' : 'Scan barcode...'}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScan(); } }}
            />
            <Button variant="primary" size="sm" onClick={handleScan}>Find line</Button>
          </div>
          <button className={styles.toggleLink} onClick={() => setManualMode((m) => !m)}>
            Toggle to {manualMode ? 'barcode' : 'manual'} mode
          </button>
        </div>
      </div>

      <div className={styles.filterRow}>
        {(['all', 'pending', 'variance'] as LineFilter[]).map((f) => (
          <button
            key={f}
            className={`${styles.filterChip} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Show all' : f === 'pending' ? 'Pending only' : 'Variance only'}
          </button>
        ))}
        <span className={styles.progress}>
          <strong>{totalCounted}</strong> of <strong>{sortedLines.length}</strong> counted · <strong>{totalVariances}</strong> variances
        </span>
      </div>

      <div className={styles.linesList}>
        {visibleLines.map((l) => {
          const status = computeStatus(l);
          const Icon = status === 'Counted' ? Check
            : status === 'Variance' ? AlertTriangle
            : l.status === 'Recount needed' ? RotateCw
            : Circle;
          const statusCls =
            status === 'Counted'  ? styles.lineCounted
            : status === 'Variance' ? styles.lineVariance
            : l.status === 'Recount needed' ? styles.lineRecount
            : styles.linePending;
          const isActive = activeLineId === l.id;
          const countedVal = counts[l.id];
          const varianceQty = countedVal !== undefined ? countedVal - l.systemQty : 0;

          return (
            <div key={l.id} className={`${styles.lineRow} ${statusCls} ${isActive ? styles.lineActive : ''}`}>
              <span className={styles.lineIcon}><Icon size={14} /></span>
              <div className={styles.lineMain}>
                <div className={styles.lineName}>{l.itemName}</div>
                <div className={styles.lineMeta}>
                  <span className={styles.mono}>{l.itemSku}</span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.mono}>{l.batch}</span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.mono}>{l.location}</span>
                </div>
              </div>
              <div className={styles.lineSystem}>
                <span className={styles.lineLabel}>System</span>
                <span className={styles.lineValue}>{formatIndianNumber(l.systemQty)}</span>
              </div>
              <div className={styles.lineCount}>
                <span className={styles.lineLabel}>Counted</span>
                {isActive ? (
                  <input
                    type="number"
                    className={styles.qtyInput}
                    autoFocus
                    value={countedVal ?? ''}
                    onChange={(e) => setCountFor(l.id, parseInt(e.target.value, 10) || 0)}
                    onBlur={() => setActiveLineId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setActiveLineId(null); }}
                  />
                ) : (
                  <button
                    className={styles.lineValue}
                    onClick={() => setActiveLineId(l.id)}
                  >
                    {countedVal ?? '—'}
                  </button>
                )}
              </div>
              {countedVal !== undefined && varianceQty !== 0 && (
                <span className={`${styles.varianceChip} ${varianceQty < 0 ? styles.negChip : styles.posChip}`}>
                  {varianceQty > 0 ? '+' : ''}{varianceQty}
                </span>
              )}
              {(status === 'Variance' || l.status === 'Recount needed') && (
                <button
                  className={styles.recountBtn}
                  title="Request recount"
                  onClick={() => { whUpdate('counts', count.id, (c) => ({ ...c, lines: c.lines.map((x) => (x.id === l.id ? { ...x, recountRequested: true, status: 'Recount needed' } : x)) })); setCounts((m) => { const n = { ...m }; delete n[l.id]; return n; }); addToast({ type: 'warning', message: `Recount requested for ${l.itemSku}` }); }}
                  aria-label="Request recount"
                >
                  <RotateCw size={12} />
                </button>
              )}
              <button
                className={styles.notesBtn}
                title="Add note"
                aria-label={`Add note for ${l.itemSku}`}
                onClick={() => { const note = window.prompt(`Note for ${l.itemSku}`, l.notes ?? ''); if (note !== null) { whUpdate('counts', count.id, (c) => ({ ...c, lines: c.lines.map((x) => (x.id === l.id ? { ...x, notes: note } : x)) })); addToast({ type: 'success', message: `Note saved for ${l.itemSku}` }); } }}
              >
                <FileText size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onClose}>Save & exit</Button>
        <Button variant="primary" size="sm" disabled={!allCounted} onClick={submit}>
          Submit for review
        </Button>
      </div>
    </Modal>
  );
}
