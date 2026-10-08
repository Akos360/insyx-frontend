import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsBoxArrowUpRight } from 'react-icons/bs';
import BackLink from '../../components/common/BackLink';
import {
  getInstitution,
  getInstitutionAuthors,
  getInstitutionWorks,
  countryFlag,
} from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import '../authors/author-page.css';

function humanizeSlug(value: string | null): string | null {
  if (!value) return null;
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function InstitutionPage() {
  const { institutionId = '' } = useParams<{ institutionId: string }>();

  const { data: institution, isLoading, isError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => getInstitution(institutionId),
    enabled: !!institutionId,
  });

  const { data: works = [] } = useQuery({
    queryKey: ['institution', institutionId, 'works'],
    queryFn: () => getInstitutionWorks(institutionId),
    enabled: !!institutionId,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['institution', institutionId, 'authors'],
    queryFn: () => getInstitutionAuthors(institutionId),
    enabled: !!institutionId,
  });

  const [worksSort, setWorksSort] = useState<'year' | 'citations' | 'title'>('citations');
  const sortedWorks = useMemo(() => {
    const sorted = [...works];
    if (worksSort === 'year') sorted.sort((a, b) => (b.publication_year ?? 0) - (a.publication_year ?? 0));
    else if (worksSort === 'citations') sorted.sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0));
    else sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    return sorted;
  }, [works, worksSort]);

  const [authorsSort, setAuthorsSort] = useState<'name' | 'works' | 'citations'>('works');
  const sortedAuthors = useMemo(() => {
    const sorted = [...authors];
    if (authorsSort === 'name') {
      sorted.sort((a, b) =>
        (humanizeAuthors(a.display_name) || a.author_id).localeCompare(humanizeAuthors(b.display_name) || b.author_id),
      );
    } else if (authorsSort === 'works') {
      sorted.sort((a, b) => (b.works_count ?? 0) - (a.works_count ?? 0));
    } else {
      sorted.sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0));
    }
    return sorted;
  }, [authors, authorsSort]);

  if (isLoading) return <div className="authorPage"><div className="authorStatus">Loading…</div></div>;
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
          <span className="authorStatValue">{authors.length}</span>
          <span className="authorStatLabel">{authors.length === 1 ? 'Author' : 'Authors'}</span>
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
            <div className="authorSectionTitle">Works ({works.length})</div>
            {works.length > 1 && (
              <select
                className="authorsSort"
                value={worksSort}
                onChange={(e) => setWorksSort(e.target.value as typeof worksSort)}
              >
                <option value="citations">Sort: Citations</option>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
              </select>
            )}
          </div>
          <div className="authorPaperList">
            {works.length === 0 && <div className="authorStatus">No works on record for this institution.</div>}
            {sortedWorks.map(w => (
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
        </div>

        <div className="authorSection">
          <div className="authorSectionHead">
            <div className="authorSectionTitle">Authors ({authors.length})</div>
            {authors.length > 1 && (
              <select
                className="authorsSort"
                value={authorsSort}
                onChange={(e) => setAuthorsSort(e.target.value as typeof authorsSort)}
              >
                <option value="works">Sort: Works</option>
                <option value="citations">Sort: Citations</option>
                <option value="name">Sort: Name</option>
              </select>
            )}
          </div>
          <div className="authorsList">
            {authors.length === 0 && <div className="authorStatus">No author data on record for this institution.</div>}
            {sortedAuthors.map(a => (
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
        </div>
      </div>
    </div>
  );
}
