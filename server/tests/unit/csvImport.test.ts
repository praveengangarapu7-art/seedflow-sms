import { describe, expect, it } from 'vitest';
import { csvRowsToRecords, mapCsvRecordToSeedLotInput, parseCsv } from '../../src/modules/seedLots/csvImport';

describe('csvImport.parseCsv', () => {
  it('parses a simple header + data rows', () => {
    const result = parseCsv('lotCode,crop,variety\nSL-1,Paddy,Gold\nSL-2,Maize,Silver\n');
    expect(result.headers).toEqual(['lotCode', 'crop', 'variety']);
    expect(result.rows).toEqual([
      ['SL-1', 'Paddy', 'Gold'],
      ['SL-2', 'Maize', 'Silver'],
    ]);
  });

  it('handles a quoted field containing a comma', () => {
    const result = parseCsv('lotCode,notes\nSL-1,"harvested, dried, and bagged"');
    expect(result.rows).toEqual([['SL-1', 'harvested, dried, and bagged']]);
  });

  it('handles an escaped double-quote inside a quoted field', () => {
    const result = parseCsv('lotCode,notes\nSL-1,"the ""best"" batch"');
    expect(result.rows).toEqual([['SL-1', 'the "best" batch']]);
  });

  it('handles a quoted field containing an embedded newline', () => {
    const result = parseCsv('lotCode,notes\nSL-1,"line one\nline two"');
    expect(result.rows).toEqual([['SL-1', 'line one\nline two']]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsv('lotCode,crop\r\nSL-1,Paddy\r\n');
    expect(result.rows).toEqual([['SL-1', 'Paddy']]);
  });

  it('treats characters after a closing quote as outside the quoted field', () => {
    const result = parseCsv('lotCode,notes,extra\nSL-1,"quoted value",tail\n');
    expect(result.rows).toEqual([['SL-1', 'quoted value', 'tail']]);
  });

  it('parses a single-column CSV without treating real rows as blank', () => {
    const result = parseCsv('lotCode\nSL-1\nSL-2\n');
    expect(result.headers).toEqual(['lotCode']);
    expect(result.rows).toEqual([['SL-1'], ['SL-2']]);
  });

  it('skips a blank line between data rows', () => {
    const result = parseCsv('lotCode,crop\nSL-1,Paddy\n\nSL-2,Maize\n');
    expect(result.rows).toEqual([
      ['SL-1', 'Paddy'],
      ['SL-2', 'Maize'],
    ]);
  });

  it('skips a trailing blank line at the end of the file', () => {
    const result = parseCsv('lotCode,crop\nSL-1,Paddy\n\n');
    expect(result.rows).toEqual([['SL-1', 'Paddy']]);
  });

  it('flushes a final row ending in a trailing empty field, with no closing newline', () => {
    const result = parseCsv('lotCode,crop\nSL-1,');
    expect(result.rows).toEqual([['SL-1', '']]);
  });

  it('flushes a final single-column row with no comma and no closing newline', () => {
    const result = parseCsv('lotCode\nSL-1');
    expect(result.rows).toEqual([['SL-1']]);
  });

  it('strips a leading BOM before parsing headers', () => {
    const bom = String.fromCharCode(0xfeff);
    const result = parseCsv(`${bom}lotCode,crop\nSL-1,Paddy\n`);
    expect(result.headers).toEqual(['lotCode', 'crop']);
    expect(result.rows).toEqual([['SL-1', 'Paddy']]);
  });

  it('does not strip a BOM-like character that is not at the very start of the file', () => {
    const bom = String.fromCharCode(0xfeff);
    const result = parseCsv(`lotCode,cr${bom}op\nSL-1,Paddy\n`);
    expect(result.headers).toEqual(['lotCode', `cr${bom}op`]);
  });

  it('parses the final row even without a trailing newline', () => {
    const result = parseCsv('lotCode,crop\nSL-1,Paddy');
    expect(result.rows).toEqual([['SL-1', 'Paddy']]);
  });

  it('trims header names', () => {
    const result = parseCsv(' lotCode , crop \nSL-1,Paddy');
    expect(result.headers).toEqual(['lotCode', 'crop']);
  });

  it('returns empty headers and rows for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
  });

  it('returns empty rows for a header-only file', () => {
    const result = parseCsv('lotCode,crop\n');
    expect(result.headers).toEqual(['lotCode', 'crop']);
    expect(result.rows).toEqual([]);
  });
});

describe('csvImport.csvRowsToRecords', () => {
  it('maps rows to lower-cased-header records, trimming values', () => {
    const records = csvRowsToRecords(['LotCode', ' Crop '], [[' SL-1 ', 'Paddy']]);
    expect(records).toEqual([{ lotcode: 'SL-1', crop: 'Paddy' }]);
  });

  it('fills missing trailing columns with an empty string', () => {
    const records = csvRowsToRecords(['lotCode', 'crop', 'variety'], [['SL-1', 'Paddy']]);
    expect(records).toEqual([{ lotcode: 'SL-1', crop: 'Paddy', variety: '' }]);
  });

  it('ignores extra columns beyond the header count', () => {
    const records = csvRowsToRecords(['lotCode'], [['SL-1', 'Paddy', 'extra']]);
    expect(records).toEqual([{ lotcode: 'SL-1' }]);
  });
});

describe('csvImport.mapCsvRecordToSeedLotInput', () => {
  const validRecord = { lotcode: 'SL-1', crop: 'Paddy', variety: 'Gold', quantitytotal: '500' };

  it('maps a valid record to a CreateSeedLotInput', () => {
    const result = mapCsvRecordToSeedLotInput(validRecord);
    expect(result.error).toBeUndefined();
    expect(result.input).toEqual({
      lotCode: 'SL-1',
      crop: 'Paddy',
      variety: 'Gold',
      quantityTotal: 500,
      parentLotId: undefined,
      stage: undefined,
      unit: undefined,
      sourceFarmId: undefined,
      notes: undefined,
      lowStockThreshold: undefined,
      productionDate: undefined,
      organizationId: undefined,
    });
  });

  it('reports every missing required column by name', () => {
    const result = mapCsvRecordToSeedLotInput({ lotcode: '', crop: '', variety: 'Gold', quantitytotal: '' });
    expect(result.input).toBeUndefined();
    expect(result.error).toBe('Missing required column(s): lotcode, crop, quantitytotal');
  });

  it('rejects a non-numeric quantityTotal', () => {
    const result = mapCsvRecordToSeedLotInput({ ...validRecord, quantitytotal: 'not-a-number' });
    expect(result.error).toMatch(/quantityTotal/);
  });

  it('rejects a negative quantityTotal', () => {
    const result = mapCsvRecordToSeedLotInput({ ...validRecord, quantitytotal: '-5' });
    expect(result.error).toMatch(/quantityTotal/);
  });

  it('accepts a quantityTotal of exactly zero', () => {
    const result = mapCsvRecordToSeedLotInput({ ...validRecord, quantitytotal: '0' });
    expect(result.error).toBeUndefined();
    expect(result.input?.quantityTotal).toBe(0);
  });

  it('passes through optional columns when present', () => {
    const result = mapCsvRecordToSeedLotInput({
      ...validRecord,
      parentlotid: 'parent-id',
      stage: 'Foundation',
      unit: 'kg',
      sourcefarmid: 'farm-id',
      notes: 'note text',
      lowstockthreshold: '50',
      productiondate: '2026-01-01',
      organizationid: 'org-id',
    });
    expect(result.input).toMatchObject({
      parentLotId: 'parent-id',
      stage: 'Foundation',
      unit: 'kg',
      sourceFarmId: 'farm-id',
      notes: 'note text',
      lowStockThreshold: 50,
      productionDate: '2026-01-01',
      organizationId: 'org-id',
    });
  });

  it('rejects a non-numeric lowStockThreshold', () => {
    const result = mapCsvRecordToSeedLotInput({ ...validRecord, lowstockthreshold: 'not-a-number' });
    expect(result.error).toMatch(/lowStockThreshold/);
  });
});
