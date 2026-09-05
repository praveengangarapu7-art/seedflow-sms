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

// --- Administration ---------------------------------------------------
// The Administration module talks to real /users, /audit-logs, /privacy,
// /monitoring and /master-data endpoints that (unlike the fixtures above)
// had no offline fixture at all, so an unreachable backend left every
// object-shaped tile with no fixture to fall back to. These fill that gap
// the same way the rest of this file does: internally consistent with the
// organizations/farmers/seed-lots already defined above.

export const DEMO_ADMIN_USERS = [
  { id: 'u1000000-0000-4000-8000-000000000001', email: 'admin@seedsphere.com', name: 'Ava Admin', role: 'Admin', organization_id: null as string | null, organization_name: null as string | null, is_active: true, created_at: isoDaysFromNow(-400), updated_at: isoDaysFromNow(-2), last_action_at: isoDaysFromNow(0), action_count: 812 },
  { id: 'u1000000-0000-4000-8000-000000000002', email: 'breeder@seedsphere.com', name: 'Priya Rao', role: 'Breeder', organization_id: ORG.breeder as string | null, organization_name: 'BreederCo Seeds' as string | null, is_active: true, created_at: isoDaysFromNow(-380), updated_at: isoDaysFromNow(-30), last_action_at: isoDaysFromNow(-1), action_count: 234 },
  { id: 'u1000000-0000-4000-8000-000000000003', email: 'producer@seedsphere.com', name: 'Karan Mehta', role: 'Producer', organization_id: ORG.producer as string | null, organization_name: 'GreenGrow Producers' as string | null, is_active: true, created_at: isoDaysFromNow(-360), updated_at: isoDaysFromNow(-14), last_action_at: isoDaysFromNow(0), action_count: 456 },
  { id: 'u1000000-0000-4000-8000-000000000004', email: 'inspector@seedsphere.com', name: 'Meera Iyer', role: 'Inspector', organization_id: ORG.labNational as string | null, organization_name: 'National Seed Testing Laboratory' as string | null, is_active: true, created_at: isoDaysFromNow(-340), updated_at: isoDaysFromNow(-20), last_action_at: isoDaysFromNow(-3), action_count: 178 },
  { id: 'u1000000-0000-4000-8000-000000000005', email: 'warehouse@seedsphere.com', name: 'Sanjay Verma', role: 'Warehouse Manager', organization_id: ORG.warehouse as string | null, organization_name: 'Central Warehouse Co' as string | null, is_active: true, created_at: isoDaysFromNow(-320), updated_at: isoDaysFromNow(-8), last_action_at: isoDaysFromNow(-1), action_count: 301 },
  { id: 'u1000000-0000-4000-8000-000000000006', email: 'divya.nair@breederco.example', name: 'Divya Nair', role: 'Breeder', organization_id: ORG.breeder as string | null, organization_name: 'BreederCo Seeds' as string | null, is_active: true, created_at: isoDaysFromNow(-90), updated_at: isoDaysFromNow(-9), last_action_at: isoDaysFromNow(-4), action_count: 92 },
  { id: 'u1000000-0000-4000-8000-000000000007', email: 'rohit.malhotra@greengrow.example', name: 'Rohit Malhotra', role: 'Producer', organization_id: ORG.producer as string | null, organization_name: 'GreenGrow Producers' as string | null, is_active: false, created_at: isoDaysFromNow(-200), updated_at: isoDaysFromNow(-95), last_action_at: isoDaysFromNow(-95), action_count: 40 },
  { id: 'u1000000-0000-4000-8000-000000000008', email: 'neha.kapoor@agricert.example', name: 'Neha Kapoor', role: 'Inspector', organization_id: null as string | null, organization_name: null as string | null, is_active: true, created_at: isoDaysFromNow(-30), updated_at: isoDaysFromNow(-1), last_action_at: isoDaysFromNow(-1), action_count: 15 },
];

export const DEMO_ADMIN_USER_STATS = {
  total: DEMO_ADMIN_USERS.length,
  active: DEMO_ADMIN_USERS.filter((u) => u.is_active).length,
  inactive: DEMO_ADMIN_USERS.filter((u) => !u.is_active).length,
  withoutOrganization: DEMO_ADMIN_USERS.filter((u) => !u.organization_id).length,
  byRole: Object.entries(
    DEMO_ADMIN_USERS.reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([role, count]) => ({ role, count })),
};

export const DEMO_BACKEND_ROLES = [
  { role: 'Admin', requiresOrganization: false },
  { role: 'Breeder', requiresOrganization: true },
  { role: 'Producer', requiresOrganization: true },
  { role: 'Inspector', requiresOrganization: false },
  { role: 'Warehouse Manager', requiresOrganization: true },
];

/**
 * The platform audit trail, and the one place every module's activity meets.
 *
 * Administration owns no records of its own — its job is to show what the
 * other modules did — so this fixture deliberately spans all six of them
 * (procurement, warehouse, R&D, processing, production planning, laboratory)
 * plus the account and policy changes Administration itself makes. Entity ids
 * are the real ones from each module's own dataset (PO-2026-0142 is a row in
 * the Procurement orders table, BT-2026-1142 a batch in Processing), so an
 * auditor reading a line here can go and find that record in its module.
 */
export const DEMO_AUDIT_LOGS = [
  { id: 'l1000000-0000-4000-8000-000000000001', entity_type: 'user', entity_id: DEMO_ADMIN_USERS[7].id, action: 'USER_ROLE_CHANGED', performed_by: 'admin@seedsphere.com', before_state: { role: 'Breeder' }, after_state: { role: 'Inspector' }, metadata: null, created_at: isoDaysFromNow(0) },
  { id: 'l1000000-0000-4000-8000-000000000002', entity_type: 'workflow', entity_id: 'w1000000-0000-4000-8000-000000000001', action: 'WORKFLOW_STAGE_APPROVED', performed_by: 'admin@seedsphere.com', before_state: { stage: 'QUALITY_TESTING' }, after_state: { stage: 'MARKET_READY_RELEASE' }, metadata: { workflowStage: 'MARKET_READY_RELEASE' }, created_at: isoDaysFromNow(0) },
  { id: 'l1000000-0000-4000-8000-000000000003', entity_type: 'seed_lot', entity_id: 'a1000000-0000-4000-8000-000000000006', action: 'SEED_LOT_QUANTITY_CORRECTED', performed_by: 'admin@seedsphere.com', before_state: { quantity_total: 2400 }, after_state: { quantity_total: 2350 }, metadata: { reason: 'Recount after warehouse audit' }, created_at: isoDaysFromNow(-1) },
  { id: 'l1000000-0000-4000-8000-000000000004', entity_type: 'organization', entity_id: ORG.labPrivate, action: 'ORGANIZATION_CREATED', performed_by: 'admin@seedsphere.com', before_state: null, after_state: { name: 'AgriCert Analytics' }, metadata: null, created_at: isoDaysFromNow(-1) },
  { id: 'l1000000-0000-4000-8000-000000000005', entity_type: 'retention_policy', entity_id: 'farmer', action: 'RETENTION_POLICY_UPDATED', performed_by: 'admin@seedsphere.com', before_state: { retention_days: 730 }, after_state: { retention_days: 365 }, metadata: null, created_at: isoDaysFromNow(-2) },
  { id: 'l1000000-0000-4000-8000-000000000006', entity_type: 'farmer', entity_id: DEMO_FARMERS[2].id, action: 'DATA_EXPORT_REQUESTED', performed_by: 'admin@seedsphere.com', before_state: null, after_state: null, metadata: { format: 'json' }, created_at: isoDaysFromNow(-2) },
  { id: 'l1000000-0000-4000-8000-000000000007', entity_type: 'user', entity_id: DEMO_ADMIN_USERS[5].id, action: 'USER_CREATED', performed_by: 'admin@seedsphere.com', before_state: null, after_state: { email: DEMO_ADMIN_USERS[5].email, role: 'Breeder' }, metadata: null, created_at: isoDaysFromNow(-3) },
  { id: 'l1000000-0000-4000-8000-000000000008', entity_type: 'seed_lot', entity_id: 'a1000000-0000-4000-8000-000000000008', action: 'ORPHAN_LOT_ARCHIVED', performed_by: 'admin@seedsphere.com', before_state: { status: 'expired' }, after_state: { status: 'archived' }, metadata: null, created_at: isoDaysFromNow(-4) },
  { id: 'l1000000-0000-4000-8000-000000000009', entity_type: 'workflow', entity_id: 'w1000000-0000-4000-8000-000000000002', action: 'WORKFLOW_STAGE_REJECTED', performed_by: 'inspector@seedsphere.com', before_state: { stage: 'PRE_CERTIFIED_INSPECTION' }, after_state: { stage: 'PRE_CERTIFIED_INSPECTION', rejected: true }, metadata: { reason: 'Missing phytosanitary certificate' }, created_at: isoDaysFromNow(-5) },
  { id: 'l1000000-0000-4000-8000-000000000010', entity_type: 'user', entity_id: DEMO_ADMIN_USERS[6].id, action: 'USER_DISABLED', performed_by: 'admin@seedsphere.com', before_state: { is_active: true }, after_state: { is_active: false }, metadata: { reason: 'Inactive for 90+ days' }, created_at: isoDaysFromNow(-6) },
  { id: 'l1000000-0000-4000-8000-000000000011', entity_type: 'seed_request', entity_id: 'g1000000-0000-4000-8000-000000000002', action: 'ALLOCATION_APPROVED', performed_by: 'admin@seedsphere.com', before_state: { status: 'requested' }, after_state: { status: 'approved' }, metadata: null, created_at: isoDaysFromNow(-8) },
  { id: 'l1000000-0000-4000-8000-000000000012', entity_type: 'user', entity_id: DEMO_ADMIN_USERS[2].id, action: 'PASSWORD_RESET', performed_by: 'admin@seedsphere.com', before_state: null, after_state: null, metadata: { method: 'admin_reset' }, created_at: isoDaysFromNow(-10) },

  // --- Procurement -------------------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000013', entity_type: 'purchase_order', entity_id: 'PO-2026-0142', action: 'PURCHASE_ORDER_APPROVED', performed_by: 'admin@seedsphere.com', before_state: { status: 'Pending' }, after_state: { status: 'Sent' }, metadata: { module: 'procurement', supplier: 'AgriChem Industries', amount: 425000 }, created_at: isoDaysFromNow(0) },
  { id: 'l1000000-0000-4000-8000-000000000014', entity_type: 'goods_receipt', entity_id: 'GRN-2026-0089', action: 'GOODS_RECEIVED', performed_by: 'warehouse@seedsphere.com', before_state: { status: 'Expected' }, after_state: { status: 'Received', inspected: true }, metadata: { module: 'procurement', poReference: 'PO-2026-0142' }, created_at: isoDaysFromNow(-1) },

  // --- Warehouse ---------------------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000015', entity_type: 'stock_movement', entity_id: 'WH-COLD-A1', action: 'STOCK_ASSIGNED_TO_LOCATION', performed_by: 'warehouse@seedsphere.com', before_state: { storage_zone: null }, after_state: { storage_zone: 'Cold Storage A' }, metadata: { module: 'warehouse', lot_code: 'SL-PADDY-0143' }, created_at: isoDaysFromNow(-1) },
  { id: 'l1000000-0000-4000-8000-000000000016', entity_type: 'stock_adjustment', entity_id: 'ADJ-2026-0044', action: 'STOCK_ADJUSTMENT_APPROVED', performed_by: 'warehouse@seedsphere.com', before_state: { quantity: 3200 }, after_state: { quantity: 3180 }, metadata: { module: 'warehouse', reason: 'Cycle count variance' }, created_at: isoDaysFromNow(-3) },

  // --- Research & Development -------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000017', entity_type: 'breeding_trial', entity_id: 'TRL-2026-101', action: 'TRIAL_PROTOCOL_APPROVED', performed_by: 'breeder@seedsphere.com', before_state: { status: 'Draft' }, after_state: { status: 'Active' }, metadata: { module: 'rd', location: 'Hyderabad', crop: 'Cotton' }, created_at: isoDaysFromNow(-2) },
  { id: 'l1000000-0000-4000-8000-000000000018', entity_type: 'variety', entity_id: 'VAR-DURUMGOLD', action: 'VARIETY_ADVANCED', performed_by: 'breeder@seedsphere.com', before_state: { stage: 'MLT trials' }, after_state: { stage: 'Pre-release' }, metadata: { module: 'rd' }, created_at: isoDaysFromNow(-7) },

  // --- Processing --------------------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000019', entity_type: 'processing_batch', entity_id: 'BT-2026-1142', action: 'BATCH_STAGE_ADVANCED', performed_by: 'producer@seedsphere.com', before_state: { stage: 'Intake' }, after_state: { stage: 'Cleaning' }, metadata: { module: 'processing', plant: 'Aurangabad Plant' }, created_at: isoDaysFromNow(0) },
  { id: 'l1000000-0000-4000-8000-000000000020', entity_type: 'processing_batch', entity_id: 'BT-2026-1138', action: 'BATCH_QUALITY_HOLD', performed_by: 'inspector@seedsphere.com', before_state: { status: 'In Progress' }, after_state: { status: 'On Hold' }, metadata: { module: 'processing', reason: 'Moisture above 12% after drying' }, created_at: isoDaysFromNow(-4) },

  // --- Production planning ----------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000021', entity_type: 'crop_plan', entity_id: 'CP-2026-001', action: 'CROP_PLAN_STATUS_CHANGED', performed_by: 'producer@seedsphere.com', before_state: { status: 'Sown' }, after_state: { status: 'Growing' }, metadata: { module: 'production', crop: 'Paddy', season: 'Kharif' }, created_at: isoDaysFromNow(-2) },
  { id: 'l1000000-0000-4000-8000-000000000022', entity_type: 'field_inspection', entity_id: 'FI-2026-0217', action: 'FIELD_INSPECTION_APPROVED', performed_by: 'inspector@seedsphere.com', before_state: { status: 'Pending' }, after_state: { status: 'Approved' }, metadata: { module: 'production', farm: 'Wagad Farms' }, created_at: isoDaysFromNow(-6) },

  // --- Laboratory --------------------------------------------------------
  { id: 'l1000000-0000-4000-8000-000000000023', entity_type: 'lab_submission', entity_id: 'LAB-2026-0451', action: 'LAB_RESULT_RECORDED', performed_by: 'inspector@seedsphere.com', before_state: { testing_status: 'testing' }, after_state: { testing_status: 'certified', germination: 92.4 }, metadata: { module: 'lab', lot_code: 'SL-PADDY-0142' }, created_at: isoDaysFromNow(-1) },
  { id: 'l1000000-0000-4000-8000-000000000024', entity_type: 'lab_certificate', entity_id: 'CERT-2026-0188', action: 'CERTIFICATE_ISSUED', performed_by: 'inspector@seedsphere.com', before_state: null, after_state: { standard: 'ISTA', lot_code: 'SL-MAIZE-0088' }, metadata: { module: 'lab' }, created_at: isoDaysFromNow(-5) },
  // Newest first, whatever order the sections above are written in.
].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

export const DEMO_DATA_CONSISTENCY = {
  parentageViolationCount: 2,
  reconciliationDiscrepancyCount: 3,
  orphanLotCount: 1,
};

export const DEMO_RETENTION_POLICIES = [
  { id: 'p1000000-0000-4000-8000-000000000001', entity_type: 'farmer', retention_days: 365, action: 'anonymize', description: 'Farmer contact details are anonymised one year after their last seed request or allocation.', is_active: true, updated_by: 'admin@seedsphere.com', created_at: isoDaysFromNow(-400), updated_at: isoDaysFromNow(-2) },
  { id: 'p1000000-0000-4000-8000-000000000002', entity_type: 'data_access_log', retention_days: 180, action: 'delete', description: 'Access logs are purged after 180 days once the compliance window has closed.', is_active: true, updated_by: 'admin@seedsphere.com', created_at: isoDaysFromNow(-400), updated_at: isoDaysFromNow(-40) },
];

export const DEMO_RETENTION_CANDIDATES = [
  { farmerId: DEMO_FARMERS[1].id, name: DEMO_FARMERS[1].name, region: DEMO_FARMERS[1].region, lastActivityAt: isoDaysFromNow(-380), daysSinceActivity: 380 },
  { farmerId: DEMO_FARMERS[2].id, name: DEMO_FARMERS[2].name, region: DEMO_FARMERS[2].region, lastActivityAt: isoDaysFromNow(-370), daysSinceActivity: 370 },
];

export const DEMO_COMPLIANCE_AUDIT = {
  totalFarmers: DEMO_FARMERS.length,
  anonymizedFarmers: 0,
  retentionCandidateCount: DEMO_RETENTION_CANDIDATES.length,
  dataAccess: {
    windowDays: 30,
    totalAccesses: 148,
    unmaskedAccesses: 9,
    exportCount: 4,
    byRole: [
      { role: 'Admin', count: 98, unmaskedCount: 9 },
      { role: 'Inspector', count: 31, unmaskedCount: 0 },
      { role: 'Breeder', count: 19, unmaskedCount: 0 },
    ],
  },
  principles: [
    { principle: 'Data minimisation', status: 'met' as const, note: 'Only fields required for allocation and compliance are stored on farmer records.' },
    { principle: 'Storage limitation', status: 'attention' as const, note: `${DEMO_RETENTION_CANDIDATES.length} farmer records are past their retention window and awaiting review.` },
    { principle: 'Right to erasure', status: 'met' as const, note: "Anonymisation removes name, phone and location while preserving allocation history for audit." },
    { principle: 'Access logging', status: 'met' as const, note: "Every unmasked read of a farmer record is written to the access log with the reader's role." },
  ],
};

export const DEMO_DATA_ACCESS_LOGS = [
  { id: 'q1000000-0000-4000-8000-000000000001', entity_type: 'farmer', entity_id: DEMO_FARMERS[0].id, access_type: 'read', accessed_by: 'admin@seedsphere.com', accessed_by_role: 'Admin', was_masked: false, route: '/admin/data-privacy', created_at: isoDaysFromNow(0) },
  { id: 'q1000000-0000-4000-8000-000000000002', entity_type: 'farmer', entity_id: DEMO_FARMERS[1].id, access_type: 'export', accessed_by: 'admin@seedsphere.com', accessed_by_role: 'Admin', was_masked: false, route: '/admin/data-privacy', created_at: isoDaysFromNow(-2) },
  { id: 'q1000000-0000-4000-8000-000000000003', entity_type: 'farmer', entity_id: DEMO_FARMERS[2].id, access_type: 'read', accessed_by: 'inspector@seedsphere.com', accessed_by_role: 'Inspector', was_masked: true, route: '/production/seed-requests', created_at: isoDaysFromNow(-5) },
];

const WORKFLOW_STAGE_KEYS = [
  'FOUNDATION_LOT',
  'PRE_CERTIFIED_INSPECTION',
  'CERTIFIED_PRODUCTION',
  'QUALITY_TESTING',
  'MARKET_READY_RELEASE',
] as const;

const WORKFLOW_STAGE_DEPARTMENT: Record<(typeof WORKFLOW_STAGE_KEYS)[number], string> = {
  FOUNDATION_LOT: 'Production',
  PRE_CERTIFIED_INSPECTION: 'Inspection',
  CERTIFIED_PRODUCTION: 'Production',
  QUALITY_TESTING: 'Quality',
  MARKET_READY_RELEASE: 'Marketing',
};

function buildWorkflowStages(
  workflowId: string,
  statuses: ('approved' | 'rejected' | 'in_progress' | 'pending')[],
  startedDaysAgo: number,
) {
  return WORKFLOW_STAGE_KEYS.map((key, i) => {
    const status = statuses[i];
    const started = status === 'pending' ? null : isoDaysFromNow(-(startedDaysAgo - i * 2));
    return {
      id: `${workflowId}-stage-${i + 1}`,
      workflow_id: workflowId,
      stage_key: key,
      sequence: i + 1,
      department: WORKFLOW_STAGE_DEPARTMENT[key],
      status,
      started_at: started,
      due_at: status === 'in_progress' ? isoDaysFromNow(2) : null,
      approved_by: status === 'approved' ? 'admin@seedsphere.com' : null,
      approved_at: status === 'approved' ? started : null,
      rejection_reason: status === 'rejected' ? 'Sample failed germination threshold — resubmission required.' : null,
      notes: null,
      created_at: started ?? isoDaysFromNow(0),
      updated_at: started ?? isoDaysFromNow(0),
    };
  });
}

export const DEMO_WORKFLOWS = [
  {
    id: 'w1000000-0000-4000-8000-000000000001',
    seed_lot_id: 'a1000000-0000-4000-8000-000000000001',
    certified_lot_id: 'a1000000-0000-4000-8000-000000000001',
    status: 'completed',
    started_by: 'producer@seedsphere.com',
    started_at: isoDaysFromNow(-30),
    completed_at: isoDaysFromNow(0),
    created_at: isoDaysFromNow(-30),
    updated_at: isoDaysFromNow(0),
    stages: buildWorkflowStages('w1000000-0000-4000-8000-000000000001', ['approved', 'approved', 'approved', 'approved', 'approved'], 20),
  },
  {
    id: 'w1000000-0000-4000-8000-000000000002',
    seed_lot_id: 'a1000000-0000-4000-8000-000000000003',
    certified_lot_id: null as string | null,
    status: 'in_progress',
    started_by: 'producer@seedsphere.com',
    started_at: isoDaysFromNow(-5),
    completed_at: null as string | null,
    created_at: isoDaysFromNow(-5),
    updated_at: isoDaysFromNow(-5),
    stages: buildWorkflowStages('w1000000-0000-4000-8000-000000000002', ['approved', 'rejected', 'pending', 'pending', 'pending'], 5),
  },
  {
    id: 'w1000000-0000-4000-8000-000000000003',
    seed_lot_id: 'a1000000-0000-4000-8000-000000000005',
    certified_lot_id: null as string | null,
    status: 'in_progress',
    started_by: 'producer@seedsphere.com',
    started_at: isoDaysFromNow(-9),
    completed_at: null as string | null,
    created_at: isoDaysFromNow(-9),
    updated_at: isoDaysFromNow(-3),
    stages: buildWorkflowStages('w1000000-0000-4000-8000-000000000003', ['approved', 'approved', 'in_progress', 'pending', 'pending'], 9),
  },
  {
    id: 'w1000000-0000-4000-8000-000000000004',
    seed_lot_id: 'a1000000-0000-4000-8000-000000000007',
    certified_lot_id: null as string | null,
    status: 'cancelled',
    started_by: 'breeder@seedsphere.com',
    started_at: isoDaysFromNow(-15),
    completed_at: isoDaysFromNow(-12),
    created_at: isoDaysFromNow(-15),
    updated_at: isoDaysFromNow(-12),
    stages: buildWorkflowStages('w1000000-0000-4000-8000-000000000004', ['approved', 'pending', 'pending', 'pending', 'pending'], 15),
  },
];
// Manually push the overdue workflow's current stage due date into the past
// so SystemHealth/AdminWorkflows' "past due" tiles have something to show.
DEMO_WORKFLOWS[2].stages[2].due_at = isoDaysFromNow(-1);

export const DEMO_ERROR_LOGS = [
  {
    fingerprint: 'e1a2b3c4',
    source: 'frontend' as const,
    level: 'error' as const,
    message: "Cannot read properties of undefined (reading 'map')",
    stack_trace: 'AdminDashboard (AdminDashboard.tsx:230)',
    route: '/admin/dashboard',
    method: null as string | null,
    occurrence_count: 3,
    first_seen_at: isoDaysFromNow(-6),
    last_seen_at: isoDaysFromNow(-4),
  },
  {
    fingerprint: 'f5d6e7a8',
    source: 'backend' as const,
    level: 'warning' as const,
    message: 'Slow query on seed_lots join (>800ms)',
    stack_trace: null,
    route: '/production/seed-lots/search',
    method: 'GET',
    occurrence_count: 12,
    first_seen_at: isoDaysFromNow(-14),
    last_seen_at: isoDaysFromNow(-1),
  },
  {
    fingerprint: 'b9c0d1e2',
    source: 'backend' as const,
    level: 'error' as const,
    message: 'Duplicate key violation on retention_policies upsert',
    stack_trace: null,
    route: '/privacy/retention-policies/farmer',
    method: 'PATCH',
    occurrence_count: 1,
    first_seen_at: isoDaysFromNow(-2),
    last_seen_at: isoDaysFromNow(-2),
  },
];

export const DEMO_API_PERFORMANCE = [
  { method: 'GET', route: '/production/seed-lots', requestCount: 4820, avgDurationMs: 82, p95DurationMs: 210, errorRate: 0.002 },
  { method: 'GET', route: '/production/seed-lots/search', requestCount: 3110, avgDurationMs: 340, p95DurationMs: 890, errorRate: 0.004 },
  { method: 'POST', route: '/production/workflows', requestCount: 640, avgDurationMs: 145, p95DurationMs: 320, errorRate: 0.0 },
  { method: 'GET', route: '/organizations', requestCount: 1980, avgDurationMs: 58, p95DurationMs: 130, errorRate: 0.0 },
  { method: 'GET', route: '/audit-logs', requestCount: 890, avgDurationMs: 97, p95DurationMs: 240, errorRate: 0.0 },
];

export const DEMO_FAILED_OPERATIONS = [
  { method: 'PATCH', route: '/privacy/retention-policies/farmer', statusCode: 409, occurrenceCount: 1, lastOccurredAt: isoDaysFromNow(-2) },
  { method: 'POST', route: '/production/lab-testing/submissions/results/bulk-upload', statusCode: 422, occurrenceCount: 4, lastOccurredAt: isoDaysFromNow(-5) },
  { method: 'POST', route: '/production/workflows/stages/approve', statusCode: 403, occurrenceCount: 2, lastOccurredAt: isoDaysFromNow(-8) },
];

export const DEMO_USER_ACTIVITY = [
  { userEmail: 'admin@seedsphere.com', actionCount: 812, distinctEntityTypes: 9, lastActionAt: isoDaysFromNow(0) },
  { userEmail: 'producer@seedsphere.com', actionCount: 456, distinctEntityTypes: 5, lastActionAt: isoDaysFromNow(0) },
  { userEmail: 'warehouse@seedsphere.com', actionCount: 301, distinctEntityTypes: 4, lastActionAt: isoDaysFromNow(-1) },
  { userEmail: 'breeder@seedsphere.com', actionCount: 234, distinctEntityTypes: 6, lastActionAt: isoDaysFromNow(-1) },
  { userEmail: 'inspector@seedsphere.com', actionCount: 178, distinctEntityTypes: 3, lastActionAt: isoDaysFromNow(-3) },
];

export const DEMO_ANOMALIES = [
  { metric: 'seed_lot_created', label: 'New seed lots', todayCount: 6, trailingDailyAverage: 5.2, isAnomalous: false },
  { metric: 'allocation_created', label: 'Allocations', todayCount: 3, trailingDailyAverage: 11.4, isAnomalous: true },
  { metric: 'workflow_stage_approved', label: 'Stage approvals', todayCount: 4, trailingDailyAverage: 4.8, isAnomalous: false },
  { metric: 'lab_submission_created', label: 'Lab submissions', todayCount: 2, trailingDailyAverage: 2.1, isAnomalous: false },
];

export const DEMO_CLIMATE_ALERTS = [
  { id: 'k1000000-0000-4000-8000-000000000001', climate_prediction_id: 'cp-1', farm_id: 'farm-1', farmer_id: DEMO_FARMERS[0].id, crop: 'Paddy', risk_level: 'high' as const, message: 'Heavy rainfall predicted in Nashik over the next 72 hours — risk of waterlogging in low-lying plots.', acknowledged: false, acknowledged_by: null as string | null, acknowledged_at: null as string | null, created_at: isoDaysFromNow(-1) },
  { id: 'k1000000-0000-4000-8000-000000000002', climate_prediction_id: 'cp-2', farm_id: 'farm-2', farmer_id: DEMO_FARMERS[1].id, crop: 'Maize', risk_level: 'medium' as const, message: 'Below-average rainfall trend over the past two weeks in Pune district.', acknowledged: true, acknowledged_by: 'admin@seedsphere.com', acknowledged_at: isoDaysFromNow(-3), created_at: isoDaysFromNow(-5) },
  { id: 'k1000000-0000-4000-8000-000000000003', climate_prediction_id: 'cp-3', farm_id: 'farm-3', farmer_id: DEMO_FARMERS[2].id, crop: 'Wheat', risk_level: 'low' as const, message: 'Minor temperature dip expected — unlikely to affect current growth stage.', acknowledged: false, acknowledged_by: null as string | null, acknowledged_at: null as string | null, created_at: isoDaysFromNow(-2) },
];

export const DEMO_RECONCILIATION_REPORT = {
  generatedAt: isoDaysFromNow(0),
  totalChecked: DEMO_ORGANIZATIONS.length + DEMO_FARMERS.length + DEMO_SEED_LOTS.length,
  issueCount: 3,
  issues: [
    { entityType: 'farmer' as const, entityId: DEMO_FARMERS[1].id, entityName: DEMO_FARMERS[1].name, rule: 'stale_activity', message: 'No allocation or request activity in over a year.', severity: 'warning' as const },
    { entityType: 'organization' as const, entityId: ORG.labPrivate, entityName: 'AgriCert Analytics', rule: 'missing_contact', message: 'Contact person is on file but has no verified phone number.', severity: 'warning' as const },
    { entityType: 'crop' as const, entityId: 'SL-PADDY-0119', entityName: 'SL-PADDY-0119', rule: 'orphaned_lot', message: 'Seed lot has expired status but is still referenced by an active storage location.', severity: 'error' as const },
  ],
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

  if (p === '/users/stats') return DEMO_ADMIN_USER_STATS;
  if (p === '/users/roles') return DEMO_BACKEND_ROLES;
  if (p === '/users' && method === 'GET') return DEMO_ADMIN_USERS;
  if (p === '/audit-logs') return DEMO_AUDIT_LOGS;
  if (p === '/monitoring/data-consistency') return DEMO_DATA_CONSISTENCY;
  if (p === '/privacy/compliance-audit') return DEMO_COMPLIANCE_AUDIT;
  if (p === '/privacy/retention-policies') return DEMO_RETENTION_POLICIES;
  if (p === '/privacy/retention-candidates') return DEMO_RETENTION_CANDIDATES;
  if (p === '/privacy/access-logs') return DEMO_DATA_ACCESS_LOGS;
  if (p === '/master-data/reconcile') return DEMO_RECONCILIATION_REPORT;
  if (p === '/production/workflows' && method === 'GET') {
    const statusParam = new URLSearchParams(path.split('?')[1] ?? '').get('status');
    return statusParam ? DEMO_WORKFLOWS.filter((w) => w.status === statusParam) : DEMO_WORKFLOWS;
  }
  if (p === '/monitoring/errors') return DEMO_ERROR_LOGS;
  if (p === '/monitoring/api-performance') return DEMO_API_PERFORMANCE;
  if (p === '/monitoring/failed-operations') return DEMO_FAILED_OPERATIONS;
  if (p === '/monitoring/user-activity') return DEMO_USER_ACTIVITY;
  if (p === '/monitoring/anomalies') return DEMO_ANOMALIES;
  if (p === '/production/climate-smart/alerts') return DEMO_CLIMATE_ALERTS;

  return undefined;
}
