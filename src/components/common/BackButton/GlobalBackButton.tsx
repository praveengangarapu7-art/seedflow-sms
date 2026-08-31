import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BackButton } from './BackButton';
import { isTopHeaderRoute, shouldShowBackButton } from './useBackNavigation';

/**
 * Mounts the floating back control once, for every page that does NOT render
 * a TopHeader of its own (the standalone Production pages, Master Data, and
 * the portals). Module-shell pages get the inline variant inside TopHeader
 * instead, so no page ever shows two back affordances.
 *
 * Mounted in App.tsx beside AiAssistant/DemoModeBadge — the same
 * one-mount-covers-everything pattern, which is what keeps this from needing
 * an edit in each of the ~100 page components.
 *
 * While it is on screen it sets data-floating-back on <body>; globals.css
 * uses that to add a top strip to #root, so the fixed pill sits in reserved
 * space rather than on top of the page's own heading.
 */
export function GlobalBackButton() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const show = isAuthenticated && shouldShowBackButton(location.pathname) && !isTopHeaderRoute(location.pathname);

  useEffect(() => {
    if (show) {
      document.body.setAttribute('data-floating-back', 'true');
    } else {
      document.body.removeAttribute('data-floating-back');
    }
    return () => document.body.removeAttribute('data-floating-back');
  }, [show]);

  if (!show) return null;

  return <BackButton variant="floating" />;
}
