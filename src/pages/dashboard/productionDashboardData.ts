import type { ProductionDashboardData } from '@/services/api';
import { seedCropPlans, seedFarmers, seedFarms } from '@/pages/production/cropPlanningData';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function statusGroup(status: string): 'Planned' | 'In Progress' | 'Completed' | 'Cancelled' {
  if (status === 'Planned') return 'Planned';
  if (status === 'Sown' || status === 'Growing') return 'In Progress';
  if (status === 'Harvested') return 'Completed';
  return 'Cancelled';
}

function buildFallbackDashboard(): ProductionDashboardData {
  const activePlans = seedCropPlans.filter((plan) => plan.status !== 'Cancelled');

  const plannedFarmIds = new Set(activePlans.map((plan) => plan.farmId));
  const totalPlannedArea = seedFarms
    .filter((farm) => plannedFarmIds.has(farm.id))
    .reduce((sum, farm) => sum + (farm.area ?? 0), 0);

  const totalHarvestTarget = activePlans.reduce((sum, plan) => sum + (plan.targetYield ?? 0), 0);

  const statusCounts = new Map<string, number>();
  seedCropPlans.forEach((plan) => {
    const group = statusGroup(plan.status);
    statusCounts.set(group, (statusCounts.get(group) ?? 0) + 1);
  });
  const statusBreakdown = ['Planned', 'In Progress', 'Completed', 'Cancelled']
    .filter((status) => (statusCounts.get(status) ?? 0) > 0)
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0 }));

  const cropCounts = new Map<string, number>();
  seedCropPlans.forEach((plan) => {
    cropCounts.set(plan.crop, (cropCounts.get(plan.crop) ?? 0) + 1);
  });
  const cropDistribution = Array.from(cropCounts.entries()).map(([crop, count]) => ({ crop, count }));

  const monthlyProgress = MONTH_LABELS.map((month, index) => {
    const monthNumber = index + 1;
    let target = 0;
    let actual = 0;
    activePlans.forEach((plan) => {
      if (!plan.harvestDate) return;
      const harvestMonth = new Date(plan.harvestDate).getMonth() + 1;
      if (harvestMonth !== monthNumber) return;
      target += plan.targetYield ?? 0;
      if (plan.status === 'Harvested') {
        actual += plan.targetYield ?? 0;
      }
    });
    return { month, target, actual };
  });

  return {
    totalFarmers: seedFarmers.length,
    activeFarms: seedFarms.length,
    totalPlannedArea,
    totalHarvestTarget,
    statusBreakdown,
    cropDistribution,
    monthlyProgress,
  };
}

export const fallbackProductionDashboard: ProductionDashboardData = buildFallbackDashboard();

// Fixed hue-per-crop assignment (identity encoding) — validated for adjacent-pair
// CVD separation via the dataviz skill's validator. Colors are tied to the crop
// name, not its position, so they stay stable if the data set is filtered/reordered.
export const CROP_COLORS: Record<string, string> = {
  Paddy: '#2a78d6',
  Maize: '#eb6834',
  Cotton: '#1baf7a',
  Groundnut: '#eda100',
  Tomato: '#e87ba4',
};

export const FALLBACK_CROP_COLOR = '#94A3AB';

// Status is a state, not an identity — uses the app's reserved semantic tokens
// rather than the categorical crop palette, so a status color never impersonates a series.
export const STATUS_META: Record<string, { color: string; icon: 'clock' | 'sprout' | 'check' | 'x' }> = {
  Planned: { color: '#2D7A8F', icon: 'clock' },
  'In Progress': { color: '#e6bc42', icon: 'sprout' },
  Completed: { color: '#2E8B5C', icon: 'check' },
  Cancelled: { color: '#C0392B', icon: 'x' },
};
