import { describe, expect, it } from 'vitest';
import { classifyIntent, suggestionsFor } from '../../src/modules/assistant/assistantIntent';

describe('assistant intent classification', () => {
  it('routes stock-shortage phrasings to low_stock', () => {
    expect(classifyIntent('which lots are low stock?')).toBe('low_stock');
    expect(classifyIntent('are we running out of anything')).toBe('low_stock');
    expect(classifyIntent('what do I need to restock')).toBe('low_stock');
  });

  it('routes failure phrasings to lab_failures rather than the weaker lab_pending', () => {
    // "quality flag" is a long, decisive keyword; it must beat a bare "lab".
    expect(classifyIntent('show me lab quality flag issues')).toBe('lab_failures');
    expect(classifyIntent('which tests failed')).toBe('lab_failures');
  });

  it('routes open-work phrasings to lab_pending', () => {
    expect(classifyIntent('what germination tests are in progress')).toBe('lab_pending');
    expect(classifyIntent('any overdue lab submission')).toBe('lab_pending');
  });

  it('recognises the remaining topics', () => {
    expect(classifyIntent('what is our demand forecast gap')).toBe('demand_gap');
    expect(classifyIntent('show me expired seed')).toBe('expiring_lots');
    expect(classifyIntent('what storage zones do we have')).toBe('storage_overview');
    expect(classifyIntent('how do i navigate to trials')).toBe('module_help');
  });

  it('falls back to general for questions it cannot place', () => {
    expect(classifyIntent('hello there')).toBe('general');
    expect(classifyIntent('')).toBe('general');
  });

  it('always offers follow-up suggestions for every intent', () => {
    for (const question of ['low stock', 'failed test', 'hello', 'storage zone']) {
      const suggestions = suggestionsFor(classifyIntent(question));
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every((s) => typeof s === 'string' && s.length > 0)).toBe(true);
    }
  });
});
