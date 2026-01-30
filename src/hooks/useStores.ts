import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';

export type ChannelType = 'store' | 'shopee' | 'lazada' | 'tiktok' | 'website';

export interface StoreData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: 'active' | 'maintenance' | 'closed';
  manager: string | null;
  revenue: number;
  target: number;
  orders: number;
  growth: number;
  staff: number;
  openHours: string | null;
  channelType: ChannelType;
}

export interface StoreStats {
  total: number;
  active: number;
  maintenance: number;
  closed: number;
  totalRevenue: number;
  totalOrders: number;
}

export function useStores() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['stores', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('alert_objects')
        .select('*')
        .in('object_type', ['store', 'shopee', 'lazada', 'tiktok', 'website'])
        .order('object_name', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(obj => {
        const metrics = (obj.current_metrics || {}) as Record<string, unknown>;
        const objData = (obj.object_data || {}) as Record<string, unknown>;
        
        // Map alert_status to store status
        let status: 'active' | 'maintenance' | 'closed' = 'active';
        if (obj.alert_status === 'critical' || obj.alert_status === 'closed') {
          status = 'closed';
        } else if (obj.alert_status === 'warning' || obj.alert_status === 'maintenance') {
          status = 'maintenance';
        }

        return {
          id: obj.id,
          name: obj.object_name,
          address: obj.address || (objData.address as string) || null,
          phone: obj.phone || (objData.phone as string) || null,
          status,
          manager: obj.manager_name || (objData.manager as string) || null,
          revenue: (metrics.revenue as number) || 0,
          target: (metrics.target as number) || 0,
          orders: (metrics.orders as number) || 0,
          growth: (metrics.growth as number) || 0,
          staff: (metrics.staff as number) || 0,
          openHours: obj.open_hours || (objData.open_hours as string) || null,
          channelType: (obj.object_type as ChannelType) || 'store',
        } as StoreData;
      });
    },
    enabled: !!tenantId && isReady,
  });
}

export function useStoreStats() {
  const { data: stores, isLoading } = useStores();

  const stats: StoreStats = {
    total: stores?.length || 0,
    active: stores?.filter(s => s.status === 'active').length || 0,
    maintenance: stores?.filter(s => s.status === 'maintenance').length || 0,
    closed: stores?.filter(s => s.status === 'closed').length || 0,
    totalRevenue: stores?.reduce((sum, s) => sum + s.revenue, 0) || 0,
    totalOrders: stores?.reduce((sum, s) => sum + s.orders, 0) || 0,
  };

  return { stats, isLoading };
}

export interface StoreInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  manager?: string | null;
  openHours?: string | null;
  status?: 'active' | 'maintenance' | 'closed';
  revenue?: number;
  target?: number;
  orders?: number;
  growth?: number;
  staff?: number;
  channelType?: ChannelType;
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (store: StoreInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const alertStatus = store.status === 'closed' ? 'critical' : 
                          store.status === 'maintenance' ? 'warning' : 'normal';

      const { data, error } = await client
        .from('alert_objects')
        .insert({
          tenant_id: tenantId,
          object_type: store.channelType || 'store',
          object_name: store.name,
          address: store.address,
          phone: store.phone,
          manager_name: store.manager,
          open_hours: store.openHours,
          alert_status: alertStatus,
          is_monitored: true,
          current_metrics: {
            revenue: store.revenue || 0,
            target: store.target || 0,
            orders: store.orders || 0,
            growth: store.growth || 0,
            staff: store.staff || 0,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      const channelName = variables.channelType === 'store' ? 'cửa hàng' : 'kênh bán';
      toast.success(`Đã tạo ${channelName} mới`);
    },
    onError: (error) => {
      console.error('Error creating store:', error);
      toast.error('Lỗi khi tạo kênh bán: ' + error.message);
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, ...store }: StoreInput & { id: string }) => {
      const alertStatus = store.status === 'closed' ? 'critical' : 
                          store.status === 'maintenance' ? 'warning' : 'normal';

      const { data, error } = await client
        .from('alert_objects')
        .update({
          object_name: store.name,
          address: store.address,
          phone: store.phone,
          manager_name: store.manager,
          open_hours: store.openHours,
          alert_status: alertStatus,
          current_metrics: {
            revenue: store.revenue || 0,
            target: store.target || 0,
            orders: store.orders || 0,
            growth: store.growth || 0,
            staff: store.staff || 0,
          },
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Đã cập nhật cửa hàng');
    },
    onError: (error) => {
      console.error('Error updating store:', error);
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('alert_objects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Đã xóa cửa hàng');
    },
    onError: (error) => {
      console.error('Error deleting store:', error);
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });
}
