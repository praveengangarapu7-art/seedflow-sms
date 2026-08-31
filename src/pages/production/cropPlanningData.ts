import type { Crop, CropPlan, Farm, Farmer, SeedVariety } from '@/services/api';

export const cropPlanStatusOptions = ['Planned', 'Sown', 'Growing', 'Harvested', 'Cancelled'] as const;

export type CropPlanStatus = (typeof cropPlanStatusOptions)[number];

export const seedFarmers: Farmer[] = [
  { id: 'farmer-1', name: 'Ramu Naidu', location: 'Guntur, Andhra Pradesh', phone: '9876543210', kycVerified: true },
  { id: 'farmer-2', name: 'Suresh Reddy', location: 'Warangal, Telangana', phone: '9876543211', kycVerified: true },
  { id: 'farmer-3', name: 'Kavita Devi', location: 'Nashik, Maharashtra', phone: '9876543212', kycVerified: true },
  { id: 'farmer-4', name: 'Manoj Yadav', location: 'Kanpur, Uttar Pradesh', phone: '9876543213', kycVerified: false },
  { id: 'farmer-5', name: 'Lakshmi Iyer', location: 'Coimbatore, Tamil Nadu', phone: '9876543214', kycVerified: true },
];

export const seedFarms: Farm[] = [
  {
    id: 'farm-1', farmerId: 'farmer-1', name: "Ramu's North Field", location: 'Guntur, Andhra Pradesh', area: 5.5,
    currentCrop: 'Paddy', soilType: 'Loamy', irrigationType: 'Drip', gpsCoordinates: '16.3067, 80.4365',
  },
  {
    id: 'farm-2', farmerId: 'farmer-1', name: "Ramu's South Field", location: 'Guntur, Andhra Pradesh', area: 3.2,
    soilType: 'Clay', irrigationType: 'Flood', gpsCoordinates: '16.2995, 80.4432',
  },
  {
    id: 'farm-3', farmerId: 'farmer-2', name: 'Reddy Farm A', location: 'Warangal, Telangana', area: 8,
    currentCrop: 'Maize', soilType: 'Black Cotton', irrigationType: 'Sprinkler', gpsCoordinates: '17.9784, 79.5941',
  },
  {
    id: 'farm-4', farmerId: 'farmer-3', name: 'Kavita Vineyard Plot', location: 'Nashik, Maharashtra', area: 4,
    currentCrop: 'Cotton', soilType: 'Sandy', irrigationType: 'Drip', gpsCoordinates: '19.9975, 73.7898',
  },
  {
    id: 'farm-5', farmerId: 'farmer-4', name: 'Yadav Family Farm', location: 'Kanpur, Uttar Pradesh', area: 6,
    currentCrop: 'Groundnut', soilType: 'Silty', irrigationType: 'Rainfed', gpsCoordinates: '26.4499, 80.3319',
  },
  {
    id: 'farm-6', farmerId: 'farmer-5', name: 'Iyer Estate', location: 'Coimbatore, Tamil Nadu', area: 2.5,
    currentCrop: 'Tomato', soilType: 'Red Soil', irrigationType: 'Sprinkler', gpsCoordinates: '11.0168, 76.9558',
  },
];

export const seedCrops: Crop[] = [
  { id: 'crop-1', name: 'Paddy', category: 'Food Grain', season: 'Kharif', active: true },
  { id: 'crop-2', name: 'Maize', category: 'Food Grain', season: 'Rabi', active: true },
  { id: 'crop-3', name: 'Cotton', category: 'Cash Crop', season: 'Kharif', active: true },
  { id: 'crop-4', name: 'Groundnut', category: 'Oilseed', season: 'Summer', active: true },
  { id: 'crop-5', name: 'Tomato', category: 'Vegetable', season: 'Year-round', active: true },
];

export const seedVarieties: SeedVariety[] = [
  { id: 'variety-1', name: 'Paddy-1010', crop: 'Paddy' },
  { id: 'variety-2', name: 'Maize-Hybrid-22', crop: 'Maize' },
  { id: 'variety-3', name: 'Cotton-BT-5', crop: 'Cotton' },
  { id: 'variety-4', name: 'Groundnut-TG-37', crop: 'Groundnut' },
  { id: 'variety-5', name: 'Tomato-Hybrid-9', crop: 'Tomato' },
];

export const seedCropPlans: CropPlan[] = [
  {
    id: 'plan-1', planCode: 'CP-2026-001', farmerId: 'farmer-1', farmId: 'farm-1', varietyId: 'variety-1',
    crop: 'Paddy', season: 'Kharif', targetYield: 4500, sowingDate: '2026-06-15', harvestDate: '2026-10-20', status: 'Growing',
  },
  {
    id: 'plan-2', planCode: 'CP-2026-002', farmerId: 'farmer-2', farmId: 'farm-3', varietyId: 'variety-2',
    crop: 'Maize', season: 'Rabi', targetYield: 6000, sowingDate: '2026-01-10', harvestDate: '2026-04-15', status: 'Harvested',
  },
  {
    id: 'plan-3', planCode: 'CP-2026-003', farmerId: 'farmer-3', farmId: 'farm-4', varietyId: 'variety-3',
    crop: 'Cotton', season: 'Kharif', targetYield: 3000, sowingDate: '2026-06-01', harvestDate: '2026-11-30', status: 'Planned',
  },
  {
    id: 'plan-4', planCode: 'CP-2026-004', farmerId: 'farmer-4', farmId: 'farm-5', varietyId: 'variety-4',
    crop: 'Groundnut', season: 'Summer', targetYield: 2500, sowingDate: '2026-03-05', harvestDate: '2026-06-10', status: 'Sown',
  },
  {
    id: 'plan-5', planCode: 'CP-2026-005', farmerId: 'farmer-5', farmId: 'farm-6', varietyId: 'variety-5',
    crop: 'Tomato', season: 'Year-round', targetYield: 8000, sowingDate: '2026-02-01', harvestDate: '2026-05-15', status: 'Cancelled',
  },
];

export function recommendedSeasonForCrop(cropName: string, crops: Crop[]): string | undefined {
  return crops.find((crop) => crop.name.toLowerCase() === cropName.toLowerCase())?.season;
}

export function daysBetween(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function statusBadgeClass(status: string): string {
  return `status${status.replace(/\s+/g, '')}`;
}
