import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '@asgardeo/auth-react';
import { isAdminFromIdToken } from '../utils/asgardeoRoles.js';

export function RequireAdmin({ children }) {
  const { state, signIn, getDecodedIDToken } = useAuthContext();
  const location = useLocation();
  const signInStarted = useRef(false);
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (state.isLoading) return;

    if (!state.isAuthenticated) {
      setAllowed(null);
      if (signInStarted.current) return;
      signInStarted.current = true;
      sessionStorage.setItem('returnPath', location.pathname + location.search);
      signIn();
      return;
    }

    signInStarted.current = false;
    let mounted = true;
    getDecodedIDToken()
      .then((t) => {
        if (mounted) setAllowed(isAdminFromIdToken(t));
      })
      .catch(() => {
        if (mounted) setAllowed(false);
      });
    return () => {
      mounted = false;
    };
  }, [state.isLoading, state.isAuthenticated, signIn, getDecodedIDToken, location.pathname, location.search]);

  if (state.isLoading || (state.isAuthenticated && allowed === null)) {
    return <main className="admin-page"><p className="grid-message">Loading…</p></main>;
  }

  if (!state.isAuthenticated) {
    return <main className="admin-page"><p className="grid-message">Redirecting to sign in…</p></main>;
  }

  if (!allowed) {
    return (
      <main className="admin-page">
        <p className="grid-message">
          This area is for store administrators.{' '}
          <Link to="/products" className="detail-back-link">Back to storefront</Link>
        </p>
      </main>
    );
  }

  return children;
}
