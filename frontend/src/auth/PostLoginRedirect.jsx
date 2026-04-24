import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAsgardeo } from '@asgardeo/react';

export function PostLoginRedirect() {
  const { isLoading, isSignedIn } = useAsgardeo();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || !isSignedIn) return;

    const returnPath = sessionStorage.getItem('returnPath');
    if (!returnPath) return;

    const current = location.pathname + location.search;
    if (returnPath === current) {
      sessionStorage.removeItem('returnPath');
      return;
    }

    sessionStorage.removeItem('returnPath');
    navigate(returnPath, { replace: true });
  }, [isLoading, isSignedIn, navigate, location.pathname, location.search]);

  return null;
}
