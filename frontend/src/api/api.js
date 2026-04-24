import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001',
});

let getAccessToken = async () => null;
let hasTokenGetter = false;

let resolveTokenGetterReady;
const tokenGetterReady = new Promise((resolve) => {
  resolveTokenGetterReady = resolve;
});

const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

async function waitForTokenGetter(timeoutMs = 250) {
  if (hasTokenGetter) return;
  await Promise.race([tokenGetterReady, delay(timeoutMs)]);
}

function normalizeAccessToken(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    return trimmed || null;
  }
  if (typeof rawValue === 'object') {
    const candidate = rawValue.accessToken || rawValue.access_token || rawValue.token || null;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

async function resolveBearerToken() {
  try {
    return normalizeAccessToken(await getAccessToken());
  } catch {
    return null;
  }
}

export function setAccessTokenGetter(fn) {
  getAccessToken = fn;
  hasTokenGetter = true;
  resolveTokenGetterReady();
}

api.interceptors.request.use(async (config) => {
  await waitForTokenGetter();
  const token = await resolveBearerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const requestConfig = error?.config;
    const responseDetail = String(
      error?.response?.data?.detail || error?.response?.data?.error || error?.response?.data?.message || ''
    ).toLowerCase();

    if (!requestConfig || status !== 401 || requestConfig.__retriedWithToken) {
      throw error;
    }

    const hasAuthHeader = Boolean(
      requestConfig.headers?.Authorization || requestConfig.headers?.authorization
    );

    const shouldRetryWithFreshToken = !hasAuthHeader
      || responseDetail.includes('expired')
      || responseDetail.includes('invalid')
      || responseDetail.includes('jwt');

    if (!shouldRetryWithFreshToken) {
      throw error;
    }

    await waitForTokenGetter(800);
    const token = await resolveBearerToken();

    if (!token) {
      throw error;
    }

    requestConfig.__retriedWithToken = true;
    requestConfig.headers = {
      ...(requestConfig.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    return api.request(requestConfig);
  }
);

export default api;
