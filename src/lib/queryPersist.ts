import { QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

const DEFAULT_STALE_TIME = 2 * 60 * 1000;
const PERSISTED_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * A single QueryClient, tuned so a revisit within DEFAULT_STALE_TIME renders
 * straight from cache, and `persistOptions` for `PersistQueryClientProvider`
 * (not the imperative `persistQueryClient()` — that restores asynchronously
 * *after* the app has already mounted and queries have already started
 * fetching, racing component mount against the IndexedDB read.
 * `PersistQueryClientProvider` instead holds queries in a pending "restoring"
 * state — not blocking the app shell's own render — until the restore
 * finishes, so a query that already has a persisted answer never fires a
 * redundant network request first). `buster` includes a build-time
 * timestamp (see vite.config.ts) — a deploy that changes a response shape
 * discards the whole persisted cache instead of risking an old-shaped
 * response under new code.
 */
export function createPersistedQueryClient(): {
  queryClient: QueryClient;
  persistOptions: PersistQueryClientProviderProps["persistOptions"];
} {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        // Must be >= maxAge below — gcTime governs how long an unused query
        // stays in memory before eviction, and an evicted query is dropped
        // from what gets persisted too. A shorter gcTime (React Query's
        // 5-minute default) would silently cap "instant after a hard
        // refresh" at 5 minutes instead of the intended 24h.
        gcTime: PERSISTED_CACHE_MAX_AGE,
      },
    },
  });

  const persister = createAsyncStoragePersister({
    storage: {
      getItem: (key: string) => idbGet(key),
      setItem: (key: string, value: string) => idbSet(key, value),
      removeItem: (key: string) => idbDel(key),
    },
  });

  return {
    queryClient,
    persistOptions: { persister, maxAge: PERSISTED_CACHE_MAX_AGE, buster: __APP_VERSION__ },
  };
}
