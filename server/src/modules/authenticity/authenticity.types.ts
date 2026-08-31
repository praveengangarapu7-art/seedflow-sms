export const HASH_CHAIN_EVENT_TYPES = ['CREATE', 'UPDATE', 'ALLOCATE', 'RELEASE'] as const;
export type HashChainEventType = (typeof HASH_CHAIN_EVENT_TYPES)[number];

export interface HashChainEntryRow {
  id: string;
  seed_lot_id: string;
  sequence_number: number;
  event_type: HashChainEventType;
  snapshot: unknown;
  previous_hash: string;
  record_hash: string;
  recorded_by: string;
  created_at: string;
}

export interface SigningKeyRow {
  id: string;
  algorithm: string;
  public_key_pem: string;
  private_key_pem: string;
  fingerprint: string;
  is_active: boolean;
  created_at: string;
}

export interface CertificateRow {
  id: string;
  seed_lot_id: string;
  certificate_number: string;
  chain_length: number;
  latest_hash: string;
  signing_key_id: string;
  signature: string;
  issued_by: string;
  issued_at: string;
  revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
}

/** The self-contained, portable bundle a QR code links to / a "download certificate" button exports — everything an offline verifier needs, and nothing it needs to trust a database for. */
export interface CertificateBundle {
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

export interface VerificationResult {
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
  issuedAt: string;
}
