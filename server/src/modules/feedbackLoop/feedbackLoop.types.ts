export interface RecordLotFieldInspectionInput {
  seedLotId: string;
  farmerId?: string;
  seedRequestId?: string;
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
  pestDetected?: boolean;
  pestName?: string;
  environmentalNotes?: string;
  inspectionDate: string;
  // Captured by the mobile field-ops app; both optional since a web/desktop
  // submission has neither a camera nor a GPS fix to attach.
  photoDataUrl?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export interface LotFieldInspectionRow {
  id: string;
  seed_lot_id: string;
  farmer_id: string | null;
  seed_request_id: string | null;
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

export type PerformanceRating = 'high' | 'moderate' | 'low' | 'insufficient_data';

export interface LotPerformanceEntry {
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
  avgGerminationRate: number | null;
  performanceRating: PerformanceRating;
}

export interface BreederPerformanceEntry {
  breederOrganizationId: string;
  breederOrganizationName: string;
  lotCount: number;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
  avgGerminationRate: number | null;
}

export interface EnvironmentalAdaptationEntry {
  crop: string;
  variety: string;
  region: string;
  inspectionCount: number;
  avgHealthScore: number | null;
  diseaseIncidenceRate: number | null;
}
