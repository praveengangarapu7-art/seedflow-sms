import type { CreateSeedLotInput } from './seedLots.types';

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

/**
 * Minimal RFC4180-style CSV parser: quoted fields (with embedded commas or
 * newlines), escaped quotes ("" inside a quoted field), and either \r\n or
 * \n line endings. The seed-lot import format is a plain table, so this
 * doesn't justify pulling in an external CSV dependency.
 */
export function parseCsv(text: string): CsvParseResult {
  const normalized = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = normalized.length;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  // Flushes a final row/field left over when the input doesn't end in a
  // newline. Skipping this guard when nothing is pending only ever pushes a
  // trivial empty row, which the blank-row filter below removes anyway —
  // an accepted equivalent mutant, not a real gap.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  const [headerRow, ...dataRows] = nonEmptyRows;
  if (!headerRow) {
    return { headers: [], rows: [] };
  }
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows };
}

export function csvRowsToRecords(headers: string[], rows: string[][]): Record<string, string>[] {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  return rows.map((row) =>
    normalizedHeaders.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = (row[index] ?? '').trim();
      return acc;
    }, {}),
  );
}

export interface SeedLotCsvMapResult {
  input?: CreateSeedLotInput;
  error?: string;
}

const REQUIRED_COLUMNS = ['lotcode', 'crop', 'variety', 'quantitytotal'];

/**
 * Maps one CSV record (already lower-cased header keys) to a
 * CreateSeedLotInput, or a human-readable error — never throws, since a bad
 * row in an otherwise-good CSV file should fail only that row.
 */
export function mapCsvRecordToSeedLotInput(record: Record<string, string>): SeedLotCsvMapResult {
  const missing = REQUIRED_COLUMNS.filter((col) => !record[col]);
  if (missing.length > 0) {
    return { error: `Missing required column(s): ${missing.join(', ')}` };
  }

  const quantityTotal = Number(record.quantitytotal);
  if (!Number.isFinite(quantityTotal) || quantityTotal < 0) {
    return { error: `quantityTotal "${record.quantitytotal}" is not a valid non-negative number` };
  }

  let lowStockThreshold: number | undefined;
  if (record.lowstockthreshold) {
    lowStockThreshold = Number(record.lowstockthreshold);
    if (!Number.isFinite(lowStockThreshold)) {
      return { error: `lowStockThreshold "${record.lowstockthreshold}" is not a valid number` };
    }
  }

  return {
    input: {
      lotCode: record.lotcode,
      crop: record.crop,
      variety: record.variety,
      quantityTotal,
      parentLotId: record.parentlotid || undefined,
      stage: record.stage || undefined,
      unit: record.unit || undefined,
      sourceFarmId: record.sourcefarmid || undefined,
      notes: record.notes || undefined,
      lowStockThreshold,
      productionDate: record.productiondate || undefined,
      organizationId: record.organizationid || undefined,
    },
  };
}
