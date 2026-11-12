import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InstitutionsPage from "./InstitutionsPage";
import { listInstitutions, getInstitutionsByCountry } from "../../api/works";

vi.mock("../../api/works", async () => {
  const actual = await vi.importActual<typeof import("../../api/works")>("../../api/works");
  return { ...actual, listInstitutions: vi.fn(), getInstitutionsByCountry: vi.fn() };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><InstitutionsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InstitutionsPage", () => {
  beforeEach(() => {
    vi.mocked(getInstitutionsByCountry).mockResolvedValue([
      { countryCode: "US", workCount: 10 },
      { countryCode: "SK", workCount: 5 },
    ]);
    vi.mocked(listInstitutions).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
  });

  it("fetches with offset 0 on initial mount", async () => {
    renderPage();
    await waitFor(() => expect(listInstitutions).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 50 }),
    ));
  });

  it("re-fetches with the debounced search term, not on every keystroke", async () => {
    renderPage();
    await waitFor(() => expect(listInstitutions).toHaveBeenCalledTimes(1));
    await userEvent.type(screen.getByPlaceholderText(/search/i), "Oxford");
    await waitFor(
      () => expect(listInstitutions).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Oxford", offset: 0 })),
      { timeout: 2000 },
    );
    expect(listInstitutions).toHaveBeenCalledTimes(2);
  });

  it("resets offset to 0 when a filter changes after the user has paged forward", async () => {
    vi.mocked(listInstitutions).mockResolvedValue({ items: [], total: 500, limit: 50, offset: 0 });
    renderPage();
    await waitFor(() => expect(listInstitutions).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(listInstitutions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    await userEvent.selectOptions(screen.getByLabelText(/country/i), "US");
    await waitFor(() => expect(listInstitutions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, country: "US" })));
  });

  it("never fires a wasted request mixing the old offset with a newly-selected country", async () => {
    vi.mocked(listInstitutions).mockResolvedValue({ items: [], total: 500, limit: 50, offset: 0 });
    renderPage();
    await waitFor(() => expect(listInstitutions).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(listInstitutions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    await userEvent.selectOptions(screen.getByLabelText(/country/i), "US");
    await waitFor(() => expect(listInstitutions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, country: "US" })));
    expect(listInstitutions).not.toHaveBeenCalledWith(expect.objectContaining({ offset: 50, country: "US" }));
  });

  it("serves a remount with the same filters from cache instead of refetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 2 * 60 * 1000 } } });
    const { unmount } = render(
      <QueryClientProvider client={qc}><MemoryRouter><InstitutionsPage /></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => expect(listInstitutions).toHaveBeenCalledTimes(1));
    unmount();
    render(
      <QueryClientProvider client={qc}><MemoryRouter><InstitutionsPage /></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => screen.getByText(/0 institution/i));
    expect(listInstitutions).toHaveBeenCalledTimes(1);
  });
});
