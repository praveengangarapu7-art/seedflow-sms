import { apiConfig, buildApiUrl } from '@/config/api.config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiClientError extends Error {
  status: number;
  response?: unknown;

  constructor(message: string, status: number, response?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.response = response;
  }
}

export interface EntityId {
  id: string;
}

export interface SeedVariety extends EntityId {
  name: string;
  crop: string;
  description?: string;
  category?: string;
  breederOrganization?: string;
  status?: 'draft' | 'active' | 'pending' | 'approved' | 'archived';
  createdAt?: string;
}

export interface Crop extends EntityId {
  name: string;
  category: string;
  season: string;
  active: boolean;
}

export interface Organization extends EntityId {
  name: string;
  type: 'breeder' | 'producer' | 'laboratory' | 'certification_agency' | 'warehouse' | 'dealer' | 'government_authority';
  location?: string | null;
  contact_person?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SeedClass = 'Breeder' | 'Foundation' | 'Certified' | 'Truthful Label';

export interface SeedLot extends EntityId {
  varietyId: string;
  seedClass: SeedClass;
  sourceOrgId: string;
  quantity: number;
  productionDate: string;
  parentLotId?: string;
}

export interface Farmer extends EntityId {
  name: string;
  phone?: string | null;
  /** Required by the real backend on create/update; optional here only because a few
   * existing production-module mock datasets (pre-dating the real farmers API) don't set it. */
  region?: string;
  location?: string | null;
  organization_id?: string | null;
  /** Legacy display-only field from the original frontend scaffold — the real farmers
   * table has no KYC column. Kept optional so the existing harvest/crop-planning mock
   * data (which still sets it) keeps compiling; the master-data Farmer screens never set it. */
  kycVerified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Farm extends EntityId {
  farmerId: string;
  name: string;
  location: string;
  gpsCoordinates?: string;
  area?: number;
  cropHistory?: string[];
  currentCrop?: string;
  soilType?: string;
  irrigationType?: string;
}

export interface CropPlan extends EntityId {
  planCode: string;
  farmerId: string;
  farmId: string;
  varietyId: string;
  crop: string;
  season: string;
  targetArea?: number;
  targetProduction?: number;
  targetYield?: number;
  sowingDate?: string;
  harvestDate?: string;
  status: string;
  /** Foundation SeedLot this plan draws its parent seed allocation from (see master-data/seed-lots). */
  seedLotId?: string;
  /** Quantity (kg) allocated/deducted from the seed lot for this crop plan. */
  seedLotAllocatedQty?: number;
}

export interface InspectionRecord extends EntityId {
  inspectionCode: string;
  farmId: string;
  status: string;
  crop: string;
  inspectionDate?: string;
}

export interface FieldAiPrediction {
  diseaseRiskPercent: number;
  pestsDetected: string[];
  nutrientDeficiency?: string;
  recommendations: string[];
}

export interface FieldInspection extends EntityId {
  inspectionCode: string;
  farmId: string;
  cropStage: string;
  inspectorName: string;
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
  notes?: string;
  photos?: string[];
  inspectionDate?: string;
  aiPrediction?: FieldAiPrediction;
}

export interface HarvestRecord extends EntityId {
  harvestCode: string;
  farmId: string;
  crop: string;
  quantity?: number;
  approved: boolean;
}

export interface ProcessingLot extends EntityId {
  lotCode: string;
  crop: string;
  sourceFarmId?: string;
  status: string;
  moisture?: number;
  purity?: number;
}

export interface LabTest extends EntityId {
  testCode: string;
  lotId: string;
  type: string;
  result: string;
  status: string;
}

export interface CertificationRecord extends EntityId {
  certificateCode: string;
  lotId: string;
  status: string;
  validity?: string;
}

export interface Complaint extends EntityId {
  complaintCode: string;
  lotId?: string;
  source: string;
  status: string;
}

export interface TraceabilityRecord extends EntityId {
  traceabilityId: string;
  lotId: string;
  origin: string;
  currentLocation?: string;
}

export interface InventoryItem extends EntityId {
  sku: string;
  lotId?: string;
  quantity: number;
  warehouseId?: string;
  status: string;
}

export interface DistributionRecord extends EntityId {
  distributionCode: string;
  warehouseId?: string;
  dealerId?: string;
  quantity: number;
  status: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ProductionDashboardData {
  totalFarmers: number;
  activeFarms: number;
  totalPlannedArea: number;
  totalHarvestTarget: number;
  statusBreakdown: { status: string; count: number }[];
  cropDistribution: { crop: string; count: number }[];
  monthlyProgress: { month: string; target: number; actual: number }[];
}

export interface PredictionRequest {
  crop?: string;
  region?: string;
  season?: string;
  lotId?: string;
  data?: Record<string, unknown>;
}

export interface PredictionResult {
  model: string;
  score: number;
  prediction: string;
  confidence: number;
  recommendedAction?: string;
}

async function normalizeResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  const normalized =
    payload && typeof payload === 'object' && 'success' in payload
      ? (payload as ApiResponse<T>)
      : ({ success: response.ok, data: payload as T, message: response.ok ? 'Success' : 'Request failed' } as ApiResponse<T>);

  if (!response.ok || normalized.success === false) {
    const message =
      normalized.message ?? `Request failed with status ${response.status}`;
    throw new ApiClientError(message, response.status, normalized);
  }

  return (normalized.data ?? ({} as T)) as T;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = apiConfig.timeoutMs,
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const controller = new AbortController();

  const timeoutId = typeof window !== 'undefined'
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...apiConfig.defaultHeaders,
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    return await normalizeResponse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new ApiClientError(
        `Request timed out after ${timeoutMs}ms for ${endpoint}`,
        408,
        { endpoint },
      );
      console.error('[SeedSphere API] Request timed out:', timeoutError);
      throw timeoutError;
    }

    const apiError = error instanceof ApiClientError
      ? error
      : new ApiClientError(
          error instanceof Error ? error.message : 'Unexpected API error',
          500,
          { endpoint },
        );

    console.error(`[SeedSphere API] ${options.method ?? 'GET'} ${endpoint} failed`, apiError);
    throw apiError;
  } finally {
    if (typeof window !== 'undefined') {
      window.clearTimeout(timeoutId as number);
    } else {
      clearTimeout(timeoutId as ReturnType<typeof setTimeout>);
    }
  }
}

const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export const masterDataApi = {
  // NOTE: the real variety catalog now lives on the backend at
  // production/varieties, with a materially different shape (crop,
  // variety_name, botanical_name, seasonal versions, a breeding-committee
  // review workflow) than the simple fields below. Reconciling this page
  // with that backend is a separate, larger piece of work — tracked, not
  // done here — so these calls are left pointing at the placeholder path
  // they always used and the page falls back to its local sample data.
  getVarieties: () => api.get<SeedVariety[]>('master-data/varieties'),
  getVariety: (id: string) => api.get<SeedVariety>(`master-data/varieties/${id}`),
  createVariety: (payload: Partial<SeedVariety>) => api.post<SeedVariety>('master-data/varieties', payload),
  updateVariety: (id: string, payload: Partial<SeedVariety>) => api.put<SeedVariety>(`master-data/varieties/${id}`, payload),
  deleteVariety: (id: string) => api.del<{ deleted: boolean }>(`master-data/varieties/${id}`),

  getCrops: (params?: { active?: boolean }) =>
    api.get<Crop[]>(params?.active !== undefined ? `crops?active=${params.active}` : 'crops'),
  getCrop: (id: string) => api.get<Crop>(`crops/${id}`),
  createCrop: (payload: Partial<Crop>) => api.post<Crop>('crops', payload),
  updateCrop: (id: string, payload: Partial<Crop>) => api.put<Crop>(`crops/${id}`, payload),
  deleteCrop: (id: string) => api.del<{ deleted: boolean }>(`crops/${id}`),

  getOrganizations: (params?: { type?: string }) =>
    api.get<Organization[]>(params?.type ? `organizations?type=${encodeURIComponent(params.type)}` : 'organizations'),
  getOrganization: (id: string) => api.get<Organization>(`organizations/${id}`),
  createOrganization: (payload: Partial<Organization> & { contactPerson?: string }) =>
    api.post<Organization>('organizations', payload),
  updateOrganization: (id: string, payload: Partial<Organization> & { contactPerson?: string }) =>
    api.put<Organization>(`organizations/${id}`, payload),
  deleteOrganization: (id: string) => api.del<{ deleted: boolean }>(`organizations/${id}`),

  getBreederOrganizations: () => api.get<Organization[]>('organizations?type=breeder'),
  getSeedProducers: () => api.get<Organization[]>('organizations?type=producer'),
  getLaboratories: () => api.get<Organization[]>('organizations?type=laboratory'),
  getCertificationAgencies: () => api.get<Organization[]>('organizations?type=certification_agency'),
  getWarehouses: () => api.get<Organization[]>('organizations?type=warehouse'),
  getDealers: () => api.get<Organization[]>('organizations?type=dealer'),
  getGovernmentAuthorities: () => api.get<Organization[]>('organizations?type=government_authority'),

  getFarmers: (params?: { region?: string; organizationId?: string }) => {
    const query = new URLSearchParams();
    if (params?.region) query.set('region', params.region);
    if (params?.organizationId) query.set('organizationId', params.organizationId);
    const qs = query.toString();
    return api.get<Farmer[]>(qs ? `farmers?${qs}` : 'farmers');
  },
  getFarmer: (id: string) => api.get<Farmer>(`farmers/${id}`),
  createFarmer: (payload: Partial<Farmer> & { organizationId?: string }) => api.post<Farmer>('farmers', payload),
  updateFarmer: (id: string, payload: Partial<Farmer> & { organizationId?: string | null }) =>
    api.put<Farmer>(`farmers/${id}`, payload),
  deleteFarmer: (id: string) => api.del<{ deleted: boolean }>(`farmers/${id}`),

  getFarms: () => api.get<Farm[]>('master-data/farms'),
  getFarm: (id: string) => api.get<Farm>(`master-data/farms/${id}`),
  createFarm: (payload: Partial<Farm>) => api.post<Farm>('master-data/farms', payload),
  updateFarm: (id: string, payload: Partial<Farm>) => api.put<Farm>(`master-data/farms/${id}`, payload),

  getSeedLots: () => api.get<SeedLot[]>('master-data/seed-lots'),
  getSeedLot: (id: string) => api.get<SeedLot>(`master-data/seed-lots/${id}`),
  createSeedLot: (payload: Partial<SeedLot>) => api.post<SeedLot>('master-data/seed-lots', payload),
  updateSeedLot: (id: string, payload: Partial<SeedLot>) => api.put<SeedLot>(`master-data/seed-lots/${id}`, payload),
  deleteSeedLot: (id: string) => api.del<{ deleted: boolean }>(`master-data/seed-lots/${id}`),

  getContractGrowers: () => api.get<Farmer[]>('master-data/contract-growers'),
  getGeographicLocations: () => api.get<any[]>('master-data/locations'),
  getInspectionChecklists: () => api.get<any[]>('master-data/inspection-checklists'),
  getTestingStandards: () => api.get<any[]>('master-data/testing-standards'),
  getMasterSummary: () => api.get<Record<string, number>>('master-data/summary'),
};

export const productionApi = {
  getProductionTargets: () => api.get<any[]>('production/targets'),
  getProductionTarget: (id: string) => api.get<any>(`production/targets/${id}`),
  createProductionTarget: (payload: unknown) => api.post<any>('production/targets', payload),

  getSeasonalPlans: () => api.get<any[]>('production/seasonal-plans'),
  getSeasonalPlan: (id: string) => api.get<any>(`production/seasonal-plans/${id}`),
  createSeasonalPlan: (payload: unknown) => api.post<any>('production/seasonal-plans', payload),

  getDemandForecasts: () => api.get<any[]>('production/demand-forecast'),
  createDemandForecast: (payload: unknown) => api.post<any>('production/demand-forecast', payload),

  getCropPlans: () => api.get<CropPlan[]>('production/crop-plans'),
  getCropPlan: (id: string) => api.get<CropPlan>(`production/crop-plans/${id}`),
  createCropPlan: (payload: Partial<CropPlan>) => api.post<CropPlan>('production/crop-plans', payload),
  updateCropPlan: (id: string, payload: Partial<CropPlan>) => api.put<CropPlan>(`production/crop-plans/${id}`, payload),

  getFarmAllocations: () => api.get<any[]>('production/farm-allocations'),
  createFarmAllocation: (payload: unknown) => api.post<any>('production/farm-allocations', payload),

  getProductionCalendar: () => api.get<any[]>('production/calendar'),

  getResourcePlans: () => api.get<any[]>('production/resource-plans'),
  createResourcePlan: (payload: unknown) => api.post<any>('production/resource-plans', payload),

  getInspections: () => api.get<InspectionRecord[]>('production/inspections'),
  getInspection: (id: string) => api.get<InspectionRecord>(`production/inspections/${id}`),
  createInspection: (payload: Partial<InspectionRecord>) => api.post<InspectionRecord>('production/inspections', payload),
  updateInspection: (id: string, payload: Partial<InspectionRecord>) => api.put<InspectionRecord>(`production/inspections/${id}`, payload),
  approveInspection: (id: string) => api.patch<InspectionRecord>(`production/inspections/${id}/approve`, {}),

  getFieldInspections: () => api.get<FieldInspection[]>('production/field-inspections'),
  getFieldInspection: (id: string) => api.get<FieldInspection>(`production/field-inspections/${id}`),
  createFieldInspection: (payload: Partial<FieldInspection>) => api.post<FieldInspection>('production/field-inspections', payload),

  getHarvests: () => api.get<HarvestRecord[]>('production/harvests'),
  getHarvest: (id: string) => api.get<HarvestRecord>(`production/harvests/${id}`),
  createHarvest: (payload: Partial<HarvestRecord>) => api.post<HarvestRecord>('production/harvests', payload),
  approveHarvest: (id: string) => api.patch<HarvestRecord>(`production/harvests/${id}/approve`, {}),

  getProductionDashboard: () => api.get<DashboardMetric[]>('production/dashboard'),
};

export const processingApi = {
  getProcessingLots: () => api.get<ProcessingLot[]>('processing/lots'),
  getProcessingLot: (id: string) => api.get<ProcessingLot>(`processing/lots/${id}`),
  createProcessingLot: (payload: Partial<ProcessingLot>) => api.post<ProcessingLot>('processing/lots', payload),
  updateProcessingLot: (id: string, payload: Partial<ProcessingLot>) => api.put<ProcessingLot>(`processing/lots/${id}`, payload),

  getProcessingStages: () => api.get<any[]>('processing/stages'),
  createSeedReceipt: (payload: unknown) => api.post<any>('processing/seed-receipt', payload),
  startDrying: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/drying`, payload ?? {}),
  startCleaning: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/cleaning`, payload ?? {}),
  startGrading: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/grading`, payload ?? {}),
  startSorting: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/sorting`, payload ?? {}),
  startTreatment: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/treatment`, payload ?? {}),
  finalizePackaging: (id: string, payload?: unknown) => api.patch<any>(`processing/lots/${id}/packaging`, payload ?? {}),
  createLotGenealogy: (payload: unknown) => api.post<any>('processing/lot-genealogy', payload),

  getLabSamples: () => api.get<any[]>('processing/lab-samples'),
  createLabSample: (payload: unknown) => api.post<any>('processing/lab-samples', payload),
  getLabTests: () => api.get<LabTest[]>('processing/lab-tests'),
  getLabTest: (id: string) => api.get<LabTest>(`processing/lab-tests/${id}`),
  createLabTest: (payload: Partial<LabTest>) => api.post<LabTest>('processing/lab-tests', payload),
  updateLabTest: (id: string, payload: Partial<LabTest>) => api.put<LabTest>(`processing/lab-tests/${id}`, payload),

  getProcessingDashboard: () => api.get<DashboardMetric[]>('processing/dashboard'),
};

export const certificationApi = {
  getCertifications: () => api.get<CertificationRecord[]>('certification/certificates'),
  getCertification: (id: string) => api.get<CertificationRecord>(`certification/certificates/${id}`),
  applyCertification: (payload: Partial<CertificationRecord>) => api.post<CertificationRecord>('certification/applications', payload),
  verifyDocuments: (id: string) => api.patch<CertificationRecord>(`certification/applications/${id}/document-verification`, {}),
  reviewInspection: (id: string) => api.patch<CertificationRecord>(`certification/applications/${id}/inspection-review`, {}),
  reviewLabResults: (id: string) => api.patch<CertificationRecord>(`certification/applications/${id}/lab-review`, {}),
  approveCertification: (id: string) => api.patch<CertificationRecord>(`certification/applications/${id}/approve`, {}),
  generateCertificate: (id: string) => api.post<CertificationRecord>(`certification/applications/${id}/generate-certificate`, {}),
  generateQrTag: (id: string) => api.post<CertificationRecord>(`certification/applications/${id}/qr-tag`, {}),

  getComplaints: () => api.get<Complaint[]>('certification/complaints'),
  getComplaint: (id: string) => api.get<Complaint>(`certification/complaints/${id}`),
  createComplaint: (payload: Partial<Complaint>) => api.post<Complaint>('certification/complaints', payload),
  investigateComplaint: (id: string) => api.patch<Complaint>(`certification/complaints/${id}/investigate`, {}),
  resolveComplaint: (id: string, payload?: unknown) => api.patch<Complaint>(`certification/complaints/${id}/resolve`, payload ?? {}),

  getTraceability: () => api.get<TraceabilityRecord[]>('certification/traceability'),
  getTraceabilityLot: (id: string) => api.get<TraceabilityRecord>(`certification/traceability/${id}`),
  getBatchHistory: (lotId: string) => api.get<any[]>(`certification/traceability/${lotId}/history`),

  getCertificationDashboard: () => api.get<DashboardMetric[]>('certification/dashboard'),
};

export const warehouseApi = {
  getWarehouses: () => api.get<any[]>('warehouse/locations'),
  getWarehouse: (id: string) => api.get<any>(`warehouse/locations/${id}`),

  getInventory: () => api.get<InventoryItem[]>('warehouse/inventory'),
  getInventoryItem: (id: string) => api.get<InventoryItem>(`warehouse/inventory/${id}`),
  createInventoryItem: (payload: Partial<InventoryItem>) => api.post<InventoryItem>('warehouse/inventory', payload),
  updateInventoryItem: (id: string, payload: Partial<InventoryItem>) => api.put<InventoryItem>(`warehouse/inventory/${id}`, payload),
  adjustInventory: (id: string, payload: unknown) => api.patch<any>(`warehouse/inventory/${id}/adjust`, payload),

  getStockMovements: () => api.get<any[]>('warehouse/stock-movements'),
  createStockMovement: (payload: unknown) => api.post<any>('warehouse/stock-movements', payload),

  getDispatches: () => api.get<DistributionRecord[]>('warehouse/distributions'),
  getDispatch: (id: string) => api.get<DistributionRecord>(`warehouse/distributions/${id}`),
  createDispatch: (payload: Partial<DistributionRecord>) => api.post<DistributionRecord>('warehouse/distributions', payload),
  approveDispatch: (id: string) => api.patch<DistributionRecord>(`warehouse/distributions/${id}/approve`, {}),

  getReturns: () => api.get<any[]>('warehouse/returns'),
  createReturn: (payload: unknown) => api.post<any>('warehouse/returns', payload),

  getColdStorage: () => api.get<any[]>('warehouse/cold-storage'),
  getWarehouseDashboard: () => api.get<DashboardMetric[]>('warehouse/dashboard'),
};

export const analyticsApi = {
  getProductionDashboard: () => api.get<DashboardMetric[]>('analytics/production'),
  getProductionPlanningDashboard: () => api.get<ProductionDashboardData>('analytics/production-dashboard'),
  getSeedAvailabilityDashboard: () => api.get<DashboardMetric[]>('analytics/seed-availability'),
  getCertificationStatusDashboard: () => api.get<DashboardMetric[]>('analytics/certification-status'),
  getInspectionStatusDashboard: () => api.get<DashboardMetric[]>('analytics/inspection-status'),
  getLaboratoryStatusDashboard: () => api.get<DashboardMetric[]>('analytics/laboratory-status'),
  getWarehouseInventoryDashboard: () => api.get<DashboardMetric[]>('analytics/warehouse-inventory'),
  getSalesPerformanceDashboard: () => api.get<DashboardMetric[]>('analytics/sales-performance'),
  getFarmerPerformanceDashboard: () => api.get<DashboardMetric[]>('analytics/farmer-performance'),
  getRegionalProductivityDashboard: () => api.get<DashboardMetric[]>('analytics/regional-productivity'),
  getComplianceKpisDashboard: () => api.get<DashboardMetric[]>('analytics/compliance-kpis'),
  getQualityTrendsDashboard: () => api.get<DashboardMetric[]>('analytics/quality-trends'),
  getTraceabilityDashboard: () => api.get<DashboardMetric[]>('analytics/traceability'),
  getRiskHeatmapDashboard: () => api.get<DashboardMetric[]>('analytics/risk-heatmap'),
  getExecutiveSummary: () => api.get<Record<string, unknown>>('analytics/executive-summary'),
};

export const aiApi = {
  predictDemand: (payload: PredictionRequest) => api.post<PredictionResult>('ai/demand-prediction', payload),
  predictYield: (payload: PredictionRequest) => api.post<PredictionResult>('ai/yield-prediction', payload),
  predictDiseaseRisk: (payload: PredictionRequest) => api.post<PredictionResult>('ai/disease-risk', payload),
  predictPestRisk: (payload: PredictionRequest) => api.post<PredictionResult>('ai/pest-risk', payload),
  predictWeatherImpact: (payload: PredictionRequest) => api.post<PredictionResult>('ai/weather-impact', payload),
  predictGermination: (payload: PredictionRequest) => api.post<PredictionResult>('ai/germination-prediction', payload),
  predictSeedQuality: (payload: PredictionRequest) => api.post<PredictionResult>('ai/seed-quality-prediction', payload),
  predictInspectionAnomaly: (payload: PredictionRequest) => api.post<PredictionResult>('ai/inspection-anomaly-detection', payload),
  detectFraud: (payload: PredictionRequest) => api.post<PredictionResult>('ai/fraud-detection', payload),
  optimizeInventory: (payload: PredictionRequest) => api.post<PredictionResult>('ai/inventory-optimization', payload),
  scoreFarmerPerformance: (payload: PredictionRequest) => api.post<PredictionResult>('ai/farmer-performance-scoring', payload),
  predictCropFailure: (payload: PredictionRequest) => api.post<PredictionResult>('ai/crop-failure-risk', payload),
  getAiModels: () => api.get<any[]>('ai/models'),
  getAiModel: (id: string) => api.get<any>(`ai/models/${id}`),
  getAiInsights: () => api.get<any[]>('ai/insights'),
};

export { apiConfig };
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
