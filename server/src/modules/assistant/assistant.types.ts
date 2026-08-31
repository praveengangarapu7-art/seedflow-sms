/**
 * SeedSphere AI Assistant — shared types.
 *
 * Design rule for this whole module: it is STRICTLY READ-ONLY. Every query
 * below is a SELECT. The assistant never writes, and deliberately exposes no
 * service function that could mutate state, so an LLM (which can be steered
 * by whatever a user types) can never be talked into changing data.
 */

export const ASSISTANT_INTENTS = [
  'low_stock',
  'expiring_lots',
  'lab_failures',
  'lab_pending',
  'demand_gap',
  'pending_requests',
  'inventory_summary',
  'storage_overview',
  'module_help',
  'general',
] as const;
export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number];

/** A record the answer was actually derived from, so every claim is traceable. */
export interface AssistantCitation {
  label: string;
  module: string;
  /** Front-end route the user can jump to. */
  path: string;
  detail?: string;
}

export interface AssistantContextBlock {
  /** Short human-readable heading, also used as the section title in the prompt. */
  title: string;
  /** Rows already flattened to primitives — never raw DB objects. */
  rows: Record<string, string | number | boolean | null>[];
  /** Where this data came from, for citations. */
  module: string;
  path: string;
}

export interface AssistantAnswer {
  answer: string;
  intent: AssistantIntent;
  citations: AssistantCitation[];
  /** 'model' when an external LLM produced the prose, 'rules' when the
   *  deterministic engine did. Surfaced in the UI so nobody mistakes a
   *  fallback answer for a model answer. */
  source: 'model' | 'rules';
  modelName: string | null;
  suggestions: string[];
}

export interface AskAssistantInput {
  question: string;
  /** Optional current route, so "what's on this page" style questions work. */
  currentPath?: string;
}
