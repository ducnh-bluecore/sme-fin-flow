import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DataSourceNotice } from '@/components/shared/DataSourceNotice';
import { 
  Search, FileText, Clock, CheckCircle2, XCircle, 
  MoreHorizontal, Eye, ArrowDownCircle, ArrowUpCircle, Loader2,
  Download, RefreshCw, Link2, FileSpreadsheet, BarChart3,
  TrendingDown, TrendingUp
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  useCreditNotes, 
  useDebitNotes
} from '@/hooks/useCreditDebitNotes';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
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
  applied: { label: 'Đã áp dụng', color: 'bg-green-500', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: 'bg-red-500', icon: XCircle },
};

const reasonLabels: Record<string, string> = {
  return: 'Trả hàng',
  discount: 'Giảm giá',
  error: 'Sai sót',
  other: 'Khác',
};

const reasonColors: Record<string, string> = {
  return: '#ef4444',
  discount: '#22c55e',
  error: '#f97316',
  other: '#6b7280',
};

export default function CreditDebitNotesPage() {
  const { t } = useLanguage();
  const { data: creditNotes, isLoading: creditLoading, refetch: refetchCredit } = useCreditNotes();
  const { data: debitNotes, isLoading: debitLoading, refetch: refetchDebit } = useDebitNotes();
  const { data: adjustments } = useInvoiceAdjustments();

  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');

  // Use global date range context
  const { startDate, endDate } = useDateRangeForQuery();

  // Filter data by date range
  const filteredCreditNotesByDate = creditNotes?.filter(note => {
    const noteDate = new Date(note.credit_note_date);
    return noteDate >= startDate && noteDate <= endDate;
  }) || [];

  const filteredDebitNotesByDate = debitNotes?.filter(note => {
    const noteDate = new Date(note.debit_note_date);
    return noteDate >= startDate && noteDate <= endDate;
  }) || [];

  // Calculate KPIs from filtered data
  const totalCreditNotes = filteredCreditNotesByDate.filter(n => n.status !== 'cancelled').reduce((sum, n) => sum + n.total_amount, 0) || 0;
  const totalDebitNotes = filteredDebitNotesByDate.filter(n => n.status !== 'cancelled').reduce((sum, n) => sum + n.total_amount, 0) || 0;
  const pendingCredits = filteredCreditNotesByDate.filter(n => n.status === 'pending' || n.status === 'approved').length || 0;
  const pendingDebits = filteredDebitNotesByDate.filter(n => n.status === 'pending' || n.status === 'approved').length || 0;
  const netAdjustment = totalDebitNotes - totalCreditNotes;

  const filteredCreditNotes = filteredCreditNotesByDate.filter(note => 
    note.credit_note_number.toLowerCase().includes(search.toLowerCase()) ||
    (note.customers?.name || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredDebitNotes = filteredDebitNotesByDate.filter(note => 
    note.debit_note_number.toLowerCase().includes(search.toLowerCase()) ||
    (note.customers?.name || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Reason breakdown for credit notes (using filtered data)
  const creditReasonBreakdown = filteredCreditNotesByDate.reduce((acc, note) => {
    if (note.status !== 'cancelled') {
      acc[note.reason] = (acc[note.reason] || 0) + note.total_amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const creditReasonData = Object.entries(creditReasonBreakdown).map(([reason, amount]) => ({
    name: reasonLabels[reason] || reason,
    value: amount,
    color: reasonColors[reason] || '#6b7280',
  }));

  // Monthly trend (using filtered data)
  const monthlyCredits = filteredCreditNotesByDate.reduce((acc, note) => {
    if (note.status !== 'cancelled') {
      try {
        const date = new Date(note.credit_note_date);
        if (!isNaN(date.getTime())) {
          const month = format(date, 'yyyy-MM');
          acc[month] = (acc[month] || 0) + note.total_amount;
        }
      } catch {
        // Skip invalid dates
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const monthlyDebits = filteredDebitNotesByDate.reduce((acc, note) => {
    if (note.status !== 'cancelled') {
      try {
        const date = new Date(note.debit_note_date);
        if (!isNaN(date.getTime())) {
          const month = format(date, 'yyyy-MM');
          acc[month] = (acc[month] || 0) + note.total_amount;
        }
      } catch {
        // Skip invalid dates
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const allMonths = [...new Set([...Object.keys(monthlyCredits), ...Object.keys(monthlyDebits)])].sort();
  const trendData = allMonths.map(month => {
    try {
      return {
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: vi }),
        credit: monthlyCredits[month] || 0,
        debit: monthlyDebits[month] || 0,
      };
    } catch {
      return { month, credit: monthlyCredits[month] || 0, debit: monthlyDebits[month] || 0 };
    }
  });

  const isLoading = creditLoading || debitLoading;

  const handleRefresh = () => {
    refetchCredit();
    refetchDebit();
  };

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
        <title>{t('cdn.title')} | Bluecore Finance</title>
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
              {t('cdn.title')}
            </h1>
            <p className="text-muted-foreground">{t('cdn.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickDateSelector showYears />
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('cdn.refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t('cdn.exportExcel')}
            </Button>
            <Link to="/connectors">
              <Button size="sm">
                <Link2 className="w-4 h-4 mr-2" />
                {t('cdn.connectSource')}
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Data Source Notice */}
        <DataSourceNotice 
          variant="purple" 
          title="Dữ liệu được đồng bộ từ phần mềm kế toán"
          description="Để tạo phiếu điều chỉnh mới, vui lòng thao tác trực tiếp trên phần mềm kế toán gốc hoặc import file tại"
          showTimestamp
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giảm giá (Credit)</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -{formatCurrency(totalCreditNotes)}
              </div>
              <p className="text-xs text-muted-foreground">{creditNotes?.length || 0} phiếu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng phụ thu (Debit)</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                +{formatCurrency(totalDebitNotes)}
              </div>
              <p className="text-xs text-muted-foreground">{debitNotes?.length || 0} phiếu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điều chỉnh ròng</CardTitle>
              {netAdjustment >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netAdjustment >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {netAdjustment >= 0 ? '+' : ''}{formatCurrency(netAdjustment)}
              </div>
              <p className="text-xs text-muted-foreground">Debit - Credit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCredits + pendingDebits}</div>
              <p className="text-xs text-muted-foreground">
                {pendingCredits} credit, {pendingDebits} debit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo số phiếu hoặc khách hàng..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="credit">
              Credit Notes ({creditNotes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="debit">
              Debit Notes ({debitNotes?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Reason Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân loại Credit Notes theo lý do</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={creditReasonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {creditReasonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {creditReasonData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng theo tháng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="credit" name="Credit" fill="#ef4444" />
                        <Bar dataKey="debit" name="Debit" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="credit" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số phiếu</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Hóa đơn gốc</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCreditNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Chưa có phiếu giảm giá nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCreditNotes.slice(0, 20).map((note: any) => {
                        const status = statusConfig[note.status] || statusConfig.draft;
                        return (
                          <TableRow key={note.id}>
                            <TableCell className="font-mono font-medium">{note.credit_note_number}</TableCell>
                            <TableCell>{note.customers?.name || '-'}</TableCell>
                            <TableCell className="font-mono">{note.invoices?.invoice_number || '-'}</TableCell>
                            <TableCell>{formatDate(note.credit_note_date)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: reasonColors[note.reason],
                                  color: reasonColors[note.reason]
                                }}
                              >
                                {reasonLabels[note.reason] || note.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-destructive">
                              -{formatCurrency(note.total_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${status.color} text-white`}>{status.label}</Badge>
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
          </TabsContent>

          <TabsContent value="debit" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số phiếu</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Hóa đơn gốc</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebitNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Chưa có phiếu phụ thu nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDebitNotes.slice(0, 20).map((note: any) => {
                        const status = statusConfig[note.status] || statusConfig.draft;
                        return (
                          <TableRow key={note.id}>
                            <TableCell className="font-mono font-medium">{note.debit_note_number}</TableCell>
                            <TableCell>{note.customers?.name || '-'}</TableCell>
                            <TableCell className="font-mono">{note.invoices?.invoice_number || '-'}</TableCell>
                            <TableCell>{formatDate(note.debit_note_date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {reasonLabels[note.reason] || note.reason}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              +{formatCurrency(note.total_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${status.color} text-white`}>{status.label}</Badge>
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
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
