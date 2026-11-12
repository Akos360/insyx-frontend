// Builds ECharts options from stats pre-aggregated server-side (via Trino) —
// the corpus is never fetched or aggregated client-side, so this scales regardless of size.

export interface ThemeColors {
  text: string;
  muted: string;
  border: string;
  colors: string[];
}

export interface YearStat {
  publication_year: number;
  paper_count: number;
  avg_citations: number;
  total_citations: number;
}

export interface FieldStat {
  field: string;
  paper_count: number;
  avg_citations: number;
}

export interface TypeStat {
  type: string;
  paper_count: number;
  avg_citations: number;
}

export interface ApcStat {
  source_name: string;
  paper_count: number;
  avg_apc: number;
  oa_pct: number;
}

export interface ScatterPoint {
  id: string;
  publication_year: number;
  cited_by_count: number;
  title: string;
}

export interface OaYearStat {
  publication_year: number;
  total: number;
  oa_count: number;
  oa_pct: number;
}

export interface TypePeriodStat {
  type: string;
  period_index: number;
  paper_count: number;
}

export interface ChartStatsData {
  byYear: YearStat[];
  byField: FieldStat[];
  byType: TypeStat[];
  scatter: ScatterPoint[];
  oaByYear: OaYearStat[];
  typePeriod: TypePeriodStat[];
  apc: ApcStat[];
}

function axisBase(ct: ThemeColors) {
  return {
    axisLine:  { lineStyle: { color: ct.border } },
    axisLabel: { color: ct.muted },
    splitLine: { lineStyle: { color: ct.border } },
    axisTick:  { show: false },
  };
}

const K = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

// Shared by every axis name below, so they all read the same way at a glance.
function nameStyle(ct: ThemeColors) {
  return { nameTextStyle: { color: ct.muted } };
}

function categoryPaperCountBar(rows: { label: string; paper_count: number }[], xAxisName: string, ct: ThemeColors): object {
  const sorted = [...rows].sort((a, b) => b.paper_count - a.paper_count).slice(0, 12);
  const ax = axisBase(ct);
  const ns = nameStyle(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 44, right: 28, top: 40, bottom: 64 },
    xAxis: {
      type: 'category',
      name: xAxisName,
      data: sorted.map((r) => r.label),
      ...ax,
      ...ns,
      axisLabel: { ...ax.axisLabel, rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: 'Papers', ...ax, ...ns },
    series: [{
      type: 'bar',
      data: sorted.map((r, i) => ({
        value: r.paper_count,
        itemStyle: { color: ct.colors[i % ct.colors.length], borderRadius: [3, 3, 0, 0] },
      })),
      barMaxWidth: 48,
    }],
    tooltip: { trigger: 'axis' },
  };
}

function papersByField(byField: FieldStat[], ct: ThemeColors): object {
  return categoryPaperCountBar(byField.map((f) => ({ label: f.field, paper_count: f.paper_count })), 'Field', ct);
}

// Field currently has a single value in this corpus (see WorksService.statsByType's
// comment), so type (article/dataset/preprint/...) is the category dimension that's
// actually informative right now.
function papersByType(byType: TypeStat[], ct: ThemeColors): object {
  return categoryPaperCountBar(byType.map((t) => ({ label: t.type, paper_count: t.paper_count })), 'Type', ct);
}

function papersByYear(byYear: YearStat[], ct: ThemeColors): object {
  const sorted = [...byYear].sort((a, b) => a.publication_year - b.publication_year);
  const ax = axisBase(ct);
  const ns = nameStyle(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 28, top: 40, bottom: 36 },
    xAxis: { type: 'category', name: 'Year', data: sorted.map((r) => String(r.publication_year)), ...ax, ...ns },
    yAxis: { type: 'value', name: 'Papers', ...ax, ...ns, minInterval: 1 },
    series: [{
      type: 'bar',
      data: sorted.map((r) => r.paper_count),
      itemStyle: { color: ct.colors[1], borderRadius: [2, 2, 0, 0] },
      barMaxWidth: 32,
    }],
    tooltip: { trigger: 'axis' },
  };
}

function citationsByYear(byYear: YearStat[], ct: ThemeColors): object {
  const sorted = [...byYear].sort((a, b) => a.publication_year - b.publication_year);
  const ax = axisBase(ct);
  const ns = nameStyle(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 28, top: 40, bottom: 36 },
    xAxis: { type: 'category', name: 'Year', data: sorted.map((r) => String(r.publication_year)), ...ax, ...ns },
    yAxis: { type: 'value', name: 'Citations', ...ax, ...ns, axisLabel: { color: ct.muted, formatter: K } },
    series: [{
      type: 'line',
      data: sorted.map((r) => r.total_citations),
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
    tooltip: { trigger: 'axis' },
  };
}

function yearVsCitations(scatter: ScatterPoint[], ct: ThemeColors): object {
  const data = scatter.map((p) => [p.publication_year, p.cited_by_count, p.title, p.id]);
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 16, top: 36, bottom: 36 },
    xAxis: {
      type: 'value',
      name: 'Year',
      min: (v: { min: number }) => v.min - 1,
      max: (v: { max: number }) => v.max + 1,
      ...ax,
      axisLabel: { color: ct.muted, formatter: (v: number) => String(v) },
      nameTextStyle: { color: ct.muted },
    },
    yAxis: {
      type: 'value',
      name: 'Citations',
      ...ax,
      axisLabel: { color: ct.muted, formatter: K },
      nameTextStyle: { color: ct.muted },
    },
    series: [{
      type: 'scatter',
      data,
      symbolSize: (d: number[]) => Math.max(6, Math.sqrt(d[1] / 400)),
      itemStyle: { color: ct.colors[2], opacity: 0.85 },
    }],
    tooltip: { formatter: (p: any) => `${p.data[2]}<br/>${p.data[0]} · ${Number(p.data[1]).toLocaleString()} citations` },
  };
}

function openAccess(oaByYear: OaYearStat[], ct: ThemeColors): object {
  const oaCount = oaByYear.reduce((s, r) => s + Number(r.oa_count), 0);
  const total = oaByYear.reduce((s, r) => s + Number(r.total), 0);
  const closed = total - oaCount;
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'pie',
      radius: ['40%', '66%'],
      center: ['50%', '53%'],
      data: [
        { value: oaCount, name: 'Open Access', itemStyle: { color: ct.colors[0] } },
        { value: closed,  name: 'Closed',       itemStyle: { color: ct.colors[3] } },
      ],
      label:     { color: ct.muted, fontSize: 11 },
      labelLine: { lineStyle: { color: ct.border } },
    }],
    tooltip: { trigger: 'item' },
  };
}

export type PeriodRange = { from: number; to: number };

// Mirrors WorksService.typePeriodStats' own default when no `periods` query
// param is sent — keep in sync if that default ever changes.
export const DEFAULT_PERIODS: PeriodRange[] = [
  { from: 2012, to: 2015 },
  { from: 2016, to: 2019 },
  { from: 2020, to: 2023 },
];

export function formatPeriodLabel(p: PeriodRange): string {
  return `${p.from}–${p.to}`;
}

// "YYYY-YYYY,YYYY-YYYY,..." — the shape ChartFilterDto's `periods` field expects.
export function encodePeriodsParam(periods: PeriodRange[]): string {
  return periods.map((p) => `${p.from}-${p.to}`).join(',');
}

function typePeriod(rows: TypePeriodStat[], periodLabels: string[], ct: ThemeColors): object {
  const types = [...new Set(rows.map((r) => r.type))]
    .sort((a, b) => {
      const totalA = rows.filter((r) => r.type === a).reduce((s, r) => s + r.paper_count, 0);
      const totalB = rows.filter((r) => r.type === b).reduce((s, r) => s + r.paper_count, 0);
      return totalB - totalA;
    })
    .slice(0, 8);

  const ax = axisBase(ct);
  const ns = nameStyle(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 44, right: 28, top: 40, bottom: 80 },
    legend: { bottom: 0, textStyle: { color: ct.muted }, itemHeight: 10, itemWidth: 14 },
    xAxis: { type: 'category', name: 'Period', data: periodLabels, ...ax, ...ns },
    yAxis: { type: 'value', name: 'Papers', ...ax, ...ns },
    series: types.map((t, i) => ({
      type: 'bar',
      name: t,
      stack: 'type',
      data: periodLabels.map((_, periodIndex) =>
        rows.find((r) => r.type === t && r.period_index === periodIndex)?.paper_count ?? 0,
      ),
      itemStyle: { color: ct.colors[i % ct.colors.length] },
    })),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  };
}

// The 3D counterpart of typePeriod — same data, rendered as echarts-gl bar3D
// (period x type x paper_count). Shared by GraphPage's grid panel and
// SingleChartPage's 2D/3D toggle so the two never drift apart.
export function typePeriodBar3d(rows: TypePeriodStat[], periodLabels: string[], ct: ThemeColors): object {
  const types = [...new Set(rows.map((r) => r.type))].slice(0, 6);
  const bar3dData = types.flatMap((type, yi) =>
    periodLabels.map((_, xi) => {
      const count = rows.find((r) => r.type === type && r.period_index === xi)?.paper_count ?? 0;
      return { value: [xi, yi, count] as [number, number, number], itemStyle: { color: ct.colors[yi % ct.colors.length] } };
    }),
  );
  return {
    backgroundColor: 'transparent',
    grid3D: {
      boxWidth: 180, boxDepth: 80, boxHeight: 80,
      viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 220 },
      light: { main: { intensity: 1.3 }, ambient: { intensity: 0.4 } },
      axisLine:  { lineStyle: { color: ct.border } },
      axisLabel: { color: ct.muted, fontSize: 10 },
      splitLine: { lineStyle: { color: ct.border, opacity: 0.3 } },
    },
    xAxis3D: { type: 'category', data: periodLabels, name: 'Period', nameTextStyle: { color: ct.muted } },
    yAxis3D: { type: 'category', data: types,         name: 'Type',   nameTextStyle: { color: ct.muted } },
    zAxis3D: { type: 'value',                         name: 'Papers', nameTextStyle: { color: ct.muted } },
    series: [{ type: 'bar3D', data: bar3dData, shading: 'lambert', label: { show: false }, emphasis: { label: { show: false } } }],
  };
}

// Publisher vs average APC vs OA ratio — only ~6% of works carry APC data (see
// WorksService.apcByPublisher), so bar color encodes OA ratio rather than
// plotting a third, mostly-empty axis.
function apcByPublisher(rows: ApcStat[], ct: ThemeColors): object {
  const sorted = [...rows].sort((a, b) => b.paper_count - a.paper_count).slice(0, 12);
  const ax = axisBase(ct);
  const oaColor = (pct: number) => {
    const t = Math.max(0, Math.min(1, pct / 100));
    return t > 0.5 ? ct.colors[0] : ct.colors[3];
  };
  return {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 28, top: 40, bottom: 90 },
    xAxis: {
      type: 'category',
      name: 'Publisher',
      data: sorted.map((r) => r.source_name),
      ...ax,
      nameTextStyle: { color: ct.muted },
      axisLabel: { ...ax.axisLabel, rotate: 35, interval: 0, fontSize: 10 },
    },
    yAxis: { type: 'value', name: 'Avg. APC (USD)', nameTextStyle: { color: ct.muted }, ...ax },
    series: [{
      type: 'bar',
      data: sorted.map((r) => ({
        value: Math.round(r.avg_apc),
        itemStyle: { color: oaColor(r.oa_pct), borderRadius: [3, 3, 0, 0] },
      })),
      barMaxWidth: 40,
    }],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const r = sorted[p.dataIndex];
        return `${r.source_name}<br/>$${Math.round(r.avg_apc).toLocaleString()} avg APC · ${r.oa_pct}% open access · ${r.paper_count} papers`;
      },
    },
  };
}

export function buildChartOption(
  chartId: string,
  data: ChartStatsData,
  ct: ThemeColors,
  periodLabels: string[] = DEFAULT_PERIODS.map(formatPeriodLabel),
): object {
  switch (chartId) {
    case 'papers-by-field':   return papersByField(data.byField, ct);
    case 'papers-by-type':    return papersByType(data.byType, ct);
    case 'papers-by-year':    return papersByYear(data.byYear, ct);
    case 'citations-by-year': return citationsByYear(data.byYear, ct);
    case 'year-vs-citations': return yearVsCitations(data.scatter, ct);
    case 'open-access':       return openAccess(data.oaByYear, ct);
    case 'type-period':       return typePeriod(data.typePeriod, periodLabels, ct);
    case 'apc-by-publisher':  return apcByPublisher(data.apc, ct);
    default:                  return papersByField(data.byField, ct);
  }
}

export function makeThemeColors(isDark: boolean): ThemeColors {
  return {
    text:   isDark ? '#ecf6ff' : '#161925',
    muted:  isDark ? '#9db5ca' : '#406e8e',
    border: isDark ? '#29415f' : '#bfd0e0',
    colors: isDark
      ? ['#cbf7ed', '#8ea8c3', '#6aaccc', '#406e8e', '#4a7fa8']
      : ['#23395b', '#406e8e', '#6aaccc', '#8ea8c3', '#9db5ca'],
  };
}
