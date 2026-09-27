import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // httpOnly JWT cookie needs this to be sent/received cross-origin.
  withCredentials: true,
});

// These endpoints' 401s can't be fixed by refreshing (refresh itself failed, or no session yet).
const NO_REFRESH_RETRY = ["/auth/refresh", "/auth/login", "/auth/register"];

// Silent-refresh-and-retry on 401 instead of logging out; concurrent 401s share one in-flight refresh.
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
