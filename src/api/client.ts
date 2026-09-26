import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // The JWT lives in an httpOnly cookie the backend sets — the browser needs
  // to actually send/receive it cross-origin (backend CORS already allows it).
  withCredentials: true,
});

// Endpoints where a 401 can't be fixed by refreshing (either the refresh
// attempt itself failed, or there's no session to refresh yet).
const NO_REFRESH_RETRY = ["/auth/refresh", "/auth/login", "/auth/register"];

// Access tokens are short-lived (15m); rather than logging the user out the
// moment one expires, try one silent refresh and replay the original
// request. Concurrent 401s share a single in-flight refresh instead of each
// triggering their own.
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? "";

    if (status !== 401 || original._retried || NO_REFRESH_RETRY.some((p) => url.startsWith(p))) {
      return Promise.reject(error);
    }

    original._retried = true;
    refreshPromise ??= api.post("/auth/refresh").then(
      () => undefined,
      (err) => {
        refreshPromise = null;
        throw err;
      },
    );

    try {
      await refreshPromise;
      refreshPromise = null;
      return api(original);
    } catch {
      return Promise.reject(error);
    }
  },
);
