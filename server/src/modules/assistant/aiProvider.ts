import { env } from '../../config/env';

/**
 * Thin adapter over the hosted chat APIs, written against each provider's
 * plain HTTP interface rather than an SDK — this repo has no AI SDK
 * dependency, and adding three of them (plus their transitive trees) to ship
 * one optional feature is not a good trade. `fetch` is available natively on
 * the Node version this server targets.
 *
 * The important property: isConfigured() is false unless a real API key was
 * supplied, and callers are expected to fall back to the deterministic engine
 * rather than surfacing an error. The assistant must never be *dependent* on
 * an external service being reachable.
 */

export type AiProviderName = 'anthropic' | 'openai' | 'gemini';

const DEFAULT_MODEL: Record<AiProviderName, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
};

function providerName(): AiProviderName {
  const raw = (env.aiProvider || 'anthropic').toLowerCase();
  return raw === 'openai' || raw === 'gemini' ? raw : 'anthropic';
}

export function isConfigured(): boolean {
  return Boolean(env.aiApiKey && env.aiApiKey.trim().length > 0);
}

export function activeModelName(): string {
  return env.aiModel?.trim() || DEFAULT_MODEL[providerName()];
}

export class AiProviderError extends Error {}

/** Aborts a hung provider call so a slow model can never hang a request. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.aiApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: activeModelName(),
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!response.ok) throw new AiProviderError(`Anthropic API returned ${response.status}`);
  const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = (payload.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
    .trim();
  if (!text) throw new AiProviderError('Anthropic API returned no text content');
  return text;
}

async function callOpenAi(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify({
      model: activeModelName(),
      max_tokens: 900,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!response.ok) throw new AiProviderError(`OpenAI API returned ${response.status}`);
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiProviderError('OpenAI API returned no content');
  return text;
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const model = activeModelName();
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.aiApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 900 },
      }),
    },
  );
  if (!response.ok) throw new AiProviderError(`Gemini API returned ${response.status}`);
  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new AiProviderError('Gemini API returned no content');
  return text;
}

export async function generateAnswer(systemPrompt: string, userMessage: string): Promise<string> {
  if (!isConfigured()) throw new AiProviderError('No AI API key configured');
  switch (providerName()) {
    case 'openai':
      return callOpenAi(systemPrompt, userMessage);
    case 'gemini':
      return callGemini(systemPrompt, userMessage);
    default:
      return callAnthropic(systemPrompt, userMessage);
  }
}
