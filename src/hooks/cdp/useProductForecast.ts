/**
 * Hook for CDP Product Forecast
 * DB-First architecture: All calculations done in database views
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// Wrapper to match expected interface
function useTenant() {
  const { activeTenant } = useTenantContext();
  return { activeTenant };
}

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
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-product-benchmarks', activeTenant?.id, filters],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      let query = supabase
        .from('v_cdp_product_benchmark')
        .select('*')
        .eq('tenant_id', activeTenant.id)
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

      return (data || []) as ProductBenchmark[];
    },
    enabled: !!activeTenant?.id,
  });
}

// Fetch category conversion stats
export function useCategoryConversionStats() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-category-conversion-stats', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('v_cdp_category_conversion_stats')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('unique_buyers', { ascending: false });

      if (error) {
        console.error('[useCategoryConversionStats] Error:', error);
        return [];
      }

      return (data || []) as CategoryConversionStats[];
    },
    enabled: !!activeTenant?.id,
  });
}

// Fetch matched customers for a category + price range
export function useMatchedCustomers(filters: {
  category: string;
  priceMin?: number;
  priceMax?: number;
  priceTier?: string;
}) {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-matched-customers', activeTenant?.id, filters],
    queryFn: async () => {
      if (!activeTenant?.id || !filters.category) {
        return { count: 0, customers: [] };
      }

      let query = supabase
        .from('v_cdp_customer_category_affinity')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .eq('category', filters.category)
        .gte('affinity_score', 30) // Minimum affinity threshold
        .in('recency_status', ['hot', 'warm', 'cool']); // Not cold customers

      if (filters.priceTier) {
        query = query.eq('price_tier', filters.priceTier);
      }

      const { data, error, count } = await query
        .order('affinity_score', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[useMatchedCustomers] Error:', error);
        return { count: 0, customers: [] };
      }

      return {
        count: data?.length || 0,
        customers: (data || []) as CustomerCategoryAffinity[],
      };
    },
    enabled: !!activeTenant?.id && !!filters.category,
  });
}

// Fetch existing forecasts
export function useProductForecasts() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-product-forecasts', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('cdp_product_forecasts')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useProductForecasts] Error:', error);
        return [];
      }

      return (data || []) as ProductForecast[];
    },
    enabled: !!activeTenant?.id,
  });
}

// Calculate forecast based on inputs
export function useCalculateForecast() {
  const { activeTenant } = useTenant();
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
      if (!activeTenant?.id) {
        throw new Error('No active tenant');
      }

      // 1. Get matched customers from affinity view
      let customerQuery = supabase
        .from('v_cdp_customer_category_affinity')
        .select('customer_id, affinity_score, recency_status')
        .eq('tenant_id', activeTenant.id)
        .eq('category', input.category)
        .gte('affinity_score', 30)
        .in('recency_status', ['hot', 'warm', 'cool']);

      if (input.priceTier) {
        customerQuery = customerQuery.eq('price_tier', input.priceTier);
      }

      const { data: matchedCustomers } = await customerQuery;
      const matchedCount = matchedCustomers?.length || 0;

      // 2. Get benchmark products stats
      const { data: benchmarks } = await supabase
        .from('v_cdp_product_benchmark')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .in('product_id', input.benchmarkProductIds);

      // Calculate average new customer % from benchmarks
      const avgNewCustomerPct = benchmarks?.length
        ? benchmarks.reduce((sum, b) => sum + (b.new_customer_pct || 0), 0) / benchmarks.length
        : 12; // Default 12% if no benchmarks

      // 3. Get category conversion rate
      const { data: conversionData } = await supabase
        .from('v_cdp_category_conversion_stats')
        .select('category_penetration_pct, orders_per_buyer')
        .eq('tenant_id', activeTenant.id)
        .eq('category', input.category)
        .maybeSingle();

      // Use category penetration as proxy for conversion rate (10-15% typical)
      const conversionRate = Math.min((conversionData?.category_penetration_pct || 10) / 2, 20);

      // 4. Calculate estimates
      const estimatedExisting = Math.round(matchedCount * (conversionRate / 100));
      const estimatedNew = Math.round(estimatedExisting * (avgNewCustomerPct / (100 - avgNewCustomerPct)));
      const estimatedTotal = estimatedExisting + estimatedNew;

      // Determine confidence level
      let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
      if (matchedCount >= 100 && (benchmarks?.length || 0) >= 3) {
        confidenceLevel = 'high';
      } else if (matchedCount < 20 || (benchmarks?.length || 0) < 1) {
        confidenceLevel = 'low';
      }

      // 5. Save forecast to database
      const { data: forecast, error } = await supabase
        .from('cdp_product_forecasts')
        .insert({
          tenant_id: activeTenant.id,
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
            benchmark_count: benchmarks?.length || 0,
            avg_new_customer_pct: avgNewCustomerPct,
            category_penetration: conversionData?.category_penetration_pct,
          },
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('[useCalculateForecast] Error:', error);
        throw error;
      }

      return forecast as ProductForecast;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-product-forecasts'] });
    },
  });
}

// Get unique categories from data
export function useAvailableCategories() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-available-categories', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('v_cdp_category_conversion_stats')
        .select('category, unique_buyers, avg_price')
        .eq('tenant_id', activeTenant.id)
        .order('unique_buyers', { ascending: false });

      if (error) {
        console.error('[useAvailableCategories] Error:', error);
        return [];
      }

      return (data || []).map(d => ({
        category: d.category,
        buyers: d.unique_buyers,
        avgPrice: d.avg_price,
      }));
    },
    enabled: !!activeTenant?.id,
  });
}

// Count unique active customers within a configurable date range
export function useActiveCustomerCount(startDate?: string, endDate?: string) {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['cdp-active-customer-count', activeTenant?.id, startDate, endDate],
    queryFn: async () => {
      if (!activeTenant?.id || !startDate || !endDate) return 0;

      const { data, error } = await supabase
        .from('cdp_orders')
        .select('customer_id')
        .eq('tenant_id', activeTenant.id)
        .gte('order_at', startDate)
        .lte('order_at', endDate);

      if (error) {
        console.error('[useActiveCustomerCount] Error:', error);
        return 0;
      }

      // Count unique customers
      const uniqueCustomers = new Set(data?.map(d => d.customer_id) || []);
      return uniqueCustomers.size;
    },
    enabled: !!activeTenant?.id && !!startDate && !!endDate,
  });
}
