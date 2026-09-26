import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsArrowLeft, BsBoxArrowUpRight } from 'react-icons/bs';
import { getAuthor, countryFlag } from '../../api/works';
import { humanizeAuthors } from '../../utils/authorNames';
import { makeThemeColors } from '../../charts/buildChartOption';
import { useTheme } from '../../theme/useTheme';
import './author-page.css';

export default function AuthorPage() {
  const { authorId = '' } = useParams<{ authorId: string }>();
  const { theme } = useTheme();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () => getAuthor(authorId),
    enabled: !!authorId,
  });

  const papers = profile?.papers ?? [];

  const stats = useMemo(() => {
    const totalCitations = papers.reduce((s, p) => s + (p.cited_by_count ?? 0), 0);
    const years = papers.map(p => p.publication_year).filter(Boolean);
    const fields = [...new Set(papers.map(p => p.field).filter(Boolean))];
    return { totalCitations, years, fields };
  }, [papers]);

  // ── charts ───────────────────────────────────────────────────────────────
  const { citationsChart, papersYearChart } = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    const ax = {
      axisLine:  { lineStyle: { color: ct.border } },
      axisLabel: { color: ct.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: ct.border } },
      axisTick:  { show: false },
    };

    // Citations per paper (horizontal bar — easiest to read author impact)
    const sorted = [...papers]
      .sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0))
      .slice(0, 10);

    const citationsChart = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v) } },
      yAxis: {
        type: 'category',
        data: sorted.map(p => {
          const t = p.title ?? p.id;
          return t.length > 32 ? t.slice(0, 30) + '…' : t;
        }).reverse(),
        ...ax,
        axisLabel: { ...ax.axisLabel, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: sorted.map(p => p.cited_by_count ?? 0).reverse(),
        itemStyle: { color: ct.colors[0], borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 28,
      }],
    };

    // Papers by year
    const yearCounts: Record<number, number> = {};
    for (const p of papers) {
      if (p.publication_year) yearCounts[p.publication_year] = (yearCounts[p.publication_year] ?? 0) + 1;
    }
    const sortedYears = Object.keys(yearCounts).map(Number).sort();

    const papersYearChart = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 12, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: sortedYears.map(String), ...ax, axisLabel: { ...ax.axisLabel, rotate: 30 } },
      yAxis: { type: 'value', ...ax, minInterval: 1 },
      series: [{
        type: 'bar',
        data: sortedYears.map(y => yearCounts[y]),
        itemStyle: { color: ct.colors[2], borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 36,
      }],
    };

    return { citationsChart, papersYearChart };
  }, [papers, theme]);

  // ── render ────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="authorPage"><div className="authorStatus">Loading…</div></div>;
  if (isError || !profile) return (
    <div className="authorPage">
      <div className="authorStatus">Author not found. <Link to="/authors">Back to authors</Link></div>
    </div>
  );

  const flag = countryFlag(profile.countryCode);
  const displayName = humanizeAuthors(profile.displayName) || authorId;

  return (
    <div className="authorPage">
      {/* ── back ── */}
      <Link to="/authors" className="authorBack"><BsArrowLeft size={13} /> All Authors</Link>

      {/* ── profile header ── */}
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

      {/* ── stats strip ── */}
      <div className="authorStats">
        <div className="authorStat">
          <span className="authorStatValue">{papers.length}</span>
          <span className="authorStatLabel">Papers</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{stats.totalCitations.toLocaleString()}</span>
          <span className="authorStatLabel">Total citations</span>
        </div>
        <div className="authorStat">
          <span className="authorStatValue">{stats.fields.length}</span>
          <span className="authorStatLabel">{stats.fields.length === 1 ? 'Field' : 'Fields'}</span>
        </div>
        {stats.years.length > 1 && (
          <div className="authorStat">
            <span className="authorStatValue">{Math.min(...stats.years)}–{Math.max(...stats.years)}</span>
            <span className="authorStatLabel">Active</span>
          </div>
        )}
      </div>

      {/* ── fields ── */}
      {stats.fields.length > 0 && (
        <div className="authorFieldRow">
          {stats.fields.map(f => <span key={f} className="authorFieldTag">{f}</span>)}
        </div>
      )}

      <div className="authorBody">
        {/* ── papers list ── */}
        <div className="authorSection authorPapers">
          <div className="authorSectionTitle">Works ({papers.length})</div>
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
        </div>

        {/* ── charts ── */}
        {papers.length > 1 && (
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
