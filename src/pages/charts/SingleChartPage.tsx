import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsArrowLeft, BsGrid } from 'react-icons/bs';
import {
  getStatsByYear, getStatsByField, getStatsScatter, getStatsOaByYear, getStatsFieldPeriod,
  getWorkFields, type ChartFilters,
} from '../../api/works';
import { CHART_LIST } from '../../charts/chartList';
import { buildChartOption, makeThemeColors, type ChartStatsData } from '../../charts/buildChartOption';
import { useTheme } from '../../theme/useTheme';
import './single-chart-page.css';

export default function SingleChartPage() {
  const { chartId = 'papers-by-field' } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const meta = CHART_LIST.find(c => c.id === chartId) ?? CHART_LIST[0];
  const idx  = CHART_LIST.indexOf(meta);

  // ── filter state ──────────────────────────────────────────────────────────
  const [yearFrom, setYearFrom] = useState<number | ''>('');
  const [yearTo,   setYearTo]   = useState<number | ''>('');
  const [field,    setField]    = useState('');
  const [oaFilter, setOaFilter] = useState<'all' | 'open' | 'closed'>('all');

  const { data: fields = [] } = useQuery({ queryKey: ['work-fields'], queryFn: getWorkFields });

  const filters: ChartFilters = useMemo(() => ({
    yearFrom: yearFrom === '' ? undefined : yearFrom,
    yearTo: yearTo === '' ? undefined : yearTo,
    field: field || undefined,
    is_oa: oaFilter === 'all' ? undefined : oaFilter === 'open',
  }), [yearFrom, yearTo, field, oaFilter]);

  const filterKey = JSON.stringify(filters);

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: byYear = [], isLoading: l1, isError: e1 } = useQuery({ queryKey: ['stats', 'by-year', filterKey], queryFn: () => getStatsByYear(filters) });
  const { data: byField = [], isLoading: l2, isError: e2 } = useQuery({ queryKey: ['stats', 'by-field', filterKey], queryFn: () => getStatsByField(filters) });
  const { data: scatter = [], isLoading: l3, isError: e3 } = useQuery({ queryKey: ['stats', 'scatter', filterKey], queryFn: () => getStatsScatter(filters) });
  const { data: oaByYear = [], isLoading: l4, isError: e4 } = useQuery({ queryKey: ['stats', 'oa-ratio', filterKey], queryFn: () => getStatsOaByYear(filters) });
  const { data: fieldPeriod = [], isLoading: l5, isError: e5 } = useQuery({ queryKey: ['stats', 'field-period', filterKey], queryFn: () => getStatsFieldPeriod(filters) });

  const isLoading = l1 || l2 || l3 || l4 || l5;
  const isError = e1 || e2 || e3 || e4 || e5;

  const data: ChartStatsData = useMemo(
    () => ({ byYear, byField, scatter, oaByYear, fieldPeriod }),
    [byYear, byField, scatter, oaByYear, fieldPeriod],
  );

  // Total paper count for the current filter set, shown in the footer — derived
  // from whichever stat is cheapest to sum (by-year covers the whole corpus).
  const totalCount = useMemo(() => byYear.reduce((s, r) => s + r.paper_count, 0), [byYear]);

  // ── chart option ──────────────────────────────────────────────────────────
  const option = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    return buildChartOption(chartId, data, ct);
  }, [chartId, data, theme]);

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
            <ReactECharts
              key={`${chartId}-${theme}`}
              option={option}
              notMerge
              style={{ width: '100%', height: '100%' }}
            />
          )}
          <div className="scCount">{totalCount.toLocaleString()} papers</div>
        </div>

        {/* ── filter sidebar ── */}
        <aside className="scFilters">
          <div className="scFilterSection">
            <div className="scFilterLabel">Year range</div>
            <div className="scYearRow">
              <input
                type="number"
                className="scYearInput"
                placeholder="From"
                value={yearFrom}
                onChange={e => setYearFrom(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="scYearSep">–</span>
              <input
                type="number"
                className="scYearInput"
                placeholder="To"
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
                {field && (
                  <button className="scClearBtn" onClick={() => setField('')}>clear</button>
                )}
              </div>
              <select
                className="scYearInput"
                style={{ width: '100%' }}
                value={field}
                onChange={e => setField(e.target.value)}
              >
                <option value="">All fields</option>
                {fields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          <button
            className="scResetBtn"
            onClick={() => { setYearFrom(''); setYearTo(''); setField(''); setOaFilter('all'); }}
          >
            Reset all filters
          </button>
        </aside>
      </div>
    </div>
  );
}
