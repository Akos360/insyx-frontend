import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { searchWorks, getWorkFields, getWorkDomains, buildExportCsvUrl, type Work } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import { fieldColorVar } from "../../utils/fieldColor";
import "./search-page.css";

type SortKey = "title" | "authors" | "publicationYear" | "field" | "citedByCount";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;
const SKELETON_ROWS = 8;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "citedByCount", label: "Citations" },
  { key: "publicationYear", label: "Year" },
  { key: "title", label: "Title" },
  { key: "field", label: "Field" },
  { key: "authors", label: "Authors" },
];

const cols: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "publicationYear", label: "Year", num: true },
  { key: "field", label: "Field" },
  { key: "citedByCount", label: "Citations", num: true },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <LuArrowUpDown className="searchSortIdle" aria-hidden="true" />;
  return dir === "asc"
    ? <LuChevronUp className="searchSortActive" aria-hidden="true" />
    : <LuChevronDown className="searchSortActive" aria-hidden="true" />;
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
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 32, marginLeft: "auto" }} /></td>
          <td className="searchTd searchColCompact"><div className="uiSkel" style={{ height: 20, width: 90, borderRadius: 999 }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 40, marginLeft: "auto" }} /></td>
          <td className="searchTd searchTdNum searchColCompact"><div className="uiSkel" style={{ height: 20, width: 24, marginLeft: "auto", borderRadius: 999 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function SearchPage() {
  const [items, setItems] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [fieldFilter, setFieldFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [oaOnly, setOaOnly] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("citedByCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced so every keystroke doesn't hit the lakehouse.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  useEffect(() => {
    getWorkFields().then(setFields).catch(() => {});
    getWorkDomains().then(setDomains).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    searchWorks({
      search: debouncedQuery || undefined,
      domain: domainFilter || undefined,
      field: fieldFilter || undefined,
      yearFrom: yearFrom ? Number(yearFrom) : undefined,
      yearTo: yearTo ? Number(yearTo) : undefined,
      is_oa: oaOnly || undefined,
      limit: PAGE_SIZE,
      offset,
      sortBy: sortKey,
      sortDir,
    })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
      })
      .catch(() => setError("Failed to load works."))
      .finally(() => setLoading(false));
  }, [debouncedQuery, domainFilter, fieldFilter, yearFrom, yearTo, oaOnly, sortKey, sortDir, offset]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < items.length;
    }
  }, [selectedIds, items]);

  function handleSort(key: SortKey) {
    setOffset(0);
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
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

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = Math.min(offset + items.length, total);

  const exportUrl = buildExportCsvUrl({
    search: debouncedQuery || undefined,
    domain: domainFilter || undefined,
    field: fieldFilter || undefined,
    yearFrom: yearFrom ? Number(yearFrom) : undefined,
    yearTo: yearTo ? Number(yearTo) : undefined,
    is_oa: oaOnly || undefined,
    sortBy: sortKey,
    sortDir,
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
              value={sortKey}
              onChange={(e) => {
                setOffset(0);
                setSortKey(e.target.value as SortKey);
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>

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
                      className={`searchTh${col.num ? " searchThNum" : ""}${col.key === "title" ? " searchThTitle" : ""}${col.key === "field" ? " searchColCompact" : ""}`}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </th>
                  ))}
                  <th className="searchTh searchThNum searchColCompact">OA</th>
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
                        <div className="searchRowTitle">{w.title}</div>
                        <div className="searchRowSub">{humanizeAuthors(w.authors) || "—"}</div>
                      </td>
                      <td className="searchTd searchTdNum mono">{w.publication_year}</td>
                      <td className="searchTd searchColCompact">
                        {w.field ? (
                          <span className="uiTag">
                            <span className="uiTagDot" style={{ background: fieldColorVar(w.field) }} />
                            {w.field}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="searchTd searchTdNum mono">{w.cited_by_count?.toLocaleString()}</td>
                      <td className="searchTd searchTdNum searchColCompact">
                        {w.is_oa
                          ? <span className="uiTag uiTagAccent">Open</span>
                          : <span className="uiTag uiTagMuted">—</span>}
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
            <span className="searchPaginationRange">
              {rangeFrom.toLocaleString()}–{rangeTo.toLocaleString()} of {total.toLocaleString()}
            </span>
            <button
              className="uiBtn uiBtnGhost"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              <LuChevronLeft aria-hidden="true" /> Prev
            </button>
            <span className="searchPaginationPage">Page {page} of {totalPages}</span>
            <button
              className="uiBtn uiBtnGhost"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next <LuChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
