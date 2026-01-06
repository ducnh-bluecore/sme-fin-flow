import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Search,
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
import { useDateRange, useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
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
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  subcategory: string | null;
  description: string;
  amount: number;
  vendor_name: string | null;
  reference_number: string | null;
  payment_method: string | null;
  is_recurring: boolean;
  recurring_period: string | null;
  notes: string | null;
  created_at: string;
}

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

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Use global date range context
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();
  const { data: tenantId } = useActiveTenantId();

  type ExpenseCategory = 'cogs' | 'salary' | 'rent' | 'utilities' | 'marketing' | 'logistics' | 'depreciation' | 'interest' | 'tax' | 'other';

  // Fetch expenses with date range
  const { data: expenses = [], isLoading, refetch } = useQuery({
    queryKey: ['expenses-analytics', tenantId, filterCategory, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr)
        .order('expense_date', { ascending: false });

      if (filterCategory && filterCategory !== 'all') {
        query = query.eq('category', filterCategory as ExpenseCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!tenantId,
  });

  // Fetch previous period for comparison
  const { data: prevExpenses = [] } = useQuery({
    queryKey: ['expenses-prev', tenantId, filterCategory, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const prevStart = format(subMonths(new Date(startDateStr), 1), 'yyyy-MM-dd');
      const prevEnd = format(subMonths(new Date(endDateStr), 1), 'yyyy-MM-dd');

      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('expense_date', prevStart)
        .lte('expense_date', prevEnd);

      if (filterCategory && filterCategory !== 'all') {
        query = query.eq('category', filterCategory as ExpenseCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Filter expenses by search term
  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryLabels[exp.category]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expenseChange = prevTotalExpenses > 0 
    ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 
    : 0;

  // Prepare chart data
  const pieChartData = Object.entries(categoryTotals).map(([category, amount]) => ({
    name: categoryLabels[category] || category,
    value: amount,
    color: categoryColors[category] || '#64748b',
  }));

  // Monthly trend data
  const monthlyData = expenses.reduce((acc, exp) => {
    try {
      const date = new Date(exp.expense_date);
      if (!isNaN(date.getTime())) {
        const month = format(date, 'yyyy-MM');
        acc[month] = (acc[month] || 0) + Number(exp.amount);
      }
    } catch {
      // Skip invalid dates
    }
    return acc;
  }, {} as Record<string, number>);

  const trendData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => {
      try {
        return {
          month: format(new Date(month + '-01'), 'MMM yyyy', { locale: vi }),
          amount,
        };
      } catch {
        return { month, amount };
      }
    });

  // Top vendors
  const vendorTotals = expenses.reduce((acc, exp) => {
    const vendor = exp.vendor_name || 'Không xác định';
    acc[vendor] = (acc[vendor] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const topVendors = Object.entries(vendorTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

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
              Theo dõi và phân tích chi phí từ các nguồn đã tích hợp
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
          title="Dữ liệu được đồng bộ từ các nguồn tích hợp"
          description="Để thêm dữ liệu mới, vui lòng kết nối với phần mềm kế toán hoặc import file tại"
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
                <div className="text-2xl font-bold">
                  {categoryLabels[Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]?.[0]] || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Object.values(categoryTotals).sort((a, b) => b - a)[0] || 0)}
                </p>
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
                <div className="text-2xl font-bold">{expenses.length}</div>
                <p className="text-xs text-muted-foreground">trong kỳ phân tích</p>
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
                <div className="text-2xl font-bold">
                  {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
                </div>
                <p className="text-xs text-muted-foreground">chi phí trung bình</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm chi phí..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
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
            <TabsTrigger value="detail">Chi tiết</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo danh mục</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Vendors */}
              <Card>
                <CardHeader>
                  <CardTitle>Top nhà cung cấp</CardTitle>
                  <CardDescription>Theo tổng chi phí</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topVendors.map(([vendor, amount], index) => (
                      <div key={vendor} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{vendor}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <Progress 
                          value={(amount / totalExpenses) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng chi phí</CardTitle>
              </CardHeader>
              <CardContent>
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
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detail">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách chi phí</CardTitle>
                <CardDescription>
                  {filteredExpenses.length} giao dịch trong kỳ phân tích
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.slice(0, 20).map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: categoryColors[expense.category],
                              color: categoryColors[expense.category]
                            }}
                          >
                            {categoryLabels[expense.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.vendor_name || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredExpenses.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Hiển thị 20/{filteredExpenses.length} giao dịch
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
