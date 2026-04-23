import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@asgardeo/auth-react';

export function RequireSignIn({ children }) {
  const { state, signIn } = useAuthContext();
  const location = useLocation();
  const signInStarted = useRef(false);

  useEffect(() => {
    if (state.isLoading) return;
    if (state.isAuthenticated) {
      signInStarted.current = false;
      return;
    }
    if (signInStarted.current) return;
    signInStarted.current = true;
    sessionStorage.setItem('returnPath', location.pathname + location.search);
    signIn();
  }, [state.isLoading, state.isAuthenticated, signIn, location.pathname, location.search]);

  if (state.isLoading) {
    return <main className="cart-page"><p className="grid-message">Loading…</p></main>;
  }

  if (!state.isAuthenticated) {
    return <main className="cart-page"><p className="grid-message">Redirecting to sign in…</p></main>;
  }

  return children;
}
