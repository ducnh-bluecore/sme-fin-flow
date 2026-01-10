import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
  Truck,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotificationCenter, severityConfig, statusLabels } from '@/hooks/useNotificationCenter';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  isLoading?: boolean;
}

function KPICard({ title, value, change, changeLabel, icon: Icon, color, isLoading }: KPICardProps) {
  const isPositive = (change ?? 0) >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">{title}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <p className="text-2xl font-bold text-slate-100">{value}</p>
              )}
              {change !== undefined && changeLabel && (
                <div className="flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span className={isPositive ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>
                    {isPositive ? '+' : ''}{change}%
                  </span>
                  <span className="text-slate-500 text-sm">{changeLabel}</span>
                </div>
              )}
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AlertItem({ alert, onAcknowledge, onResolve }: { 
  alert: any; 
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border ${config.bgColor} border-${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}-500/30`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 line-clamp-1">{alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{alert.message}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}
            </p>
            <div className="flex gap-1">
              {alert.status === 'active' && (
                <>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs text-amber-400 hover:bg-amber-500/10"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Xác nhận
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => onResolve(alert.id)}
                  >
                    Xử lý
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ControlTowerDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  
  const { 
    activeAlerts, 
    stats, 
    isLoading,
    acknowledgeAlert,
    resolveAlert,
    refetchAll 
  } = useNotificationCenter();

  // Fetch store performance from alert_objects
  const { data: storeData, isLoading: storesLoading } = useQuery({
    queryKey: ['control-tower-stores', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('alert_objects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('object_type', 'store')
        .eq('is_monitored', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch quick stats
  const { data: quickStats, isLoading: quickStatsLoading } = useQuery({
    queryKey: ['control-tower-quick-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      // Get orders count
      const { count: ordersCount } = await supabase
        .from('external_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('order_date', new Date().toISOString().split('T')[0]);

      // Get products count
      const { count: productsCount } = await supabase
        .from('alert_objects')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('object_type', 'product');

      // Get active stores
      const stores = storeData || [];
      const activeStores = stores.length;

      // Calculate total revenue from stores
      const totalRevenue = stores.reduce((sum, store) => {
        const metrics = store.current_metrics as any;
        return sum + (metrics?.daily_revenue || 0);
      }, 0);

      return {
        todayOrders: ordersCount || 0,
        productsCount: productsCount || 0,
        activeStores,
        totalRevenue,
      };
    },
    enabled: !!tenantId && !!storeData,
  });

  const handleRunDetection = async () => {
    if (!tenantId) return;
    
    toast.loading('Đang quét cảnh báo...', { id: 'detection' });
    
    try {
      const { data, error } = await supabase.functions.invoke('detect-alerts', {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;

      toast.success(`Đã quét xong: ${data.result?.triggered || 0} cảnh báo mới`, { id: 'detection' });
      refetchAll();
    } catch (err) {
      toast.error('Lỗi khi quét cảnh báo', { id: 'detection' });
      console.error(err);
    }
  };

  const storePerformance = (storeData || []).map(store => {
    const metrics = store.current_metrics as any;
    const revenue = metrics?.daily_revenue || 0;
    const target = metrics?.target_revenue || 1;
    return {
      name: store.object_name,
      revenue: revenue / 1000000,
      target: target / 1000000,
      progress: Math.round((revenue / target) * 100),
    };
  }).sort((a, b) => b.progress - a.progress);

  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  return (
    <>
      <Helmet>
        <title>Control Tower | Operation System</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Control Tower Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Tổng quan vận hành thời gian thực</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRunDetection}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Quét cảnh báo
            </Button>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              Live Data
            </Badge>
          </div>
        </div>

        {/* Alert Summary Banner */}
        {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${
              criticalAlerts.length > 0 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-red-400' : 'text-amber-400'}`} />
                <div>
                  <p className="font-medium text-slate-100">
                    {criticalAlerts.length > 0 
                      ? `🚨 ${criticalAlerts.length} cảnh báo nguy cấp cần xử lý ngay`
                      : `⚠️ ${warningAlerts.length} cảnh báo cần chú ý`
                    }
                  </p>
                  <p className="text-sm text-slate-400">
                    Tổng: {stats.active} đang hoạt động, {stats.acknowledged} đã xác nhận
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => navigate('/control-tower/alerts')}
                className="text-amber-400 hover:bg-amber-500/10"
              >
                Xem tất cả
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Doanh thu hôm nay" 
            value={quickStats ? `₫${(quickStats.totalRevenue / 1000000).toFixed(1)}M` : '₫0'} 
            change={12.5}
            changeLabel="vs hôm qua"
            icon={DollarSign} 
            color="#10B981" 
            isLoading={quickStatsLoading}
          />
          <KPICard 
            title="Đơn hàng mới" 
            value={quickStats?.todayOrders?.toString() || '0'} 
            change={8.2}
            changeLabel="vs hôm qua"
            icon={ShoppingCart} 
            color="#3B82F6" 
            isLoading={quickStatsLoading}
          />
          <KPICard 
            title="Cảnh báo đang hoạt động" 
            value={`${stats.active} (${stats.bySeverity.critical} critical)`}
            icon={AlertTriangle} 
            color="#F59E0B" 
            isLoading={isLoading}
          />
          <KPICard 
            title="Cửa hàng hoạt động" 
            value={`${storePerformance.length}/${storePerformance.length}`}
            icon={Store} 
            color="#8B5CF6" 
            isLoading={storesLoading}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Cảnh báo cần xử lý
                </CardTitle>
                {stats.active > 0 && (
                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/30">
                    {stats.active} active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20 bg-slate-800" />
                ))
              ) : activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                  <p>Không có cảnh báo nào</p>
                  <p className="text-sm">Hệ thống đang hoạt động bình thường</p>
                </div>
              ) : (
                <>
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <AlertItem 
                      key={alert.id} 
                      alert={alert}
                      onAcknowledge={(id) => acknowledgeAlert.mutate(id)}
                      onResolve={(id) => resolveAlert.mutate({ id })}
                    />
                  ))}
                  {activeAlerts.length > 5 && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      onClick={() => navigate('/control-tower/alerts')}
                    >
                      Xem tất cả {activeAlerts.length} cảnh báo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Store Performance */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Hiệu suất cửa hàng
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {storesLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-slate-800" />
                ))
              ) : storePerformance.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Store className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Chưa có dữ liệu cửa hàng</p>
                </div>
              ) : (
                storePerformance.map((store, index) => (
                  <motion.div
                    key={store.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 truncate flex-1">{store.name}</span>
                      <span className="text-sm font-medium text-slate-100">₫{store.revenue.toFixed(1)}M</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(store.progress, 100)} 
                        className="h-2 flex-1"
                      />
                      <span className={`text-xs font-medium min-w-[40px] text-right ${
                        store.progress >= 90 ? 'text-emerald-400' : 
                        store.progress >= 70 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {store.progress}%
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
              <Button 
                variant="ghost" 
                className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => navigate('/control-tower/stores')}
              >
                Xem chi tiết
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.bySeverity.critical}</p>
                <p className="text-xs text-slate-400">Critical</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.bySeverity.warning}</p>
                <p className="text-xs text-slate-400">Warning</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.resolved}</p>
                <p className="text-xs text-slate-400">Đã xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.acknowledged}</p>
                <p className="text-xs text-slate-400">Đã xác nhận</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
