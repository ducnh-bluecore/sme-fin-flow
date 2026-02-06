/**
 * ============================================
 * PRODUCT METRICS - SINGLE SOURCE OF TRUTH
 * ============================================
 * 
 * ✅ SSOT COMPLIANT
 * Reads from product_metrics table which is calculated from:
 * - Master products table (pricing)
 * - cdp_orders (sales data - Layer 1 SSOT)
 * 
 * This replaces sku_profitability_cache for SSOT compliance.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface ProductMetric {
  id: string;
  sku: string;
  product_name: string | null;
  category: string | null;
  brand: string | null;
  unit_price: number;
  unit_cost: number;
  gross_margin: number;
  gross_margin_percent: number;
  total_orders_30d: number;
  total_quantity_30d: number;
  total_revenue_30d: number;
  total_cost_30d: number;
  gross_profit_30d: number;
  profit_per_unit: number;
  avg_daily_quantity: number;
  is_profitable: boolean;
  profit_status: 'healthy' | 'warning' | 'critical';
  last_order_date: string | null;
  last_calculated_at: string | null;
}

export interface ProductMetricsSummary {
  totalProducts: number;
  profitableProducts: number;
  marginalProducts: number;
  criticalProducts: number;
  totalProfit30d: number;
  avgMargin: number;
}

/**
 * Fetch all product metrics (SSOT for SKU profitability)
 */
export function useProductMetrics() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['product-metrics', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await buildSelectQuery('product_metrics', '*')
        .order('gross_profit_30d', { ascending: true });

      if (error) throw error;

      const metrics: ProductMetric[] = ((data || []) as unknown as any[]).map(row => ({
        id: row.id,
        sku: row.sku,
        product_name: row.product_name,
        category: row.category,
        brand: row.brand,
        unit_price: Number(row.unit_price || 0),
        unit_cost: Number(row.unit_cost || 0),
        gross_margin: Number(row.gross_margin || 0),
        gross_margin_percent: Number(row.gross_margin_percent || 0),
        total_orders_30d: Number(row.total_orders_30d || 0),
        total_quantity_30d: Number(row.total_quantity_30d || 0),
        total_revenue_30d: Number(row.total_revenue_30d || 0),
        total_cost_30d: Number(row.total_cost_30d || 0),
        gross_profit_30d: Number(row.gross_profit_30d || 0),
        profit_per_unit: Number(row.profit_per_unit || 0),
        avg_daily_quantity: Number(row.avg_daily_quantity || 0),
        is_profitable: row.is_profitable ?? true,
        // DB uses: 'critical', 'warning', 'healthy'
        profit_status: (row.profit_status as 'healthy' | 'warning' | 'critical') || 'healthy',
        last_order_date: row.last_order_date,
        last_calculated_at: row.last_calculated_at,
      }));

      const profitable = metrics.filter(m => m.profit_status === 'healthy');
      const marginal = metrics.filter(m => m.profit_status === 'warning');
      const critical = metrics.filter(m => m.profit_status === 'critical');

      const summary: ProductMetricsSummary = {
        totalProducts: metrics.length,
        profitableProducts: profitable.length,
        marginalProducts: marginal.length,
        criticalProducts: critical.length,
        totalProfit30d: metrics.reduce((s, m) => s + m.gross_profit_30d, 0),
        avgMargin: metrics.length > 0
          ? metrics.reduce((s, m) => s + m.gross_margin_percent, 0) / metrics.length
          : 0
      };

      return { metrics, summary };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

/**
 * Fetch problematic products (margin < 10% or loss-making)
 */
export function useProblematicProducts() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['problematic-products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // profit_status: 'critical', 'warning', 'healthy'
      const { data, error } = await buildSelectQuery('product_metrics', '*')
        .or('profit_status.eq.critical,profit_status.eq.warning')
        .order('gross_margin_percent', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching problematic products:', error);
        return [];
      }

      return ((data || []) as unknown as any[]).map(row => ({
        id: row.id,
        sku: row.sku,
        product_name: row.product_name || row.sku,
        unit_price: Number(row.unit_price || 0),
        unit_cost: Number(row.unit_cost || 0),
        gross_margin: Number(row.gross_margin || 0),
        gross_margin_percent: Number(row.gross_margin_percent || 0),
        total_quantity_30d: Number(row.total_quantity_30d || 0),
        gross_profit_30d: Number(row.gross_profit_30d || 0),
        profit_per_unit: Number(row.profit_per_unit || 0),
        avg_daily_quantity: Number(row.avg_daily_quantity || 0),
        profit_status: row.profit_status,
        is_profitable: row.is_profitable,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000
  });
}

/**
 * Recalculate product metrics using database function
 */
export function useRecalculateProductMetrics() {
  const { callRpc, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sku?: string) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await callRpc('recalculate_product_metrics', {
        p_tenant_id: tenantId,
        p_sku: sku || null
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`Đã cập nhật ${count} sản phẩm`);
      queryClient.invalidateQueries({ queryKey: ['product-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['problematic-products'] });
    },
    onError: (error) => {
      console.error('Recalculate error:', error);
      toast.error('Lỗi khi cập nhật product metrics');
    }
  });
}

/**
 * Get single product metric by SKU
 */
export function useProductMetricBySKU(sku: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['product-metric', tenantId, sku],
    queryFn: async () => {
      if (!tenantId || !sku) return null;

      const { data, error } = await buildSelectQuery('product_metrics', '*')
        .eq('sku', sku)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      const row = data as unknown as any;
      return {
        id: row.id,
        sku: row.sku,
        product_name: row.product_name,
        unit_price: Number(row.unit_price || 0),
        unit_cost: Number(row.unit_cost || 0),
        gross_margin: Number(row.gross_margin || 0),
        gross_margin_percent: Number(row.gross_margin_percent || 0),
        total_quantity_30d: Number(row.total_quantity_30d || 0),
        gross_profit_30d: Number(row.gross_profit_30d || 0),
        profit_per_unit: Number(row.profit_per_unit || 0),
        avg_daily_quantity: Number(row.avg_daily_quantity || 0),
        is_profitable: row.is_profitable,
        profit_status: row.profit_status,
      } as ProductMetric;
    },
    enabled: !!tenantId && !!sku && isReady,
    staleTime: 2 * 60 * 1000
  });
}
