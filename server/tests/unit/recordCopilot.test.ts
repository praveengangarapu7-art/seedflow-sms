import { describe, expect, it } from 'vitest';
import { compactRecord, copilotRecordTypes, runCopilotRules } from '../../../src/ai/copilot';
import { cropStandard, cropFromCode } from '../../../src/ai/copilot/standards';
import { runCopilot } from '../../src/modules/ai/recordCopilot';

const severities = (r: { findings: { severity: string }[] }) => r.findings.map((f) => f.severity);

describe('record copilot catalogue', () => {
  it('registers every module and adds Summarise to each record type', () => {
    const types = copilotRecordTypes();
    const modules = new Set(types.map((t) => t.module));
    for (const m of ['Quality', 'Procurement', 'Laboratory', 'Processing', 'Warehouse', 'Production Planning', 'Research & Development']) {
      expect(modules.has(m)).toBe(true);
    }
    for (const t of types) expect(t.actions.some((a) => a.id === 'summarize')).toBe(true);
  });

  it('never throws on an empty record', () => {
    for (const t of copilotRecordTypes()) {
      for (const a of t.actions) {
        const r = runCopilotRules(t.key, a.id, {});
        expect(r.title).toBeTruthy();
        expect(Array.isArray(r.findings)).toBe(true);
      }
    }
  });
});

describe('standards', () => {
  it('resolves crops and aliases', () => {
    expect(cropStandard('Maize hybrid').std.germination).toBe(90);
    expect(cropStandard('Rice').key).toBe('paddy');
    expect(cropFromCode('LOT-COT-2026-0142')).toBe('cotton');
  });
});

describe('quality rules', () => {
  const ncr = {
    ncr_code: 'NCR-1', title: 'Low germination in dispatched lot', description: 'Dealer reports seed did not sprout', severity: 'major',
    lot_code: null, root_cause: null, status: 'open', capas: [], holds: [], due_date: '2020-01-01',
  };
  it('detects germination failure and asks for a linked lot', () => {
    const r = runCopilotRules('quality.ncr', 'root_cause', ncr);
    expect(r.summary).toMatch(/germination/i);
    expect(r.findings.some((f) => /No seed lot is linked/.test(f.text))).toBe(true);
    expect(r.draft?.text).toMatch(/Why 1/);
  });
  it('blocks closure without root cause or CAPA', () => {
    const r = runCopilotRules('quality.ncr', 'closure_check', ncr);
    expect(severities(r)).toContain('critical');
    expect(r.score?.value).toBeLessThan(100);
  });
  it('escalates a multi-farmer complaint and flags recall risk', () => {
    const r = runCopilotRules('quality.complaint', 'triage', {
      complaint_code: 'C-1', title: 'Off-type plants', description: 'Several farmers report off-type plants in the whole field', severity: 'minor',
      status: 'open', age_days: 9, lot_code: 'LOT-1', assigned_to: null, ncr_code: null,
    });
    expect(r.summary).toMatch(/critical/);
    expect(r.findings.some((f) => /Recall risk/.test(f.text))).toBe(true);
    expect(r.findings.some((f) => /target is 7 days/.test(f.text))).toBe(true);
  });
});

describe('procurement rules', () => {
  it('catches line arithmetic and above-estimate prices', () => {
    const r = runCopilotRules('procurement.purchase_order', 'price_check', {
      totalAmount: 1000,
      lineItems: [{ description: 'Fungicide', quantity: 10, unitPrice: 120, estimatedPrice: 100, taxPercent: 18, total: 1000 }],
    });
    expect(r.findings.some((f) => /line total/.test(f.text))).toBe(true);
    expect(r.findings.some((f) => /above the estimate/.test(f.text))).toBe(true);
  });
  it('ranks RFQ bids and warns on a suspiciously low one', () => {
    const r = runCopilotRules('procurement.rfq', 'compare_bids', {
      suppliersInvited: 3,
      bids: [
        { supplierName: 'A', unitPrice: 100, deliveryDays: 10 },
        { supplierName: 'B', unitPrice: 105, deliveryDays: 5 },
        { supplierName: 'C', unitPrice: 60, deliveryDays: 20 },
      ],
    });
    expect(r.draft?.text.split('\n')).toHaveLength(3);
    expect(r.findings.some((f) => /C is .* below the median/.test(f.text))).toBe(true);
  });
  it('flags weighbridge mismatch and moisture over spec on a GRN', () => {
    const r = runCopilotRules('procurement.grn', 'inspection_review', {
      lineItems: [{ description: 'Raw paddy', orderedQty: 100, receivedQty: 90, damagedQty: 0, acceptedQty: 90, unit: 'q' }],
      vehicleEntry: { grossWeight: 20000, tareWeight: 8000, netWeight: 11000 },
      qualityChecks: { moisture: 16, moistureSpec: { min: 0, max: 13 }, impurity: 1, impuritySpec: { min: 0, max: 2 } },
    });
    expect(r.summary).toMatch(/Hold or reject/);
  });
});

describe('operations and production rules', () => {
  it('reads lab results against crop minimums', () => {
    const r = runCopilotRules('lab.submission', 'interpret', {
      lot_code: 'LOT-MZ-1', crop: 'Maize', requested_tests: ['germination'],
      results: [{ test_type: 'germination', result_value: 85, threshold_used: 90, passed: false }],
    });
    expect(severities(r)).toContain('critical');
    expect(r.summary).toMatch(/Reject/);
  });
  it('computes processing recovery and flags high grading loss', () => {
    const r = runCopilotRules('processing.batch', 'loss_analysis', {
      id: 'BT-1', crop: 'Cotton', inputQuantity: 10000, status: 'In Progress',
      losses: { cleaning: 300, drying: 100, grading: 1500, treatment: 50, rejected: 0 },
    });
    expect(r.score?.value).toBeCloseTo(80.5, 1);
    expect(r.findings.some((f) => /Grading loss 15%/.test(f.text))).toBe(true);
  });
  it('checks seed allocation against seed rate on a crop plan', () => {
    const r = runCopilotRules('production.crop_plan', 'plan_review', {
      planCode: 'CP-1', crop: 'Maize', season: 'Kharif', targetArea: 10, seedLotAllocatedQty: 20,
      sowingDate: '2026-06-15', harvestDate: '2026-10-15', seedLotId: 'x',
    });
    expect(r.findings.some((f) => /kg\/acre allocated/.test(f.text))).toBe(true);
  });
});

describe('compactRecord', () => {
  it('drops images and bank details and caps arrays', () => {
    const out = compactRecord({ photo: 'data:image/png;base64,AAA', bankDetails: { accountNumber: '1' }, list: Array.from({ length: 40 }, (_, i) => i) }) as Record<string, unknown>;
    expect(out.photo).toBeUndefined();
    expect(out.bankDetails).toBeUndefined();
    expect((out.list as unknown[]).length).toBe(26);
  });
});

describe('runCopilot (no model configured)', () => {
  it('returns the rule result and rejects unknown actions', async () => {
    const r = await runCopilot({ recordType: 'warehouse.item', action: 'stock_advice', record: { name: 'Seed', quantity: 5, reorderPoint: 10, expiryDate: '2000-01-01' } });
    expect(r.source).toBe('rules');
    expect(severities(r)).toContain('critical');
    await expect(runCopilot({ recordType: 'warehouse.item', action: 'nope', record: {} })).rejects.toThrow();
  });
});
