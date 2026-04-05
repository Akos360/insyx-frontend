import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsArrowLeft, BsGrid } from 'react-icons/bs';
import { getAllPapers, type Paper } from '../api/papers';
import { CHART_LIST } from '../charts/chartList';
import { buildChartOption, makeThemeColors } from '../charts/buildChartOption';
import { useTheme } from '../theme/useTheme';
import './single-chart-page.css';

// ---------------------------------------------------------------------------
// Derive unique sorted values from the dataset for filter dropdowns
// ---------------------------------------------------------------------------
function uniqueSorted<T>(arr: T[]): T[] {
  return [...new Set(arr)].sort() as T[];
}

export default function SingleChartPage() {
  const { chartId = 'papers-by-field' } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const meta = CHART_LIST.find(c => c.id === chartId) ?? CHART_LIST[0];
  const idx  = CHART_LIST.indexOf(meta);

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: papers = [], isLoading, isError } = useQuery({
    queryKey: ['papers'],
    queryFn: getAllPapers,
  });

  // ── filter state ──────────────────────────────────────────────────────────
  const years  = useMemo(() => uniqueSorted(papers.map(p => p.publicationYear).filter(Boolean)), [papers]);
  const fields = useMemo(() => uniqueSorted(papers.map(p => p.field).filter(Boolean)),           [papers]);

  const minYear = years[0]  ?? 2012;
  const maxYear = years[years.length - 1] ?? 2024;

  const [yearFrom,    setYearFrom]    = useState<number | ''>('');
  const [yearTo,      setYearTo]      = useState<number | ''>('');
  const [selFields,   setSelFields]   = useState<string[]>([]);
  const [oaFilter,    setOaFilter]    = useState<'all' | 'open' | 'closed'>('all');

  function toggleField(f: string) {
    setSelFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  // ── apply filters ─────────────────────────────────────────────────────────
  const filtered: Paper[] = useMemo(() => {
    return papers.filter(p => {
      if (yearFrom !== '' && p.publicationYear < (yearFrom as number)) return false;
      if (yearTo   !== '' && p.publicationYear > (yearTo   as number)) return false;
      if (selFields.length > 0 && !selFields.includes(p.field))        return false;
      if (oaFilter === 'open'   && !p.isOa)                            return false;
      if (oaFilter === 'closed' &&  p.isOa)                            return false;
      return true;
    });
  }, [papers, yearFrom, yearTo, selFields, oaFilter]);

  // ── chart option ──────────────────────────────────────────────────────────
  const option = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    return buildChartOption(chartId, filtered, ct);
  }, [chartId, filtered, theme]);

  // ── navigation between charts ─────────────────────────────────────────────
  const prevChart = () => navigate(`/graph/${CHART_LIST[(idx - 1 + CHART_LIST.length) % CHART_LIST.length].id}`);
  const nextChart = () => navigate(`/graph/${CHART_LIST[(idx + 1) % CHART_LIST.length].id}`);

  return (
    <div className="scPage">
      {/* ── top bar ── */}
      <div className="scTopBar">
        <Link to="/graph" className="scBack" title="All charts">
          <BsArrowLeft size={14} /> All Charts
        </Link>

        <div className="scChartNav">
          <button className="scNavBtn" onClick={prevChart}>‹</button>
          <span className="scChartTitle">{meta.title}</span>
          <button className="scNavBtn" onClick={nextChart}>›</button>
        </div>

        <Link to="/graph" className="scGridBtn" title="Grid view">
          <BsGrid size={14} />
        </Link>
      </div>

      <div className="scBody">
        {/* ── chart area ── */}
        <div className="scChartArea">
          {isLoading && <div className="scStatus">Loading data…</div>}
          {isError   && <div className="scStatus scStatusError">Failed to load data.</div>}
          {!isLoading && !isError && (
            <>
              {filtered.length === 0
                ? <div className="scStatus">No papers match the current filters.</div>
                : <ReactECharts
                    key={`${chartId}-${theme}`}
                    option={option}
                    notMerge
                    style={{ width: '100%', height: '100%' }}
                  />
              }
            </>
          )}
          <div className="scCount">{filtered.length.toLocaleString()} papers</div>
        </div>

        {/* ── filter sidebar ── */}
        <aside className="scFilters">
          <div className="scFilterSection">
            <div className="scFilterLabel">Year range</div>
            <div className="scYearRow">
              <input
                type="number"
                className="scYearInput"
                placeholder={String(minYear)}
                min={minYear}
                max={maxYear}
                value={yearFrom}
                onChange={e => setYearFrom(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="scYearSep">–</span>
              <input
                type="number"
                className="scYearInput"
                placeholder={String(maxYear)}
                min={minYear}
                max={maxYear}
                value={yearTo}
                onChange={e => setYearTo(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="scFilterSection">
            <div className="scFilterLabel">Open access</div>
            {(['all', 'open', 'closed'] as const).map(v => (
              <label key={v} className="scRadioLabel">
                <input
                  type="radio"
                  name="oa"
                  value={v}
                  checked={oaFilter === v}
                  onChange={() => setOaFilter(v)}
                />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </label>
            ))}
          </div>

          {fields.length > 0 && (
            <div className="scFilterSection scFilterSectionFields">
              <div className="scFilterLabel">
                Field
                {selFields.length > 0 && (
                  <button className="scClearBtn" onClick={() => setSelFields([])}>clear</button>
                )}
              </div>
              <div className="scFieldList">
                {fields.map(f => (
                  <label key={f} className="scCheckLabel">
                    <input
                      type="checkbox"
                      checked={selFields.includes(f)}
                      onChange={() => toggleField(f)}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            className="scResetBtn"
            onClick={() => { setYearFrom(''); setYearTo(''); setSelFields([]); setOaFilter('all'); }}
          >
            Reset all filters
          </button>
        </aside>
      </div>
    </div>
  );
}
