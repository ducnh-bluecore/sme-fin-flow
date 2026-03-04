import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface PriceSegment {
  band: string;
  band_order: number;
  store_pct: number;
  store_revenue: number;
  store_qty: number;
  chain_pct: number;
  tier_pct: number;
}

export interface CategoryMix {
  category: string;
  store_pct: number;
  store_revenue: number;
  store_qty: number;
  chain_pct: number;
  tier_pct: number;
}

export interface CollectionMix {
  collection: string;
  store_pct: number;
  store_revenue: number;
  store_qty: number;
  chain_pct: number;
}

export interface ProductRank {
  product_name: string;
  sku: string;
  revenue: number;
  qty: number;
  avg_price: number;
}

export interface StoreProductMix {
  price_segments: PriceSegment[];
  categories: CategoryMix[];
  collections: CollectionMix[];
  top_products: ProductRank[];
  bottom_products: ProductRank[];
  period: { from: string; to: string };
}

export function useStoreProductMix(storeId: string | null, fromDate?: string, toDate?: string) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-product-mix', tenantId, storeId, fromDate, toDate],
    queryFn: async () => {
      const params: any = { p_tenant_id: tenantId, p_store_id: storeId };
      if (fromDate) params.p_from_date = fromDate;
      if (toDate) params.p_to_date = toDate;

      const { data, error } = await supabase.rpc('fn_store_product_mix' as any, params);
      if (error) throw error;
      return data as unknown as StoreProductMix;
    },
    enabled: isReady && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}
