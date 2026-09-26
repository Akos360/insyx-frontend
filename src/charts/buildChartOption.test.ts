import { describe, it, expect } from 'vitest';
import { buildChartOption, makeThemeColors, PERIODS, type ChartStatsData } from './buildChartOption';

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
  scatter: [
    { publication_year: 2020, cited_by_count: 40, title: 'A study' },
    { publication_year: 2021, cited_by_count: 400, title: 'B study' },
  ],
  oaByYear: [
    { publication_year: 2020, total: 10, oa_count: 4, oa_pct: 0.4 },
    { publication_year: 2021, total: 10, oa_count: 6, oa_pct: 0.6 },
  ],
  fieldPeriod: [
    { field: 'Physics', period_index: 0, paper_count: 5 },
    { field: 'Physics', period_index: 1, paper_count: 7 },
    { field: 'Biology', period_index: 0, paper_count: 12 },
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

  it('year-vs-citations: maps scatter points to [year, citations, title] tuples', () => {
    const option: any = buildChartOption('year-vs-citations', data, ct);
    expect(option.series[0].data).toEqual([
      [2020, 40, 'A study'],
      [2021, 400, 'B study'],
    ]);
  });

  it('open-access: sums oa/closed counts across all years', () => {
    const option: any = buildChartOption('open-access', data, ct);
    const [oa, closed] = option.series[0].data;
    expect(oa).toEqual({ value: 10, name: 'Open Access', itemStyle: { color: ct.colors[0] } });
    expect(closed.value).toBe(10); // total(20) - oaCount(10)
    expect(closed.name).toBe('Closed');
  });

  it('field-period: stacks paper_count per field across the fixed PERIODS axis', () => {
    const option: any = buildChartOption('field-period', data, ct);
    expect(option.xAxis.data).toEqual([...PERIODS]);
    const physics = option.series.find((s: any) => s.name === 'Physics');
    const biology = option.series.find((s: any) => s.name === 'Biology');
    expect(physics.data).toEqual([5, 7, 0]);
    expect(biology.data).toEqual([12, 0, 0]);
  });

  it('falls back to papers-by-field for an unknown chartId', () => {
    const fallback: any = buildChartOption('not-a-real-chart', data, ct);
    const explicit: any = buildChartOption('papers-by-field', data, ct);
    expect(fallback).toEqual(explicit);
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
