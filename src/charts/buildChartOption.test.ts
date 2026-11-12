import { describe, it, expect } from 'vitest';
import {
  buildChartOption, makeThemeColors, typePeriodBar3d, DEFAULT_PERIODS, formatPeriodLabel,
  encodePeriodsParam, type ChartStatsData,
} from './buildChartOption';

const PERIODS = DEFAULT_PERIODS.map(formatPeriodLabel);

const ct = makeThemeColors(false);

const data: ChartStatsData = {
  byYear: [
    { publication_year: 2021, paper_count: 5, avg_citations: 2, total_citations: 10 },
    { publication_year: 2019, paper_count: 3, avg_citations: 4, total_citations: 12 },
    { publication_year: 2020, paper_count: 8, avg_citations: 1, total_citations: 8 },
  ],
  byField: [
    { field: 'Physics', paper_count: 10, avg_citations: 3 },
    { field: 'Biology', paper_count: 20, avg_citations: 5 },
  ],
  byType: [
    { type: 'article', paper_count: 30, avg_citations: 4 },
    { type: 'preprint', paper_count: 10, avg_citations: 1 },
  ],
  scatter: [
    { id: 'W1', publication_year: 2020, cited_by_count: 40, title: 'A study' },
    { id: 'W2', publication_year: 2021, cited_by_count: 400, title: 'B study' },
  ],
  oaByYear: [
    { publication_year: 2020, total: 10, oa_count: 4, oa_pct: 0.4 },
    { publication_year: 2021, total: 10, oa_count: 6, oa_pct: 0.6 },
  ],
  typePeriod: [
    { type: 'article', period_index: 0, paper_count: 5 },
    { type: 'article', period_index: 1, paper_count: 7 },
    { type: 'preprint', period_index: 0, paper_count: 12 },
  ],
  apc: [
    { source_name: 'Nature', paper_count: 5, avg_apc: 11000, oa_pct: 60 },
    { source_name: 'IEEE Access', paper_count: 20, avg_apc: 1800, oa_pct: 100 },
  ],
};

describe('buildChartOption', () => {
  it('papers-by-field: sorts fields by paper_count descending', () => {
    const option: any = buildChartOption('papers-by-field', data, ct);
    expect(option.xAxis.data).toEqual(['Biology', 'Physics']);
    expect(option.series[0].data.map((d: any) => d.value)).toEqual([20, 10]);
  });

  it('papers-by-year: sorts years ascending', () => {
    const option: any = buildChartOption('papers-by-year', data, ct);
    expect(option.xAxis.data).toEqual(['2019', '2020', '2021']);
    expect(option.series[0].data).toEqual([3, 8, 5]);
  });

  it('citations-by-year: sorts years ascending and plots total_citations', () => {
    const option: any = buildChartOption('citations-by-year', data, ct);
    expect(option.xAxis.data).toEqual(['2019', '2020', '2021']);
    expect(option.series[0].data).toEqual([12, 8, 10]);
  });

  it('year-vs-citations: maps scatter points to [year, citations, title, id] tuples', () => {
    const option: any = buildChartOption('year-vs-citations', data, ct);
    expect(option.series[0].data).toEqual([
      [2020, 40, 'A study', 'W1'],
      [2021, 400, 'B study', 'W2'],
    ]);
  });

  it('open-access: sums oa/closed counts across all years', () => {
    const option: any = buildChartOption('open-access', data, ct);
    const [oa, closed] = option.series[0].data;
    expect(oa).toEqual({ value: 10, name: 'Open Access', itemStyle: { color: ct.colors[0] } });
    expect(closed.value).toBe(10); // total(20) - oaCount(10)
    expect(closed.name).toBe('Closed');
  });

  it('papers-by-type: sorts types by paper_count descending', () => {
    const option: any = buildChartOption('papers-by-type', data, ct);
    expect(option.xAxis.data).toEqual(['article', 'preprint']);
    expect(option.series[0].data.map((d: any) => d.value)).toEqual([30, 10]);
  });

  it('type-period: stacks paper_count per type across the fixed PERIODS axis', () => {
    const option: any = buildChartOption('type-period', data, ct);
    expect(option.xAxis.data).toEqual([...PERIODS]);
    const article = option.series.find((s: any) => s.name === 'article');
    const preprint = option.series.find((s: any) => s.name === 'preprint');
    expect(article.data).toEqual([5, 7, 0]);
    expect(preprint.data).toEqual([12, 0, 0]);
  });

  it('type-period: respects caller-supplied period labels instead of the default', () => {
    const option: any = buildChartOption('type-period', data, ct, ['Before 2016', '2016 on']);
    expect(option.xAxis.data).toEqual(['Before 2016', '2016 on']);
  });

  it('apc-by-publisher: sorts publishers by paper_count descending', () => {
    const option: any = buildChartOption('apc-by-publisher', data, ct);
    expect(option.xAxis.data).toEqual(['IEEE Access', 'Nature']);
    expect(option.series[0].data.map((d: any) => d.value)).toEqual([1800, 11000]);
  });

  it('falls back to papers-by-field for an unknown chartId', () => {
    const fallback: any = buildChartOption('not-a-real-chart', data, ct);
    const explicit: any = buildChartOption('papers-by-field', data, ct);
    expect(fallback).toEqual(explicit);
  });
});

describe('buildChartOption — axis names', () => {
  const cases: [string, string, string][] = [
    ['papers-by-field', 'Field', 'Papers'],
    ['papers-by-type', 'Type', 'Papers'],
    ['papers-by-year', 'Year', 'Papers'],
    ['citations-by-year', 'Year', 'Citations'],
    ['year-vs-citations', 'Year', 'Citations'],
    ['type-period', 'Period', 'Papers'],
    ['apc-by-publisher', 'Publisher', 'Avg. APC (USD)'],
  ];

  it.each(cases)('%s has both axes named ("%s" / "%s")', (chartId, xName, yName) => {
    const option: any = buildChartOption(chartId, data, ct);
    expect(option.xAxis.name).toBe(xName);
    expect(option.yAxis.name).toBe(yName);
  });
});

describe('period helpers', () => {
  it('formatPeriodLabel renders an en-dash range', () => {
    expect(formatPeriodLabel({ from: 2012, to: 2015 })).toBe('2012–2015');
  });

  it('encodePeriodsParam produces the "YYYY-YYYY,..." shape ChartFilterDto expects', () => {
    expect(encodePeriodsParam(DEFAULT_PERIODS)).toBe('2012-2015,2016-2019,2020-2023');
  });
});

describe('typePeriodBar3d', () => {
  it('builds one bar3D data point per type x period combination, using period_index for x', () => {
    const option: any = typePeriodBar3d(data.typePeriod, PERIODS, ct);
    expect(option.xAxis3D.data).toEqual([...PERIODS]);
    expect(option.yAxis3D.data).toEqual(['article', 'preprint']);
    expect(option.series[0].type).toBe('bar3D');
    // article@period0 = 5 (see fixture) -> point [xi=0, yi=0, value=5]
    const articlePoint0 = option.series[0].data.find((d: any) => d.value[0] === 0 && d.value[1] === 0);
    expect(articlePoint0.value[2]).toBe(5);
  });

  it('caps the type (y) axis at 6 distinct values', () => {
    const manyTypes = Array.from({ length: 10 }, (_, i) => ({ type: `t${i}`, period_index: 0, paper_count: 1 }));
    const option: any = typePeriodBar3d(manyTypes, PERIODS, ct);
    expect(option.yAxis3D.data).toHaveLength(6);
  });
});

describe('makeThemeColors', () => {
  it('returns distinct palettes for dark and light mode', () => {
    const dark = makeThemeColors(true);
    const light = makeThemeColors(false);
    expect(dark.text).not.toBe(light.text);
    expect(dark.colors).not.toEqual(light.colors);
  });
});
