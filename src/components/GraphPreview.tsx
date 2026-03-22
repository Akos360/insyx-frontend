import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { useTheme } from '../theme/useTheme';

const FIELDS = ['ML', 'NLP', 'CV', 'Optimization', 'Gen AI'];

export default function GraphPreview() {
  const { theme } = useTheme();

  const option = useMemo(() => {
    const isDark = theme === 'dark';
    const colors = isDark
      ? ['#cbf7ed', '#8ea8c3', '#6aaccc', '#406e8e', '#4a7fa8']
      : ['#23395b', '#406e8e', '#6aaccc', '#8ea8c3', '#9db5ca'];
    const muted = isDark ? '#9db5ca' : '#406e8e';
    const border = isDark ? '#29415f' : '#bfd0e0';

    const axis = {
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 10 },
      splitLine: { lineStyle: { color: border } },
      axisTick: { show: false },
    };

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 32, right: 8, top: 10, bottom: 26 },
      xAxis: { type: 'category', data: FIELDS, ...axis },
      yAxis: { type: 'value', ...axis },
      series: [{
        type: 'bar',
        data: [7, 5, 3, 2, 3],
        itemStyle: {
          color: (p: any) => colors[p.dataIndex % colors.length],
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 40,
      }],
    };
  }, [theme]);

  return (
    <ReactECharts
      option={option}
      notMerge
      style={{ position: 'absolute', inset: '28px 0 0 0', width: '100%', height: 'calc(100% - 28px)' }}
    />
  );
}