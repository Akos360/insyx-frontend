import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SearchPage from "./SearchPage";
import { searchWorks, getWorkFields, getWorkDomains } from "../../api/works";

vi.mock("../../api/works", async () => {
  const actual = await vi.importActual<typeof import("../../api/works")>("../../api/works");
  return { ...actual, searchWorks: vi.fn(), getWorkFields: vi.fn(), getWorkDomains: vi.fn() };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SearchPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    vi.mocked(getWorkFields).mockResolvedValue(["Computer Science", "Biology"]);
    vi.mocked(getWorkDomains).mockResolvedValue([]);
    vi.mocked(searchWorks).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
  });

  it("fetches with offset 0 on initial mount", async () => {
    renderPage();
    await waitFor(() => expect(searchWorks).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 50 }),
    ));
  });

  it("re-fetches with the debounced search term, not on every keystroke", async () => {
    renderPage();
    await waitFor(() => expect(searchWorks).toHaveBeenCalledTimes(1));
    await userEvent.type(screen.getByPlaceholderText(/search title or abstract/i), "genomics");
    await waitFor(
      () => expect(searchWorks).toHaveBeenLastCalledWith(expect.objectContaining({ search: "genomics", offset: 0 })),
      { timeout: 2000 },
    );
    expect(searchWorks).toHaveBeenCalledTimes(2); // debounced: one call per settled value, not per keystroke
  });

  it("resets offset to 0 when a filter changes after the user has paged forward", async () => {
    vi.mocked(searchWorks).mockResolvedValue({ items: [], total: 500, limit: 50, offset: 0 });
    renderPage();
    await waitFor(() => expect(searchWorks).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(searchWorks).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    await userEvent.selectOptions(screen.getByLabelText(/field/i), "Computer Science");
    await waitFor(() => expect(searchWorks).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, field: "Computer Science" })));
  });

  it("never fires a wasted request mixing the old offset with a newly-debounced search term", async () => {
    vi.mocked(searchWorks).mockResolvedValue({ items: [], total: 500, limit: 50, offset: 0 });
    renderPage();
    await waitFor(() => expect(searchWorks).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(searchWorks).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    await userEvent.type(screen.getByPlaceholderText(/search title or abstract/i), "gen");
    await waitFor(
      () => expect(searchWorks).toHaveBeenLastCalledWith(expect.objectContaining({ search: "gen", offset: 0 })),
      { timeout: 2000 },
    );
    expect(searchWorks).not.toHaveBeenCalledWith(expect.objectContaining({ offset: 50, search: "gen" }));
  });

  it("serves a remount with the same filters from cache instead of refetching (the actual point of this migration)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 2 * 60 * 1000 } } });
    const { unmount } = render(
      <QueryClientProvider client={qc}><MemoryRouter><SearchPage /></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => expect(searchWorks).toHaveBeenCalledTimes(1));
    unmount();
    render(
      <QueryClientProvider client={qc}><MemoryRouter><SearchPage /></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => screen.getByText(/0 works/i));
    expect(searchWorks).toHaveBeenCalledTimes(1); // still 1 — second mount served from the (shared) QueryClient's cache
  });
});
