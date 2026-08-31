import type { ReactNode } from 'react';
import { ArrowRight, Clock, CornerDownLeft, Lock, Search } from 'lucide-react';
import type { SearchEntry } from '@/data/searchIndex';
import type { SearchResult } from '@/utils/search';
import type { UseGlobalSearchReturn } from '@/hooks/useGlobalSearch';
import { MODULE_ICON } from './moduleMeta';
import styles from './GlobalSearch.module.css';

/** Wraps the matched slices of a title in <mark> so hits are obvious. */
export function Highlighted({ text, ranges }: { text: string; ranges: { start: number; end: number }[] }) {
  if (ranges.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, i) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark key={`m${i}`} className={styles.mark}>
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

interface RowProps {
  result: SearchResult;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}

function ResultRow({ result, active, onHover, onSelect }: RowProps) {
  const { entry, locked } = result;
  const Icon = MODULE_ICON[entry.module];

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={`${styles.row} ${active ? styles.rowActive : ''}`}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <span className={styles.rowIcon}>
          <Icon size={16} />
        </span>

        <span className={styles.rowBody}>
          <span className={styles.rowTitle}>
            {/* Text stays in its own inline span: the row title is a flex
                container, and its gap would otherwise appear *inside* a
                partially highlighted word ("Farm|s"). */}
            <span className={styles.rowTitleText}>
              <Highlighted text={entry.title} ranges={result.titleRanges} />
            </span>
            {entry.kind === 'action' && <span className={styles.kindTag}>Action</span>}
          </span>
          <span className={styles.rowDesc}>{entry.description}</span>
        </span>

        <span className={styles.rowMeta}>
          {locked ? (
            <span className={styles.lockBadge}>
              <Lock size={11} />
              Sign in
            </span>
          ) : (
            <span className={styles.moduleTag}>{entry.module}</span>
          )}
          {active ? (
            <CornerDownLeft size={13} className={styles.enterHint} />
          ) : (
            <ArrowRight size={13} className={styles.rowArrow} />
          )}
        </span>
      </button>
    </li>
  );
}

interface PanelProps {
  search: UseGlobalSearchReturn;
  /** Renders the panel to fill an overlay rather than hang off an input. */
  layout: 'dropdown' | 'overlay';
  onPickRecent: (query: string) => void;
  onPickQuickLink: (entry: SearchEntry) => void;
}

export function SearchResultsPanel({ search, layout, onPickRecent, onPickQuickLink }: PanelProps) {
  const {
    query,
    results,
    groups,
    totalCount,
    modules,
    activeModule,
    setActiveModule,
    activeIndex,
    setActiveIndex,
    recentQueries,
    clearRecent,
    quickLinks,
    open,
    openAllResults,
    isAuthenticated,
  } = search;

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  // Rows are grouped visually but indexed as one flat list for the keyboard.
  let cursor = -1;

  return (
    <div className={`${styles.panel} ${layout === 'overlay' ? styles.panelOverlay : ''}`}>
      {!hasQuery && (
        <div className={styles.emptyState}>
          {recentQueries.length > 0 && (
            <section className={styles.section}>
              <header className={styles.sectionHead}>
                <span className={styles.sectionTitle}>Recent searches</span>
                <button type="button" className={styles.sectionAction} onClick={clearRecent}>
                  Clear
                </button>
              </header>
              <ul className={styles.chipList}>
                {recentQueries.map((recent) => (
                  <li key={recent}>
                    <button
                      type="button"
                      className={styles.recentChip}
                      onClick={() => onPickRecent(recent)}
                    >
                      <Clock size={12} />
                      {recent}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <span className={styles.sectionTitle}>
                {isAuthenticated ? 'Jump to' : 'Explore SeedSphere'}
              </span>
            </header>
            <ul className={styles.list}>
              {quickLinks.map((entry) => {
                const Icon = MODULE_ICON[entry.module];
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.row}
                      onClick={() => onPickQuickLink(entry)}
                    >
                      <span className={styles.rowIcon}>
                        <Icon size={16} />
                      </span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>
                          <span className={styles.rowTitleText}>{entry.title}</span>
                        </span>
                        <span className={styles.rowDesc}>{entry.description}</span>
                      </span>
                      <span className={styles.rowMeta}>
                        <ArrowRight size={13} className={styles.rowArrow} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className={styles.hintLine}>
            Search across every module — orders, seed lots, farms, trials, batches and more.
          </p>
        </div>
      )}

      {hasQuery && results.length === 0 && (
        <div className={styles.noResults}>
          <Search size={22} className={styles.noResultsIcon} />
          <p className={styles.noResultsTitle}>No matches for “{trimmed}”</p>
          <p className={styles.noResultsHint}>
            Try a shorter word, a module name like “warehouse”, or a record type like “seed lot”.
          </p>
        </div>
      )}

      {hasQuery && results.length > 0 && (
        <>
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

          <div className={styles.scrollArea} role="listbox" aria-label="Search results">
            {groups.map((group) => (
              <section key={group.module} className={styles.group}>
                <h3 className={styles.groupTitle}>{group.module}</h3>
                <ul className={styles.list}>
                  {group.results.map((result) => {
                    cursor += 1;
                    const index = cursor;
                    return (
                      <ResultRow
                        key={result.entry.id}
                        result={result}
                        active={index === activeIndex}
                        onHover={() => setActiveIndex(index)}
                        onSelect={() => open(result)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <footer className={styles.footer}>
            <span className={styles.footerCount}>
              {totalCount} {totalCount === 1 ? 'result' : 'results'}
              {results.length < totalCount ? ` · showing top ${results.length}` : ''}
            </span>
            <button type="button" className={styles.footerLink} onClick={openAllResults}>
              See all results
              <ArrowRight size={13} />
            </button>
          </footer>

          {!isAuthenticated && results.some((r) => r.locked) && (
            <p className={styles.gateNote}>
              <Lock size={12} />
              Locked pages open right after you sign in.
            </p>
          )}
        </>
      )}
    </div>
  );
}
