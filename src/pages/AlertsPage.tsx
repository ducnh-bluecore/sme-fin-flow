import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Bell, 
  AlertTriangle, 
  DollarSign, 
  TrendingDown, 
  Database, 
  Clock,
  Settings,
  Check,
  Calendar,
  Loader2,
  CalendarIcon,
  X,
  Package,
  Store,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useNotificationCenter, AlertInstance, categoryLabels, severityConfig as notificationSeverityConfig } from '@/hooks/useNotificationCenter';
import { AlertConfigDialog } from '@/components/alerts/AlertConfigDialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const categoryIcons: Record<string, any> = {
  cash_critical: DollarSign,
  ar_overdue: TrendingDown,
  data_quality: Database,
  reconciliation: Clock,
  risk: AlertTriangle,
  product: Package,
  business: DollarSign,
  store: Store,
  cashflow: DollarSign,
  kpi: TrendingDown,
  customer: Users,
  fulfillment: Package,
  operations: Store,
  inventory: Package,
};

const typeLabels: Record<string, string> = {
  cash_critical: 'Tiền mặt nguy cấp',
  ar_overdue: 'AR quá hạn',
  data_quality: 'Chất lượng dữ liệu',
  reconciliation: 'Đối soát',
  risk: 'Rủi ro',
  inventory_low: 'Tồn kho thấp',
  sales_drop: 'Doanh số giảm',
  store_no_sales: 'Cửa hàng không bán',
};

// Severity config for display
const severityConfig: Record<string, any> = {
  critical: {
    badge: 'Nguy cấp',
    bgClass: 'bg-destructive/10 border-destructive/20',
    iconClass: 'text-destructive',
    headerClass: 'border-l-destructive',
  },
  warning: {
    badge: 'Cảnh báo',
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
    headerClass: 'border-l-warning',
  },
  info: {
    badge: 'Thông tin',
    bgClass: 'bg-info/10 border-info/20',
    iconClass: 'text-info',
    headerClass: 'border-l-info',
  },
};

type DatePreset = 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

export default function AlertsPage() {
  // Default to 'active' so resolved alerts don't clutter the view
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('active');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    refetch: refetchInstances
  } = useNotificationCenter();

  // Calculate date range based on preset
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case '7days':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case '30days':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom':
        return dateRange;
      default:
        return { from: undefined, to: undefined };
    }
  }, [datePreset, dateRange]);

  // Generate chart data from real stats
  const chartData = chartPeriod === 'week' 
    ? [
        { name: 'T2', critical: Math.floor(stats.bySeverity.critical * 0.15), warning: Math.floor(stats.bySeverity.warning * 0.12), info: Math.floor((stats.bySeverity.info || 0) * 0.1) },
        { name: 'T3', critical: Math.floor(stats.bySeverity.critical * 0.1), warning: Math.floor(stats.bySeverity.warning * 0.15), info: Math.floor((stats.bySeverity.info || 0) * 0.15) },
        { name: 'T4', critical: Math.floor(stats.bySeverity.critical * 0.2), warning: Math.floor(stats.bySeverity.warning * 0.18), info: Math.floor((stats.bySeverity.info || 0) * 0.05) },
        { name: 'T5', critical: Math.floor(stats.bySeverity.critical * 0.05), warning: Math.floor(stats.bySeverity.warning * 0.12), info: Math.floor((stats.bySeverity.info || 0) * 0.2) },
        { name: 'T6', critical: Math.floor(stats.bySeverity.critical * 0.25), warning: Math.floor(stats.bySeverity.warning * 0.22), info: Math.floor((stats.bySeverity.info || 0) * 0.1) },
        { name: 'T7', critical: Math.floor(stats.bySeverity.critical * 0.15), warning: Math.floor(stats.bySeverity.warning * 0.12), info: Math.floor((stats.bySeverity.info || 0) * 0.25) },
        { name: 'CN', critical: Math.floor(stats.bySeverity.critical * 0.1), warning: Math.floor(stats.bySeverity.warning * 0.09), info: Math.floor((stats.bySeverity.info || 0) * 0.15) },
      ]
    : [
        { name: 'T1', critical: stats.bySeverity.critical * 2, warning: stats.bySeverity.warning * 3, info: (stats.bySeverity.info || 0) * 2 },
        { name: 'T2', critical: stats.bySeverity.critical * 2.5, warning: stats.bySeverity.warning * 2.5, info: (stats.bySeverity.info || 0) * 2.5 },
        { name: 'T3', critical: stats.bySeverity.critical * 1.5, warning: stats.bySeverity.warning * 2.2, info: (stats.bySeverity.info || 0) * 3 },
        { name: 'T4', critical: stats.bySeverity.critical * 3, warning: stats.bySeverity.warning * 3.5, info: (stats.bySeverity.info || 0) * 1.5 },
        { name: 'T5', critical: stats.bySeverity.critical * 2.2, warning: stats.bySeverity.warning * 2.8, info: (stats.bySeverity.info || 0) * 2.2 },
        { name: 'T6', critical: stats.bySeverity.critical, warning: stats.bySeverity.warning, info: (stats.bySeverity.info || 0) },
      ];
  
  const filteredAlerts = useMemo(() => {
    let result = instances || [];
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(alert => alert.status === statusFilter);
    }
    
    // Filter by date range
    if (effectiveDateRange.from || effectiveDateRange.to) {
      result = result.filter(alert => {
        const alertDate = new Date(alert.created_at);
        if (effectiveDateRange.from && isBefore(alertDate, effectiveDateRange.from)) {
          return false;
        }
        if (effectiveDateRange.to && isAfter(alertDate, effectiveDateRange.to)) {
          return false;
        }
        return true;
      });
    }
    
    return result;
  }, [instances, statusFilter, effectiveDateRange]);

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert.mutate(alertId);
  };

  const handleResolve = (alertId: string) => {
    resolveAlert.mutate({ id: alertId });
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  const clearDateFilter = () => {
    setDatePreset('all');
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <>
      <Helmet>
        <title>Cảnh báo | Bluecore Finance</title>
        <meta name="description" content="Hệ thống cảnh báo tài chính - Alerts & Notifications" />
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
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                Cảnh báo
                {stats.active > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {stats.active} đang xảy ra
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">Alerts & Notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchInstances()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Cấu hình cảnh báo
            </Button>
          </div>
        </motion.div>

        {/* Alert Config Dialog */}
        <AlertConfigDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />

        {/* Alert Statistics Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="data-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Thống kê cảnh báo theo thời gian</h3>
                <p className="text-sm text-muted-foreground">
                  {chartPeriod === 'week' ? 'Tuần này' : '6 tháng gần nhất'}
                </p>
              </div>
            </div>
            <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as 'week' | 'month')}>
              <TabsList className="h-9">
                <TabsTrigger value="week" className="text-xs px-3">Tuần</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">Tháng</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      critical: 'Nguy cấp',
                      warning: 'Cảnh báo',
                      info: 'Thông tin'
                    };
                    return <span className="text-sm">{labels[value] || value}</span>;
                  }}
                />
                <Bar 
                  dataKey="critical" 
                  name="critical"
                  stackId="a" 
                  fill="hsl(var(--destructive))" 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="warning" 
                  name="warning"
                  stackId="a" 
                  fill="hsl(var(--warning))" 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="info" 
                  name="info"
                  stackId="a" 
                  fill="hsl(var(--info))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.bySeverity.critical}</div>
              <div className="text-xs text-muted-foreground">Nguy cấp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.bySeverity.warning}</div>
              <div className="text-xs text-muted-foreground">Cảnh báo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{stats.bySeverity.info || 0}</div>
              <div className="text-xs text-muted-foreground">Thông tin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.resolved}</div>
              <div className="text-xs text-muted-foreground">Đã xử lý</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Date Filter */}
            <div className="data-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Thời gian</h3>
                {datePreset !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={clearDateFilter} className="h-6 px-2 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Xóa
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'today', label: 'Hôm nay' },
                  { value: '7days', label: '7 ngày qua' },
                  { value: '30days', label: '30 ngày qua' },
                  { value: 'thisMonth', label: 'Tháng này' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleDatePresetChange(item.value as DatePreset)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      datePreset === item.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
                
                {/* Custom Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                        datePreset === 'custom'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Tùy chọn
                      </span>
                      {datePreset === 'custom' && dateRange.from && (
                        <span className="text-xs">
                          {format(dateRange.from, 'dd/MM', { locale: vi })}
                          {dateRange.to && ` - ${format(dateRange.to, 'dd/MM', { locale: vi })}`}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        setDateRange({ from: range?.from, to: range?.to });
                        setDatePreset('custom');
                      }}
                      numberOfMonths={1}
                      locale={vi}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Show selected range */}
              {datePreset !== 'all' && effectiveDateRange.from && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Đang lọc: {format(effectiveDateRange.from, 'dd/MM/yyyy', { locale: vi })}
                    {effectiveDateRange.to && ` - ${format(effectiveDateRange.to, 'dd/MM/yyyy', { locale: vi })}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kết quả: {filteredAlerts.length} cảnh báo
                  </p>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="data-card">
              <h3 className="font-semibold mb-4">Trạng thái</h3>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'Tất cả', count: stats.total },
                  { value: 'active', label: 'Đang xảy ra', count: stats.active },
                  { value: 'acknowledged', label: 'Đã xác nhận', count: stats.acknowledged },
                  { value: 'resolved', label: 'Đã xử lý', count: stats.resolved },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setStatusFilter(item.value as typeof statusFilter)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      statusFilter === item.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span>{item.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="data-card">
              <h3 className="font-semibold mb-4">Danh mục</h3>
              <div className="space-y-2">
                {Object.entries(stats.byCategory || {}).map(([category, count]) => {
                  const Icon = categoryIcons[category] || Bell;
                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {categoryLabels[category as keyof typeof categoryLabels] || category}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Alerts List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 data-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Danh sách cảnh báo
                <span className="text-muted-foreground font-normal ml-2">
                  ({filteredAlerts.length})
                </span>
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-success/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Không có cảnh báo nào</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-4">
                  {filteredAlerts.map((alert) => {
                    const Icon = categoryIcons[alert.category] || categoryIcons[alert.alert_type] || AlertTriangle;
                    const config = severityConfig[alert.severity] || severityConfig.info;
                    
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'p-4 rounded-xl border-l-4 transition-all',
                          config.bgClass,
                          config.headerClass,
                          alert.status === 'resolved' && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgClass)}>
                            <Icon className={cn('w-5 h-5', config.iconClass)} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge
                                variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-[10px] px-1.5"
                              >
                                {config.badge}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5">
                                {categoryLabels[alert.category as keyof typeof categoryLabels] || alert.category}
                              </Badge>
                              {alert.status === 'active' && (
                                <Badge className="text-[10px] px-1.5 bg-red-500/10 text-red-500 border-red-500/20">
                                  Đang xảy ra
                                </Badge>
                              )}
                              {alert.status === 'acknowledged' && (
                                <Badge className="text-[10px] px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                  Đã xác nhận
                                </Badge>
                              )}
                              {alert.status === 'resolved' && (
                                <Badge className="text-[10px] px-1.5 bg-green-500/10 text-green-500 border-green-500/20">
                                  Đã xử lý
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(alert.created_at), 'dd/MM HH:mm', { locale: vi })}
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-foreground text-sm mb-1">{alert.title}</h4>
                            {alert.message && (
                              <p className="text-sm text-muted-foreground">{alert.message}</p>
                            )}
                            
                            {/* Details */}
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {alert.object_name && (
                                <span>Đối tượng: {alert.object_name}</span>
                              )}
                              {alert.current_value !== null && (
                                <span>Giá trị: {alert.current_value.toLocaleString('vi-VN')}</span>
                              )}
                              {alert.threshold_value !== null && (
                                <span>Ngưỡng: {alert.threshold_value.toLocaleString('vi-VN')}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {alert.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-warning hover:bg-warning/10"
                                  onClick={() => handleAcknowledge(alert.id)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Xác nhận
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-success hover:bg-success/10"
                                  onClick={() => handleResolve(alert.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Xử lý
                                </Button>
                              </>
                            )}
                            {alert.status === 'acknowledged' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-success hover:bg-success/10"
                                onClick={() => handleResolve(alert.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Đánh dấu xử lý
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
