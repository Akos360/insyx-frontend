import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronUp, BsChevronDown, BsSearch } from "react-icons/bs";
import { getAllPapers, type Paper } from "../api/papers";
import "./search-page.css";

type SortKey = "title" | "publicationYear" | "citedByCount" | "field" | "authors";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="searchSortIdle">⇅</span>;
  return dir === "asc"
    ? <BsChevronUp className="searchSortActive" />
    : <BsChevronDown className="searchSortActive" />;
}

export default function SearchPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [query, setQuery] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [oaOnly, setOaOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("citedByCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getAllPapers()
      .then(setPapers)
      .catch(() => setError("Failed to load papers."))
      .finally(() => setLoading(false));
  }, []);

  const fields = useMemo(
    () => Array.from(new Set(papers.map((p) => p.field).filter(Boolean))).sort(),
    [papers]
  );

  const results = useMemo(() => {
    const q = query.toLowerCase();
    let list = papers.filter((p) => {
      if (q &&
        !p.title.toLowerCase().includes(q) &&
        !p.authors?.toLowerCase().includes(q) &&
        !p.field?.toLowerCase().includes(q)) return false;
      if (fieldFilter && p.field !== fieldFilter) return false;
      if (yearFrom && p.publicationYear < Number(yearFrom)) return false;
      if (yearTo && p.publicationYear > Number(yearTo)) return false;
      if (oaOnly && !p.isOa) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [papers, query, fieldFilter, yearFrom, yearTo, oaOnly, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const cols: { key: SortKey; label: string; num?: boolean }[] = [
    { key: "title",           label: "Title" },
    { key: "authors",         label: "Authors" },
    { key: "publicationYear", label: "Year",      num: true },
    { key: "field",           label: "Field" },
    { key: "citedByCount",    label: "Citations", num: true },
  ];

  return (
    <main className="searchPage">
      <div className="searchToolbar">
        <div className="searchInputWrap">
          <BsSearch className="searchInputIcon" />
          <input
            className="searchInput"
            type="text"
            placeholder="Search title, author, field…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="searchSelect"
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
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
            const isSpinner = (e.nativeEvent as InputEvent).data === null;
            setYearTo(!yearTo && isSpinner ? String(new Date().getFullYear()) : e.target.value);
          }}
        />
        <label className="searchOaLabel">
          <input
            type="checkbox"
            checked={oaOnly}
            onChange={(e) => setOaOnly(e.target.checked)}
          />
          Open Access
        </label>
        <span className="searchCount">{results.length} result{results.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="searchTableWrap">
        {loading && <div className="searchStatus">Loading papers…</div>}
        {error && <div className="searchStatus">{error}</div>}
        {!loading && !error && results.length === 0 && (
          <div className="searchStatus">No papers found.</div>
        )}
        {!loading && !error && results.length > 0 && (
          <table className="searchTable">
            <thead>
              <tr>
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
              {results.map((p) => (
                <tr
                  key={p.id}
                  className="searchTr"
                  onClick={() => navigate(`/paper/${p.id}`)}
                >
                  <td className="searchTd searchTdTitle">{p.title}</td>
                  <td className="searchTd searchTdMuted">{p.authors ?? "—"}</td>
                  <td className="searchTd searchTdNum">{p.publicationYear}</td>
                  <td className="searchTd searchTdMuted">{p.field ?? "—"}</td>
                  <td className="searchTd searchTdNum">{p.citedByCount?.toLocaleString()}</td>
                  <td className="searchTd searchTdNum">{p.isOa ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}