// Pure logic — zero DB imports, same reasoning as the scoring engines
// elsewhere in this app. Content tagged to the exact planted variety is
// more relevant than crop-wide content, so it should surface first — this
// single ranking rule is shared across guides, videos, disease
// information, and success stories rather than duplicated four times in
// the service layer.

export interface RelevanceTagged {
  crop: string;
  variety: string | null;
}

/**
 * Stable sort: exact-variety matches first (in their original relative
 * order), then crop-wide (variety === null) entries (in their original
 * relative order). Items for a different crop entirely are expected to
 * already be filtered out before this is called — this only orders
 * variety-specificity within one crop's results.
 */
export function rankByRelevance<T extends RelevanceTagged>(items: T[], variety?: string | null): T[] {
  if (!variety) return items;

  const exactMatch: T[] = [];
  const cropWide: T[] = [];
  for (const item of items) {
    if (item.variety === variety) exactMatch.push(item);
    else cropWide.push(item);
  }
  return [...exactMatch, ...cropWide];
}
