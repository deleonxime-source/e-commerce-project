import { createContext, useContext, useEffect, useState } from 'react';
import { useAsgardeo } from '@asgardeo/react';
import { isHardcodedAdminFromSources } from '../utils/hardcodedAdmin.js';

const HardcodedAdminContext = createContext(null);

/**
 * Resolves hardcoded admin once for the app (avoids duplicate token fetches in Header + /admin).
 * @returns {{ status: 'signed_out' } | { status: 'session_loading' } | { status: 'checking' } | { status: 'resolved', isAdmin: boolean }}
 */
export function HardcodedAdminProvider({ children }) {
  const { isSignedIn, isInitialized, isLoading, user, getDecodedIdToken, getAccessToken } = useAsgardeo();
  const [checkComplete, setCheckComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setCheckComplete(true);
      setIsAdmin(false);
      return;
    }
    if (!isInitialized || isLoading) {
      setCheckComplete(false);
      return;
    }

    let mounted = true;
    (async () => {
      setCheckComplete(false);
      try {
        const [idVal, atVal] = await Promise.all([
          getDecodedIdToken().catch(() => null),
          getAccessToken().catch(() => null),
        ]);
        if (!mounted) return;
        setIsAdmin(isHardcodedAdminFromSources([user, idVal, atVal]));
      } catch {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setCheckComplete(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, isInitialized, isLoading, user, getDecodedIdToken, getAccessToken]);

  const value = (() => {
    if (!isSignedIn) return { status: 'signed_out' };
    if (!isInitialized || isLoading) return { status: 'session_loading' };
    if (!checkComplete) return { status: 'checking' };
    return { status: 'resolved', isAdmin };
  })();

  return (
    <HardcodedAdminContext.Provider value={value}>
      {children}
    </HardcodedAdminContext.Provider>
  );
}

export function useHardcodedAdmin() {
  const v = useContext(HardcodedAdminContext);
  if (v == null) {
    throw new Error('useHardcodedAdmin must be used under HardcodedAdminProvider');
  }
  return v;
}
