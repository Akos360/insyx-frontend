import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getStatsByYear, getStatsByField, getStatsScatter, getStatsOaByYear, getStatsFieldPeriod,
} from '../api/works';
import type { ChartStatsData } from './buildChartOption';

export interface UseWorksStatsOptions {
  /** Passed straight to each underlying useQuery — set for previews so they
   *  don't refetch on every mount (React Query dedupes by query key regardless,
   *  this only controls whether a mount past staleTime triggers a refetch). */
  staleTime?: number;
}

export interface UseWorksStatsResult {
  data: ChartStatsData;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches the 5 pre-aggregated stats series charts are built from. Shared by
 * GraphPage and GraphPreview — same query keys, so React Query deduplicates
 * the actual network requests between them regardless of which mounts first.
 */
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
