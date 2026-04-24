import { Link } from 'react-router-dom';
import { useAsgardeo } from '@asgardeo/react';
import { useHardcodedAdmin } from '../context/HardcodedAdminContext.jsx';
import { useReturnPathSignIn } from '../hooks/useReturnPathSignIn.js';

export function RequireAdmin({ children }) {
  const { isLoading, isInitialized, isSignedIn } = useAsgardeo();
  const admin = useHardcodedAdmin();
  useReturnPathSignIn({ requireInitialized: true });

  if (isLoading || !isInitialized) {
    return <main className="admin-page"><p className="grid-message">Loading…</p></main>;
  }

  if (!isSignedIn) {
    return <main className="admin-page"><p className="grid-message">Redirecting to sign in…</p></main>;
  }

  if (admin.status === 'checking') {
    return <main className="admin-page"><p className="grid-message">Loading…</p></main>;
  }

  if (admin.status === 'resolved' && !admin.isAdmin) {
    return (
      <main className="admin-page">
        <p className="grid-message">
          This area is for store administrators.{' '}
          <Link to="/products" className="detail-back-link">Back to storefront</Link>
        </p>
      </main>
    );
  }

  if (admin.status === 'resolved' && admin.isAdmin) {
    return children;
  }

  return <main className="admin-page"><p className="grid-message">Loading…</p></main>;
}
