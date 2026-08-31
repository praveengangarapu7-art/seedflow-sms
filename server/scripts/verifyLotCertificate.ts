// Fully offline authenticity verifier — the concrete proof of "verify a
// seed lot's authenticity without database access." It imports ONLY
// hashChain.ts, signing.ts, and certificateMessage.ts (all zero-dependency,
// no pool/db import anywhere in their import graph) plus Node's own `fs`.
// Given nothing but a certificate bundle exported as JSON (what a QR code
// links to, or a "download certificate" button produces), it recomputes the
// entire hash chain and the signature from scratch — no network call, no
// database connection, no trust in whatever server issued the bundle.
//
// Usage: tsx scripts/verifyLotCertificate.ts <path-to-certificate-bundle.json>
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { buildCertificateSigningMessage } from '../src/modules/authenticity/certificateMessage';
import { verifyChain, type HashChainLink } from '../src/modules/authenticity/hashChain';
import { verifySignature } from '../src/modules/authenticity/signing';

interface CertificateBundle {
  certificateNumber: string;
  seedLotId: string;
  lotCode: string;
  crop: string;
  variety: string;
  chain: {
    sequenceNumber: number;
    eventType: string;
    snapshot: unknown;
    previousHash: string;
    recordHash: string;
    createdAt: string;
  }[];
  chainLength: number;
  latestHash: string;
  signature: string;
  signingKeyFingerprint: string;
  publicKeyPem: string;
  issuedAt: string;
  issuedBy: string;
  revoked: boolean;
}

export interface OfflineVerificationResult {
  authentic: boolean;
  chainValid: boolean;
  signatureValid: boolean;
  revoked: boolean;
  brokenAtSequence: number | null;
  reason: string | null;
  certificateNumber: string;
  lotCode: string;
  crop: string;
  variety: string;
  chainLength: number;
}

/** Same three checks as authenticity.service.ts's verifyByCertificateId — reimplemented here against a plain JSON object instead of database rows, so this function has no way to reach a database even by accident. */
export function verifyCertificateBundle(bundle: CertificateBundle): OfflineVerificationResult {
  const links: (HashChainLink & { recordHash: string })[] = bundle.chain.map((c) => ({
    seedLotId: bundle.seedLotId,
    sequenceNumber: c.sequenceNumber,
    eventType: c.eventType,
    snapshot: c.snapshot,
    previousHash: c.previousHash,
    createdAt: c.createdAt,
    recordHash: c.recordHash,
  }));
  const chainCheck = verifyChain(links);

  const message = buildCertificateSigningMessage({
    certificateNumber: bundle.certificateNumber,
    seedLotId: bundle.seedLotId,
    chainLength: bundle.chainLength,
    latestHash: bundle.latestHash,
    issuedAt: bundle.issuedAt,
  });
  const signatureValid = verifySignature(message, bundle.signature, bundle.publicKeyPem);

  return {
    authentic: chainCheck.valid && signatureValid && !bundle.revoked,
    chainValid: chainCheck.valid,
    signatureValid,
    revoked: bundle.revoked,
    brokenAtSequence: chainCheck.brokenAtSequence,
    reason: chainCheck.reason,
    certificateNumber: bundle.certificateNumber,
    lotCode: bundle.lotCode,
    crop: bundle.crop,
    variety: bundle.variety,
    chainLength: bundle.chainLength,
  };
}

function main(): void {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error('Usage: tsx scripts/verifyLotCertificate.ts <path-to-certificate-bundle.json>');
    process.exit(1);
  }

  const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8')) as CertificateBundle;
  const result = verifyCertificateBundle(bundle);

  console.log(`Certificate:  ${result.certificateNumber}`);
  console.log(`Seed lot:     ${result.lotCode} (${result.crop} / ${result.variety})`);
  console.log(`Chain length: ${result.chainLength}`);
  console.log(`Chain valid:      ${result.chainValid}`);
  console.log(`Signature valid:  ${result.signatureValid}`);
  console.log(`Revoked:          ${result.revoked}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  console.log(`\n${result.authentic ? 'AUTHENTIC' : 'NOT AUTHENTIC'}`);

  process.exit(result.authentic ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
