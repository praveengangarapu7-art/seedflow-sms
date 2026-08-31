import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Copy, Factory, Package, Plus, Scale, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable/DataTable';
import { useToast } from '@/components/common/Toast/ToastContext';
import { masterDataApi, type Farm, type SeedVariety } from '@/services/api';
import { seedFarms, seedVarieties } from './cropPlanningData';
import {
  LOT_STATUSES,
  formatHarvestDate,
  formatKg,
  harvestStatusClass,
  useHarvestRequests,
  type HarvestRequest,
  type HarvestStatus,
} from './harvestData';
import styles from './production.module.css';
import harvestStyles from './harvest.module.css';

interface HarvestRow {
  id: string;
  lotId: string;
  farmName: string;
  varietyName: string;
  quantityKg: number;
  quantityIsEstimate: boolean;
  harvestedDate?: string;
  status: HarvestStatus;
  request: HarvestRequest;
}

export default function HarvestList() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const requests = useHarvestRequests();
  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [statusFilter, setStatusFilter] = useState<'all' | HarvestStatus>('all');
  const [search, setSearch] = useState('');

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

  const rows = useMemo<HarvestRow[]>(
    () =>
      requests
        .filter((request) => Boolean(request.lotId) && LOT_STATUSES.includes(request.status))
        .map((request) => ({
          id: request.id,
          lotId: request.lotId as string,
          farmName: farms.find((farm) => farm.id === request.farmId)?.name ?? 'Unknown farm',
          varietyName: varieties.find((variety) => variety.id === request.varietyId)?.name ?? request.crop,
          quantityKg: request.actualQuantityKg ?? request.estimatedQuantityKg,
          quantityIsEstimate: request.actualQuantityKg == null,
          harvestedDate: request.harvestedDate,
          status: request.status,
          request,
        }))
        .sort((a, b) => b.lotId.localeCompare(a.lotId)),
    [requests, farms, varieties],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return [row.lotId, row.farmName, row.varietyName, row.status].join(' ').toLowerCase().includes(term);
      });
  }, [rows, statusFilter, search]);

  const harvestedRows = rows.filter((row) => !row.quantityIsEstimate);
  const totalHarvestedKg = harvestedRows.reduce((total, row) => total + row.quantityKg, 0);
  const awaitingTransport = rows.filter((row) => row.status === 'Harvested').length;
  const inTransit = rows.filter((row) => row.status === 'Transport Authorized').length;
  const delivered = rows.filter((row) => row.status === 'Delivered to Processing').length;

  function copyLot(lotId: string) {
    void navigator.clipboard?.writeText(lotId).then(
      () => addToast(`Lot ${lotId} copied`, 'success'),
      () => addToast('Unable to copy lot ID', 'error'),
    );
  }

  const columns: DataTableColumn<HarvestRow>[] = [
    {
      key: 'lotId',
      header: 'Lot ID',
      sortable: true,
      width: '150px',
      render: (row) => (
        <span className={harvestStyles.lotChip}>
          {row.lotId}
          <button
            type="button"
            className={harvestStyles.copyButton}
            onClick={(event) => {
              event.stopPropagation();
              copyLot(row.lotId);
            }}
            aria-label={`Copy ${row.lotId}`}
            title="Copy lot tracking ID"
          >
            <Copy size={12} />
          </button>
        </span>
      ),
    },
    { key: 'farmName', header: 'Farm', sortable: true },
    { key: 'varietyName', header: 'Variety', sortable: true },
    {
      key: 'quantityKg',
      header: 'Quantity',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={harvestStyles.quantityCell}>
          {formatKg(row.quantityKg)}
          {row.quantityIsEstimate ? <span className={harvestStyles.mutedCell}> (est.)</span> : null}
        </span>
      ),
    },
    {
      key: 'harvestedDate',
      header: 'Date Harvested',
      sortable: true,
      render: (row) =>
        row.harvestedDate ? (
          formatHarvestDate(row.harvestedDate)
        ) : (
          <span className={harvestStyles.mutedCell}>Not harvested yet</span>
        ),
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
      key: 'transport',
      header: 'Transport',
      render: (row) =>
        row.request.transport ? (
          <span className={harvestStyles.inlineRowMeta}>
            {row.request.transport.vehicleNumber} → {row.request.transport.destination}
          </span>
        ) : (
          <span className={harvestStyles.mutedCell}>Not authorized</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '190px',
      render: (row) => (
        <div
          className={`${harvestStyles.rowActions} ${harvestStyles.rowActionsTight}`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={harvestStyles.iconAction}
            onClick={() => navigate(`/harvests/approval/${row.id}`)}
          >
            <ClipboardCheck size={13} /> Open
          </button>
          <button
            type="button"
            className={harvestStyles.iconAction}
            onClick={() => navigate(`/processing/intake?lot=${encodeURIComponent(row.lotId)}`)}
            title="Send this lot to seed processing"
          >
            <Factory size={13} /> Processing
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Harvest Register</h1>
          <p className={styles.subtitle}>
            Every approved harvest and its seed lot tracking ID, from field to processing intake.
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" leftIcon={Factory} onClick={() => navigate('/processing/intake')}>
            Seed processing
          </Button>
          <Button variant="secondary" leftIcon={ClipboardCheck} onClick={() => navigate('/harvests/approval')}>
            Approval queue
          </Button>
          <Button leftIcon={Plus} onClick={() => navigate('/harvests/request')}>
            New Request
          </Button>
        </div>
      </div>

      <div className={harvestStyles.kpiGrid}>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><Package size={13} /> Seed Lots</span>
          <span className={harvestStyles.kpiValue}>{rows.length}</span>
          <span className={harvestStyles.kpiHint}>Tracking IDs generated</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><Scale size={13} /> Quantity Harvested</span>
          <span className={harvestStyles.kpiValue}>{totalHarvestedKg.toLocaleString('en-IN')}</span>
          <span className={harvestStyles.kpiHint}>kg across {harvestedRows.length} harvested lots</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><Truck size={13} /> Awaiting Transport</span>
          <span className={harvestStyles.kpiValue}>{awaitingTransport}</span>
          <span className={harvestStyles.kpiHint}>{inTransit} authorized for dispatch</span>
        </div>
        <div className={harvestStyles.kpi}>
          <span className={harvestStyles.kpiLabel}><Factory size={13} /> Delivered</span>
          <span className={harvestStyles.kpiValue}>{delivered}</span>
          <span className={harvestStyles.kpiHint}>Received at processing</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controls}>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lot ID, farm or variety…"
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">All lots</option>
            {LOT_STATUSES.map((status) => (
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
            icon: Package,
            title: 'No harvests yet',
            description: 'Seed lots appear here once an inspector approves a harvest request.',
          }}
        />
      </div>
    </div>
  );
}
