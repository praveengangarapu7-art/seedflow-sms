// Pure logic — zero DB imports, mirroring hashChain.ts/partnerScoring.ts's
// separation of decision logic from data fetching. There's no real
// government system to submit to, so "auto-submit" is modeled honestly:
// a deterministic check runs at submission time, and only lots that
// already meet baseline regulatory requirements are auto-approved: a
// draft short on paperwork instead sits at "under_review" for an
// Inspector/Admin to decide manually, the same as a real authority would.

export interface RegistrationEligibilityInput {
  stage: string;
  hasValidPhytosanitaryCertificate: boolean;
  germinationAveragePercent: number | null;
}

export interface RegistrationEligibilityResult {
  autoApprove: boolean;
  reasons: string[];
}

// Same 85% bar labTesting.validation.ts's isPassingResult uses for a
// germination test to count as "passing" — reused here so the registration
// gate and the lab-test pass/fail gate agree on what "good enough
// germination" means across the app.
const MIN_GERMINATION_PERCENT = 85;

export function evaluateRegistrationEligibility(input: RegistrationEligibilityInput): RegistrationEligibilityResult {
  const reasons: string[] = [];

  if (input.stage !== 'Certified') {
    reasons.push('Only Certified-stage lots are eligible for automatic registration approval');
  }
  if (!input.hasValidPhytosanitaryCertificate) {
    reasons.push('No valid (non-expired, non-revoked) phytosanitary certificate on file');
  }
  if (input.germinationAveragePercent === null) {
    reasons.push('No germination test results recorded');
  } else if (input.germinationAveragePercent < MIN_GERMINATION_PERCENT) {
    reasons.push(`Germination rate ${input.germinationAveragePercent}% is below the ${MIN_GERMINATION_PERCENT}% threshold`);
  }

  return { autoApprove: reasons.length === 0, reasons };
}
