import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getStatsByYear, getStatsByField, getStatsByType, getStatsScatter, getStatsOaByYear,
  getStatsTypePeriod, getStatsApc,
} from '../api/works';
import type { ChartStatsData } from './buildChartOption';

export interface UseWorksStatsOptions {
  /** For previews: avoids refetch on every mount (React Query already dedupes by key regardless). */
  staleTime?: number;
}

export interface UseWorksStatsResult {
  data: ChartStatsData;
  // isPending, not isLoading — under PersistQueryClientProvider, isLoading is
  // falsely false during the IndexedDB-restore window (pending but not yet
  // fetching), which would flash an empty/error chart on every hard refresh.
  isPending: boolean;
  isError: boolean;
}

/** Fetches the pre-aggregated stats series; shared by GraphPage and GraphPreview so React Query dedupes requests between them. */
export function useWorksStats(options: UseWorksStatsOptions = {}): UseWorksStatsResult {
  const { staleTime } = options;

  const byYear = useQuery({ queryKey: ['stats', 'by-year'], queryFn: () => getStatsByYear(), staleTime });
  const byField = useQuery({ queryKey: ['stats', 'by-field'], queryFn: () => getStatsByField(), staleTime });
  const byType = useQuery({ queryKey: ['stats', 'by-type'], queryFn: () => getStatsByType(), staleTime });
  const scatter = useQuery({ queryKey: ['stats', 'scatter'], queryFn: () => getStatsScatter(), staleTime });
  const oaByYear = useQuery({ queryKey: ['stats', 'oa-ratio'], queryFn: () => getStatsOaByYear(), staleTime });
  const typePeriod = useQuery({ queryKey: ['stats', 'type-period'], queryFn: () => getStatsTypePeriod(), staleTime });
  const apc = useQuery({ queryKey: ['stats', 'apc'], queryFn: () => getStatsApc(), staleTime });

  const data: ChartStatsData = useMemo(
    () => ({
      byYear: byYear.data ?? [],
      byField: byField.data ?? [],
      byType: byType.data ?? [],
      scatter: scatter.data ?? [],
      oaByYear: oaByYear.data ?? [],
      typePeriod: typePeriod.data ?? [],
      apc: apc.data ?? [],
    }),
    [byYear.data, byField.data, byType.data, scatter.data, oaByYear.data, typePeriod.data, apc.data],
  );

  return {
    data,
    isPending:
      byYear.isPending || byField.isPending || byType.isPending || scatter.isPending ||
      oaByYear.isPending || typePeriod.isPending || apc.isPending,
    isError:
      byYear.isError || byField.isError || byType.isError || scatter.isError ||
      oaByYear.isError || typePeriod.isError || apc.isError,
  };
}
