import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  QUICK_LINK_IDS,
  PUBLIC_QUICK_LINK_IDS,
  type SearchEntry,
  type SearchModule,
} from '@/data/searchIndex';
import { hasPermission } from '@/utils/permissions';
import {
  entryById,
  groupByModule,
  modulesPresent,
  resolveTarget,
  searchProduct,
  type ResultGroup,
  type SearchResult,
} from '@/utils/search';

const RECENT_KEY = 'seedsphere_recent_searches';
const RECENT_LIMIT = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function writeRecent(queries: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(queries.slice(0, RECENT_LIMIT)));
  } catch {
    /* storage unavailable (private mode) — recents are a nicety, not a requirement */
  }
}

interface UseGlobalSearchOptions {
  /** Cap the number of results returned. Omit for everything (results page). */
  limit?: number;
  /** Start with a query already in the box, e.g. from `?q=` on /search. */
  initialQuery?: string;
}

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  clear: () => void;

  results: SearchResult[];
  groups: ResultGroup[];
  /** Total matches ignoring `limit`, so the UI can say "showing 8 of 23". */
  totalCount: number;
  modules: SearchModule[];

  activeModule: SearchModule | 'all';
  setActiveModule: (module: SearchModule | 'all') => void;

  /** Highlighted row for keyboard navigation. -1 when nothing is highlighted. */
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  moveActive: (delta: number) => void;

  recentQueries: string[];
  clearRecent: () => void;
  quickLinks: SearchEntry[];

  /** Navigate to a result, remembering the query and gating on auth. */
  open: (result: SearchResult) => void;
  /** Navigate to the full results page for the current query. */
  openAllResults: () => void;
  /** Convenience: open whatever row is currently highlighted. */
  openActive: () => boolean;

  isAuthenticated: boolean;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}): UseGlobalSearchReturn {
  const { limit, initialQuery = '' } = options;
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [query, setQueryState] = useState(initialQuery);
  const [activeModule, setActiveModule] = useState<SearchModule | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => readRecent());

  const allMatches = useMemo(
    () => searchProduct(query, { isAuthenticated, role: user?.role, module: 'all' }),
    [query, isAuthenticated, user?.role],
  );

  const modules = useMemo(() => modulesPresent(allMatches), [allMatches]);

  const scoped = useMemo(
    () =>
      activeModule === 'all'
        ? allMatches
        : allMatches.filter((result) => result.entry.module === activeModule),
    [allMatches, activeModule],
  );

  const results = useMemo(
    () => (typeof limit === 'number' ? scoped.slice(0, limit) : scoped),
    [scoped, limit],
  );

  const groups = useMemo(() => groupByModule(results), [results]);

  // A module chip can disappear as the query narrows; don't leave a dead filter on.
  useEffect(() => {
    if (activeModule !== 'all' && !modules.includes(activeModule)) setActiveModule('all');
  }, [modules, activeModule]);

  // Reset the highlight whenever the visible list changes.
  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [query, activeModule, results.length]);

  const quickLinks = useMemo(() => {
    const ids = isAuthenticated ? QUICK_LINK_IDS : PUBLIC_QUICK_LINK_IDS;
    return ids
      .map((id) => entryById(id))
      .filter((entry): entry is SearchEntry => Boolean(entry))
      .filter((entry) => {
        // Don't offer a shortcut the signed-in role cannot actually open.
        if (!entry.requiresAuth || !isAuthenticated || !entry.permission || !user) return true;
        return hasPermission(user.role, entry.permission);
      });
  }, [isAuthenticated, user]);

  const setQuery = useCallback((value: string) => setQueryState(value), []);
  const clear = useCallback(() => {
    setQueryState('');
    setActiveModule('all');
    setActiveIndex(-1);
  }, []);

  const rememberQuery = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    setRecentQueries((previous) => {
      const next = [trimmed, ...previous.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())];
      writeRecent(next);
      return next.slice(0, RECENT_LIMIT);
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentQueries([]);
    writeRecent([]);
  }, []);

  const open = useCallback(
    (result: SearchResult) => {
      rememberQuery(query);
      const target = resolveTarget(result);

      // Landing anchors ("/#about") need a scroll, not just a route change.
      if (target.startsWith('/#')) {
        const id = target.slice(2);
        navigate('/');
        window.setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            const top = element.getBoundingClientRect().top + window.pageYOffset - 72;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 120);
        return;
      }

      navigate(target);
    },
    [navigate, query, rememberQuery],
  );

  const openAllResults = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    rememberQuery(trimmed);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [navigate, query, rememberQuery]);

  const openActive = useCallback(() => {
    const result = results[activeIndex];
    if (!result) return false;
    open(result);
    return true;
  }, [results, activeIndex, open]);

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (results.length === 0) return -1;
        const next = current + delta;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
    },
    [results.length],
  );

  return {
    query,
    setQuery,
    clear,
    results,
    groups,
    totalCount: scoped.length,
    modules,
    activeModule,
    setActiveModule,
    activeIndex,
    setActiveIndex,
    moveActive,
    recentQueries,
    clearRecent,
    quickLinks,
    open,
    openAllResults,
    openActive,
    isAuthenticated,
  };
}
