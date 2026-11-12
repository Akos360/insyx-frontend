import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LuChevronUp,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuSearch,
  LuSlidersHorizontal,
  LuDownload,
  LuX,
  LuFileX,
  LuArrowUpDown,
} from "react-icons/lu";
import { searchWorks, getWorkFields, getWorkDomains, buildExportCsvUrl, type WorksQuery } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import { fieldColorVar } from "../../utils/fieldColor";
import { toggleSort, encodeSorts, decodeSorts, sortPriority, type SortSpec } from "../../utils/multiSort";
import { PAGE_SIZE_OPTIONS, pageSizeLabel } from "../../utils/pageSize";
import { toSearchParams, toFiniteNumber } from "../../utils/urlSync";
import Highlight from "../../components/common/Highlight";
import "./search-page.css";

type SortKey = "title" | "authors" | "publicationYear" | "field" | "citedByCount";
type SortDir = "asc" | "desc";

const DEFAULT_PAGE_SIZE = 50;
const SKELETON_ROWS = 8;
// Guards against a crafted/corrupted URL's offset, not a real page count.
const MAX_OFFSET = 10_000_000;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "citedByCount", label: "Citations" },
  { key: "publicationYear", label: "Year" },
  { key: "title", label: "Title" },
  { key: "field", label: "Field" },
  { key: "authors", label: "Authors" },
];

// Order doubles as the visual column order — Title first (and left
// unsized, see .searchThTitle), then Field/Year/Citations clustered
// together on the right next to OA, so Title gets all the leftover room.
const cols: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "field", label: "Field" },
  { key: "publicationYear", label: "Year", num: true },
  { key: "citedByCount", label: "Citations", num: true },
];

const COL_WIDTH_CLASS: Partial<Record<SortKey, string>> = {
  title: "searchThTitle",
  field: "searchThField searchColCompact",
  publicationYear: "searchThYear",
  citedByCount: "searchThCitations",
};

function SortIcon({ priority, dir, showBadge }: { priority: number; dir: SortDir; showBadge: boolean }) {
  if (priority === 0) return <LuArrowUpDown className="searchSortIdle" aria-hidden="true" />;
  return (
    <span className="searchSortWrap">
      {dir === "asc"
        ? <LuChevronUp className="searchSortActive" aria-hidden="true" />
        : <LuChevronDown className="searchSortActive" aria-hidden="true" />}
      {showBadge && <sup className="searchSortBadge">{priority}</sup>}
    </span>
  );
}

function SearchSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={i} className="searchTr searchTrSkeleton">
          <td className="searchTd searchTdCheck" />
          <td className="searchTd searchTdTitle">
            <div className="uiSkel" style={{ height: 13, width: `${60 + (i % 3) * 10}%`, marginBottom: 6 }} />
            <div className="uiSkel" style={{ height: 11, width: `${30 + (i % 4) * 8}%` }} />
          </td>
          <td className="searchTd searchColCompact"><div className="uiSkel" style={{ height: 20, width: 90, borderRadius: 999 }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 32, marginLeft: "auto" }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 40, marginLeft: "auto" }} /></td>
          <td className="searchTd searchTdNum searchColCompact"><div className="uiSkel" style={{ height: 20, width: 56, marginLeft: "auto", borderRadius: 999 }} /></td>
        </tr>
      ))}
    </>
  );
}

const SORT_KEYS = SORT_OPTIONS.map((o) => o.key);

export default function SearchPage() {
  // Read once on mount — a graph click ("Open in Full View") deep-links here
  // with these pre-applied, e.g. /search?field=Computer+Science, and a
  // copied/bookmarked /search URL reproduces the exact same filtered,
  // sorted, paginated view. Kept in sync afterwards by the effect below,
  // which mirrors current state back into the URL.
  const [initialParams, setSearchParams] = useSearchParams();

  const [offset, setOffset] = useState(() => {
    const raw = Math.floor(Number(initialParams.get("offset")));
    return Number.isFinite(raw) && raw > 0 && raw <= MAX_OFFSET ? raw : 0;
  });
  const [pageSize, setPageSize] = useState(() => {
    const raw = Number(initialParams.get("pageSize"));
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_PAGE_SIZE;
  });

  const [query, setQuery] = useState(() => initialParams.get("search") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialParams.get("search") ?? "");
  const [fields, setFields] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [fieldFilter, setFieldFilter] = useState(() => initialParams.get("field") ?? "");
  const [domainFilter, setDomainFilter] = useState(() => initialParams.get("domain") ?? "");
  const [yearFrom, setYearFrom] = useState(() => initialParams.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = useState(() => initialParams.get("yearTo") ?? "");
  const [oaOnly, setOaOnly] = useState(() => initialParams.get("is_oa") === "true");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(() =>
    Boolean(initialParams.get("domain") || initialParams.get("yearFrom") || initialParams.get("yearTo") || initialParams.get("is_oa")),
  );
  const [sorts, setSorts] = useState<SortSpec<SortKey>[]>(() =>
    decodeSorts(initialParams.get("sortBy"), initialParams.get("sortDir"), SORT_KEYS, [{ key: "citedByCount", dir: "desc" }]),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced so every keystroke doesn't hit the lakehouse. The offset reset
  // happens in the SAME callback (not a separate effect watching
  // debouncedQuery) so both state updates land in one render — a separate
  // effect would commit the new debouncedQuery with the stale offset first,
  // firing one wasted request before the follow-up effect reset it to 0.
  // Skipped on the very first run: debouncedQuery/offset are already
  // consistent from their own URL-restoring initializers, and firing this
  // unconditionally on mount would reset a non-zero offset restored from a
  // shared/bookmarked URL back to 0.
  const isFirstQueryRun = useRef(true);
  useEffect(() => {
    if (isFirstQueryRun.current) {
      isFirstQueryRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getWorkFields().then(setFields).catch(() => {});
    getWorkDomains().then(setDomains).catch(() => {});
  }, []);

  // Mirrors current filter/sort/paging state into the URL (replacing, not
  // pushing, history entries) so the address bar is always a shareable
  // snapshot of what's on screen.
  useEffect(() => {
    const isDefaultSort = sorts.length === 1 && sorts[0].key === "citedByCount" && sorts[0].dir === "desc";
    const { sortBy, sortDir } = encodeSorts(sorts);
    setSearchParams(
      toSearchParams({
        search: debouncedQuery,
        field: fieldFilter,
        domain: domainFilter,
        yearFrom,
        yearTo,
        is_oa: oaOnly,
        sortBy: isDefaultSort ? undefined : sortBy,
        sortDir: isDefaultSort ? undefined : sortDir,
        pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
        offset: offset || undefined,
      }),
      { replace: true },
    );
  }, [debouncedQuery, fieldFilter, domainFilter, yearFrom, yearTo, oaOnly, sorts, pageSize, offset, setSearchParams]);

  const queryParams: WorksQuery = {
    search: debouncedQuery || undefined,
    domain: domainFilter || undefined,
    field: fieldFilter || undefined,
    yearFrom: toFiniteNumber(yearFrom),
    yearTo: toFiniteNumber(yearTo),
    is_oa: oaOnly || undefined,
    limit: pageSize,
    offset,
    ...encodeSorts(sorts),
  };
  // isPending (not isLoading): with PersistQueryClientProvider, a query
  // whose persisted answer is still being restored from IndexedDB is
  // "pending" but not yet "fetching" — isLoading (isPending && isFetching)
  // would be false during that window, showing the empty "No works found"
  // state for a moment before the skeleton/restored data appears.
  const { data, isPending: loading, isError } = useQuery({
    queryKey: ['works', 'search', queryParams],
    queryFn: () => searchWorks(queryParams),
    placeholderData: (prev) => prev,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const error = isError ? "Failed to load works." : null;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < items.length;
    }
  }, [selectedIds, items]);

  function handleSort(key: SortKey, e: React.MouseEvent) {
    setOffset(0);
    setSorts((prev) => toggleSort(prev, key, e.shiftKey));
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === items.length
        ? new Set()
        : new Set(items.map((w) => w.id))
    );
  }

  function clearMoreFilters() {
    setOffset(0);
    setDomainFilter("");
    setYearFrom("");
    setYearTo("");
    setOaOnly(false);
  }

  function clearAllFilters() {
    setOffset(0);
    setQuery("");
    setFieldFilter("");
    clearMoreFilters();
  }

  const moreFiltersActiveCount = [domainFilter, yearFrom, yearTo, oaOnly].filter(Boolean).length;
  const hasAnyFilter = Boolean(query || fieldFilter || moreFiltersActiveCount);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = Math.min(offset + items.length, total);

  const exportUrl = buildExportCsvUrl({
    search: debouncedQuery || undefined,
    domain: domainFilter || undefined,
    field: fieldFilter || undefined,
    yearFrom: toFiniteNumber(yearFrom),
    yearTo: toFiniteNumber(yearTo),
    is_oa: oaOnly || undefined,
    ...encodeSorts(sorts),
  });

  return (
    <main className="searchPage">
      <div className="uiCard searchToolbarCard">
        <div className="searchToolbarRow">
          <label className="searchField searchFieldGrow">
            <span className="uiFieldLabel">Query</span>
            <div className="searchInputWrap">
              <LuSearch className="searchInputIcon" aria-hidden="true" />
              <input
                className="uiInput searchInput"
                type="text"
                placeholder="Search title or abstract…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </label>

          <label className="searchField">
            <span className="uiFieldLabel">Field</span>
            <select
              className="uiInput"
              value={fieldFilter}
              onChange={(e) => {
                setOffset(0);
                setFieldFilter(e.target.value);
              }}
            >
              <option value="">All fields</option>
              {fields.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="searchField">
            <span className="uiFieldLabel">Sort by</span>
            <select
              className="uiInput"
              value={sorts[0].key}
              onChange={(e) => {
                setOffset(0);
                setSorts([{ key: e.target.value as SortKey, dir: "desc" }]);
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>

          {sorts.length > 1 && (
            <button
              type="button"
              className="uiBtn uiBtnGhost"
              onClick={() => { setOffset(0); setSorts([sorts[0]]); }}
              title="Keep only the primary sort column"
            >
              <LuX aria-hidden="true" />
              <span>{sorts.length} sort columns</span>
            </button>
          )}

          <button
            type="button"
            className={"uiBtn uiBtnSecondary" + (moreFiltersOpen ? " uiBtnActive" : "")}
            onClick={() => setMoreFiltersOpen((v) => !v)}
            aria-expanded={moreFiltersOpen}
          >
            <LuSlidersHorizontal aria-hidden="true" />
            <span>More filters{moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ""}</span>
          </button>
        </div>

        {moreFiltersOpen && (
          <div className="searchMoreFilters">
            <label className="searchField">
              <span className="uiFieldLabel">Domain</span>
              <select
                className="uiInput"
                value={domainFilter}
                onChange={(e) => {
                  setOffset(0);
                  setDomainFilter(e.target.value);
                }}
              >
                <option value="">All domains</option>
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <label className="searchField">
              <span className="uiFieldLabel">Year from</span>
              <input
                className="uiInput searchYearInput"
                type="number"
                min="0"
                placeholder="e.g. 2000"
                value={yearFrom}
                onChange={(e) => {
                  setOffset(0);
                  setYearFrom(e.target.value);
                }}
              />
            </label>

            <label className="searchField">
              <span className="uiFieldLabel">Year to</span>
              <input
                className="uiInput searchYearInput"
                type="number"
                min="0"
                placeholder="e.g. 2024"
                value={yearTo}
                onChange={(e) => {
                  setOffset(0);
                  setYearTo(e.target.value);
                }}
              />
            </label>

            <label className="uiCheck searchOaCheck">
              <input
                type="checkbox"
                checked={oaOnly}
                onChange={(e) => {
                  setOffset(0);
                  setOaOnly(e.target.checked);
                }}
              />
              <span>Open Access only</span>
            </label>

            {moreFiltersActiveCount > 0 && (
              <button type="button" className="uiBtn uiBtnGhost" onClick={clearMoreFilters}>
                <LuX aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="searchSelectionBar">
          <span className="searchSelectionCount">
            {selectedIds.size} paper{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button className="uiBtn uiBtnSecondary" disabled title="Coming soon">
            Open
          </button>
          <button className="uiBtn uiBtnGhost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      <section className="uiCard searchResultsCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <span>Results</span>
            <span className="uiTag">{total.toLocaleString()} work{total !== 1 ? "s" : ""}</span>
          </div>
          <a className="uiBtn uiBtnGhost" href={exportUrl} target="_blank" rel="noreferrer">
            <LuDownload aria-hidden="true" />
            <span>Export CSV</span>
          </a>
        </div>

        {loading && (
          <div className="uiProgress" role="status" aria-label="Loading works">
            <div className="uiProgressBar" />
          </div>
        )}

        <div className="searchTableWrap">
          {error && <div className="searchStatus">{error}</div>}

          {!error && !loading && items.length === 0 && (
            <div className="searchEmptyState">
              <LuFileX aria-hidden="true" className="searchEmptyIcon" />
              <p className="searchEmptyTitle">No works found</p>
              <p className="searchEmptyText">Try a different search term, or loosen your filters.</p>
              {hasAnyFilter && (
                <button type="button" className="uiBtn uiBtnSecondary" onClick={clearAllFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!error && (loading || items.length > 0) && (
            <table className="searchTable">
              <thead>
                <tr>
                  <th className="searchTh searchThCheck">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      disabled={loading}
                    />
                  </th>
                  {cols.map((col) => (
                    <th
                      key={col.key}
                      className={`searchTh${col.num ? " searchThNum" : ""} ${COL_WIDTH_CLASS[col.key] ?? ""}`}
                      onClick={(e) => handleSort(col.key, e)}
                      title="Click to sort. Shift+click to add another sort column."
                    >
                      {col.label}
                      <SortIcon
                        priority={sortPriority(sorts, col.key)}
                        dir={sorts.find((s) => s.key === col.key)?.dir ?? "desc"}
                        showBadge={sorts.length > 1}
                      />
                    </th>
                  ))}
                  <th className="searchTh searchThNum searchThOA searchColCompact">OA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SearchSkeletonRows />
                ) : (
                  items.map((w) => (
                    <tr
                      key={w.id}
                      className={`searchTr${selectedIds.has(w.id) ? " searchTrSelected" : ""}`}
                      onClick={() => navigate(`/paper/${w.id}`)}
                    >
                      <td className="searchTd searchTdCheck" onClick={(e) => toggleSelect(w.id, e)}>
                        <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => {}} />
                      </td>
                      <td className="searchTd searchTdTitle">
                        <div className="searchRowTitle"><Highlight text={w.title} query={debouncedQuery} /></div>
                        <div className="searchRowSub">{humanizeAuthors(w.authors) || "—"}</div>
                        {w.matchSnippet && (
                          <div className="searchRowSnippet">
                            <Highlight text={w.matchSnippet} query={debouncedQuery} />
                          </div>
                        )}
                      </td>
                      <td className="searchTd searchColCompact">
                        {w.field ? (
                          <span className="uiTag">
                            <span className="uiTagDot" style={{ background: fieldColorVar(w.field) }} />
                            {w.field}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="searchTd searchTdNum mono">{w.publication_year}</td>
                      <td className="searchTd searchTdNum mono">{w.cited_by_count?.toLocaleString()}</td>
                      <td className="searchTd searchTdNum searchColCompact">
                        {w.is_oa
                          ? <span className="uiTag uiTagAccent searchOaTag">Open</span>
                          : <span className="uiTag uiTagMuted searchOaTag">Closed</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && total > 0 && (
          <div className="searchPagination">
            <label className="searchPageSizeControl">
              Rows per page
              <select
                className="searchPageSizeSelect"
                value={pageSize}
                onChange={(e) => { setOffset(0); setPageSize(Number(e.target.value)); }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{pageSizeLabel(n)}</option>
                ))}
              </select>
            </label>

            <div className="searchPaginationNav">
              <span className="searchPaginationRange">
                {rangeFrom.toLocaleString()}–{rangeTo.toLocaleString()} of {total.toLocaleString()}
              </span>
              <button
                className="uiBtn uiBtnGhost"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
              >
                <LuChevronLeft aria-hidden="true" /> Prev
              </button>
              <span className="searchPaginationPage">Page {page} of {totalPages}</span>
              <button
                className="uiBtn uiBtnGhost"
                disabled={offset + pageSize >= total}
                onClick={() => setOffset((o) => o + pageSize)}
              >
                Next <LuChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
