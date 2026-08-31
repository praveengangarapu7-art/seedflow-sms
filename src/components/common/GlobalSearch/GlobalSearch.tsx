import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import type { SearchEntry } from '@/data/searchIndex';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { SearchResultsPanel } from './SearchResultsPanel';
import styles from './GlobalSearch.module.css';

export interface GlobalSearchProps {
  /**
   * `header` — the inline bar used inside the app shell.
   * `landing` — an icon button on the marketing nav that opens a centred overlay.
   */
  variant?: 'header' | 'landing';
  placeholder?: string;
  className?: string;
}

const DROPDOWN_LIMIT = 8;

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

export function GlobalSearch({
  variant = 'header',
  placeholder = 'Search SeedSphere…',
  className = '',
}: GlobalSearchProps) {
  const search = useGlobalSearch({ limit: DROPDOWN_LIMIT });
  const { query, setQuery, clear, moveActive, openActive, openAllResults, open } = search;

  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    inputRef.current?.blur();
  }, []);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    // The overlay input mounts with the overlay, so focus on the next frame.
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  // Navigating away (including via a result click) should dismiss the panel.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // Click-away for the inline dropdown.
  useEffect(() => {
    if (!isOpen || variant !== 'header') return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, variant]);

  // Cmd/Ctrl+K anywhere, plus `/` when the user isn't already typing somewhere.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === '/' && !typingElsewhere) {
        event.preventDefault();
        openSearch();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  // Stop the page behind the overlay from scrolling.
  useEffect(() => {
    if (variant !== 'landing' || !isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [variant, isOpen]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault();
        if (!openActive() && query.trim()) openAllResults();
        break;
      case 'Escape':
        event.preventDefault();
        if (query) clear();
        else close();
        break;
      default:
        break;
    }
  }

  function handlePickRecent(recent: string) {
    setQuery(recent);
    inputRef.current?.focus();
  }

  function handlePickQuickLink(entry: SearchEntry) {
    open({ entry, score: 0, titleRanges: [], locked: entry.requiresAuth && !search.isAuthenticated });
  }

  const shortcutLabel = isMac() ? '⌘K' : 'Ctrl K';

  const inputBlock = (
    <div className={styles.inputWrap}>
      <Search size={16} className={styles.inputIcon} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        aria-label="Search SeedSphere"
        aria-expanded={isOpen}
        autoComplete="off"
      />
      {query ? (
        <button type="button" className={styles.clearBtn} onClick={clear} aria-label="Clear search">
          <X size={14} />
        </button>
      ) : (
        <kbd className={styles.kbd}>{shortcutLabel}</kbd>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Landing: icon trigger + full-screen overlay                      */
  /* ---------------------------------------------------------------- */
  if (variant === 'landing') {
    return (
      <div className={`${styles.landingRoot} ${className}`} ref={rootRef}>
        <button
          type="button"
          className={styles.landingTrigger}
          onClick={openSearch}
          aria-label="Search SeedSphere"
        >
          <Search size={18} />
          <span className={styles.landingTriggerText}>Search</span>
        </button>

        {isOpen && (
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Search SeedSphere"
          >
            <div className={styles.overlayBackdrop} onClick={close} />
            <div className={styles.overlayCard}>
              <div className={styles.overlayHead}>
                {inputBlock}
                <button
                  type="button"
                  className={styles.overlayClose}
                  onClick={close}
                  aria-label="Close search"
                >
                  <X size={18} />
                </button>
              </div>

              <SearchResultsPanel
                search={search}
                layout="overlay"
                onPickRecent={handlePickRecent}
                onPickQuickLink={handlePickQuickLink}
              />

              <div className={styles.overlayFootHints}>
                <span>
                  <kbd className={styles.kbdMini}>↑</kbd>
                  <kbd className={styles.kbdMini}>↓</kbd> to move
                </span>
                <span>
                  <kbd className={styles.kbdMini}>↵</kbd> to open
                </span>
                <span>
                  <kbd className={styles.kbdMini}>esc</kbd> to close
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Header: inline bar + dropdown                                    */
  /* ---------------------------------------------------------------- */
  return (
    <div className={`${styles.headerRoot} ${className}`} ref={rootRef}>
      {inputBlock}
      {isOpen && (
        <SearchResultsPanel
          search={search}
          layout="dropdown"
          onPickRecent={handlePickRecent}
          onPickQuickLink={handlePickQuickLink}
        />
      )}
    </div>
  );
}

export default GlobalSearch;
