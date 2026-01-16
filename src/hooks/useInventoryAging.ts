import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  tenant_id: string;
  sku: string;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_cost: number;
  total_value: number;
  received_date: string;
  warehouse_location: string | null;
  supplier_id: string | null;
  last_sold_date: string | null;
  reorder_point: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryAgingBucket {
  bucket: string;
  minDays: number;
  maxDays: number | null;
  items: InventoryItem[];
  totalQuantity: number;
  totalValue: number;
  percentage: number;
}

const calculateAgeDays = (receivedDate: string): number => {
  const received = new Date(receivedDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - received.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const useInventoryItems = () => {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['inventory-items', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('received_date', { ascending: true });

      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: !!tenantId,
  });
};

export const useInventoryAging = () => {
  const { data: items = [], isLoading, error } = useInventoryItems();

  const agingBuckets: InventoryAgingBucket[] = [
    { bucket: '0-30 ngày', minDays: 0, maxDays: 30, items: [], totalQuantity: 0, totalValue: 0, percentage: 0 },
    { bucket: '31-60 ngày', minDays: 31, maxDays: 60, items: [], totalQuantity: 0, totalValue: 0, percentage: 0 },
    { bucket: '61-90 ngày', minDays: 61, maxDays: 90, items: [], totalQuantity: 0, totalValue: 0, percentage: 0 },
    { bucket: '91-180 ngày', minDays: 91, maxDays: 180, items: [], totalQuantity: 0, totalValue: 0, percentage: 0 },
    { bucket: '>180 ngày', minDays: 181, maxDays: null, items: [], totalQuantity: 0, totalValue: 0, percentage: 0 },
  ];

  let totalValue = 0;

  items.forEach(item => {
    const ageDays = calculateAgeDays(item.received_date);
    totalValue += item.total_value;

    for (const bucket of agingBuckets) {
      if (ageDays >= bucket.minDays && (bucket.maxDays === null || ageDays <= bucket.maxDays)) {
        bucket.items.push(item);
        bucket.totalQuantity += item.quantity;
        bucket.totalValue += item.total_value;
        break;
      }
    }
  });

  // Calculate percentages
  agingBuckets.forEach(bucket => {
    bucket.percentage = totalValue > 0 ? (bucket.totalValue / totalValue) * 100 : 0;
  });

  const summary = {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue,
    avgAge: items.length > 0 
      ? items.reduce((sum, item) => sum + calculateAgeDays(item.received_date), 0) / items.length 
      : 0,
    slowMovingValue: agingBuckets
      .filter(b => b.minDays >= 91)
      .reduce((sum, b) => sum + b.totalValue, 0),
    slowMovingPercentage: totalValue > 0 
      ? (agingBuckets.filter(b => b.minDays >= 91).reduce((sum, b) => sum + b.totalValue, 0) / totalValue) * 100 
      : 0,
  };

  return {
    items,
    agingBuckets,
    summary,
    isLoading,
    error,
  };
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'tenant_id' | 'total_value' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('inventory_items' as any)
        .insert({ ...item, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('Đã thêm sản phẩm tồn kho');
    },
    onError: (error) => {
      toast.error('Lỗi khi thêm sản phẩm: ' + error.message);
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('Đã cập nhật sản phẩm');
    },
    onError: (error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('Đã xóa sản phẩm');
    },
    onError: (error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });
};
