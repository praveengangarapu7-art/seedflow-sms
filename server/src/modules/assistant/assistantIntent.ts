import type { AssistantIntent } from './assistant.types';

/**
 * Keyword-scored intent classification.
 *
 * Deliberately dependency-free and pure (no DB, no network), for the same
 * reason labTesting.validation.ts is: it can be unit-tested in isolation, and
 * it is the piece that must keep working when no AI model is configured.
 *
 * This is NOT trying to be a language model. It maps a question onto the
 * handful of topics the app can answer with real data; anything it can't
 * place falls through to 'general', which still gets a real snapshot.
 */

const INTENT_KEYWORDS: Record<Exclude<AssistantIntent, 'general'>, string[]> = {
  low_stock: ['low stock', 'running out', 'running low', 'restock', 'short of', 'shortage', 'depleted', 'need more'],
  expiring_lots: ['expired', 'expiring', 'expiry', 'shelf life', 'past date', 'out of date', 'stale'],
  lab_failures: ['fail', 'failed', 'failing', 'below threshold', 'rejected', 'quality flag', 'quality issue', 'bad result', 'did not pass'],
  lab_pending: ['lab', 'testing', 'test result', 'germination', 'purity', 'vigor', 'submission', 'in progress', 'overdue', 'turnaround'],
  demand_gap: ['demand', 'forecast', 'gap', 'procure', 'procurement', 'purchase order', 'buy', 'order more', 'supply'],
  pending_requests: ['request', 'farmer', 'pending approval', 'awaiting', 'approve', 'allocation request'],
  inventory_summary: ['inventory', 'stock', 'how much', 'how many', 'total', 'available', 'on hand', 'summary'],
  storage_overview: ['storage', 'warehouse', 'zone', 'cold storage', 'capacity', 'temperature', 'humidity'],
  module_help: ['how do i', 'how to', 'where is', 'where can i', 'which page', 'navigate', 'find the', 'what module'],
};

export function classifyIntent(question: string): AssistantIntent {
  const q = question.toLowerCase();
  let best: AssistantIntent = 'general';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [AssistantIntent, string[]][]) {
    let score = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword)) {
        // Longer keyword matches are stronger evidence than incidental short
        // ones ("lab" alone is weak; "quality flag" is decisive).
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return best;
}

/** Follow-up prompts offered after an answer, tailored to what was just asked. */
export function suggestionsFor(intent: AssistantIntent): string[] {
  switch (intent) {
    case 'low_stock':
      return ['Which crops are most affected?', 'What is our demand gap?', 'Show inventory by crop'];
    case 'expiring_lots':
      return ['Show storage zones', 'Which lots are low on stock?', 'What is in cold storage?'];
    case 'lab_failures':
      return ['Which lab submissions are still open?', 'Show unresolved quality flags', 'How is each lab performing?'];
    case 'lab_pending':
      return ['Any failing lab results?', 'Which submissions are overdue?', 'Show inventory by crop'];
    case 'demand_gap':
      return ['Which lots are low on stock?', 'Show purchase order pipeline', 'Show inventory by crop'];
    case 'pending_requests':
      return ['Which lots are low on stock?', 'Show inventory by crop', 'Any failing lab results?'];
    case 'inventory_summary':
      return ['Which lots are low on stock?', 'What is expiring?', 'Show storage zones'];
    case 'storage_overview':
      return ['What is expiring?', 'Show inventory by crop', 'Which lots are low on stock?'];
    case 'module_help':
      return ['What can you help me with?', 'Show me a snapshot', 'Which lots are low on stock?'];
    default:
      return ['Which lots are low on stock?', 'Any failing lab results?', 'Show inventory by crop'];
  }
}
