import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getStatsByYear, getStatsByField, getStatsScatter, getStatsOaByYear, getStatsFieldPeriod,
} from '../api/works';
import type { ChartStatsData } from './buildChartOption';

export interface UseWorksStatsOptions {
  /** For previews: avoids refetch on every mount (React Query already dedupes by key regardless). */
  staleTime?: number;
}

export interface UseWorksStatsResult {
  data: ChartStatsData;
  isLoading: boolean;
  isError: boolean;
}

/** Fetches the 5 pre-aggregated stats series; shared by GraphPage and GraphPreview so React Query dedupes requests between them. */
export function useWorksStats(options: UseWorksStatsOptions = {}): UseWorksStatsResult {
  const { staleTime } = options;

  const byYear = useQuery({ queryKey: ['stats', 'by-year'], queryFn: () => getStatsByYear(), staleTime });
  const byField = useQuery({ queryKey: ['stats', 'by-field'], queryFn: () => getStatsByField(), staleTime });
  const scatter = useQuery({ queryKey: ['stats', 'scatter'], queryFn: () => getStatsScatter(), staleTime });
  const oaByYear = useQuery({ queryKey: ['stats', 'oa-ratio'], queryFn: () => getStatsOaByYear(), staleTime });
  const fieldPeriod = useQuery({ queryKey: ['stats', 'field-period'], queryFn: () => getStatsFieldPeriod(), staleTime });

  const data: ChartStatsData = useMemo(
    () => ({
      byYear: byYear.data ?? [],
      byField: byField.data ?? [],
      scatter: scatter.data ?? [],
      oaByYear: oaByYear.data ?? [],
      fieldPeriod: fieldPeriod.data ?? [],
    }),
    [byYear.data, byField.data, scatter.data, oaByYear.data, fieldPeriod.data],
  );

  return {
    data,
    isLoading: byYear.isLoading || byField.isLoading || scatter.isLoading || oaByYear.isLoading || fieldPeriod.isLoading,
    isError: byYear.isError || byField.isError || scatter.isError || oaByYear.isError || fieldPeriod.isError,
  };
}
