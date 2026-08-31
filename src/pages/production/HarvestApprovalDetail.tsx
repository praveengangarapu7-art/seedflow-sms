import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Copy,
  MapPin,
  MessageSquareWarning,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  masterDataApi,
  productionApi,
  type Farm,
  type Farmer,
  type FieldInspection,
  type SeedVariety,
} from '@/services/api';
import { seedFarmers, seedFarms, seedVarieties } from './cropPlanningData';
import { googleMapsUrl, parseGpsCoordinates } from './farmManagementData';
import { seedFieldInspections } from './fieldInspectionData';
import {
  approveHarvestRequest,
  authorizeTransport,
  formatHarvestDate,
  formatHarvestDateTime,
  formatKg,
  harvestStatusClass,
  isPendingStatus,
  markDeliveredToProcessing,
  recordHarvestCompletion,
  rejectHarvestRequest,
  requestHarvestChanges,
  useHarvestRequests,
} from './harvestData';
import styles from './production.module.css';
import harvestStyles from './harvest.module.css';

export default function HarvestApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const requests = useHarvestRequests();
  const request = useMemo(() => requests.find((item) => item.id === id) ?? null, [requests, id]);

  const [farms, setFarms] = useState<Farm[]>(seedFarms);
  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [varieties, setVarieties] = useState<SeedVariety[]>(seedVarieties);
  const [inspections, setInspections] = useState<FieldInspection[]>(seedFieldInspections);

  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [actualQuantity, setActualQuantity] = useState('');
  const [harvestedDate, setHarvestedDate] = useState(new Date().toISOString().slice(0, 10));

  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [destination, setDestination] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [transportError, setTransportError] = useState<string | null>(null);

  const inspectorName = user?.name?.trim() || 'Field Inspector';

  useEffect(() => {
    const load = async () => {
      try {
        const [farmsData, farmersData, varietiesData, inspectionsData] = await Promise.all([
          masterDataApi.getFarms(),
          masterDataApi.getFarmers(),
          masterDataApi.getVarieties(),
          productionApi.getFieldInspections(),
        ]);
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setVarieties(Array.isArray(varietiesData) && varietiesData.length > 0 ? varietiesData : seedVarieties);
        setInspections(
          Array.isArray(inspectionsData) && inspectionsData.length > 0 ? inspectionsData : seedFieldInspections,
        );
      } catch {
        setFarms(seedFarms);
        setFarmers(seedFarmers);
        setVarieties(seedVarieties);
        setInspections(seedFieldInspections);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    setInspectorNotes(request?.inspectorNotes ?? '');
    setActualQuantity(request?.actualQuantityKg ? String(request.actualQuantityKg) : String(request?.estimatedQuantityKg ?? ''));
  }, [request?.id, request?.inspectorNotes, request?.actualQuantityKg, request?.estimatedQuantityKg]);

  const farm = useMemo(() => farms.find((item) => item.id === request?.farmId) ?? null, [farms, request]);
  const farmer = useMemo(
    () => farmers.find((item) => item.id === (request?.farmerId || farm?.farmerId)) ?? null,
    [farmers, request, farm],
  );
  const variety = useMemo(() => varieties.find((item) => item.id === request?.varietyId) ?? null, [varieties, request]);
  const farmInspections = useMemo(
    () =>
      inspections
        .filter((item) => item.farmId === request?.farmId)
        .sort((a, b) => (b.inspectionDate ?? '').localeCompare(a.inspectionDate ?? '')),
    [inspections, request],
  );
  const gpsPoint = useMemo(() => parseGpsCoordinates(farm?.gpsCoordinates), [farm]);
  const averageHealth = farmInspections.length
    ? Math.round(farmInspections.reduce((sum, item) => sum + item.healthScore, 0) / farmInspections.length)
    : null;

  const actionable = request ? isPendingStatus(request.status) : false;

  function copyLot(lotId: string) {
    void navigator.clipboard?.writeText(lotId).then(
      () => addToast(`Lot ${lotId} copied`, 'success'),
      () => addToast('Unable to copy lot ID', 'error'),
    );
  }

  function handleApprove() {
    if (!request) return;
    const updated = approveHarvestRequest(request.id, { inspectorName, inspectorNotes });
    if (updated) addToast(`Approved · lot ${updated.lotId} created`, 'success');
  }

  function handleReject() {
    if (!request) return;
    if (!inspectorNotes.trim()) {
      setNoteError('Add inspector notes before rejecting — the farmer will see this.');
      return;
    }
    setNoteError(null);
    rejectHarvestRequest(request.id, { inspectorName, inspectorNotes });
    addToast(`${request.requestCode} rejected`, 'error');
  }

  function handleRequestChanges() {
    if (!request) return;
    if (!inspectorNotes.trim()) {
      setNoteError('Add inspector notes describing what needs to change.');
      return;
    }
    setNoteError(null);
    requestHarvestChanges(request.id, { inspectorName, inspectorNotes });
    addToast(`Changes requested on ${request.requestCode}`, 'info');
  }

  function submitHarvest() {
    if (!request) return;
    const quantity = Number(actualQuantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      addToast('Enter the actual harvested quantity', 'error');
      return;
    }
    recordHarvestCompletion(request.id, { actualQuantityKg: Math.round(quantity), harvestedDate, by: inspectorName });
    setHarvestModalOpen(false);
    addToast(`Harvest recorded for lot ${request.lotId}`, 'success');
  }

  function submitTransport() {
    if (!request) return;
    if (!transporterName.trim() || !vehicleNumber.trim() || !destination.trim() || !dispatchDate) {
      setTransportError('Transporter, vehicle number, destination and dispatch date are all required.');
      return;
    }
    setTransportError(null);
    authorizeTransport(request.id, {
      transporterName,
      vehicleNumber,
      destination,
      dispatchDate,
      authorizedBy: inspectorName,
    });
    setTransportModalOpen(false);
    addToast(`Transport authorised for lot ${request.lotId}`, 'success');
  }

  if (!request) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Harvest Request</h1>
            <p className={styles.subtitle}>This harvest request could not be found.</p>
          </div>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/harvests/approval')}>
            Back to queue
          </Button>
        </div>
        <div className={styles.card}>
          <div className={styles.emptyState}>
            The request may have been reset. Return to the approval queue to pick another one.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{request.requestCode}</h1>
          <p className={styles.subtitle}>
            Harvest request from {request.requestedBy} · raised {formatHarvestDateTime(request.requestedAt)}
          </p>
        </div>
        <div className={styles.actions}>
          {request.lotId ? (
            <Button variant="ghost" leftIcon={Package} onClick={() => navigate('/harvests')}>
              Harvest register
            </Button>
          ) : null}
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/harvests/approval')}>
            Back to queue
          </Button>
        </div>
      </div>

      {request.lotId ? (
        <div className={harvestStyles.lotBanner}>
          <div>
            <span className={harvestStyles.lotBannerLabel}>Seed lot tracking ID</span>
            <span className={harvestStyles.lotBannerValue}>
              {request.lotId}
              <button
                type="button"
                className={harvestStyles.copyButton}
                onClick={() => copyLot(request.lotId as string)}
                aria-label="Copy lot ID"
                title="Copy lot ID"
              >
                <Copy size={16} />
              </button>
            </span>
          </div>
          <span className={`${harvestStyles.status} ${harvestStyles[harvestStatusClass(request.status)]}`}>
            {request.status}
          </span>
        </div>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Request Details</h2>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <div className={styles.detailValue}>
              <span className={`${harvestStyles.status} ${harvestStyles[harvestStatusClass(request.status)]}`}>
                {request.status}
              </span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Farmer</span>
            <div className={styles.detailValue}>
              {farmer?.name ?? request.requestedBy}
              {farmer ? (farmer.kycVerified ? ' · KYC verified' : ' · KYC pending') : ''}
            </div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Crop / Variety</span>
            <div className={styles.detailValue}>
              {request.crop}
              {variety ? ` · ${variety.name}` : ''}
            </div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Estimated Quantity</span>
            <div className={styles.detailValue}>{formatKg(request.estimatedQuantityKg)}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Requested Harvest Date</span>
            <div className={styles.detailValue}>{formatHarvestDate(request.requestedHarvestDate)}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Actual Quantity</span>
            <div className={styles.detailValue}>
              {request.actualQuantityKg ? formatKg(request.actualQuantityKg) : 'Not harvested yet'}
            </div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Farmer Notes</span>
            <div className={styles.detailValue}>{request.notes ?? 'No notes provided.'}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Reviewed By</span>
            <div className={styles.detailValue}>
              {request.inspectorName ? `${request.inspectorName} · ${formatHarvestDateTime(request.reviewedAt)}` : 'Not reviewed yet'}
            </div>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>Farm &amp; Location</h2>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Farm</span>
            <div className={styles.detailValue}>{farm?.name ?? 'Unknown farm'}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Location</span>
            <div className={styles.detailValue}>{farm?.location ?? 'Not provided.'}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Area</span>
            <div className={styles.detailValue}>{farm?.area != null ? `${farm.area} acres` : 'Not provided.'}</div>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Soil / Irrigation</span>
            <div className={styles.detailValue}>
              {[farm?.soilType, farm?.irrigationType].filter(Boolean).join(' · ') || 'Not provided.'}
            </div>
          </div>
        </div>

        {gpsPoint ? (
          <div className={styles.mapBox} style={{ marginTop: '0.75rem' }}>
            <span className={styles.mapCoords}>
              <MapPin size={16} />
              {gpsPoint.lat.toFixed(4)}, {gpsPoint.lng.toFixed(4)}
            </span>
            <a className={styles.mapLink} href={googleMapsUrl(gpsPoint)} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </div>
        ) : null}

        <h2 className={styles.sectionTitle}>
          Farm Inspections {averageHealth !== null ? `· avg health ${averageHealth}` : ''}
        </h2>
        {farmInspections.length === 0 ? (
          <div className={styles.emptyState}>No field inspections recorded for this farm.</div>
        ) : (
          <div className={harvestStyles.inlineList}>
            {farmInspections.map((inspection) => (
              <div key={inspection.id} className={harvestStyles.inlineRow}>
                <div className={harvestStyles.inlineRowMain}>
                  <span className={harvestStyles.inlineRowTitle}>
                    {inspection.inspectionCode} · {inspection.cropStage}
                  </span>
                  <span className={harvestStyles.inlineRowMeta}>
                    {formatHarvestDate(inspection.inspectionDate)} · {inspection.inspectorName}
                    {inspection.diseaseDetected ? ` · ${inspection.diseaseName ?? 'Disease detected'}` : ''}
                  </span>
                </div>
                <div className={harvestStyles.rowActions}>
                  <span
                    className={`${styles.healthBadge} ${
                      inspection.healthScore > 80
                        ? styles.healthGood
                        : inspection.healthScore >= 60
                          ? styles.healthModerate
                          : styles.healthPoor
                    }`}
                  >
                    {inspection.healthScore}
                  </span>
                  <button
                    type="button"
                    className={harvestStyles.iconAction}
                    onClick={() => navigate(`/inspections/${inspection.id}`)}
                  >
                    <Activity size={13} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className={styles.sectionTitle}>Inspector Decision</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="inspectorNotes">Inspector notes</label>
          <textarea
            id="inspectorNotes"
            className={styles.textarea}
            value={inspectorNotes}
            onChange={(event) => setInspectorNotes(event.target.value)}
            placeholder="Readiness observations, moisture reading, isolation distance, roguing status…"
          />
          {noteError ? <span className={styles.errorText}>{noteError}</span> : null}
          <span className={styles.helperText}>
            Reviewing as {inspectorName}. Notes are required to reject or request changes.
          </span>
        </div>

        <div className={styles.actions}>
          <Button leftIcon={CheckCircle2} disabled={!actionable} onClick={handleApprove}>
            Approve &amp; Create Lot
          </Button>
          <Button variant="danger" leftIcon={XCircle} disabled={!actionable} onClick={handleReject}>
            Reject
          </Button>
          <Button variant="secondary" leftIcon={MessageSquareWarning} disabled={!actionable} onClick={handleRequestChanges}>
            Request Changes
          </Button>
        </div>
        {!actionable ? (
          <span className={styles.helperText} style={{ display: 'block', marginTop: '0.5rem' }}>
            This request has already been reviewed — its status is “{request.status}”.
          </span>
        ) : null}

        {request.lotId ? (
          <>
            <h2 className={styles.sectionTitle}>Harvest &amp; Transport</h2>
            {request.transport ? (
              <div className={harvestStyles.transportGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Transporter</span>
                  <div className={styles.detailValue}>{request.transport.transporterName}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Vehicle</span>
                  <div className={styles.detailValue}>{request.transport.vehicleNumber}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Destination</span>
                  <div className={styles.detailValue}>{request.transport.destination}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Dispatch Date</span>
                  <div className={styles.detailValue}>{formatHarvestDate(request.transport.dispatchDate)}</div>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Authorised By</span>
                  <div className={styles.detailValue}>
                    {request.transport.authorizedBy} · {formatHarvestDateTime(request.transport.authorizedAt)}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>Transport has not been authorised for this lot yet.</div>
            )}

            <div className={harvestStyles.workflowActions}>
              <Button
                variant="secondary"
                leftIcon={Package}
                disabled={request.status !== 'Approved'}
                onClick={() => setHarvestModalOpen(true)}
              >
                Record Harvest
              </Button>
              <Button
                variant="secondary"
                leftIcon={Truck}
                disabled={request.status !== 'Harvested'}
                onClick={() => setTransportModalOpen(true)}
              >
                Authorize Transport
              </Button>
              <Button
                variant="ghost"
                leftIcon={CheckCircle2}
                disabled={request.status !== 'Transport Authorized'}
                onClick={() => {
                  markDeliveredToProcessing(request.id, inspectorName);
                  addToast(`Lot ${request.lotId} marked delivered to processing`, 'success');
                }}
              >
                Mark Delivered
              </Button>
            </div>
          </>
        ) : null}

        <h2 className={styles.sectionTitle}>Status History</h2>
        <ol className={harvestStyles.timeline}>
          {request.history.map((event, index) => (
            <li key={`${event.status}-${event.at}-${index}`} className={harvestStyles.timelineItem}>
              <span
                className={`${harvestStyles.timelineDot} ${
                  event.status === 'Rejected'
                    ? harvestStyles.timelineDotDanger
                    : index < request.history.length - 1 || request.status !== 'Pending Approval'
                      ? harvestStyles.timelineDotDone
                      : ''
                }`}
              >
                {event.status === 'Rejected' ? <XCircle size={14} /> : index === request.history.length - 1 ? <Circle size={12} /> : <CheckCircle2 size={14} />}
              </span>
              <div className={harvestStyles.timelineBody}>
                <div className={harvestStyles.timelineTop}>
                  <span className={harvestStyles.timelineStatus}>{event.status}</span>
                  <span className={harvestStyles.timelineMeta}>
                    {formatHarvestDateTime(event.at)} · {event.by}
                  </span>
                </div>
                {event.note ? <span className={harvestStyles.timelineNote}>{event.note}</span> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Modal
        isOpen={harvestModalOpen}
        onClose={() => setHarvestModalOpen(false)}
        title="Record harvest"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHarvestModalOpen(false)}>Cancel</Button>
            <Button onClick={submitHarvest}>Record harvest</Button>
          </>
        }
      >
        <div className={harvestStyles.modalForm}>
          <div className={harvestStyles.modalSummary}>
            Lot {request.lotId} · {farm?.name} · estimated {formatKg(request.estimatedQuantityKg)}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="actualQuantity">Actual quantity (kg)</label>
            <Input
              id="actualQuantity"
              type="number"
              min={1}
              value={actualQuantity}
              onChange={(event) => setActualQuantity(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="harvestedDate">Date harvested</label>
            <Input
              id="harvestedDate"
              type="date"
              value={harvestedDate}
              onChange={(event) => setHarvestedDate(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        title="Authorize transport"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransportModalOpen(false)}>Cancel</Button>
            <Button leftIcon={Truck} onClick={submitTransport}>Authorize</Button>
          </>
        }
      >
        <div className={harvestStyles.modalForm}>
          <div className={harvestStyles.modalSummary}>
            Lot {request.lotId} · {formatKg(request.actualQuantityKg ?? request.estimatedQuantityKg)} ready for dispatch
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="transporterName">Transporter</label>
            <Input
              id="transporterName"
              value={transporterName}
              onChange={(event) => setTransporterName(event.target.value)}
              placeholder="e.g. Sri Balaji Logistics"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vehicleNumber">Vehicle number</label>
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(event) => setVehicleNumber(event.target.value)}
              placeholder="e.g. AP 07 CT 9931"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="destination">Destination</label>
            <Input
              id="destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="e.g. Guntur Processing Plant"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="dispatchDate">Dispatch date</label>
            <Input
              id="dispatchDate"
              type="date"
              value={dispatchDate}
              onChange={(event) => setDispatchDate(event.target.value)}
            />
          </div>
          {transportError ? <span className={styles.errorText}>{transportError}</span> : null}
        </div>
      </Modal>
    </div>
  );
}
