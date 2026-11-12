// @ts-ignore
import 'echarts-gl';
import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BsArrowsAngleExpand, BsSearch } from 'react-icons/bs';
import { ChartSkeleton } from '../../components/common/Skeletons';
import ChartSelectionToast from '../../components/common/ChartSelectionToast';
import { useTheme } from '../../theme/useTheme';
import { CHART_LIST } from '../../charts/chartList';
import {
  buildChartOption, makeThemeColors, typePeriodBar3d, DEFAULT_PERIODS, formatPeriodLabel,
  type ChartStatsData,
} from '../../charts/buildChartOption';
import { interpretChartClick, type ChartSelection, type EChartsClickParams } from '../../charts/chartSelection';
import { useWorksStats } from '../../charts/useWorksStats';
import './graph-page.css';

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

export default function GraphPage() {
  const { theme } = useTheme();
  const { data, isPending, isError } = useWorksStats();
  const [query, setQuery] = useState('');
  const [chartFilter, setChartFilter] = useState('all');

  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState<ChartSelection | null>(() => readSelection(searchParams));

  function selectFromChart(chartId: string, params: EChartsClickParams, stats: ChartStatsData) {
    const next = interpretChartClick(chartId, params, stats);
    if (!next) return;
    setSelection(next);
    const copy = new URLSearchParams(searchParams);
    copy.set(SEL_PARAM, JSON.stringify(next));
    setSearchParams(copy, { replace: true });
  }

  function closeSelection() {
    setSelection(null);
    const copy = new URLSearchParams(searchParams);
    copy.delete(SEL_PARAM);
    setSearchParams(copy, { replace: true });
  }

  const { chartOptions } = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');

    const bar       = buildChartOption('papers-by-field',   data, ct);
    const typeBar   = buildChartOption('papers-by-type',    data, ct);
    const histogram = buildChartOption('papers-by-year',    data, ct);
    const line      = buildChartOption('citations-by-year', data, ct);
    const scatterOpt = buildChartOption('year-vs-citations', data, ct);
    const pie       = buildChartOption('open-access',       data, ct);
    const apcBar    = buildChartOption('apc-by-publisher',  data, ct);

    // Rendered via the echarts-gl import above. Not click-wired (see panels
    // below) — its 3D click params don't map onto the 2D interpretChartClick
    // cases, and publication type isn't a /search filter (yet) anyway. Always
    // the default periods here — editing periods is a SingleChartPage-only
    // (full view) feature.
    const bar3d = typePeriodBar3d(data.typePeriod, DEFAULT_PERIODS.map(formatPeriodLabel), ct);

    return { chartOptions: { bar, typeBar, histogram, line, scatter: scatterOpt, pie, apcBar, bar3d } };
  }, [data, theme]);

  const s = { height: '100%', width: '100%' };

  // Keyed by chart id, not CHART_LIST's array position — so reordering
  // CHART_LIST (e.g. to change the Overview/default chart) can't silently
  // pair the wrong title with the wrong rendered option.
  const optionById: Record<string, object> = {
    'papers-by-field':   chartOptions.bar,
    'papers-by-type':    chartOptions.typeBar,
    'papers-by-year':    chartOptions.histogram,
    'citations-by-year': chartOptions.line,
    'year-vs-citations': chartOptions.scatter,
    'open-access':       chartOptions.pie,
    'apc-by-publisher':  chartOptions.apcBar,
    'type-period':       chartOptions.bar3d,
  };
  const tallChartIds = new Set(['open-access', 'type-period']);
  // Not click-selectable: publication type and publisher aren't /search
  // filters (yet), and type-period's grid panel is the 3D variant anyway.
  const clickableChartIds = new Set(['papers-by-field', 'papers-by-year', 'citations-by-year', 'year-vs-citations', 'open-access']);
  const panels = CHART_LIST.map((c) => ({
    key: c.id,
    chartId: c.id,
    title: c.title,
    option: optionById[c.id],
    tall: tallChartIds.has(c.id),
  }));

  const visiblePanels = panels.filter(
    (p) =>
      (chartFilter === 'all' || p.chartId === chartFilter) &&
      p.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="graphPage">
      <div className="graphToolbar">
        <div className="graphSearchWrap">
          <BsSearch className="graphSearchIcon" aria-hidden="true" />
          <input
            className="uiInput graphSearchInput"
            type="search"
            placeholder="Search charts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="graphFilterSelect"
          value={chartFilter}
          onChange={(e) => setChartFilter(e.target.value)}
        >
          <option value="all">All charts</option>
          {CHART_LIST.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div className="graphGrid">
        {visiblePanels.length === 0 && (
          <div className="graphEmptyState">No charts match “{query}”.</div>
        )}
        {visiblePanels.map(({ key, chartId, title, option, tall }) => (
          <div key={key} className={`graphPanel${tall ? ' graphPanel--tall' : ''}`}>
            <div className="graphPanelHeader">
              <span>{title}</span>
              <Link to={`/graph/${chartId}`} className="graphPanelExpand" title="Open with filters" aria-label={`Open ${title} with filters`}>
                <BsArrowsAngleExpand size={10} />
              </Link>
            </div>
            <div className="graphPanelBody">
              {isPending && <ChartSkeleton />}
              {isError   && <div className="graphPanelStatus graphPanelStatusError">Failed to load data</div>}
              {!isPending && !isError && (
                <ReactECharts
                  option={option}
                  style={s}
                  notMerge
                  onEvents={clickableChartIds.has(chartId) ? {
                    click: (p: EChartsClickParams) => selectFromChart(chartId, p, data),
                  } : undefined}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <ChartSelectionToast selection={selection} onClose={closeSelection} />
    </div>
  );
}
