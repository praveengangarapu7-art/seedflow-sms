/**
 * Offline demo dataset.
 *
 * When the backend cannot be reached, `request()` in seedLotRealtimeClient.ts
 * serves from here instead of surfacing an error. The goal is that every page
 * in the app renders a complete, believable picture with no red banners, so
 * the product can be demonstrated without Postgres and the API running.
 *
 * Two rules this file follows:
 *  1. The data is INTERNALLY CONSISTENT — the lot codes referenced by lab
 *     submissions, quality flags and certificates are the same lots returned
 *     by the seed-lot endpoints, so drilling from one page to another lines
 *     up rather than showing contradictory records.
 *  2. It is clearly demo data, not a silent fake of production. The client
 *     flips a "demo mode" flag the moment it falls back here, which the UI
 *     surfaces as a small badge — nobody should mistake these numbers for a
 *     real deployment's.
 */

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function dateDaysFromNow(days: number): string {
  return isoDaysFromNow(days).slice(0, 10);
}

const ORG = {
  breeder: '11111111-1111-4111-8111-111111111111',
  producer: '22222222-2222-4222-8222-222222222222',
  warehouse: '33333333-3333-4333-8333-333333333333',
  labNational: '44444444-4444-4444-8444-444444444444',
  labRegional: '55555555-5555-4555-8555-555555555555',
  labPrivate: '66666666-6666-4666-8666-666666666666',
};

export const DEMO_ORGANIZATIONS = [
  { id: ORG.breeder, name: 'BreederCo Seeds', type: 'breeder', location: 'Hyderabad', contact_person: 'R. Nair', certification_type: 'Foundation Certified', active: true },
  { id: ORG.producer, name: 'GreenGrow Producers', type: 'producer', location: 'Nashik', contact_person: 'S. Patil', certification_type: 'Certified', active: true },
  { id: ORG.warehouse, name: 'Central Warehouse Co', type: 'warehouse', location: 'Pune', contact_person: 'A. Desai', certification_type: null, active: true },
  { id: ORG.labNational, name: 'National Seed Testing Laboratory', type: 'laboratory', location: 'Hyderabad', contact_person: 'National Lab Desk', certification_type: 'ISTA Accredited', active: true },
  { id: ORG.labRegional, name: 'Regional Seed Quality Lab', type: 'laboratory', location: 'Pune', contact_person: 'Regional Lab Desk', certification_type: 'State Accredited', active: true },
  { id: ORG.labPrivate, name: 'AgriCert Analytics', type: 'laboratory', location: 'Bengaluru', contact_person: 'AgriCert Lab Desk', certification_type: 'Private Accredited', active: true },
];

interface DemoLotSeed {
  id: string;
  lot_code: string;
  crop: string;
  variety: string;
  stage: string;
  quantity_total: number;
  quantity_allocated: number;
  low_stock_threshold: number;
  status: string;
  testing_status: string;
  storage_zone: string | null;
  approved_for_sale: boolean;
  organization_id: string;
  production_days_ago: number;
}

const LOT_SEEDS: DemoLotSeed[] = [
  { id: 'a1000000-0000-4000-8000-000000000001', lot_code: 'SL-PADDY-0142', crop: 'Paddy', variety: 'GoldenPaddy', stage: 'Certified', quantity_total: 5000, quantity_allocated: 1200, low_stock_threshold: 500, status: 'active', testing_status: 'certified', storage_zone: 'Cold Storage A', approved_for_sale: true, organization_id: ORG.producer, production_days_ago: 60 },
  { id: 'a1000000-0000-4000-8000-000000000002', lot_code: 'SL-PADDY-0143', crop: 'Paddy', variety: 'GoldenPaddy', stage: 'Certified', quantity_total: 3200, quantity_allocated: 2950, low_stock_threshold: 400, status: 'active', testing_status: 'certified', storage_zone: 'Cold Storage A', approved_for_sale: true, organization_id: ORG.producer, production_days_ago: 75 },
  { id: 'a1000000-0000-4000-8000-000000000003', lot_code: 'SL-MAIZE-0088', crop: 'Maize', variety: 'SilverMaize', stage: 'Certified', quantity_total: 4200, quantity_allocated: 900, low_stock_threshold: 400, status: 'active', testing_status: 'certified', storage_zone: 'Dry Storage B', approved_for_sale: true, organization_id: ORG.producer, production_days_ago: 45 },
  { id: 'a1000000-0000-4000-8000-000000000004', lot_code: 'SL-MAIZE-0089', crop: 'Maize', variety: 'SilverMaize', stage: 'Foundation', quantity_total: 1500, quantity_allocated: 1420, low_stock_threshold: 200, status: 'active', testing_status: 'testing', storage_zone: 'Dry Storage B', approved_for_sale: false, organization_id: ORG.breeder, production_days_ago: 30 },
  { id: 'a1000000-0000-4000-8000-000000000005', lot_code: 'SL-WHEAT-0231', crop: 'Wheat', variety: 'DurumGold', stage: 'Certified', quantity_total: 6800, quantity_allocated: 2100, low_stock_threshold: 600, status: 'active', testing_status: 'certified', storage_zone: 'Dry Storage B', approved_for_sale: true, organization_id: ORG.producer, production_days_ago: 90 },
  { id: 'a1000000-0000-4000-8000-000000000006', lot_code: 'SL-WHEAT-0232', crop: 'Wheat', variety: 'DurumGold', stage: 'Certified', quantity_total: 2400, quantity_allocated: 2350, low_stock_threshold: 300, status: 'active', testing_status: 'rejected', storage_zone: 'Cold Storage A', approved_for_sale: false, organization_id: ORG.producer, production_days_ago: 120 },
  { id: 'a1000000-0000-4000-8000-000000000007', lot_code: 'SL-COTTON-0019', crop: 'Cotton', variety: 'DeccanCotton', stage: 'Breeder', quantity_total: 800, quantity_allocated: 120, low_stock_threshold: 100, status: 'active', testing_status: 'not_submitted', storage_zone: null, approved_for_sale: false, organization_id: ORG.breeder, production_days_ago: 15 },
  { id: 'a1000000-0000-4000-8000-000000000008', lot_code: 'SL-PADDY-0119', crop: 'Paddy', variety: 'KaveriSprout', stage: 'Certified', quantity_total: 3000, quantity_allocated: 3000, low_stock_threshold: 300, status: 'expired', testing_status: 'certified', storage_zone: 'Cold Storage A', approved_for_sale: false, organization_id: ORG.producer, production_days_ago: 420 },
  { id: 'a1000000-0000-4000-8000-000000000009', lot_code: 'SL-SOY-0054', crop: 'Soybean', variety: 'GreenSoy', stage: 'Certified', quantity_total: 2600, quantity_allocated: 400, low_stock_threshold: 250, status: 'active', testing_status: 'testing', storage_zone: 'Dry Storage B', approved_for_sale: false, organization_id: ORG.producer, production_days_ago: 22 },
  { id: 'a1000000-0000-4000-8000-000000000010', lot_code: 'SL-SOY-0055', crop: 'Soybean', variety: 'GreenSoy', stage: 'Foundation', quantity_total: 1200, quantity_allocated: 1150, low_stock_threshold: 150, status: 'active', testing_status: 'not_submitted', storage_zone: null, approved_for_sale: false, organization_id: ORG.breeder, production_days_ago: 10 },
];

export const DEMO_SEED_LOTS = LOT_SEEDS.map((l) => {
  const quantity_available = l.quantity_total - l.quantity_allocated;
  return {
    id: l.id,
    lot_code: l.lot_code,
    crop: l.crop,
    variety: l.variety,
    parent_lot_id: null,
    stage: l.stage,
    quantity_total: l.quantity_total,
    quantity_allocated: l.quantity_allocated,
    quantity_available,
    is_low_stock: quantity_available <= l.low_stock_threshold,
    low_stock_threshold: l.low_stock_threshold,
    unit: 'kg',
    status: l.status,
    organization_id: l.organization_id,
    available_for_partner_order: l.stage === 'Foundation',
    testing_status: l.testing_status,
    production_date: dateDaysFromNow(-l.production_days_ago),
    storage_zone: l.storage_zone,
    approved_for_sale: l.approved_for_sale,
  };
});

function lotByCode(code: string) {
  return DEMO_SEED_LOTS.find((l) => l.lot_code === code)!;
}

const SUB = {
  s1: 'b1000000-0000-4000-8000-000000000001',
  s2: 'b1000000-0000-4000-8000-000000000002',
  s3: 'b1000000-0000-4000-8000-000000000003',
  s4: 'b1000000-0000-4000-8000-000000000004',
  s5: 'b1000000-0000-4000-8000-000000000005',
};

export const DEMO_LAB_SUBMISSIONS = [
  {
    id: SUB.s1,
    seed_lot_id: lotByCode('SL-PADDY-0142').id,
    lot_code: 'SL-PADDY-0142',
    lab_organization_id: ORG.labNational,
    lab_organization_name: 'National Seed Testing Laboratory',
    requested_tests: ['germination', 'purity', 'vigor'],
    sample_quantity: 250,
    sample_unit: 'g',
    status: 'completed',
    submitted_by: 'admin@seedsphere.com',
    submitted_at: isoDaysFromNow(-18),
    expected_completion_date: dateDaysFromNow(-4),
    completed_at: isoDaysFromNow(-5),
    created_at: isoDaysFromNow(-18),
    updated_at: isoDaysFromNow(-5),
    results: [
      { id: 'c1-1', submission_id: SUB.s1, test_type: 'germination', metrics: { sampleSize: 400, germinatedCount: 372 }, result_value: 93, threshold_used: 85, passed: true, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-6), notes: 'Standard ISTA top-of-paper method.' },
      { id: 'c1-2', submission_id: SUB.s1, test_type: 'purity', metrics: { sampleWeight: 120, pureSeedWeight: 119 }, result_value: 99.2, threshold_used: 98, passed: true, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-6), notes: null },
      { id: 'c1-3', submission_id: SUB.s1, test_type: 'vigor', metrics: { sampleSize: 400, vigorCount: 330 }, result_value: 82.5, threshold_used: 70, passed: true, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-5), notes: null },
    ],
  },
  {
    id: SUB.s2,
    seed_lot_id: lotByCode('SL-WHEAT-0232').id,
    lot_code: 'SL-WHEAT-0232',
    lab_organization_id: ORG.labRegional,
    lab_organization_name: 'Regional Seed Quality Lab',
    requested_tests: ['germination', 'purity'],
    sample_quantity: 200,
    sample_unit: 'g',
    status: 'failed',
    submitted_by: 'admin@seedsphere.com',
    submitted_at: isoDaysFromNow(-12),
    expected_completion_date: dateDaysFromNow(-2),
    completed_at: isoDaysFromNow(-3),
    created_at: isoDaysFromNow(-12),
    updated_at: isoDaysFromNow(-3),
    results: [
      { id: 'c2-1', submission_id: SUB.s2, test_type: 'germination', metrics: { sampleSize: 400, germinatedCount: 280 }, result_value: 70, threshold_used: 85, passed: false, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-3), notes: 'Weak radicle development across replicates.' },
      { id: 'c2-2', submission_id: SUB.s2, test_type: 'purity', metrics: { sampleWeight: 100, pureSeedWeight: 99 }, result_value: 99, threshold_used: 98, passed: true, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-3), notes: null },
    ],
  },
  {
    id: SUB.s3,
    seed_lot_id: lotByCode('SL-MAIZE-0089').id,
    lot_code: 'SL-MAIZE-0089',
    lab_organization_id: ORG.labNational,
    lab_organization_name: 'National Seed Testing Laboratory',
    requested_tests: ['germination', 'purity', 'vigor'],
    sample_quantity: 300,
    sample_unit: 'g',
    status: 'in_progress',
    submitted_by: 'admin@seedsphere.com',
    submitted_at: isoDaysFromNow(-6),
    expected_completion_date: dateDaysFromNow(8),
    completed_at: null,
    created_at: isoDaysFromNow(-6),
    updated_at: isoDaysFromNow(-2),
    results: [
      { id: 'c3-1', submission_id: SUB.s3, test_type: 'purity', metrics: { sampleWeight: 150, pureSeedWeight: 148 }, result_value: 98.7, threshold_used: 98, passed: true, source: 'manual', recorded_by: 'inspector@seedsphere.com', recorded_at: isoDaysFromNow(-2), notes: null },
    ],
  },
  {
    id: SUB.s4,
    seed_lot_id: lotByCode('SL-SOY-0054').id,
    lot_code: 'SL-SOY-0054',
    lab_organization_id: ORG.labPrivate,
    lab_organization_name: 'AgriCert Analytics',
    requested_tests: ['germination'],
    sample_quantity: 150,
    sample_unit: 'g',
    status: 'submitted',
    submitted_by: 'producer@seedsphere.com',
    submitted_at: isoDaysFromNow(-2),
    expected_completion_date: dateDaysFromNow(12),
    completed_at: null,
    created_at: isoDaysFromNow(-2),
    updated_at: isoDaysFromNow(-2),
    results: [],
  },
  {
    id: SUB.s5,
    seed_lot_id: lotByCode('SL-PADDY-0143').id,
    lot_code: 'SL-PADDY-0143',
    lab_organization_id: ORG.labRegional,
    lab_organization_name: 'Regional Seed Quality Lab',
    requested_tests: ['germination', 'vigor'],
    sample_quantity: 180,
    sample_unit: 'g',
    status: 'in_progress',
    submitted_by: 'admin@seedsphere.com',
    submitted_at: isoDaysFromNow(-20),
    expected_completion_date: dateDaysFromNow(-5),
    completed_at: null,
    created_at: isoDaysFromNow(-20),
    updated_at: isoDaysFromNow(-9),
    results: [],
  },
];

export const DEMO_QUALITY_FLAGS = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    seed_lot_id: lotByCode('SL-WHEAT-0232').id,
    lot_code: 'SL-WHEAT-0232',
    submission_id: SUB.s2,
    test_type: 'germination',
    reason: 'germination result 70% is below the 85% certification threshold',
    flagged_at: isoDaysFromNow(-3),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null,
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    seed_lot_id: lotByCode('SL-PADDY-0119').id,
    lot_code: 'SL-PADDY-0119',
    submission_id: SUB.s1,
    test_type: 'vigor',
    reason: 'vigor result 64% is below the 70% certification threshold',
    flagged_at: isoDaysFromNow(-30),
    resolved: true,
    resolved_by: 'admin@seedsphere.com',
    resolved_at: isoDaysFromNow(-25),
    resolution_notes: 'Retest requested — original sample showed transit damage. Lot quarantined pending re-submission.',
  },
];

export const DEMO_LAB_PERFORMANCE = [
  { labOrganizationId: ORG.labNational, labOrganizationName: 'National Seed Testing Laboratory', totalSubmissions: 2, completedCount: 1, failedCount: 0, passRate: 100, avgTurnaroundDays: 13, overdueCount: 0 },
  { labOrganizationId: ORG.labRegional, labOrganizationName: 'Regional Seed Quality Lab', totalSubmissions: 2, completedCount: 0, failedCount: 1, passRate: 50, avgTurnaroundDays: 9, overdueCount: 1 },
  { labOrganizationId: ORG.labPrivate, labOrganizationName: 'AgriCert Analytics', totalSubmissions: 1, completedCount: 0, failedCount: 0, passRate: null, avgTurnaroundDays: null, overdueCount: 0 },
];

export const DEMO_LAB_CERTIFICATES = [
  {
    id: 'e1000000-0000-4000-8000-000000000001',
    certificate_number: 'PC-2026-0142',
    issuing_authority: 'National Plant Protection Organization',
    issue_date: dateDaysFromNow(-5),
    expiry_date: dateDaysFromNow(360),
    status: 'issued',
    issued_by: 'admin@seedsphere.com',
    notes: null,
    seed_lot_id: lotByCode('SL-PADDY-0142').id,
    lot_code: 'SL-PADDY-0142',
    submission_id: SUB.s1,
    lab_organization_name: 'National Seed Testing Laboratory',
  },
];

export const DEMO_FARMERS = [
  { id: 'f1000000-0000-4000-8000-000000000001', name: 'Ramesh Kumar', phone: '+91 98765 43210', region: 'Nashik', location: 'Plot 14, Nashik', organization_id: ORG.producer },
  { id: 'f1000000-0000-4000-8000-000000000002', name: 'Sunita Devi', phone: '+91 98765 11223', region: 'Pune', location: 'Village Wagholi', organization_id: ORG.producer },
  { id: 'f1000000-0000-4000-8000-000000000003', name: 'Anil Deshmukh', phone: '+91 98765 55667', region: 'Aurangabad', location: 'Survey 88', organization_id: ORG.producer },
];

export const DEMO_SEED_REQUESTS = [
  { id: 'g1000000-0000-4000-8000-000000000001', farmer_id: DEMO_FARMERS[0].id, farmer_name: 'Ramesh Kumar', crop: 'Paddy', variety: 'GoldenPaddy', quantity_requested: 120, unit: 'kg', region: 'Nashik', status: 'requested', requested_by: 'producer@seedsphere.com', approved_by: null, allocation_id: null, requested_seed_lot_id: lotByCode('SL-PADDY-0142').id, rejection_reason: null, notes: null, created_at: isoDaysFromNow(-4), updated_at: isoDaysFromNow(-4) },
  { id: 'g1000000-0000-4000-8000-000000000002', farmer_id: DEMO_FARMERS[1].id, farmer_name: 'Sunita Devi', crop: 'Maize', variety: 'SilverMaize', quantity_requested: 80, unit: 'kg', region: 'Pune', status: 'approved', requested_by: 'producer@seedsphere.com', approved_by: 'admin@seedsphere.com', allocation_id: null, requested_seed_lot_id: null, rejection_reason: null, notes: null, created_at: isoDaysFromNow(-9), updated_at: isoDaysFromNow(-6) },
  { id: 'g1000000-0000-4000-8000-000000000003', farmer_id: DEMO_FARMERS[2].id, farmer_name: 'Anil Deshmukh', crop: 'Wheat', variety: 'DurumGold', quantity_requested: 200, unit: 'kg', region: 'Aurangabad', status: 'allocated', requested_by: 'producer@seedsphere.com', approved_by: 'admin@seedsphere.com', allocation_id: 'h1000000-0000-4000-8000-000000000001', requested_seed_lot_id: lotByCode('SL-WHEAT-0231').id, rejection_reason: null, notes: null, created_at: isoDaysFromNow(-15), updated_at: isoDaysFromNow(-11) },
];

export const DEMO_STORAGE_LOCATIONS = [
  { id: 'i1000000-0000-4000-8000-000000000001', organization_id: ORG.warehouse, code: 'WH-COLD-A1', warehouse_zone: 'Cold Storage A', shelf: 'Shelf 3', capacity_units: 200, target_temperature_c: 6, target_humidity_percent: 40, daily_rate_per_unit: 0.05, status: 'active' },
  { id: 'i1000000-0000-4000-8000-000000000002', organization_id: ORG.warehouse, code: 'WH-DRY-B2', warehouse_zone: 'Dry Storage B', shelf: 'Shelf 7', capacity_units: 500, target_temperature_c: 25, target_humidity_percent: 55, daily_rate_per_unit: 0.02, status: 'active' },
];

export const DEMO_CROPS = [
  { id: 'j1000000-0000-4000-8000-000000000001', name: 'Paddy', scientific_name: 'Oryza sativa', category: 'Cereal', active: true },
  { id: 'j1000000-0000-4000-8000-000000000002', name: 'Maize', scientific_name: 'Zea mays', category: 'Cereal', active: true },
  { id: 'j1000000-0000-4000-8000-000000000003', name: 'Wheat', scientific_name: 'Triticum aestivum', category: 'Cereal', active: true },
  { id: 'j1000000-0000-4000-8000-000000000004', name: 'Soybean', scientific_name: 'Glycine max', category: 'Oilseed', active: true },
  { id: 'j1000000-0000-4000-8000-000000000005', name: 'Cotton', scientific_name: 'Gossypium hirsutum', category: 'Fibre', active: true },
];

export const DEMO_SEARCH_FILTER_OPTIONS = {
  crops: ['Paddy', 'Maize', 'Wheat', 'Soybean', 'Cotton'],
  organizations: DEMO_ORGANIZATIONS.map((o) => ({ id: o.id, name: o.name })),
  agroClimaticZones: ['Semi-Arid', 'Sub-Humid', 'Coastal'],
  diseaseResistanceTraits: ['Blast', 'Rust', 'Bacterial Blight'],
  storageZones: ['Cold Storage A', 'Dry Storage B'],
};

export const DEMO_USER = {
  id: 'u1000000-0000-4000-8000-000000000001',
  email: 'admin@seedsphere.com',
  name: 'Ava Admin',
  role: 'Admin',
  organizationId: null as string | null,
};

/** The token handed out when login() is served offline. Never accepted by a
 *  real backend — it exists only so pages that gate on "do I have a token"
 *  proceed to render their demo view. */
export const DEMO_TOKEN = 'demo-offline-token';

// --- Assistant -------------------------------------------------------------

const lowStock = DEMO_SEED_LOTS.filter((l) => l.status === 'active' && l.is_low_stock);
const expiredLots = DEMO_SEED_LOTS.filter((l) => l.status === 'expired');

function cite(label: string, module: string, path: string, count: number) {
  return { label, module, path, detail: `${count} record${count === 1 ? '' : 's'}` };
}

/**
 * Mirrors the shape and tone of the server's own deterministic engine
 * (assistant.service.ts's ruleBasedAnswer) so the assistant reads identically
 * whether it is answering from the API or from this offline fixture.
 */
function demoAssistantAnswer(question: string): unknown {
  const q = question.toLowerCase();

  if (q.includes('low') || q.includes('stock') || q.includes('running out') || q.includes('restock')) {
    return {
      answer: `${lowStock.length} seed lots are at or below their low-stock threshold:\n\n${lowStock
        .map((l) => `• ${l.lot_code} (${l.crop}/${l.variety}) — ${l.quantity_available}kg available, threshold ${l.low_stock_threshold}`)
        .join('\n')}`,
      intent: 'low_stock',
      citations: [cite('Seed lots at or below their low-stock threshold', 'Production', '/batch-operations', lowStock.length)],
      source: 'rules',
      modelName: null,
      suggestions: ['Which crops are most affected?', 'What is expiring?', 'Show inventory by crop'],
    };
  }

  if (q.includes('fail') || q.includes('quality flag') || q.includes('reject')) {
    const open = DEMO_QUALITY_FLAGS.filter((f) => !f.resolved);
    const failing = DEMO_LAB_SUBMISSIONS.flatMap((s) =>
      s.results.filter((r) => !r.passed).map((r) => ({ ...r, lot_code: s.lot_code, lab: s.lab_organization_name })),
    );
    return {
      answer: `${failing.length} failing lab result and ${open.length} unresolved quality flag:\n\n${failing
        .map((r) => `• ${r.lot_code} — ${r.test_type} scored ${r.result_value}% against a ${r.threshold_used}% threshold (${r.lab})`)
        .join('\n')}\n\n${open.map((f) => `• ${f.lot_code} — ${f.test_type}: ${f.reason}`).join('\n')}`,
      intent: 'lab_failures',
      citations: [
        cite('Lab test results that failed their certification threshold', 'Laboratory', '/lab/results', failing.length),
        cite('Unresolved laboratory quality flags', 'Laboratory', '/lab/quality-flags', open.length),
      ],
      source: 'rules',
      modelName: null,
      suggestions: ['Which lab submissions are still open?', 'How is each lab performing?', 'Show inventory by crop'],
    };
  }

  if (q.includes('expir')) {
    return {
      answer: `${expiredLots.length} seed lot is marked expired:\n\n${expiredLots
        .map((l) => `• ${l.lot_code} (${l.crop}/${l.variety}) — zone ${l.storage_zone ?? '—'}, produced ${l.production_date}`)
        .join('\n')}`,
      intent: 'expiring_lots',
      citations: [cite('Seed lots marked expired', 'Production', '/batch-operations', expiredLots.length)],
      source: 'rules',
      modelName: null,
      suggestions: ['Show storage zones', 'Which lots are low on stock?', 'Show inventory by crop'],
    };
  }

  if (q.includes('lab') || q.includes('test') || q.includes('germination') || q.includes('overdue')) {
    const open = DEMO_LAB_SUBMISSIONS.filter((s) => s.status === 'submitted' || s.status === 'in_progress');
    const overdue = open.filter((s) => new Date(s.expected_completion_date) < new Date()).length;
    return {
      answer: `${open.length} lab submissions are still open.${overdue > 0 ? ` ${overdue} is past the expected completion date.` : ''}\n\n${open
        .map((s) => `• ${s.lot_code} at ${s.lab_organization_name} — ${s.results.length}/${s.requested_tests.length} results in, due ${s.expected_completion_date}`)
        .join('\n')}`,
      intent: 'lab_pending',
      citations: [cite('Lab submissions still in progress', 'Laboratory', '/lab/submissions', open.length)],
      source: 'rules',
      modelName: null,
      suggestions: ['Any failing lab results?', 'How is each lab performing?', 'Show inventory by crop'],
    };
  }

  if (q.includes('request') || q.includes('approv') || q.includes('farmer')) {
    const pending = DEMO_SEED_REQUESTS.filter((r) => r.status === 'requested' || r.status === 'approved');
    return {
      answer: `${pending.length} seed requests are awaiting action:\n\n${pending
        .map((r) => `• ${r.farmer_name} — ${r.quantity_requested}${r.unit} of ${r.crop}/${r.variety} (${r.status})`)
        .join('\n')}`,
      intent: 'pending_requests',
      citations: [cite('Farmer seed requests awaiting action', 'Production', '/seed-farmer-program', pending.length)],
      source: 'rules',
      modelName: null,
      suggestions: ['Which lots are low on stock?', 'Show inventory by crop', 'Any failing lab results?'],
    };
  }

  if (q.includes('storage') || q.includes('zone') || q.includes('warehouse')) {
    return {
      answer: `${DEMO_STORAGE_LOCATIONS.length} active storage locations:\n\n${DEMO_STORAGE_LOCATIONS.map(
        (l) => `• ${l.code} (${l.warehouse_zone}) — capacity ${l.capacity_units} units, target ${l.target_temperature_c}°C / ${l.target_humidity_percent}% RH`,
      ).join('\n')}`,
      intent: 'storage_overview',
      citations: [cite('Storage locations and current occupancy', 'Production', '/seed-cold-storage', DEMO_STORAGE_LOCATIONS.length)],
      source: 'rules',
      modelName: null,
      suggestions: ['What is expiring?', 'Show inventory by crop', 'Which lots are low on stock?'],
    };
  }

  if (q.includes('inventory') || q.includes('how much') || q.includes('how many') || q.includes('crop')) {
    const byCrop = new Map<string, { lots: number; available: number; allocated: number; certified: number }>();
    for (const l of DEMO_SEED_LOTS.filter((x) => x.status === 'active')) {
      const e = byCrop.get(l.crop) ?? { lots: 0, available: 0, allocated: 0, certified: 0 };
      e.lots += 1;
      e.available += l.quantity_available;
      e.allocated += l.quantity_allocated;
      if (l.testing_status === 'certified') e.certified += 1;
      byCrop.set(l.crop, e);
    }
    return {
      answer: `Active inventory across ${byCrop.size} crops:\n\n${[...byCrop.entries()]
        .map(([crop, e]) => `• ${crop} — ${e.available}kg available, ${e.allocated}kg allocated, across ${e.lots} lots (${e.certified} certified)`)
        .join('\n')}`,
      intent: 'inventory_summary',
      citations: [cite('Active inventory by crop', 'Production', '/seed-lot-inventory', byCrop.size)],
      source: 'rules',
      modelName: null,
      suggestions: ['Which lots are low on stock?', 'What is expiring?', 'Show storage zones'],
    };
  }

  const active = DEMO_SEED_LOTS.filter((l) => l.status === 'active');
  return {
    answer: `Here is the current picture:\n\n• ${active.length} active seed lots (${active.filter((l) => l.testing_status === 'certified').length} certified)\n• ${lowStock.length} lots at or below their low-stock threshold\n• ${DEMO_LAB_SUBMISSIONS.filter((s) => s.status === 'submitted' || s.status === 'in_progress').length} lab submissions in progress\n• ${DEMO_QUALITY_FLAGS.filter((f) => !f.resolved).length} unresolved quality flags\n• ${DEMO_SEED_REQUESTS.filter((r) => r.status === 'requested').length} farmer seed requests awaiting action\n\nAsk me about any of these and I will break it down.`,
    intent: 'general',
    citations: [cite('Current SeedSphere snapshot', 'Platform', '/modules', 1)],
    source: 'rules',
    modelName: null,
    suggestions: ['Which lots are low on stock?', 'Any failing lab results?', 'Show inventory by crop'],
  };
}

// --- Path resolution -------------------------------------------------------

/** Strips the querystring so a path with filters still matches its route. */
function basePath(path: string): string {
  return path.split('?')[0];
}

/**
 * Returns demo data for a path, or `undefined` when this path has no demo
 * fixture. `undefined` is meaningful: the caller then serves a safe empty
 * value rather than an error, so an unmapped endpoint still renders a clean
 * empty state instead of a red banner.
 */
export function resolveDemoResponse(path: string, method: string, body?: string): unknown | undefined {
  const p = basePath(path);

  if (p === '/auth/login') return { user: DEMO_USER, accessToken: DEMO_TOKEN };
  if (p === '/auth/me') return DEMO_USER;

  if (p === '/assistant/status') return { modelConfigured: false, provider: 'demo', model: null };
  if (p === '/assistant/ask') {
    let question = '';
    try {
      question = (JSON.parse(body ?? '{}') as { question?: string }).question ?? '';
    } catch {
      question = '';
    }
    return demoAssistantAnswer(question);
  }

  if (p === '/organizations') return DEMO_ORGANIZATIONS;
  if (p === '/farmers') return DEMO_FARMERS;
  if (p === '/crops') return DEMO_CROPS;

  if (p === '/production/seed-lots') return DEMO_SEED_LOTS;
  if (p === '/production/seed-lots/search') {
    return DEMO_SEED_LOTS.map((l) => ({
      ...l,
      storage_zones: l.storage_zone ? [l.storage_zone] : [],
      is_certified: l.testing_status === 'certified',
    }));
  }
  if (p === '/production/seed-lots/search/filter-options') return DEMO_SEARCH_FILTER_OPTIONS;
  if (p === '/production/seed-lots/saved-searches') return [];
  if (p.startsWith('/production/seed-lots/') && method === 'GET') {
    const id = p.split('/')[3];
    const match = DEMO_SEED_LOTS.find((l) => l.id === id);
    if (match) return match;
  }

  if (p === '/production/lab-testing/submissions') return DEMO_LAB_SUBMISSIONS;
  if (p === '/production/lab-testing/quality-flags') {
    // Honour ?resolved=true|false so the Open/Resolved tabs differ.
    const resolvedParam = new URLSearchParams(path.split('?')[1] ?? '').get('resolved');
    if (resolvedParam === 'true') return DEMO_QUALITY_FLAGS.filter((f) => f.resolved);
    if (resolvedParam === 'false') return DEMO_QUALITY_FLAGS.filter((f) => !f.resolved);
    return DEMO_QUALITY_FLAGS;
  }
  if (p === '/production/lab-testing/lab-performance') return DEMO_LAB_PERFORMANCE;
  if (p === '/production/lab-testing/certificates') return DEMO_LAB_CERTIFICATES;
  if (p.startsWith('/production/lab-testing/submissions/') && method === 'GET') {
    const id = p.split('/')[4];
    const match = DEMO_LAB_SUBMISSIONS.find((s) => s.id === id);
    if (match) return match;
  }

  if (p === '/production/seed-requests') return DEMO_SEED_REQUESTS;
  if (p === '/production/seed-requests/my-allocations') {
    return DEMO_SEED_REQUESTS.map((r) => ({
      ...r,
      lot_code: r.requested_seed_lot_id
        ? DEMO_SEED_LOTS.find((l) => l.id === r.requested_seed_lot_id)?.lot_code ?? null
        : null,
      storage_zones: ['Cold Storage A'],
      ready_since: r.status === 'allocated' ? isoDaysFromNow(-11) : null,
    }));
  }

  if (p === '/production/storage/locations') return DEMO_STORAGE_LOCATIONS;

  return undefined;
}
