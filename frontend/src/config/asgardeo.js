const origin = typeof window !== 'undefined' ? window.location.origin : '';

function trimUrl(value) {
  if (value == null || value === '') return '';
  return String(value).trim();
}

// In Vite dev, use the current tab’s origin + /products so the OAuth redirect_uri
// matches the address bar (localhost vs 127.0.0.1). Register each URL you use in Asgardeo.
// Production: uses VITE_* from .env.production or .env.
function getSignInRedirectURL() {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/products`;
  }
  const fromEnv = trimUrl(import.meta.env.VITE_ASGARDEO_SIGN_IN_REDIRECT_URL);
  if (fromEnv) return fromEnv;
  return `${origin}/products`;
}

function getSignOutRedirectURL() {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/products`;
  }
  const fromEnv = trimUrl(import.meta.env.VITE_ASGARDEO_SIGN_OUT_REDIRECT_URL);
  if (fromEnv) return fromEnv;
  return `${origin}/products`;
}

const signInRedirectURL = getSignInRedirectURL();
const signOutRedirectURL = getSignOutRedirectURL();

// Must match EXACTLY an entry in Asgardeo → your SPA → Protocol → authorized redirect + sign-out URLs
export const asgardeoConfig = {
  signInRedirectURL,
  signOutRedirectURL,
  clientID: import.meta.env.VITE_ASGARDEO_CLIENT_ID || 'pxxlcCNeO4eExxVwYEnTRoKJHnEa',
  baseUrl: import.meta.env.VITE_ASGARDEO_BASE_URL || 'https://api.asgardeo.io/t/lukasximenaecommerce2',
  scope: (import.meta.env.VITE_ASGARDEO_SCOPE || 'openid profile').split(/\s+/).filter(Boolean),
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  console.info(
    '[Asgardeo] Register these in Console → Application → Protocol (Redirect & sign-out URLs):',
    signInRedirectURL,
    signOutRedirectURL
  );
}
