import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '@asgardeo/auth-react';
import { useIsAdmin } from '../../hooks/useIsAdmin.js';

function Header() {
  const { state, signIn, signOut } = useAuthContext();
  const location = useLocation();
  const isAdmin = useIsAdmin();

  function openSignIn() {
    sessionStorage.setItem('returnPath', location.pathname + location.search);
    signIn();
  }

  return (
    <header className="navbar">
      <div className="navbar__left">
        <Link to="/" className="navbar__wordmark">
          CORPS <span className="diamond">◆</span> OBJECT
        </Link>
        <span className="navbar__ref">E-commerce project</span>
      </div>

      <nav className="navbar__nav">
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
        {isAdmin && <Link to="/admin">Admin</Link>}
        {state.isAuthenticated ? (
          <span className="navbar__user">
            <span className="navbar__name">{state.displayName || state.email || state.username || 'Account'}</span>
            <button type="button" className="navbar__link-button" onClick={() => signOut()}>
              Sign out
            </button>
          </span>
        ) : (
          <button type="button" className="navbar__link-button" onClick={openSignIn}>
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}

export default Header;
