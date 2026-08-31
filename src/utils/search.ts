import {
  SEARCH_INDEX,
  MODULE_ORDER,
  type SearchEntry,
  type SearchModule,
} from '@/data/searchIndex';
import { hasPermission, type Permission } from '@/utils/permissions';
import type { UserRole } from '@/types';

/**
 * Relevance search over the SeedSphere catalogue.
 *
 * Deliberately dependency-free: the index is small enough (~120 entries) that a
 * scored linear scan is instant, and it keeps behaviour identical on the public
 * site and inside the app.
 */

export interface Range {
  start: number;
  end: number;
}

export interface SearchResult {
  entry: SearchEntry;
  score: number;
  /** Character ranges in `entry.title` that matched, for highlighting. */
  titleRanges: Range[];
  /** True when the viewer must sign in before this result opens. */
  locked: boolean;
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'for', 'my', 'me']);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[&/\\_]/g, ' ')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(query: string): string[] {
  const raw = normalize(query).split(' ').filter(Boolean);
  const meaningful = raw.filter((t) => !STOP_WORDS.has(t));
  // If someone types only stop words ("the"), fall back to what they typed.
  return meaningful.length > 0 ? meaningful : raw;
}

/** "Purchase Requisitions" -> "pr", so `pr` finds it. */
function acronym(title: string): string {
  return normalize(title)
    .split(' ')
    .map((word) => word[0] ?? '')
    .join('');
}

function isWordStart(haystack: string, index: number): boolean {
  if (index === 0) return true;
  return /[\s.\-/]/.test(haystack[index - 1] ?? '');
}

/**
 * Score one token against one entry. Returns 0 when the token appears nowhere,
 * which lets the caller treat the query as AND across tokens.
 */
function scoreToken(token: string, fields: EntryFields): number {
  let score = 0;

  const titleIdx = fields.title.indexOf(token);
  if (titleIdx !== -1) {
    if (fields.title === token) score += 220;
    else if (titleIdx === 0) score += 150;
    else if (isWordStart(fields.title, titleIdx)) score += 110;
    else score += 55;
    // Longer overlaps of the title are stronger signals than one-letter hits.
    score += Math.min(30, Math.round((token.length / fields.title.length) * 30));
  }

  // "po" should land on Purchase Orders, not on anything containing "po".
  if (token.length >= 2) {
    if (fields.acronym === token) score += 200;
    else if (fields.acronym.startsWith(token)) score += 90;
  }

  for (const keyword of fields.keywords) {
    if (keyword === token) {
      score += 85;
      break;
    }
    const idx = keyword.indexOf(token);
    if (idx === 0) {
      score += 60;
      break;
    }
    if (idx > 0 && isWordStart(keyword, idx)) {
      score += 40;
      break;
    }
  }

  if (fields.module.includes(token)) score += 45;

  const descIdx = fields.description.indexOf(token);
  if (descIdx !== -1) score += isWordStart(fields.description, descIdx) ? 26 : 10;

  if (fields.path.includes(token)) score += 20;

  if (score === 0) {
    // Last resort: tolerate a typo or a partial word against the title only,
    // so "requsition" or "invento" still land somewhere sensible.
    if (token.length >= 4 && fuzzyContains(fields.title, token)) score += 18;
  }

  return score;
}

/** Subsequence match — every character of `token` appears in order in `text`. */
function fuzzyContains(text: string, token: string): boolean {
  let ti = 0;
  for (let i = 0; i < text.length && ti < token.length; i += 1) {
    if (text[i] === token[ti]) ti += 1;
  }
  return ti === token.length;
}

interface EntryFields {
  title: string;
  description: string;
  keywords: string[];
  module: string;
  path: string;
  acronym: string;
}

/** Normalised text for each entry, computed once at module load. */
const FIELD_CACHE = new Map<string, EntryFields>(
  SEARCH_INDEX.map((entry) => [
    entry.id,
    {
      title: normalize(entry.title),
      description: normalize(entry.description),
      keywords: entry.keywords.map(normalize),
      module: normalize(entry.module),
      path: normalize(entry.path),
      acronym: acronym(entry.title),
    },
  ]),
);

function titleHighlightRanges(title: string, tokens: string[]): Range[] {
  const lower = title.toLowerCase();
  const ranges: Range[] = [];

  for (const token of tokens) {
    let from = 0;
    while (from <= lower.length - token.length) {
      const idx = lower.indexOf(token, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + token.length });
      from = idx + token.length;
    }
  }

  if (ranges.length === 0) return ranges;

  // Merge overlaps so highlighting never double-wraps a character.
  ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [ranges[0]!];
  for (const range of ranges.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push(range);
  }
  return merged;
}

export interface SearchOptions {
  /** Signed-in viewer, so we can hide what their role cannot open. */
  isAuthenticated: boolean;
  role?: UserRole;
  /** Restrict to one module. */
  module?: SearchModule | 'all';
  limit?: number;
}

/**
 * Visibility rules, in one place:
 *  - Signed out: everything is listed. Protected entries come back `locked`, and
 *    the UI routes those through login with a redirect.
 *  - Signed in: entries the role has no permission for are dropped, so nobody
 *    is offered a door that will slam in their face.
 */
function isVisible(entry: SearchEntry, options: SearchOptions): boolean {
  if (!entry.requiresAuth) return true;
  if (!options.isAuthenticated) return true;
  if (!entry.permission) return true;
  if (!options.role) return true;
  return hasPermission(options.role, entry.permission as Permission);
}

export function searchProduct(query: string, options: SearchOptions): SearchResult[] {
  const tokens = tokenize(query);
  const moduleFilter = options.module && options.module !== 'all' ? options.module : null;

  const pool = SEARCH_INDEX.filter(
    (entry) => isVisible(entry, options) && (!moduleFilter || entry.module === moduleFilter),
  );

  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of pool) {
    const fields = FIELD_CACHE.get(entry.id);
    if (!fields) continue;

    let total = 0;
    let matchedAll = true;

    for (const token of tokens) {
      const tokenScore = scoreToken(token, fields);
      if (tokenScore === 0) {
        matchedAll = false;
        break;
      }
      total += tokenScore;
    }

    if (!matchedAll) continue;

    // Whole-phrase hits in the title beat scattered token hits.
    const phrase = tokens.join(' ');
    if (tokens.length > 1 && fields.title.includes(phrase)) total += 120;

    total += (entry.boost ?? 0) * 12;
    if (entry.kind === 'page') total += 6;

    results.push({
      entry,
      score: total,
      titleRanges: titleHighlightRanges(entry.title, tokens),
      locked: entry.requiresAuth && !options.isAuthenticated,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const moduleDelta =
      MODULE_ORDER.indexOf(a.entry.module) - MODULE_ORDER.indexOf(b.entry.module);
    if (moduleDelta !== 0) return moduleDelta;
    return a.entry.title.localeCompare(b.entry.title);
  });

  return typeof options.limit === 'number' ? results.slice(0, options.limit) : results;
}

export interface ResultGroup {
  module: SearchModule;
  results: SearchResult[];
}

/**
 * Group results by module, keeping each module's internal ranking.
 *
 * Groups are ordered by their strongest hit, not by a fixed module order — so a
 * query like "seed lot" leads with Production rather than burying it under a
 * weak Platform match. MODULE_ORDER only breaks ties.
 */
export function groupByModule(results: SearchResult[]): ResultGroup[] {
  const buckets = new Map<SearchModule, SearchResult[]>();
  for (const result of results) {
    const list = buckets.get(result.entry.module);
    if (list) list.push(result);
    else buckets.set(result.entry.module, [result]);
  }

  return [...buckets.entries()]
    .map(([module, moduleResults]) => ({ module, results: moduleResults }))
    .sort((a, b) => {
      const best = (group: ResultGroup) =>
        group.results.reduce((max, r) => Math.max(max, r.score), 0);
      const delta = best(b) - best(a);
      if (delta !== 0) return delta;
      return MODULE_ORDER.indexOf(a.module) - MODULE_ORDER.indexOf(b.module);
    });
}

/** Modules that currently have at least one hit, for the filter chips. */
export function modulesPresent(results: SearchResult[]): SearchModule[] {
  const seen = new Set<SearchModule>(results.map((r) => r.entry.module));
  return MODULE_ORDER.filter((module) => seen.has(module));
}

export function entryById(id: string): SearchEntry | undefined {
  return SEARCH_INDEX.find((entry) => entry.id === id);
}

/**
 * Where a click should actually go.
 * Locked results detour through login carrying a redirect, so signing in lands
 * the user on the page they searched for rather than a generic dashboard.
 */
export function resolveTarget(result: SearchResult): string {
  if (result.locked) return `/login?redirect=${encodeURIComponent(result.entry.path)}`;
  return result.entry.path;
}
