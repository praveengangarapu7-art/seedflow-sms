import { useCallback, useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Download, Package, QrCode } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  connectInventorySocket,
  createPackagingBatch,
  fetchPackagingBatches,
  fetchPackagingUnits,
  fetchSeedLots,
  fetchUnitLabel,
  login,
  type InventorySocketEvent,
  type PackagingBatchRow,
  type PackagingUnitRow,
  type RealtimeSeedLot,
  type UnitLabelData,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedPackagingLabeling.module.css';

function statusClass(status: string): string {
  return (
    {
      active: styles.statusActive,
      recalled: styles.statusRecalled,
      packaged: styles.statusPackaged,
      distributed: styles.statusDistributed,
      sold: styles.statusSold,
      damaged: styles.statusDamaged,
    }[status] ?? styles.statusPackaged
  );
}

function drawLabelOnPdf(doc: jsPDF, label: UnitLabelData, qrDataUrl: string, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(180);
  doc.roundedRect(x, y, w, h, 4, 4);
  doc.addImage(qrDataUrl, 'PNG', x + 8, y + 8, h - 16, h - 16);

  const textX = x + h + 2;
  let textY = y + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(label.lotCode, textX, textY);
  textY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${label.crop} — ${label.variety}`, textX, textY);
  textY += 11;
  doc.text(`Unit: ${label.unitCode}`, textX, textY);
  textY += 11;
  doc.text(`Net: ${label.unitSize}${label.unitOfMeasure}  •  Shelf life: ${label.shelfLifeMonths}mo`, textX, textY);
  textY += 11;
  doc.text(`Germination: ${label.germinationPercent != null ? `${label.germinationPercent}%` : 'Not tested'}`, textX, textY);
  textY += 11;
  doc.setFontSize(7);
  doc.text(label.storageConditions, textX, textY, { maxWidth: w - h - 14 });
}

async function exportSingleLabelPdf(label: UnitLabelData) {
  const qrDataUrl = await QRCode.toDataURL(label.qrPayload, { width: 300, margin: 1 });
  const doc = new jsPDF({ unit: 'pt', format: [300, 400] });

  doc.addImage(qrDataUrl, 'PNG', 90, 20, 120, 120);
  let y = 158;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(label.lotCode, 150, y, { align: 'center' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${label.crop} — ${label.variety}`, 150, y, { align: 'center' });
  y += 22;

  doc.setFontSize(9);
  const lines = [
    `Unit Code: ${label.unitCode}`,
    `Net Weight: ${label.unitSize} ${label.unitOfMeasure}`,
    `Germination: ${label.germinationPercent != null ? `${label.germinationPercent}%` : 'Not tested'}`,
    `Shelf Life: ${label.shelfLifeMonths} months`,
    `Certified: ${label.certifiedDate ? new Date(label.certifiedDate).toLocaleDateString() : 'Pending sign-off'}`,
  ];
  lines.forEach((line) => {
    doc.text(line, 20, y);
    y += 16;
  });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Storage Conditions:', 20, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(label.storageConditions, 20, y, { maxWidth: 260 });

  doc.save(`${label.unitCode}-label.pdf`);
}

async function exportBatchLabelsPdf(batchCode: string, labels: UnitLabelData[]) {
  const qrDataUrls = await Promise.all(labels.map((label) => QRCode.toDataURL(label.qrPayload, { width: 200, margin: 1 })));

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 30;
  const cols = 2;
  const rows = 5;
  const cellW = (595 - margin * 2) / cols;
  const cellH = 100;
  const perPage = cols * rows;

  labels.forEach((label, index) => {
    const onPage = index % perPage;
    if (index > 0 && onPage === 0) doc.addPage();
    const col = onPage % cols;
    const row = Math.floor(onPage / cols);
    const x = margin + col * cellW;
    const y = margin + row * (cellH + 10);
    drawLabelOnPdf(doc, label, qrDataUrls[index], x, y, cellW - 10, cellH);
  });

  doc.save(`${batchCode}-labels.pdf`);
}

export default function SeedPackagingLabeling() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(4); // Warehouse Manager by default
  const [token, setToken] = useState<string | null>(null);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [batches, setBatches] = useState<PackagingBatchRow[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [units, setUnits] = useState<PackagingUnitRow[]>([]);

  const [unitSize, setUnitSize] = useState('10');
  const [unitCount, setUnitCount] = useState('20');
  const [storageConditions, setStorageConditions] = useState('Cool, dry place below 25°C, away from direct sunlight');
  const [shelfLifeMonths, setShelfLifeMonths] = useState('12');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<UnitLabelData | null>(null);
  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string | null>(null);
  const [bulkExporting, setBulkExporting] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  const selectedLot = lots.find((lot) => lot.id === selectedLotId) ?? null;
  const requestedTotal = (Number(unitSize) || 0) * (Number(unitCount) || 0);

  const refreshBatches = useCallback(
    async (accessToken: string, lotId: string) => {
      if (!lotId) return;
      const list = await fetchPackagingBatches(accessToken, { seedLotId: lotId });
      setBatches(list);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);

        const lotsResult = await fetchSeedLots(accessToken);
        if (cancelled) return;
        const certifiedLots = lotsResult.filter((lot) => lot.stage === 'Certified');
        setLots(certifiedLots);
        setSelectedLotId((current) => current || certifiedLots[0]?.id || '');

        socketRef.current?.close();
        socketRef.current = connectInventorySocket(accessToken, {
          onEvent: (event: InventorySocketEvent) => {
            if (event.event === 'PACKAGING_BATCH_CREATED') {
              void refreshBatches(accessToken, event.payload.seedLotId);
              if (event.payload.seedLotId === selectedLotId) {
                void fetchSeedLots(accessToken).then((updated) => setLots(updated.filter((lot) => lot.stage === 'Certified')));
              }
            }
          },
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the packaging service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (token && selectedLotId) {
      void refreshBatches(token, selectedLotId);
      setSelectedBatchId(null);
      setUnits([]);
    }
  }, [token, selectedLotId, refreshBatches]);

  useEffect(() => {
    if (token && selectedBatchId) {
      void fetchPackagingUnits(token, selectedBatchId).then(setUnits);
    }
  }, [token, selectedBatchId]);

  const handleCreateBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token || !selectedLotId) return;

    const size = Number(unitSize);
    const count = Number(unitCount);
    const shelfLife = Number(shelfLifeMonths);
    if (!Number.isFinite(size) || size <= 0) {
      setError('Unit size must be a positive number.');
      return;
    }
    if (!Number.isInteger(count) || count <= 0) {
      setError('Unit count must be a positive whole number.');
      return;
    }
    if (!storageConditions.trim()) {
      setError('Storage conditions are required.');
      return;
    }
    if (!Number.isInteger(shelfLife) || shelfLife <= 0) {
      setError('Shelf life must be a positive whole number of months.');
      return;
    }

    setCreating(true);
    try {
      const result = await createPackagingBatch(token, {
        seedLotId: selectedLotId,
        unitSize: size,
        unitCount: count,
        storageConditions: storageConditions.trim(),
        shelfLifeMonths: shelfLife,
      });
      addToast(`Packaging batch ${result.batch.batch_code} created (${count} units)`, 'success');
      await refreshBatches(token, selectedLotId);
      const updatedLots = await fetchSeedLots(token);
      setLots(updatedLots.filter((lot) => lot.stage === 'Certified'));
      setSelectedBatchId(result.batch.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create packaging batch';
      setError(message);
      addToast(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const openLabel = async (unitId: string) => {
    if (!token) return;
    try {
      const label = await fetchUnitLabel(token, unitId);
      const qrDataUrl = await QRCode.toDataURL(label.qrPayload, { width: 220, margin: 1 });
      setActiveLabel(label);
      setActiveQrDataUrl(qrDataUrl);
      setLabelModalOpen(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to load label', 'error');
    }
  };

  const handleBulkExport = async (batch: PackagingBatchRow) => {
    if (!token) return;
    setBulkExporting(true);
    try {
      const batchUnits = await fetchPackagingUnits(token, batch.id);
      const labels = await Promise.all(batchUnits.map((unit) => fetchUnitLabel(token, unit.id)));
      await exportBatchLabelsPdf(batch.batch_code, labels);
      addToast(`Exported ${labels.length} labels for ${batch.batch_code}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to export labels', 'error');
    } finally {
      setBulkExporting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Lot Packaging &amp; Labeling</h1>
          <p className={styles.subtitle}>
            Divide Certified lots into farmer-sized bags, each with its own traceable QR code and printable label.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <select className={styles.select} value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
            <option value="">Select a Certified lot</option>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.lot_code} — {lot.quantity_available.toLocaleString()} {lot.unit} available
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.grid}>
        <div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Packaging Batches</h2>
            <p className={styles.sectionSubtitle}>
              {selectedLot ? `${selectedLot.lot_code} — ${selectedLot.quantity_available.toLocaleString()} ${selectedLot.unit} available` : 'Select a lot to see its packaging batches.'}
            </p>
            {batches.length === 0 ? (
              <div className={styles.emptyState}>No packaging batches for this lot yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch Code</th>
                    <th>Units</th>
                    <th>Total</th>
                    <th>Shelf Life</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className={`${styles.tableRow} ${selectedBatchId === batch.id ? styles.tableRowSelected : ''}`}
                      onClick={() => setSelectedBatchId(batch.id)}
                    >
                      <td>{batch.batch_code}</td>
                      <td>{batch.unit_count} × {batch.unit_size}{batch.unit_of_measure}</td>
                      <td>{batch.total_quantity.toLocaleString()} {batch.unit_of_measure}</td>
                      <td>{batch.shelf_life_months} mo</td>
                      <td><span className={`${styles.statusBadge} ${statusClass(batch.status)}`}>{batch.status}</span></td>
                      <td>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={Download}
                          isLoading={bulkExporting && selectedBatchId === batch.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBatchId(batch.id);
                            void handleBulkExport(batch);
                          }}
                        >
                          All Labels
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedBatchId ? (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Units</h2>
              <p className={styles.sectionSubtitle}>Each bag has its own unique code and QR — click one to view its label.</p>
              {units.length === 0 ? (
                <div className={styles.emptyState}>Loading units…</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Unit Code</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => (
                      <tr key={unit.id}>
                        <td>{unit.unit_code}</td>
                        <td><span className={`${styles.statusBadge} ${statusClass(unit.status)}`}>{unit.status}</span></td>
                        <td>
                          <Button size="sm" variant="secondary" leftIcon={QrCode} onClick={() => void openLabel(unit.id)}>
                            View Label
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Create Packaging Batch</h2>
          <form className={styles.form} onSubmit={handleCreateBatch}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="unitSize">Unit Size (kg)</label>
                <Input id="unitSize" type="number" min="0" step="0.5" value={unitSize} onChange={(e) => setUnitSize(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="unitCount">Unit Count</label>
                <Input id="unitCount" type="number" min="1" value={unitCount} onChange={(e) => setUnitCount(e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="storageConditions">Storage Conditions</label>
              <Input id="storageConditions" value={storageConditions} onChange={(e) => setStorageConditions(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="shelfLifeMonths">Shelf Life (months)</label>
              <Input id="shelfLifeMonths" type="number" min="1" value={shelfLifeMonths} onChange={(e) => setShelfLifeMonths(e.target.value)} />
            </div>
            <div className={styles.computedBox}>
              Total to package: <strong>{requestedTotal.toLocaleString()} kg</strong>
              {selectedLot ? <> of {selectedLot.quantity_available.toLocaleString()} {selectedLot.unit} available</> : null}
            </div>
            <Button type="submit" leftIcon={Package} isLoading={creating} disabled={!selectedLotId}>
              Create Batch
            </Button>
          </form>
        </div>
      </div>

      <Modal isOpen={labelModalOpen} onClose={() => setLabelModalOpen(false)} title="Seed Bag Label" size="lg">
        {activeLabel && activeQrDataUrl ? (
          <>
            <div className={styles.labelSheet}>
              <img src={activeQrDataUrl} alt="Traceability QR code" className={styles.labelQr} />
              <div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Lot Code</div>
                  <div className={styles.labelFieldValue}>{activeLabel.lotCode}</div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Crop / Variety</div>
                  <div className={styles.labelFieldValue}>{activeLabel.crop} — {activeLabel.variety}</div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Unit Code</div>
                  <div className={styles.labelFieldValue}>{activeLabel.unitCode}</div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Net Weight</div>
                  <div className={styles.labelFieldValue}>{activeLabel.unitSize} {activeLabel.unitOfMeasure}</div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Germination</div>
                  <div className={styles.labelFieldValue}>
                    {activeLabel.germinationPercent != null ? `${activeLabel.germinationPercent}%` : 'Not tested'}
                  </div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Shelf Life</div>
                  <div className={styles.labelFieldValue}>{activeLabel.shelfLifeMonths} months</div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Certified</div>
                  <div className={styles.labelFieldValue}>
                    {activeLabel.certifiedDate ? new Date(activeLabel.certifiedDate).toLocaleDateString() : 'Pending sign-off'}
                  </div>
                </div>
                <div className={styles.labelField}>
                  <div className={styles.labelFieldLabel}>Storage Conditions</div>
                  <div className={styles.labelFieldValue}>{activeLabel.storageConditions}</div>
                </div>
              </div>
            </div>
            <div className={styles.labelActions}>
              <Button leftIcon={Download} onClick={() => void exportSingleLabelPdf(activeLabel)}>
                Export Label PDF
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
