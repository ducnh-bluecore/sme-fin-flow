import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import { Database, Json } from '@/integrations/supabase/types';

type ConnectorType = Database['public']['Enums']['connector_type'];
type ConnectorIntegration = Database['public']['Tables']['connector_integrations']['Row'];

export interface CreateIntegrationParams {
  connector_type: ConnectorType;
  connector_name: string;
  shop_name?: string;
  shop_id?: string;
  credentials?: Json;
  settings?: Json;
}

export function useConnectorIntegrations() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: ['connector-integrations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('connector_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConnectorIntegration[];
    },
    enabled: !!tenantId,
  });

  const createIntegration = useMutation({
    mutationFn: async (params: CreateIntegrationParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('connector_integrations')
        .insert([{
          tenant_id: tenantId,
          connector_type: params.connector_type,
          connector_name: params.connector_name,
          shop_name: params.shop_name,
          shop_id: params.shop_id,
          credentials: params.credentials || {},
          settings: params.settings || {},
          status: 'inactive',
          created_by: user.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector-integrations', tenantId] });
      toast.success('Đã thêm kết nối mới');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi thêm kết nối: ' + error.message);
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<ConnectorIntegration> 
    }) => {
      const { data, error } = await supabase
        .from('connector_integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector-integrations', tenantId] });
      toast.success('Đã cập nhật kết nối');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('connector_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector-integrations', tenantId] });
      toast.success('Đã xóa kết nối');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      // Fetch integration to determine which sync path to use
      const { data: integration, error: integrationError } = await supabase
        .from('connector_integrations')
        .select('id, connector_type')
        .eq('id', integrationId)
        .single();

      if (integrationError) throw integrationError;

      // BigQuery syncing requires service account key (kept in BigQuery panel), so don’t call sync-connector
      if (integration?.connector_type === 'bigquery') {
        throw new Error('BigQuery: vui lòng đồng bộ trong phần “Data Warehouse” (cần Service Account Key).');
      }

      // Call backend function to sync
      const { data, error } = await supabase.functions.invoke('sync-connector', {
        body: {
          integration_id: integrationId,
          sync_type: 'full',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connector-integrations', tenantId] });
      toast.success('Đã bắt đầu đồng bộ dữ liệu');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi đồng bộ: ' + error.message);
    },
  });

  return {
    integrations: integrationsQuery.data || [],
    isLoading: integrationsQuery.isLoading,
    error: integrationsQuery.error,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    syncIntegration,
    refetch: integrationsQuery.refetch,
  };
}

// Note: useChannelPerformance and useDailyChannelRevenue have been moved to useChannelAnalytics.ts
// Import from there instead:
// import { useChannelPerformance, useDailyChannelRevenue } from './useChannelAnalytics';
