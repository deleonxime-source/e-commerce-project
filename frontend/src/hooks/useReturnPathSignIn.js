import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAsgardeo } from '@asgardeo/react';

/**
 * When the user is not signed in, store `returnPath` and start `signIn()` once.
 * @param {object} [options]
 * @param {boolean} [options.requireInitialized] — if true, wait for the SDK to be initialized (used by admin route).
 */
export function useReturnPathSignIn({ requireInitialized = false } = {}) {
  const { isLoading, isInitialized, isSignedIn, signIn } = useAsgardeo();
  const location = useLocation();
  const signInStarted = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (requireInitialized && !isInitialized) return;
    if (isSignedIn) {
      signInStarted.current = false;
      return;
    }
    if (signInStarted.current) return;
    signInStarted.current = true;
    sessionStorage.setItem('returnPath', location.pathname + location.search);
    signIn();
  }, [
    isLoading,
    isInitialized,
    isSignedIn,
    requireInitialized,
    signIn,
    location.pathname,
    location.search,
  ]);
}
