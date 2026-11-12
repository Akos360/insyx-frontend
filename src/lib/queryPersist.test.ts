import { describe, it, expect, vi } from "vitest";
import { createPersistedQueryClient } from "./queryPersist";

// jsdom has no IndexedDB — stub idb-keyval so persistQueryClient's internal
// restore/removeClient calls resolve harmlessly instead of throwing
// "indexedDB is not defined" (a test-environment gap, not a real one: every
// actual browser this app runs in has IndexedDB).
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

describe("createPersistedQueryClient", () => {
  it("sets gcTime at least as long as the persisted cache's maxAge, so unused queries aren't evicted from memory before their persisted copy is meant to expire", () => {
    const { queryClient, persistOptions } = createPersistedQueryClient();
    const { staleTime, gcTime } = queryClient.getDefaultOptions().queries ?? {};
    expect(staleTime).toBe(2 * 60 * 1000);
    expect(gcTime).toBeGreaterThanOrEqual(persistOptions.maxAge!);
  });
});
