// Pure hash-chain logic — deliberately zero imports of pool/db or anything
// else in this app, so this exact file (or a copy of it) is what "verify
// without database access" actually runs on: given nothing but a chain
// exported as JSON, recompute every hash from scratch and confirm nothing
// was altered after the fact. See scripts/verifyLotCertificate.ts, which
// imports only this module (and signing.ts) to verify fully offline.
import { createHash } from 'crypto';

export const GENESIS_HASH = '0'.repeat(64);

export interface HashChainLink {
  seedLotId: string;
  sequenceNumber: number;
  eventType: string;
  snapshot: unknown;
  previousHash: string;
  createdAt: string;
}

/**
 * Deterministic JSON stringify — recursively sorts object keys so the same
 * logical data always canonicalizes to the same string regardless of
 * property insertion order. Without this, the same snapshot object could
 * hash differently depending on how it was constructed, which would make
 * independent recomputation (the whole point here) unreliable.
 */
export function canonicalize(value: unknown): string {
  // Mirrors native JSON.stringify's own toJSON-calling behavior. Without
  // this, a Date (e.g. a seed lot's created_at/production_date, which pg
  // returns as a Date instance, not a string) has no own enumerable keys
  // and would canonicalize as `{}` — silently different from the ISO
  // string that actually ends up in the JSONB snapshot column once stored,
  // guaranteeing every hash computed at write time mismatches on reverify.
  if (value !== null && typeof value === 'object' && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    return canonicalize((value as { toJSON: () => unknown }).toJSON());
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(',')}}`;
}

export function computeRecordHash(link: HashChainLink): string {
  const canonical = canonicalize({
    seedLotId: link.seedLotId,
    sequenceNumber: link.sequenceNumber,
    eventType: link.eventType,
    snapshot: link.snapshot,
    previousHash: link.previousHash,
    createdAt: link.createdAt,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export interface ChainVerificationResult {
  valid: boolean;
  brokenAtSequence: number | null;
  reason: string | null;
}

/**
 * Recomputes every link's hash from its own recorded fields and confirms
 * two things: (a) the computed hash matches the link's stored recordHash —
 * catching an altered snapshot — and (b) each link's previousHash matches
 * the PRECEDING link's actual recordHash — catching a reordered or removed
 * link. Either check alone would miss half of what tampering could do.
 */
export function verifyChain(entries: (HashChainLink & { recordHash: string })[]): ChainVerificationResult {
  const sorted = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  let expectedPreviousHash = GENESIS_HASH;

  for (const entry of sorted) {
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        brokenAtSequence: entry.sequenceNumber,
        reason: `Entry ${entry.sequenceNumber}'s previousHash does not match the prior entry's actual hash — the chain has been reordered or a link is missing.`,
      };
    }
    const recomputed = computeRecordHash(entry);
    if (recomputed !== entry.recordHash) {
      return {
        valid: false,
        brokenAtSequence: entry.sequenceNumber,
        reason: `Entry ${entry.sequenceNumber}'s stored data does not match its recorded hash — the snapshot was altered after the fact.`,
      };
    }
    expectedPreviousHash = entry.recordHash;
  }

  return { valid: true, brokenAtSequence: null, reason: null };
}
