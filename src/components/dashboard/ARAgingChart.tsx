import { useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { useARAgingData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(25 95% 53%)',
  'hsl(0 72% 51%)',
  'hsl(0 84% 40%)',
];

const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold mb-1">{data.bucket}</p>
        <p className="text-sm text-muted-foreground">
          Giá trị: <span className="font-medium text-foreground">{formatVND(data.value)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Tỷ lệ: <span className="font-medium text-foreground">{data.percent}%</span>
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

const LegendContent = memo(({ payload }: any) => (
  <div className="flex flex-wrap justify-center gap-3 mt-4">
    {payload?.map((entry: any, index: number) => (
      <div key={index} className="flex items-center gap-2 text-xs">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-muted-foreground">{entry.value}</span>
      </div>
    ))}
  </div>
));

LegendContent.displayName = 'LegendContent';

function ARAgingChartComponent() {
  const { data: arAgingData, isLoading } = useARAgingData();

  const total = useMemo(() => arAgingData?.reduce((sum, item) => sum + item.value, 0) || 0, [arAgingData]);

  const dataWithPercent = useMemo(
    () =>
      arAgingData?.map((item) => ({
        ...item,
        percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
      })) || [],
    [arAgingData, total]
  );

  const renderLegend = useCallback((props: any) => <LegendContent {...props} />, []);

  if (isLoading) {
    return (
      <div className="data-card">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="data-card"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Phân tích tuổi nợ AR</h3>
        <p className="text-sm text-muted-foreground">AR Aging Analysis</p>
      </div>

      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="bucket"
            >
              {dataWithPercent.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Label */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-xs text-muted-foreground">Tổng AR</p>
          <p className="text-lg font-bold text-foreground">{formatVNDCompact(total)}</p>
        </div>
      </div>
    </motion.div>
  );
}

export const ARAgingChart = memo(ARAgingChartComponent);
