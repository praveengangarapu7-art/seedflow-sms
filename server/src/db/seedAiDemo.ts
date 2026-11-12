import { pool } from './pool';

/**
 * Demo dataset for the AI Center (lab-risk scoring and forecasts).
 *
 * Sixteen seed lots across the crops a contract seed company actually
 * handles, each with germination / purity / viability results and a spread of
 * production dates and allocations, so the risk model and stock forecasts
 * have something realistic to score. Lot codes use the SL-AI- prefix and the
 * script is idempotent (ON CONFLICT / existence checks), so it is safe to run
 * on every deploy and never touches lots created by real users.
 */

interface DemoLot {
  code: string;
  crop: string;
  variety: string;
  stage: 'Breeder' | 'Foundation' | 'Certified';
  qty: number;
  daysOld: number;
  germ: [number, number]; // germinated, sample
  purity: [number, number]; // pure weight, sample weight
  viab: [number, number];
  allocated: number[]; // allocation quantities, spread over the last 90 days
  zone: string;
  testing: 'not_submitted' | 'testing' | 'certified' | 'rejected';
}

const LOTS: DemoLot[] = [
  { code: 'SL-AI-MZ-101', crop: 'Maize', variety: 'MMS Hybrid 7711', stage: 'Certified', qty: 12000, daysOld: 40, germ: [372, 400], purity: [99.2, 100], viab: [376, 400], allocated: [1800, 2200, 2600], zone: 'GD-1/A', testing: 'certified' },
  { code: 'SL-AI-MZ-102', crop: 'Maize', variety: 'MMS Hybrid 7711', stage: 'Certified', qty: 9000, daysOld: 210, germ: [336, 400], purity: [98.6, 100], viab: [340, 400], allocated: [900, 1200], zone: 'GD-1/B', testing: 'certified' },
  { code: 'SL-AI-MZ-103', crop: 'Maize', variety: 'MMS Hybrid 9090', stage: 'Foundation', qty: 4000, daysOld: 95, germ: [352, 400], purity: [99.0, 100], viab: [356, 400], allocated: [600], zone: 'GD-2/A', testing: 'certified' },
  { code: 'SL-AI-MZ-104', crop: 'Maize', variety: 'MMS Hybrid 9090', stage: 'Certified', qty: 7500, daysOld: 250, germ: [318, 400], purity: [97.4, 100], viab: [322, 400], allocated: [400], zone: 'GD-2/B', testing: 'testing' },
  { code: 'SL-AI-CT-201', crop: 'Cotton', variety: 'Bt Cotton MM-55', stage: 'Certified', qty: 5200, daysOld: 60, germ: [300, 400], purity: [98.1, 100], viab: [306, 400], allocated: [1400, 1600], zone: 'GD-3/A', testing: 'certified' },
  { code: 'SL-AI-CT-202', crop: 'Cotton', variety: 'Bt Cotton MM-55', stage: 'Certified', qty: 3800, daysOld: 230, germ: [268, 400], purity: [97.9, 100], viab: [274, 400], allocated: [300], zone: 'GD-3/B', testing: 'rejected' },
  { code: 'SL-AI-SB-301', crop: 'Soybean', variety: 'JS 20-34', stage: 'Certified', qty: 15000, daysOld: 120, germ: [296, 400], purity: [98.4, 100], viab: [300, 400], allocated: [2500, 3000, 2800], zone: 'GD-4/A', testing: 'testing' },
  { code: 'SL-AI-SB-302', crop: 'Soybean', variety: 'JS 20-34', stage: 'Foundation', qty: 3000, daysOld: 30, germ: [356, 400], purity: [99.1, 100], viab: [360, 400], allocated: [], zone: 'GD-4/B', testing: 'certified' },
  { code: 'SL-AI-PD-401', crop: 'Paddy', variety: 'MTU 1010', stage: 'Certified', qty: 20000, daysOld: 75, germ: [348, 400], purity: [98.8, 100], viab: [352, 400], allocated: [4000, 5200], zone: 'GD-5/A', testing: 'certified' },
  { code: 'SL-AI-PD-402', crop: 'Paddy', variety: 'BPT 5204', stage: 'Certified', qty: 11000, daysOld: 260, germ: [324, 400], purity: [98.0, 100], viab: [330, 400], allocated: [800], zone: 'GD-5/B', testing: 'certified' },
  { code: 'SL-AI-WH-501', crop: 'Wheat', variety: 'HD 2967', stage: 'Certified', qty: 18000, daysOld: 20, germ: [364, 400], purity: [99.3, 100], viab: [368, 400], allocated: [1500], zone: 'GD-6/A', testing: 'testing' },
  { code: 'SL-AI-WH-502', crop: 'Wheat', variety: 'GW 322', stage: 'Foundation', qty: 2500, daysOld: 180, germ: [338, 400], purity: [98.9, 100], viab: [342, 400], allocated: [500, 400], zone: 'GD-6/B', testing: 'certified' },
  { code: 'SL-AI-TM-601', crop: 'Tomato', variety: 'MMS Tomato Arka', stage: 'Certified', qty: 180, daysOld: 150, germ: [330, 400], purity: [98.2, 100], viab: [334, 400], allocated: [40, 55, 50], zone: 'COLD-1', testing: 'certified' },
  { code: 'SL-AI-CH-701', crop: 'Chilli', variety: 'MMS Teja Hybrid', stage: 'Certified', qty: 120, daysOld: 200, germ: [270, 400], purity: [96.8, 100], viab: [276, 400], allocated: [20], zone: 'COLD-1', testing: 'testing' },
  { code: 'SL-AI-BJ-801', crop: 'Bajra', variety: 'MMS Bajra 86', stage: 'Certified', qty: 6000, daysOld: 100, germ: [340, 400], purity: [98.5, 100], viab: [344, 400], allocated: [1200, 900], zone: 'GD-7/A', testing: 'certified' },
  { code: 'SL-AI-SF-901', crop: 'Sunflower', variety: 'KBSH-44', stage: 'Certified', qty: 2800, daysOld: 245, germ: [288, 400], purity: [97.6, 100], viab: [292, 400], allocated: [], zone: 'GD-7/B', testing: 'not_submitted' },
];

async function run(): Promise<void> {
  let created = 0;
  for (const lot of LOTS) {
    const allocatedTotal = lot.allocated.reduce((a, b) => a + b, 0);
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO seed_lots (lot_code, crop, variety, stage, quantity_total, quantity_allocated, unit,
                              source_farm_id, production_date, storage_zone, testing_status, approved_for_sale)
       VALUES ($1, $2, $3, $4, $5, $6, 'kg', 'mms-contract-farms', CURRENT_DATE - $7::int, $8, $9, $10)
       ON CONFLICT (lot_code) DO NOTHING
       RETURNING id`,
      [lot.code, lot.crop, lot.variety, lot.stage, lot.qty, allocatedTotal, lot.daysOld, lot.zone, lot.testing, lot.testing === 'certified'],
    );
    const id = inserted.rows[0]?.id;
    if (!id) continue; // already present: leave it exactly as it is
    created += 1;

    await pool.query(
      `INSERT INTO germination_tests (seed_lot_id, variety, sample_size, germinated_count, tested_by, created_at)
       VALUES ($1, $2, $3, $4, 'QA Lab', now() - interval '5 days')`,
      [id, lot.variety, lot.germ[1], lot.germ[0]],
    );
    await pool.query(
      `INSERT INTO purity_tests (seed_lot_id, sample_weight, pure_seed_weight, tested_by, created_at)
       VALUES ($1, $2, $3, 'QA Lab', now() - interval '5 days')`,
      [id, lot.purity[1], lot.purity[0]],
    );
    await pool.query(
      `INSERT INTO viability_tests (seed_lot_id, sample_size, viable_count, tested_by, created_at)
       VALUES ($1, $2, $3, 'QA Lab', now() - interval '5 days')`,
      [id, lot.viab[1], lot.viab[0]],
    );
    for (const [i, qty] of lot.allocated.entries()) {
      await pool.query(
        `INSERT INTO seed_lot_allocations (seed_lot_id, allocated_to, quantity, performed_by, created_at, notes)
         VALUES ($1, $2, $3, 'demo-seed', now() - ($4::int * interval '1 day'), 'AI Center demo allocation')`,
        [id, ['Nagpur dealers', 'Akola dealers', 'Jalna distributor'][i % 3], qty, 80 - i * 30],
      );
    }
  }
  console.log(`AI Center demo data: ${created} new lot(s) (of ${LOTS.length}).`);
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error('[seed:ai] failed:', error);
    return pool.end().finally(() => process.exit(1));
  });
