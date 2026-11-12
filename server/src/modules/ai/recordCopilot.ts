import { ValidationError } from '../../errors';
import { AiProviderError, activeModelName, extractJson, generateFromParts, isConfigured } from '../assistant/aiProvider';
// Shared with the frontend so the browser's offline answer and this
// fallback are always the same rules (see src/ai/copilot/types.ts).
import {
  compactRecord,
  copilotRecordTypes,
  findCopilotAction,
  runCopilotRules,
  type CopilotFinding,
  type CopilotRecord,
  type CopilotResult,
  type CopilotSeverity,
} from '../../../../src/ai/copilot';

/**
 * Record-level AI ("AI assist" on every detail page).
 *
 * Same contract as the rest of the AI Center:
 *  1. The deterministic rules always run first, so every number, threshold
 *     and flag is computed and reproducible.
 *  2. If a model is configured, it gets the record plus the rule output and
 *     may refine the wording, add findings and write drafts, but is told to
 *     use only facts in the record. Any model failure falls back to (1).
 * Nothing is stored; the page sends the record it is showing.
 */

const MAX_RECORD_CHARS = 120_000;
const SEVERITIES: CopilotSeverity[] = ['critical', 'warning', 'info', 'good'];

export interface CopilotRequest {
  recordType?: unknown;
  action?: unknown;
  record?: unknown;
  question?: unknown;
}

export function copilotCatalog() {
  return { configured: isConfigured(), model: isConfigured() ? activeModelName('fast') : null, types: copilotRecordTypes() };
}

function systemPrompt(module: string, label: string, task: string): string {
  return (
    `You are the AI analyst inside SeedSphere, a seed quality and compliance ERP used by seed companies in India, working in the ${module} module on a ${label} record. ` +
    `${task} ` +
    'You receive the record as JSON and the analysis already computed by SeedSphere\'s rules engine. Rules: use only facts present in the record or the rule analysis; ' +
    'never invent numbers, codes, names or dates; keep every rule finding that is correct (you may reword it); add findings only when the record supports them; ' +
    'follow Indian seed regulation (Seeds Act 1966, Seeds Rules 1968, Seeds Control Order 1983) and the Indian Minimum Seed Certification Standards where relevant, and say "confirm with the current standard" for any limit. ' +
    'Write plainly for a busy manager. Reply with ONLY a JSON object: ' +
    '{"title": string, "summary": string (max 2 sentences), "findings": [{"severity": "critical"|"warning"|"info"|"good", "text": string}], ' +
    '"suggestions": [string], "draft": {"label": string, "text": string} | null}. At most 8 findings and 6 suggestions, each under 40 words.'
  );
}

function sanitizeFindings(value: unknown, fallback: CopilotFinding[]): CopilotFinding[] {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .map((f) => ({ severity: SEVERITIES.includes(f?.severity) ? (f.severity as CopilotSeverity) : 'info', text: String(f?.text ?? '').trim() }))
    .filter((f) => f.text)
    .slice(0, 8);
  return list.length ? list : fallback;
}

function readRecord(value: unknown): CopilotRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('record must be an object');
  if (JSON.stringify(value).length > MAX_RECORD_CHARS) throw new ValidationError('record is too large to analyse');
  return value as CopilotRecord;
}

export async function runCopilot(input: CopilotRequest): Promise<CopilotResult> {
  const recordType = String(input.recordType ?? '').trim();
  const question = typeof input.question === 'string' ? input.question.trim().slice(0, 600) : '';
  const actionId = question ? 'ask' : String(input.action ?? '').trim();
  const record = readRecord(input.record);

  // A free-text question is answered by the model over the record; the
  // summary rules are the fallback when no model is connected.
  const ruleAction = actionId === 'ask' ? 'summarize' : actionId;
  const found = findCopilotAction(recordType, ruleAction);
  if (!found) throw new ValidationError(`No AI action "${actionId}" for record type "${recordType}"`);

  const rules = runCopilotRules(recordType, ruleAction, record);
  if (actionId === 'ask') {
    rules.action = 'ask';
    rules.actionLabel = 'Question';
  }
  if (!isConfigured()) {
    if (actionId === 'ask') {
      rules.findings = [{ severity: 'info', text: 'Free-text questions need an AI model. Set AI_API_KEY on the server; meanwhile, here is the rule-based summary.' }, ...rules.findings];
    }
    return rules;
  }

  const task = actionId === 'ask' ? `Answer the user's question about this record: "${question}". Put the direct answer in "summary".` : found.action.modelTask;
  try {
    const raw = await generateFromParts(
      systemPrompt(found.type.module, found.type.label, task),
      [
        {
          type: 'text',
          text: JSON.stringify({
            record: compactRecord(record),
            ruleAnalysis: { title: rules.title, summary: rules.summary, score: rules.score, findings: rules.findings, suggestions: rules.suggestions, draft: rules.draft },
          }),
        },
      ],
      1400,
    );
    const parsed = extractJson<Partial<CopilotResult>>(raw);
    if (!parsed) throw new AiProviderError('model reply was not JSON');
    const draft = parsed.draft && typeof parsed.draft === 'object' && String(parsed.draft.text ?? '').trim()
      ? { label: String(parsed.draft.label ?? rules.draft?.label ?? 'Draft'), text: String(parsed.draft.text) }
      : rules.draft ?? null;
    return {
      ...rules,
      title: String(parsed.title ?? rules.title).slice(0, 120),
      summary: String(parsed.summary ?? rules.summary).slice(0, 800),
      findings: sanitizeFindings(parsed.findings, rules.findings),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).filter(Boolean).slice(0, 6) : rules.suggestions,
      draft,
      // The score is always the computed one; the model never sets numbers.
      score: rules.score ?? null,
      source: 'model',
      model: activeModelName('fast'),
    };
  } catch (error) {
    if (!(error instanceof AiProviderError)) console.error('[ai] record copilot model call failed', error);
    return rules;
  }
}
