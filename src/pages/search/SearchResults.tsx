import { useCallback, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MODULE_ICON } from '@/components/common/GlobalSearch/moduleMeta';
import { Highlighted } from '@/components/common/GlobalSearch/SearchResultsPanel';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import styles from './SearchResults.module.css';

/**
 * Full-page search, reachable at /search?q=… whether or not you are signed in.
 * The dropdown's "See all results" lands here; the URL is shareable.
 */
export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const search = useGlobalSearch({ initialQuery: urlQuery });
  const {
    query,
    setQuery,
    clear,
    groups,
    results,
    totalCount,
    modules,
    activeModule,
    setActiveModule,
    activeIndex,
    setActiveIndex,
    moveActive,
    openActive,
    open,
    recentQueries,
  } = search;

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep ?q= in step with the box so the page stays shareable and back-button friendly.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    const timer = window.setTimeout(() => {
      setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, urlQuery, setSearchParams]);

  // Someone arriving via a shared link or the browser's back button.
  useEffect(() => {
    if (urlQuery !== query.trim()) setQuery(urlQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openActive();
      } else if (event.key === 'Escape' && query) {
        event.preventDefault();
        clear();
      }
    },
    [moveActive, openActive, clear, query],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    openActive();
  }

  const trimmed = query.trim();
  let cursor = -1;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Link to="/" className={styles.brand}>
            <img src="/logo.png" alt="SeedSphere" className={styles.logo} />
          </Link>

          <div className={styles.topBarActions}>
            <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
              <ArrowLeft size={15} />
              Back
            </button>
            {isAuthenticated ? (
              <Link to="/modules" className={styles.primaryBtn}>
                Go to workspace
              </Link>
            ) : (
              <Link to="/login" className={styles.primaryBtn}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Search SeedSphere</h1>
        <p className={styles.subtitle}>
          Every module, page and record type in one place
          {isAuthenticated ? '.' : ' — sign in when you want to open one.'}
        </p>

        <form className={styles.searchForm} onSubmit={handleSubmit} role="search">
          <Search size={19} className={styles.searchIcon} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Try “purchase orders”, “seed lot”, “germination test”…"
            aria-label="Search SeedSphere"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clear}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </form>

        {!trimmed && (
          <section className={styles.startState}>
            {recentQueries.length > 0 && (
              <>
                <h2 className={styles.startTitle}>Recent searches</h2>
                <ul className={styles.chipRow}>
                  {recentQueries.map((recent) => (
                    <li key={recent}>
                      <button
                        type="button"
                        className={styles.chip}
                        onClick={() => setQuery(recent)}
                      >
                        {recent}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className={styles.startTitle}>Popular starting points</h2>
            <ul className={styles.chipRow}>
              {['purchase orders', 'inventory', 'seed lots', 'farms', 'trials', 'batches'].map(
                (suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      className={styles.chip}
                      onClick={() => setQuery(suggestion)}
                    >
                      {suggestion}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {trimmed && (
          <>
            <div className={styles.resultBar}>
              <p className={styles.resultCount}>
                <strong>{totalCount}</strong> {totalCount === 1 ? 'result' : 'results'} for “
                {trimmed}”
              </p>
              {modules.length > 1 && (
                <div className={styles.filterRow}>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${activeModule === 'all' ? styles.filterChipOn : ''}`}
                    onClick={() => setActiveModule('all')}
                  >
                    All
                  </button>
                  {modules.map((module) => (
                    <button
                      key={module}
                      type="button"
                      className={`${styles.filterChip} ${activeModule === module ? styles.filterChipOn : ''}`}
                      onClick={() => setActiveModule(module)}
                    >
                      {module}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className={styles.noResults}>
                <Search size={26} className={styles.noResultsIcon} />
                <p className={styles.noResultsTitle}>Nothing matched “{trimmed}”</p>
                <p className={styles.noResultsHint}>
                  Try fewer words, a module name like “processing”, or a record type like “seed
                  lot”.
                </p>
              </div>
            ) : (
              <div className={styles.groups}>
                {groups.map((group) => {
                  const Icon = MODULE_ICON[group.module];
                  return (
                    <section key={group.module} className={styles.group}>
                      <header className={styles.groupHead}>
                        <span className={styles.groupIcon}>
                          <Icon size={15} />
                        </span>
                        <h2 className={styles.groupTitle}>{group.module}</h2>
                        <span className={styles.groupCount}>{group.results.length}</span>
                      </header>

                      <ul className={styles.cards}>
                        {group.results.map((result) => {
                          cursor += 1;
                          const index = cursor;
                          return (
                            <li key={result.entry.id}>
                              <button
                                type="button"
                                className={`${styles.card} ${index === activeIndex ? styles.cardActive : ''}`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => open(result)}
                              >
                                <span className={styles.cardBody}>
                                  <span className={styles.cardTitle}>
                                    {/* Own span so the flex gap can't land
                                        inside a partially matched word. */}
                                    <span className={styles.cardTitleText}>
                                      <Highlighted
                                        text={result.entry.title}
                                        ranges={result.titleRanges}
                                      />
                                    </span>
                                    {result.entry.kind === 'action' && (
                                      <span className={styles.kindTag}>Action</span>
                                    )}
                                    {result.locked && (
                                      <span className={styles.lockBadge}>
                                        <Lock size={11} />
                                        Sign in
                                      </span>
                                    )}
                                  </span>
                                  <span className={styles.cardDesc}>
                                    {result.entry.description}
                                  </span>
                                  <span className={styles.cardPath}>{result.entry.path}</span>
                                </span>
                                <ArrowRight size={15} className={styles.cardArrow} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}

            {!isAuthenticated && results.some((r) => r.locked) && (
              <p className={styles.gateNote}>
                <Lock size={13} />
                Results marked <strong>Sign in</strong> need an account. Pick one and we&apos;ll
                take you there right after you log in.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export { SearchResults };
