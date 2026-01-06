import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  source: 'erp' | 'ecommerce' | 'pos' | 'api';
  total_amount: number;
  status: 'pending' | 'review' | 'approved' | 'rejected' | 'invoiced' | 'error';
  order_date: string;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface AutoApprovalRule {
  id: string;
  source: 'erp' | 'ecommerce' | 'pos' | 'api';
  is_enabled: boolean;
  max_amount: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all orders
export function useOrders(sourceFilter?: string, statusFilter?: string) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['orders', tenantId, sourceFilter, statusFilter],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order_date', { ascending: false });

      if (sourceFilter && sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!tenantId,
  });
}

// Fetch auto-approval rules
export function useAutoApprovalRules() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['auto-approval-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('order_auto_approval_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('source');

      if (error) throw error;
      return data as AutoApprovalRule[];
    },
    enabled: !!tenantId,
  });
}

// Update auto-approval rule
export function useUpdateAutoApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ source, is_enabled, max_amount }: { source: string; is_enabled: boolean; max_amount: number | null }) => {
      const { data, error } = await supabase
        .from('order_auto_approval_rules')
        .update({ is_enabled, max_amount })
        .eq('source', source)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-approval-rules'] });
    }
  });
}

// Update order status
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

// Batch update order status
export function useBatchUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .in('id', orderIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

// Auto-approve orders by source
export function useAutoApproveBySource() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ source, maxAmount }: { source: string; maxAmount: number | null }) => {
      if (!tenantId) throw new Error('No tenant selected');

      let query = supabase
        .from('orders')
        .update({ status: 'approved' })
        .eq('tenant_id', tenantId)
        .eq('source', source)
        .eq('status', 'pending');

      if (maxAmount !== null) {
        query = query.lte('total_amount', maxAmount);
      }

      const { data, error } = await query.select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

// Get order stats
export function useOrderStats() {
  const { data: orders, isLoading, error } = useOrders();

  const stats = {
    total: 0,
    pending: 0,
    review: 0,
    approved: 0,
    invoiced: 0,
    error: 0,
    totalAmount: 0,
    bySource: {
      erp: { count: 0, amount: 0 },
      ecommerce: { count: 0, amount: 0 },
      pos: { count: 0, amount: 0 },
      api: { count: 0, amount: 0 },
    }
  };

  if (orders) {
    orders.forEach((order) => {
      stats.total++;
      stats.totalAmount += order.total_amount || 0;

      if (order.status === 'pending') stats.pending++;
      else if (order.status === 'review') stats.review++;
      else if (order.status === 'approved') stats.approved++;
      else if (order.status === 'invoiced') stats.invoiced++;
      else if (order.status === 'error') stats.error++;

      const source = order.source as keyof typeof stats.bySource;
      if (stats.bySource[source]) {
        stats.bySource[source].count++;
        stats.bySource[source].amount += order.total_amount || 0;
      }
    });
  }

  return { stats, orders, isLoading, error };
}
