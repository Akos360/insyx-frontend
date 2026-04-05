import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsArrowLeft, BsBoxArrowUpRight } from 'react-icons/bs';
import { getAuthorRecords, countryFlag } from '../api/authors';
import { makeThemeColors } from '../charts/buildChartOption';
import { useTheme } from '../theme/useTheme';
import './author-page.css';

export default function AuthorPage() {
  const { authorId = '' } = useParams<{ authorId: string }>();
  const { theme } = useTheme();

  const { data: records = [], isLoading, isError } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () => getAuthorRecords(authorId),
    enabled: !!authorId,
  });

  // Derive author profile from the first record
  const profile = records[0];

  const stats = useMemo(() => {
    const totalCitations = records.reduce((s, r) => s + (r.paper?.citedByCount ?? 0), 0);
    const years = records.map(r => r.publicationYear).filter(Boolean);
    const fields = [...new Set(records.map(r => r.paper?.field).filter(Boolean))];
    const institutions = [...new Set(
      records.flatMap(r => {
        const base = r.firstInstitutionName ? [r.firstInstitutionName] : [];
        const full = Array.isArray(r.institutionsFull)
          ? r.institutionsFull.map((i: any) => i?.display_name ?? i?.name).filter(Boolean)
          : [];
        return [...base, ...full];
      }),
    )];
    return { totalCitations, years, fields, institutions };
  }, [records]);

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
    const sorted = [...records]
      .filter(r => r.paper)
      .sort((a, b) => (b.paper?.citedByCount ?? 0) - (a.paper?.citedByCount ?? 0))
      .slice(0, 10);

    const citationsChart = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v) } },
      yAxis: {
        type: 'category',
        data: sorted.map(r => {
          const t = r.paper?.title ?? r.paperId;
          return t.length > 32 ? t.slice(0, 30) + '…' : t;
        }).reverse(),
        ...ax,
        axisLabel: { ...ax.axisLabel, fontSize: 10 },
      },
      series: [{
        type: 'bar',
        data: sorted.map(r => r.paper?.citedByCount ?? 0).reverse(),
        itemStyle: { color: ct.colors[0], borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 28,
      }],
    };

    // Papers by year
    const yearCounts: Record<number, number> = {};
    for (const r of records) {
      if (r.publicationYear) yearCounts[r.publicationYear] = (yearCounts[r.publicationYear] ?? 0) + 1;
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
  }, [records, theme]);

  // ── render ────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="authorPage"><div className="authorStatus">Loading…</div></div>;
  if (isError || !profile) return (
    <div className="authorPage">
      <div className="authorStatus">Author not found. <Link to="/authors">Back to authors</Link></div>
    </div>
  );

  const flag = countryFlag(profile.countryCode);

  return (
    <div className="authorPage">
      {/* ── back ── */}
      <Link to="/authors" className="authorBack"><BsArrowLeft size={13} /> All Authors</Link>

      {/* ── profile header ── */}
      <div className="authorHeader">
        <div className="authorHeaderMain">
          {flag && <span className="authorFlag">{flag}</span>}
          <div>
            <h1 className="authorName">{profile.displayName ?? authorId}</h1>
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
          <span className="authorStatValue">{records.length}</span>
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

      {/* ── all institutions ── */}
      {stats.institutions.length > 1 && (
        <div className="authorSection">
          <div className="authorSectionTitle">Institutions</div>
          <div className="authorInstitutionList">
            {stats.institutions.map(inst => (
              <span key={inst} className="authorInstitutionTag">{inst}</span>
            ))}
          </div>
        </div>
      )}

      <div className="authorBody">
        {/* ── papers list ── */}
        <div className="authorSection authorPapers">
          <div className="authorSectionTitle">Works ({records.length})</div>
          <div className="authorPaperList">
            {records.map(r => (
              <Link key={r.paperId} to={`/paper/${r.paperId}`} className="authorPaperItem">
                <div className="authorPaperMeta">
                  <span className="authorPaperYear">{r.publicationYear}</span>
                  {r.paper?.field && <span className="authorPaperField">{r.paper.field}</span>}
                  {r.paper?.isOa && <span className="authorPaperOa">OA</span>}
                </div>
                <div className="authorPaperTitle">{r.paper?.title ?? r.paperId}</div>
                {r.paper?.sourceName && (
                  <div className="authorPaperSource">
                    {r.paper.sourceName}
                    {r.paper.citedByCount != null && (
                      <span className="authorPaperCites">{r.paper.citedByCount.toLocaleString()} citations</span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ── charts ── */}
        {records.length > 1 && (
          <div className="authorCharts">
            <div className="authorChartBlock">
              <div className="authorSectionTitle">Citations per work</div>
              <ReactECharts option={citationsChart} style={{ height: 220 }} notMerge />
            </div>
            {Object.keys({}).length > 0 || stats.years.length > 1 ? (
              <div className="authorChartBlock">
                <div className="authorSectionTitle">Papers by year</div>
                <ReactECharts option={papersYearChart} style={{ height: 180 }} notMerge />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
