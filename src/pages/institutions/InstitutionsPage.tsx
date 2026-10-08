import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInstitutions, countryFlag, type InstitutionSummary } from '../../api/works';
import '../authors/author-page.css';

type SortKey = 'name' | 'worksCount' | 'citedByCount';

const PAGE_SIZE = 50;

export default function InstitutionsPage() {
  const [items, setItems] = useState<InstitutionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('worksCount');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => { setOffset(0); }, [debouncedQuery, sortBy]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listInstitutions({ search: debouncedQuery || undefined, sortBy, sortDir: 'desc', limit: PAGE_SIZE, offset })
      .then((page) => { setItems(page.items); setTotal(page.total); })
      .catch(() => setError('Failed to load institutions.'))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sortBy, offset]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="authorsRoot">
      <div className="authorsTopBar">
        <h2 className="authorsTitle">Institutions <span className="authorsCount">{total.toLocaleString()}</span></h2>
        <div className="authorsControls">
          <input
            className="authorsSearch"
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            className="authorsSort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="worksCount">Sort: Works</option>
            <option value="citedByCount">Sort: Citations</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {loading && <div className="authorsStatus">Loading institutions…</div>}
      {error   && <div className="authorsStatus authorsStatusError">{error}</div>}

      {!loading && !error && (
        <>
          <div className="authorsList">
            {items.length === 0 && <div className="authorsStatus">No institutions match your search.</div>}
            {items.map(i => (
              <Link key={i.id} to={`/institution/${i.id}`} className="authorsCard">
                <span className="authorsFlag">{countryFlag(i.countryCode)}</span>
                <div className="authorsCardBody">
                  <span className="authorsName">{i.name}</span>
                </div>
                <div className="authorsCardMeta">
                  <span className="authorsPaperBadge">{i.workCount} {i.workCount === 1 ? 'work' : 'works'}</span>
                  <span className="authorsPaperBadge">
                    {i.authorCount ?? 0} {i.authorCount === 1 ? 'author' : 'authors'}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {total > 0 && (
            <div className="searchPagination">
              <span className="searchPaginationRange">
                {(offset + 1).toLocaleString()}–{Math.min(offset + items.length, total).toLocaleString()} of {total.toLocaleString()}
              </span>
              <button
                className="searchPaginationBtn"
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              >
                Prev
              </button>
              <span className="searchPaginationPage">Page {page} of {totalPages}</span>
              <button
                className="searchPaginationBtn"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
