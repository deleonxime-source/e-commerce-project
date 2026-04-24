const CLIENT_ID = import.meta.env.VITE_ASGARDEO_CLIENT_ID || '51glAcKfG8PE6NsP8sJ9zr_UAEIa';
const BASE_URL = import.meta.env.VITE_ASGARDEO_BASE_URL || 'https://api.asgardeo.io/t/lukasximenaecommerce2';
/* `email` helps put the address in the ID token; required for hardcoded email match. */
const SCOPES = import.meta.env.VITE_ASGARDEO_SCOPE || 'openid profile email';

/**
 * Props for `AsgardeoProvider` from `@asgardeo/react`.
 * Redirect URLs default to `window.location.origin` in the provider when omitted.
 * In the Asgardeo Console → your SPA → Protocol, register the same origin(s) for redirect and sign-out.
 */
export const asgardeoProviderProps = {
  clientId: CLIENT_ID,
  baseUrl: BASE_URL,
  scopes: SCOPES,
};

if (import.meta.env.DEV) {
  const o = window?.location?.origin;
  if (o) {
    console.info(
      '[Asgardeo] In Console → your SPA (this client ID) → Protocol, add as Authorized redirect & sign-out URLs:',
      o,
      '(and, if you use it:)',
      o.replace('localhost', '127.0.0.1')
    );
  }
}
