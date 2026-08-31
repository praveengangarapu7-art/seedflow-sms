import { ValidationError } from '../errors';

// Deliberately permissive (RFC 5322 is far stricter than any hand-rolled
// regex should attempt) — this exists to catch obvious typos ("missing @",
// "no domain"), not to be a full validator. Good enough for the same reason
// most production apps settle on something like this and rely on an actual
// send/verify step to catch the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidEmail(email: unknown, fieldLabel = 'email'): asserts email is string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new ValidationError(`${fieldLabel} is required`);
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    throw new ValidationError(`${fieldLabel} must be a valid email address`);
  }
}
