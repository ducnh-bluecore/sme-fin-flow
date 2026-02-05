/**
 * useInventoryData - Inventory management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain Master Model/Inventory
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  status: 'normal' | 'low' | 'out' | 'overstock';
  location: string;
  lastUpdated: string;
  value: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface WarehouseData {
  name: string;
  stock: number;
  capacity: number;
}

const categoryColors: Record<string, string> = {
  'Điện thoại': '#3B82F6',
  'Laptop': '#10B981',
  'Phụ kiện': '#F59E0B',
  'Tablet': '#8B5CF6',
  'Khác': '#6B7280',
};

export function useInventoryData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inventory-data', tenantId],
    queryFn: async () => {
      if (!tenantId) return { items: [], categories: [], warehouses: [] };

      // Fetch inventory objects (products with stock)
      const { data: products, error } = await buildSelectQuery('alert_objects', '*')
        .eq('object_type', 'product')
        .order('object_name', { ascending: true })
        .limit(10000);

      if (error) throw error;

      const items: InventoryItem[] = ((products || []) as any[]).map(obj => {
        const metrics = (obj.current_metrics || {}) as Record<string, unknown>;
        const objData = (obj.object_data || {}) as Record<string, unknown>;
        
        const quantity = (metrics.quantity as number) || (metrics.stock as number) || 0;
        const minStock = obj.safety_stock || (objData.min_stock as number) || 10;
        const maxStock = (objData.max_stock as number) || 100;
        
        // Determine status
        let status: 'normal' | 'low' | 'out' | 'overstock' = 'normal';
        if (quantity === 0) {
          status = 'out';
        } else if (quantity < minStock) {
          status = 'low';
        } else if (quantity > maxStock) {
          status = 'overstock';
        }

        return {
          id: obj.id,
          sku: obj.external_id || obj.id.slice(0, 8).toUpperCase(),
          name: obj.object_name,
          category: obj.object_category || 'Khác',
          quantity,
          minStock,
          maxStock,
          status,
          location: (objData.warehouse as string) || (objData.location as string) || 'Kho TT',
          lastUpdated: formatTimeAgo(obj.updated_at || obj.created_at),
          value: (metrics.value as number) || (metrics.revenue as number) || quantity * ((metrics.unit_price as number) || 0),
        };
      });

      // Calculate category distribution
      const categoryMap = new Map<string, number>();
      let totalValue = 0;
      items.forEach(item => {
        const current = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, current + item.value);
        totalValue += item.value;
      });

      const categories: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value]) => ({
          name,
          value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
          color: categoryColors[name] || '#6B7280',
        }))
        .sort((a, b) => b.value - a.value);

      // Calculate warehouse distribution
      const warehouseMap = new Map<string, { stock: number; items: number }>();
      items.forEach(item => {
        const current = warehouseMap.get(item.location) || { stock: 0, items: 0 };
        warehouseMap.set(item.location, {
          stock: current.stock + item.quantity,
          items: current.items + 1,
        });
      });

      const warehouses: WarehouseData[] = Array.from(warehouseMap.entries())
        .map(([name, data]) => ({
          name,
          stock: data.stock,
          capacity: Math.max(data.stock * 1.5, 100), // Estimate capacity
        }))
        .sort((a, b) => b.stock - a.stock);

      return { items, categories, warehouses };
    },
    enabled: !!tenantId && isReady,
  });
}

export function useInventoryStats() {
  const { data, isLoading } = useInventoryData();

  const items = data?.items || [];
  
  return {
    isLoading,
    totalSKUs: items.length,
    outOfStock: items.filter(i => i.status === 'out').length,
    lowStock: items.filter(i => i.status === 'low').length,
    totalValue: items.reduce((sum, i) => sum + i.value, 0),
  };
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}
