import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  Loader2,
  Database,
  Package,
  Users,
  FileText,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useSyncProgress } from '@/contexts/SyncProgressContext';
import { toast } from 'sonner';

interface SyncOptions {
  sync_items: boolean;
  sync_products: boolean;
  sync_settlements: boolean;
  sync_customers: boolean;
}

interface SyncResult {
  total_orders_synced: number;
  total_items_synced: number;
  total_products_synced: number;
  total_settlements_synced: number;
  total_fetched: number;
  total_errors: number;
  has_more: boolean;
  channels: Record<string, any>;
}

interface CountResult {
  total_orders: number;
  channels: Record<string, { orders: number; products?: number; settlements?: number; error?: string }>;
}

export function BigQuerySyncManager() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  const { syncState, setIsLoading, setProgress, setCurrentStep, updateChannel, setLastResult } = useSyncProgress();
  
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    sync_items: true,
    sync_products: true,
    sync_settlements: true,
    sync_customers: true,
  });

  // Get BigQuery config from localStorage
  const getBigQueryConfig = () => {
    try {
      const saved = localStorage.getItem('bigquery_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading BQ config:', e);
    }
    return null;
  };

  // Get current data counts
  const { data: currentCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['data-counts', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const [orders, items, products, customers, settlements] = await Promise.all([
        supabase.from('external_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('external_order_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('external_products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('channel_settlements').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);
      
      return {
        orders: orders.count || 0,
        items: items.count || 0,
        products: products.count || 0,
        customers: customers.count || 0,
        settlements: settlements.count || 0,
      };
    },
    enabled: !!tenantId,
  });

  // Count available data in BigQuery
  const countMutation = useMutation({
    mutationFn: async () => {
      const config = getBigQueryConfig();
      if (!config?.serviceAccountKey || !config?.projectId) {
        throw new Error('Vui lòng cấu hình BigQuery trước');
      }

      const { data, error } = await supabase.functions.invoke('sync-bigquery', {
        body: {
          tenant_id: tenantId,
          service_account_key: config.serviceAccountKey,
          project_id: config.projectId,
          action: 'count',
          channels: ['shopee', 'lazada', 'sapo', 'tiki', 'shopify'],
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Count failed');
      
      return data.data as CountResult;
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Sync mutation - reads from Data Models instead of hardcoded channels
  const syncMutation = useMutation({
    mutationFn: async () => {
      const config = getBigQueryConfig();

      setIsLoading(true);
      setProgress(5);
      setCurrentStep('Đang đọc cấu hình Data Models...');

      // Simulate progress while waiting for the actual sync
      let progressValue = 5;
      const progressInterval = setInterval(() => {
        progressValue = Math.min(progressValue + 2, 85);
        setProgress(progressValue);
        
        // Update current step based on progress
        if (progressValue < 20) {
          setCurrentStep('Đang kết nối BigQuery...');
        } else if (progressValue < 40) {
          setCurrentStep('Đang đồng bộ từ Data Models...');
        } else if (progressValue < 60) {
          setCurrentStep('Đang xử lý Orders...');
        } else if (progressValue < 75) {
          setCurrentStep('Đang xử lý Products...');
        } else {
          setCurrentStep('Đang hoàn tất...');
        }
      }, 500);

      try {
        // Use sync_from_models action to read from Data Models config
        const { data, error } = await supabase.functions.invoke('sync-bigquery', {
          body: {
            tenant_id: tenantId,
            action: 'sync_from_models', // NEW: Read from Data Models
            ...(config?.serviceAccountKey && { service_account_key: config.serviceAccountKey }),
            ...(config?.projectId && { project_id: config.projectId }),
            batch_size: 5000,
          },
        });

        clearInterval(progressInterval);
        setProgress(95);
        setCurrentStep('Đang xử lý kết quả...');

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Sync failed');
        
        return data.data as SyncResult;
      } catch (err) {
        clearInterval(progressInterval);
        throw err;
      }
    },
    onSuccess: (result) => {
      setLastResult(result);
      refetchCounts();
      queryClient.invalidateQueries({ queryKey: ['external-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      const total = result.total_orders_synced + result.total_items_synced + 
                   result.total_products_synced + result.total_settlements_synced;
      toast.success(`Đã sync ${total.toLocaleString()} records từ BigQuery`);
    },
    onError: (error) => {
      toast.error('Lỗi sync: ' + error.message);
      setIsLoading(false);
      setProgress(0);
      setCurrentStep('');
    },
  });

  const dataCards = [
    {
      label: 'Orders',
      count: currentCounts?.orders || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Order Items',
      count: currentCounts?.items || 0,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Products',
      count: currentCounts?.products || 0,
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Customers',
      count: currentCounts?.customers || 0,
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Settlements',
      count: currentCounts?.settlements || 0,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Data Sync Manager</h3>
            <p className="text-sm text-muted-foreground">
              Đồng bộ dữ liệu từ BigQuery vào database
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => countMutation.mutate()}
            disabled={countMutation.isPending}
          >
            {countMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Đếm records
          </Button>
          <Button 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Sync tất cả
          </Button>
        </div>
      </div>

      {/* Current Data Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {dataCards.map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg ${card.bgColor}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-sm font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.count.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>

      <Separator className="my-6" />

      {/* Sync Options */}
      <div className="mb-6">
        <h4 className="font-medium mb-4">Sync Options</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="sync-items"
              checked={syncOptions.sync_items}
              onCheckedChange={(checked) => setSyncOptions(prev => ({ ...prev, sync_items: checked }))}
            />
            <Label htmlFor="sync-items">Order Items</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sync-products"
              checked={syncOptions.sync_products}
              onCheckedChange={(checked) => setSyncOptions(prev => ({ ...prev, sync_products: checked }))}
            />
            <Label htmlFor="sync-products">Products</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sync-settlements"
              checked={syncOptions.sync_settlements}
              onCheckedChange={(checked) => setSyncOptions(prev => ({ ...prev, sync_settlements: checked }))}
            />
            <Label htmlFor="sync-settlements">Settlements</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sync-customers"
              checked={syncOptions.sync_customers}
              onCheckedChange={(checked) => setSyncOptions(prev => ({ ...prev, sync_customers: checked }))}
            />
            <Label htmlFor="sync-customers">Customers</Label>
          </div>
        </div>
      </div>

      {/* Sync Progress */}
      {(syncMutation.isPending || syncState.isLoading) && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{syncState.currentStep || 'Đang sync...'}</span>
            </div>
            <span className="text-sm font-bold text-primary">{syncState.progress}%</span>
          </div>
          <Progress value={syncState.progress} className="h-2 mb-4" />
          
          {/* Channel Status */}
          <div className="grid grid-cols-5 gap-2">
            {syncState.channels.map((channel) => (
              <div 
                key={channel.name} 
                className={`text-center p-2 rounded-lg transition-colors ${
                  channel.status === 'syncing' ? 'bg-primary/10 border border-primary/30' :
                  channel.status === 'completed' ? 'bg-success/10' :
                  channel.status === 'error' ? 'bg-destructive/10' :
                  'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {channel.status === 'syncing' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  {channel.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-success" />}
                  {channel.status === 'error' && <AlertCircle className="w-3 h-3 text-destructive" />}
                  {channel.status === 'pending' && <Circle className="w-3 h-3 text-muted-foreground" />}
                </div>
                <p className="text-xs font-medium capitalize">{channel.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Count Results */}
      {countMutation.data && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            BigQuery Data Available
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(countMutation.data.channels).map(([channel, data]) => (
              <div key={channel} className="text-center">
                <p className="text-xs text-muted-foreground uppercase">{channel}</p>
                <p className="text-lg font-bold">{data.orders.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">orders</p>
                {data.products && (
                  <p className="text-xs text-muted-foreground">{data.products} products</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-center">
              <span className="font-bold text-xl">{countMutation.data.total_orders.toLocaleString()}</span>
              <span className="text-muted-foreground ml-2">total orders có thể sync</span>
            </p>
          </div>
        </div>
      )}

      {/* Last Sync Result */}
      {syncState.lastResult && (
        <div className="p-4 bg-green-500/10 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Sync Completed
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Orders</p>
              <p className="font-bold">{syncState.lastResult.total_orders_synced.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Items</p>
              <p className="font-bold">{syncState.lastResult.total_items_synced.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Products</p>
              <p className="font-bold">{syncState.lastResult.total_products_synced.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Settlements</p>
              <p className="font-bold">{syncState.lastResult.total_settlements_synced.toLocaleString()}</p>
            </div>
          </div>
          {syncState.lastResult.total_errors > 0 && (
            <p className="mt-2 text-sm text-orange-600">
              ⚠️ {syncState.lastResult.total_errors} errors
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
