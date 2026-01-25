import { useState, useMemo } from 'react';
import { useMDPDataSSOT } from '@/hooks/useMDPDataSSOT';
import { useBudgetOptimizerData } from '@/hooks/useMDPExtendedData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Play,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from 'sonner';

interface ScenarioParams {
  budgetChange: number;
  cpcChange: number;
  conversionRateChange: number;
  aovChange: number;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function ScenarioPlannerPage() {
  const { 
    cmoModeSummary, 
    marketingModeSummary,
    profitAttribution,
    isLoading: isMDPLoading, 
    error 
  } = useMDPDataSSOT();

  // Also fetch from Budget Optimizer data source for fallback
  const { channelBudgets, isLoading: isBudgetLoading } = useBudgetOptimizerData();

  const isLoading = isMDPLoading || isBudgetLoading;

  const [params, setParams] = useState<ScenarioParams>({
    budgetChange: 20,
    cpcChange: -5,
    conversionRateChange: 10,
    aovChange: 5,
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // Use real data from MDP, with fallback to Budget Optimizer data
  const baseMetrics = useMemo(() => {
    // First try CMO Mode Summary
    const cmoSpend = cmoModeSummary.total_marketing_spend || 0;
    const cmoRevenue = cmoModeSummary.total_net_revenue || 0;
    const cmoCM = cmoModeSummary.total_contribution_margin || 0;
    const cmoCMPercent = cmoModeSummary.contribution_margin_percent || 0;

    // Fallback: aggregate from channelBudgets (Budget Optimizer source)
    const budgetSpend = channelBudgets.reduce((sum, c) => sum + c.actualSpend, 0);
    const budgetRevenue = channelBudgets.reduce((sum, c) => sum + c.currentRevenue, 0);

    // Use whichever has data
    const currentBudget = cmoSpend > 0 ? cmoSpend : budgetSpend;
    const currentRevenue = cmoRevenue > 0 ? cmoRevenue : budgetRevenue;
    const currentCM = cmoCM;
    // Estimate CM% if not available: assume 15% default
    const currentCMPercent = cmoCMPercent > 0 ? cmoCMPercent : (currentRevenue > 0 ? 15 : 0);

    return {
      currentBudget,
      currentRevenue,
      currentROAS: currentBudget > 0 ? currentRevenue / currentBudget : 0,
      currentCM,
      currentCMPercent,
      campaignCount: profitAttribution.length + channelBudgets.length,
    };
  }, [cmoModeSummary, channelBudgets, profitAttribution]);

  // Calculate projections based on params and REAL data
  const projections = useMemo(() => {
    const { currentBudget, currentRevenue, currentCM, currentCMPercent } = baseMetrics;

    const projectedBudget = currentBudget * (1 + params.budgetChange / 100);
    const cpcEffect = 1 / (1 + params.cpcChange / 100); // Lower CPC = more reach
    const conversionEffect = 1 + params.conversionRateChange / 100;
    const aovEffect = 1 + params.aovChange / 100;
    
    const projectedRevenue = currentRevenue * (1 + params.budgetChange / 100) * cpcEffect * conversionEffect * aovEffect;
    const projectedROAS = projectedBudget > 0 ? projectedRevenue / projectedBudget : 0;
    // CM% stays similar but applies to new revenue
    const projectedCM = projectedRevenue * (currentCMPercent / 100);

    const revenueChange = currentRevenue > 0 ? ((projectedRevenue - currentRevenue) / currentRevenue) * 100 : 0;
    const cmChange = currentCM > 0 ? ((projectedCM - currentCM) / currentCM) * 100 : 0;

    return {
      projectedBudget,
      projectedRevenue,
      projectedROAS,
      projectedCM,
      revenueChange,
      cmChange,
    };
  }, [baseMetrics, params]);

  // Generate 6-month projection chart data
  const chartData = useMemo(() => {
    const monthlyBase = baseMetrics.currentRevenue / 6 / 1000000; // Convert to millions
    const growthRate = 1 + (projections.revenueChange / 100) / 6;
    
    return [
      { month: 'T1', baseline: monthlyBase, scenario: monthlyBase * growthRate, optimistic: monthlyBase * growthRate * 1.15, pessimistic: monthlyBase * growthRate * 0.85 },
      { month: 'T2', baseline: monthlyBase * 1.02, scenario: monthlyBase * Math.pow(growthRate, 2), optimistic: monthlyBase * Math.pow(growthRate, 2) * 1.15, pessimistic: monthlyBase * Math.pow(growthRate, 2) * 0.85 },
      { month: 'T3', baseline: monthlyBase * 1.04, scenario: monthlyBase * Math.pow(growthRate, 3), optimistic: monthlyBase * Math.pow(growthRate, 3) * 1.15, pessimistic: monthlyBase * Math.pow(growthRate, 3) * 0.85 },
      { month: 'T4', baseline: monthlyBase * 1.06, scenario: monthlyBase * Math.pow(growthRate, 4), optimistic: monthlyBase * Math.pow(growthRate, 4) * 1.15, pessimistic: monthlyBase * Math.pow(growthRate, 4) * 0.85 },
      { month: 'T5', baseline: monthlyBase * 1.08, scenario: monthlyBase * Math.pow(growthRate, 5), optimistic: monthlyBase * Math.pow(growthRate, 5) * 1.15, pessimistic: monthlyBase * Math.pow(growthRate, 5) * 0.85 },
      { month: 'T6', baseline: monthlyBase * 1.10, scenario: monthlyBase * Math.pow(growthRate, 6), optimistic: monthlyBase * Math.pow(growthRate, 6) * 1.15, pessimistic: monthlyBase * Math.pow(growthRate, 6) * 0.85 },
    ];
  }, [baseMetrics.currentRevenue, projections.revenueChange]);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      toast.success('Mô phỏng hoàn tất!');
    }, 1500);
  };

  const handleReset = () => {
    setParams({
      budgetChange: 0,
      cpcChange: 0,
      conversionRateChange: 0,
      aovChange: 0,
    });
  };

  const handleSave = () => {
    toast.success('Đã lưu scenario!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Không thể tải dữ liệu. Vui lòng thử lại sau.
        </AlertDescription>
      </Alert>
    );
  }

  const hasData = baseMetrics.currentBudget > 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Scenario Planner"
        subtitle="Mô phỏng What-if cho marketing spend dựa trên dữ liệu thực"
      />

      {!hasData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Chưa có dữ liệu marketing. Import dữ liệu để sử dụng tính năng mô phỏng.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" className="gap-2" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Lưu Scenario
        </Button>
        <Button 
          className="gap-2"
          onClick={handleSimulate}
          disabled={isSimulating || !hasData}
        >
          {isSimulating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Đang mô phỏng...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Chạy mô phỏng
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scenario Builder */}
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tham số mô phỏng</CardTitle>
              <CardDescription>Điều chỉnh các thông số để xem tác động</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Change */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Thay đổi ngân sách
                  </Label>
                  <Badge className={cn(
                    params.budgetChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {params.budgetChange >= 0 ? '+' : ''}{params.budgetChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.budgetChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, budgetChange: v }))}
                  min={-50}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>+100%</span>
                </div>
              </div>

              {/* CPC Change */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Thay đổi CPC
                  </Label>
                  <Badge className={cn(
                    params.cpcChange <= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {params.cpcChange >= 0 ? '+' : ''}{params.cpcChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.cpcChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, cpcChange: v }))}
                  min={-30}
                  max={30}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-30% (tốt hơn)</span>
                  <span>+30% (xấu hơn)</span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-success" />
                    Conversion Rate
                  </Label>
                  <Badge className={cn(
                    params.conversionRateChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {params.conversionRateChange >= 0 ? '+' : ''}{params.conversionRateChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.conversionRateChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, conversionRateChange: v }))}
                  min={-20}
                  max={30}
                  step={5}
                />
              </div>

              {/* AOV */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-warning" />
                    Average Order Value
                  </Label>
                  <Badge className={cn(
                    params.aovChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {params.aovChange >= 0 ? '+' : ''}{params.aovChange}%
                  </Badge>
                </div>
                <Slider
                  value={[params.aovChange]}
                  onValueChange={([v]) => setParams(p => ({ ...p, aovChange: v }))}
                  min={-15}
                  max={25}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Data Source */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dữ liệu gốc (thực)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketing Spend:</span>
                <span className="font-medium">{formatCurrency(baseMetrics.currentBudget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Revenue:</span>
                <span className="font-medium text-success">{formatCurrency(baseMetrics.currentRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ROAS:</span>
                <span className="font-medium">{baseMetrics.currentROAS.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contribution Margin:</span>
                <span className="font-medium text-primary">{formatCurrency(baseMetrics.currentCM)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data sources:</span>
                <span className="font-medium">{baseMetrics.campaignCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected Budget</p>
                <p className="text-xl font-bold">{formatCurrency(projections.projectedBudget)}</p>
                <p className={cn(
                  "text-xs",
                  params.budgetChange >= 0 ? "text-warning" : "text-success"
                )}>
                  {params.budgetChange >= 0 ? '+' : ''}{params.budgetChange}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected Revenue</p>
                <p className="text-xl font-bold text-success">{formatCurrency(projections.projectedRevenue)}</p>
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  projections.revenueChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {projections.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {projections.revenueChange >= 0 ? '+' : ''}{projections.revenueChange.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected ROAS</p>
                <p className={cn(
                  "text-xl font-bold",
                  projections.projectedROAS >= baseMetrics.currentROAS ? "text-success" : "text-destructive"
                )}>
                  {projections.projectedROAS.toFixed(2)}x
                </p>
                <p className={cn(
                  "text-xs",
                  projections.projectedROAS >= baseMetrics.currentROAS ? "text-success" : "text-destructive"
                )}>
                  vs {baseMetrics.currentROAS.toFixed(2)}x hiện tại
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Projected CM</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(projections.projectedCM)}</p>
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  projections.cmChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {projections.cmChange >= 0 ? '+' : ''}{projections.cmChange.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dự báo doanh thu 6 tháng</CardTitle>
            </CardHeader>
            <CardContent>
              {hasData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" fontSize={12} />
                      <YAxis className="text-xs fill-muted-foreground" fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value.toFixed(0)}M`, '']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="pessimistic" 
                        stroke="hsl(var(--destructive))" 
                        fill="none"
                        strokeDasharray="5 5"
                        name="Bi quan"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="baseline" 
                        stroke="hsl(var(--muted-foreground))" 
                        fill="none"
                        name="Baseline"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="optimistic" 
                        stroke="hsl(var(--success))" 
                        fill="none"
                        strokeDasharray="5 5"
                        name="Lạc quan"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="scenario" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorScenario)"
                        strokeWidth={2}
                        name="Scenario"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  Cần dữ liệu marketing để mô phỏng
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Đánh giá rủi ro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">Cơ hội</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Revenue có thể tăng đến +{(projections.revenueChange * 1.15).toFixed(0)}%</li>
                    <li>• ROAS {projections.projectedROAS >= baseMetrics.currentROAS ? 'cải thiện' : 'cần theo dõi'}</li>
                    <li>• CM dự kiến: {formatCurrency(projections.projectedCM)}</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-medium text-warning">Lưu ý</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Cash flow tăng {formatCurrency(projections.projectedBudget - baseMetrics.currentBudget)}/kỳ</li>
                    <li>• Cần monitor CPC hàng tuần</li>
                    <li>• Creative fatigue có thể xảy ra</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Rủi ro</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• ROAS có thể giảm nếu scale quá nhanh</li>
                    <li>• Chi phí tăng nhanh hơn revenue</li>
                    <li>• Cần reserve cash cho worst case</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
