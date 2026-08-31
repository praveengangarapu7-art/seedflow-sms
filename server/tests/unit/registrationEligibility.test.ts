import { describe, expect, it } from 'vitest';
import { evaluateRegistrationEligibility } from '../../src/modules/govPrograms/registrationEligibility';

function baseInput() {
  return { stage: 'Certified', hasValidPhytosanitaryCertificate: true, germinationAveragePercent: 90 };
}

describe('registrationEligibility.evaluateRegistrationEligibility', () => {
  it('auto-approves a Certified lot with a valid phyto certificate and germination above the threshold', () => {
    const result = evaluateRegistrationEligibility(baseInput());
    expect(result).toEqual({ autoApprove: true, reasons: [] });
  });

  it('rejects auto-approval for a non-Certified lot', () => {
    const result = evaluateRegistrationEligibility({ ...baseInput(), stage: 'Foundation' });
    expect(result.autoApprove).toBe(false);
    expect(result.reasons).toEqual(['Only Certified-stage lots are eligible for automatic registration approval']);
  });

  it('rejects auto-approval without a valid phytosanitary certificate', () => {
    const result = evaluateRegistrationEligibility({ ...baseInput(), hasValidPhytosanitaryCertificate: false });
    expect(result.autoApprove).toBe(false);
    expect(result.reasons).toContain('No valid (non-expired, non-revoked) phytosanitary certificate on file');
  });

  it('rejects auto-approval when no germination test has been recorded', () => {
    const result = evaluateRegistrationEligibility({ ...baseInput(), germinationAveragePercent: null });
    expect(result.autoApprove).toBe(false);
    expect(result.reasons).toContain('No germination test results recorded');
  });

  it('passes at exactly the 85% germination threshold', () => {
    const result = evaluateRegistrationEligibility({ ...baseInput(), germinationAveragePercent: 85 });
    expect(result.autoApprove).toBe(true);
  });

  it('fails just below the 85% germination threshold', () => {
    const result = evaluateRegistrationEligibility({ ...baseInput(), germinationAveragePercent: 84.9 });
    expect(result.autoApprove).toBe(false);
    expect(result.reasons[0]).toMatch(/below the 85% threshold/);
  });

  it('accumulates every failing reason, not just the first', () => {
    const result = evaluateRegistrationEligibility({
      stage: 'Breeder',
      hasValidPhytosanitaryCertificate: false,
      germinationAveragePercent: null,
    });
    expect(result.reasons).toHaveLength(3);
  });
});
