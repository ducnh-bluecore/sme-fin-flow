import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  ExternalLink,
  Settings2,
  Play,
  Pause
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface DataSource {
  id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
  sync_status: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_frequency_minutes: number | null;
  error_message: string | null;
  source_config: any;
}

const statusConfig = {
  success: { label: 'Thành công', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  syncing: { label: 'Đang sync', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  error: { label: 'Lỗi', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { label: 'Cảnh báo', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  pending: { label: 'Chờ', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

const sourceTypeIcons: Record<string, string> = {
  shopee: '🛒',
  lazada: '🛍️',
  tiktok: '🎵',
  pos: '💳',
  website: '🌐',
  erp: '📊',
  wms: '📦',
  crm: '👥',
  api: '🔌',
};

function DataSourceCard({ source, onSync, onToggle }: { 
  source: DataSource; 
  onSync: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  const status = statusConfig[source.sync_status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const typeIcon = sourceTypeIcons[source.source_type] || '📡';
  
  const syncFrequencyLabel = source.sync_frequency_minutes 
    ? source.sync_frequency_minutes >= 60 
      ? `${Math.floor(source.sync_frequency_minutes / 60)}h`
      : `${source.sync_frequency_minutes}m`
    : 'Manual';

  const isOverdue = source.next_sync_at && new Date(source.next_sync_at) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all ${!source.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{typeIcon}</div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{source.source_name}</h3>
                <span className="text-xs text-slate-500 uppercase">{source.source_type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${status.bg} ${status.color} border ${status.border} text-xs flex items-center gap-1`}>
                <StatusIcon className={`h-3 w-3 ${source.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                {status.label}
              </Badge>
              <Switch 
                checked={source.is_active} 
                onCheckedChange={(checked) => onToggle(source.id, checked)}
                className="scale-75"
              />
            </div>
          </div>

          {/* Sync Info */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-500">Lần sync cuối</span>
              </div>
              <span className="text-sm text-slate-300">
                {source.last_sync_at 
                  ? formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true, locale: vi })
                  : 'Chưa sync'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-1 mb-1">
                <RefreshCw className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-500">Tần suất</span>
              </div>
              <span className="text-sm text-slate-300">{syncFrequencyLabel}</span>
            </div>
          </div>

          {/* Next Sync */}
          {source.next_sync_at && source.is_active && (
            <div className={`text-xs mb-3 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
              {isOverdue ? '⚠️ Quá hạn sync: ' : 'Sync tiếp theo: '}
              {formatDistanceToNow(new Date(source.next_sync_at), { addSuffix: true, locale: vi })}
            </div>
          )}

          {/* Error Message */}
          {source.error_message && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
              <p className="text-xs text-red-400 line-clamp-2">{source.error_message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-slate-400 hover:text-slate-200"
              disabled={!source.is_active || source.sync_status === 'syncing'}
              onClick={() => onSync(source.id)}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${source.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
              Sync ngay
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-slate-400 hover:text-slate-200"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Cấu hình
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DataSourceHealthPanel() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  const { data: dataSources, isLoading } = useQuery({
    queryKey: ['data-sources-health', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('alert_data_sources')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('source_name');
      
      if (error) throw error;
      return data as DataSource[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const syncMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      // Update status to syncing
      await supabase
        .from('alert_data_sources')
        .update({ sync_status: 'syncing' })
        .eq('id', sourceId);
      
      // Trigger sync edge function
      const { error } = await supabase.functions.invoke('sync-ecommerce-data', {
        body: { source_id: sourceId, tenant_id: tenantId }
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã bắt đầu đồng bộ dữ liệu');
      queryClient.invalidateQueries({ queryKey: ['data-sources-health'] });
    },
    onError: () => {
      toast.error('Lỗi khi đồng bộ dữ liệu');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('alert_data_sources')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'Đã bật nguồn dữ liệu' : 'Đã tắt nguồn dữ liệu');
      queryClient.invalidateQueries({ queryKey: ['data-sources-health'] });
    }
  });

  // Calculate stats
  const stats = {
    total: dataSources?.length || 0,
    active: dataSources?.filter(s => s.is_active).length || 0,
    healthy: dataSources?.filter(s => s.sync_status === 'success' && s.is_active).length || 0,
    errors: dataSources?.filter(s => s.sync_status === 'error').length || 0,
  };

  const healthPercentage = stats.active > 0 ? Math.round((stats.healthy / stats.active) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            Sức khỏe nguồn dữ liệu
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Theo dõi trạng thái kết nối và đồng bộ dữ liệu từ các hệ thống
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-700 text-slate-300"
          onClick={() => dataSources?.filter(s => s.is_active).forEach(s => syncMutation.mutate(s.id))}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync tất cả
        </Button>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Tổng nguồn</span>
            <Database className="h-4 w-4 text-slate-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Đang hoạt động</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Có lỗi</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
          )}
        </Card>

        <Card className="bg-slate-900/50 border-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Sức khỏe</span>
            {healthPercentage >= 80 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-400" />
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className={`text-2xl font-bold ${healthPercentage >= 80 ? 'text-emerald-400' : healthPercentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {healthPercentage}%
              </div>
              <Progress value={healthPercentage} className="h-1 mt-2" />
            </>
          )}
        </Card>
      </div>

      {/* Data Sources Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 bg-slate-800" />
          ))}
        </div>
      ) : dataSources && dataSources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map((source) => (
            <DataSourceCard 
              key={source.id} 
              source={source}
              onSync={(id) => syncMutation.mutate(id)}
              onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800/50 p-12 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">Chưa có nguồn dữ liệu</h3>
          <p className="text-sm text-slate-500 mb-4">Thêm kết nối đến các hệ thống bán hàng, kho, POS...</p>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            Thêm nguồn dữ liệu
          </Button>
        </Card>
      )}
    </div>
  );
}
