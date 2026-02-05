/**
 * Hook for CDP Product Forecast
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface ProductBenchmark {
  tenant_id: string;
  product_id: string;
  category: string;
  first_sale_date: string;
  total_orders: number;
  unique_customers: number;
  total_revenue: number;
  avg_order_value: number;
  avg_unit_price: number;
  min_price: number;
  max_price: number;
  new_customers: number;
  existing_customers: number;
  new_customer_pct: number;
  price_tier: 'budget' | 'mid' | 'premium' | 'luxury';
}

export interface CategoryConversionStats {
  tenant_id: string;
  category: string;
  unique_buyers: number;
  total_orders: number;
  total_active_customers: number;
  category_penetration_pct: number;
  orders_per_buyer: number;
  avg_price: number;
  price_p25: number;
  price_p50: number;
  price_p75: number;
}

export interface CustomerCategoryAffinity {
  tenant_id: string;
  customer_id: string;
  category: string;
  category_orders: number;
  category_spend: number;
  avg_price_bought: number;
  affinity_score: number;
  price_tier: string;
  recency_status: 'hot' | 'warm' | 'cool' | 'cold';
}

export interface ProductForecast {
  id: string;
  tenant_id: string;
  forecast_name: string;
  product_definition: {
    category?: string;
    price_min?: number;
    price_max?: number;
    price_tier?: string;
  };
  benchmark_product_ids: string[];
  benchmark_auto_suggested: string[];
  benchmark_manual_selected: string[];
  matched_customer_count: number;
  estimated_existing_orders: number;
  estimated_new_orders: number;
  estimated_total_orders: number;
  new_customer_pct: number;
  conversion_rate: number;
  confidence_level: 'high' | 'medium' | 'low';
  calculation_details: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived';
  actual_orders?: number;
  accuracy_pct?: number;
  created_at: string;
}

// Fetch product benchmarks (similar products)
export function useProductBenchmarks(filters?: {
  category?: string;
  priceTier?: string;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-product-benchmarks', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = buildSelectQuery('v_cdp_product_benchmark', '*')
        .order('total_orders', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.priceTier) {
        query = query.eq('price_tier', filters.priceTier);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('[useProductBenchmarks] Error:', error);
        return [];
      }

      return (data || []) as unknown as ProductBenchmark[];
    },
    enabled: isReady,
  });
}

// Fetch category conversion stats
export function useCategoryConversionStats() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-category-conversion-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('v_cdp_category_conversion_stats', '*')
        .order('unique_buyers', { ascending: false });

      if (error) {
        console.error('[useCategoryConversionStats] Error:', error);
        return [];
      }

      return (data || []) as unknown as CategoryConversionStats[];
    },
    enabled: isReady,
  });
}

// Fetch matched customers for a category + price range
export function useMatchedCustomers(filters: {
  category: string;
  priceMin?: number;
  priceMax?: number;
  priceTier?: string;
}) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-matched-customers', tenantId, filters],
    queryFn: async () => {
      if (!tenantId || !filters.category) {
        return { count: 0, customers: [] };
      }

      let query = buildSelectQuery('v_cdp_customer_category_affinity', '*')
        .eq('category', filters.category)
        .gte('affinity_score', 30)
        .in('recency_status', ['hot', 'warm', 'cool']);

      if (filters.priceTier) {
        query = query.eq('price_tier', filters.priceTier);
      }

      const { data, error } = await query
        .order('affinity_score', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[useMatchedCustomers] Error:', error);
        return { count: 0, customers: [] };
      }

      return {
        count: data?.length || 0,
        customers: (data || []) as unknown as CustomerCategoryAffinity[],
      };
    },
    enabled: isReady && !!filters.category,
  });
}

// Fetch existing forecasts
export function useProductForecasts() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-product-forecasts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('cdp_product_forecasts', '*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useProductForecasts] Error:', error);
        return [];
      }

      return (data || []) as unknown as ProductForecast[];
    },
    enabled: isReady,
  });
}

// Calculate forecast based on inputs
export function useCalculateForecast() {
  const { buildSelectQuery, buildInsertQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      forecastName: string;
      category: string;
      priceMin?: number;
      priceMax?: number;
      priceTier?: string;
      benchmarkProductIds: string[];
    }) => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      // 1. Get matched customers from affinity view
      let customerQuery = buildSelectQuery('v_cdp_customer_category_affinity', 'customer_id, affinity_score, recency_status')
        .eq('category', input.category)
        .gte('affinity_score', 30)
        .in('recency_status', ['hot', 'warm', 'cool']);

      if (input.priceTier) {
        customerQuery = customerQuery.eq('price_tier', input.priceTier);
      }

      const { data: matchedCustomers } = await customerQuery;
      const matchedCount = matchedCustomers?.length || 0;

      // 2. Get benchmark products stats
      const { data: benchmarks } = await buildSelectQuery('v_cdp_product_benchmark', '*')
        .in('product_id', input.benchmarkProductIds);

      // Calculate average new customer % from benchmarks
      const benchmarkData = benchmarks as unknown as ProductBenchmark[] || [];
      const avgNewCustomerPct = benchmarkData.length
        ? benchmarkData.reduce((sum, b) => sum + (b.new_customer_pct || 0), 0) / benchmarkData.length
        : 12;

      // 3. Get category conversion rate
      const { data: conversionData } = await buildSelectQuery('v_cdp_category_conversion_stats', 'category_penetration_pct, orders_per_buyer')
        .eq('category', input.category)
        .maybeSingle();

      const convData = conversionData as unknown as CategoryConversionStats | null;
      const conversionRate = Math.min((convData?.category_penetration_pct || 10) / 2, 20);

      // 4. Calculate estimates
      const estimatedExisting = Math.round(matchedCount * (conversionRate / 100));
      const estimatedNew = Math.round(estimatedExisting * (avgNewCustomerPct / (100 - avgNewCustomerPct)));
      const estimatedTotal = estimatedExisting + estimatedNew;

      // Determine confidence level
      let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
      if (matchedCount >= 100 && benchmarkData.length >= 3) {
        confidenceLevel = 'high';
      } else if (matchedCount < 20 || benchmarkData.length < 1) {
        confidenceLevel = 'low';
      }

      // 5. Save forecast to database
      const { data: forecast, error } = await buildInsertQuery('cdp_product_forecasts', {
        forecast_name: input.forecastName,
        product_definition: {
          category: input.category,
          price_min: input.priceMin,
          price_max: input.priceMax,
          price_tier: input.priceTier,
        },
        benchmark_product_ids: input.benchmarkProductIds,
        matched_customer_count: matchedCount,
        estimated_existing_orders: estimatedExisting,
        estimated_new_orders: estimatedNew,
        estimated_total_orders: estimatedTotal,
        new_customer_pct: avgNewCustomerPct,
        conversion_rate: conversionRate,
        confidence_level: confidenceLevel,
        calculation_details: {
          matched_customers: matchedCount,
          benchmark_count: benchmarkData.length,
          avg_new_customer_pct: avgNewCustomerPct,
          category_penetration: convData?.category_penetration_pct,
        },
        status: 'active',
      })
        .select()
        .single();

      if (error) {
        console.error('[useCalculateForecast] Error:', error);
        throw error;
      }

      return forecast as unknown as ProductForecast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-product-forecasts'] });
    },
  });
}

// Get unique categories from data
export function useAvailableCategories() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-available-categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('v_cdp_category_conversion_stats', 'category, unique_buyers, avg_price')
        .order('unique_buyers', { ascending: false });

      if (error) {
        console.error('[useAvailableCategories] Error:', error);
        return [];
      }

      return ((data || []) as unknown as CategoryConversionStats[]).map(d => ({
        category: d.category,
        buyers: d.unique_buyers,
        avgPrice: d.avg_price,
      }));
    },
    enabled: isReady,
  });
}

// Count unique active customers within a configurable date range
export function useActiveCustomerCount(startDate?: string, endDate?: string) {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-active-customer-count', tenantId, startDate, endDate],
    queryFn: async () => {
      if (!tenantId || !startDate || !endDate) return 0;

      const { data, error } = await callRpc('cdp_count_active_customers', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error('[useActiveCustomerCount] Error:', error);
        return 0;
      }

      return data ?? 0;
    },
    enabled: isReady && !!startDate && !!endDate,
  });
}
