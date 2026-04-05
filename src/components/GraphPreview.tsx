import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { getAllPapers } from '../api/papers';
import { CHART_LIST } from '../charts/chartList';
import { buildChartOption, makeThemeColors } from '../charts/buildChartOption';
import { useTheme } from '../theme/useTheme';

export default function GraphPreview() {
  const { theme } = useTheme();
  const [idx, setIdx] = useState(0);

  // Shared query — React Query deduplicates this with GraphPage's identical query key
  const { data: papers = [] } = useQuery({
    queryKey: ['papers'],
    queryFn: getAllPapers,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(() => {
    const ct = makeThemeColors(theme === 'dark');
    return CHART_LIST.map(c => ({
      ...(buildChartOption(c.id, papers, ct) as object),
      animation: false,
    }));
  }, [papers, theme]);

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => (i - 1 + CHART_LIST.length) % CHART_LIST.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => (i + 1) % CHART_LIST.length);
  };

  return (
    <>
      <div className="graphPreviewBar">
        <button className="graphPreviewArrow" onClick={prev} aria-label="Previous chart">
          <BsChevronLeft size={11} />
        </button>
        <span className="graphPreviewTitle">{CHART_LIST[idx].title}</span>
        <button className="graphPreviewArrow" onClick={next} aria-label="Next chart">
          <BsChevronRight size={11} />
        </button>
      </div>

      <ReactECharts
        key={idx}
        option={options[idx]}
        notMerge
        style={{ position: 'absolute', inset: '28px 0 0 0', width: '100%', height: 'calc(100% - 28px)' }}
      />
    </>
  );
}
