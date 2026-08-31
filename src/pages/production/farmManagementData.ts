import type { InspectionRecord } from '@/services/api';

export const soilTypeOptions = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Black Cotton', 'Red Soil'] as const;

export const irrigationTypeOptions = ['Drip', 'Flood', 'Sprinkler', 'Rainfed'] as const;

export const inspectionStatusOptions = ['Pending', 'Approved', 'Rejected'] as const;

export const seedInspections: InspectionRecord[] = [
  { id: 'insp-1', inspectionCode: 'INS-2026-001', farmId: 'farm-1', crop: 'Paddy', status: 'Approved', inspectionDate: '2026-07-01' },
  { id: 'insp-2', inspectionCode: 'INS-2026-002', farmId: 'farm-1', crop: 'Paddy', status: 'Pending', inspectionDate: '2026-09-15' },
  { id: 'insp-3', inspectionCode: 'INS-2026-003', farmId: 'farm-3', crop: 'Maize', status: 'Approved', inspectionDate: '2026-03-20' },
  { id: 'insp-4', inspectionCode: 'INS-2026-004', farmId: 'farm-4', crop: 'Cotton', status: 'Rejected', inspectionDate: '2026-08-05' },
  { id: 'insp-5', inspectionCode: 'INS-2026-005', farmId: 'farm-5', crop: 'Groundnut', status: 'Pending', inspectionDate: '2026-05-10' },
  { id: 'insp-6', inspectionCode: 'INS-2026-006', farmId: 'farm-6', crop: 'Tomato', status: 'Approved', inspectionDate: '2026-04-02' },
];

export interface GpsPoint {
  lat: number;
  lng: number;
}

export function parseGpsCoordinates(gpsCoordinates?: string): GpsPoint | null {
  if (!gpsCoordinates) return null;
  const parts = gpsCoordinates.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((value) => Number.isNaN(value))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function googleMapsUrl(point: GpsPoint): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
}
