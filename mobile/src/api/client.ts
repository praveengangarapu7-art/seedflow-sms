import { API_BASE_URL } from './config';

export class ApiError extends Error {}

async function request<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload.data as T;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
  return request('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
}

export interface SeedLotSummary {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  status: string;
  quantity_total: number;
  quantity_allocated: number;
  quantity_available: number;
  is_low_stock: boolean;
  unit: string;
  production_date: string;
}

export async function fetchSeedLots(token: string, filters: { stage?: string } = {}): Promise<SeedLotSummary[]> {
  const params = new URLSearchParams();
  if (filters.stage) params.set('stage', filters.stage);
  const query = params.toString();
  return request(`/production/seed-lots${query ? `?${query}` : ''}`, token);
}

export async function fetchSeedLotById(token: string, id: string): Promise<SeedLotSummary> {
  return request(`/production/seed-lots/${id}`, token);
}

export interface RateSummary {
  averagePercent: number | null;
  testCount: number;
}

export interface QualityMetricsSummary {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  stage: string;
  purity: RateSummary;
  viability: RateSummary;
  germination: RateSummary;
}

export async function fetchQualityMetrics(token: string, seedLotId: string): Promise<QualityMetricsSummary> {
  return request(`/production/seed-lots/${seedLotId}/quality-metrics`, token);
}

export interface VarietySummary {
  id: string;
  crop: string;
  variety_name: string;
  botanical_name: string;
  local_names: string[];
  status: string;
  latestVersion: {
    season: string;
    agro_climatic_suitability: string[];
    yield_benchmark_per_acre: number | null;
    yield_unit: string;
    disease_resistance_profile: { disease: string; resistanceLevel: string }[];
    market_demand_trend: string | null;
  } | null;
}

export async function fetchVarieties(token: string, filters: { crop?: string; status?: string } = {}): Promise<VarietySummary[]> {
  const params = new URLSearchParams();
  if (filters.crop) params.set('crop', filters.crop);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return request(`/production/varieties${query ? `?${query}` : ''}`, token);
}

export interface RecordFieldInspectionPayload {
  seedLotId: string;
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
  pestDetected: boolean;
  pestName?: string;
  environmentalNotes?: string;
  inspectionDate: string;
  photoDataUrl?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export interface FieldInspectionRow {
  id: string;
  seed_lot_id: string;
  health_score: number;
  disease_detected: boolean;
  disease_name: string | null;
  pest_detected: boolean;
  pest_name: string | null;
  environmental_notes: string | null;
  inspection_date: string;
  recorded_by: string;
  photo_data_url: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
}

export async function submitFieldInspection(token: string, payload: RecordFieldInspectionPayload): Promise<FieldInspectionRow> {
  return request('/production/field-inspections', token, { method: 'POST', body: JSON.stringify(payload) });
}

export async function registerPushToken(token: string, expoPushToken: string, platform: string): Promise<void> {
  await request('/push-notifications/register', token, {
    method: 'POST',
    body: JSON.stringify({ expoPushToken, platform }),
  });
}
