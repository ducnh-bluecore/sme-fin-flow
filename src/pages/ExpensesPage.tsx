/**
 * ExpensesPage - REFACTORED to use precomputed data
 * 
 * ⚠️ NOW USES CANONICAL HOOKS ONLY - NO RAW TABLE QUERIES
 * 
 * Uses:
 * - useExpensesDaily for daily precomputed aggregates
 * - useExpensesSummary for period totals by category
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Filter,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  Download,
  RefreshCw,
  Link2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { FixedCostDefinitionPanel } from '@/components/expenses/FixedCostDefinitionPanel';
import { VariableCostEstimatePanel } from '@/components/expenses/VariableCostEstimatePanel';
import { BudgetVsActualSummary } from '@/components/expenses/BudgetVsActualSummary';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DataSourceNotice } from '@/components/shared/DataSourceNotice';
import { useExpensesDaily, useExpensesSummary, FormattedExpensesDaily } from '@/hooks/useExpensesDaily';
import { useFinanceMonthlySummary } from '@/hooks/useFinanceMonthlySummary';

// =============================================================
// CONSTANTS
// =============================================================

const categoryLabels: Record<string, string> = {
  cogs: 'Giá vốn hàng bán',
  salary: 'Lương nhân viên',
  rent: 'Thuê mặt bằng',
  utilities: 'Điện nước',
  marketing: 'Marketing',
  logistics: 'Vận chuyển',
  depreciation: 'Khấu hao',
  interest: 'Lãi vay',
  tax: 'Thuế',
  other: 'Chi phí khác',
};

const categoryColors: Record<string, string> = {
  cogs: '#ef4444',
  salary: '#3b82f6',
  rent: '#8b5cf6',
  utilities: '#eab308',
  marketing: '#ec4899',
  logistics: '#f97316',
  depreciation: '#6b7280',
  interest: '#06b6d4',
  tax: '#22c55e',
  other: '#64748b',
};

// =============================================================
// COMPONENT
// =============================================================

export default function ExpensesPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { dateRange } = useDateRange();

  // Use CANONICAL hooks only - NO raw table queries
  const { data: dailyExpenses, isLoading, refetch } = useExpensesDaily({ days: 365 });
  const { data: expensesSummary } = useExpensesSummary();
  const { data: monthlySummary } = useFinanceMonthlySummary({ months: 12 });

  // Derive chart data from precomputed summary (NO calculations)
  const categoryTotals = useMemo(() => {
    if (!expensesSummary) return {};
    return expensesSummary.byCategory;
  }, [expensesSummary]);

  const totalExpenses = expensesSummary?.totalAmount || 0;
  const totalCount = expensesSummary?.totalCount || 0;

  // Previous period comparison - use pre-computed change from summary if available
  // Fallback to monthly summary calculation for backwards compatibility
  const expenseChange = useMemo(() => {
    // If summary provides pre-computed change, use it (SSOT)
    if ((expensesSummary as any)?.expenseChangePercent !== undefined) {
      return (expensesSummary as any).expenseChangePercent;
    }
    // Fallback: calculate from monthly summary (will be deprecated)
    if (!monthlySummary || monthlySummary.length < 2) return 0;
    const prev = monthlySummary[monthlySummary.length - 2];
    const prevPeriodExpenses = prev ? (prev.cogs + prev.operatingExpenses) : 0;
    return prevPeriodExpenses > 0
      ? ((totalExpenses - prevPeriodExpenses) / prevPeriodExpenses) * 100
      : 0;
  }, [expensesSummary, monthlySummary, totalExpenses]);

  // Pie chart data from precomputed categories
  const pieChartData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([_, amount]) => (amount as number) > 0)
      .map(([category, amount]) => ({
        name: categoryLabels[category] || category,
        value: amount as number,
        color: categoryColors[category] || '#64748b',
      }));
  }, [categoryTotals]);

  // Trend data from daily precomputed (NO raw queries)
  const trendData = useMemo(() => {
    if (!dailyExpenses || dailyExpenses.length === 0) return [];
    
    // Group by month from precomputed daily data
    const monthlyMap: Record<string, number> = {};
    dailyExpenses.forEach((d: FormattedExpensesDaily) => {
      try {
        const month = d.day.substring(0, 7); // YYYY-MM
        monthlyMap[month] = (monthlyMap[month] || 0) + d.totalAmount;
      } catch {
        // Skip invalid dates
      }
    });
    
    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: vi }),
        amount,
      }));
  }, [dailyExpenses]);

  // Largest category (from precomputed)
  const largestCategory = useMemo(() => {
    const entries = Object.entries(categoryTotals).sort(([, a], [, b]) => (b as number) - (a as number));
    if (entries.length === 0) return { name: '-', amount: 0 };
    const [cat, amount] = entries[0];
    return { name: categoryLabels[cat] || cat, amount: amount as number };
  }, [categoryTotals]);

  // Filter by category if needed
  const filteredPieData = filterCategory === 'all' 
    ? pieChartData 
    : pieChartData.filter(d => d.name === categoryLabels[filterCategory]);

  return (
    <>
      <Helmet>
        <title>Phân tích Chi phí | Bluecore Finance</title>
        <meta name="description" content="Phân tích và theo dõi chi phí doanh nghiệp" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Phân tích Chi phí</h1>
            <p className="text-muted-foreground">
              Theo dõi và phân tích chi phí từ dữ liệu đã tổng hợp
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
            <Link to="/connectors">
              <Button size="sm">
                <Link2 className="w-4 h-4 mr-2" />
                Kết nối nguồn
              </Button>
            </Link>
          </div>
        </div>

        {/* Data Source Notice */}
        <DataSourceNotice
          variant="blue"
          title="Dữ liệu được tổng hợp từ hệ thống"
          description="Các số liệu hiển thị đã được tính toán sẵn từ dữ liệu gốc"
          showTimestamp
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                    <div className={cn(
                      "flex items-center text-xs mt-1",
                      expenseChange > 0 ? "text-destructive" : "text-green-500"
                    )}>
                      {expenseChange > 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(expenseChange).toFixed(1)}% so với kỳ trước
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chi phí lớn nhất</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{largestCategory.name}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(largestCategory.amount)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Số giao dịch</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{totalCount}</div>
                    <p className="text-xs text-muted-foreground">trong kỳ phân tích</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">TB/giao dịch</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalCount > 0 ? totalExpenses / totalCount : 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">chi phí trung bình</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <QuickDateSelector />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="definitions">Định nghĩa chi phí</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo danh mục</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={filteredPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {filteredPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết theo danh mục</CardTitle>
                  <CardDescription>Tỷ trọng từng loại chi phí</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <div className="space-y-4">
                      {pieChartData.slice(0, 6).map((item) => (
                        <div key={item.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                          <Progress
                            value={totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>So sánh chi phí theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pieChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" fill="hsl(var(--primary))">
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng chi phí theo tháng</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          fill="hsl(var(--destructive)/0.2)"
                          stroke="hsl(var(--destructive))"
                          name="Chi phí"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="definitions" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <FixedCostDefinitionPanel />
              <VariableCostEstimatePanel />
            </div>
            <BudgetVsActualSummary />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
