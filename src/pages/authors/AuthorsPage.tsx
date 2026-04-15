import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllAuthors, countryFlag } from '../../api/authors';
import './author-page.css';

type SortKey = 'name' | 'papers' | 'institution';

export default function AuthorsPage() {
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState<SortKey>('papers');

  const { data: authors = [], isLoading, isError } = useQuery({
    queryKey: ['authors'],
    queryFn: getAllAuthors,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? authors.filter(a =>
          a.displayName?.toLowerCase().includes(q) ||
          a.firstInstitutionName?.toLowerCase().includes(q) ||
          a.countryCode?.toLowerCase().includes(q),
        )
      : authors;

    return [...list].sort((a, b) => {
      if (sortBy === 'papers')      return Number(b.paperCount) - Number(a.paperCount);
      if (sortBy === 'name')        return (a.displayName ?? '').localeCompare(b.displayName ?? '');
      if (sortBy === 'institution') return (a.firstInstitutionName ?? '').localeCompare(b.firstInstitutionName ?? '');
      return 0;
    });
  }, [authors, search, sortBy]);

  return (
    <div className="authorsRoot">
      <div className="authorsTopBar">
        <h2 className="authorsTitle">Authors <span className="authorsCount">{authors.length}</span></h2>
        <div className="authorsControls">
          <input
            className="authorsSearch"
            type="search"
            placeholder="Search by name or institution…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="authorsSort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="papers">Sort: Papers</option>
            <option value="name">Sort: Name</option>
            <option value="institution">Sort: Institution</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="authorsStatus">Loading authors…</div>}
      {isError   && <div className="authorsStatus authorsStatusError">Failed to load authors.</div>}

      {!isLoading && !isError && (
        <div className="authorsList">
          {filtered.length === 0 && <div className="authorsStatus">No authors match your search.</div>}
          {filtered.map(a => (
            <Link key={a.authorId} to={`/author/${a.authorId}`} className="authorsCard">
              <span className="authorsFlag">{countryFlag(a.countryCode)}</span>
              <div className="authorsCardBody">
                <span className="authorsName">{a.displayName ?? a.authorId}</span>
                {a.firstInstitutionName && (
                  <span className="authorsInstitution">{a.firstInstitutionName}</span>
                )}
              </div>
              <div className="authorsCardMeta">
                <span className="authorsPaperBadge">{a.paperCount} {Number(a.paperCount) === 1 ? 'paper' : 'papers'}</span>
                {a.orcid && <span className="authorsOrcidDot" title="Has ORCID">ID</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
