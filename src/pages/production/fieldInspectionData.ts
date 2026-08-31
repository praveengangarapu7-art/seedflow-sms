import type { FieldAiPrediction, FieldInspection } from '@/services/api';

export const cropStageOptions = [
  'Sowing',
  'Germination',
  'Vegetative',
  'Flowering',
  'Pollination',
  'Seed Development',
  'Maturity',
  'Harvest',
] as const;

export type CropStage = (typeof cropStageOptions)[number];

export type HealthTier = 'Good' | 'Moderate' | 'Poor';

export function healthTier(score: number): HealthTier {
  if (score > 80) return 'Good';
  if (score >= 60) return 'Moderate';
  return 'Poor';
}

export function healthScoreClass(score: number): string {
  return `health${healthTier(score)}`;
}

const PEST_LIBRARY = ['Aphids', 'Whitefly', 'Stem Borer', 'Leaf Miner', 'Thrips', 'Fruit Borer', 'Armyworm', 'Mealybug'];
const NUTRIENT_LIBRARY = [
  'Nitrogen deficiency',
  'Potassium deficiency',
  'Phosphorus deficiency',
  'Zinc deficiency',
  'Iron deficiency (chlorosis)',
];

export function generateAiPrediction(input: {
  healthScore: number;
  diseaseDetected: boolean;
  diseaseName?: string;
}): FieldAiPrediction {
  const deficit = 100 - input.healthScore;
  const diseaseRiskPercent = Math.min(96, Math.max(4, Math.round((input.diseaseDetected ? 50 : 8) + deficit * 0.55)));

  const pestCount = input.healthScore < 50 ? 2 : input.healthScore < 70 ? 1 : 0;
  const pestsDetected = Array.from(
    { length: pestCount },
    (_, index) => PEST_LIBRARY[(Math.floor(input.healthScore) + index * 3) % PEST_LIBRARY.length],
  );

  const nutrientDeficiency = input.healthScore < 65
    ? NUTRIENT_LIBRARY[Math.floor(input.healthScore) % NUTRIENT_LIBRARY.length]
    : undefined;

  const recommendations: string[] = [];
  if (input.diseaseDetected) {
    recommendations.push(`Apply targeted treatment for ${input.diseaseName || 'the detected disease'} and isolate affected plants.`);
  }
  if (diseaseRiskPercent >= 50) {
    recommendations.push('Schedule a follow-up inspection within 5-7 days to monitor disease progression.');
  }
  if (pestsDetected.length > 0) {
    recommendations.push(`Monitor for ${pestsDetected.join(', ')} and consider need-based pesticide application.`);
  }
  if (nutrientDeficiency) {
    recommendations.push(`Correct ${nutrientDeficiency.toLowerCase()} with a foliar spray or soil amendment.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Crop is healthy — continue routine monitoring and irrigation schedule.');
  }

  return { diseaseRiskPercent, pestsDetected, nutrientDeficiency, recommendations };
}

export const seedFieldInspections: FieldInspection[] = [
  {
    id: 'finsp-1', inspectionCode: 'FI-2026-001', farmId: 'farm-1', cropStage: 'Vegetative', inspectorName: 'Anitha Rao',
    healthScore: 88, diseaseDetected: false, notes: 'Uniform canopy growth, no visible stress.',
    photos: ['leaf-canopy-1.jpg'], inspectionDate: '2026-07-02',
    aiPrediction: generateAiPrediction({ healthScore: 88, diseaseDetected: false }),
  },
  {
    id: 'finsp-2', inspectionCode: 'FI-2026-002', farmId: 'farm-1', cropStage: 'Flowering', inspectorName: 'Anitha Rao',
    healthScore: 62, diseaseDetected: true, diseaseName: 'Bacterial Leaf Blight',
    notes: 'Yellowing streaks observed on lower leaves near the field bund.',
    photos: ['leaf-blight-1.jpg', 'leaf-blight-2.jpg'], inspectionDate: '2026-07-20',
    aiPrediction: generateAiPrediction({ healthScore: 62, diseaseDetected: true, diseaseName: 'Bacterial Leaf Blight' }),
  },
  {
    id: 'finsp-3', inspectionCode: 'FI-2026-003', farmId: 'farm-3', cropStage: 'Germination', inspectorName: 'Vikram Singh',
    healthScore: 94, diseaseDetected: false, notes: 'Excellent germination rate, even spacing.',
    photos: [], inspectionDate: '2026-03-05',
    aiPrediction: generateAiPrediction({ healthScore: 94, diseaseDetected: false }),
  },
  {
    id: 'finsp-4', inspectionCode: 'FI-2026-004', farmId: 'farm-4', cropStage: 'Maturity', inspectorName: 'Divya Menon',
    healthScore: 48, diseaseDetected: true, diseaseName: 'Cotton Boll Rot',
    notes: 'Rot observed on bolls in the low-lying section of the field after recent rain.',
    photos: ['boll-rot-1.jpg'], inspectionDate: '2026-08-01',
    aiPrediction: generateAiPrediction({ healthScore: 48, diseaseDetected: true, diseaseName: 'Cotton Boll Rot' }),
  },
  {
    id: 'finsp-5', inspectionCode: 'FI-2026-005', farmId: 'farm-5', cropStage: 'Pollination', inspectorName: 'Vikram Singh',
    healthScore: 71, diseaseDetected: false, notes: 'Minor leaf curling, likely heat stress; irrigation advised.',
    photos: [], inspectionDate: '2026-04-18',
    aiPrediction: generateAiPrediction({ healthScore: 71, diseaseDetected: false }),
  },
  {
    id: 'finsp-6', inspectionCode: 'FI-2026-006', farmId: 'farm-6', cropStage: 'Seed Development', inspectorName: 'Divya Menon',
    healthScore: 83, diseaseDetected: false, notes: 'Healthy fruit set, no pest activity observed.',
    photos: ['fruit-set-1.jpg'], inspectionDate: '2026-03-28',
    aiPrediction: generateAiPrediction({ healthScore: 83, diseaseDetected: false }),
  },
];
