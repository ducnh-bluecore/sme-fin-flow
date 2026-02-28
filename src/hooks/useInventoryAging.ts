/**
 * useInventoryAging - Inventory aging analysis hooks
 * 
 * Architecture v1.4.1: Migrated to useTenantQueryBuilder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inventory-items', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('inventory_items', '*')
        .order('received_date', { ascending: true });

      if (error) throw error;
      return (data as unknown as InventoryItem[]) || [];
    },
    enabled: !!tenantId && isReady,
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

  let totalQuantity = 0;
  let totalAgeSum = 0;
  for (const item of items) {
    totalQuantity += item.quantity;
    totalAgeSum += calculateAgeDays(item.received_date);
  }
  let slowMovingValue = 0;
  for (const b of agingBuckets) {
    if (b.minDays >= 91) slowMovingValue += b.totalValue;
  }

  const summary = {
    totalItems: items.length,
    totalQuantity,
    totalValue,
    avgAge: items.length > 0 ? totalAgeSum / items.length : 0,
    slowMovingValue,
    slowMovingPercentage: totalValue > 0 ? (slowMovingValue / totalValue) * 100 : 0,
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
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'tenant_id' | 'total_value' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('inventory_items', item)
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
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildUpdateQuery('inventory_items', updates)
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
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await buildDeleteQuery('inventory_items')
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
