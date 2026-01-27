import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface TornadoDataItem {
  variable: string;
  minImpact: number; // % profit change at -X%
  maxImpact: number; // % profit change at +X%
  baseValue?: number;
  color?: string;
}

interface TornadoChartProps {
  data: TornadoDataItem[];
  title?: string;
  subtitle?: string;
}

const DEFAULT_COLORS = {
  negative: '#ef4444',
  positive: '#10b981',
  variables: ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'],
};

export function TornadoChart({ data, title, subtitle }: TornadoChartProps) {
  // Sort by total impact range (most sensitive first)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => 
      (Math.abs(b.maxImpact) + Math.abs(b.minImpact)) - 
      (Math.abs(a.maxImpact) + Math.abs(a.minImpact))
    ).map((item, index) => ({
      ...item,
      color: item.color || DEFAULT_COLORS.variables[index % DEFAULT_COLORS.variables.length],
    }));
  }, [data]);

  const maxAbsValue = useMemo(() => {
    return Math.max(
      ...data.map(d => Math.max(Math.abs(d.minImpact), Math.abs(d.maxImpact)))
    );
  }, [data]);

  // Create chart data with positive/negative split for tornado effect
  const chartData = useMemo(() => {
    return sortedData.map(item => ({
      variable: item.variable,
      negative: item.minImpact,
      positive: item.maxImpact,
      color: item.color,
      totalRange: Math.abs(item.maxImpact) + Math.abs(item.minImpact),
    }));
  }, [sortedData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-sm text-red-500">
            Giảm: {data.negative.toFixed(1)}% lợi nhuận
          </p>
          <p className="text-sm text-green-500">
            Tăng: +{data.positive.toFixed(1)}% lợi nhuận
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng biên độ: {data.totalRange.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title || 'Tornado Chart - Độ nhạy'}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <motion.div 
          className="h-[280px]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ left: 10, right: 20, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis 
                type="number" 
                domain={[-maxAbsValue * 1.1, maxAbsValue * 1.1]}
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <YAxis 
                type="category" 
                dataKey="variable" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
              <Bar 
                dataKey="negative" 
                name="Giảm"
                stackId="stack"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`neg-${index}`} fill={DEFAULT_COLORS.negative} />
                ))}
              </Bar>
              <Bar 
                dataKey="positive" 
                name="Tăng"
                stackId="stack"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`pos-${index}`} fill={DEFAULT_COLORS.positive} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: DEFAULT_COLORS.negative }} />
            <span className="text-sm text-muted-foreground">Giảm biến số → Tác động lợi nhuận</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: DEFAULT_COLORS.positive }} />
            <span className="text-sm text-muted-foreground">Tăng biến số → Tác động lợi nhuận</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
