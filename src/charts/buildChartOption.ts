/**
 * Builds ECharts option objects from real Paper data + theme colors.
 *
 * NOTE on scale: this approach fetches all papers and computes aggregations
 * on the client. For millions of records the backend should expose dedicated
 * aggregation endpoints (e.g. GET /stats/papers-by-field?yearFrom=…&yearTo=…)
 * so only pre-aggregated numbers are transferred.  The chart option builders
 * below work correctly at that scale too — just swap the input arrays.
 */

import type { Paper } from '../api/papers';

export interface ThemeColors {
  text: string;
  muted: string;
  border: string;
  colors: string[];
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

function papersByField(papers: Paper[], ct: ThemeColors): object {
  const counts: Record<string, number> = {};
  for (const p of papers) {
    if (p.field) counts[p.field] = (counts[p.field] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 40, right: 16, top: 36, bottom: 64 },
    xAxis: {
      type: 'category',
      data: sorted.map(([f]) => f),
      ...ax,
      axisLabel: { ...ax.axisLabel, rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', ...ax },
    series: [{
      type: 'bar',
      data: sorted.map(([, c], i) => ({
        value: c,
        itemStyle: { color: ct.colors[i % ct.colors.length], borderRadius: [3, 3, 0, 0] },
      })),
      barMaxWidth: 48,
    }],
    tooltip: { trigger: 'axis' },
  };
}

function papersByYear(papers: Paper[], ct: ThemeColors): object {
  const counts: Record<number, number> = {};
  for (const p of papers) {
    if (p.publicationYear) counts[p.publicationYear] = (counts[p.publicationYear] ?? 0) + 1;
  }
  const years = Object.keys(counts).map(Number).sort();
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 36, right: 16, top: 36, bottom: 36 },
    xAxis: { type: 'category', data: years.map(String), ...ax },
    yAxis: { type: 'value', ...ax, minInterval: 1 },
    series: [{
      type: 'bar',
      data: years.map(y => counts[y]),
      itemStyle: { color: ct.colors[1], borderRadius: [2, 2, 0, 0] },
      barMaxWidth: 32,
    }],
    tooltip: { trigger: 'axis' },
  };
}

function citationsByYear(papers: Paper[], ct: ThemeColors): object {
  const sums: Record<number, number> = {};
  for (const p of papers) {
    if (p.publicationYear) {
      sums[p.publicationYear] = (sums[p.publicationYear] ?? 0) + (p.citedByCount ?? 0);
    }
  }
  const years = Object.keys(sums).map(Number).sort();
  const ax = axisBase(ct);
  return {
    backgroundColor: 'transparent',
    grid: { left: 56, right: 16, top: 36, bottom: 36 },
    xAxis: { type: 'category', data: years.map(String), ...ax },
    yAxis: { type: 'value', ...ax, axisLabel: { color: ct.muted, formatter: K } },
    series: [{
      type: 'line',
      data: years.map(y => sums[y]),
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

function yearVsCitations(papers: Paper[], ct: ThemeColors): object {
  const data = papers
    .filter(p => p.publicationYear && p.citedByCount != null)
    .map(p => [p.publicationYear, p.citedByCount, p.title]);
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

function openAccess(papers: Paper[], ct: ThemeColors): object {
  const oaCount = papers.filter(p => p.isOa).length;
  const closed  = papers.length - oaCount;
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

const PERIODS = ['2012–15', '2016–19', '2020–23'] as const;

function periodOf(year: number): string | null {
  if (year >= 2012 && year <= 2015) return '2012–15';
  if (year >= 2016 && year <= 2019) return '2016–19';
  if (year >= 2020 && year <= 2023) return '2020–23';
  return null;
}

function fieldPeriod(papers: Paper[], ct: ThemeColors): object {
  const fields = [...new Set(papers.map(p => p.field).filter(Boolean))].slice(0, 8);
  const counts: Record<string, Record<string, number>> = {};
  for (const f of fields) counts[f] = { '2012–15': 0, '2016–19': 0, '2020–23': 0 };
  for (const p of papers) {
    if (!p.field || !p.publicationYear) continue;
    const period = periodOf(p.publicationYear);
    if (period && counts[p.field]) counts[p.field][period]++;
  }
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
      data: PERIODS.map(period => counts[f][period] ?? 0),
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
  papers: Paper[],
  ct: ThemeColors,
): object {
  switch (chartId) {
    case 'papers-by-field':   return papersByField(papers, ct);
    case 'papers-by-year':    return papersByYear(papers, ct);
    case 'citations-by-year': return citationsByYear(papers, ct);
    case 'year-vs-citations': return yearVsCitations(papers, ct);
    case 'open-access':       return openAccess(papers, ct);
    case 'field-period':      return fieldPeriod(papers, ct);
    default:                  return papersByField(papers, ct);
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
