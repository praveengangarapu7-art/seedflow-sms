/**
 * The exact byte string a certificate's signature is computed over. Zero
 * imports (no db, no pool) by design — this is shared, unmodified, between
 * authenticity.service.ts (which signs it against a DB-issued certificate)
 * and scripts/verifyLotCertificate.ts (a fully offline verifier). Both must
 * derive the identical string from the same fields, or a signature that's
 * genuinely valid would fail to reproduce outside the app that issued it.
 */
export interface CertificateSigningInput {
  certificateNumber: string;
  seedLotId: string;
  chainLength: number;
  latestHash: string;
  issuedAt: string;
}

export function buildCertificateSigningMessage(input: CertificateSigningInput): string {
  return JSON.stringify(input);
}
