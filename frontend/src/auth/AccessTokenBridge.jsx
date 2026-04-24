import { useEffect } from 'react';
import { useAsgardeo } from '@asgardeo/react';
import { setAccessTokenGetter } from '../api/api.js';

export function AccessTokenBridge() {
  const { getAccessToken } = useAsgardeo();

  useEffect(() => {
    setAccessTokenGetter(() => getAccessToken().catch(() => null));
  }, [getAccessToken]);

  return null;
}
