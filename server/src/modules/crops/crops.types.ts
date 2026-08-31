export const CROP_CATEGORIES = ['Food Grain', 'Cash Crop', 'Oilseed', 'Vegetable', 'Pulse', 'Fibre Crop'] as const;
export type CropCategory = (typeof CROP_CATEGORIES)[number];

export const CROP_SEASONS = ['Kharif', 'Rabi', 'Summer', 'Year-round', 'Winter'] as const;
export type CropSeason = (typeof CROP_SEASONS)[number];

export interface Crop {
  id: string;
  name: string;
  category: string;
  season: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCropInput {
  name: string;
  category: string;
  season: string;
  active?: boolean;
}

export interface UpdateCropInput {
  name?: string;
  category?: string;
  season?: string;
  active?: boolean;
}
