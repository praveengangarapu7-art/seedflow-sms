import { describe, expect, it } from 'vitest';
import { scoreLot, type LotRow } from '../../src/modules/ai/ai.service';
import { extractJson } from '../../src/modules/assistant/aiProvider';

const base: LotRow = {
  id: 'lot-1',
  lot_code: 'SL-T-1',
  crop: 'Maize',
  variety: 'Test Hybrid',
  stage: 'Certified',
  testing_status: 'certified',
  quantity_total: 1000,
  quantity_allocated: 200,
  unit: 'kg',
  age_days: 30,
  germination: 97,
  purity: 99.2,
  viability: 98,
  open_flags: 0,
};

describe('AI Center lot risk scoring', () => {
  it('scores a fresh, certified, well-above-standard lot as low risk', () => {
    const r = scoreLot(base);
    expect(r.riskLevel).toBe('low');
    expect(r.riskScore).toBe(0);
    expect(r.quantityAvailable).toBe(800);
    expect(r.recommendation).toBe('No action needed.');
  });

  it('flags germination below the crop minimum as critical and recommends a hold', () => {
    const r = scoreLot({ ...base, germination: 84 });
    expect(r.minGermination).toBe(90);
    expect(r.riskLevel).toBe('critical');
    expect(r.factors[0].label).toMatch(/below the 90% minimum/);
    expect(r.recommendation).toMatch(/^Hold the lot/);
  });

  it('uses crop-specific minimums (cotton 65%) rather than one global threshold', () => {
    const r = scoreLot({ ...base, crop: 'Cotton', germination: 75 });
    expect(r.minGermination).toBe(65);
    expect(r.factors.some((f) => /below/.test(f.label))).toBe(false);
  });

  it('forecasts germination decline and recommends selling first when it will cross the minimum', () => {
    const r = scoreLot({ ...base, crop: 'Soybean', germination: 74, viability: 75 });
    // soybean declines ~2 points a month -> 74 - 6 = 68 < 70
    expect(r.predictedGermination90d).toBe(68);
    expect(r.recommendation).toMatch(/^Sell first/);
  });

  it('adds risk for missing tests, rejection, ageing and open flags, capped at 100', () => {
    const r = scoreLot({ ...base, germination: null, testing_status: 'rejected', age_days: 300, open_flags: 3 });
    expect(r.riskScore).toBe(80); // 25 + 20 + 15 + 20
    expect(r.riskLevel).toBe('critical');
    const worst = scoreLot({ ...base, germination: 60, purity: 90, testing_status: 'rejected', age_days: 300, open_flags: 3 });
    expect(worst.riskScore).toBe(100);
  });
});

describe('extractJson', () => {
  it('reads a bare object', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it('reads an object inside a fenced block with surrounding prose', () => {
    expect(extractJson<{ ok: boolean }>('Here you go:\n```json\n{"ok":true}\n```\nThanks')).toEqual({ ok: true });
  });
  it('returns null for text without JSON', () => {
    expect(extractJson('no json here')).toBeNull();
  });
});
