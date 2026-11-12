// @ts-ignore
import 'echarts-gl';
import ReactECharts from 'echarts-for-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BsGrid } from 'react-icons/bs';
import { LuX, LuPlus, LuMinus } from 'react-icons/lu';
import BackLink from '../../components/common/BackLink';
import { ChartSkeleton } from '../../components/common/Skeletons';
import ChartSelectionContent from '../../components/common/ChartSelectionContent';
import SidebarToggle from '../../components/common/SidebarToggle';
import {
  getStatsByYear, getStatsByField, getStatsByType, getStatsScatter, getStatsOaByYear,
  getStatsTypePeriod, getStatsApc, getWorkFields, type ChartFilters,
} from '../../api/works';
import { CHART_LIST } from '../../charts/chartList';
import {
  buildChartOption, makeThemeColors, typePeriodBar3d, DEFAULT_PERIODS, formatPeriodLabel,
  encodePeriodsParam, type ChartStatsData, type PeriodRange,
} from '../../charts/buildChartOption';
import { interpretChartClick, type ChartSelection, type EChartsClickParams } from '../../charts/chartSelection';
import { useTheme } from '../../theme/useTheme';
import './single-chart-page.css';

const MAX_PERIODS = 12;

function isValidPeriod(p: PeriodRange): boolean {
  return Number.isInteger(p.from) && Number.isInteger(p.to) && p.from <= p.to && p.from >= 1800 && p.to <= 2200;
}

const SEL_PARAM = 'sel';

function readSelection(params: URLSearchParams): ChartSelection | null {
  const raw = params.get(SEL_PARAM);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChartSelection;
  } catch {
    return null;
  }
}

export default function SingleChartPage() {
  const { chartId = CHART_LIST[0].id } = useParams<{ chartId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const meta = CHART_LIST.find(c => c.id === chartId) ?? CHART_LIST[0];
  const idx  = CHART_LIST.indexOf(meta);

  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState<ChartSelection | null>(() => readSelection(searchParams));
  const [filtersOpen, setFiltersOpen] = useState(true);

  function closeSelection() {
    setSelection(null);
    const copy = new URLSearchParams(searchParams);
    copy.delete(SEL_PARAM);
    setSearchParams(copy, { replace: true });
  }

  function openSelectionFullView() {
    if (!selection) return;
    if (selection.kind === 'work') {
      navigate(`/paper/${selection.workId}`);
    } else {
      navigate(`/search?${new URLSearchParams(selection.searchParams)}`);
    }
  }

  const [yearFrom, setYearFrom] = useState<number | ''>('');
  const [yearTo,   setYearTo]   = useState<number | ''>('');
  const [field,    setField]    = useState('');
  const [oaFilter, setOaFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Only meaningful for 'type-period' — editable there, ignored elsewhere.
  const [periods, setPeriods] = useState<PeriodRange[]>(DEFAULT_PERIODS);
  const [is3dView, setIs3dView] = useState(true);

  // Invalid entries (cleared input, from > to, etc.) fall back to the
  // defaults rather than firing a request the backend would reject —
  // the inputs themselves still show whatever the user is mid-typing.
  const validPeriods = useMemo(() => periods.filter(isValidPeriod), [periods]);
  const effectivePeriods = validPeriods.length > 0 ? validPeriods : DEFAULT_PERIODS;
  const periodLabels = useMemo(() => effectivePeriods.map(formatPeriodLabel), [effectivePeriods]);
  const periodsParam = useMemo(
    () => (validPeriods.length > 0 ? encodePeriodsParam(validPeriods) : undefined),
    [validPeriods],
  );

  const { data: fields = [] } = useQuery({ queryKey: ['work-fields'], queryFn: getWorkFields });

  const filters: ChartFilters = useMemo(() => ({
    yearFrom: yearFrom === '' ? undefined : yearFrom,
    yearTo: yearTo === '' ? undefined : yearTo,
    field: field || undefined,
    is_oa: oaFilter === 'all' ? undefined : oaFilter === 'open',
  }), [yearFrom, yearTo, field, oaFilter]);

  const filterKey = JSON.stringify(filters);

  const { data: byYear = [], isPending: p1, isError: e1 } = useQuery({ queryKey: ['stats', 'by-year', filterKey], queryFn: () => getStatsByYear(filters) });
  const { data: byField = [], isPending: p2, isError: e2 } = useQuery({ queryKey: ['stats', 'by-field', filterKey], queryFn: () => getStatsByField(filters) });
  const { data: byType = [], isPending: p3, isError: e3 } = useQuery({ queryKey: ['stats', 'by-type', filterKey], queryFn: () => getStatsByType(filters) });
  const { data: scatter = [], isPending: p4, isError: e4 } = useQuery({ queryKey: ['stats', 'scatter', filterKey], queryFn: () => getStatsScatter(filters) });
  const { data: oaByYear = [], isPending: p5, isError: e5 } = useQuery({ queryKey: ['stats', 'oa-ratio', filterKey], queryFn: () => getStatsOaByYear(filters) });
  const { data: typePeriod = [], isPending: p6, isError: e6 } = useQuery({
    queryKey: ['stats', 'type-period', filterKey, periodsParam],
    queryFn: () => getStatsTypePeriod({ ...filters, periods: periodsParam }),
  });
  const { data: apc = [], isPending: p7, isError: e7 } = useQuery({ queryKey: ['stats', 'apc', filterKey], queryFn: () => getStatsApc(filters) });

  // isPending, not isLoading — under PersistQueryClientProvider, isLoading is
  // falsely false during the IndexedDB-restore window (pending but not yet
  // fetching), which would flash an empty/error chart on every hard refresh.
  const isPending = p1 || p2 || p3 || p4 || p5 || p6 || p7;
  const isError = e1 || e2 || e3 || e4 || e5 || e6 || e7;

  const data: ChartStatsData = useMemo(
    () => ({ byYear, byField, byType, scatter, oaByYear, typePeriod, apc }),
    [byYear, byField, byType, scatter, oaByYear, typePeriod, apc],
  );

  // by-year covers the whole corpus and is cheapest to sum for a total count.
  const totalCount = useMemo(() => byYear.reduce((s, r) => s + r.paper_count, 0), [byYear]);

  // Only charts with a continuous year axis benefit from zoom/LOD — not
  // open-access (a pie, no axis) or the categorical bar/stacked-bar charts
  // (papers-by-field, papers-by-type, type-period, apc-by-publisher) where
  // "zooming" a handful of category bars isn't meaningful.
  const isZoomable = chartId === 'papers-by-year' || chartId === 'citations-by-year' || chartId === 'year-vs-citations';

  const isTypePeriod = chartId === 'type-period';

  const option = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    if (isTypePeriod && is3dView) {
      return typePeriodBar3d(data.typePeriod, periodLabels, ct);
    }
    const base = buildChartOption(chartId, data, ct, periodLabels) as any;
    if (!isZoomable) return base;
    return {
      ...base,
      grid: { ...base.grid, bottom: (base.grid?.bottom ?? 36) + 26 },
      dataZoom: [
        {
          type: 'inside', xAxisIndex: 0, filterMode: 'none',
          zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false,
        },
        {
          type: 'slider', xAxisIndex: 0, height: 14, bottom: 6,
          borderColor: 'transparent', backgroundColor: ct.border + '33',
          fillerColor: ct.colors[0] + '40', handleStyle: { color: ct.colors[0] },
          textStyle: { color: ct.muted, fontSize: 9 },
        },
      ],
    };
  }, [chartId, data, theme, isZoomable, isTypePeriod, is3dView, periodLabels]);

  const echartsRef = useRef<ReactECharts>(null);

  // Purely visual — dispatched straight to the chart instance, no React
  // state touched, so it never triggers a refetch/skeleton. Clamping the
  // half-width to 50 means a single zoom-out from any depth of zoom-in
  // still lands back on the exact default 0–100 window.
  function zoomBy(factor: number) {
    const inst = echartsRef.current?.getEchartsInstance();
    if (!inst) return;
    const dz = (inst.getOption() as any)?.dataZoom?.[0];
    const start = dz?.start ?? 0;
    const end = dz?.end ?? 100;
    const mid = (start + end) / 2;
    const halfWidth = Math.min(50, ((end - start) / 2) * factor);
    inst.dispatchAction({
      type: 'dataZoom',
      start: Math.max(0, mid - halfWidth),
      end: Math.min(100, mid + halfWidth),
    });
  }
  const zoomIn = () => zoomBy(0.7);
  const zoomOut = () => zoomBy(1 / 0.7);

  // echarts-for-react's own resize listener is debounced (60ms of quiet
  // after the container's size settles) and never fires mid-transition —
  // without this, the chart stays sized for the old sidebar width for the
  // whole 160ms the sidebar is animating (clipped by .scChartArea's
  // overflow:hidden so it at least doesn't bleed over the panel), then
  // visibly snaps once the debounce catches up. Resizing immediately here
  // removes that snap.
  function handleFiltersTransitionEnd(e: React.TransitionEvent<HTMLElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== 'width') return;
    echartsRef.current?.getEchartsInstance().resize();
  }

  function handleChartClick(p: EChartsClickParams) {
    const next = interpretChartClick(chartId, p, data);
    if (!next) return;
    setSelection(next);
    const copy = new URLSearchParams(searchParams);
    copy.set(SEL_PARAM, JSON.stringify(next));
    setSearchParams(copy, { replace: true });
  }

  // Prev/next keeps this same component mounted (only :chartId changes), so
  // a stale selection from the chart just left would otherwise linger.
  const prevChart = () => { setSelection(null); navigate(`/graph/${CHART_LIST[(idx - 1 + CHART_LIST.length) % CHART_LIST.length].id}`); };
  const nextChart = () => { setSelection(null); navigate(`/graph/${CHART_LIST[(idx + 1) % CHART_LIST.length].id}`); };

  return (
    <div className="scPage">
      <div className="scTopBar">
        <BackLink to="/graph" label="All Charts" />

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
        <div className="scChartArea">
          {isPending && <ChartSkeleton />}
          {isError   && <div className="scStatus scStatusError">Failed to load data.</div>}
          {!isPending && !isError && (
            <ReactECharts
              ref={echartsRef}
              key={`${chartId}-${theme}`}
              option={option}
              notMerge
              style={{ width: '100%', height: '100%' }}
              onEvents={{ click: handleChartClick }}
            />
          )}
          {isZoomable && !isPending && !isError && (
            <div className="scZoomControls">
              <button className="scZoomBtn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
                <LuPlus size={13} />
              </button>
              <button className="scZoomBtn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
                <LuMinus size={13} />
              </button>
            </div>
          )}
          {isTypePeriod && !isPending && !isError && (
            <div className="scViewToggle">
              <button className="scViewToggleBtn" onClick={() => setIs3dView(v => !v)}>
                Switch to {is3dView ? '2D' : '3D'}
              </button>
            </div>
          )}
          <div className="scCount">{totalCount.toLocaleString()} papers</div>
        </div>

        <div className="scFiltersToggleWrap">
          <SidebarToggle
            open={filtersOpen}
            onToggle={() => setFiltersOpen(o => !o)}
            openTitle="Hide filters"
            closedTitle="Show filters"
          />
        </div>

        <aside
          className={`scFilters${filtersOpen ? '' : ' scFiltersCollapsed'}`}
          onTransitionEnd={handleFiltersTransitionEnd}
        >
          <button
            className="scResetBtn"
            onClick={() => { setYearFrom(''); setYearTo(''); setField(''); setOaFilter('all'); }}
          >
            Reset all filters
          </button>

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

          {isTypePeriod && (
            <div className="scFilterSection">
              <div className="scFilterLabel">
                Periods
                <button className="scClearBtn" onClick={() => setPeriods(DEFAULT_PERIODS)}>reset</button>
              </div>
              {periods.map((p, i) => (
                <div className="scYearRow" key={i}>
                  <input
                    type="number"
                    className="scYearInput"
                    placeholder="From"
                    value={Number.isNaN(p.from) ? '' : p.from}
                    onChange={e => {
                      const from = Number(e.target.value);
                      setPeriods(ps => ps.map((pp, pi) => (pi === i ? { ...pp, from } : pp)));
                    }}
                  />
                  <span className="scYearSep">–</span>
                  <input
                    type="number"
                    className="scYearInput"
                    placeholder="To"
                    value={Number.isNaN(p.to) ? '' : p.to}
                    onChange={e => {
                      const to = Number(e.target.value);
                      setPeriods(ps => ps.map((pp, pi) => (pi === i ? { ...pp, to } : pp)));
                    }}
                  />
                  {periods.length > 1 && (
                    <button
                      className="scClearBtn"
                      aria-label="Remove period"
                      onClick={() => setPeriods(ps => ps.filter((_, pi) => pi !== i))}
                    >
                      <LuX size={11} />
                    </button>
                  )}
                </div>
              ))}
              {periods.length < MAX_PERIODS && (
                <button
                  type="button"
                  className="scResetBtn"
                  onClick={() => {
                    const last = periods[periods.length - 1];
                    const from = last && Number.isInteger(last.to) ? last.to + 1 : 2012;
                    setPeriods(ps => [...ps, { from, to: from + 3 }]);
                  }}
                >
                  + Add period
                </button>
              )}
            </div>
          )}

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

          {selection && (
            <div className="scFilterSection scSelectionPanel">
              <div className="scFilterLabel">
                Selected
                <button className="scClearBtn" onClick={closeSelection} aria-label="Close">
                  <LuX size={11} />
                </button>
              </div>
              <ChartSelectionContent selection={selection} onOpenFullView={openSelectionFullView} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
