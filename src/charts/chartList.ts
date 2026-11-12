export interface ChartMeta {
  id: string;
  title: string;
  /** Uses echarts-gl (3D); only rendered in GraphPage. */
  is3d?: boolean;
}

export const CHART_LIST: ChartMeta[] = [
  // First entry is the default shown on Overview (GraphPreview) and the
  // fallback for /graph/:chartId — keep it first deliberately.
  { id: 'citations-by-year',  title: 'Citations by Year Published' },
  { id: 'papers-by-field',    title: 'Papers by Field' },
  { id: 'papers-by-type',     title: 'Papers by Publication Type' },
  { id: 'papers-by-year',     title: 'Papers by Year' },
  { id: 'year-vs-citations',  title: 'Year vs. Citations' },
  { id: 'open-access',        title: 'Open Access' },
  { id: 'apc-by-publisher',   title: 'Average APC by Publisher' },
  // Field currently has only one value in this corpus — grouped by
  // publication type instead, which actually varies. Swap back to field
  // once the corpus covers more than one field (see WorksService.typePeriodStats).
  { id: 'type-period',        title: 'Publication Type by Period', is3d: true },
];
