/**
 * Record-level AI ("AI assist") shared between the browser and the API.
 *
 * This folder is deliberately dependency-free (no React, no `@/` aliases, no
 * Node APIs) because two builds import it:
 *   - the Vite frontend, which runs the rules locally when the API is
 *     unreachable (demo mode, offline field work), and
 *   - the Express server (server/src/modules/ai/recordCopilot.ts), which runs
 *     the same rules and, when an AI model is configured, asks the model to
 *     refine them.
 * Keeping one copy of the rules means the offline answer and the server's
 * fallback can never drift apart.
 */

export type CopilotSeverity = 'critical' | 'warning' | 'info' | 'good';
export type CopilotTone = 'bad' | 'warn' | 'good' | 'neutral';

/** Any record a page is showing: an API row or a mock object. */
export type CopilotRecord = Record<string, unknown>;

export interface CopilotFinding {
  severity: CopilotSeverity;
  text: string;
}

export interface CopilotScore {
  label: string;
  value: number;
  max: number;
  tone: CopilotTone;
}

export interface CopilotDraft {
  label: string;
  text: string;
}

/** What one rule run produces before the server or client stamps the metadata. */
export interface CopilotOutput {
  title: string;
  summary: string;
  score?: CopilotScore | null;
  findings: CopilotFinding[];
  suggestions: string[];
  draft?: CopilotDraft | null;
}

export interface CopilotResult extends CopilotOutput {
  recordType: string;
  action: string;
  actionLabel: string;
  source: 'rules' | 'model';
  model: string | null;
  generatedAt: string;
  /** True when the browser produced this without reaching the API. */
  offline?: boolean;
}

export interface CopilotActionInfo {
  id: string;
  label: string;
  description: string;
  /** Instruction the model gets on top of the rule output, when one is connected. */
  modelTask: string;
}

export interface CopilotAction extends CopilotActionInfo {
  run: (record: CopilotRecord) => CopilotOutput;
}

export interface CopilotRecordType {
  key: string;
  label: string;
  module: string;
  actions: CopilotAction[];
}
