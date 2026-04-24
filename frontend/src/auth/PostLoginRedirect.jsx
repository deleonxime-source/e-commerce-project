import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@asgardeo/auth-react';

export function PostLoginRedirect() {
  const { state } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (state.isLoading || !state.isAuthenticated) return;

    const returnPath = sessionStorage.getItem('returnPath');
    if (!returnPath) return;

    const current = location.pathname + location.search;
    if (returnPath === current) {
      sessionStorage.removeItem('returnPath');
      return;
    }

    sessionStorage.removeItem('returnPath');
    navigate(returnPath, { replace: true });
  }, [state.isLoading, state.isAuthenticated, navigate, location.pathname, location.search]);

  return null;
}
