import { useAsgardeo } from '@asgardeo/react';
import { useReturnPathSignIn } from '../hooks/useReturnPathSignIn.js';

export function RequireSignIn({ children }) {
  const { isLoading, isSignedIn } = useAsgardeo();
  useReturnPathSignIn();

  if (isLoading) {
    return <main className="cart-page"><p className="grid-message">Loading…</p></main>;
  }

  if (!isSignedIn) {
    return <main className="cart-page"><p className="grid-message">Redirecting to sign in…</p></main>;
  }

  return children;
}
