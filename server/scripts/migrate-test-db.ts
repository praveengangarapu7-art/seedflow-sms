// Applies migrations to the isolated test database (see .env.test) —
// portable across shells (no inline env-var syntax that differs between
// bash/PowerShell), since dotenv loads the file directly.
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.test') });

await import('../src/db/migrate');
