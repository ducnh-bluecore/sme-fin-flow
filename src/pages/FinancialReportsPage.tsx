/**
 * FinancialReportsPage - 100% SSOT COMPLIANT
 * 
 * ⚠️ ALL calculations moved to database views:
 * - v_financial_report_kpis: Pre-computed KPIs, margins, costs
 * - v_financial_insights: Pre-generated insights with status/descriptions
 * - v_financial_ratios_with_targets: Ratios with pre-calculated progress
 * 
 * This component is DISPLAY ONLY - no calculations allowed.
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

// CANONICAL HOOKS ONLY
import { useFinancialReportData } from '@/hooks/useFinancialReportData';
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
// FORMAT HELPER (display only - no calculations)
// =============================================================

const formatBillion = (value: number) => {
  const billion = value / 1000000000;
  if (billion >= 1) return `${billion.toFixed(1)} tỷ`;
  const million = value / 1000000;
  if (million >= 1) return `${million.toFixed(0)} triệu`;
  return formatCurrency(value);
};

// =============================================================
// COMPONENT
// =============================================================

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  
  // CANONICAL HOOKS - ALL data pre-computed in DB
  const { data: reportData, isLoading: reportLoading } = useFinancialReportData();
  const { data: monthlySummary, isLoading: monthlyLoading } = useFinanceMonthlySummary({ months: 12 });

  const isLoading = reportLoading || monthlyLoading;

  // Extract pre-computed data - NO calculations
  const kpis = reportData?.kpis;
  const insights = reportData?.insights || [];
  const ratios = reportData?.ratios || [];

  // Chart data mapping only (no calculations)
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
                {/* Hero KPIs - ALL values from pre-computed DB views */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-primary mt-2">
                      {formatBillion(kpis?.netRevenue || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Kỳ đã chọn</p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                    <p className={cn("text-3xl font-bold mt-2", (kpis?.grossProfit || 0) >= 0 ? "text-success" : "text-destructive")}>
                      {formatBillion(kpis?.grossProfit || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Biên lợi nhuận: {(kpis?.grossMarginPercent || 0).toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20 shadow-lg">
                    <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                    <p className="text-3xl font-bold text-warning mt-2">
                      {/* Pre-computed totalCost from v_financial_report_kpis */}
                      {formatBillion(kpis?.totalCost || 0)}
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
                
                {/* Key Insights - PRE-GENERATED from v_financial_insights */}
                {insights.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-lg mb-4">Nhận định chính</h3>
                    <div className="space-y-3">
                      {insights.slice(0, 5).map((insight, idx) => (
                        <div key={idx} className={cn(
                          "p-3 rounded-lg border",
                          insight.type === 'success' && "bg-success/10 border-success/20",
                          insight.type === 'warning' && "bg-warning/10 border-warning/20",
                          insight.type === 'danger' && "bg-destructive/10 border-destructive/20"
                        )}>
                          <p className="font-medium">{insight.title}</p>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Financial Ratios - PRE-COMPUTED from v_financial_ratios_with_targets */}
                {ratios.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {ratios.map((ratio) => (
                      <Card key={ratio.ratioCode} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{ratio.name}</p>
                          {/* isOnTarget comes pre-computed from DB */}
                          <Badge variant={ratio.isOnTarget ? 'default' : 'secondary'}>
                            {ratio.isOnTarget ? 'Đạt' : 'Chưa đạt'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold">{ratio.value?.toFixed(1)}{ratio.unit}</p>
                        {/* progress comes pre-computed and capped at 100 from DB */}
                        <Progress value={ratio.progress} className="h-1.5 mt-2" />
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

                {/* P&L KPIs - ALL from pre-computed DB views */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Doanh thu thuần</p>
                    <p className="text-2xl font-bold text-primary">{formatBillion(kpis?.netRevenue || 0)}</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                    <p className="text-2xl font-bold text-success">{formatBillion(kpis?.grossProfit || 0)}</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Biên lợi nhuận gộp</p>
                    <p className="text-2xl font-bold">{(kpis?.grossMarginPercent || 0).toFixed(1)}%</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-muted-foreground">EBITDA Margin</p>
                    <p className={cn("text-2xl font-bold", (kpis?.ebitdaMarginPercent || 0) >= 0 ? "text-success" : "text-destructive")}>
                      {(kpis?.ebitdaMarginPercent || 0).toFixed(1)}%
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
