import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchAuthors, countryFlag, type AuthorListItem } from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import './author-page.css';

type SortKey = 'displayName' | 'worksCount' | 'citedByCount';

const PAGE_SIZE = 50;

export default function AuthorsPage() {
  const [items, setItems] = useState<AuthorListItem[]>([]);
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
    searchAuthors({ search: debouncedQuery || undefined, sortBy, sortDir: 'desc', limit: PAGE_SIZE, offset })
      .then((page) => { setItems(page.items); setTotal(page.total); })
      .catch(() => setError('Failed to load authors.'))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sortBy, offset]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="authorsRoot">
      <div className="authorsTopBar">
        <h2 className="authorsTitle">Authors <span className="authorsCount">{total.toLocaleString()}</span></h2>
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
            <option value="worksCount">Sort: Papers</option>
            <option value="citedByCount">Sort: Citations</option>
            <option value="displayName">Sort: Name</option>
          </select>
        </div>
      </div>

      {loading && <div className="authorsStatus">Loading authors…</div>}
      {error   && <div className="authorsStatus authorsStatusError">{error}</div>}

      {!loading && !error && (
        <>
          <div className="authorsList">
            {items.length === 0 && <div className="authorsStatus">No authors match your search.</div>}
            {items.map(a => (
              <Link key={a.author_id} to={`/author/${a.author_id}`} className="authorsCard">
                <span className="authorsFlag">{countryFlag(a.country_code)}</span>
                <div className="authorsCardBody">
                  <span className="authorsName">{humanizeAuthors(a.display_name) || a.author_id}</span>
                </div>
                <div className="authorsCardMeta">
                  <span className="authorsPaperBadge">{a.works_count} {a.works_count === 1 ? 'paper' : 'papers'}</span>
                  {a.orcid && <span className="authorsOrcidDot" title="Has ORCID">ID</span>}
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
