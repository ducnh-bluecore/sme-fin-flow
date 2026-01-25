import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3, Database, Sparkles, Info } from 'lucide-react';
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
          <p className="text-sm text-muted-foreground mb-2">
            Thêm kịch bản để xem so sánh
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Chọn kịch bản mẫu hoặc tạo kịch bản tùy chỉnh ở panel bên trái để so sánh với dữ liệu thực tế.
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

  const baseline = results[0];
  const scenarios = results.slice(1);

  const chartData = results.map((r, i) => ({
    name: r.scenario_name,
    equity: r.total_equity_12m,
    delta: r.delta_percent_12m,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-4">
      {/* Side-by-side: Thực tế vs Giả định */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Baseline - Thực tế */}
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Thực tế (Baseline)</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] bg-background">
                Dữ liệu thật
              </Badge>
              Từ hệ thống CDP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tổng Customer Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(baseline.total_equity_12m)}</p>
                <p className="text-xs text-muted-foreground">12 tháng</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">LTV Trung bình</p>
                <p className="text-2xl font-bold">{formatCurrency(baseline.avg_ltv_12m)}</p>
                <p className="text-xs text-muted-foreground">/ khách hàng</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Khách hàng hoạt động</p>
              <p className="text-lg font-semibold">{baseline.total_customers.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Best Scenario - Giả định tốt nhất */}
        {scenarios.length > 0 ? (
          <Card className="border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base">
                  {scenarios.reduce((best, s) => s.delta_percent_12m > best.delta_percent_12m ? s : best, scenarios[0]).scenario_name}
                </CardTitle>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] bg-amber-100 border-amber-300 text-amber-800">
                  Ước tính
                </Badge>
                Kịch bản giả định tốt nhất
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const bestScenario = scenarios.reduce((best, s) => s.delta_percent_12m > best.delta_percent_12m ? s : best, scenarios[0]);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tổng Customer Equity</p>
                        <p className="text-2xl font-bold">{formatCurrency(bestScenario.total_equity_12m)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {bestScenario.delta_percent_12m >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={cn(
                            'text-xs font-medium',
                            bestScenario.delta_percent_12m >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {bestScenario.delta_percent_12m >= 0 ? '+' : ''}{bestScenario.delta_percent_12m.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Chênh lệch</p>
                        <p className={cn(
                          'text-2xl font-bold',
                          bestScenario.delta_vs_base_12m >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {bestScenario.delta_vs_base_12m >= 0 ? '+' : ''}{formatCurrency(bestScenario.delta_vs_base_12m)}
                        </p>
                        <p className="text-xs text-muted-foreground">so với thực tế</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-start gap-2 p-2 bg-background/80 rounded-md">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Con số này được ước tính dựa trên mô hình LTV với các giả định đã chọn. 
                          Kết quả thực tế có thể khác tùy thuộc vào điều kiện thị trường.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Chọn một kịch bản để so sánh
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Scenarios Comparison */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              So sánh tất cả kịch bản
              <Badge variant="secondary" className="text-[10px]">
                {results.length} kịch bản
              </Badge>
            </CardTitle>
            <CardDescription>
              Customer Equity dự kiến 12 tháng - So sánh giữa thực tế và các giả định
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
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
                    width={140}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), 'Equity 12M']}
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
      )}

      {/* Detailed Table with Clear Labels */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chi tiết so sánh</CardTitle>
          <CardDescription>
            Xem đầy đủ các chỉ số giữa thực tế và giả định
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Kịch bản</th>
                  <th className="text-center py-2 font-medium w-20">Loại</th>
                  <th className="text-right py-2 font-medium">Khách hàng</th>
                  <th className="text-right py-2 font-medium">Equity 12M</th>
                  <th className="text-right py-2 font-medium">Equity 24M</th>
                  <th className="text-right py-2 font-medium">Avg LTV</th>
                  <th className="text-right py-2 font-medium">Δ vs Thực tế</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className={cn(
                    'border-b last:border-0',
                    index === 0 && 'bg-primary/5'
                  )}>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className={cn(index === 0 && 'font-medium')}>
                          {result.scenario_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-2">
                      {index === 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          Thực tế
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                          Ước tính
                        </Badge>
                      )}
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

      {/* Methodology Note */}
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Về phương pháp tính toán:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li><strong>Thực tế:</strong> Dữ liệu LTV được tính từ giao dịch thực, áp dụng retention curve và discount rate từ mô hình hiện tại.</li>
                <li><strong>Ước tính:</strong> Điều chỉnh các tham số (retention, AOV, discount) và chiếu đến equity mới. Đây là con số giả định.</li>
                <li>Công thức: LTV = Σ (Profit × Retention<sub>t</sub> × Growth<sub>t</sub>) / (1 + Discount)<sup>t</sup></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
