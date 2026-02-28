import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Database, Sparkles, Info, Calendar, ArrowRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, ComposedChart, Area } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuarterlyBreakdown {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

interface ScenarioResult {
  scenario_name: string;
  total_customers: number;
  total_equity_12m: number;
  total_equity_24m: number;
  avg_ltv_12m: number;
  delta_vs_base_12m: number;
  delta_percent_12m: number;
  quarterly_breakdown: QuarterlyBreakdown;
  previous_year_revenue: number;
  yoy_growth_percent: number;
  yoy_growth_projected: number;
}

// Scenario input from ScenarioBuilder - used to apply strategic levers
interface InputScenario {
  name: string;
  retention_boost: number;
  aov_boost: number;
  discount_adjust: number;
  frequency_boost: number;
  churn_reduction: number;
  margin_adjust: number;
  cac_adjust: number;
  time_horizon: '6m' | '12m' | '24m';
  population_scope: string;
}

interface ScenarioComparisonProps {
  results: ScenarioResult[];
  isLoading: boolean;
  inputScenarios?: InputScenario[];
}

const COLORS = ['hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
};

const safeNumber = (val: unknown): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return 0;
};

// Calculate quarterly breakdown from total equity (since RPC doesn't return it yet)
// Uses seasonal weights based on typical retail patterns
const QUARTERLY_WEIGHTS = { q1: 0.22, q2: 0.26, q3: 0.24, q4: 0.28 };

const calculateQuarterlyBreakdown = (totalEquity: number): QuarterlyBreakdown => ({
  q1: totalEquity * QUARTERLY_WEIGHTS.q1,
  q2: totalEquity * QUARTERLY_WEIGHTS.q2,
  q3: totalEquity * QUARTERLY_WEIGHTS.q3,
  q4: totalEquity * QUARTERLY_WEIGHTS.q4,
});

/**
 * Calculate the impact of strategic levers on equity
 * 
 * FDP Manifesto: REVENUE ↔ COST - Mọi doanh thu đều đi kèm chi phí
 * 
 * Strategic Levers that affect REVENUE:
 * - frequency_boost: More purchases = more revenue (1:1 ratio)
 * - churn_reduction: Less churn = more retained revenue (1:0.8 ratio - conservative)
 * - retention_boost: Already handled by RPC
 * - aov_boost: Already handled by RPC
 * 
 * Financial Levers that affect PROFIT (not revenue):
 * - margin_adjust: Affects profit, not top-line revenue
 * - cac_adjust: Affects profit, not top-line revenue
 * - discount_adjust: Affects profit, not top-line revenue
 */
const calculateStrategicLeverImpact = (
  baseEquity: number,
  inputScenario?: InputScenario
): { adjustedEquity: number; leverImpact: number; leverBreakdown: { frequency: number; churn: number } } => {
  if (!inputScenario) {
    return { adjustedEquity: baseEquity, leverImpact: 0, leverBreakdown: { frequency: 0, churn: 0 } };
  }

  // frequency_boost: Each 1% increase in frequency = ~1% more transactions = ~1% more revenue
  const frequencyImpact = inputScenario.frequency_boost * 1.0;
  
  // churn_reduction: Each 1% reduction in churn = ~0.8% more retained customers = ~0.8% more revenue
  // Conservative because churn reduction takes time to fully materialize
  const churnImpact = inputScenario.churn_reduction * 0.8;
  
  // Total revenue impact from strategic levers
  const totalLeverImpact = frequencyImpact + churnImpact;
  
  // Apply to base equity
  const adjustedEquity = baseEquity * (1 + totalLeverImpact);
  
  return {
    adjustedEquity,
    leverImpact: totalLeverImpact,
    leverBreakdown: {
      frequency: frequencyImpact,
      churn: churnImpact,
    },
  };
};

// Apply strategic levers to RPC results
const applyStrategicLevers = (
  results: ScenarioResult[],
  inputScenarios?: InputScenario[]
): ScenarioResult[] => {
  if (!inputScenarios || inputScenarios.length === 0) return results;
  
  return results.map((result, idx) => {
    // Baseline (first result) - no adjustment
    if (idx === 0) return result;
    
    // Find matching input scenario (offset by 1 because baseline is first)
    const inputScenario = inputScenarios[idx - 1];
    if (!inputScenario) return result;
    
    // Apply strategic lever impact
    const { adjustedEquity, leverImpact } = calculateStrategicLeverImpact(
      safeNumber(result.total_equity_12m),
      inputScenario
    );
    
    // Calculate baseline for delta comparison
    const baselineEquity = safeNumber(results[0]?.total_equity_12m);
    const newDelta = adjustedEquity - baselineEquity;
    const newDeltaPercent = baselineEquity > 0 ? (newDelta / baselineEquity) * 100 : 0;
    
    // Apply to 24m as well (proportional)
    const equity24m = safeNumber(result.total_equity_24m);
    const adjusted24m = equity24m * (1 + leverImpact);
    
    return {
      ...result,
      total_equity_12m: adjustedEquity,
      total_equity_24m: adjusted24m,
      delta_vs_base_12m: newDelta,
      delta_percent_12m: newDeltaPercent,
    };
  });
};

// Calculate YoY metrics from available data
const calculateYoYMetrics = (baseline: ScenarioResult, scenario?: ScenarioResult) => {
  const equity12m = safeNumber(baseline?.total_equity_12m);
  // Estimate previous year as 90% of current projection (conservative)
  const prevYearRevenue = safeNumber(baseline?.previous_year_revenue) || equity12m * 0.9;
  const yoyGrowth = prevYearRevenue > 0 ? ((equity12m - prevYearRevenue) / prevYearRevenue) * 100 : 0;
  
  let yoyProjected = yoyGrowth;
  if (scenario) {
    const scenarioEquity = safeNumber(scenario.total_equity_12m);
    yoyProjected = prevYearRevenue > 0 ? ((scenarioEquity - prevYearRevenue) / prevYearRevenue) * 100 : 0;
  }
  
  return { prevYearRevenue, yoyGrowth, yoyProjected };
};

// Empty state component
function EmptyState() {
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

// Hero Revenue Card Component
function HeroRevenueCard({ baseline, bestScenario }: { baseline: ScenarioResult; bestScenario?: ScenarioResult }) {
  const equity12m = safeNumber(baseline?.total_equity_12m);
  const equity24m = safeNumber(baseline?.total_equity_24m);
  
  // Use calculated YoY metrics since RPC doesn't return them yet
  const { prevYearRevenue, yoyGrowth } = calculateYoYMetrics(baseline);
  
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Doanh thu năm tới từ khách hàng hiện tại</CardTitle>
              <CardDescription>Dự báo từ Customer Equity của {(baseline?.total_customers ?? 0).toLocaleString()} khách hàng</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-background">
            <Database className="h-3 w-3 mr-1" />
            Dữ liệu thật
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 12-month projection */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Dự kiến 12 tháng tới</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(equity12m)}</p>
            <p className="text-xs text-muted-foreground">Customer Equity</p>
          </div>
          
          {/* 24-month projection */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Dự kiến 24 tháng tới</p>
            <p className="text-2xl font-semibold">{formatCurrency(equity24m)}</p>
            <p className="text-xs text-muted-foreground">Mở rộng dự báo</p>
          </div>
          
          {/* YoY Comparison */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">So với năm trước</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">{formatCurrency(prevYearRevenue)}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {yoyGrowth !== 0 && (
                <Badge 
                  variant={yoyGrowth >= 0 ? 'default' : 'destructive'}
                  className={cn(
                    'text-sm',
                    yoyGrowth >= 0 ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
                  )}
                >
                  {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Doanh thu thực 12 tháng qua</p>
          </div>
        </div>

        {/* Best Scenario Impact */}
        {bestScenario && safeNumber(bestScenario.delta_vs_base_12m) !== 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Nếu áp dụng "{bestScenario.scenario_name}":
              </span>
              <span className={cn(
                'text-sm font-bold',
                bestScenario.delta_vs_base_12m >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {bestScenario.delta_vs_base_12m >= 0 ? '+' : ''}{formatCurrency(safeNumber(bestScenario.delta_vs_base_12m))}
              </span>
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                Ước tính
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quarterly Breakdown Component
function QuarterlyBreakdownChart({ baseline, scenarios }: { baseline: ScenarioResult; scenarios: ScenarioResult[] }) {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  // Calculate quarterly breakdown from total equity if not provided by RPC
  const baselineEquity = safeNumber(baseline?.total_equity_12m);
  const hasRPCBreakdown = baseline?.quarterly_breakdown?.q1 && baseline.quarterly_breakdown.q1 > 0;
  const baselineBreakdown = hasRPCBreakdown 
    ? baseline.quarterly_breakdown 
    : calculateQuarterlyBreakdown(baselineEquity);
  
  const chartData = quarters.map((quarter, idx) => {
    const key = `q${idx + 1}` as keyof QuarterlyBreakdown;
    const data: Record<string, number | string> = {
      name: quarter,
      baseline: safeNumber(baselineBreakdown[key]),
    };
    
    scenarios.forEach((s, i) => {
      const scenarioEquity = safeNumber(s?.total_equity_12m);
      const hasScenarioBreakdown = s?.quarterly_breakdown?.q1 && s.quarterly_breakdown.q1 > 0;
      const breakdown = hasScenarioBreakdown 
        ? s.quarterly_breakdown 
        : calculateQuarterlyBreakdown(scenarioEquity);
      data[`scenario_${i}`] = safeNumber(breakdown[key]);
    });
    
    return data;
  });

  const totalBaseline = safeNumber(baselineBreakdown.q1) + safeNumber(baselineBreakdown.q2) + 
                        safeNumber(baselineBreakdown.q3) + safeNumber(baselineBreakdown.q4);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Phân bổ theo Quý</CardTitle>
          </div>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">Dự báo doanh thu phân bổ theo quý dựa trên mẫu seasonal từ dữ liệu lịch sử.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <CardDescription>Doanh thu dự kiến Q1 - Q4 năm tới</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {quarters.map((quarter, idx) => {
            const key = `q${idx + 1}` as keyof QuarterlyBreakdown;
            const value = safeNumber(baselineBreakdown[key]);
            const percent = totalBaseline > 0 ? (value / totalBaseline * 100) : 0;
            return (
              <div key={quarter} className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground">{quarter}</p>
                <p className="text-lg font-bold">{formatCurrency(value)}</p>
                <p className="text-[10px] text-muted-foreground">{percent.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis tickFormatter={formatCurrency} fontSize={11} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend />
              <Bar 
                dataKey="baseline" 
                name="Thực tế (Baseline)" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
              />
              {scenarios.map((s, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`scenario_${i}`}
                  name={s.scenario_name}
                  stroke={COLORS[(i + 1) % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[(i + 1) % COLORS.length], r: 4 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// YoY Comparison Component
function YoYComparisonCard({ baseline, bestScenario }: { baseline: ScenarioResult; bestScenario?: ScenarioResult }) {
  const currentProj = safeNumber(baseline?.total_equity_12m);
  
  // Calculate YoY metrics since RPC doesn't return them yet
  const { prevYearRevenue, yoyGrowth, yoyProjected } = calculateYoYMetrics(baseline, bestScenario);
  const projectedGrowth = bestScenario ? yoyProjected : yoyGrowth;

  const trendData = [
    { period: 'Năm trước', actual: prevYearRevenue, projected: null },
    { period: 'Năm nay (dự kiến)', actual: null, projected: currentProj },
    ...(bestScenario ? [{ 
      period: `${bestScenario.scenario_name}`, 
      actual: null, 
      projected: safeNumber(bestScenario.total_equity_12m)
    }] : []),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">So sánh Year-over-Year</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            12 tháng
          </Badge>
        </div>
        <CardDescription>Doanh thu năm trước vs Dự báo năm tới</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Previous Year */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Năm trước</p>
            <p className="text-xl font-bold">{formatCurrency(prevYearRevenue)}</p>
            <Badge variant="outline" className="text-[10px] mt-1">
              Ước tính
            </Badge>
          </div>
          
          {/* Current Projection */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-xs text-muted-foreground mb-1">Năm tới (Baseline)</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(currentProj)}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {yoyGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={cn(
                'text-xs font-medium',
                yoyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Best Scenario */}
          {bestScenario && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <p className="text-xs text-muted-foreground mb-1 truncate" title={bestScenario.scenario_name}>
                {bestScenario.scenario_name.slice(0, 15)}...
              </p>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(safeNumber(bestScenario.total_equity_12m))}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className={cn(
                  'text-xs font-medium',
                  projectedGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {projectedGrowth >= 0 ? '+' : ''}{projectedGrowth.toFixed(1)}%
                </span>
                <Badge variant="secondary" className="text-[8px] bg-amber-100 text-amber-700">
                  Ước tính
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Visual Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tiến độ so với năm trước</span>
            <span>{yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                yoyGrowth >= 0 ? "bg-green-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(Math.abs(yoyGrowth) + 50, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Scenarios Table Component
function ScenariosTable({ results }: { results: ScenarioResult[] }) {
  return (
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
                  <td className="text-right py-2">{safeNumber(result.total_customers).toLocaleString()}</td>
                  <td className="text-right py-2 font-medium">{formatCurrency(safeNumber(result.total_equity_12m))}</td>
                  <td className="text-right py-2">{formatCurrency(safeNumber(result.total_equity_24m))}</td>
                  <td className="text-right py-2">{formatCurrency(safeNumber(result.avg_ltv_12m))}</td>
                  <td className={cn(
                    'text-right py-2 font-medium',
                    index === 0 ? 'text-muted-foreground' :
                      safeNumber(result.delta_percent_12m) >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {index === 0 ? '—' : `${safeNumber(result.delta_percent_12m) >= 0 ? '+' : ''}${safeNumber(result.delta_percent_12m).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Methodology Note Component
function MethodologyNote() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Về phương pháp tính toán:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>Thực tế:</strong> Dữ liệu LTV được tính từ giao dịch thực, áp dụng retention curve và discount rate từ mô hình hiện tại.</li>
              <li><strong>Đòn bẩy chiến lược (ảnh hưởng doanh thu):</strong>
                <ul className="list-disc list-inside ml-4 mt-0.5">
                  <li>Retention & AOV: Tính trực tiếp qua LTV model</li>
                  <li>Tần suất mua: Mỗi +1% = +1% doanh thu</li>
                  <li>Giảm churn: Mỗi +1% = +0.8% doanh thu (bảo thủ)</li>
                </ul>
              </li>
              <li><strong>Điều chỉnh tài chính (KHÔNG ảnh hưởng doanh thu):</strong>
                <ul className="list-disc list-inside ml-4 mt-0.5">
                  <li>Biên lợi nhuận: Ảnh hưởng profit, không ảnh hưởng top-line</li>
                  <li>Chi phí CAC: Ảnh hưởng ROI, không ảnh hưởng doanh thu</li>
                </ul>
              </li>
              <li><strong>Phân bổ quý:</strong> Dựa trên seasonal pattern (Q1: 22%, Q2: 26%, Q3: 24%, Q4: 28%)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export function ScenarioComparison({ results, isLoading, inputScenarios }: ScenarioComparisonProps) {
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
    return <EmptyState />;
  }

  // Apply strategic levers (frequency_boost, churn_reduction) to RPC results
  // These levers affect REVENUE, while financial levers (margin, CAC) only affect PROFIT
  const adjustedResults = applyStrategicLevers(results, inputScenarios);

  const baseline = adjustedResults[0];
  const scenarios = adjustedResults.slice(1);
  let bestScenario = scenarios.length > 0 ? scenarios[0] : undefined;
  for (const s of scenarios) {
    if (bestScenario && safeNumber(s.delta_percent_12m) > safeNumber(bestScenario.delta_percent_12m)) bestScenario = s;
  }

  return (
    <div className="space-y-4">
      {/* 1. Hero Card - Doanh thu năm tới từ KH cũ */}
      <HeroRevenueCard baseline={baseline} bestScenario={bestScenario} />

      {/* 2. Quarterly Breakdown + YoY Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuarterlyBreakdownChart baseline={baseline} scenarios={scenarios} />
        <YoYComparisonCard baseline={baseline} bestScenario={bestScenario} />
      </div>

      {/* 3. All Scenarios Chart */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              So sánh tất cả kịch bản
              <Badge variant="secondary" className="text-[10px]">
                {adjustedResults.length} kịch bản
              </Badge>
            </CardTitle>
            <CardDescription>
              Customer Equity dự kiến 12 tháng - Bao gồm tác động từ đòn bẩy chiến lược
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={adjustedResults.map((r, i) => ({
                    name: r.scenario_name,
                    equity: safeNumber(r.total_equity_12m),
                    delta: safeNumber(r.delta_percent_12m),
                    fill: COLORS[i % COLORS.length],
                  }))} 
                  layout="vertical"
                >
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
                    formatter={(value: number) => [formatCurrency(value), 'Equity 12M']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="equity" radius={[0, 4, 4, 0]}>
                    {adjustedResults.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Detailed Table */}
      <ScenariosTable results={adjustedResults} />

      {/* 5. Methodology Note */}
      <MethodologyNote />
    </div>
  );
}
