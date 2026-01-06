import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useBoardReports, BoardReport, RiskItem, StrategicInitiative } from '@/hooks/useBoardReports';
import { 
  FileText, Plus, Calendar, CheckCircle, Clock, Eye, Download, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, Target, BarChart3, PieChart, Users, Trash2, Send, ArrowUpRight,
  ArrowDownRight, Wallet, CreditCard, Building2, Lightbulb, Shield, Activity, Banknote, CalendarRange
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { DateRange } from 'react-day-picker';

const statusConfig = {
  draft: { label: 'Nháp', variant: 'secondary' as const, icon: FileText, color: 'text-muted-foreground' },
  pending_review: { label: 'Chờ duyệt', variant: 'outline' as const, icon: Clock, color: 'text-amber-500' },
  approved: { label: 'Đã duyệt', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
  published: { label: 'Đã xuất bản', variant: 'default' as const, icon: Eye, color: 'text-blue-500' },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const riskSeverityConfig = {
  low: { label: 'Thấp', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  medium: { label: 'Trung bình', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  high: { label: 'Cao', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  critical: { label: 'Nghiêm trọng', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const initiativeStatusConfig = {
  planned: { label: 'Kế hoạch', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  in_progress: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  on_hold: { label: 'Tạm dừng', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
};

export default function BoardReportsPage() {
  const { reports, isLoading, generateReport, updateReport, approveReport, publishReport, deleteReport } = useBoardReports();
  const [selectedReport, setSelectedReport] = useState<BoardReport | null>(null);
  const [newReportType, setNewReportType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now)
    };
  });

  // Auto-update date range when report type changes
  const handleReportTypeChange = (type: 'monthly' | 'quarterly' | 'annual') => {
    setNewReportType(type);
    const now = new Date();
    if (type === 'monthly') {
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    } else if (type === 'quarterly') {
      setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
    } else {
      setDateRange({ from: startOfYear(now), to: endOfYear(now) });
    }
  };

  // Generate period label from date range
  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return '';
    const from = dateRange.from;
    if (newReportType === 'monthly') {
      return `Tháng ${format(from, 'M/yyyy', { locale: vi })}`;
    } else if (newReportType === 'quarterly') {
      const quarter = Math.ceil((from.getMonth() + 1) / 3);
      return `Q${quarter}/${format(from, 'yyyy')}`;
    } else {
      return `Năm ${format(from, 'yyyy')}`;
    }
  }, [dateRange, newReportType]);

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setIsGenerating(true);
    try {
      await generateReport.mutateAsync({
        report_type: newReportType,
        report_period: periodLabel,
        start_date: dateRange.from.toISOString(),
        end_date: dateRange.to.toISOString(),
      });
      setIsDialogOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo HĐQT" subtitle="Tạo và quản lý báo cáo cho Hội đồng Quản trị" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Báo cáo HĐQT | CFO Dashboard</title>
        <meta name="description" content="Tạo và quản lý báo cáo cho Hội đồng Quản trị" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Báo cáo HĐQT" subtitle="Tạo và quản lý báo cáo cho Hội đồng Quản trị" />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo báo cáo mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo báo cáo HĐQT mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loại báo cáo</label>
                  <Select value={newReportType} onValueChange={(v) => handleReportTypeChange(v as typeof newReportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Báo cáo tháng</SelectItem>
                      <SelectItem value="quarterly">Báo cáo quý</SelectItem>
                      <SelectItem value="annual">Báo cáo năm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Khoảng thời gian báo cáo</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarRange className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}
                            </>
                          ) : (
                            format(dateRange.from, 'dd/MM/yyyy', { locale: vi })
                          )
                        ) : (
                          'Chọn khoảng thời gian'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={vi}
                      />
                      <div className="p-3 border-t space-y-2">
                        <p className="text-xs text-muted-foreground">Chọn nhanh:</p>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const now = new Date();
                              setDateRange({ from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) });
                            }}
                          >
                            Tháng trước
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const now = new Date();
                              setDateRange({ from: startOfQuarter(subQuarters(now, 1)), to: endOfQuarter(subQuarters(now, 1)) });
                            }}
                          >
                            Quý trước
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const now = new Date();
                              setDateRange({ from: startOfYear(subYears(now, 1)), to: endOfYear(subYears(now, 1)) });
                            }}
                          >
                            Năm trước
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Kỳ báo cáo: <span className="text-primary">{periodLabel || 'Chưa chọn'}</span></p>
                  {dateRange?.from && dateRange?.to && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dữ liệu từ {format(dateRange.from, 'dd/MM/yyyy')} đến {format(dateRange.to, 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>

                <Button onClick={handleGenerateReport} disabled={!dateRange?.from || !dateRange?.to || isGenerating} className="w-full">
                  {isGenerating ? 'Đang tạo báo cáo...' : 'Tạo báo cáo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng báo cáo</p>
                  <p className="text-2xl font-bold">{reports?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">{reports?.filter(r => r.status === 'pending_review').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã duyệt</p>
                  <p className="text-2xl font-bold">{reports?.filter(r => r.status === 'approved').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã xuất bản</p>
                  <p className="text-2xl font-bold">{reports?.filter(r => r.status === 'published').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports?.map((report) => {
            const status = statusConfig[report.status];
            const StatusIcon = status.icon;
            const financials = report.financial_highlights;
            return (
              <Card 
                key={report.id} 
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => setSelectedReport(report)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{report.report_title}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.report_period}
                      </CardDescription>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {financials && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">Doanh thu:</span>
                        <span className="font-medium">{formatCurrency(financials.total_revenue)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">LN:</span>
                        <span className={`font-medium ${financials.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(financials.net_income)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tạo: {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: vi })}</span>
                    {report.approved_at && (
                      <span className="text-green-600">
                        Duyệt: {format(new Date(report.approved_at), 'dd/MM/yyyy', { locale: vi })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!reports || reports.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Chưa có báo cáo</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bắt đầu bằng cách tạo báo cáo HĐQT đầu tiên
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Report Detail Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {selectedReport && (
              <>
                <DialogHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl">{selectedReport.report_title}</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tạo: {format(new Date(selectedReport.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[selectedReport.status].variant} className="flex items-center gap-1">
                        {statusConfig[selectedReport.status].label}
                      </Badge>
                      {selectedReport.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            updateReport.mutate({ id: selectedReport.id, updates: { status: 'pending_review' } });
                            setSelectedReport({ ...selectedReport, status: 'pending_review' });
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Gửi duyệt
                        </Button>
                      )}
                      {selectedReport.status === 'pending_review' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            approveReport.mutate(selectedReport.id);
                            setSelectedReport({ ...selectedReport, status: 'approved' });
                          }}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Phê duyệt
                        </Button>
                      )}
                      {selectedReport.status === 'approved' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            publishReport.mutate(selectedReport.id);
                            setSelectedReport({ ...selectedReport, status: 'published' });
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xuất bản
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Xuất PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          deleteReport.mutate(selectedReport.id);
                          setSelectedReport(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                  <Tabs defaultValue="summary" className="mt-4">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="summary">Tóm tắt</TabsTrigger>
                      <TabsTrigger value="financials">Tài chính</TabsTrigger>
                      <TabsTrigger value="kpis">KPIs</TabsTrigger>
                      <TabsTrigger value="cashflow">Dòng tiền</TabsTrigger>
                      <TabsTrigger value="risks">Rủi ro</TabsTrigger>
                      <TabsTrigger value="initiatives">Chiến lược</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-4 mt-4">
                      <ExecutiveSummaryTab report={selectedReport} formatCurrency={formatFullCurrency} />
                    </TabsContent>

                    <TabsContent value="financials" className="space-y-4 mt-4">
                      <FinancialsTab report={selectedReport} formatCurrency={formatFullCurrency} />
                    </TabsContent>

                    <TabsContent value="kpis" className="space-y-4 mt-4">
                      <KPIsTab report={selectedReport} formatCurrency={formatFullCurrency} />
                    </TabsContent>

                    <TabsContent value="cashflow" className="space-y-4 mt-4">
                      <CashFlowTab report={selectedReport} formatCurrency={formatFullCurrency} />
                    </TabsContent>

                    <TabsContent value="risks" className="space-y-4 mt-4">
                      <RisksTab report={selectedReport} />
                    </TabsContent>

                    <TabsContent value="initiatives" className="space-y-4 mt-4">
                      <InitiativesTab report={selectedReport} formatCurrency={formatFullCurrency} />
                    </TabsContent>
                  </Tabs>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function ExecutiveSummaryTab({ report, formatCurrency }: { report: BoardReport; formatCurrency: (n: number) => string }) {
  const financials = report.financial_highlights;
  const metrics = report.key_metrics;
  const risks = report.risk_assessment;

  return (
    <div className="space-y-6">
      {/* Key Highlights */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Doanh thu</p>
                <p className="text-lg font-bold">{formatCurrency(financials?.total_revenue || 0)}</p>
                {financials?.revenue_growth !== undefined && (
                  <div className={`flex items-center text-xs ${Number(financials.revenue_growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(financials.revenue_growth) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(Number(financials.revenue_growth)).toFixed(1)}% vs kỳ trước
                  </div>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Lợi nhuận ròng</p>
                <p className={`text-lg font-bold ${(financials?.net_income || 0) >= 0 ? '' : 'text-red-600'}`}>
                  {formatCurrency(financials?.net_income || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Biên LN: {Number(financials?.net_margin ?? 0).toFixed(1)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Số dư tiền mặt</p>
                <p className="text-lg font-bold">{formatCurrency(financials?.cash_balance || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  Dòng vào: {formatCurrency(financials?.cash_inflows || 0)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Công nợ phải thu</p>
                <p className="text-lg font-bold">{formatCurrency(metrics?.total_ar || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  Quá hạn: {formatCurrency(metrics?.overdue_ar || 0)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tóm tắt điều hành
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {report.executive_summary?.split('\n').map((paragraph, i) => (
              <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High Priority Risks Alert */}
      {risks && risks.risks && risks.risks.filter(r => r.severity === 'high' || r.severity === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Rủi ro ưu tiên cao</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {risks.risks.filter(r => r.severity === 'high' || r.severity === 'critical').map(risk => (
                <li key={risk.id}>{risk.title}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Khuyến nghị
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinancialsTab({ report, formatCurrency }: { report: BoardReport; formatCurrency: (n: number) => string }) {
  const financials = report.financial_highlights;
  if (!financials) return <p className="text-muted-foreground">Không có dữ liệu tài chính</p>;

  const revenueBreakdown = [
    { name: 'Đã thu', value: financials.collected_revenue, color: 'hsl(var(--chart-1))' },
    { name: 'Chưa thu', value: financials.uncollected_revenue, color: 'hsl(var(--chart-2))' },
  ];

  const expenseBreakdown = [
    { name: 'COGS', value: financials.cogs, color: 'hsl(var(--chart-3))' },
    { name: 'OPEX', value: financials.opex, color: 'hsl(var(--chart-4))' },
  ];

  const comparisonData = [
    { name: 'Doanh thu', current: financials.total_revenue, previous: financials.prev_revenue },
    { name: 'Chi phí', current: financials.total_expenses, previous: financials.prev_expenses },
    { name: 'Lợi nhuận', current: financials.net_income, previous: financials.prev_net_income },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financials.total_revenue)}</div>
            <div className="flex items-center gap-2 mt-2">
              {Number(financials.revenue_growth ?? 0) >= 0 ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{Number(financials.revenue_growth ?? 0).toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Number(financials.revenue_growth ?? 0).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="h-4 w-4 text-red-500" />
              Chi phí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financials.total_expenses)}</div>
            <div className="flex items-center gap-2 mt-2">
              {Number(financials.expense_growth ?? 0) <= 0 ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {Math.abs(Number(financials.expense_growth ?? 0)).toFixed(1)}%
                </Badge>
              ) : (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{Number(financials.expense_growth ?? 0).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">so với kỳ trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Lợi nhuận ròng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financials.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financials.net_income)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                Biên LN: {Number(financials.net_margin ?? 0).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cơ cấu doanh thu</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cơ cấu chi phí</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">So sánh với kỳ trước</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} className="text-xs" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="previous" name="Kỳ trước" fill="hsl(var(--muted-foreground))" opacity={0.5} />
              <Bar dataKey="current" name="Kỳ này" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân tích biên lợi nhuận</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Biên LN gộp</span>
                <span className="font-medium">{Number(financials.gross_margin ?? 0).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(Number(financials.gross_margin ?? 0), 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Biên LN hoạt động</span>
                <span className="font-medium">{Number(financials.operating_margin ?? 0).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(Number(financials.operating_margin ?? 0), 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Biên LN ròng</span>
                <span className="font-medium">{Number(financials.net_margin ?? 0).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(Math.max(Number(financials.net_margin ?? 0), 0), 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPIsTab({ report, formatCurrency }: { report: BoardReport; formatCurrency: (n: number) => string }) {
  const metrics = report.key_metrics;
  if (!metrics) return <p className="text-muted-foreground">Không có dữ liệu KPI</p>;

  return (
    <div className="space-y-6">
      {/* Working Capital Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Chỉ số vốn lưu động
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{metrics.dso ?? 0}</p>
              <p className="text-sm text-muted-foreground">DSO (ngày)</p>
              <p className="text-xs text-muted-foreground mt-1">Days Sales Outstanding</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{metrics.dpo ?? 0}</p>
              <p className="text-sm text-muted-foreground">DPO (ngày)</p>
              <p className="text-xs text-muted-foreground mt-1">Days Payable Outstanding</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{metrics.dio ?? 0}</p>
              <p className="text-sm text-muted-foreground">DIO (ngày)</p>
              <p className="text-xs text-muted-foreground mt-1">Days Inventory Outstanding</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className={`text-3xl font-bold ${(metrics.ccc ?? 0) > 60 ? 'text-amber-500' : 'text-green-500'}`}>{metrics.ccc ?? 0}</p>
              <p className="text-sm text-muted-foreground">CCC (ngày)</p>
              <p className="text-xs text-muted-foreground mt-1">Cash Conversion Cycle</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AR Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Công nợ phải thu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tổng AR</p>
                <p className="text-xl font-bold">{formatCurrency(metrics.total_ar ?? 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quá hạn</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(metrics.overdue_ar ?? 0)}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{metrics.invoice_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Tổng HĐ</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{metrics.paid_invoice_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Đã thanh toán</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{metrics.overdue_invoice_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Quá hạn</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tỷ lệ thu hồi</span>
                <span className="font-medium">{Number(metrics.collection_rate ?? 0).toFixed(1)}%</span>
              </div>
              <Progress value={Number(metrics.collection_rate ?? 0)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics.top_customers || []).map((customer, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm truncate max-w-[150px]">{customer.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(Number(customer.amount ?? 0))}</p>
                    <p className="text-xs text-muted-foreground">{Number(customer.percentage ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
              {(!metrics.top_customers || metrics.top_customers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Chỉ số tài chính
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Current Ratio</span>
                <span className={`font-medium ${Number(metrics.current_ratio ?? 0) >= 1.5 ? 'text-green-600' : Number(metrics.current_ratio ?? 0) >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                  {Number(metrics.current_ratio ?? 0).toFixed(2)}
                </span>
              </div>
              <Progress value={(Number(metrics.current_ratio ?? 0) / 3) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Tốt: &gt; 1.5</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Quick Ratio</span>
                <span className={`font-medium ${Number(metrics.quick_ratio ?? 0) >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                  {Number(metrics.quick_ratio ?? 0).toFixed(2)}
                </span>
              </div>
              <Progress value={(Number(metrics.quick_ratio ?? 0) / 2) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Tốt: &gt; 1.0</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Debt Ratio</span>
                <span className={`font-medium ${Number(metrics.debt_ratio ?? 0) <= 0.5 ? 'text-green-600' : 'text-amber-600'}`}>
                  {(Number(metrics.debt_ratio ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={Number(metrics.debt_ratio ?? 0) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">Tốt: &lt; 50%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CashFlowTab({ report, formatCurrency }: { report: BoardReport; formatCurrency: (n: number) => string }) {
  const financials = report.financial_highlights;
  const cashFlowAnalysis = (report as any).cash_flow_analysis;
  
  // Use real cash flow data from analysis
  const cashFlowData = [
    { name: 'Hoạt động KD', value: cashFlowAnalysis?.operating_cash_flow || (financials?.cash_inflows || 0) * 0.7, positive: (cashFlowAnalysis?.operating_cash_flow || 0) >= 0 },
    { name: 'Đầu tư', value: Math.abs(cashFlowAnalysis?.investing_cash_flow || (financials?.cash_outflows || 0) * 0.15), positive: (cashFlowAnalysis?.investing_cash_flow || 0) >= 0 },
    { name: 'Tài chính', value: Math.abs(cashFlowAnalysis?.financing_cash_flow || (financials?.cash_outflows || 0) * 0.15), positive: (cashFlowAnalysis?.financing_cash_flow || 0) >= 0 },
  ];

  // Use monthly trend from cash flow analysis or empty array
  const monthlyTrend = cashFlowAnalysis?.monthly_trend || [];

  const burnRate = cashFlowAnalysis?.burn_rate || Math.abs((financials?.cash_outflows || 0) - (financials?.cash_inflows || 0));
  const cashRunway = cashFlowAnalysis?.cash_runway_months || (burnRate > 0 ? Math.round((financials?.cash_balance || 0) / burnRate * 30) : 99);

  return (
    <div className="space-y-6">
      {/* Cash Position */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Số dư tiền mặt</p>
                <p className="text-xl font-bold">{formatCurrency(financials?.cash_balance || 0)}</p>
              </div>
              <Wallet className="h-6 w-6 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dòng tiền vào</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(financials?.cash_inflows || 0)}</p>
              </div>
              <ArrowUpRight className="h-6 w-6 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dòng tiền ra</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(financials?.cash_outflows || 0)}</p>
              </div>
              <ArrowDownRight className="h-6 w-6 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cash Runway</p>
                <p className={`text-xl font-bold ${cashRunway < 6 ? 'text-red-600' : cashRunway < 12 ? 'text-amber-600' : 'text-green-600'}`}>
                  {cashRunway > 90 ? '> 90' : cashRunway} tháng
                </p>
              </div>
              <Activity className="h-6 w-6 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng dòng tiền 6 tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} className="text-xs" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="inflow" name="Dòng vào" fill="hsl(142, 76%, 36%)" opacity={0.8} />
              <Bar dataKey="outflow" name="Dòng ra" fill="hsl(0, 84%, 60%)" opacity={0.8} />
              <Line type="monotone" dataKey="net" name="Dòng tiền ròng" stroke="hsl(var(--primary))" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Báo cáo dòng tiền</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashFlowData.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{item.name}</span>
                <span className={`font-medium ${item.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {item.positive ? '+' : '-'}{formatCurrency(item.value)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="font-medium">Dòng tiền ròng</span>
              <span className={`text-lg font-bold ${(financials?.cash_inflows || 0) - (financials?.cash_outflows || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((financials?.cash_inflows || 0) - (financials?.cash_outflows || 0))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RisksTab({ report }: { report: BoardReport }) {
  const riskAssessment = report.risk_assessment;
  const risks = riskAssessment?.risks || [];

  const risksByCategory = risks.reduce((acc, risk) => {
    if (!acc[risk.category]) acc[risk.category] = [];
    acc[risk.category].push(risk);
    return acc;
  }, {} as Record<string, RiskItem[]>);

  const categoryLabels = {
    liquidity: 'Thanh khoản',
    credit: 'Tín dụng',
    operational: 'Hoạt động',
    market: 'Thị trường',
    compliance: 'Tuân thủ',
  };

  const riskDistribution = Object.entries(risksByCategory).map(([category, items]) => ({
    name: categoryLabels[category as keyof typeof categoryLabels] || category,
    value: items.length,
  }));

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{risks.length}</p>
              <p className="text-sm text-muted-foreground">Tổng rủi ro</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {risks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
              </p>
              <p className="text-sm text-muted-foreground">Rủi ro cao</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {risks.filter(r => r.severity === 'medium').length}
              </p>
              <p className="text-sm text-muted-foreground">Rủi ro TB</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {risks.filter(r => r.severity === 'low').length}
              </p>
              <p className="text-sm text-muted-foreground">Rủi ro thấp</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Chart */}
      {riskDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân bổ rủi ro theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Chi tiết rủi ro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500/50 mx-auto" />
              <p className="mt-4 text-muted-foreground">Không phát hiện rủi ro đáng kể</p>
            </div>
          ) : (
            <div className="space-y-4">
              {risks.sort((a, b) => b.risk_score - a.risk_score).map((risk) => (
                <div key={risk.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={riskSeverityConfig[risk.severity].color}>
                        {riskSeverityConfig[risk.severity].label}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[risk.category as keyof typeof categoryLabels]}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Score: {(Number(risk.risk_score) * 100).toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{risk.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Biện pháp giảm thiểu:</p>
                    <p className="text-sm">{risk.mitigation}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Người phụ trách: {risk.owner}</span>
                    <Badge variant="outline" className="text-xs">
                      {risk.status === 'identified' ? 'Đã xác định' : 
                       risk.status === 'monitoring' ? 'Đang theo dõi' :
                       risk.status === 'mitigating' ? 'Đang xử lý' : 'Đã giải quyết'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InitiativesTab({ report, formatCurrency }: { report: BoardReport; formatCurrency: (n: number) => string }) {
  const strategicInitiatives = report.strategic_initiatives;
  const initiatives = strategicInitiatives?.initiatives || [];

  const categoryLabels = {
    growth: 'Tăng trưởng',
    efficiency: 'Hiệu quả',
    innovation: 'Đổi mới',
    risk_management: 'Quản lý rủi ro',
  };

  const totalBudget = initiatives.reduce((sum, i) => sum + i.budget, 0);
  const totalSpent = initiatives.reduce((sum, i) => sum + i.spent, 0);
  const avgProgress = initiatives.length > 0 
    ? initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{initiatives.length}</p>
              <p className="text-sm text-muted-foreground">Sáng kiến</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(totalBudget)}</p>
              <p className="text-sm text-muted-foreground">Tổng ngân sách</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-muted-foreground">Đã chi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{Number(avgProgress).toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Tiến độ TB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Danh sách sáng kiến
          </CardTitle>
        </CardHeader>
        <CardContent>
          {initiatives.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <p className="mt-4 text-muted-foreground">Chưa có sáng kiến chiến lược</p>
            </div>
          ) : (
            <div className="space-y-4">
              {initiatives.map((initiative) => (
                <div key={initiative.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {categoryLabels[initiative.category as keyof typeof categoryLabels]}
                        </Badge>
                        <Badge className={initiativeStatusConfig[initiative.status].color}>
                          {initiativeStatusConfig[initiative.status].label}
                        </Badge>
                        <Badge variant={initiative.priority === 'high' ? 'destructive' : initiative.priority === 'medium' ? 'default' : 'secondary'}>
                          {initiative.priority === 'high' ? 'Cao' : initiative.priority === 'medium' ? 'TB' : 'Thấp'}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{initiative.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{initiative.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tiến độ</span>
                      <span className="font-medium">{initiative.progress}%</span>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ngân sách</p>
                      <p className="font-medium">{formatCurrency(initiative.budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Đã chi</p>
                      <p className="font-medium">{formatCurrency(initiative.spent)} ({((Number(initiative.spent) / Number(initiative.budget)) * 100).toFixed(0)}%)</p>
                    </div>
                  </div>

                  {initiative.kpis.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">KPIs mục tiêu:</p>
                      <div className="flex flex-wrap gap-1">
                        {initiative.kpis.map((kpi, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kpi}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {initiative.milestones.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Milestones:</p>
                      <div className="space-y-1">
                        {initiative.milestones.map((milestone, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {milestone.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                              {milestone.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({format(new Date(milestone.date), 'dd/MM/yyyy')})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
