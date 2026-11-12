import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsBoxArrowUpRight } from 'react-icons/bs';
import BackLink from '../../components/common/BackLink';
import { WorkRowSkeleton, ChartSkeleton } from '../../components/common/Skeletons';
import { getAuthor, countryFlag, type AuthorPaper } from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import { makeThemeColors } from '../../charts/buildChartOption';
import { useTheme } from '../../theme/useTheme';
import './author-page.css';

// Matches the backend's own PaginationQueryDto default (see works.service.ts).
const PAGE_SIZE = 25;

export default function AuthorPage() {
  const { authorId = '' } = useParams<{ authorId: string }>();
  const { theme } = useTheme();

  // isPending, not isLoading — under PersistQueryClientProvider, isLoading is
  // falsely false during the IndexedDB-restore window (pending but not yet
  // fetching), which would flash the "not found" state on every hard refresh.
  const { data: profile, isPending, isError } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () => getAuthor(authorId, { limit: PAGE_SIZE }),
    enabled: !!authorId,
  });

  // The query above only ever holds the first page — "Load more" appends
  // additional pages here instead of refetching everything, so clicking it
  // repeatedly doesn't re-request papers already on screen.
  const [papers, setPapers] = useState<AuthorPaper[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  useEffect(() => {
    setPapers(profile?.papers ?? []);
  }, [profile]);

  async function loadMorePapers() {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const next = await getAuthor(authorId, { limit: PAGE_SIZE, offset: papers.length });
      setPapers((prev) => [...prev, ...(next?.papers ?? [])]);
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Citation total, fields, active years, and both charts below are computed
  // server-side from the author's *entire* paper list (see
  // WorksService.authorDetail) — `papers` here only ever holds the pages
  // loaded so far, which would silently under-count/mis-chart otherwise.
  const { citationsChart, papersYearChart } = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    const ax = {
      axisLine:  { lineStyle: { color: ct.border } },
      axisLabel: { color: ct.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: ct.border } },
      axisTick:  { show: false },
    };

    const topCited = [...(profile?.topCitedPapers ?? [])].reverse();

    const citationsChart = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v) } },
      yAxis: {
        type: 'category',
        data: topCited.map(p => {
          const t = p.title ?? p.id;
          return t.length > 32 ? t.slice(0, 30) + '…' : t;
        }),
        ...ax,
        axisLabel: { ...ax.axisLabel, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: topCited.map(p => p.cited_by_count ?? 0),
        itemStyle: { color: ct.colors[0], borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 28,
      }],
    };

    const byYear = profile?.papersByYear ?? [];

    const papersYearChart = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 12, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: byYear.map(y => String(y.year)), ...ax, axisLabel: { ...ax.axisLabel, rotate: 30 } },
      yAxis: { type: 'value', ...ax, minInterval: 1 },
      series: [{
        type: 'bar',
        data: byYear.map(y => y.count),
        itemStyle: { color: ct.colors[2], borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 36,
      }],
    };

    return { citationsChart, papersYearChart };
  }, [profile?.topCitedPapers, profile?.papersByYear, theme]);

  if (isPending) return (
    <div className="authorPage">
      <BackLink to="/authors" label="All Authors" />
      <div className="authorHeader">
        <div className="authorHeaderMain">
          <span className="uiSkel" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div>
            <span className="uiSkel" style={{ display: 'block', height: 22, width: 180, marginBottom: 8 }} />
            <span className="uiSkel" style={{ display: 'block', height: 13, width: 120 }} />
          </div>
        </div>
      </div>
      <div className="authorStats">
        {Array.from({ length: 4 }).map((_, i) => (
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
        <div className="authorCharts">
          <div className="authorChartBlock"><ChartSkeleton /></div>
          <div className="authorChartBlock"><ChartSkeleton /></div>
        </div>
      </div>
    </div>
  );
  if (isError || !profile) return (
    <div className="authorPage">
      <div className="authorStatus">Author not found. <Link to="/authors">Back to authors</Link></div>
    </div>
  );

  const flag = countryFlag(profile.countryCode);
  const displayName = humanizeAuthors(profile.displayName) || authorId;

  return (
    <div className="authorPage">
      <BackLink to="/authors" label="All Authors" />

      <div className="authorHeader">
        <div className="authorHeaderMain">
          {flag && <span className="authorFlag">{flag}</span>}
          <div>
            <h1 className="authorName">{displayName}</h1>
            {profile.firstInstitutionName && (
              <p className="authorInstitution">{profile.firstInstitutionName}</p>
            )}
            {profile.countryCode && (
              <p className="authorCountry">{profile.countryCode}</p>
            )}
          </div>
        </div>
        {profile.orcid && (
          <a
            className="authorOrcid"
            href={`https://orcid.org/${profile.orcid}`}
            target="_blank"
            rel="noreferrer"
            title="View ORCID profile"
          >
            <span className="authorOrcidId">ORCID</span>
            {profile.orcid}
            <BsBoxArrowUpRight size={11} />
          </a>
        )}
      </div>

      <div className="authorStats">
        <div className="authorStat">
          <span className="authorStatValue">{profile.papersTotal}</span>
          <span className="authorStatLabel">Papers</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{profile.totalCitations.toLocaleString()}</span>
          <span className="authorStatLabel">Total citations</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{profile.hIndex}</span>
          <span className="authorStatLabel">h-index</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{profile.fields.length}</span>
          <span className="authorStatLabel">{profile.fields.length === 1 ? 'Field' : 'Fields'}</span>
        </div>
        {profile.yearsActive && (
          <div className="authorStat">
            <span className="authorStatValue">{profile.yearsActive.min}–{profile.yearsActive.max}</span>
            <span className="authorStatLabel">Active</span>
          </div>
        )}
      </div>

      {profile.fields.length > 0 && (
        <div className="authorFieldRow">
          {profile.fields.map(f => <span key={f} className="authorFieldTag">{f}</span>)}
        </div>
      )}

      <div className="authorBody">
        <div className="authorSection authorPapers">
          <div className="authorSectionHead">
            <div className="authorSectionTitle">Works ({profile.papersTotal})</div>
          </div>
          <div className="authorPaperList">
            {papers.map(p => (
              <Link key={p.id} to={`/paper/${p.id}`} className="authorPaperItem">
                <div className="authorPaperMeta">
                  <span className="authorPaperYear">{p.publication_year}</span>
                  {p.field && <span className="authorPaperField">{p.field}</span>}
                  {p.is_oa && <span className="authorPaperOa">OA</span>}
                </div>
                <div className="authorPaperTitle">{p.title ?? p.id}</div>
                {p.source_name && (
                  <div className="authorPaperSource">
                    {p.source_name}
                    {p.cited_by_count != null && (
                      <span className="authorPaperCites">{p.cited_by_count.toLocaleString()} citations</span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {papers.length < profile.papersTotal && (
            <button
              type="button"
              className="uiBtn uiBtnSecondary authorLoadMoreBtn"
              onClick={loadMorePapers}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : `Load more (${profile.papersTotal - papers.length} remaining)`}
            </button>
          )}
        </div>

        {profile.papersTotal > 1 && (
          <div className="authorCharts">
            <div className="authorChartBlock">
              <div className="authorSectionTitle">Citations per work</div>
              <ReactECharts option={citationsChart} style={{ height: 220 }} notMerge />
            </div>
            <div className="authorChartBlock">
              <div className="authorSectionTitle">Papers by year</div>
              <ReactECharts option={papersYearChart} style={{ height: 180 }} notMerge />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
