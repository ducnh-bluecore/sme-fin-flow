import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  RefreshCw,
  Percent,
  Users,
  Banknote,
  ShieldAlert,
  Leaf,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { useBudgetOptimizerData } from '@/hooks/useMDPExtendedData';
import { useMDPData } from '@/hooks/useMDPData';
import { BudgetOptimizationPanel } from '@/components/whatif/BudgetOptimizationPanel';

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#ef4444', '#14b8a6'];

const getActionConfig = (action: 'increase' | 'decrease' | 'maintain') => {
  const configs = {
    increase: { label: 'Tăng Budget', color: 'bg-success/20 text-success border-success/30', icon: TrendingUp },
    decrease: { label: 'Giảm Budget', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: TrendingDown },
    maintain: { label: 'Giữ nguyên', color: 'bg-primary/20 text-primary border-primary/30', icon: Target },
  };
  return configs[action];
};

export default function BudgetOptimizerPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch real data
  const { channelBudgets, isLoading: isBudgetLoading, error: budgetError } = useBudgetOptimizerData();
  const { profitAttribution, cashImpact, riskAlerts, isLoading: isMDPLoading } = useMDPData();
  
  const isLoading = isBudgetLoading || isMDPLoading;

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!channelBudgets || channelBudgets.length === 0) {
      return {
        totalAllocatedBudget: 0,
        totalActualSpend: 0,
        totalSuggestedBudget: 0,
        totalCurrentRevenue: 0,
        totalProjectedRevenue: 0,
        avgConfidence: 0,
        avgROAS: 0,
        avgProjectedROAS: 0,
        budgetChange: 0,
        revenueLift: 0,
        overallSpendRate: 0,
      };
    }

    const totalAllocatedBudget = channelBudgets.reduce((acc, c) => acc + (c.allocatedBudget || 0), 0);
    const totalActualSpend = channelBudgets.reduce((acc, c) => acc + c.actualSpend, 0);
    const totalSuggestedBudget = channelBudgets.reduce((acc, c) => acc + c.suggestedBudget, 0);
    const totalCurrentRevenue = channelBudgets.reduce((acc, c) => acc + c.currentRevenue, 0);
    const totalProjectedRevenue = channelBudgets.reduce((acc, c) => acc + c.projectedRevenue, 0);
    const avgConfidence = channelBudgets.reduce((acc, c) => acc + c.confidence, 0) / channelBudgets.length;
    const avgROAS = totalActualSpend > 0 ? totalCurrentRevenue / totalActualSpend : 0;
    const avgProjectedROAS = totalSuggestedBudget > 0 ? totalProjectedRevenue / totalSuggestedBudget : 0;
    const overallSpendRate = totalAllocatedBudget > 0 ? (totalActualSpend / totalAllocatedBudget) * 100 : 0;

    // Budget change: đề xuất so với budget được cấp (hoặc actual spend nếu chưa cấu hình)
    const baseBudget = totalAllocatedBudget > 0 ? totalAllocatedBudget : totalActualSpend;

    return {
      totalAllocatedBudget,
      totalActualSpend,
      totalSuggestedBudget,
      totalCurrentRevenue,
      totalProjectedRevenue,
      avgConfidence,
      avgROAS,
      avgProjectedROAS,
      budgetChange: totalSuggestedBudget - baseBudget,
      revenueLift: totalProjectedRevenue - totalCurrentRevenue,
      overallSpendRate,
    };
  }, [channelBudgets]);

  // Calculate profit metrics from MDP data
  const profitMetrics = useMemo(() => {
    if (!profitAttribution || profitAttribution.length === 0) {
      return {
        totalProfit: 0,
        avgMargin: 0,
        profitableChannels: 0,
        lossChannels: 0,
      };
    }

    const totalProfit = profitAttribution.reduce((acc, p) => acc + p.contribution_margin, 0);
    const avgMargin = profitAttribution.reduce((acc, p) => acc + p.contribution_margin_percent, 0) / profitAttribution.length;
    const profitableChannels = profitAttribution.filter(p => p.status === 'profitable').length;
    const lossChannels = profitAttribution.filter(p => p.status === 'loss' || p.status === 'critical').length;

    return { totalProfit, avgMargin, profitableChannels, lossChannels };
  }, [profitAttribution]);

  // Calculate cash metrics
  const cashMetrics = useMemo(() => {
    if (!cashImpact || cashImpact.length === 0) {
      return {
        totalCashReceived: 0,
        totalPending: 0,
        avgCashScore: 0,
      };
    }

    const totalCashReceived = cashImpact.reduce((acc, c) => acc + c.cash_received, 0);
    const totalPending = cashImpact.reduce((acc, c) => acc + c.pending_cash, 0);
    const avgCashScore = cashImpact.reduce((acc, c) => acc + c.cash_impact_score, 0) / cashImpact.length;

    return { totalCashReceived, totalPending, avgCashScore };
  }, [cashImpact]);

  // Prepare chart data
  const budgetComparisonData = useMemo(() => {
    return channelBudgets.map(c => ({
      name: c.channel.length > 10 ? c.channel.substring(0, 10) + '...' : c.channel,
      fullName: c.channel,
      'Hiện tại': c.currentBudget,
      'Đề xuất': c.suggestedBudget,
    }));
  }, [channelBudgets]);

  const roasComparisonData = useMemo(() => {
    return channelBudgets.map(c => ({
      name: c.channel.length > 10 ? c.channel.substring(0, 10) + '...' : c.channel,
      fullName: c.channel,
      'ROAS Hiện tại': c.currentROAS,
      'ROAS Dự kiến': c.projectedROAS,
    }));
  }, [channelBudgets]);

  const pieData = useMemo(() => {
    return channelBudgets.map((c, idx) => ({
      name: c.channel,
      value: c.suggestedBudget,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [channelBudgets]);

  // Prepare channel data for AI Panel
  const channelDataForAI = useMemo(() => {
    // Merge budget data with profit attribution
    return channelBudgets.map(budget => {
      const profitData = profitAttribution?.find(p => 
        p.campaign_name.toLowerCase().includes(budget.channel.toLowerCase()) ||
        budget.channel.toLowerCase().includes(p.channel.toLowerCase())
      );
      
      const cashData = cashImpact?.find(c => 
        c.channel.toLowerCase().includes(budget.channel.toLowerCase()) ||
        budget.channel.toLowerCase().includes(c.channel.toLowerCase())
      );

      return {
        name: budget.channel,
        key: budget.channel.toLowerCase().replace(/\s+/g, '_'),
        revenue: budget.currentRevenue,
        channelCost: budget.actualSpend,
        grossProfit: profitData?.contribution_margin || (budget.currentRevenue * 0.3),
        margin: profitData?.contribution_margin_percent || 30,
        share: summaryMetrics.totalActualSpend > 0
          ? (budget.actualSpend / summaryMetrics.totalActualSpend) * 100 
          : 0,
        growth: 10, // Default growth
        commission: 5, // Default commission
      };
    });
  }, [channelBudgets, profitAttribution, cashImpact, summaryMetrics.totalActualSpend]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (budgetError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Không thể tải dữ liệu Budget Optimizer: {budgetError.message}
        </AlertDescription>
      </Alert>
    );
  }

  const hasData = channelBudgets && channelBudgets.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            Budget Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">
            Tối ưu phân bổ ngân sách dựa trên <span className="text-primary font-medium">Profit</span>, 
            <span className="text-success font-medium"> Cash Flow</span>, và 
            <span className="text-warning font-medium"> Risk</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <BarChart3 className="h-3 w-3" />
            {channelBudgets.length} kênh
          </Badge>
        </div>
      </div>

      {!hasData ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Chưa có dữ liệu marketing expense. Vui lòng import dữ liệu chi phí marketing để sử dụng tính năng này.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary Cards - Focus on Profit, Cash, Risk per MDP Manifesto */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Budget */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">Budget / Đã tiêu</p>
                    <p className="text-xl font-bold">
                      {summaryMetrics.totalAllocatedBudget > 0 
                        ? `${formatVNDCompact(summaryMetrics.totalAllocatedBudget)} / ${formatVNDCompact(summaryMetrics.totalActualSpend)}`
                        : formatVNDCompact(summaryMetrics.totalActualSpend)
                      }
                    </p>
                    {summaryMetrics.totalAllocatedBudget > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ({summaryMetrics.overallSpendRate.toFixed(0)}% đã tiêu)
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs">
                      {summaryMetrics.budgetChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-warning" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-success" />
                      )}
                      <span className={summaryMetrics.budgetChange >= 0 ? 'text-warning' : 'text-success'}>
                        {summaryMetrics.budgetChange >= 0 ? '+' : ''}{formatVNDCompact(summaryMetrics.budgetChange)} đề xuất
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contribution Margin - KEY METRIC per MDP */}
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/20">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">Contribution Margin</p>
                    <p className="text-xl font-bold text-success">{formatVNDCompact(profitMetrics.totalProfit)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Percent className="h-3 w-3" />
                      <span>CM%: {profitMetrics.avgMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash Position - REAL CASH per MDP */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Banknote className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">Cash đã về</p>
                    <p className="text-xl font-bold">{formatVNDCompact(cashMetrics.totalCashReceived)}</p>
                    <div className="flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{formatVNDCompact(cashMetrics.totalPending)} đang chờ</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Indicator */}
            <Card className={cn(
              "border-border",
              profitMetrics.lossChannels > 0 && "border-destructive/30 bg-destructive/5"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    profitMetrics.lossChannels > 0 ? "bg-destructive/20" : "bg-success/20"
                  )}>
                    <ShieldAlert className={cn(
                      "h-5 w-5",
                      profitMetrics.lossChannels > 0 ? "text-destructive" : "text-success"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">Channel Risk</p>
                    <p className={cn(
                      "text-xl font-bold",
                      profitMetrics.lossChannels > 0 ? "text-destructive" : "text-success"
                    )}>
                      {profitMetrics.lossChannels > 0 
                        ? `${profitMetrics.lossChannels} kênh lỗ` 
                        : 'Healthy'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span>{profitMetrics.profitableChannels} kênh có lãi</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Alerts from MDP */}
          {riskAlerts && riskAlerts.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Cảnh báo Rủi ro Marketing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                  {riskAlerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0",
                        alert.severity === 'critical' && "bg-destructive/20 text-destructive",
                        alert.severity === 'warning' && "bg-warning/20 text-warning"
                      )}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-muted-foreground">{alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" className="gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Tổng quan
              </TabsTrigger>
              <TabsTrigger value="ai-optimizer" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI Optimizer
              </TabsTrigger>
              <TabsTrigger value="channels" className="gap-1">
                <Scale className="h-3.5 w-3.5" />
                Chi tiết kênh
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1">
                <PieChart className="h-3.5 w-3.5" />
                Phân bổ
              </TabsTrigger>
            </TabsList>

            {/* Tab: Overview */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Budget Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">So sánh Ngân sách: Hiện tại vs Đề xuất</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetComparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            type="number" 
                            className="text-xs fill-muted-foreground"
                            tickFormatter={(v) => formatVNDCompact(v)}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            className="text-xs fill-muted-foreground"
                            width={100}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium mb-2">{payload[0]?.payload?.fullName}</p>
                                  {payload.map((p, i) => (
                                    <p key={i} className="text-sm">
                                      <span style={{ color: p.color }}>{p.name}: </span>
                                      {formatVND(p.value as number)}
                                    </p>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="Hiện tại" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Đề xuất" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* ROAS Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ROAS: Hiện tại vs Dự kiến</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={roasComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="name" 
                            className="text-xs fill-muted-foreground"
                          />
                          <YAxis 
                            className="text-xs fill-muted-foreground"
                            tickFormatter={(v) => `${v.toFixed(1)}x`}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium mb-2">{payload[0]?.payload?.fullName}</p>
                                  {payload.map((p, i) => (
                                    <p key={i} className="text-sm">
                                      <span style={{ color: p.color }}>{p.name}: </span>
                                      {(p.value as number).toFixed(2)}x
                                    </p>
                                  ))}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="ROAS Hiện tại" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                          <Line 
                            type="monotone" 
                            dataKey="ROAS Dự kiến" 
                            stroke="hsl(var(--success))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--success))' }}
                          />
                          <Legend />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: AI Optimizer */}
            <TabsContent value="ai-optimizer" className="mt-6">
              <BudgetOptimizationPanel 
                channels={channelDataForAI}
                totalBudget={summaryMetrics.totalAllocatedBudget > 0 ? summaryMetrics.totalAllocatedBudget : summaryMetrics.totalActualSpend}
              />
            </TabsContent>

            {/* Tab: Channel Details */}
            <TabsContent value="channels" className="mt-6 space-y-4">
              {channelBudgets.map((channel, idx) => {
                const actionConfig = getActionConfig(channel.action);
                const ActionIcon = actionConfig.icon;
                const budgetDiff = channel.suggestedBudget - (channel.allocatedBudget || channel.actualSpend);
                const revenueDiff = channel.projectedRevenue - channel.currentRevenue;

                // Find matching profit data
                const profitData = profitAttribution?.find(p => 
                  p.campaign_name.toLowerCase().includes(channel.channel.toLowerCase()) ||
                  channel.channel.toLowerCase().includes(p.channel.toLowerCase())
                );

                return (
                  <Card key={idx} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Channel Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-foreground">{channel.channel}</h3>
                            <Badge variant="outline" className={actionConfig.color}>
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {actionConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                              Confidence: {channel.confidence}%
                            </Badge>
                            {profitData && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  profitData.status === 'profitable' && "bg-success/20 text-success",
                                  profitData.status === 'marginal' && "bg-warning/20 text-warning",
                                  (profitData.status === 'loss' || profitData.status === 'critical') && "bg-destructive/20 text-destructive"
                                )}
                              >
                                CM: {profitData.contribution_margin_percent.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          
                          {/* Budget Change Visualization - Now shows: Budget | Đã tiêu (%) | Đề xuất */}
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            {/* Budget được cấp */}
                            <div className="min-w-[80px]">
                              <p className="text-muted-foreground text-xs">Budget</p>
                              <p className="font-semibold">
                                {channel.allocatedBudget > 0 
                                  ? formatVNDCompact(channel.allocatedBudget)
                                  : <span className="text-muted-foreground text-xs">Chưa cấu hình</span>
                                }
                              </p>
                            </div>
                            
                            {/* Ads đã tiêu với % */}
                            <div className="min-w-[100px]">
                              <p className="text-muted-foreground text-xs">Đã tiêu</p>
                              <div className="flex items-center gap-1">
                                <p className="font-semibold">{formatVNDCompact(channel.actualSpend)}</p>
                                {channel.allocatedBudget > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs px-1.5 py-0",
                                      channel.spendRate > 100 ? "bg-destructive/20 text-destructive" :
                                      channel.spendRate > 80 ? "bg-warning/20 text-warning" :
                                      "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {channel.spendRate.toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <ArrowRight className={cn(
                              "h-5 w-5 shrink-0",
                              channel.action === 'increase' ? "text-success" :
                              channel.action === 'decrease' ? "text-destructive" : "text-muted-foreground"
                            )} />
                            
                            {/* Đề xuất Budget mới */}
                            <div className="min-w-[80px]">
                              <p className="text-muted-foreground text-xs">Đề xuất</p>
                              <p className={cn(
                                "font-semibold",
                                channel.action === 'increase' ? "text-success" :
                                channel.action === 'decrease' ? "text-destructive" : ""
                              )}>
                                {formatVNDCompact(channel.suggestedBudget)}
                              </p>
                            </div>
                            
                            {/* Chênh lệch */}
                            <Badge className={cn(
                              budgetDiff > 0 ? "bg-success/20 text-success" :
                              budgetDiff < 0 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                            )}>
                              {budgetDiff > 0 ? '+' : ''}{formatVNDCompact(budgetDiff)}
                            </Badge>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">ROAS</p>
                            <p className="font-semibold">{channel.currentROAS.toFixed(2)}x</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">ROAS dự kiến</p>
                            <p className={cn(
                              "font-semibold",
                              channel.projectedROAS > channel.currentROAS ? "text-success" : "text-destructive"
                            )}>
                              {channel.projectedROAS.toFixed(2)}x
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">CPA</p>
                            <p className="font-semibold">{formatVNDCompact(channel.cpa)}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">Orders</p>
                            <p className="font-semibold">{channel.orders.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar showing budget utilization (if budget configured) or ROAS efficiency */}
                      <div className="mt-4">
                        {channel.allocatedBudget > 0 ? (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Budget Utilization</span>
                              <span className={cn(
                                channel.spendRate > 100 ? "text-destructive" :
                                channel.spendRate > 80 ? "text-warning" : "text-muted-foreground"
                              )}>
                                {channel.spendRate.toFixed(0)}%
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(channel.spendRate, 100)} 
                              className={cn(
                                "h-2",
                                channel.spendRate > 100 && "[&>div]:bg-destructive"
                              )}
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>ROAS vs Target (3x)</span>
                              <span className={cn(
                                channel.currentROAS >= 3 ? "text-success" :
                                channel.currentROAS >= 2 ? "text-warning" : "text-destructive"
                              )}>
                                {((channel.currentROAS / 3) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Progress 
                              value={Math.min((channel.currentROAS / 3) * 100, 100)} 
                              className="h-2"
                            />
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Tab: Distribution */}
            <TabsContent value="distribution" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phân bổ Ngân sách Đề xuất</CardTitle>
                  <CardDescription>Tỷ trọng ngân sách theo từng kênh</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={140}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatVND(data.value)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {((data.value / summaryMetrics.totalSuggestedBudget) * 100).toFixed(1)}%
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
