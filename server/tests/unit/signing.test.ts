import { describe, expect, it } from 'vitest';
import { generateSigningKeyPair, signMessage, verifySignature } from '../../src/modules/authenticity/signing';

describe('signing.generateSigningKeyPair', () => {
  it('generates a PEM-encoded public and private key plus a fingerprint', () => {
    const pair = generateSigningKeyPair();
    expect(pair.publicKeyPem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(pair.privateKeyPem).toMatch(/^-----BEGIN PRIVATE KEY-----/);
    expect(pair.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a different key pair (and fingerprint) each time', () => {
    const a = generateSigningKeyPair();
    const b = generateSigningKeyPair();
    expect(a.publicKeyPem).not.toBe(b.publicKeyPem);
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });
});

describe('signing.signMessage / verifySignature', () => {
  it('verifies a signature made with the matching private key', () => {
    const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
    const signature = signMessage('hello world', privateKeyPem);
    expect(verifySignature('hello world', signature, publicKeyPem)).toBe(true);
  });

  it('rejects a signature if the message was altered', () => {
    const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
    const signature = signMessage('original message', privateKeyPem);
    expect(verifySignature('tampered message', signature, publicKeyPem)).toBe(false);
  });

  // Multi-byte characters expose an encoding mismatch (e.g. 'utf-8' vs an
  // unspecified/empty encoding) that a same-length ASCII message would hide.
  it('round-trips a message containing multi-byte UTF-8 characters', () => {
    const { publicKeyPem, privateKeyPem } = generateSigningKeyPair();
    const message = JSON.stringify({ lotCode: 'SL-001', notes: 'Café Niño 稲 — ✓' });
    const signature = signMessage(message, privateKeyPem);
    expect(verifySignature(message, signature, publicKeyPem)).toBe(true);
  });

  it('rejects a signature verified against the wrong public key', () => {
    const keyA = generateSigningKeyPair();
    const keyB = generateSigningKeyPair();
    const signature = signMessage('hello world', keyA.privateKeyPem);
    expect(verifySignature('hello world', signature, keyB.publicKeyPem)).toBe(false);
  });

  it('returns false (not throw) for a malformed signature string', () => {
    const { publicKeyPem } = generateSigningKeyPair();
    expect(verifySignature('hello world', 'not-valid-base64-signature!!', publicKeyPem)).toBe(false);
  });

  it('returns false (not throw) for a malformed public key', () => {
    const { privateKeyPem } = generateSigningKeyPair();
    const signature = signMessage('hello world', privateKeyPem);
    expect(verifySignature('hello world', signature, 'not-a-real-pem-key')).toBe(false);
  });
});
