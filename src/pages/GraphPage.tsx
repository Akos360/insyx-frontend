// @ts-ignore
import 'echarts-gl';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { useTheme } from '../theme/useTheme';
import './graph-page.css';

const FIELDS = ['ML', 'NLP', 'CV', 'Optimization', 'Generative AI'];
const YEAR_GROUPS = ['2012–15', '2016–19', '2020–23'];

const BAR_3D_DATA = [
  [0, 0, 3], [1, 0, 2], [2, 0, 2],
  [0, 1, 0], [1, 1, 2], [2, 1, 3],
  [0, 2, 2], [1, 2, 1], [2, 2, 0],
  [0, 3, 1], [1, 3, 1], [2, 3, 0],
  [0, 4, 0], [1, 4, 1], [2, 4, 1],
];

const SCATTER_DATA = [
  [2012, 50000], [2013, 82000], [2013, 31000],
  [2014, 46000], [2015, 160000], [2015, 24000],
  [2017, 72000], [2017, 40000], [2018, 55000],
  [2018, 26000], [2019, 14000], [2020, 18000],
  [2020, 11000], [2021, 8000], [2021, 6000],
  [2022, 4000], [2022, 3000], [2023, 1200],
  [2023, 900], [2023, 700],
];

const LINE_YEARS = ['2012', '2013', '2014', '2015', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
const LINE_CITATIONS = [50000, 113000, 46000, 184000, 112000, 81000, 14000, 29000, 14000, 7000, 2800];

export default function GraphPage() {
  const { theme } = useTheme();

  const charts = useMemo(() => {
    const isDark = theme === 'dark';
    const ct = {
      text: isDark ? '#ecf6ff' : '#161925',
      muted: isDark ? '#9db5ca' : '#406e8e',
      border: isDark ? '#29415f' : '#bfd0e0',
      colors: isDark
        ? ['#cbf7ed', '#8ea8c3', '#6aaccc', '#406e8e', '#4a7fa8']
        : ['#23395b', '#406e8e', '#6aaccc', '#8ea8c3', '#9db5ca'],
    };

    const axis = {
      axisLine: { lineStyle: { color: ct.border } },
      axisLabel: { color: ct.muted },
      splitLine: { lineStyle: { color: ct.border } },
      axisTick: { show: false },
    };

    const bar: object = {
      backgroundColor: 'transparent',
      grid: { left: 40, right: 16, top: 36, bottom: 36 },
      xAxis: { type: 'category', data: FIELDS, ...axis },
      yAxis: { type: 'value', ...axis },
      series: [{
        type: 'bar',
        data: [7, 5, 3, 2, 3],
        itemStyle: {
          color: (p: any) => ct.colors[p.dataIndex % ct.colors.length],
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 48,
      }],
    };

    const histogram: object = {
      backgroundColor: 'transparent',
      grid: { left: 36, right: 16, top: 36, bottom: 36 },
      xAxis: { type: 'category', data: LINE_YEARS, ...axis },
      yAxis: { type: 'value', ...axis, minInterval: 1 },
      series: [{
        type: 'bar',
        data: [1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 3],
        itemStyle: { color: ct.colors[1], borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 32,
      }],
    };

    const line: object = {
      backgroundColor: 'transparent',
      grid: { left: 56, right: 16, top: 36, bottom: 36 },
      xAxis: { type: 'category', data: LINE_YEARS, ...axis },
      yAxis: {
        type: 'value',
        ...axis,
        axisLabel: {
          color: ct.muted,
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
      },
      series: [{
        type: 'line',
        data: LINE_CITATIONS,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: ct.colors[0], width: 2 },
        itemStyle: { color: ct.colors[0] },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: ct.colors[0] + '55' },
              { offset: 1, color: ct.colors[0] + '00' },
            ],
          },
        },
      }],
    };

    const scatter: object = {
      backgroundColor: 'transparent',
      grid: { left: 60, right: 16, top: 36, bottom: 36 },
      xAxis: {
        type: 'value',
        name: 'Year',
        min: 2011,
        max: 2024,
        ...axis,
        axisLabel: { color: ct.muted, formatter: (v: number) => String(v) },
        nameTextStyle: { color: ct.muted },
      },
      yAxis: {
        type: 'value',
        name: 'Citations',
        ...axis,
        axisLabel: {
          color: ct.muted,
          formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
        },
        nameTextStyle: { color: ct.muted },
      },
      series: [{
        type: 'scatter',
        data: SCATTER_DATA,
        symbolSize: (d: number[]) => Math.max(6, Math.sqrt(d[1] / 600)),
        itemStyle: { color: ct.colors[2], opacity: 0.85 },
      }],
    };

    const pie: object = {
      backgroundColor: 'transparent',
      series: [{
        type: 'pie',
        radius: ['40%', '66%'],
        center: ['50%', '53%'],
        data: [
          { value: 14, name: 'Open Access', itemStyle: { color: ct.colors[0] } },
          { value: 6, name: 'Closed', itemStyle: { color: ct.colors[3] } },
        ],
        label: { color: ct.muted, fontSize: 11 },
        labelLine: { lineStyle: { color: ct.border } },
      }],
    };

    const bar3d: any = {
      backgroundColor: 'transparent',
      grid3D: {
        boxWidth: 180,
        boxDepth: 80,
        boxHeight: 80,
        viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 220 },
        light: { main: { intensity: 1.3 }, ambient: { intensity: 0.4 } },
        axisLine: { lineStyle: { color: ct.border } },
        axisLabel: { color: ct.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: ct.border, opacity: 0.3 } },
      },
      xAxis3D: { type: 'category', data: YEAR_GROUPS, name: 'Period', nameTextStyle: { color: ct.muted } },
      yAxis3D: { type: 'category', data: FIELDS, name: 'Field', nameTextStyle: { color: ct.muted } },
      zAxis3D: { type: 'value', name: 'Papers', nameTextStyle: { color: ct.muted } },
      series: [{
        type: 'bar3D',
        data: BAR_3D_DATA.map(([x, y, z]) => ({
          value: [x, y, z],
          itemStyle: { color: ct.colors[y % ct.colors.length] },
        })),
        shading: 'lambert',
        label: { show: false },
        emphasis: { label: { show: false } },
      }],
    };

    return { bar, histogram, line, scatter, pie, bar3d };
  }, [theme]);

  const s = { height: '100%', width: '100%' };

  return (
    <div className="graphPage">
      <div className="graphPanel">
        <div className="graphPanelHeader">Papers by Field</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.bar} style={s} notMerge />
        </div>
      </div>

      <div className="graphPanel">
        <div className="graphPanelHeader">Papers by Year</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.histogram} style={s} notMerge />
        </div>
      </div>

      <div className="graphPanel">
        <div className="graphPanelHeader">Citations by Year Published</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.line} style={s} notMerge />
        </div>
      </div>

      <div className="graphPanel">
        <div className="graphPanelHeader">Year vs. Citations</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.scatter} style={s} notMerge />
        </div>
      </div>

      <div className="graphPanel graphPanel--tall">
        <div className="graphPanelHeader">Open Access</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.pie} style={s} notMerge />
        </div>
      </div>

      <div className="graphPanel graphPanel--tall">
        <div className="graphPanelHeader">Papers by Field & Period (3D)</div>
        <div className="graphPanelBody">
          <ReactECharts option={charts.bar3d} style={s} notMerge />
        </div>
      </div>
    </div>
  );
}