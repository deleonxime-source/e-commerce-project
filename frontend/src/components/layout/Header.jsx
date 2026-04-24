import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAsgardeo } from '@asgardeo/react';
import { useIsAdmin } from '../../hooks/useIsAdmin.js';

function displayNameFromIdToken(token) {
  if (!token || typeof token !== 'object') return 'Account';
  if (token.given_name || token.family_name) {
    const full = [token.given_name, token.family_name].filter(Boolean).join(' ').trim();
    if (full) return full;
  }
  if (token.name) return String(token.name);
  if (token.preferred_username) return String(token.preferred_username);
  if (token.email) return String(token.email);
  if (token.sub) return String(token.sub);
  return 'Account';
}

function Header() {
  const {
    isSignedIn,
    signIn,
    signOut,
    clearSession,
    platform,
    getDecodedIdToken,
  } = useAsgardeo();
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const [displayName, setDisplayName] = useState('Account');

  useEffect(() => {
    let mounted = true;

    if (!isSignedIn) {
      setDisplayName('Account');
      return () => {
        mounted = false;
      };
    }

    getDecodedIdToken()
      .then((token) => {
        if (!mounted) return;
        setDisplayName(displayNameFromIdToken(token));
      })
      .catch(() => {
        if (!mounted) return;
        setDisplayName('Account');
      });

    return () => {
      mounted = false;
    };
  }, [isSignedIn, getDecodedIdToken]);

  function openSignIn() {
    sessionStorage.setItem('returnPath', location.pathname + location.search);
    signIn();
  }

  /**
   * AsgardeoV2: SDK signOut() clears the session but then calls signIn() when signInUrl is
   * unset, so the UI can look like “nothing happened”. Use clearSession + hard navigation.
   * Classic: signOut() redirects to the IdP end_session URL.
   */
  async function handleSignOut() {
    const isV2 = platform === 'AsgardeoV2';
    try {
      if (isV2) {
        await clearSession();
        window.location.replace(`${window.location.origin}/`);
        return;
      }
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      try {
        await clearSession();
      } catch {
        // ignore
      }
      window.location.replace(`${window.location.origin}/`);
    }
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
        {isSignedIn ? (
          <span className="navbar__user">
            <span className="navbar__name">{displayName}</span>
            <button type="button" className="navbar__link-button" onClick={handleSignOut}>
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
