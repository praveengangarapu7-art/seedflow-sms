import { hashPassword } from '../auth/password';
import { pool } from './pool';

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
  console.log(`created ${role} user: ${email} / ${password}`);
}

async function run(): Promise<void> {
  const breederOrgId = await upsertOrganization('BreederCo Seeds', 'breeder');
  const producerOrgId = await upsertOrganization('GreenGrow Producers', 'producer');
  const warehouseOrgId = await upsertOrganization('Central Warehouse Co', 'warehouse');

  await upsertUser('admin@seedsphere.com', 'Admin123!', 'Ava Admin', 'Admin', null);
  await upsertUser('breeder@seedsphere.com', 'Breeder123!', 'Bikram Breeder', 'Breeder', breederOrgId);
  await upsertUser('producer@seedsphere.com', 'Producer123!', 'Priya Producer', 'Producer', producerOrgId);
  await upsertUser('inspector@seedsphere.com', 'Inspector123!', 'Ivy Inspector', 'Inspector', null);
  await upsertUser('warehouse@seedsphere.com', 'Warehouse123!', 'Walt Warehouse', 'Warehouse Manager', warehouseOrgId);

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
