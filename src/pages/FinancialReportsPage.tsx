/**
 * FinancialReportsPage - REFACTORED to use precomputed data
 * 
 * ⚠️ NOW USES CANONICAL HOOKS ONLY - NO RAW TABLE QUERIES
 * 
 * Uses:
 * - useFinanceTruthSnapshot for core metrics
 * - useFinanceMonthlySummary for trend data
 */

import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { 
  BarChart3,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useDateRange } from '@/contexts/DateRangeContext';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ContextualAIPanel } from '@/components/dashboard/ContextualAIPanel';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

// CANONICAL HOOKS ONLY - NO deprecated hooks
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useFinanceMonthlySummary } from '@/hooks/useFinanceMonthlySummary';

// =============================================================
// LOADING SKELETON
// =============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

// =============================================================
// COMPONENT
// =============================================================

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  const { dateRange } = useDateRange();
  
  // CANONICAL HOOKS ONLY
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: monthlySummary, isLoading: monthlyLoading } = useFinanceMonthlySummary({ months: 12 });

  const isLoading = snapshotLoading || monthlyLoading;

  // Format helpers
  const formatBillion = (value: number) => {
    const billion = value / 1000000000;
    if (billion >= 1) return `${billion.toFixed(1)} tỷ`;
    const million = value / 1000000;
    if (million >= 1) return `${million.toFixed(0)} triệu`;
    return formatCurrency(value);
  };

  // Prepare monthly chart data from precomputed summary
  const monthlyChartData = useMemo(() => {
    if (!monthlySummary || monthlySummary.length === 0) return [];
    return monthlySummary.map(m => ({
      month: m.yearMonth,
      revenue: m.netRevenue,
      profit: m.grossProfit,
      grossProfit: m.grossProfit,
      cogs: m.cogs,
      opex: m.operatingExpenses,
    }));
  }, [monthlySummary]);

  // Compute display values - minimal calculations for UI only
  // Note: Core financial metrics come from snapshot (SSOT), these are derived display values
  const totalCost = snapshot 
    ? (monthlySummary?.[0]?.cogs || 0) + (monthlySummary?.[0]?.operatingExpenses || 0) 
    : 0;
  const netMarginPercent = snapshot && snapshot.netRevenue > 0 
    ? ((snapshot.grossProfit - (monthlySummary?.[0]?.operatingExpenses || 0)) / snapshot.netRevenue) * 100 
    : 0;
  const overdueARPercent = snapshot && snapshot.totalAR > 0 
    ? (snapshot.overdueAR / snapshot.totalAR) * 100 
    : 0;

  // Financial ratios from snapshot
  const financialRatios = useMemo(() => {
    if (!snapshot) return [];
    return [
      {
        name: 'Biên lợi nhuận gộp',
        value: snapshot.grossMarginPercent,
        target: 30,
        unit: '%',
      },
      {
        name: 'Biên lợi nhuận ròng',
        value: netMarginPercent,
        target: 10,
        unit: '%',
      },
      {
        name: 'EBITDA Margin',
        value: snapshot.ebitdaMarginPercent,
        target: 15,
        unit: '%',
      },
      {
        name: 'DSO',
        value: snapshot.dso,
        target: 30,
        unit: ' ngày',
      },
      {
        name: 'Contribution Margin',
        value: snapshot.contributionMarginPercent,
        target: 40,
        unit: '%',
      },
    ];
  }, [snapshot, netMarginPercent]);

  // Key insights based on snapshot data
  const keyInsights = useMemo(() => {
    if (!snapshot) return [];
    const insights = [];
    
    if (snapshot.grossMarginPercent >= 30) {
      insights.push({
        type: 'success',
        title: 'Biên lợi nhuận gộp tốt',
        description: `Đạt ${snapshot.grossMarginPercent.toFixed(1)}%, cao hơn mức tiêu chuẩn 30%`,
      });
    } else if (snapshot.grossMarginPercent < 20) {
      insights.push({
        type: 'danger',
        title: 'Biên lợi nhuận gộp thấp',
        description: `Chỉ đạt ${snapshot.grossMarginPercent.toFixed(1)}%, cần xem xét COGS`,
      });
    }
    
    if (snapshot.dso > 45) {
      insights.push({
        type: 'warning',
        title: 'DSO cao',
        description: `DSO ${snapshot.dso.toFixed(0)} ngày, tiền bị kẹt trong công nợ`,
      });
    }
    
    if (netMarginPercent < 0) {
      insights.push({
        type: 'danger',
        title: 'Lỗ ròng',
        description: `Biên lợi nhuận ròng ${netMarginPercent.toFixed(1)}%`,
      });
    }
    
    if (overdueARPercent > 20) {
      insights.push({
        type: 'warning',
        title: 'Công nợ quá hạn cao',
        description: `${overdueARPercent.toFixed(1)}% AR đang quá hạn`,
      });
    }
    
    if (snapshot.cashToday > snapshot.netRevenue * 0.5) {
      insights.push({
        type: 'success',
        title: 'Tình hình tiền mặt khỏe',
        description: `Cash buffer dồi dào: ${formatBillion(snapshot.cashToday)}`,
      });
    }
    
    return insights;
  }, [snapshot, netMarginPercent, overdueARPercent]);

  return (
    <>
      <Helmet>
        <title>Báo cáo tài chính | Bluecore Finance</title>
        <meta name="description" content="Báo cáo tổng hợp, phân tích tài chính và lợi nhuận" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Báo cáo tài chính
              </h1>
              <p className="text-muted-foreground">Financial Reports & Analytics</p>
            </div>
          </div>
          <QuickDateSelector />
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Tổng hợp
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Phân tích
            </TabsTrigger>
            <TabsTrigger value="profitability" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Lợi nhuận
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            {isLoading ? <LoadingSkeleton /> : (
              <>
                {/* Hero KPIs from snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-primary mt-2">
                      {formatBillion(snapshot?.netRevenue || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Kỳ đã chọn</p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                    <p className={cn("text-3xl font-bold mt-2", (snapshot?.grossProfit || 0) >= 0 ? "text-success" : "text-destructive")}>
                      {formatBillion(snapshot?.grossProfit || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Biên lợi nhuận: {(snapshot?.grossMarginPercent || 0).toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                    <p className="text-3xl font-bold text-warning mt-2">
                      {formatBillion(totalCost)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      COGS + OPEX
                    </p>
                  </Card>
                </div>

                {/* AI Panel */}
                <ContextualAIPanel context="analytics" />

                {/* Monthly Chart */}
                {monthlyChartData.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-lg mb-4">Doanh thu & Lợi nhuận theo tháng</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" name="Doanh thu" />
                          <Area type="monotone" dataKey="profit" fill="hsl(var(--success)/0.3)" stroke="hsl(var(--success))" name="Lợi nhuận gộp" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Financial Analysis Tab */}
          <TabsContent value="financial" className="mt-6 space-y-6">
            {isLoading ? <LoadingSkeleton /> : (
              <>
                <ContextualAIPanel context="financial_analysis" />
                
                {/* Key Insights */}
                {keyInsights.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-lg mb-4">Nhận định chính</h3>
                    <div className="space-y-3">
                      {keyInsights.slice(0, 5).map((insight, idx) => (
                        <div key={idx} className={cn(
                          "p-3 rounded-lg border",
                          insight.type === 'success' && "bg-success/10 border-success/20",
                          insight.type === 'warning' && "bg-warning/10 border-warning/20",
                          insight.type === 'danger' && "bg-destructive/10 border-destructive/20",
                          insight.type === 'info' && "bg-info/10 border-info/20"
                        )}>
                          <p className="font-medium">{insight.title}</p>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Financial Ratios */}
                {financialRatios.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {financialRatios.map((ratio) => (
                      <Card key={ratio.name} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{ratio.name}</p>
                          <Badge variant={ratio.value >= ratio.target ? 'default' : 'secondary'}>
                            {ratio.value >= ratio.target ? 'Đạt' : 'Chưa đạt'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{ratio.value?.toFixed(1)}{ratio.unit}</p>
                        <Progress value={Math.min((ratio.value / ratio.target) * 100, 100)} className="h-1.5 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">Mục tiêu: {ratio.target}{ratio.unit}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Profitability Tab */}
          <TabsContent value="profitability" className="mt-6 space-y-6">
            {isLoading ? <LoadingSkeleton /> : (
              <>
                <ContextualAIPanel context="profitability" />

                {/* P&L KPIs from snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Doanh thu thuần</p>
                    <p className="text-2xl font-bold text-primary">{formatBillion(snapshot?.netRevenue || 0)}</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                    <p className="text-2xl font-bold text-success">{formatBillion(snapshot?.grossProfit || 0)}</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Biên lợi nhuận gộp</p>
                    <p className="text-2xl font-bold">{(snapshot?.grossMarginPercent || 0).toFixed(1)}%</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">EBITDA Margin</p>
                    <p className={cn("text-2xl font-bold", (snapshot?.ebitdaMarginPercent || 0) >= 0 ? "text-success" : "text-destructive")}>
                      {(snapshot?.ebitdaMarginPercent || 0).toFixed(1)}%
                    </p>
                  </Card>
                </div>

                {/* Revenue-Cost-Profit Trend */}
                {monthlyChartData.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-lg mb-4">Xu hướng Doanh thu - Chi phí - Lợi nhuận</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary)/0.3)" stroke="hsl(var(--primary))" name="Doanh thu" />
                          <Area type="monotone" dataKey="cogs" fill="hsl(var(--warning)/0.3)" stroke="hsl(var(--warning))" name="COGS" />
                          <Area type="monotone" dataKey="profit" fill="hsl(var(--success)/0.3)" stroke="hsl(var(--success))" name="Lợi nhuận gộp" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
