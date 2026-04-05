export interface ChartMeta {
  id: string;
  title: string;
  /** True if this chart uses echarts-gl (3D) — only rendered in GraphPage */
  is3d?: boolean;
}

export const CHART_LIST: ChartMeta[] = [
  { id: 'papers-by-field',    title: 'Papers by Field' },
  { id: 'papers-by-year',     title: 'Papers by Year' },
  { id: 'citations-by-year',  title: 'Citations by Year Published' },
  { id: 'year-vs-citations',  title: 'Year vs. Citations' },
  { id: 'open-access',        title: 'Open Access' },
  { id: 'field-period',       title: 'Papers by Field & Period', is3d: true },
];
