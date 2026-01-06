import { useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useARAgingData } from '@/hooks/useDashboardData';

const PLATFORMS = [
  { name: 'Shopee', color: 'hsl(15 90% 55%)' },
  { name: 'Lazada', color: 'hsl(210 100% 50%)' },
  { name: 'TikTok Shop', color: 'hsl(0 0% 10%)' },
  { name: 'Tiki', color: 'hsl(200 100% 45%)' },
  { name: 'Sendo', color: 'hsl(0 85% 50%)' },
];

const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold mb-1">{data.platform}</p>
        <p className="text-sm text-muted-foreground">
          Tổng AR: <span className="font-medium text-foreground">{formatVND(data.totalAR)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Quá hạn: <span className="font-medium text-destructive">{formatVND(data.overdueAR)}</span>
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

function ARByPlatformChartComponent() {
  const { data: arAgingData, isLoading } = useARAgingData();

  // Generate mock data based on AR aging data
  const platformData = useMemo(() => {
    const totalAR = arAgingData?.reduce((sum, item) => sum + item.value, 0) || 0;
    
    if (totalAR === 0) {
      // Return demo data if no real data
      return PLATFORMS.map((platform, index) => {
        const baseValue = (5 - index) * 800000000 + Math.random() * 200000000;
        const overdueRate = 0.15 + Math.random() * 0.25;
        return {
          platform: platform.name,
          totalAR: baseValue,
          overdueAR: baseValue * overdueRate,
          color: platform.color,
          percent: ((baseValue / (PLATFORMS.reduce((sum, _, i) => sum + (5 - i) * 800000000, 0))) * 100).toFixed(1),
        };
      });
    }

    // Distribute total AR across platforms
    const distribution = [0.35, 0.25, 0.20, 0.12, 0.08];
    return PLATFORMS.map((platform, index) => {
      const platformAR = totalAR * distribution[index];
      const overdueRate = 0.15 + Math.random() * 0.25;
      return {
        platform: platform.name,
        totalAR: platformAR,
        overdueAR: platformAR * overdueRate,
        color: platform.color,
        percent: (distribution[index] * 100).toFixed(1),
      };
    });
  }, [arAgingData]);

  const maxValue = useMemo(() => Math.max(...platformData.map(d => d.totalAR)), [platformData]);

  if (isLoading) {
    return (
      <div className="data-card">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
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
        <h3 className="font-semibold text-foreground">AR theo Nền tảng</h3>
        <p className="text-sm text-muted-foreground">AR by Platform</p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={platformData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={(value) => formatVNDCompact(value)}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="platform" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
            <Bar 
              dataKey="totalAR" 
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            >
              {platformData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-border">
        {platformData.map((platform, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: platform.color }}
            />
            <span className="text-muted-foreground">
              {platform.platform}: {platform.percent}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export const ARByPlatformChart = memo(ARByPlatformChartComponent);
