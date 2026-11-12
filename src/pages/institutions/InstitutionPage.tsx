import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsBoxArrowUpRight } from 'react-icons/bs';
import BackLink from '../../components/common/BackLink';
import { AuthorRowSkeleton, WorkRowSkeleton } from '../../components/common/Skeletons';
import {
  getInstitution,
  getInstitutionAuthors,
  getInstitutionWorks,
  countryFlag,
  type Work,
  type InstitutionAuthor,
} from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import '../authors/author-page.css';

// Matches the backend's own PaginationQueryDto default (see works.service.ts).
const PAGE_SIZE = 25;

function humanizeSlug(value: string | null): string | null {
  if (!value) return null;
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function InstitutionPage() {
  const { institutionId = '' } = useParams<{ institutionId: string }>();

  // isPending, not isLoading — under PersistQueryClientProvider, isLoading is
  // falsely false during the IndexedDB-restore window (pending but not yet
  // fetching), which would flash the "not found" state on every hard refresh.
  const { data: institution, isPending, isError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => getInstitution(institutionId),
    enabled: !!institutionId,
  });

  const { data: worksPage } = useQuery({
    queryKey: ['institution', institutionId, 'works'],
    queryFn: () => getInstitutionWorks(institutionId, { limit: PAGE_SIZE }),
    enabled: !!institutionId,
  });
  const { data: authorsPage } = useQuery({
    queryKey: ['institution', institutionId, 'authors'],
    queryFn: () => getInstitutionAuthors(institutionId, { limit: PAGE_SIZE }),
    enabled: !!institutionId,
  });

  // Each query above only ever holds its first page — "Load more" appends
  // additional pages here instead of refetching everything. Both lists come
  // back from the backend already ordered most-cited-first; no client sort
  // any more, since re-sorting only what's loaded so far (e.g. by title)
  // would silently hide higher-ranked items not yet loaded.
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoadingMoreWorks, setIsLoadingMoreWorks] = useState(false);
  useEffect(() => setWorks(worksPage?.items ?? []), [worksPage]);

  const [authors, setAuthors] = useState<InstitutionAuthor[]>([]);
  const [isLoadingMoreAuthors, setIsLoadingMoreAuthors] = useState(false);
  useEffect(() => setAuthors(authorsPage?.items ?? []), [authorsPage]);

  async function loadMoreWorks() {
    if (isLoadingMoreWorks) return;
    setIsLoadingMoreWorks(true);
    try {
      const next = await getInstitutionWorks(institutionId, { limit: PAGE_SIZE, offset: works.length });
      setWorks((prev) => [...prev, ...next.items]);
    } finally {
      setIsLoadingMoreWorks(false);
    }
  }

  async function loadMoreAuthors() {
    if (isLoadingMoreAuthors) return;
    setIsLoadingMoreAuthors(true);
    try {
      const next = await getInstitutionAuthors(institutionId, { limit: PAGE_SIZE, offset: authors.length });
      setAuthors((prev) => [...prev, ...next.items]);
    } finally {
      setIsLoadingMoreAuthors(false);
    }
  }

  const worksTotal = worksPage?.total ?? 0;
  const authorsTotal = authorsPage?.total ?? 0;

  if (isPending) return (
    <div className="authorPage">
      <BackLink to="/institutions" label="All Institutions" />
      <div className="authorHeader">
        <div className="authorHeaderMain">
          <span className="uiSkel" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div>
            <span className="uiSkel" style={{ display: 'block', height: 22, width: 220, marginBottom: 8 }} />
            <span className="uiSkel" style={{ display: 'block', height: 13, width: 120 }} />
          </div>
        </div>
      </div>
      <div className="authorStats">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="authorStat" key={i}>
            <span className="uiSkel" style={{ display: 'block', height: 20, width: 40, marginBottom: 6 }} />
            <span className="uiSkel" style={{ display: 'block', height: 10, width: 60 }} />
          </div>
        ))}
      </div>
      <div className="authorBody">
        <div className="authorSection authorPapers">
          <div className="authorSectionTitle">Works</div>
          <div className="authorPaperList">
            {Array.from({ length: 4 }).map((_, i) => <WorkRowSkeleton key={i} />)}
          </div>
        </div>
        <div className="authorSection">
          <div className="authorSectionTitle">Authors</div>
          <div className="authorsList">
            {Array.from({ length: 4 }).map((_, i) => <AuthorRowSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
  if (isError || !institution) return (
    <div className="authorPage">
      <div className="authorStatus">Institution not found. <Link to="/institutions">Back to institutions</Link></div>
    </div>
  );

  const flag = countryFlag(institution.countryCode);

  return (
    <div className="authorPage">
      <BackLink to="/institutions" label="All Institutions" />

      <div className="authorHeader">
        <div className="authorHeaderMain">
          {flag && <span className="authorFlag">{flag}</span>}
          <div>
            <h1 className="authorName">{institution.name}</h1>
            {institution.institutionType && (
              <p className="authorInstitution">{humanizeSlug(institution.institutionType)}</p>
            )}
            {institution.countryCode && (
              <p className="authorCountry">{institution.countryCode}</p>
            )}
          </div>
        </div>
        {institution.homepageUrl && (
          <a
            className="authorOrcid"
            href={institution.homepageUrl}
            target="_blank"
            rel="noreferrer"
            title="Visit homepage"
          >
            <span>Homepage</span>
            <BsBoxArrowUpRight size={11} />
          </a>
        )}
      </div>

      <div className="authorStats">
        <div className="authorStat">
          <span className="authorStatValue">{institution.workCount.toLocaleString()}</span>
          <span className="authorStatLabel">Works</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{institution.citationCount.toLocaleString()}</span>
          <span className="authorStatLabel">Total citations</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{authorsTotal}</span>
          <span className="authorStatLabel">{authorsTotal === 1 ? 'Author' : 'Authors'}</span>
        </div>
        {institution.ror && (
          <div className="authorStat">
            <span className="authorStatValue"><BsBoxArrowUpRight size={14} /></span>
            <span className="authorStatLabel">
              <a href={institution.ror} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>ROR</a>
            </span>
          </div>
        )}
      </div>

      <div className="authorBody">
        <div className="authorSection authorPapers">
          <div className="authorSectionHead">
            <div className="authorSectionTitle">Works ({worksTotal})</div>
          </div>
          <div className="authorPaperList">
            {works.length === 0 && <div className="authorStatus">No works on record for this institution.</div>}
            {works.map(w => (
              <Link key={w.id} to={`/paper/${w.id}`} className="authorPaperItem">
                <div className="authorPaperMeta">
                  <span className="authorPaperYear">{w.publication_year}</span>
                  {w.field && <span className="authorPaperField">{w.field}</span>}
                  {w.is_oa && <span className="authorPaperOa">OA</span>}
                </div>
                <div className="authorPaperTitle">{w.title ?? w.id}</div>
                {w.source_name && (
                  <div className="authorPaperSource">
                    {w.source_name}
                    {w.cited_by_count != null && (
                      <span className="authorPaperCites">{w.cited_by_count.toLocaleString()} citations</span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {works.length < worksTotal && (
            <button
              type="button"
              className="uiBtn uiBtnSecondary authorLoadMoreBtn"
              onClick={loadMoreWorks}
              disabled={isLoadingMoreWorks}
            >
              {isLoadingMoreWorks ? 'Loading…' : `Load more (${worksTotal - works.length} remaining)`}
            </button>
          )}
        </div>

        <div className="authorSection">
          <div className="authorSectionHead">
            <div className="authorSectionTitle">Authors ({authorsTotal})</div>
          </div>
          <div className="authorsList">
            {authors.length === 0 && <div className="authorStatus">No author data on record for this institution.</div>}
            {authors.map(a => (
              <Link key={a.author_id} to={`/author/${a.author_id}`} className="authorsCard">
                <span className="authorsFlag">{countryFlag(a.country_code)}</span>
                <div className="authorsCardBody">
                  <span className="authorsName">{humanizeAuthors(a.display_name) || a.author_id}</span>
                </div>
                <div className="authorsCardMeta">
                  <span className="authorsPaperBadge">{a.works_count} {a.works_count === 1 ? 'paper' : 'papers'}</span>
                  <span
                    className={`authorsOrcidDot${a.orcid ? '' : ' authorsOrcidDotHidden'}`}
                    title={a.orcid ? 'Has ORCID' : undefined}
                  >
                    ID
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {authors.length < authorsTotal && (
            <button
              type="button"
              className="uiBtn uiBtnSecondary authorLoadMoreBtn"
              onClick={loadMoreAuthors}
              disabled={isLoadingMoreAuthors}
            >
              {isLoadingMoreAuthors ? 'Loading…' : `Load more (${authorsTotal - authors.length} remaining)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
