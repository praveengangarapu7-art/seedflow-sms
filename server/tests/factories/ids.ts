import { randomUUID } from 'crypto';

/** Short, collision-resistant suffix for building unique fixture values (lot codes, emails, names). */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}
