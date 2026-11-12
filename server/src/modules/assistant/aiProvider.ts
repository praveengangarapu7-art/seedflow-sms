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

export type AiProviderName = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible';
export type AiTask = 'chat' | 'fast' | 'vision';
export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface GenerateOptions { history?: ChatTurn[]; task?: AiTask; maxTokens?: number }

const DEFAULT_MODEL: Record<AiProviderName, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  'openai-compatible': 'llama3.1',
};

function providerName(): AiProviderName {
  const raw = (env.aiProvider || 'anthropic').toLowerCase();
  if (raw === 'openai' || raw === 'gemini') return raw;
  if (['openai-compatible', 'compatible', 'custom', 'ollama', 'groq', 'openrouter', 'vllm', 'lmstudio'].includes(raw)) return 'openai-compatible';
  return 'anthropic';
}

export function providerLabel(): AiProviderName {
  return providerName();
}

/** An OpenAI-compatible endpoint (e.g. local Ollama) may need no key at all. */
export function isConfigured(): boolean {
  if (providerName() === 'openai-compatible') return Boolean(env.aiBaseUrl.trim());
  return Boolean(env.aiApiKey && env.aiApiKey.trim().length > 0);
}

export function activeModelName(task: AiTask = 'chat'): string {
  const override = task === 'fast' ? env.aiFastModel : task === 'vision' ? env.aiVisionModel : '';
  return override?.trim() || env.aiModel?.trim() || DEFAULT_MODEL[providerName()];
}

function openAiEndpoint(): string {
  if (providerName() === 'openai-compatible') return `${env.aiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  return 'https://api.openai.com/v1/chat/completions';
}

function openAiHeaders(): Record<string, string> {
  return { 'content-type': 'application/json', ...(env.aiApiKey ? { authorization: `Bearer ${env.aiApiKey}` } : {}) };
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

async function callAnthropic(systemPrompt: string, userMessage: string, o: GenerateOptions): Promise<string> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.aiApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: activeModelName(o.task),
      max_tokens: o.maxTokens ?? 900,
      system: systemPrompt,
      messages: [...(o.history ?? []), { role: 'user', content: userMessage }],
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

async function callOpenAi(systemPrompt: string, userMessage: string, o: GenerateOptions): Promise<string> {
  const response = await fetchWithTimeout(openAiEndpoint(), {
    method: 'POST',
    headers: openAiHeaders(),
    body: JSON.stringify({
      model: activeModelName(o.task),
      max_tokens: o.maxTokens ?? 900,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(o.history ?? []),
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

async function callGemini(systemPrompt: string, userMessage: string, o: GenerateOptions): Promise<string> {
  const model = activeModelName(o.task);
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.aiApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...(o.history ?? []).map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        generationConfig: { maxOutputTokens: o.maxTokens ?? 900 },
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

export async function generateAnswer(systemPrompt: string, userMessage: string, options: GenerateOptions = {}): Promise<string> {
  if (!isConfigured()) throw new AiProviderError('No AI API key configured');
  switch (providerName()) {
    case 'openai':
    case 'openai-compatible':
      return callOpenAi(systemPrompt, userMessage, options);
    case 'gemini':
      return callGemini(systemPrompt, userMessage, options);
    default:
      return callAnthropic(systemPrompt, userMessage, options);
  }
}

// --- Multimodal (text + image) -------------------------------------------
// Used by the AI Center (photo analysis, lab-risk and forecast narratives).
// Same contract as generateAnswer: throws when no key is configured, and the
// caller decides what the deterministic fallback is.

export type AiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; base64: string };

export async function generateFromParts(
  systemPrompt: string,
  parts: AiContentPart[],
  maxTokens = 1200,
): Promise<string> {
  if (!isConfigured()) throw new AiProviderError('No AI API key configured');
  const provider = providerName();
  const hasImage = parts.some((p) => p.type === 'image');
  const task: AiTask = hasImage ? 'vision' : 'fast';

  if (provider === 'openai' || provider === 'openai-compatible') {
    const response = await fetchWithTimeout(
      openAiEndpoint(),
      {
        method: 'POST',
        headers: openAiHeaders(),
        body: JSON.stringify({
          model: activeModelName(task),
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: parts.map((p) =>
                p.type === 'text'
                  ? { type: 'text', text: p.text }
                  : { type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.base64}` } },
              ),
            },
          ],
        }),
      },
      60_000,
    );
    if (!response.ok) throw new AiProviderError(`OpenAI API returned ${response.status}`);
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AiProviderError('OpenAI API returned no content');
    return text;
  }

  if (provider === 'gemini') {
    const model = activeModelName(task);
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.aiApiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: parts.map((p) =>
                p.type === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mediaType, data: p.base64 } },
              ),
            },
          ],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      },
      60_000,
    );
    if (!response.ok) throw new AiProviderError(`Gemini API returned ${response.status}`);
    const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (payload.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('').trim();
    if (!text) throw new AiProviderError('Gemini API returned no content');
    return text;
  }

  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.aiApiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: activeModelName(task),
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: parts.map((p) =>
              p.type === 'text'
                ? { type: 'text', text: p.text }
                : { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } },
            ),
          },
        ],
      }),
    },
    60_000,
  );
  if (!response.ok) throw new AiProviderError(`Anthropic API returned ${response.status}`);
  const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = (payload.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
  if (!text) throw new AiProviderError('Anthropic API returned no text content');
  return text;
}

/** Pulls the first JSON object out of a model reply (models sometimes wrap it in prose or fences). */
export function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
