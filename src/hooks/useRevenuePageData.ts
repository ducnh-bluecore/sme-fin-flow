/**
 * useRevenuePageData - Revenue page data hook
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 * Extracts data fetching logic from RevenuePage.tsx
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import { format, subMonths } from 'date-fns';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface Revenue {
  id: string;
  contract_name: string;
  customer_id: string | null;
  customer_name: string | null;
  revenue_type: string;
  source: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ConnectorIntegration {
  id: string;
  connector_name: string;
  connector_type: string;
  shop_name: string | null;
  status: string;
  last_sync_at: string | null;
}

export interface ExternalOrder {
  integration_id: string;
  total_amount: number;
  status: string;
  channel: string;
  order_date: string;
}

export function useRevenuePageData() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { startDateStr: start, endDateStr: end } = useDateRangeForQuery();

  // Fetch revenues from database
  const revenuesQuery = useQuery({
    queryKey: ['revenues-analytics', tenantId, start, end],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('revenues')
        .select('*')
        .gte('start_date', start)
        .lte('start_date', end)
        .order('created_at', { ascending: false });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Revenue[];
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch connector integrations from database
  const connectorsQuery = useQuery({
    queryKey: ['connector-integrations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('connector_integrations')
        .select('*')
        .order('connector_name');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConnectorIntegration[];
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch external orders for integrated revenue
  // ARCHITECTURE: Hook → View → Table (v_revenue_channel_daily → cdp_orders)
  const externalOrdersQuery = useQuery({
    queryKey: ['cdp-orders-revenue', tenantId, start, end],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('v_revenue_channel_daily' as any)
        .select('channel, order_date, total_gross_revenue, order_count')
        .gte('order_date', start)
        .lte('order_date', end);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map aggregated view data to legacy format
      return (data || []).map((o: any) => ({
        integration_id: o.channel,
        total_amount: Number(o.total_gross_revenue) || 0,
        status: 'delivered',
        channel: o.channel,
        order_date: o.order_date,
      })) as ExternalOrder[];
    },
    enabled: !!tenantId && isReady,
  });

  // Fetch previous period for comparison
  const prevRevenuesQuery = useQuery({
    queryKey: ['revenues-prev', tenantId, start, end],
    queryFn: async () => {
      if (!tenantId) return [];

      const prevStart = format(subMonths(new Date(start), 1), 'yyyy-MM-dd');
      const prevEnd = format(subMonths(new Date(end), 1), 'yyyy-MM-dd');

      let query = client
        .from('revenues')
        .select('amount')
        .gte('start_date', prevStart)
        .lte('start_date', prevEnd);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });

  return {
    revenues: revenuesQuery.data || [],
    connectors: connectorsQuery.data || [],
    externalOrders: externalOrdersQuery.data || [],
    prevRevenues: prevRevenuesQuery.data || [],
    refetchRevenues: revenuesQuery.refetch,
    refetchConnectors: connectorsQuery.refetch,
    isLoading: revenuesQuery.isLoading || connectorsQuery.isLoading,
  };
}
