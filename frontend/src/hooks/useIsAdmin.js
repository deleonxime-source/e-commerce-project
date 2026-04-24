import { useEffect, useState } from 'react';
import { useAuthContext } from '@asgardeo/auth-react';
import { isAdminFromIdToken } from '../utils/asgardeoRoles.js';

export function useIsAdmin() {
  const { state, getDecodedIDToken } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!state.isAuthenticated) {
      setIsAdmin(false);
      return;
    }
    getDecodedIDToken()
      .then((t) => setIsAdmin(isAdminFromIdToken(t)))
      .catch(() => setIsAdmin(false));
  }, [state.isAuthenticated, getDecodedIDToken]);

  return isAdmin;
}
