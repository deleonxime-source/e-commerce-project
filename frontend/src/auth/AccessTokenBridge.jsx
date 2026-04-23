import { useEffect } from 'react';
import { useAuthContext } from '@asgardeo/auth-react';
import { setAccessTokenGetter } from '../api/api.js';

export function AccessTokenBridge() {
  const { getAccessToken, state } = useAuthContext();

  useEffect(() => {
    setAccessTokenGetter(() => (state.isAuthenticated ? getAccessToken() : Promise.resolve(null)));
  }, [getAccessToken, state.isAuthenticated]);

  return null;
}
