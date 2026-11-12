import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  DEMO_ACCOUNTS,
  askAssistant,
  fetchAssistantStatus,
  login,
  type AssistantAnswer,
  type AssistantCitation,
} from '@/services/seedLotRealtimeClient';
import styles from './AiAssistant.module.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  source?: 'model' | 'rules';
  modelName?: string | null;
  citations?: AssistantCitation[];
  sources?: NonNullable<AssistantAnswer['sources']>;
}

const OPENING_SUGGESTIONS = [
  'Which lots are low on stock?',
  'Any failing lab results?',
  'What should I do about a failed germination test?',
  'How does the NCR and CAPA process work?',
];

function newId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Global SeedSphere assistant.
 *
 * Mounted once in App.tsx rather than per-module, so it is genuinely
 * available on every page regardless of which layout that page uses
 * (ModuleLayout, the standalone Production pages, or Master Data).
 *
 * Like every other real-backend surface in this app, it bootstraps its own
 * backend session from DEMO_ACCOUNTS (see seedLotRealtimeClient's header
 * comment on why the two auth systems are separate). It is read-only, so the
 * Admin demo account is used purely to read; nothing here can mutate data.
 */
export function AiAssistant() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(OPENING_SUGGESTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Connect lazily — only once the user actually opens the assistant, so it
  // costs nothing on pages where nobody uses it.
  useEffect(() => {
    // Runs until the model label is known — not just until a token exists —
    // because a question sent the moment the drawer opens (from the AI
    // Center) can obtain the token first, which used to leave the header
    // stuck on "Connecting…".
    if (!open || modelLabel) return;
    let cancelled = false;
    (async () => {
      try {
        const account = DEMO_ACCOUNTS[0];
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        if (!token) setToken(accessToken);
        try {
          const status = await fetchAssistantStatus(accessToken);
          if (!cancelled) {
            setModelLabel(status.modelConfigured ? (status.model ?? status.provider) : 'built-in engine');
          }
        } catch {
          if (!cancelled) setModelLabel('built-in engine');
        }
      } catch {
        // The client falls back to the demo dataset rather than failing, so
        // there is nothing useful to report here — showing a connection
        // error would contradict the working data the user is about to see.
        // The global DemoModeBadge is the honest signal instead.
        if (!cancelled) setModelLabel('demo data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, modelLabel]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;
      setInput('');
      setMessages((prev) => [...prev, { id: newId(), role: 'user', text: trimmed }]);
      setBusy(true);

      try {
        let activeToken = token;
        if (!activeToken) {
          const account = DEMO_ACCOUNTS[0];
          const { accessToken } = await login(account.email, account.password);
          activeToken = accessToken;
          setToken(accessToken);
        }
        const history = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text }));
        const result: AssistantAnswer = await askAssistant(activeToken, trimmed, location.pathname, history);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            text: result.answer,
            source: result.source,
            modelName: result.modelName,
            citations: result.citations,
            sources: result.sources,
          },
        ]);
        if (result.suggestions?.length) setSuggestions(result.suggestions);
      } catch {
        // Same reasoning as the bootstrap handler: the transport layer
        // already degrades to demo data, so anything reaching here is
        // genuinely unexpected. Answer in the assistant's own voice rather
        // than surfacing a raw error bubble.
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            text: "I couldn't pull that one together just now. Try one of the suggestions below, or ask me about seed lots, lab results, storage or farmer requests.",
            source: 'rules',
            modelName: null,
            citations: [],
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, token, location.pathname, messages],
  );

  // Other surfaces (the AI Center) open the drawer, optionally with a
  // question, by dispatching `seedsphere:open-assistant` with { question }.
  const pendingQuestion = useRef<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const question = (e as CustomEvent<{ question?: string }>).detail?.question;
      setOpen(true);
      if (question) pendingQuestion.current = question;
    };
    window.addEventListener('seedsphere:open-assistant', handler);
    return () => window.removeEventListener('seedsphere:open-assistant', handler);
  }, []);
  useEffect(() => {
    if (open && pendingQuestion.current && !busy) {
      const q = pendingQuestion.current;
      pendingQuestion.current = null;
      void send(q);
    }
  }, [open, busy, send]);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // The assistant reads this deployment's operational data, so for the most
  // part it is only offered to a signed-in user — never on the auth pages
  // (login/signup) where a chat bubble would just be clutter mid-flow. The
  // public marketing home page is the deliberate exception: it doubles as a
  // live product demo for a prospective customer who hasn't signed up yet.
  const isPublicHome = location.pathname === '/';
  if (!isAuthenticated && !isPublicHome) return null;

  return (
    <>
      {!open && (
        <button className={styles.launcher} onClick={() => setOpen(true)} aria-label="Open SeedSphere assistant">
          <Sparkles size={18} />
          Ask SeedSphere
        </button>
      )}

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <aside className={styles.drawer} role="dialog" aria-label="SeedSphere assistant">
            <div className={styles.header}>
              <div>
                <h2 className={styles.headerTitle}>
                  <Sparkles size={18} /> SeedSphere Assistant
                </h2>
                <p className={styles.headerSub}>
                  {modelLabel ? `Answers grounded in live data · ${modelLabel}` : 'Connecting…'}
                </p>
              </div>
              <button className={styles.closeButton} onClick={() => setOpen(false)} aria-label="Close assistant">
                <X size={20} />
              </button>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>Ask about anything in SeedSphere</div>
                  I read your live seed lots, lab results, storage, requests and demand data, and search the knowledge base
                  (SOPs, compliance register, quality records and seed-science guides) — and I always show which records and
                  sources an answer came from.
                </div>
              )}

              {messages.map((m) => {
                if (m.role === 'user') {
                  return (
                    <div key={m.id} className={styles.messageUser}>
                      {m.text}
                    </div>
                  );
                }
                if (m.role === 'error') {
                  return (
                    <div key={m.id} className={styles.messageError}>
                      {m.text}
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={styles.messageAssistant}>
                    {m.text}
                    <div>
                      <span className={`${styles.sourceTag} ${m.source === 'model' ? styles.sourceModel : styles.sourceRules}`}>
                        {m.source === 'model' ? m.modelName ?? 'AI model' : 'built-in engine'}
                      </span>
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className={styles.citations}>
                        <span className={styles.citationsLabel}>Sources</span>
                        {m.sources.map((src, i) => (
                          <button
                            key={`${m.id}-src-${src.id}`}
                            className={styles.citationLink}
                            title={src.excerpt}
                            onClick={() => goTo(src.path)}
                          >
                            <ArrowRight size={13} />
                            [K{i + 1}] {src.title}
                            <span className={styles.citationDetail}>({src.module})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {m.citations && m.citations.length > 0 && (
                      <div className={styles.citations}>
                        <span className={styles.citationsLabel}>Based on</span>
                        {m.citations.map((c) => (
                          <button key={`${m.id}-${c.path}-${c.label}`} className={styles.citationLink} onClick={() => goTo(c.path)}>
                            <ArrowRight size={13} />
                            {c.label}
                            {c.detail && <span className={styles.citationDetail}>({c.detail})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {busy && <div className={styles.typing}>Checking your data and knowledge base…</div>}
              <div ref={messagesEndRef} />
            </div>

            {!busy && suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map((s) => (
                  <button key={s} className={styles.suggestionChip} onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.composer}>
              <textarea
                ref={inputRef}
                className={styles.input}
                rows={1}
                placeholder="Ask about lots, lab results, SOPs, how-to…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <button
                className={styles.sendButton}
                disabled={busy || !input.trim()}
                onClick={() => void send(input)}
                aria-label="Send question"
              >
                <Send size={18} />
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
