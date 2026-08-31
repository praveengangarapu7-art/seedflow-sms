import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal/Modal';
import { DatePicker } from '@/components/common/DatePicker';
import { Input } from '@/components/common/Input/Input';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { formatIndianNumber } from '@/utils/formatters';
import { recentMovements } from '../../mockData/dashboardData';
import { Search } from 'lucide-react';
import styles from './RecentMovementsAllModal.module.css';
import type { StockMovement } from '@/types/warehouse';

interface RecentMovementsAllModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecentMovementsAllModal: React.FC<RecentMovementsAllModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);

  // For mock, just use the imported recentMovements and maybe repeat it to show volume
  const allMovements = [...recentMovements, ...recentMovements, ...recentMovements].map((m, i) => ({ ...m, id: `${m.id}-${i}` }));

  const filtered = allMovements.filter(m => 
    m.itemName.toLowerCase().includes(search.toLowerCase()) || 
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All Stock Movements" size="xl">
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.filters}>
            <Input 
              placeholder="Search movements..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              leftIcon={Search}
            />
            <div className={styles.dateFilter}>
              <DatePicker value={dateRange} onChange={setDateRange} placeholder="Filter by date" />
            </div>
          </div>
          
          <div className={styles.tableWrapper}>
            <DataTable
              rowKey="id"
              columns={[
                { header: 'ID', key: 'id' },
                { header: 'Item', key: 'itemName' },
                { header: 'Type', key: 'type', render: (row) => <StatusBadge status={row.type} type="movement" /> },
                { header: 'Qty', key: 'quantity', render: (row) => `${formatIndianNumber(Math.abs(row.quantity))} ${row.uom}` },
                { header: 'From/To', key: 'fromLocation', render: (row) => row.type === 'Transfer' ? `${row.fromLocation} → ${row.toLocation}` : (row.fromLocation || row.toLocation || '—') },
                { header: 'Time', key: 'timestamp' }
              ]}
              data={filtered}
              onRowClick={setSelectedMovement}
            />
          </div>
        </div>

        {selectedMovement && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h3>Movement Details</h3>
              <button onClick={() => setSelectedMovement(null)} className={styles.closeDetail}>×</button>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.detailRow}><span>ID:</span> <strong>{selectedMovement.id}</strong></div>
              <div className={styles.detailRow}><span>Item:</span> <strong>{selectedMovement.itemName}</strong></div>
              <div className={styles.detailRow}><span>Type:</span> <StatusBadge status={selectedMovement.type} type="movement" /></div>
              <div className={styles.detailRow}><span>Quantity:</span> <strong>{formatIndianNumber(Math.abs(selectedMovement.quantity))} {selectedMovement.uom}</strong></div>
              <div className={styles.detailRow}><span>Time:</span> <strong>{selectedMovement.timestamp}</strong></div>
              {selectedMovement.fromLocation && <div className={styles.detailRow}><span>From:</span> <strong>{selectedMovement.fromLocation}</strong></div>}
              {selectedMovement.toLocation && <div className={styles.detailRow}><span>To:</span> <strong>{selectedMovement.toLocation}</strong></div>}
              {selectedMovement.reference && <div className={styles.detailRow}><span>Ref:</span> <strong>{selectedMovement.reference}</strong></div>}
              <div className={styles.detailRow}><span>User:</span> <strong>{selectedMovement.user}</strong></div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
