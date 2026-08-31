import { describe, expect, it } from 'vitest';
import { evaluateSubsidyEligibility } from '../../src/modules/govPrograms/subsidyEligibility';

function baseInput() {
  return {
    programCrop: 'Paddy',
    programMinStage: 'Certified',
    programRequiresGovernmentRegistration: false,
    programMaxQuantityPerFarmer: null as number | null,
    programEligibleRegions: null as string[] | null,
    lotCrop: 'Paddy',
    lotStage: 'Certified',
    lotHasApprovedRegistration: false,
    farmerRegion: 'North Valley',
    requestedQuantity: 10,
    farmerPriorClaimedQuantity: 0,
  };
}

describe('subsidyEligibility.evaluateSubsidyEligibility', () => {
  it('is eligible when every criterion matches', () => {
    expect(evaluateSubsidyEligibility(baseInput())).toEqual({ eligible: true, reasons: [] });
  });

  it('rejects a crop mismatch', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), lotCrop: 'Wheat' });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/only covers Paddy/);
  });

  it('allows any crop when the program has no crop restriction', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programCrop: null, lotCrop: 'Wheat' });
    expect(result.eligible).toBe(true);
  });

  it('rejects a lot below the minimum stage', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), lotStage: 'Foundation' });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/requires at least Certified-stage/);
  });

  it('allows a lot at exactly the minimum stage', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programMinStage: 'Foundation', lotStage: 'Foundation' });
    expect(result.eligible).toBe(true);
  });

  it('allows a lot above the minimum stage', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programMinStage: 'Foundation', lotStage: 'Certified' });
    expect(result.eligible).toBe(true);
  });

  it('allows any stage when the program has no minimum-stage restriction', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programMinStage: null, lotStage: 'Breeder' });
    expect(result.eligible).toBe(true);
  });

  it('rejects when government registration is required but the lot lacks one', () => {
    const result = evaluateSubsidyEligibility({
      ...baseInput(),
      programRequiresGovernmentRegistration: true,
      lotHasApprovedRegistration: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/requires an approved government registration/);
  });

  it('allows when government registration is required and the lot has one', () => {
    const result = evaluateSubsidyEligibility({
      ...baseInput(),
      programRequiresGovernmentRegistration: true,
      lotHasApprovedRegistration: true,
    });
    expect(result.eligible).toBe(true);
  });

  it('rejects a farmer outside the eligible regions', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programEligibleRegions: ['South Coast'], farmerRegion: 'North Valley' });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/not available in North Valley/);
  });

  it('allows any region when the program has an empty eligible-regions list', () => {
    const result = evaluateSubsidyEligibility({ ...baseInput(), programEligibleRegions: [] });
    expect(result.eligible).toBe(true);
  });

  it('rejects a claim that would push the farmer over their per-program cap', () => {
    const result = evaluateSubsidyEligibility({
      ...baseInput(),
      programMaxQuantityPerFarmer: 100,
      farmerPriorClaimedQuantity: 95,
      requestedQuantity: 10,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/exceeds the per-farmer limit/);
    // Anchored on the parenthesis so a broken "remaining" calculation (e.g.
    // adding instead of subtracting, which would read "195 remaining of
    // 100") can't accidentally satisfy a loose substring match — "195
    // remaining of 100" literally contains "5 remaining of 100" too.
    expect(result.reasons[0]).toContain('(5 remaining of 100)');
  });

  it('allows a claim landing exactly at the per-program cap', () => {
    const result = evaluateSubsidyEligibility({
      ...baseInput(),
      programMaxQuantityPerFarmer: 100,
      farmerPriorClaimedQuantity: 90,
      requestedQuantity: 10,
    });
    expect(result.eligible).toBe(true);
  });

  it('accumulates every failing reason, not just the first', () => {
    const result = evaluateSubsidyEligibility({
      ...baseInput(),
      lotCrop: 'Wheat',
      lotStage: 'Breeder',
      programRequiresGovernmentRegistration: true,
      programEligibleRegions: ['South Coast'],
      programMaxQuantityPerFarmer: 5,
      farmerPriorClaimedQuantity: 0,
      requestedQuantity: 10,
    });
    expect(result.reasons).toHaveLength(5);
  });
});
