import { useState, useEffect, useCallback } from 'react';

/**
 * Minimal path-based router for the PWA (GitHub Pages compatible).
 *
 * Routes:
 *   /          → landing page
 *   /login     → auth page (login / sign up)
 *   /pathway   → manager vs kiosk choice
 *   /admin     → admin / manager dashboard
 *   /kiosk     → kiosk mode (cashier PIN entry)
 */
function parsePath() {
  const raw = window.location.pathname.replace(/^\/+/, '');
  const segments = raw.split('/').filter(Boolean);
  const route = segments[0] || '';
  const param = segments[1] || null;
  return { route, param };
}

export function useRouter() {
  const [state, setState] = useState(parsePath);

  useEffect(() => {
    const handler = () => setState(parsePath());
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  // Push a new history entry (normal navigation)
  const navigate = useCallback((path) => {
    const url = path.startsWith('/') ? path : '/' + path;
    window.history.pushState(null, '', url);
    setState(parsePath());
  }, []);

  // Replace current history entry (no back-button trail)
  const replaceNavigate = useCallback((path) => {
    const url = path.startsWith('/') ? path : '/' + path;
    window.history.replaceState(null, '', url);
    setState(parsePath());
  }, []);

  return { route: state.route, param: state.param, navigate, replaceNavigate };
}

// Keep old name as alias for backward compat during transition
export const useHashRouter = useRouter;
