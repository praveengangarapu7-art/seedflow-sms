// Pure logic — zero DB imports, same reasoning as registrationEligibility.ts.
// The service layer fetches the program/lot/farmer rows and prior-claims
// total, then hands them to this function so the actual eligibility RULES
// are unit- (and mutation-) testable independent of the database.

const STAGE_ORDER = ['Breeder', 'Foundation', 'Certified'] as const;

export interface SubsidyEligibilityInput {
  programCrop: string | null;
  programMinStage: string | null;
  programRequiresGovernmentRegistration: boolean;
  programMaxQuantityPerFarmer: number | null;
  programEligibleRegions: string[] | null | undefined;
  lotCrop: string;
  lotStage: string;
  lotHasApprovedRegistration: boolean;
  farmerRegion: string;
  requestedQuantity: number;
  farmerPriorClaimedQuantity: number;
}

export interface SubsidyEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function evaluateSubsidyEligibility(input: SubsidyEligibilityInput): SubsidyEligibilityResult {
  const reasons: string[] = [];

  if (input.programCrop !== null && input.programCrop !== input.lotCrop) {
    reasons.push(`This program only covers ${input.programCrop}, not ${input.lotCrop}`);
  }

  {
    // STAGE_ORDER.indexOf(null) is -1, which no real stage index is ever
    // below — so a program with no minimum stage naturally never rejects
    // anything here, with no separate branch needed for that case.
    const lotIndex = STAGE_ORDER.indexOf(input.lotStage as (typeof STAGE_ORDER)[number]);
    const minIndex = STAGE_ORDER.indexOf(input.programMinStage as (typeof STAGE_ORDER)[number]);
    if (lotIndex < minIndex) {
      reasons.push(`This program requires at least ${input.programMinStage}-stage seed, but the lot is ${input.lotStage}`);
    }
  }

  if (input.programRequiresGovernmentRegistration && !input.lotHasApprovedRegistration) {
    reasons.push('This program requires an approved government registration for the seed lot');
  }

  if (input.programEligibleRegions && input.programEligibleRegions.length > 0 && !input.programEligibleRegions.includes(input.farmerRegion)) {
    reasons.push(`This program is not available in ${input.farmerRegion}`);
  }

  if (input.programMaxQuantityPerFarmer !== null) {
    const totalAfterThisClaim = input.farmerPriorClaimedQuantity + input.requestedQuantity;
    if (totalAfterThisClaim > input.programMaxQuantityPerFarmer) {
      const remaining = Math.max(0, input.programMaxQuantityPerFarmer - input.farmerPriorClaimedQuantity);
      reasons.push(`Claim exceeds the per-farmer limit for this program (${remaining} remaining of ${input.programMaxQuantityPerFarmer})`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}
