import { describe, expect, it } from 'vitest';
import { GENESIS_HASH, canonicalize, computeRecordHash, verifyChain, type HashChainLink } from '../../src/modules/authenticity/hashChain';

function link(overrides: Partial<HashChainLink> = {}): HashChainLink {
  return {
    seedLotId: 'lot-1',
    sequenceNumber: 1,
    eventType: 'CREATE',
    snapshot: { lotCode: 'SL-001' },
    previousHash: GENESIS_HASH,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('hashChain.canonicalize', () => {
  it('produces identical output regardless of key insertion order', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });

  it('sorts keys of nested objects too', () => {
    expect(canonicalize({ outer: { z: 1, a: 2 } })).toBe(canonicalize({ outer: { a: 2, z: 1 } }));
  });

  it('preserves array order (arrays are not sorted)', () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it('renders an array as comma-joined bracketed elements, distinct from an object', () => {
    expect(canonicalize([1, 2, 3])).toBe('[1,2,3]');
    expect(canonicalize({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  // Regression test: pg returns timestamptz columns as JS Date instances,
  // not strings. Date has no own enumerable keys, so treating it like a
  // plain object canonicalizes it as `{}` — silently discarding the value
  // and making the hash computed at write time (Date instance) diverge from
  // the hash recomputed after a JSONB round-trip (ISO string). This broke
  // every single chain entry's integrity check until fixed.
  it('canonicalizes a Date the same way JSON.stringify would (via toJSON), not as an empty object', () => {
    const date = new Date('2026-08-10T18:30:00.000Z');
    expect(canonicalize(date)).toBe(JSON.stringify(date.toISOString()));
    expect(canonicalize(date)).not.toBe('{}');
  });

  it('canonicalizes a snapshot with Date fields identically to its JSON-round-tripped (string-dated) form', () => {
    const withDate = { productionDate: new Date('2026-08-10T18:30:00.000Z'), lotCode: 'SL-001' };
    const roundTripped = JSON.parse(JSON.stringify(withDate));
    expect(canonicalize(withDate)).toBe(canonicalize(roundTripped));
  });

  it('treats null and undefined distinctly from omission', () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });
});

describe('hashChain.computeRecordHash', () => {
  it('is deterministic for the same input', () => {
    const a = computeRecordHash(link());
    const b = computeRecordHash(link());
    expect(a).toBe(b);
  });

  it('produces a 64-character hex digest (SHA-256)', () => {
    expect(computeRecordHash(link())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes if the snapshot changes', () => {
    const a = computeRecordHash(link({ snapshot: { lotCode: 'SL-001' } }));
    const b = computeRecordHash(link({ snapshot: { lotCode: 'SL-002' } }));
    expect(a).not.toBe(b);
  });

  it('changes if the previousHash changes', () => {
    const a = computeRecordHash(link({ previousHash: GENESIS_HASH }));
    const b = computeRecordHash(link({ previousHash: 'a'.repeat(64) }));
    expect(a).not.toBe(b);
  });

  it('changes if the sequenceNumber changes', () => {
    const a = computeRecordHash(link({ sequenceNumber: 1 }));
    const b = computeRecordHash(link({ sequenceNumber: 2 }));
    expect(a).not.toBe(b);
  });

  it('changes if the eventType changes', () => {
    const a = computeRecordHash(link({ eventType: 'CREATE' }));
    const b = computeRecordHash(link({ eventType: 'UPDATE' }));
    expect(a).not.toBe(b);
  });
});

describe('hashChain.verifyChain', () => {
  it('validates a correctly-built two-entry chain', () => {
    const entry1 = link({ sequenceNumber: 1, previousHash: GENESIS_HASH });
    const hash1 = computeRecordHash(entry1);
    const entry2 = link({ sequenceNumber: 2, previousHash: hash1, snapshot: { lotCode: 'SL-001', status: 'updated' } });
    const hash2 = computeRecordHash(entry2);

    const result = verifyChain([
      { ...entry1, recordHash: hash1 },
      { ...entry2, recordHash: hash2 },
    ]);

    expect(result).toEqual({ valid: true, brokenAtSequence: null, reason: null });
  });

  it('rejects an empty-array trivially as valid (no entries to break)', () => {
    expect(verifyChain([])).toEqual({ valid: true, brokenAtSequence: null, reason: null });
  });

  it('detects a snapshot altered after the fact (recordHash no longer matches recomputed hash)', () => {
    const entry1 = link({ sequenceNumber: 1, previousHash: GENESIS_HASH });
    const hash1 = computeRecordHash(entry1);

    const tampered = { ...entry1, snapshot: { lotCode: 'TAMPERED' }, recordHash: hash1 };
    const result = verifyChain([tampered]);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(1);
    expect(result.reason).toMatch(/snapshot was altered/);
  });

  it('detects a missing/reordered link (previousHash does not match the prior entry\'s actual hash)', () => {
    const entry1 = link({ sequenceNumber: 1, previousHash: GENESIS_HASH });
    const hash1 = computeRecordHash(entry1);
    // entry2 claims a previousHash that doesn't match entry1's actual hash
    const entry2 = link({ sequenceNumber: 2, previousHash: 'f'.repeat(64) });
    const hash2 = computeRecordHash(entry2);

    const result = verifyChain([
      { ...entry1, recordHash: hash1 },
      { ...entry2, recordHash: hash2 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(2);
    expect(result.reason).toMatch(/reordered or a link is missing/);
  });

  it('detects the very first entry not chaining from GENESIS_HASH', () => {
    const entry1 = link({ sequenceNumber: 1, previousHash: 'b'.repeat(64) });
    const hash1 = computeRecordHash(entry1);
    const result = verifyChain([{ ...entry1, recordHash: hash1 }]);

    expect(result.valid).toBe(false);
    expect(result.brokenAtSequence).toBe(1);
  });

  it('sorts entries by sequenceNumber before verifying, regardless of input order', () => {
    const entry1 = link({ sequenceNumber: 1, previousHash: GENESIS_HASH });
    const hash1 = computeRecordHash(entry1);
    const entry2 = link({ sequenceNumber: 2, previousHash: hash1 });
    const hash2 = computeRecordHash(entry2);

    const result = verifyChain([
      { ...entry2, recordHash: hash2 }, // out of order on purpose
      { ...entry1, recordHash: hash1 },
    ]);

    expect(result.valid).toBe(true);
  });
});
