/**
 * useModelTotalCounts - Query total record counts from all CDP model tables
 * Shows the REAL total in DB, not just latest sync batch
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const E2E_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const MODEL_TABLES = [
  { model: 'customers', table: 'cdp_customers' },
  { model: 'orders', table: 'cdp_orders' },
  { model: 'order_items', table: 'cdp_order_items' },
  { model: 'payments', table: 'cdp_payments' },
  { model: 'fulfillments', table: 'cdp_fulfillments' },
  { model: 'refunds', table: 'cdp_refunds' },
  { model: 'products', table: 'products' },
] as const;

export type ModelTotalCounts = Record<string, number>;

export function useModelTotalCounts() {
  return useQuery({
    queryKey: ['model-total-counts'],
    queryFn: async (): Promise<ModelTotalCounts> => {
      const results = await Promise.all(
        MODEL_TABLES.map(async ({ model, table }) => {
          const { count, error } = await (supabase as any)
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', E2E_TENANT_ID);

          if (error) {
            console.warn(`Failed to count ${table}:`, error.message);
            return { model, count: 0 };
          }
          return { model, count: count ?? 0 };
        })
      );

      return Object.fromEntries(results.map(r => [r.model, r.count]));
    },
    staleTime: 60_000, // Cache 60s
    refetchInterval: 120_000, // Refresh every 2 min
  });
}
