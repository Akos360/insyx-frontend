import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronUp, BsChevronDown, BsSearch, BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { searchWorks, getWorkFields, type Work } from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import "./search-page.css";

type SortKey = "title" | "authors" | "publicationYear" | "field" | "citedByCount";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="searchSortIdle">⇅</span>;
  return dir === "asc"
    ? <BsChevronUp className="searchSortActive" />
    : <BsChevronDown className="searchSortActive" />;
}

const cols: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "title",           label: "Title" },
  { key: "authors",         label: "Authors" },
  { key: "publicationYear", label: "Year",      num: true },
  { key: "field",           label: "Field" },
  { key: "citedByCount",    label: "Citations", num: true },
];

export default function SearchPage() {
  const [items, setItems] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [fieldFilter, setFieldFilter] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [oaOnly, setOaOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("citedByCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce free-text search so every keystroke doesn't hit the lakehouse.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery]);

  useEffect(() => {
    getWorkFields()
      .then(setFields)
      .catch(() => {
        /* field dropdown is a nice-to-have; a failed fetch just leaves it empty */
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    searchWorks({
      search: debouncedQuery || undefined,
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
  }, [debouncedQuery, fieldFilter, yearFrom, yearTo, oaOnly, sortKey, sortDir, offset]);

  // Keep the select-all checkbox indeterminate when only some rows (on this page) are selected.
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

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = Math.min(offset + items.length, total);

  return (
    <main className="searchPage">
      <div className="searchToolbar">
        <div className="searchInputWrap">
          <BsSearch className="searchInputIcon" />
          <input
            className="searchInput"
            type="text"
            placeholder="Search title or abstract…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="searchSelect"
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
        <input
          className="searchYearInput"
          type="number"
          min="0"
          placeholder="Year from"
          value={yearFrom}
          onChange={(e) => {
            setOffset(0);
            const isSpinner = (e.nativeEvent as InputEvent).data === null;
            setYearFrom(!yearFrom && isSpinner ? "2000" : e.target.value);
          }}
        />
        <input
          className="searchYearInput"
          type="number"
          min="0"
          placeholder="Year to"
          value={yearTo}
          onChange={(e) => {
            setOffset(0);
            const isSpinner = (e.nativeEvent as InputEvent).data === null;
            setYearTo(!yearTo && isSpinner ? String(new Date().getFullYear()) : e.target.value);
          }}
        />
        <label className="searchOaLabel">
          <input
            type="checkbox"
            checked={oaOnly}
            onChange={(e) => {
              setOffset(0);
              setOaOnly(e.target.checked);
            }}
          />
          Open Access
        </label>
        <span className="searchCount">
          {total.toLocaleString()} result{total !== 1 ? "s" : ""}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="searchSelectionBar">
          <span className="searchSelectionCount">
            {selectedIds.size} paper{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button className="searchSelectionAction" disabled>
            Open
          </button>
          <button
            className="searchSelectionClear"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="searchTableWrap">
        {loading && <div className="searchStatus">Loading works…</div>}
        {error && <div className="searchStatus">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="searchStatus">No works found.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <table className="searchTable">
            <thead>
              <tr>
                <th className="searchTh searchThCheck">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    className={`searchTh${col.num ? " searchThNum" : ""}${col.key === "title" ? " searchThTitle" : ""}`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                <th className="searchTh searchThNum">OA</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr
                  key={w.id}
                  className={`searchTr${selectedIds.has(w.id) ? " searchTrSelected" : ""}`}
                  onClick={() => navigate(`/paper/${w.id}`)}
                >
                  <td className="searchTd searchTdCheck" onClick={(e) => toggleSelect(w.id, e)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(w.id)}
                      onChange={() => {}}
                    />
                  </td>
                  <td className="searchTd searchTdTitle">{w.title}</td>
                  <td className="searchTd searchTdMuted">{humanizeAuthors(w.authors) || "—"}</td>
                  <td className="searchTd searchTdNum">{w.publication_year}</td>
                  <td className="searchTd searchTdMuted">{w.field ?? "—"}</td>
                  <td className="searchTd searchTdNum">{w.cited_by_count?.toLocaleString()}</td>
                  <td className="searchTd searchTdNum">{w.is_oa ? "✓" : "—"}</td>
                </tr>
              ))}
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
            className="searchPaginationBtn"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            <BsChevronLeft /> Prev
          </button>
          <span className="searchPaginationPage">Page {page} of {totalPages}</span>
          <button
            className="searchPaginationBtn"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next <BsChevronRight />
          </button>
        </div>
      )}
    </main>
  );
}
