import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DataSourceNotice } from '@/components/shared/DataSourceNotice';
import { 
  Search, FileText, Clock, CheckCircle2, XCircle, 
  MoreHorizontal, Eye, CreditCard, Loader2,
  TrendingDown, Download, RefreshCw, Link2,
  FileSpreadsheet, BarChart3,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  useBills, 
  useUpdateBillStatus, 
  useAPAging 
} from '@/hooks/useBillsData';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { differenceInDays, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { useDateRange } from '@/contexts/DateRangeContext';
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
  BarChart,
  Bar,
} from 'recharts';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Nháp', color: 'bg-gray-500', icon: FileText },
  pending: { label: 'Chờ duyệt', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Đã duyệt', color: 'bg-blue-500', icon: CheckCircle2 },
  partial: { label: 'Thanh toán 1 phần', color: 'bg-orange-500', icon: CreditCard },
  paid: { label: 'Đã thanh toán', color: 'bg-green-500', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: 'bg-red-500', icon: XCircle },
};

const statusColors: Record<string, string> = {
  draft: '#6b7280',
  pending: '#eab308',
  approved: '#3b82f6',
  partial: '#f97316',
  paid: '#22c55e',
  cancelled: '#ef4444',
};

export default function BillsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Use global date range context
  const { dateRange } = useDateRange();
  const { data: bills, isLoading, refetch } = useBills(dateRange);
  const { data: apAging } = useAPAging();
  const updateStatus = useUpdateBillStatus();

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: t('bills.statusDraft'), color: 'bg-gray-500', icon: FileText },
    pending: { label: t('bills.statusPending'), color: 'bg-yellow-500', icon: Clock },
    approved: { label: t('bills.statusApproved'), color: 'bg-blue-500', icon: CheckCircle2 },
    partial: { label: t('bills.statusPartial'), color: 'bg-orange-500', icon: CreditCard },
    paid: { label: t('bills.statusPaid'), color: 'bg-green-500', icon: CheckCircle2 },
    cancelled: { label: t('bills.statusCancelled'), color: 'bg-red-500', icon: XCircle },
  };

  const filteredBills = bills?.filter(bill => {
    const matchesSearch = 
      bill.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      bill.vendor_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate KPIs
  const totalAP = bills?.reduce((sum, b) => sum + (b.total_amount - (b.paid_amount || 0)), 0) || 0;
  const overdueAP = apAging?.filter(a => (a.days_overdue || 0) > 0).reduce((sum, a) => sum + (a.balance_due || 0), 0) || 0;
  const pendingCount = bills?.filter(b => b.status === 'pending' || b.status === 'approved').length || 0;
  const avgDPO = bills?.length 
    ? Math.round(bills.filter(b => b.status === 'paid').reduce((sum, b) => 
        sum + differenceInDays(new Date(b.updated_at), new Date(b.bill_date)), 0) / Math.max(1, bills.filter(b => b.status === 'paid').length))
    : 0;

  // Status breakdown for chart
  const statusBreakdown = Object.entries(
    bills?.reduce((acc, bill) => {
      acc[bill.status] = (acc[bill.status] || 0) + bill.total_amount;
      return acc;
    }, {} as Record<string, number>) || {}
  ).map(([status, amount]) => ({
    name: statusConfig[status]?.label || status,
    value: amount,
    color: statusColors[status] || '#64748b',
  }));

  // Aging breakdown
  const agingData = [
    { name: 'Chưa đến hạn', value: apAging?.filter(a => (a.days_overdue || 0) <= 0).reduce((sum, a) => sum + (a.balance_due || 0), 0) || 0, color: '#22c55e' },
    { name: '1-30 ngày', value: apAging?.filter(a => (a.days_overdue || 0) > 0 && (a.days_overdue || 0) <= 30).reduce((sum, a) => sum + (a.balance_due || 0), 0) || 0, color: '#eab308' },
    { name: '31-60 ngày', value: apAging?.filter(a => (a.days_overdue || 0) > 30 && (a.days_overdue || 0) <= 60).reduce((sum, a) => sum + (a.balance_due || 0), 0) || 0, color: '#f97316' },
    { name: '> 60 ngày', value: apAging?.filter(a => (a.days_overdue || 0) > 60).reduce((sum, a) => sum + (a.balance_due || 0), 0) || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Top vendors
  const vendorTotals = bills?.reduce((acc, bill) => {
    acc[bill.vendor_name] = (acc[bill.vendor_name] || 0) + (bill.total_amount - (bill.paid_amount || 0));
    return acc;
  }, {} as Record<string, number>) || {};

  const topVendors = Object.entries(vendorTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('bills.title')} | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('bills.title')}
            </h1>
            <p className="text-muted-foreground">{t('bills.subtitle')}</p>
          </div>
          <div className="flex gap-2 items-center">
            <QuickDateSelector />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('bills.refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t('bills.exportExcel')}
            </Button>
            <Link to="/connectors">
              <Button size="sm">
                <Link2 className="w-4 h-4 mr-2" />
                {t('bills.connectSource')}
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Data Source Notice */}
        <DataSourceNotice 
          variant="orange" 
          title={t('cdn.dataSourceTitle')}
          description={t('cdn.dataSourceDesc')}
          showTimestamp
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('bills.totalAP')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAP)}</div>
              <p className="text-xs text-muted-foreground">{pendingCount} {t('bills.pendingBills')}</p>
            </CardContent>
          </Card>

          <Card className={cn(overdueAP > 0 && "border-destructive/50")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('bills.overdueAP')}</CardTitle>
              <AlertTriangle className={cn("h-4 w-4", overdueAP > 0 ? "text-destructive" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", overdueAP > 0 && "text-destructive")}>
                {formatCurrency(overdueAP)}
              </div>
              <p className="text-xs text-muted-foreground">
                {apAging?.filter(a => (a.days_overdue || 0) > 0).length || 0} {t('bills.overdueBills')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('bills.pendingProcess')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">{t('bills.needProcess')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('bills.avgDPO')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDPO} {t('bills.days')}</div>
              <p className="text-xs text-muted-foreground">Days Payable Outstanding</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Analysis */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{t('bills.overview')}</TabsTrigger>
            <TabsTrigger value="aging">{t('bills.agingAnalysis')}</TabsTrigger>
            <TabsTrigger value="list">{t('bills.billList')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('bills.statusBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {statusBreakdown.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Vendors */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('bills.topVendors')}</CardTitle>
                  <CardDescription>{t('bills.byBalance')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topVendors.map(([vendor, amount]) => (
                      <div key={vendor} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[200px]">{vendor}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        <Progress 
                          value={(amount / totalAP) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                    {topVendors.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t('bills.noData')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="aging">
            <Card>
              <CardHeader>
                <CardTitle>{t('bills.apAging')}</CardTitle>
                <CardDescription>{t('bills.apAgingDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agingData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value">
                          {agingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {agingData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('bills.searchPlaceholder')}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('bills.billNumber')}</TableHead>
                      <TableHead>{t('bills.vendor')}</TableHead>
                      <TableHead>{t('bills.billDate')}</TableHead>
                      <TableHead>{t('bills.dueDate')}</TableHead>
                      <TableHead className="text-right">{t('bills.totalAmount')}</TableHead>
                      <TableHead className="text-right">{t('bills.paidAmount')}</TableHead>
                      <TableHead className="text-right">{t('bills.balance')}</TableHead>
                      <TableHead>{t('bills.status')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t('bills.noBills')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBills.slice(0, 20).map((bill) => {
                        const status = statusConfig[bill.status] || statusConfig.draft;
                        const balance = bill.total_amount - (bill.paid_amount || 0);
                        const isOverdue = new Date(bill.due_date) < new Date() && balance > 0;
                        
                        return (
                          <TableRow key={bill.id}>
                            <TableCell className="font-mono font-medium">{bill.bill_number}</TableCell>
                            <TableCell>{bill.vendor_name}</TableCell>
                            <TableCell>{formatDate(bill.bill_date)}</TableCell>
                            <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                              {formatDate(bill.due_date)}
                              {isOverdue && <span className="ml-1 text-xs">(Quá hạn)</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(bill.total_amount)}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{formatCurrency(bill.paid_amount || 0)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(balance)}</TableCell>
                            <TableCell>
                              <Badge className={`${status.color} text-white`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Xem chi tiết
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {filteredBills.length > 20 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Hiển thị 20/{filteredBills.length} hóa đơn
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
