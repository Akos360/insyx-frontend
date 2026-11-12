import type { ChartStatsData } from "./buildChartOption";


export type ChartSelection =
  | { kind: "work"; workId: string }
  | {
      kind: "category";
      chartId: string;
      label: string;
      count?: number;
      /** Query params for the "Open in Full View" link to /search. */
      searchParams: Record<string, string>;
    };

/** A bare-minimum shape of ECharts' click event params — only what we read. */
export interface EChartsClickParams {
  componentType?: string;
  seriesType?: string;
  seriesName?: string;
  name?: string;
  value?: unknown;
  data?: unknown;
}

/**
 * Turns an ECharts click event into something navigable, or null if the
 * clicked chart/element isn't meant to be selectable (e.g. a legend click,
 * or a chart id we don't recognize).
 */
export function interpretChartClick(
  chartId: string,
  params: EChartsClickParams,
  data: ChartStatsData,
): ChartSelection | null {
  if (params.componentType && params.componentType !== "series") return null;

  switch (chartId) {
    case "papers-by-field": {
      const field = params.name;
      if (!field) return null;
      const stat = data.byField.find((f) => f.field === field);
      return {
        kind: "category",
        chartId,
        label: `Field: ${field}`,
        count: stat?.paper_count,
        searchParams: { field },
      };
    }

    case "papers-by-year":
    case "citations-by-year": {
      const year = params.name;
      if (!year) return null;
      const stat = data.byYear.find((r) => String(r.publication_year) === year);
      return {
        kind: "category",
        chartId,
        label: `Year: ${year}`,
        count: stat?.paper_count,
        searchParams: { yearFrom: year, yearTo: year },
      };
    }

    case "year-vs-citations": {
      const point = params.data as unknown[] | undefined;
      const workId = point?.[3];
      if (typeof workId !== "string" || !workId) return null;
      return { kind: "work", workId };
    }

    case "open-access": {
      const name = params.name;
      if (!name) return null;
      const isOpen = name === "Open Access";
      const count = typeof params.value === "number" ? params.value : undefined;
      return {
        kind: "category",
        chartId,
        label: name,
        count,
        searchParams: { is_oa: String(isOpen) },
      };
    }

    // 'type-period', 'papers-by-type', and 'apc-by-publisher' are intentionally
    // not selectable here — publication type and publisher aren't filters
    // /search supports yet, so there'd be nothing meaningful to open.

    default:
      return null;
  }
}
