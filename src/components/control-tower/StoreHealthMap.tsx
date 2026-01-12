import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Store, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  LayoutGrid,
  Map
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

interface StoreWithHealth {
  id: string;
  name: string;
  address: string | null;
  status: 'active' | 'maintenance' | 'closed';
  healthScore: number;
  revenue: number;
  target: number;
  revenueProgress: number;
  alertCount: number;
  lastAlertSeverity: string | null;
  metrics: {
    orders: number;
    avgOrderValue: number;
    growth: number;
    staffEfficiency: number;
  };
  region?: string;
  coordinates?: { lat: number; lng: number };
}

// Vietnam regions for demo
const REGIONS = [
  { id: 'all', name: 'Tất cả' },
  { id: 'hcm', name: 'TP. Hồ Chí Minh' },
  { id: 'hanoi', name: 'Hà Nội' },
  { id: 'danang', name: 'Đà Nẵng' },
  { id: 'other', name: 'Khác' },
];

// Health score thresholds
const getHealthStatus = (score: number) => {
  if (score >= 80) return { label: 'Tốt', color: 'text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' };
  if (score >= 60) return { label: 'Trung bình', color: 'text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500/30' };
  if (score >= 40) return { label: 'Cần chú ý', color: 'text-orange-400', bg: 'bg-orange-500', ring: 'ring-orange-500/30' };
  return { label: 'Nguy hiểm', color: 'text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30' };
};

function StoreHealthCard({ store }: { store: StoreWithHealth }) {
  const health = getHealthStatus(store.healthScore);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className={`relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 cursor-pointer transition-all ring-2 ${health.ring}`}
          >
            {/* Health Score Badge */}
            <div className={`absolute -top-2 -right-2 w-10 h-10 rounded-full ${health.bg} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
              {store.healthScore}
            </div>

            {/* Alert Badge */}
            {store.alertCount > 0 && (
              <div className="absolute -top-2 -left-2">
                <Badge className="bg-red-500 text-white border-0 h-5 min-w-5 flex items-center justify-center text-xs">
                  {store.alertCount}
                </Badge>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${store.status === 'active' ? 'bg-emerald-500/10' : store.status === 'maintenance' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                <Store className={`h-5 w-5 ${store.status === 'active' ? 'text-emerald-400' : store.status === 'maintenance' ? 'text-amber-400' : 'text-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-100 truncate">{store.name}</h4>
                {store.address && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{store.address}</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded bg-slate-900/50">
                <div className="text-xs text-slate-500">Doanh thu</div>
                <div className="text-sm font-semibold text-slate-200">
                  {store.revenue >= 1e6 ? `₫${(store.revenue / 1e6).toFixed(0)}M` : `₫${store.revenue.toLocaleString()}`}
                </div>
              </div>
              <div className="text-center p-2 rounded bg-slate-900/50">
                <div className="text-xs text-slate-500">Target</div>
                <div className="text-sm font-semibold text-slate-200">
                  {store.revenueProgress}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2">
              <Progress 
                value={store.revenueProgress} 
                className="h-1.5"
              />
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-slate-900 border-slate-700 p-4 max-w-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">{store.name}</span>
              <Badge className={`${health.bg.replace('bg-', 'bg-')}/20 ${health.color} border-0`}>
                {health.label}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Đơn hàng:</span>
                <span className="text-slate-300 ml-1">{store.metrics.orders}</span>
              </div>
              <div>
                <span className="text-slate-500">AOV:</span>
                <span className="text-slate-300 ml-1">₫{(store.metrics.avgOrderValue / 1000).toFixed(0)}K</span>
              </div>
              <div>
                <span className="text-slate-500">Tăng trưởng:</span>
                <span className={`ml-1 ${store.metrics.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {store.metrics.growth >= 0 ? '+' : ''}{store.metrics.growth}%
                </span>
              </div>
              <div>
                <span className="text-slate-500">Hiệu suất NV:</span>
                <span className="text-slate-300 ml-1">{store.metrics.staffEfficiency}%</span>
              </div>
            </div>

            {store.alertCount > 0 && (
              <div className="pt-2 border-t border-slate-700">
                <span className="text-red-400 text-xs">
                  ⚠️ {store.alertCount} cảnh báo cần xử lý
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HealthLegend() {
  const levels = [
    { min: 80, label: '80-100 Tốt', color: 'bg-emerald-500' },
    { min: 60, label: '60-79 Trung bình', color: 'bg-amber-500' },
    { min: 40, label: '40-59 Cần chú ý', color: 'bg-orange-500' },
    { min: 0, label: '0-39 Nguy hiểm', color: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {levels.map((level) => (
        <div key={level.min} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-full ${level.color}`} />
          <span className="text-slate-400">{level.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StoreHealthMap() {
  const { data: tenantId } = useActiveTenantId();
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState<'health' | 'revenue' | 'alerts'>('health');

  const { data: storesWithHealth, isLoading } = useQuery({
    queryKey: ['stores-health-map', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch stores from alert_objects
      const { data: stores, error: storesError } = await supabase
        .from('alert_objects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('object_type', 'store');

      if (storesError) throw storesError;

      // Fetch alert counts per store
      const { data: alerts } = await supabase
        .from('alert_instances')
        .select('alert_object_id, severity')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'acknowledged'])
        .not('alert_object_id', 'is', null);

      const alertCounts: Record<string, { count: number; severity: string }> = {};
      alerts?.forEach(alert => {
        if (alert.alert_object_id) {
          if (!alertCounts[alert.alert_object_id]) {
            alertCounts[alert.alert_object_id] = { count: 0, severity: 'info' };
          }
          alertCounts[alert.alert_object_id].count++;
          if (alert.severity === 'critical') alertCounts[alert.alert_object_id].severity = 'critical';
          else if (alert.severity === 'warning' && alertCounts[alert.alert_object_id].severity !== 'critical') {
            alertCounts[alert.alert_object_id].severity = 'warning';
          }
        }
      });

      // Calculate health scores
      return stores?.map(store => {
        const metrics = store.current_metrics as any || {};
        const revenue = metrics.daily_revenue || 0;
        const target = metrics.target_revenue || 1;
        const orders = metrics.orders || 0;
        const growth = store.trend_percent || 0;
        
        const revenueProgress = Math.min(Math.round((revenue / target) * 100), 100);
        const alertInfo = alertCounts[store.id] || { count: 0, severity: null };
        
        // Calculate health score based on multiple factors
        let healthScore = 100;
        
        // Revenue progress impact (-30 max)
        if (revenueProgress < 50) healthScore -= 30;
        else if (revenueProgress < 70) healthScore -= 20;
        else if (revenueProgress < 90) healthScore -= 10;
        
        // Alert impact (-40 max)
        if (alertInfo.severity === 'critical') healthScore -= 40;
        else if (alertInfo.severity === 'warning') healthScore -= 20;
        else if (alertInfo.count > 0) healthScore -= 10;
        
        // Growth impact (-20 max)
        if (growth < -10) healthScore -= 20;
        else if (growth < 0) healthScore -= 10;
        
        // Store status impact
        if (store.alert_status === 'maintenance') healthScore -= 15;
        else if (store.alert_status === 'closed') healthScore -= 50;

        healthScore = Math.max(0, Math.min(100, healthScore));

        return {
          id: store.id,
          name: store.object_name,
          address: store.address,
          status: (store.alert_status as 'active' | 'maintenance' | 'closed') || 'active',
          healthScore,
          revenue,
          target,
          revenueProgress,
          alertCount: alertInfo.count,
          lastAlertSeverity: alertInfo.severity,
          metrics: {
            orders,
            avgOrderValue: orders > 0 ? revenue / orders : 0,
            growth,
            staffEfficiency: metrics.staff_efficiency || 85,
          },
          region: (store.metadata as any)?.region || 'other',
        } as StoreWithHealth;
      }) || [];
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter and sort stores
  const filteredStores = useMemo(() => {
    if (!storesWithHealth) return [];
    
    let filtered = storesWithHealth;
    
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(s => s.region === selectedRegion);
    }
    
    // Sort
    switch (sortBy) {
      case 'health':
        filtered = [...filtered].sort((a, b) => a.healthScore - b.healthScore);
        break;
      case 'revenue':
        filtered = [...filtered].sort((a, b) => b.revenue - a.revenue);
        break;
      case 'alerts':
        filtered = [...filtered].sort((a, b) => b.alertCount - a.alertCount);
        break;
    }
    
    return filtered;
  }, [storesWithHealth, selectedRegion, sortBy]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!storesWithHealth || storesWithHealth.length === 0) {
      return { avgHealth: 0, critical: 0, warning: 0, healthy: 0 };
    }
    
    const avgHealth = Math.round(storesWithHealth.reduce((sum, s) => sum + s.healthScore, 0) / storesWithHealth.length);
    const critical = storesWithHealth.filter(s => s.healthScore < 40).length;
    const warning = storesWithHealth.filter(s => s.healthScore >= 40 && s.healthScore < 60).length;
    const healthy = storesWithHealth.filter(s => s.healthScore >= 80).length;
    
    return { avgHealth, critical, warning, healthy };
  }, [storesWithHealth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-400" />
            Bản đồ sức khỏe cửa hàng
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Theo dõi health score và trạng thái real-time của các cửa hàng
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Khu vực" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {REGIONS.map(region => (
                <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-36 bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="health">Theo sức khỏe</SelectItem>
              <SelectItem value="revenue">Theo doanh thu</SelectItem>
              <SelectItem value="alerts">Theo cảnh báo</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm"
              className={viewMode === 'grid' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              size="sm"
              className={viewMode === 'map' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => setViewMode('map')}
              disabled
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Health TB</span>
            {stats.avgHealth >= 70 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-400" />
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className={`text-2xl font-bold ${stats.avgHealth >= 70 ? 'text-emerald-400' : stats.avgHealth >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {stats.avgHealth}
            </div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Sức khỏe tốt</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-emerald-400">{stats.healthy}</div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Cần chú ý</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-amber-400">{stats.warning}</div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Nguy hiểm</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
          )}
        </Card>
      </div>

      {/* Legend */}
      <HealthLegend />

      {/* Store Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-40 bg-slate-800" />
          ))}
        </div>
      ) : filteredStores.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredStores.map((store) => (
            <StoreHealthCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800/50 p-12 text-center">
          <Store className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">Chưa có cửa hàng</h3>
          <p className="text-sm text-slate-500">Thêm cửa hàng để theo dõi sức khỏe vận hành</p>
        </Card>
      )}
    </div>
  );
}
