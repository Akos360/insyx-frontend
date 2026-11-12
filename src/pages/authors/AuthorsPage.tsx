import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LuChevronUp, LuChevronDown, LuChevronLeft, LuChevronRight,
  LuSearch, LuSlidersHorizontal, LuX, LuUserX, LuArrowUpDown, LuUser, LuDownload,
} from 'react-icons/lu';
import { searchAuthors, getAuthorCountries, buildExportAuthorsCsvUrl, type AuthorsQuery } from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import { toggleSort, encodeSorts, decodeSorts, sortPriority, type SortSpec } from '../../utils/multiSort';
import { PAGE_SIZE_OPTIONS, pageSizeLabel } from '../../utils/pageSize';
import { toSearchParams, toFiniteNumber } from '../../utils/urlSync';
import Highlight from '../../components/common/Highlight';
import '../search/search-page.css';

type SortKey = 'displayName' | 'worksCount' | 'citedByCount' | 'country' | 'hIndex';
type SortDir = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 50;
const SKELETON_ROWS = 8;
// Guards against a crafted/corrupted URL's offset, not a real page count.
const MAX_OFFSET = 10_000_000;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'worksCount', label: 'Papers' },
  { key: 'citedByCount', label: 'Citations' },
  { key: 'hIndex', label: 'h-index' },
  { key: 'displayName', label: 'Name' },
  { key: 'country', label: 'Country' },
];

function SortIcon({ priority, dir, showBadge }: { priority: number; dir: SortDir; showBadge: boolean }) {
  if (priority === 0) return <LuArrowUpDown className="searchSortIdle" aria-hidden="true" />;
  return (
    <span className="searchSortWrap">
      {dir === 'asc'
        ? <LuChevronUp className="searchSortActive" aria-hidden="true" />
        : <LuChevronDown className="searchSortActive" aria-hidden="true" />}
      {showBadge && <sup className="searchSortBadge">{priority}</sup>}
    </span>
  );
}

const SORT_KEYS = SORT_OPTIONS.map((o) => o.key);

function AuthorSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={i} className="searchTr searchTrSkeleton">
          <td className="searchTd searchTdCheck" />
          <td className="searchTd searchColCompact searchTdCountrySep"><div className="uiSkel" style={{ height: 12, width: 28 }} /></td>
          <td className="searchTd searchTdTitle">
            <div className="authorsNameCell">
              <span className="uiSkel" style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0 }} />
              <div className="uiSkel" style={{ height: 13, width: `${45 + (i % 3) * 10}%` }} />
            </div>
          </td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 28, marginLeft: 'auto' }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 40, marginLeft: 'auto' }} /></td>
          <td className="searchTd searchTdNum searchTdHIndex"><div className="uiSkel" style={{ height: 12, width: 20, marginLeft: 'auto' }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function AuthorsPage() {
  const navigate = useNavigate();

  // Read once on mount, then kept in sync by the effect below — a
  // copied/bookmarked URL reproduces the exact same filtered, sorted,
  // paginated view. See SearchPage.tsx for the same pattern.
  const [initialParams, setSearchParams] = useSearchParams();

  const [offset, setOffset] = useState(() => {
    const raw = Math.floor(Number(initialParams.get('offset')));
    return Number.isFinite(raw) && raw > 0 && raw <= MAX_OFFSET ? raw : 0;
  });
  const [pageSize, setPageSize] = useState(() => {
    const raw = Number(initialParams.get('pageSize'));
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_PAGE_SIZE;
  });

  const [query, setQuery] = useState(() => initialParams.get('search') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialParams.get('search') ?? '');
  const [countries, setCountries] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState(() => initialParams.get('country') ?? '');
  const [minWorks, setMinWorks] = useState(() => initialParams.get('minWorks') ?? '');
  const [hasOrcidOnly, setHasOrcidOnly] = useState(() => initialParams.get('hasOrcid') === 'true');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(() =>
    Boolean(initialParams.get('minWorks') || initialParams.get('hasOrcid')),
  );
  const [sorts, setSorts] = useState<SortSpec<SortKey>[]>(() =>
    decodeSorts(initialParams.get('sortBy'), initialParams.get('sortDir'), SORT_KEYS, [{ key: 'worksCount', dir: 'desc' }]),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Offset reset lives in the SAME callback as each filter's own state
  // update (here, and in every filter's onChange below) rather than a
  // separate effect watching all the filter deps — a separate effect
  // commits one render later, firing one wasted request with the new
  // filter but the stale offset before the follow-up effect catches up.
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
    const t = setTimeout(() => { setDebouncedQuery(query); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getAuthorCountries().then(setCountries).catch(() => {});
  }, []);

  // Mirrors current filter/sort/paging state into the URL (replacing, not
  // pushing, history entries) so the address bar is always a shareable
  // snapshot of what's on screen.
  useEffect(() => {
    const isDefaultSort = sorts.length === 1 && sorts[0].key === 'worksCount' && sorts[0].dir === 'desc';
    const { sortBy, sortDir } = encodeSorts(sorts);
    setSearchParams(
      toSearchParams({
        search: debouncedQuery,
        country: countryFilter,
        minWorks,
        hasOrcid: hasOrcidOnly,
        sortBy: isDefaultSort ? undefined : sortBy,
        sortDir: isDefaultSort ? undefined : sortDir,
        pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
        offset: offset || undefined,
      }),
      { replace: true },
    );
  }, [debouncedQuery, countryFilter, minWorks, hasOrcidOnly, sorts, pageSize, offset, setSearchParams]);

  const queryParams: AuthorsQuery = {
    search: debouncedQuery || undefined,
    country: countryFilter || undefined,
    minWorks: toFiniteNumber(minWorks),
    hasOrcid: hasOrcidOnly || undefined,
    ...encodeSorts(sorts),
    limit: pageSize,
    offset,
  };
  // isPending (not isLoading): see SearchPage.tsx for why, under
  // PersistQueryClientProvider.
  const { data, isPending: loading, isError } = useQuery({
    queryKey: ['authors', 'search', queryParams],
    queryFn: () => searchAuthors(queryParams),
    placeholderData: (prev) => prev,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const error = isError ? 'Failed to load authors.' : null;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < items.length;
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
    setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((a) => a.author_id)));
  }

  function clearMoreFilters() {
    setOffset(0);
    setCountryFilter('');
    setMinWorks('');
    setHasOrcidOnly(false);
  }

  function clearAllFilters() {
    setQuery('');
    clearMoreFilters();
  }

  const moreFiltersActiveCount = [countryFilter, minWorks, hasOrcidOnly].filter(Boolean).length;
  const hasAnyFilter = Boolean(query || moreFiltersActiveCount);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = Math.min(offset + items.length, total);

  const exportUrl = buildExportAuthorsCsvUrl({
    search: debouncedQuery || undefined,
    country: countryFilter || undefined,
    minWorks: toFiniteNumber(minWorks),
    hasOrcid: hasOrcidOnly || undefined,
    ...encodeSorts(sorts),
  });

  return (
    <main className="searchPage">
      <div className="uiCard searchToolbarCard">
        <div className="searchToolbarRow">
          <label className="searchField searchFieldGrow">
            <span className="uiFieldLabel">Search</span>
            <div className="searchInputWrap">
              <LuSearch className="searchInputIcon" aria-hidden="true" />
              <input
                className="uiInput searchInput"
                type="text"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </label>

          <label className="searchField">
            <span className="uiFieldLabel">Country</span>
            <select className="uiInput" value={countryFilter} onChange={(e) => { setOffset(0); setCountryFilter(e.target.value); }}>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="searchField">
            <span className="uiFieldLabel">Sort by</span>
            <select
              className="uiInput"
              value={sorts[0].key}
              onChange={(e) => { setOffset(0); setSorts([{ key: e.target.value as SortKey, dir: 'desc' }]); }}
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
            className={'uiBtn uiBtnSecondary' + (moreFiltersOpen ? ' uiBtnActive' : '')}
            onClick={() => setMoreFiltersOpen((v) => !v)}
            aria-expanded={moreFiltersOpen}
          >
            <LuSlidersHorizontal aria-hidden="true" />
            <span>More filters{moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ''}</span>
          </button>
        </div>

        {moreFiltersOpen && (
          <div className="searchMoreFilters">
            <label className="searchField">
              <span className="uiFieldLabel">Min papers</span>
              <input
                className="uiInput searchYearInput"
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={minWorks}
                onChange={(e) => { setOffset(0); setMinWorks(e.target.value); }}
              />
            </label>

            <label className="uiCheck searchOaCheck">
              <input type="checkbox" checked={hasOrcidOnly} onChange={(e) => { setOffset(0); setHasOrcidOnly(e.target.checked); }} />
              <span>Has ORCID only</span>
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
            {selectedIds.size} author{selectedIds.size !== 1 ? 's' : ''} selected
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
            <span>Authors</span>
            <span className="uiTag">{total.toLocaleString()} author{total !== 1 ? 's' : ''}</span>
          </div>
          <a className="uiBtn uiBtnGhost" href={exportUrl} target="_blank" rel="noreferrer">
            <LuDownload aria-hidden="true" />
            <span>Export CSV</span>
          </a>
        </div>

        {loading && (
          <div className="uiProgress" role="status" aria-label="Loading authors">
            <div className="uiProgressBar" />
          </div>
        )}

        <div className="searchTableWrap">
          {error && <div className="searchStatus">{error}</div>}

          {!error && !loading && items.length === 0 && (
            <div className="searchEmptyState">
              <LuUserX aria-hidden="true" className="searchEmptyIcon" />
              <p className="searchEmptyTitle">No authors found</p>
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
                  <th
                    className="searchTh searchColCompact searchThCountry searchThCountrySep"
                    onClick={(e) => handleSort('country', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Country <SortIcon priority={sortPriority(sorts, 'country')} dir={sorts.find((s) => s.key === 'country')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThTitle"
                    onClick={(e) => handleSort('displayName', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Name <SortIcon priority={sortPriority(sorts, 'displayName')} dir={sorts.find((s) => s.key === 'displayName')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThCount"
                    onClick={(e) => handleSort('worksCount', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Papers <SortIcon priority={sortPriority(sorts, 'worksCount')} dir={sorts.find((s) => s.key === 'worksCount')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThCitations"
                    onClick={(e) => handleSort('citedByCount', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Citations <SortIcon priority={sortPriority(sorts, 'citedByCount')} dir={sorts.find((s) => s.key === 'citedByCount')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThHIndex"
                    onClick={(e) => handleSort('hIndex', e)}
                    title="h-index within this corpus. Click to sort. Shift+click to add another sort column."
                  >
                    h-index <SortIcon priority={sortPriority(sorts, 'hIndex')} dir={sorts.find((s) => s.key === 'hIndex')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AuthorSkeletonRows />
                ) : (
                  items.map((a) => (
                    <tr
                      key={a.author_id}
                      className={`searchTr${selectedIds.has(a.author_id) ? ' searchTrSelected' : ''}`}
                      onClick={() => navigate(`/author/${a.author_id}`)}
                    >
                      <td className="searchTd searchTdCheck" onClick={(e) => toggleSelect(a.author_id, e)}>
                        <input type="checkbox" checked={selectedIds.has(a.author_id)} onChange={() => {}} />
                      </td>
                      <td className="searchTd searchColCompact searchTdCountrySep">
                        {a.country_code || '—'}
                      </td>
                      <td className="searchTd searchTdTitle">
                        <div className="authorsNameCell">
                          <span className="authorsAvatar" aria-hidden="true"><LuUser size={14} /></span>
                          <div className="authorsNameCellText">
                            <div className="searchRowTitle">
                              <Highlight text={humanizeAuthors(a.display_name) || a.author_id} query={debouncedQuery} />
                            </div>
                            {a.orcid && <div className="searchRowSub">ORCID</div>}
                          </div>
                        </div>
                      </td>
                      <td className="searchTd searchTdNum mono">{a.works_count.toLocaleString()}</td>
                      <td className="searchTd searchTdNum mono">{a.cited_by_count?.toLocaleString() ?? 0}</td>
                      <td className="searchTd searchTdNum mono searchTdHIndex">{a.hIndex}</td>
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
