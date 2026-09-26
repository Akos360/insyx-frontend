/**
 * Builds ECharts option objects from server-pre-aggregated lakehouse stats.
 *
 * Each builder takes only the pre-aggregated rows it needs (already grouped
 * and summed by the backend via Trino) — the corpus itself is never fetched
 * or aggregated client-side, so this scales regardless of corpus size.
 */

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

export interface ScatterPoint {
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

export interface FieldPeriodStat {
  field: string;
  period_index: number;
  paper_count: number;
}

export interface ChartStatsData {
  byYear: YearStat[];
  byField: FieldStat[];
  scatter: ScatterPoint[];
  oaByYear: OaYearStat[];
  fieldPeriod: FieldPeriodStat[];
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

// ---------------------------------------------------------------------------
// Individual builders
// ---------------------------------------------------------------------------

function papersByField(byField: FieldStat[], ct: ThemeColors): object {
  const sorted = [...byField].sort((a, b) => b.paper_count - a.paper_count).slice(0, 12);
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 16, top: 36, bottom: 64 },
    xAxis: {
      type: 'category',
      data: sorted.map((f) => f.field),
      ...ax,
      axisLabel: { ...ax.axisLabel, rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', ...ax },
    series: [{
      type: 'bar',
      data: sorted.map((f, i) => ({
        value: f.paper_count,
        itemStyle: { color: ct.colors[i % ct.colors.length], borderRadius: [3, 3, 0, 0] },
      })),
      barMaxWidth: 48,
    }],
    tooltip: { trigger: 'axis' },
  };
}

function papersByYear(byYear: YearStat[], ct: ThemeColors): object {
  const sorted = [...byYear].sort((a, b) => a.publication_year - b.publication_year);
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 36, right: 16, top: 36, bottom: 36 },
    xAxis: { type: 'category', data: sorted.map((r) => String(r.publication_year)), ...ax },
    yAxis: { type: 'value', ...ax, minInterval: 1 },
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
  return {
    backgroundColor: 'transparent',
    grid: { left: 56, right: 16, top: 36, bottom: 36 },
    xAxis: { type: 'category', data: sorted.map((r) => String(r.publication_year)), ...ax },
    yAxis: { type: 'value', ...ax, axisLabel: { color: ct.muted, formatter: K } },
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
  const data = scatter.map((p) => [p.publication_year, p.cited_by_count, p.title]);
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

export const PERIODS = ['2012–15', '2016–19', '2020–23'] as const;

function fieldPeriod(rows: FieldPeriodStat[], ct: ThemeColors): object {
  const fields = [...new Set(rows.map((r) => r.field))]
    .sort((a, b) => {
      const totalA = rows.filter((r) => r.field === a).reduce((s, r) => s + r.paper_count, 0);
      const totalB = rows.filter((r) => r.field === b).reduce((s, r) => s + r.paper_count, 0);
      return totalB - totalA;
    })
    .slice(0, 8);

  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 16, top: 36, bottom: 80 },
    legend: { bottom: 0, textStyle: { color: ct.muted }, itemHeight: 10, itemWidth: 14 },
    xAxis: { type: 'category', data: [...PERIODS], ...ax },
    yAxis: { type: 'value', ...ax },
    series: fields.map((f, i) => ({
      type: 'bar',
      name: f,
      stack: 'field',
      data: PERIODS.map((_, periodIndex) =>
        rows.find((r) => r.field === f && r.period_index === periodIndex)?.paper_count ?? 0,
      ),
      itemStyle: { color: ct.colors[i % ct.colors.length] },
    })),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildChartOption(
  chartId: string,
  data: ChartStatsData,
  ct: ThemeColors,
): object {
  switch (chartId) {
    case 'papers-by-field':   return papersByField(data.byField, ct);
    case 'papers-by-year':    return papersByYear(data.byYear, ct);
    case 'citations-by-year': return citationsByYear(data.byYear, ct);
    case 'year-vs-citations': return yearVsCitations(data.scatter, ct);
    case 'open-access':       return openAccess(data.oaByYear, ct);
    case 'field-period':      return fieldPeriod(data.fieldPeriod, ct);
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
