import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api/v1';

const ACCESS_KEY = 'pt_access_token';
const REFRESH_KEY = 'pt_refresh_token';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: API_BASE });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Transparent refresh-token rotation on 401 ----
let isRefreshing = false;
let waiters = [];

const onRefreshed = (token) => {
  waiters.forEach((cb) => cb(token));
  waiters = [];
};

// Allow the app (AuthContext) to react to a hard logout.
let onAuthFailure = () => {};
export const setOnAuthFailure = (fn) => {
  onAuthFailure = fn;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const isAuthRoute = config?.url?.includes('/auth/');

    if (response?.status === 401 && !config.__isRetry && !isAuthRoute && tokenStore.refresh) {
      if (isRefreshing) {
        // Queue requests that arrive mid-refresh.
        return new Promise((resolve) => {
          waiters.push((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            config.__isRetry = true;
            resolve(api(config));
          });
        });
      }

      config.__isRetry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken: tokenStore.refresh,
        });
        const tokens = data.data;
        tokenStore.set(tokens);
        isRefreshing = false;
        onRefreshed(tokens.accessToken);
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(config);
      } catch (refreshErr) {
        isRefreshing = false;
        waiters = [];
        tokenStore.clear();
        onAuthFailure();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

/** Normalise an axios error into a human-readable message from the API envelope. */
export function extractError(error) {
  const data = error?.response?.data;
  if (data?.errors?.length) {
    return data.errors.map((e) => `${e.field}: ${e.message}`).join(' • ');
  }
  return data?.message || error.message || 'Something went wrong';
}
