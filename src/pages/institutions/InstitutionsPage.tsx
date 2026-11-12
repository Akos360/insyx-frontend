import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LuChevronUp, LuChevronDown, LuChevronLeft, LuChevronRight,
  LuSearch, LuSlidersHorizontal, LuX, LuBuilding2, LuArrowUpDown, LuDownload,
} from 'react-icons/lu';
import { listInstitutions, getInstitutionsByCountry, buildExportInstitutionsCsvUrl, type InstitutionsQuery } from '../../api/works';
import { toggleSort, encodeSorts, decodeSorts, sortPriority, type SortSpec } from '../../utils/multiSort';
import { PAGE_SIZE_OPTIONS, pageSizeLabel } from '../../utils/pageSize';
import { toSearchParams, toFiniteNumber } from '../../utils/urlSync';
import Highlight from '../../components/common/Highlight';
import '../search/search-page.css';

type SortKey = 'name' | 'worksCount' | 'citedByCount' | 'authorCount' | 'country';
type SortDir = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 50;
const SKELETON_ROWS = 8;
// Guards against a crafted/corrupted URL's offset, not a real page count.
const MAX_OFFSET = 10_000_000;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'worksCount', label: 'Works' },
  { key: 'citedByCount', label: 'Citations' },
  { key: 'authorCount', label: 'Authors' },
  { key: 'name', label: 'Name' },
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

function InstitutionSkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={i} className="searchTr searchTrSkeleton">
          <td className="searchTd searchColCompact searchTdCountrySep"><div className="uiSkel" style={{ height: 12, width: 28 }} /></td>
          <td className="searchTd searchTdTitle">
            <div className="uiSkel" style={{ height: 13, width: `${55 + (i % 3) * 10}%` }} />
          </td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 28, marginLeft: 'auto' }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 28, marginLeft: 'auto' }} /></td>
          <td className="searchTd searchTdNum"><div className="uiSkel" style={{ height: 12, width: 40, marginLeft: 'auto' }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function InstitutionsPage() {
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
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(() => Boolean(initialParams.get('minWorks')));
  const [sorts, setSorts] = useState<SortSpec<SortKey>[]>(() =>
    decodeSorts(initialParams.get('sortBy'), initialParams.get('sortDir'), SORT_KEYS, [{ key: 'worksCount', dir: 'desc' }]),
  );

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
    getInstitutionsByCountry()
      .then((rows) => setCountries([...rows.map((r) => r.countryCode)].sort()))
      .catch(() => {});
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
        sortBy: isDefaultSort ? undefined : sortBy,
        sortDir: isDefaultSort ? undefined : sortDir,
        pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
        offset: offset || undefined,
      }),
      { replace: true },
    );
  }, [debouncedQuery, countryFilter, minWorks, sorts, pageSize, offset, setSearchParams]);

  const queryParams: InstitutionsQuery = {
    search: debouncedQuery || undefined,
    country: countryFilter || undefined,
    minWorks: toFiniteNumber(minWorks),
    ...encodeSorts(sorts),
    limit: pageSize,
    offset,
  };
  // isPending (not isLoading): see SearchPage.tsx for why, under
  // PersistQueryClientProvider.
  const { data, isPending: loading, isError } = useQuery({
    queryKey: ['institutions', 'search', queryParams],
    queryFn: () => listInstitutions(queryParams),
    placeholderData: (prev) => prev,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const error = isError ? 'Failed to load institutions.' : null;

  function handleSort(key: SortKey, e: React.MouseEvent) {
    setOffset(0);
    setSorts((prev) => toggleSort(prev, key, e.shiftKey));
  }

  function clearMoreFilters() {
    setOffset(0);
    setCountryFilter('');
    setMinWorks('');
  }

  function clearAllFilters() {
    setQuery('');
    clearMoreFilters();
  }

  const moreFiltersActiveCount = [countryFilter, minWorks].filter(Boolean).length;
  const hasAnyFilter = Boolean(query || moreFiltersActiveCount);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : offset + 1;
  const rangeTo = Math.min(offset + items.length, total);

  const exportUrl = buildExportInstitutionsCsvUrl({
    search: debouncedQuery || undefined,
    country: countryFilter || undefined,
    minWorks: toFiniteNumber(minWorks),
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
              <span className="uiFieldLabel">Min works</span>
              <input
                className="uiInput searchYearInput"
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={minWorks}
                onChange={(e) => { setOffset(0); setMinWorks(e.target.value); }}
              />
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

      <section className="uiCard searchResultsCard">
        <div className="uiCardHead">
          <div className="uiCardTitle">
            <span>Institutions</span>
            <span className="uiTag">{total.toLocaleString()} institution{total !== 1 ? 's' : ''}</span>
          </div>
          <a className="uiBtn uiBtnGhost" href={exportUrl} target="_blank" rel="noreferrer">
            <LuDownload aria-hidden="true" />
            <span>Export CSV</span>
          </a>
        </div>

        {loading && (
          <div className="uiProgress" role="status" aria-label="Loading institutions">
            <div className="uiProgressBar" />
          </div>
        )}

        <div className="searchTableWrap">
          {error && <div className="searchStatus">{error}</div>}

          {!error && !loading && items.length === 0 && (
            <div className="searchEmptyState">
              <LuBuilding2 aria-hidden="true" className="searchEmptyIcon" />
              <p className="searchEmptyTitle">No institutions found</p>
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
                  <th
                    className="searchTh searchColCompact searchThCountry searchThCountrySep"
                    onClick={(e) => handleSort('country', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Country <SortIcon priority={sortPriority(sorts, 'country')} dir={sorts.find((s) => s.key === 'country')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThTitle"
                    onClick={(e) => handleSort('name', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Name <SortIcon priority={sortPriority(sorts, 'name')} dir={sorts.find((s) => s.key === 'name')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThCount"
                    onClick={(e) => handleSort('worksCount', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Works <SortIcon priority={sortPriority(sorts, 'worksCount')} dir={sorts.find((s) => s.key === 'worksCount')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThCount"
                    onClick={(e) => handleSort('authorCount', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Authors <SortIcon priority={sortPriority(sorts, 'authorCount')} dir={sorts.find((s) => s.key === 'authorCount')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                  <th
                    className="searchTh searchThNum searchThCitations"
                    onClick={(e) => handleSort('citedByCount', e)}
                    title="Click to sort. Shift+click to add another sort column."
                  >
                    Citations <SortIcon priority={sortPriority(sorts, 'citedByCount')} dir={sorts.find((s) => s.key === 'citedByCount')?.dir ?? 'desc'} showBadge={sorts.length > 1} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <InstitutionSkeletonRows />
                ) : (
                  items.map((i) => (
                    <tr key={i.id} className="searchTr" onClick={() => navigate(`/institution/${i.id}`)}>
                      <td className="searchTd searchColCompact searchTdCountrySep">
                        {i.countryCode || '—'}
                      </td>
                      <td className="searchTd searchTdTitle">
                        <div className="searchRowTitle"><Highlight text={i.name} query={debouncedQuery} /></div>
                      </td>
                      <td className="searchTd searchTdNum mono">{i.workCount.toLocaleString()}</td>
                      <td className="searchTd searchTdNum mono">{(i.authorCount ?? 0).toLocaleString()}</td>
                      <td className="searchTd searchTdNum mono">{i.citationCount.toLocaleString()}</td>
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
