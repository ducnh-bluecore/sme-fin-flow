import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  ComposedChart, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { CHART_PALETTE, CHART_CONFIG, chartFormatters } from '@/components/charts';
import { Card } from '@/components/ui/card';

export interface ChartSeries {
  key: string;
  name: string;
  type?: 'bar' | 'line';
  color?: string;
}

export interface AIChartConfig {
  type: 'bar' | 'line' | 'composed' | 'pie';
  title?: string;
  data: Record<string, unknown>[];
  series: ChartSeries[];
  xKey?: string;
  yFormat?: 'vnd' | 'percent' | 'number';
  height?: number;
}

const formatValue = (format: string | undefined) => {
  switch (format) {
    case 'vnd': return chartFormatters.vnd;
    case 'percent': return chartFormatters.percent;
    default: return chartFormatters.number;
  }
};

export default function AIChartRenderer({ config }: { config: AIChartConfig }) {
  const { type, title, data, series, xKey = 'label', yFormat, height = 300 } = config;
  const fmt = useMemo(() => formatValue(yFormat), [yFormat]);

  const colors = series.map((s, i) => s.color || CHART_PALETTE[i % CHART_PALETTE.length]);

  const commonAxisProps = {
    tick: CHART_CONFIG.axis.tick,
    axisLine: { stroke: CHART_CONFIG.axis.stroke },
    tickLine: false,
  };

  const renderChart = () => {
    if (type === 'pie') {
      const dataKey = series[0]?.key || 'value';
      return (
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${fmt(value as number)}`}>
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => fmt(v)} />
          <Legend />
        </PieChart>
      );
    }

    const ChartComponent = type === 'line' ? LineChart : type === 'composed' ? ComposedChart : BarChart;

    return (
      <ChartComponent data={data} margin={CHART_CONFIG.margin}>
        <CartesianGrid strokeDasharray={CHART_CONFIG.grid.strokeDasharray} stroke={CHART_CONFIG.grid.stroke} opacity={CHART_CONFIG.grid.opacity} />
        <XAxis dataKey={xKey} {...commonAxisProps} />
        <YAxis tickFormatter={(v) => fmt(v)} {...commonAxisProps} />
        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
        {series.length > 1 && <Legend />}
        {series.map((s, i) => {
          const seriesType = type === 'composed' ? (s.type || 'bar') : type;
          const showLabel = data.length <= 15;
          if (seriesType === 'line') {
            return (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }}>
                {showLabel && <LabelList dataKey={s.key} position="top" formatter={(v: number) => fmt(v)} style={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />}
              </Line>
            );
          }
          return (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={colors[i]} radius={[4, 4, 0, 0]}>
              {showLabel && <LabelList dataKey={s.key} position="top" formatter={(v: number) => fmt(v)} style={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />}
            </Bar>
          );
        })}
      </ChartComponent>
    );
  };

  return (
    <Card className="p-4 my-3">
      {title && <p className="text-sm font-medium text-foreground mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
}
