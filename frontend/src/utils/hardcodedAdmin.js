import {
  HARDCODED_ADMIN_EMAIL,
  HARDCODED_ADMIN_SUB,
} from '../../../shared/hardcodedAdmin.js';

export { HARDCODED_ADMIN_EMAIL, HARDCODED_ADMIN_SUB };

function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Resolve ID/access token value (JWT string, decoded object, or `{ accessToken }`) to claims. */
function toClaimsObject(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (t.split('.').length === 3) return decodeJwtPayload(t);
    return null;
  }
  if (typeof raw === 'object') {
    const nested = raw.accessToken || raw.access_token || raw.token;
    if (typeof nested === 'string' && nested.trim()) {
      return toClaimsObject(nested);
    }
    return raw;
  }
  return null;
}

/** Normalize Asgardeo ID token, access token, or SCIM / SDK `user` to common fields. */
function enrichClaims(claims) {
  if (!claims || typeof claims !== 'object') return null;
  const c = { ...claims };
  if (Array.isArray(claims.emails) && claims.emails.length) {
    const e = claims.emails.find((x) => x?.primary) || claims.emails[0];
    if (e?.value) c.email = c.email || e.value;
  }
  if (claims.userName) {
    c.preferred_username = c.preferred_username || claims.userName;
  }
  return c;
}

function emailMatches(claims) {
  const want = HARDCODED_ADMIN_EMAIL.toLowerCase();
  const raw = String(
    claims.email
    || claims.preferred_username
    || claims['http://wso2.org/claims/username']
    || claims['http://wso2.org/claims/emailaddress']
    || ''
  )
    .toLowerCase()
    .trim();
  if (raw === want) return true;
  return false;
}

function subMatches(claims) {
  const s = String(claims.sub || claims.id || '').trim();
  if (!s || !HARDCODED_ADMIN_SUB) return false;
  if (s === HARDCODED_ADMIN_SUB) return true;
  if (s.includes(HARDCODED_ADMIN_SUB)) return true;
  return false;
}

export function isHardcodedAdmin(claims) {
  const c = enrichClaims(claims);
  if (!c) return false;
  if (subMatches(c)) return true;
  if (emailMatches(c)) return true;
  return false;
}

/**
 * True if the signed-in user is the hardcoded admin.
 * Tries, in order: raw SDK user profile, then ID / access token payloads.
 */
export function isHardcodedAdminFromSources(sources) {
  for (const src of sources) {
    if (src == null) continue;
    if (typeof src === 'string') {
      const fromJwt = toClaimsObject(src);
      if (fromJwt && isHardcodedAdmin(fromJwt)) return true;
      continue;
    }
    if (typeof src === 'object') {
      const asClaims = toClaimsObject(src) || src;
      if (isHardcodedAdmin(asClaims)) return true;
    }
  }
  return false;
}
