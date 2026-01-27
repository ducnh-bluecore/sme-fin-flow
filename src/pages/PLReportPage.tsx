import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Store,
  Truck,
  Users,
  Megaphone,
  Building,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Filter,
  Loader2,
  Target,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, formatPercent, formatCount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePLData } from '@/hooks/usePLData';
import { useScenarioBudgetData } from '@/hooks/useScenarioBudgetData';
import { useAllChannelsPL } from '@/hooks/useAllChannelsPL';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextualAIPanel } from '@/components/dashboard/ContextualAIPanel';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';
import { Link } from 'react-router-dom';

type PLLineItemProps = {
  label: string;
  amount: number;
  budgetAmount?: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
  isNegative?: boolean;
  indent?: number;
  icon?: React.ElementType;
  change?: number;
  showBudget?: boolean;
};

const PLLineItem = React.forwardRef<HTMLDivElement, PLLineItemProps>(
  (
    {
      label,
      amount,
      budgetAmount,
      isTotal = false,
      isSubtotal = false,
      isNegative = false,
      indent = 0,
      icon,
      change,
      showBudget = false,
    },
    ref,
  ) => {
    const Icon = icon;
    const variance = budgetAmount !== undefined ? amount - budgetAmount : undefined;
    const variancePct = budgetAmount && budgetAmount !== 0 ? ((amount - budgetAmount) / Math.abs(budgetAmount)) * 100 : undefined;
    
    // For expenses (isNegative), favorable = actual < budget (spent less, variance negative)
    // For revenue/profit, favorable = actual >= budget (earned more, variance positive)
    const isFavorable = isNegative 
      ? (variance !== undefined && variance < 0) // Expenses: spent less than budget = good
      : (variance !== undefined && variance >= 0); // Revenue/Profit: earned more = good
    
    return (
      <div
        ref={ref}
        className={cn(
          'grid gap-2 py-2.5 px-3 rounded-lg transition-colors',
          showBudget ? 'grid-cols-[1fr,auto,auto,auto]' : 'grid-cols-[1fr,auto,auto]',
          isTotal && 'bg-primary/10 font-bold text-lg',
          isSubtotal && 'bg-muted/50 font-semibold',
          !isTotal && !isSubtotal && 'hover:bg-muted/30',
        )}
        style={{ paddingLeft: `${12 + indent * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <span className={cn(isNegative && 'text-muted-foreground')}>{label}</span>
        </div>
        
        {/* Actual Amount */}
        <div className="flex items-center justify-end min-w-[120px]">
          <span
            className={cn(
              'font-mono tabular-nums text-right',
              isNegative && 'text-destructive',
              isTotal && 'text-primary',
            )}
          >
            {isNegative
              ? `(${formatCurrency(Math.abs(amount))})`
              : formatCurrency(amount)}
          </span>
        </div>
        
        {/* Budget Amount */}
        {showBudget && (
          <div className="flex items-center justify-end min-w-[120px]">
            <span className="font-mono tabular-nums text-muted-foreground text-right">
              {budgetAmount !== undefined 
                ? (isNegative 
                    ? `(${formatCurrency(Math.abs(budgetAmount))})` 
                    : formatCurrency(budgetAmount))
                : '-'
              }
            </span>
          </div>
        )}
        
        {/* Variance */}
        <div className="flex items-center justify-end gap-2 min-w-[100px]">
          {variance !== undefined && variancePct !== undefined && Math.abs(variancePct) >= 0.1 ? (
            <Badge 
              variant={isFavorable ? 'default' : 'destructive'} 
              className={cn(
                'text-xs',
                isFavorable && 'bg-success/20 text-success hover:bg-success/30'
              )}
            >
              {isFavorable ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(variancePct).toFixed(1)}%
            </Badge>
          ) : change !== undefined ? (
            <Badge variant={change >= 0 ? 'default' : 'destructive'} className="text-xs">
              {change >= 0 ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(change)}%
            </Badge>
          ) : null}
        </div>
      </div>
    );
  },
);
PLLineItem.displayName = 'PLLineItem';


const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-10 w-10 rounded-xl mb-3" />
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-full mb-2" />
        ))}
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </Card>
    </div>
  </div>
);

export default function PLReportPage() {
  const [viewMode, setViewMode] = useState('summary');
  
  const { data, isLoading, error } = usePLData();
  const { data: budgetData, isLoading: budgetLoading } = useScenarioBudgetData({});
  const { data: channelsPLData, isLoading: channelsLoading } = useAllChannelsPL(12);

  const isDataLoading = isLoading || budgetLoading || channelsLoading;

  if (isDataLoading) {
    return (
      <>
        <Helmet>
          <title>Báo cáo P&L | Bluecore Finance</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Báo cáo P&L</h1>
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Không thể tải dữ liệu P&L</p>
          <p className="text-muted-foreground text-sm">{error?.message}</p>
        </div>
      </div>
    );
  }

  const { plData, monthlyData, categoryData, comparisonData, revenueBreakdown } = data;
  
  // Check if we have budget data from primary scenario
  const hasBudgetData = budgetData && budgetData.scenarioId && budgetData.ytd.plannedRevenue > 0;
  
  // Calculate budget values for P&L items based on YTD data
  // We'll estimate the breakdown based on typical ratios
  const budgetValues = hasBudgetData ? {
    grossSales: budgetData.ytd.plannedRevenue,
    netSales: budgetData.ytd.plannedRevenue * 0.95, // Assume 5% returns/discounts
    cogs: budgetData.ytd.plannedRevenue * 0.60, // Assume 60% COGS ratio
    grossProfit: budgetData.ytd.plannedRevenue * 0.35, // 35% gross margin
    totalOpex: budgetData.ytd.plannedOpex,
    operatingIncome: budgetData.ytd.plannedEbitda,
    netIncome: budgetData.ytd.plannedEbitda * 0.80, // After tax
  } : null;

  // Generate expense trend data from monthly data - use actual opex or skip
  // NOTE: Hardcoded distributions REMOVED - show real data only when opex > 0
  const expenseTrendData = monthlyData
    .filter(m => m.opex > 0) // Only include months with real opex data
    .map((m) => ({
      month: m.month,
      // When we have real expense breakdown, use it. For now, show total only
      total: Math.round(m.opex),
      // These are placeholders until we have real expense categorization
      salaries: 0,
      rent: 0,
      marketing: 0,
      utilities: 0,
      other: Math.round(m.opex), // Put all in "other" until categorized
    }));

  return (
    <>
      <Helmet>
        <title>Báo cáo P&L | Bluecore Finance</title>
        <meta name="description" content="Báo cáo Lãi/Lỗ cho doanh nghiệp bán lẻ" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Báo cáo P&L</h1>
              <p className="text-muted-foreground">Profit & Loss Statement - Bán lẻ</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <QuickDateSelector />
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Xuất báo cáo
              </Button>
            </div>
            <DateRangeIndicator variant="compact" />
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Doanh thu thuần', value: plData.netSales, change: comparisonData.netSales.change, icon: ShoppingCart },
            { label: 'Lãi gộp', value: plData.grossProfit, change: comparisonData.grossProfit.change, icon: TrendingUp, extra: `Biên: ${plData.netSales > 0 ? ((plData.grossProfit / plData.netSales) * 100).toFixed(1) : '0'}%` },
            { label: 'Lợi nhuận hoạt động', value: plData.operatingIncome, change: comparisonData.operatingIncome.change, icon: Store, extra: `Biên: ${plData.netSales > 0 ? ((plData.operatingIncome / plData.netSales) * 100).toFixed(1) : '0'}%` },
            { label: 'Lợi nhuận ròng', value: plData.netIncome, change: comparisonData.netIncome.change, icon: DollarSign, extra: `Biên: ${plData.netSales > 0 ? ((plData.netIncome / plData.netSales) * 100).toFixed(1) : '0'}%` },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-5 bg-card shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <metric.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant={metric.change >= 0 ? 'default' : 'destructive'} className="text-xs">
                    {metric.change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {typeof metric.change === 'number' ? metric.change.toFixed(1) : metric.change}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(metric.value)}</p>
                {metric.extra && (
                  <p className="text-xs text-muted-foreground mt-1">{metric.extra}</p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* AI Analysis Panel */}
        <ContextualAIPanel context="pl_report" />

        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="summary">Tổng quan</TabsTrigger>
            <TabsTrigger value="channels">Kênh bán</TabsTrigger>
            <TabsTrigger value="detail">Chi tiết</TabsTrigger>
            <TabsTrigger value="analysis">Phân tích</TabsTrigger>
          </TabsList>

          {/* Summary View */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* P&L Statement */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="data-card lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Báo cáo Lãi/Lỗ</h3>
                  {hasBudgetData && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span>So sánh với kế hoạch: <span className="font-medium text-foreground">{budgetData.scenarioName}</span></span>
                    </div>
                  )}
                </div>
                
                {/* Column Headers */}
                {hasBudgetData && (
                  <div className="grid grid-cols-[1fr,auto,auto,auto] gap-2 py-2 px-3 mb-2 border-b border-border text-sm font-medium text-muted-foreground">
                    <div>Khoản mục</div>
                    <div className="text-right min-w-[120px]">Thực tế</div>
                    <div className="text-right min-w-[120px]">Kế hoạch</div>
                    <div className="text-right min-w-[100px]">Chênh lệch</div>
                  </div>
                )}
                
                <div className="space-y-1">
                  {/* Doanh thu */}
                  <PLLineItem 
                    label="Doanh thu bán hàng" 
                    amount={plData.grossSales} 
                    budgetAmount={budgetValues?.grossSales}
                    icon={ShoppingCart}
                    showBudget={hasBudgetData}
                  />
                  {revenueBreakdown.invoiceRevenue > 0 && (
                    <PLLineItem label="Từ hóa đơn" amount={revenueBreakdown.invoiceRevenue} indent={1} showBudget={hasBudgetData} />
                  )}
                  {revenueBreakdown.contractRevenue > 0 && (
                    <PLLineItem label="Từ hợp đồng" amount={revenueBreakdown.contractRevenue} indent={1} showBudget={hasBudgetData} />
                  )}
                  {revenueBreakdown.integratedRevenue > 0 && (
                    <PLLineItem label="Từ tích hợp" amount={revenueBreakdown.integratedRevenue} indent={1} showBudget={hasBudgetData} />
                  )}
                  <PLLineItem label="Trả hàng" amount={-plData.salesReturns} isNegative indent={1} showBudget={hasBudgetData} />
                  <PLLineItem label="Chiết khấu" amount={-plData.salesDiscounts} isNegative indent={1} showBudget={hasBudgetData} />
                  <PLLineItem 
                    label="Doanh thu thuần" 
                    amount={plData.netSales} 
                    budgetAmount={budgetValues?.netSales}
                    isSubtotal 
                    showBudget={hasBudgetData}
                  />
                  
                  <div className="h-2" />
                  
                  {/* COGS */}
                  <PLLineItem 
                    label="Giá vốn hàng bán (COGS)" 
                    amount={-plData.cogs} 
                    budgetAmount={budgetValues?.cogs ? -budgetValues.cogs : undefined}
                    isNegative 
                    icon={Package}
                    showBudget={hasBudgetData}
                  />
                  
                  <div className="h-2" />
                  
                  {/* Lãi gộp */}
                  <PLLineItem 
                    label="LÃI GỘP" 
                    amount={plData.grossProfit} 
                    budgetAmount={budgetValues?.grossProfit}
                    isTotal 
                    showBudget={hasBudgetData}
                  />
                  
                  <div className="h-3" />
                  
                  {/* Chi phí hoạt động */}
                  <PLLineItem 
                    label="Chi phí hoạt động" 
                    amount={-plData.totalOperatingExpenses} 
                    budgetAmount={budgetValues?.totalOpex ? -budgetValues.totalOpex : undefined}
                    isNegative 
                    icon={Building}
                    showBudget={hasBudgetData}
                  />
                  
                  <div className="h-2" />
                  
                  {/* EBIT */}
                  <PLLineItem 
                    label="LỢI NHUẬN HOẠT ĐỘNG (EBIT)" 
                    amount={plData.operatingIncome} 
                    budgetAmount={budgetValues?.operatingIncome}
                    isSubtotal 
                    showBudget={hasBudgetData}
                  />
                  
                  <div className="h-2" />
                  
                  {/* Thu nhập/Chi phí khác */}
                  <PLLineItem label="Thu nhập khác" amount={plData.otherIncome} indent={1} showBudget={hasBudgetData} />
                  <PLLineItem label="Chi phí lãi vay" amount={-plData.interestExpense} isNegative indent={1} showBudget={hasBudgetData} />
                  
                  <div className="h-2" />
                  
                  {/* Lợi nhuận trước thuế */}
                  <PLLineItem label="Lợi nhuận trước thuế" amount={plData.incomeBeforeTax} isSubtotal showBudget={hasBudgetData} />
                  <PLLineItem label="Thuế TNDN (20%)" amount={-plData.incomeTax} isNegative indent={1} showBudget={hasBudgetData} />
                  
                  <div className="h-2" />
                  
                  {/* Lợi nhuận ròng */}
                  <PLLineItem 
                    label="LỢI NHUẬN RÒNG" 
                    amount={plData.netIncome} 
                    budgetAmount={budgetValues?.netIncome}
                    isTotal 
                    showBudget={hasBudgetData}
                  />
                </div>
                
                {/* Budget Summary */}
                {hasBudgetData && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-medium">Tổng hợp so với Kế hoạch</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Doanh thu</p>
                        <p className={cn(
                          "font-semibold",
                          budgetData.ytd.revenueVariance >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {budgetData.ytd.revenueVariance >= 0 ? '+' : ''}{formatCurrency(budgetData.ytd.revenueVariance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {budgetData.ytd.revenueVariancePct >= 0 ? '+' : ''}{budgetData.ytd.revenueVariancePct.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Chi phí hoạt động</p>
                        <p className={cn(
                          "font-semibold",
                          budgetData.ytd.opexVariance >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {budgetData.ytd.opexVariance >= 0 ? '+' : ''}{formatCurrency(budgetData.ytd.opexVariance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {budgetData.ytd.opexVariancePct >= 0 ? 'Tiết kiệm ' : 'Vượt '}{Math.abs(budgetData.ytd.opexVariancePct).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">EBITDA</p>
                        <p className={cn(
                          "font-semibold",
                          budgetData.ytd.ebitdaVariance >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {budgetData.ytd.ebitdaVariance >= 0 ? '+' : ''}{formatCurrency(budgetData.ytd.ebitdaVariance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {budgetData.ytd.ebitdaVariancePct >= 0 ? '+' : ''}{budgetData.ytd.ebitdaVariancePct.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Tiến độ năm</p>
                        <p className="font-semibold">{budgetData.ytd.progress.toFixed(0)}%</p>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="text-success">{budgetData.ytd.favorableCount} thuận lợi</span>
                          <span className="text-destructive">{budgetData.ytd.unfavorableCount} bất lợi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Channel Performance Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="data-card lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Hiệu suất theo Kênh bán
                  </h3>
                  <Link 
                    to="/mdp/channels" 
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Chi tiết <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                
                {channelsPLData && channelsPLData.channels.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Tổng kênh</p>
                        <p className="text-xl font-bold">{channelsPLData.channels.length}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Kênh dẫn đầu</p>
                        <p className="text-lg font-bold text-primary">{channelsPLData.topChannel || '-'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10">
                        <p className="text-xs text-muted-foreground mb-1">Lợi nhuận cao nhất</p>
                        <p className="text-lg font-bold text-success">{channelsPLData.mostProfitableChannel || '-'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-info/10">
                        <p className="text-xs text-muted-foreground mb-1">AOV trung bình</p>
                        <p className="text-lg font-bold text-info">{formatCurrency(channelsPLData.totals.avgOrderValue)}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kênh</TableHead>
                            <TableHead className="text-right">Doanh thu</TableHead>
                            <TableHead className="text-right">Phí sàn</TableHead>
                            <TableHead className="text-right">Lãi gộp</TableHead>
                            <TableHead className="text-right">Biên LN</TableHead>
                            <TableHead className="text-right">Tỷ trọng</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {channelsPLData.channels.slice(0, 5).map((ch, idx) => (
                            <TableRow key={ch.channel}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    idx === 0 ? "bg-primary" : idx === 1 ? "bg-info" : "bg-muted-foreground"
                                  )} />
                                  {ch.channel}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(ch.totalRevenue)}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(ch.totalFees)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(ch.grossProfit)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ch.grossMargin >= 20 ? 'default' : ch.grossMargin >= 10 ? 'secondary' : 'destructive'}>
                                  {ch.grossMargin.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress value={ch.revenueShare} className="w-16 h-2" />
                                  <span className="text-xs text-muted-foreground w-10">{ch.revenueShare.toFixed(1)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {channelsPLData.channels.length > 5 && (
                      <div className="mt-3 text-center">
                        <Link 
                          to="/mdp/channels" 
                          className="text-sm text-muted-foreground hover:text-primary"
                        >
                          Xem thêm {channelsPLData.channels.length - 5} kênh khác →
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Store className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">Chưa có dữ liệu kênh bán hàng</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Kết nối các kênh bán hàng (Shopee, Lazada, TikTok Shop...) để xem phân tích hiệu suất theo kênh
                    </p>
                    <Link 
                      to="/data-hub" 
                      className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Kết nối kênh bán <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* Monthly Trend Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="data-card lg:col-span-2"
              >
                <h3 className="font-semibold text-lg mb-4">Xu hướng theo tháng</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyData}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => formatCurrency(value * 1000000)}
                      />
                      <Legend />
                      <Bar dataKey="netSales" name="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="grossProfit" name="Lãi gộp" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="netIncome" name="Lợi nhuận ròng" stroke="hsl(var(--success))" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Channels View */}
          <TabsContent value="channels" className="space-y-6">
            {channelsPLData && channelsPLData.channels.length > 0 ? (
              <>
                {/* Channel KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">Tổng doanh thu kênh</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(channelsPLData.totals.totalRevenue)}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Store className="w-4 h-4 text-warning" />
                      </div>
                      <span className="text-sm text-muted-foreground">Tổng phí sàn</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(channelsPLData.totals.totalFees)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {channelsPLData.totals.totalRevenue > 0 
                        ? ((channelsPLData.totals.totalFees / channelsPLData.totals.totalRevenue) * 100).toFixed(1) 
                        : 0}% doanh thu
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-sm text-muted-foreground">Lãi gộp kênh</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(channelsPLData.totals.grossProfit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Biên: {channelsPLData.totals.grossMargin.toFixed(1)}%
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-info" />
                      </div>
                      <span className="text-sm text-muted-foreground">Tổng đơn hàng</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCount(channelsPLData.totals.orderCount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AOV: {formatCurrency(channelsPLData.totals.avgOrderValue)}
                    </p>
                  </Card>
                </div>

                {/* Channel Comparison Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="data-card"
                >
                  <h3 className="font-semibold text-lg mb-4">So sánh Doanh thu & Lợi nhuận theo Kênh</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelsPLData.channels} layout="vertical">
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`} />
                        <YAxis type="category" dataKey="channel" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="totalRevenue" name="Doanh thu" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="grossProfit" name="Lãi gộp" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Detailed Channel Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="data-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Chi tiết P&L theo Kênh</h3>
                    <Link to="/mdp/channels">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Xem chi tiết kênh
                      </Button>
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kênh</TableHead>
                          <TableHead className="text-right">Doanh thu</TableHead>
                          <TableHead className="text-right">Phí sàn</TableHead>
                          <TableHead className="text-right">COGS</TableHead>
                          <TableHead className="text-right">Lãi gộp</TableHead>
                          <TableHead className="text-right">Biên LN</TableHead>
                          <TableHead className="text-right">Đơn hàng</TableHead>
                          <TableHead className="text-right">AOV</TableHead>
                          <TableHead className="text-right">Tỷ trọng DT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {channelsPLData.channels.map((ch, idx) => (
                          <TableRow key={ch.channel}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  idx === 0 ? "bg-primary" : idx === 1 ? "bg-info" : idx === 2 ? "bg-success" : "bg-muted-foreground"
                                )} />
                                {ch.channel}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(ch.totalRevenue)}</TableCell>
                            <TableCell className="text-right font-mono text-warning">{formatCurrency(ch.totalFees)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(ch.totalCogs)}</TableCell>
                            <TableCell className="text-right font-mono text-success">{formatCurrency(ch.grossProfit)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={ch.grossMargin >= 20 ? 'default' : ch.grossMargin >= 10 ? 'secondary' : 'destructive'}>
                                {formatPercent(ch.grossMargin)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCount(ch.orderCount)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(ch.avgOrderValue)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={ch.revenueShare} className="w-16 h-2" />
                                <span className="text-xs w-12">{ch.revenueShare.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>TỔNG CỘNG</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(channelsPLData.totals.totalRevenue)}</TableCell>
                          <TableCell className="text-right font-mono text-warning">{formatCurrency(channelsPLData.totals.totalFees)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(channelsPLData.totals.totalCogs)}</TableCell>
                          <TableCell className="text-right font-mono text-success">{formatCurrency(channelsPLData.totals.grossProfit)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{formatPercent(channelsPLData.totals.grossMargin)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCount(channelsPLData.totals.orderCount)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(channelsPLData.totals.avgOrderValue)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              </>
            ) : (
              <Card className="p-12 text-center">
                <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu kênh bán</h3>
                <p className="text-muted-foreground mb-4">
                  Kết nối các sàn thương mại điện tử để xem phân tích P&L theo kênh
                </p>
                <Link to="/data-hub">
                  <Button>
                    <Store className="w-4 h-4 mr-2" />
                    Kết nối kênh bán
                  </Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Detail View */}
          <TabsContent value="detail" className="space-y-6">
            {/* Revenue Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-4">Chi tiết Doanh thu theo nguồn</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground mb-1">Từ hóa đơn</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(revenueBreakdown.invoiceRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plData.grossSales > 0 ? Math.round(revenueBreakdown.invoiceRevenue / plData.grossSales * 100) : 0}% tổng
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-info/10">
                  <p className="text-sm text-muted-foreground mb-1">Từ hợp đồng</p>
                  <p className="text-xl font-bold text-info">{formatCurrency(revenueBreakdown.contractRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plData.grossSales > 0 ? Math.round(revenueBreakdown.contractRevenue / plData.grossSales * 100) : 0}% tổng
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-success/10">
                  <p className="text-sm text-muted-foreground mb-1">Từ tích hợp</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(revenueBreakdown.integratedRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plData.grossSales > 0 ? Math.round(revenueBreakdown.integratedRevenue / plData.grossSales * 100) : 0}% tổng
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">Tổng doanh thu</p>
                  <p className="text-xl font-bold">{formatCurrency(revenueBreakdown.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sau chiết khấu & trả hàng</p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chi tiết Chi phí hoạt động */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Chi tiết Chi phí hoạt động</h3>
                <div className="space-y-1">
                  <PLLineItem label="Lương nhân viên" amount={plData.operatingExpenses.salaries} icon={Users} />
                  <PLLineItem label="Thuê mặt bằng" amount={plData.operatingExpenses.rent} icon={Building} />
                  <PLLineItem label="Marketing & Quảng cáo" amount={plData.operatingExpenses.marketing} icon={Megaphone} />
                  <PLLineItem label="Vận chuyển & Logistics" amount={plData.operatingExpenses.logistics} icon={Truck} />
                  <PLLineItem label="Điện, nước, internet" amount={plData.operatingExpenses.utilities} icon={Zap} />
                  <PLLineItem label="Khấu hao tài sản" amount={plData.operatingExpenses.depreciation} />
                  <PLLineItem label="Bảo hiểm" amount={plData.operatingExpenses.insurance} />
                  <PLLineItem label="Vật tư tiêu hao" amount={plData.operatingExpenses.supplies} />
                  <PLLineItem label="Bảo trì, sửa chữa" amount={plData.operatingExpenses.maintenance} />
                  <PLLineItem label="Dịch vụ chuyên nghiệp" amount={plData.operatingExpenses.professional} />
                  <PLLineItem label="Chi phí khác" amount={plData.operatingExpenses.other} />
                  <div className="h-2" />
                  <PLLineItem label="TỔNG CHI PHÍ HOẠT ĐỘNG" amount={plData.totalOperatingExpenses} isTotal />
                </div>
              </motion.div>

              {/* Chi tiết COGS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Chi tiết Giá vốn hàng bán</h3>
                <div className="space-y-1">
                  <PLLineItem label="Giá vốn hàng bán (COGS)" amount={plData.cogs} icon={Package} />
                  <div className="p-4 mt-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">
                      COGS được ước tính dựa trên tỷ lệ 65% doanh thu thuần - phù hợp với ngành bán lẻ.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Để có số liệu chính xác hơn, cần tích hợp hệ thống quản lý kho hàng.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tỷ lệ COGS/Doanh thu</span>
                    <span className="font-semibold">{formatPercent(plData.cogs / plData.netSales)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Biên lãi gộp</span>
                    <span className="font-semibold">{formatPercent(plData.grossMargin)}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Expense Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-4">Xu hướng Chi phí hoạt động</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expenseTrendData}>
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}tr`} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatCurrency(value * 1000000)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="salaries" stackId="1" name="Lương" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.6)" />
                    <Area type="monotone" dataKey="rent" stackId="1" name="Thuê mặt bằng" stroke="hsl(var(--info))" fill="hsl(var(--info) / 0.6)" />
                    <Area type="monotone" dataKey="marketing" stackId="1" name="Marketing" stroke="hsl(var(--warning))" fill="hsl(var(--warning) / 0.6)" />
                    <Area type="monotone" dataKey="utilities" stackId="1" name="Tiện ích" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.6)" />
                    <Area type="monotone" dataKey="other" stackId="1" name="Khác" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.6)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </TabsContent>

          {/* Analysis View */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* P&L theo danh mục */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Lợi nhuận theo danh mục sản phẩm</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Biên LN</TableHead>
                      <TableHead className="text-right">Đóng góp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.sales * 1000000)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(cat.cogs * 1000000)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cat.margin >= 30 ? 'default' : 'secondary'}>{cat.margin}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{cat.contribution}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>

              {/* Margin Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Phân tích Biên lợi nhuận</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Biên lãi gộp', value: plData.grossMargin, target: 0.40, color: 'primary' },
                    { label: 'Biên lợi nhuận hoạt động', value: plData.operatingMargin, target: 0.12, color: 'info' },
                    { label: 'Biên lợi nhuận ròng', value: plData.netMargin, target: 0.08, color: 'success' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatPercent(item.value)}</span>
                          <span className="text-xs text-muted-foreground">/ {formatPercent(item.target)}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={Math.min((item.value / item.target) * 100, 100)} className="h-3" />
                        <div 
                          className="absolute top-0 h-3 w-0.5 bg-foreground/50"
                          style={{ left: '100%' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.value >= item.target 
                          ? `Đạt ${formatPercent(item.value - item.target)} trên mục tiêu`
                          : `Còn ${formatPercent(item.target - item.value)} để đạt mục tiêu`
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Cost Structure Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-4">Cơ cấu Chi phí so với Doanh thu</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'COGS', value: plData.cogs, percent: plData.netSales > 0 ? (plData.cogs / plData.netSales) * 100 : 0, color: 'destructive' },
                  { label: 'Chi phí hoạt động', value: plData.totalOperatingExpenses, percent: plData.netSales > 0 ? (plData.totalOperatingExpenses / plData.netSales) * 100 : 0, color: 'warning' },
                  { label: 'Chi phí lãi vay', value: plData.interestExpense, percent: plData.netSales > 0 ? (plData.interestExpense / plData.netSales) * 100 : 0, color: 'info' },
                  { label: 'Thuế TNDN', value: plData.incomeTax, percent: plData.netSales > 0 ? (plData.incomeTax / plData.netSales) * 100 : 0, color: 'muted' },
                ].map((item) => (
                  <Card key={item.label} className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xl font-bold">{item.percent.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(item.value)}</p>
                    <Progress value={item.percent} className="h-1.5 mt-2" />
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success">Lợi nhuận ròng</p>
                    <p className="text-xs text-muted-foreground">Còn lại sau tất cả chi phí</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">{formatPercent(plData.netMargin)}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(plData.netIncome)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
