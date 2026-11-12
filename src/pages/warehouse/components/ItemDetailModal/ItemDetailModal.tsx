import { useState } from 'react';
import { CustomFieldsPanel } from '@/components/customFields/CustomFieldsPanel';
import { Package, MapPin, History, FileText, Layers } from 'lucide-react';
import { Modal } from '@/components/common/Modal/Modal';
import type { InventoryItem } from '@/types/warehouse';
import { formatIndianNumber, formatRupees } from '@/utils/formatters';
import styles from './ItemDetailModal.module.css';

import { RecordAiPanel } from '@/components/ai/RecordAiPanel/RecordAiPanel';
import { useNavigate } from 'react-router-dom';
interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

type DetailTab = 'overview' | 'batches' | 'movement' | 'documents';

const TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'overview',  label: 'Overview' },
  { key: 'batches',   label: 'Batches & lots' },
  { key: 'movement',  label: 'Movement history' },
  { key: 'documents', label: 'Documents' },
];

function daysToExpiry(expiryDate: string): number | null {
  const t = Date.parse(expiryDate);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / (1000 * 60 * 60 * 24));
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'Available':  return styles.statusAvailable;
    case 'Quarantine': return styles.statusQuarantine;
    case 'Reserved':   return styles.statusReserved;
    case 'Damaged':    return styles.statusDamaged;
    case 'Sold':       return styles.statusSold;
    default:           return styles.statusAvailable;
  }
}

export function ItemDetailModal({ isOpen, onClose, item }: ItemDetailModalProps) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const navigate = useNavigate();

  if (!item) return null;

  const dte = daysToExpiry(item.expiryDate);
  const expiryNote =
    dte === null ? null
      : dte < 0 ? 'expired'
      : dte <= 90 ? `${dte} days left`
      : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name} size="xl">
      <CustomFieldsPanel entityType="warehouse_item" entityId={item.id} lotId={item.lotNumber} />
      <RecordAiPanel recordType="warehouse.item" record={item} label={item.sku} />
      <div className={styles.headerCard}>
        <div className={styles.headerIcon}><Package size={22} /></div>
        <div className={styles.headerBody}>
          <div className={styles.headerSku}>SKU · {item.sku}</div>
          <h3 className={styles.headerName}>{item.name}</h3>
          <div className={styles.headerChips}>
            <span className={`${styles.statusChip} ${getStatusClass(item.status)}`}>{item.status}</span>
            <span className={`${styles.abcChip} ${styles[`abc_${item.abcClass}`]}`}>Class {item.abcClass}</span>
            <span className={styles.categoryChip}>{item.category}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab}
            className={`${styles.tab} ${t.key === tab ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={styles.grid}>
          <div className={styles.detailCard}>
            <h4 className={styles.detailTitle}>Stock summary</h4>
            <dl className={styles.dl}>
              <div className={styles.dRow}>
                <dt>Quantity</dt>
                <dd className={styles.bigValue}>{formatIndianNumber(item.quantity)} {item.uom}</dd>
              </div>
              <div className={styles.dRow}>
                <dt>Total value</dt>
                <dd className={styles.bigValue}>{formatRupees(item.totalValue)}</dd>
              </div>
              <div className={styles.dRow}><dt>Unit cost</dt><dd>{formatRupees(item.unitCost)}</dd></div>
              <div className={styles.dRow}><dt>Reorder point</dt><dd>{formatIndianNumber(item.reorderPoint)} {item.uom}</dd></div>
              <div className={styles.dRow}><dt>Valuation method</dt><dd>{item.valuationMethod}</dd></div>
            </dl>
          </div>

          <div className={styles.detailCard}>
            <h4 className={styles.detailTitle}><MapPin size={14} /> Location</h4>
            <dl className={styles.dl}>
              <div className={styles.dRow}><dt>Warehouse</dt><dd>{item.location.warehouse}</dd></div>
              <div className={styles.dRow}><dt>Zone</dt><dd>{item.location.zone}</dd></div>
              <div className={styles.dRow}><dt>Rack</dt><dd>{item.location.rack}</dd></div>
              <div className={styles.dRow}><dt>Shelf</dt><dd>{item.location.shelf}</dd></div>
              <div className={styles.dRow}><dt>Bin</dt><dd>{item.location.bin}</dd></div>
            </dl>
          </div>

          <div className={styles.detailCard}>
            <h4 className={styles.detailTitle}>Identifiers</h4>
            <dl className={styles.dl}>
              <div className={styles.dRow}><dt>SKU</dt><dd className={styles.mono}>{item.sku}</dd></div>
              <div className={styles.dRow}><dt>Batch</dt><dd className={styles.mono}>{item.batchNumber}</dd></div>
              <div className={styles.dRow}><dt>Lot</dt><dd className={styles.mono}>{item.lotNumber}</dd></div>
              {item.variety && <div className={styles.dRow}><dt>Variety</dt><dd>{item.variety}</dd></div>}
              {item.grnReference && (
                <div className={styles.dRow}>
                  <dt>GRN reference</dt>
                  <dd>
                    <a href="#" className={styles.link} onClick={(e) => { e.preventDefault(); onClose(); navigate(`/procurement/grn/${encodeURIComponent(item.grnReference ?? '')}`); }}>
                      {item.grnReference}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className={styles.detailCard}>
            <h4 className={styles.detailTitle}>Lifecycle</h4>
            <dl className={styles.dl}>
              <div className={styles.dRow}><dt>Received date</dt><dd>{item.receivedDate}</dd></div>
              <div className={styles.dRow}>
                <dt>Expiry date</dt>
                <dd>
                  {item.expiryDate}
                  {expiryNote && (
                    <span className={`${styles.expiryNote} ${dte! < 0 ? styles.expiryExpired : styles.expiryWarning}`}>
                      {expiryNote}
                    </span>
                  )}
                </dd>
              </div>
              {item.supplier && <div className={styles.dRow}><dt>Supplier</dt><dd>{item.supplier}</dd></div>}
            </dl>
          </div>
        </div>
      )}

      {tab === 'batches' && (
        <div className={styles.empty}>
          <Layers size={36} className={styles.emptyIcon} />
          <p>Yet to add the content</p>
        </div>
      )}

      {tab === 'movement' && (
        <div className={styles.empty}>
          <History size={36} className={styles.emptyIcon} />
          <p>Yet to add the content</p>
        </div>
      )}

      {tab === 'documents' && (
        <div className={styles.empty}>
          <FileText size={36} className={styles.emptyIcon} />
          <p>Yet to add the content</p>
        </div>
      )}
    </Modal>
  );
}
