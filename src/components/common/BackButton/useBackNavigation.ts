import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Routes that must never show a back control.
 *
 * The auth and landing pages are pre-login (there is nothing meaningful to
 * return to), and /modules is the post-login home — going "back" from it
 * would land on the login screen, which reads as a bug rather than
 * navigation.
 */
const HIDDEN_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password', '/modules'];

/** Routes rendered inside ModuleLayout, which supplies its own TopHeader. */
export const TOP_HEADER_PREFIXES = ['/procurement', '/warehouse', '/rd', '/processing', '/lab/', '/quality', '/modules', '/ai'];

export function isTopHeaderRoute(pathname: string): boolean {
  if (pathname === '/lab') return true;
  return TOP_HEADER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function shouldShowBackButton(pathname: string): boolean {
  if (pathname === '/') return false;
  return !HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Where "back" goes when there is no in-app history to pop — a fresh tab, a
 * pasted deep link, or an entry landed on straight from login. Walking one
 * path segment up is the closest thing to the page's parent; anything with
 * no sensible parent falls back to the module picker.
 */
export function fallbackPathFor(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '/modules';

  // A detail route (/lab/submissions/:id) drops the id to reach its list.
  const parent = `/${segments.slice(0, -1).join('/')}`;

  // A bare module root has no list above it — send those to the module's
  // own dashboard rather than a route that may not exist.
  if (segments.length === 2 && isTopHeaderRoute(pathname)) {
    return `/${segments[0]}/dashboard`;
  }
  return parent;
}

export interface BackNavigation {
  visible: boolean;
  goBack: () => void;
}

export function useBackNavigation(): BackNavigation {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(() => {
    // react-router records its position in history.state.idx. A value above
    // zero means there is an entry inside this app to return to; without it
    // navigate(-1) could leave the app entirely (back to whatever site the
    // user was on before), so fall back to the page's parent route instead.
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallbackPathFor(location.pathname));
  }, [navigate, location.pathname]);

  return { visible: shouldShowBackButton(location.pathname), goBack };
}
