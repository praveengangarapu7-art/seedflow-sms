// Pure Ed25519 sign/verify — no DB imports, same reasoning as hashChain.ts.
// Ed25519 needs no external dependency (Node's built-in crypto supports it
// natively) and produces small, fast signatures well suited to embedding in
// a QR code or a compact certificate JSON.
import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'crypto';

export interface GeneratedKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

export function generateSigningKeyPair(): GeneratedKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const fingerprint = createHash('sha256').update(publicKey).digest('hex');
  return { publicKeyPem: publicKey, privateKeyPem: privateKey, fingerprint };
}

/** Ed25519 has no separate digest step — passing `null` as the algorithm is the correct, documented call for it. */
export function signMessage(message: string, privateKeyPem: string): string {
  return cryptoSign(null, Buffer.from(message, 'utf-8'), privateKeyPem).toString('base64');
}

export function verifySignature(message: string, signatureBase64: string, publicKeyPem: string): boolean {
  try {
    return cryptoVerify(null, Buffer.from(message, 'utf-8'), publicKeyPem, Buffer.from(signatureBase64, 'base64'));
  } catch {
    return false;
  }
}
