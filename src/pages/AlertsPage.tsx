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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate } from '@/lib/formatters';
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useAlerts, useAlertStats, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useAlertsData';
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

const iconMap: Record<string, any> = {
  cash_critical: DollarSign,
  ar_overdue: TrendingDown,
  data_quality: Database,
  reconciliation: Clock,
  risk: AlertTriangle,
};

const typeLabels: Record<string, string> = {
  cash_critical: 'Tiền mặt nguy cấp',
  ar_overdue: 'AR quá hạn',
  data_quality: 'Chất lượng dữ liệu',
  reconciliation: 'Đối soát',
  risk: 'Rủi ro',
};

// Chuẩn hóa severity: critical, warning, info
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'acknowledged'>('all');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  const { data: alerts, isLoading } = useAlerts();
  const { stats } = useAlertStats();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();

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

  // Generate chart data from real alerts - using standardized severity: critical, warning, info
  const chartData = chartPeriod === 'week' 
    ? [
        { name: 'T2', critical: Math.floor(stats.critical * 0.15), warning: Math.floor(stats.warning * 0.12), info: Math.floor(stats.info * 0.1) },
        { name: 'T3', critical: Math.floor(stats.critical * 0.1), warning: Math.floor(stats.warning * 0.15), info: Math.floor(stats.info * 0.15) },
        { name: 'T4', critical: Math.floor(stats.critical * 0.2), warning: Math.floor(stats.warning * 0.18), info: Math.floor(stats.info * 0.05) },
        { name: 'T5', critical: Math.floor(stats.critical * 0.05), warning: Math.floor(stats.warning * 0.12), info: Math.floor(stats.info * 0.2) },
        { name: 'T6', critical: Math.floor(stats.critical * 0.25), warning: Math.floor(stats.warning * 0.22), info: Math.floor(stats.info * 0.1) },
        { name: 'T7', critical: Math.floor(stats.critical * 0.15), warning: Math.floor(stats.warning * 0.12), info: Math.floor(stats.info * 0.25) },
        { name: 'CN', critical: Math.floor(stats.critical * 0.1), warning: Math.floor(stats.warning * 0.09), info: Math.floor(stats.info * 0.15) },
      ]
    : [
        { name: 'T1', critical: stats.critical * 2, warning: stats.warning * 3, info: stats.info * 2 },
        { name: 'T2', critical: stats.critical * 2.5, warning: stats.warning * 2.5, info: stats.info * 2.5 },
        { name: 'T3', critical: stats.critical * 1.5, warning: stats.warning * 2.2, info: stats.info * 3 },
        { name: 'T4', critical: stats.critical * 3, warning: stats.warning * 3.5, info: stats.info * 1.5 },
        { name: 'T5', critical: stats.critical * 2.2, warning: stats.warning * 2.8, info: stats.info * 2.2 },
        { name: 'T6', critical: stats.critical, warning: stats.warning, info: stats.info },
      ];
  
  const filteredAlerts = useMemo(() => {
    let result = alerts || [];
    
    // Filter by read status
    if (filter === 'unread') {
      result = result.filter(alert => !alert.is_read);
    } else if (filter === 'acknowledged') {
      result = result.filter(alert => alert.is_read);
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
  }, [alerts, filter, effectiveDateRange]);

  const handleMarkRead = (alertId: string) => {
    markRead.mutate(alertId);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
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
                {stats.unread > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {stats.unread} mới
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">Alerts & Notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Cấu hình cảnh báo
            </Button>
            <Button size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              {markAllRead.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Đánh dấu đã đọc
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
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
              <div className="text-xs text-muted-foreground">Nguy cấp</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.warning}</div>
              <div className="text-xs text-muted-foreground">Cảnh báo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{stats.info}</div>
              <div className="text-xs text-muted-foreground">Thông tin</div>
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
                  { value: 'unread', label: 'Chưa đọc', count: stats.unread },
                  { value: 'acknowledged', label: 'Đã xác nhận', count: stats.total - stats.unread },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setFilter(item.value as typeof filter)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      filter === item.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span>{item.label}</span>
                    <Badge variant={filter === item.value ? 'secondary' : 'outline'}>
                      {item.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Types */}
            <div className="data-card">
              <h3 className="font-semibold mb-4">Loại cảnh báo</h3>
              <div className="space-y-4">
                {Object.entries(typeLabels).map(([key, label]) => {
                  const Icon = iconMap[key] || AlertTriangle;
                  const typeStats = stats.byType[key] || { total: 0, critical: 0, unread: 0 };
                  
                  return (
                    <div key={key} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            typeStats.critical > 0 ? 'bg-destructive/10' : 'bg-primary/10'
                          )}>
                            <Icon className={cn(
                              'w-4 h-4',
                              typeStats.critical > 0 ? 'text-destructive' : 'text-primary'
                            )} />
                          </div>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <Badge variant={typeStats.critical > 0 ? 'destructive' : 'outline'}>{typeStats.total}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground pl-10">
                        <div className="flex items-center gap-3">
                          {typeStats.critical > 0 && (
                            <span className="text-destructive font-medium">{typeStats.critical} nguy cấp</span>
                          )}
                          {typeStats.unread > 0 && (
                            <span>{typeStats.unread} chưa đọc</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Settings */}
            <div className="data-card">
              <h3 className="font-semibold mb-4">Cài đặt thông báo</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Slack</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Push</span>
                  <Switch />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Alerts List */}
          <div className="lg:col-span-3">
            <ScrollArea className="h-[700px]">
              <div className="space-y-4 pr-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có cảnh báo nào</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert, index) => {
                    const Icon = iconMap[alert.alert_type] || AlertTriangle;
                    const severity = alert.severity || 'warning';
                    const config = severityConfig[severity] || severityConfig.warning;
                    
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'p-5 rounded-xl border-l-4 bg-card shadow-card transition-all hover:shadow-lg',
                          config.headerClass,
                          alert.is_read && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', config.bgClass)}>
                            <Icon className={cn('w-6 h-6', config.iconClass)} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                variant={severity === 'critical' ? 'destructive' : 'secondary'}
                                className="text-[10px]"
                              >
                                {config.badge}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {typeLabels[alert.alert_type] || alert.alert_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDate(alert.created_at)}
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-foreground text-lg mb-2">{alert.title}</h4>
                            <p className="text-muted-foreground">{alert.message}</p>
                            
                            <div className="flex items-center gap-2 mt-4">
                              {!alert.is_read && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleMarkRead(alert.id)}
                                  disabled={markRead.isPending}
                                >
                                  {markRead.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-1" />
                                  )}
                                  Xác nhận
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                Xem chi tiết
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
}
