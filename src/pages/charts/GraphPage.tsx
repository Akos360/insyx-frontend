// @ts-ignore
import 'echarts-gl';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowsAngleExpand } from 'react-icons/bs';
import { useTheme } from '../../theme/useTheme';
import { CHART_LIST } from '../../charts/chartList';
import { buildChartOption, makeThemeColors, PERIODS } from '../../charts/buildChartOption';
import { useWorksStats } from '../../charts/useWorksStats';
import './graph-page.css';

export default function GraphPage() {
  const { theme } = useTheme();
  const { data, isLoading, isError } = useWorksStats();

  const { chartOptions } = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');

    const bar       = buildChartOption('papers-by-field',   data, ct);
    const histogram = buildChartOption('papers-by-year',    data, ct);
    const line      = buildChartOption('citations-by-year', data, ct);
    const scatterOpt = buildChartOption('year-vs-citations', data, ct);
    const pie       = buildChartOption('open-access',       data, ct);

    // 3D bar — built from the field×period stats endpoint; echarts-gl renders it
    const fields = [...new Set(data.fieldPeriod.map((r) => r.field))].slice(0, 6);
    const bar3dData = fields.flatMap((field, yi) =>
      PERIODS.map((_, xi) => {
        const count = data.fieldPeriod.find((r) => r.field === field && r.period_index === xi)?.paper_count ?? 0;
        return { value: [xi, yi, count] as [number, number, number], itemStyle: { color: ct.colors[yi % ct.colors.length] } };
      }),
    );

    const bar3d: any = {
      backgroundColor: 'transparent',
      grid3D: {
        boxWidth: 180, boxDepth: 80, boxHeight: 80,
        viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 220 },
        light: { main: { intensity: 1.3 }, ambient: { intensity: 0.4 } },
        axisLine:  { lineStyle: { color: ct.border } },
        axisLabel: { color: ct.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: ct.border, opacity: 0.3 } },
      },
      xAxis3D: { type: 'category', data: [...PERIODS], name: 'Period', nameTextStyle: { color: ct.muted } },
      yAxis3D: { type: 'category', data: fields,       name: 'Field',  nameTextStyle: { color: ct.muted } },
      zAxis3D: { type: 'value',                         name: 'Papers', nameTextStyle: { color: ct.muted } },
      series: [{ type: 'bar3D', data: bar3dData, shading: 'lambert', label: { show: false }, emphasis: { label: { show: false } } }],
    };

    return { chartOptions: { bar, histogram, line, scatter: scatterOpt, pie, bar3d } };
  }, [data, theme]);

  const s = { height: '100%', width: '100%' };

  const panels = [
    { key: 'bar',       chartId: CHART_LIST[0].id, title: CHART_LIST[0].title, option: chartOptions.bar       },
    { key: 'histogram', chartId: CHART_LIST[1].id, title: CHART_LIST[1].title, option: chartOptions.histogram },
    { key: 'line',      chartId: CHART_LIST[2].id, title: CHART_LIST[2].title, option: chartOptions.line      },
    { key: 'scatter',   chartId: CHART_LIST[3].id, title: CHART_LIST[3].title, option: chartOptions.scatter   },
    { key: 'pie',       chartId: CHART_LIST[4].id, title: CHART_LIST[4].title, option: chartOptions.pie,   tall: true },
    { key: 'bar3d',     chartId: CHART_LIST[5].id, title: CHART_LIST[5].title, option: chartOptions.bar3d, tall: true },
  ];

  return (
    <div className="graphPage">
      {panels.map(({ key, chartId, title, option, tall }) => (
        <div key={key} className={`graphPanel${tall ? ' graphPanel--tall' : ''}`}>
          <div className="graphPanelHeader">
            <span>{title}</span>
            <Link to={`/graph/${chartId}`} className="graphPanelExpand" title="Open with filters" aria-label={`Open ${title} with filters`}>
              <BsArrowsAngleExpand size={10} />
            </Link>
          </div>
          <div className="graphPanelBody">
            {isLoading && <div className="graphPanelStatus">Loading…</div>}
            {isError   && <div className="graphPanelStatus graphPanelStatusError">Failed to load data</div>}
            {!isLoading && !isError && <ReactECharts option={option} style={s} notMerge />}
          </div>
        </div>
      ))}
    </div>
  );
}
