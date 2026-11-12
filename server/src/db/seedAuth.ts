import { hashPassword } from '../auth/password';
import { pool } from './pool';

// Seed passwords come from environment variables. In production the seed
// refuses to run without them; local development falls back to the demo
// defaults so the demo accounts keep working.
function requirePassword(envName: string, devDefault: string): string {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envName} must be set to seed users in production`);
  }
  return devDefault;
}

async function upsertOrganization(name: string, type: string): Promise<string> {
  const existing = await pool.query('SELECT id FROM organizations WHERE name = $1', [name]);
  if (existing.rows[0]) return existing.rows[0].id;

  const result = await pool.query('INSERT INTO organizations (name, type) VALUES ($1, $2) RETURNING id', [name, type]);
  return result.rows[0].id;
}

async function upsertUser(
  email: string,
  password: string,
  name: string,
  role: string,
  organizationId: string | null,
): Promise<void> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    console.log(`skip ${email} (already exists)`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await pool.query(
    'INSERT INTO users (email, password_hash, name, role, organization_id) VALUES ($1, $2, $3, $4, $5)',
    [email, passwordHash, name, role, organizationId],
  );
  console.log(`created ${role} user: ${email}`);
}

async function run(): Promise<void> {
  const breederOrgId = await upsertOrganization('BreederCo Seeds', 'breeder');
  const producerOrgId = await upsertOrganization('GreenGrow Producers', 'producer');
  const warehouseOrgId = await upsertOrganization('Central Warehouse Co', 'warehouse');

  await upsertUser('admin@seedsphere.com', requirePassword('SEED_PASSWORD_ADMIN', 'Admin123!'), 'Ava Admin', 'Admin', null);
  await upsertUser('breeder@seedsphere.com', requirePassword('SEED_PASSWORD_BREEDER', 'Breeder123!'), 'Bikram Breeder', 'Breeder', breederOrgId);
  await upsertUser('producer@seedsphere.com', requirePassword('SEED_PASSWORD_PRODUCER', 'Producer123!'), 'Priya Producer', 'Producer', producerOrgId);
  await upsertUser('inspector@seedsphere.com', requirePassword('SEED_PASSWORD_INSPECTOR', 'Inspector123!'), 'Ivy Inspector', 'Inspector', null);
  await upsertUser('warehouse@seedsphere.com', requirePassword('SEED_PASSWORD_WAREHOUSE', 'Warehouse123!'), 'Walt Warehouse', 'Warehouse Manager', warehouseOrgId);

  // Existing demo seed lots (from before this feature existed) had no
  // owning organization; assign them to the producer org so the ownership
  // checks have real pre-existing data to run against.
  await pool.query('UPDATE seed_lots SET organization_id = $1 WHERE organization_id IS NULL', [producerOrgId]);

  console.log('Auth seed data applied.');
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error('[seedAuth] failed:', error);
    return pool.end().finally(() => process.exit(1));
  });
