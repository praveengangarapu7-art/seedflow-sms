import type { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { buildCertificateSigningMessage } from './certificateMessage';
import { GENESIS_HASH, computeRecordHash, verifyChain } from './hashChain';
import { generateSigningKeyPair, signMessage, verifySignature } from './signing';
import type {
  CertificateBundle,
  CertificateRow,
  HashChainEntryRow,
  HashChainEventType,
  SigningKeyRow,
  VerificationResult,
} from './authenticity.types';

type Queryable = Pool | PoolClient;

/**
 * Lazily creates the active signing key on first use rather than via a
 * migration, since key GENERATION needs Node's crypto, not plain SQL.
 * Storing the private key in this app's own database (not a KMS/HSM) is a
 * demo-scale simplification — see migration 037's comment.
 */
export async function getOrCreateActiveSigningKey(executor: Queryable = pool): Promise<SigningKeyRow> {
  const existing = await executor.query<SigningKeyRow>('SELECT * FROM signing_keys WHERE is_active = true LIMIT 1');
  if (existing.rows[0]) return existing.rows[0];

  const generated = generateSigningKeyPair();
  const result = await executor.query<SigningKeyRow>(
    `INSERT INTO signing_keys (algorithm, public_key_pem, private_key_pem, fingerprint)
     VALUES ('ed25519', $1, $2, $3)
     RETURNING *`,
    [generated.publicKeyPem, generated.privateKeyPem, generated.fingerprint],
  );
  return result.rows[0];
}

export async function getPublicKeyInfo(): Promise<{ algorithm: string; publicKeyPem: string; fingerprint: string }> {
  const key = await getOrCreateActiveSigningKey();
  return { algorithm: key.algorithm, publicKeyPem: key.public_key_pem, fingerprint: key.fingerprint };
}

/**
 * Appends one link to a seed lot's hash chain, INSIDE the same transaction
 * as the mutation that triggered it — unlike fire-and-forget hooks
 * elsewhere in this app (e.g. the genealogy view refresh), the chain IS the
 * tamper-evidence mechanism, so it can never be allowed to silently fail to
 * fire or land in a separate, unguaranteed transaction.
 */
export async function appendHashChainEntry(
  client: PoolClient,
  seedLotId: string,
  eventType: HashChainEventType,
  snapshot: unknown,
  user: AuthenticatedUser,
): Promise<HashChainEntryRow> {
  const lastEntryResult = await client.query<{ sequence_number: number; record_hash: string }>(
    'SELECT sequence_number, record_hash FROM seed_lot_hash_chain WHERE seed_lot_id = $1 ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE',
    [seedLotId],
  );
  const last = lastEntryResult.rows[0];
  const sequenceNumber = (last?.sequence_number ?? 0) + 1;
  const previousHash = last?.record_hash ?? GENESIS_HASH;
  const createdAt = new Date().toISOString();

  const recordHash = computeRecordHash({
    seedLotId,
    sequenceNumber,
    eventType,
    snapshot,
    previousHash,
    createdAt,
  });

  const result = await client.query<HashChainEntryRow>(
    `INSERT INTO seed_lot_hash_chain (seed_lot_id, sequence_number, event_type, snapshot, previous_hash, record_hash, recorded_by, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
     RETURNING *`,
    [seedLotId, sequenceNumber, eventType, JSON.stringify(snapshot), previousHash, recordHash, user.email, createdAt],
  );
  return result.rows[0];
}

export async function getHashChain(seedLotId: string): Promise<HashChainEntryRow[]> {
  const result = await pool.query<HashChainEntryRow>(
    'SELECT * FROM seed_lot_hash_chain WHERE seed_lot_id = $1 ORDER BY sequence_number ASC',
    [seedLotId],
  );
  return result.rows;
}

function toHashChainLinks(entries: HashChainEntryRow[]) {
  return entries.map((e) => ({
    seedLotId: e.seed_lot_id,
    sequenceNumber: e.sequence_number,
    eventType: e.event_type,
    snapshot: e.snapshot,
    previousHash: e.previous_hash,
    createdAt: e.created_at,
    recordHash: e.record_hash,
  }));
}

/** Recomputes a lot's stored chain server-side — detects direct database tampering, independent of any certificate. */
export async function verifyStoredChainIntegrity(seedLotId: string) {
  const entries = await getHashChain(seedLotId);
  if (entries.length === 0) throw new NotFoundError(`No hash chain exists for seed lot ${seedLotId}`);
  return verifyChain(toHashChainLinks(entries));
}

export async function issueCertificate(seedLotId: string, user: AuthenticatedUser): Promise<CertificateRow> {
  return withTransaction(async (client) => {
    const lotResult = await client.query('SELECT id, lot_code FROM seed_lots WHERE id = $1', [seedLotId]);
    if (!lotResult.rows[0]) throw new NotFoundError(`Seed lot ${seedLotId} not found`);

    const chainResult = await client.query<{ sequence_number: number; record_hash: string }>(
      'SELECT sequence_number, record_hash FROM seed_lot_hash_chain WHERE seed_lot_id = $1 ORDER BY sequence_number DESC LIMIT 1',
      [seedLotId],
    );
    const tip = chainResult.rows[0];
    if (!tip) {
      throw new ConflictError(`Seed lot ${seedLotId} has no hash chain yet — it predates this feature and hasn't been backfilled`);
    }

    const signingKey = await getOrCreateActiveSigningKey(client);
    const certificateNumber = `AUTH-${lotResult.rows[0].lot_code}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    const message = buildCertificateSigningMessage({
      certificateNumber,
      seedLotId,
      chainLength: tip.sequence_number,
      latestHash: tip.record_hash,
      issuedAt,
    });
    const signature = signMessage(message, signingKey.private_key_pem);

    const result = await client.query<CertificateRow>(
      `INSERT INTO lot_authenticity_certificates (seed_lot_id, certificate_number, chain_length, latest_hash, signing_key_id, signature, issued_by, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [seedLotId, certificateNumber, tip.sequence_number, tip.record_hash, signingKey.id, signature, user.email, issuedAt],
    );
    const created = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lot_authenticity_certificate',
      entityId: created.id,
      action: 'ISSUE',
      performedBy: user.email,
      afterState: created,
      metadata: { seedLotId, chainLength: tip.sequence_number },
    });

    return created;
  });
}

async function getCertificateRow(certificateId: string): Promise<CertificateRow> {
  const result = await pool.query<CertificateRow>('SELECT * FROM lot_authenticity_certificates WHERE id = $1', [certificateId]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Certificate ${certificateId} not found`);
  return row;
}

export async function getCertificateBundle(certificateId: string): Promise<CertificateBundle> {
  const certificate = await getCertificateRow(certificateId);

  const [lotResult, keyResult, chainResult] = await Promise.all([
    pool.query('SELECT lot_code, crop, variety FROM seed_lots WHERE id = $1', [certificate.seed_lot_id]),
    pool.query<SigningKeyRow>('SELECT * FROM signing_keys WHERE id = $1', [certificate.signing_key_id]),
    pool.query<HashChainEntryRow>(
      'SELECT * FROM seed_lot_hash_chain WHERE seed_lot_id = $1 AND sequence_number <= $2 ORDER BY sequence_number ASC',
      [certificate.seed_lot_id, certificate.chain_length],
    ),
  ]);
  const lot = lotResult.rows[0];
  const key = keyResult.rows[0];
  if (!lot || !key) throw new NotFoundError('Certificate references data that no longer exists');

  return {
    certificateNumber: certificate.certificate_number,
    seedLotId: certificate.seed_lot_id,
    lotCode: lot.lot_code,
    crop: lot.crop,
    variety: lot.variety,
    chain: chainResult.rows.map((e) => ({
      sequenceNumber: e.sequence_number,
      eventType: e.event_type,
      snapshot: e.snapshot,
      previousHash: e.previous_hash,
      recordHash: e.record_hash,
      createdAt: e.created_at,
    })),
    chainLength: certificate.chain_length,
    latestHash: certificate.latest_hash,
    signature: certificate.signature,
    signingKeyFingerprint: key.fingerprint,
    publicKeyPem: key.public_key_pem,
    issuedAt: certificate.issued_at,
    issuedBy: certificate.issued_by,
    revoked: certificate.revoked,
  };
}

/**
 * The public verification entry point (what a QR scan resolves to). Checks
 * three independent things: the embedded chain is internally consistent,
 * the signature over the chain tip is genuine, and the certificate hasn't
 * been revoked — "authentic" requires all three, and each is reported
 * separately so a failure is diagnosable rather than a bare yes/no.
 */
export async function verifyByCertificateId(certificateId: string): Promise<VerificationResult> {
  const bundle = await getCertificateBundle(certificateId);

  const chainCheck = verifyChain(
    bundle.chain.map((c) => ({
      seedLotId: bundle.seedLotId,
      sequenceNumber: c.sequenceNumber,
      eventType: c.eventType,
      snapshot: c.snapshot,
      previousHash: c.previousHash,
      createdAt: c.createdAt,
      recordHash: c.recordHash,
    })),
  );

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
    issuedAt: bundle.issuedAt,
  };
}

export async function revokeCertificate(certificateId: string, reason: string, user: AuthenticatedUser): Promise<CertificateRow> {
  if (!reason?.trim()) throw new ValidationError('reason is required to revoke a certificate');

  return withTransaction(async (client) => {
    const existingResult = await client.query<CertificateRow>('SELECT * FROM lot_authenticity_certificates WHERE id = $1 FOR UPDATE', [
      certificateId,
    ]);
    const existing = existingResult.rows[0];
    if (!existing) throw new NotFoundError(`Certificate ${certificateId} not found`);
    if (existing.revoked) throw new ConflictError('Certificate is already revoked');

    const result = await client.query<CertificateRow>(
      `UPDATE lot_authenticity_certificates
       SET revoked = true, revoked_at = now(), revoked_by = $1, revoked_reason = $2
       WHERE id = $3
       RETURNING *`,
      [user.email, reason.trim(), certificateId],
    );
    const updated = result.rows[0];

    await insertAuditLog(client, {
      entityType: 'lot_authenticity_certificate',
      entityId: certificateId,
      action: 'REVOKE',
      performedBy: user.email,
      beforeState: { revoked: existing.revoked },
      afterState: { revoked: updated.revoked },
      metadata: { reason: reason.trim() },
    });

    return updated;
  });
}

export async function listCertificatesForLot(seedLotId: string): Promise<CertificateRow[]> {
  const result = await pool.query<CertificateRow>(
    'SELECT * FROM lot_authenticity_certificates WHERE seed_lot_id = $1 ORDER BY issued_at DESC',
    [seedLotId],
  );
  return result.rows;
}
