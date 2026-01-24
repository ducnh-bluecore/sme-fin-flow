import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScenarioResult {
  scenario_name: string;
  total_customers: number;
  total_equity_12m: number;
  total_equity_24m: number;
  avg_ltv_12m: number;
  delta_vs_base_12m: number;
  delta_percent_12m: number;
}

interface ScenarioComparisonProps {
  results: ScenarioResult[];
  isLoading: boolean;
}

const COLORS = ['hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export function ScenarioComparison({ results, isLoading }: ScenarioComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Thêm kịch bản để xem so sánh
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const chartData = results.map((r, i) => ({
    name: r.scenario_name,
    equity: r.total_equity_12m,
    delta: r.delta_percent_12m,
    fill: COLORS[i % COLORS.length],
  }));

  const baseEquity = results[0]?.total_equity_12m || 0;
  const maxDelta = Math.max(...results.map(r => Math.abs(r.delta_percent_12m)));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {results.map((result, index) => (
          <Card key={index} className={cn(
            'relative overflow-hidden',
            index === 0 && 'border-muted-foreground/30'
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
                  {result.scenario_name}
                </span>
                {index > 0 && (
                  <Badge 
                    variant={result.delta_percent_12m >= 0 ? 'default' : 'destructive'}
                    className="text-[10px] px-1.5"
                  >
                    {result.delta_percent_12m >= 0 ? '+' : ''}{result.delta_percent_12m.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold">
                {formatCurrency(result.total_equity_12m)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {index === 0 ? (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                ) : result.delta_vs_base_12m >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={cn(
                  'text-xs',
                  index === 0 ? 'text-muted-foreground' : 
                    result.delta_vs_base_12m >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {index === 0 ? 'Baseline' : 
                    `${result.delta_vs_base_12m >= 0 ? '+' : ''}${formatCurrency(result.delta_vs_base_12m)}`}
                </span>
              </div>
            </CardContent>
            {/* Color indicator */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">So sánh Customer Equity (12 tháng)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Total Equity']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="equity" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết so sánh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Kịch bản</th>
                  <th className="text-right py-2 font-medium">Khách hàng</th>
                  <th className="text-right py-2 font-medium">Equity 12M</th>
                  <th className="text-right py-2 font-medium">Equity 24M</th>
                  <th className="text-right py-2 font-medium">Avg LTV</th>
                  <th className="text-right py-2 font-medium">Δ vs Base</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {result.scenario_name}
                      </div>
                    </td>
                    <td className="text-right py-2">{result.total_customers.toLocaleString()}</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(result.total_equity_12m)}</td>
                    <td className="text-right py-2">{formatCurrency(result.total_equity_24m)}</td>
                    <td className="text-right py-2">{formatCurrency(result.avg_ltv_12m)}</td>
                    <td className={cn(
                      'text-right py-2 font-medium',
                      index === 0 ? 'text-muted-foreground' :
                        result.delta_percent_12m >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {index === 0 ? '—' : `${result.delta_percent_12m >= 0 ? '+' : ''}${result.delta_percent_12m.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
