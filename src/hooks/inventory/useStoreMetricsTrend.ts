import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface DailyMetricPoint {
  date: string;
  label: string; // dd/MM
  customers: number;
  transactions: number;
  revenue: number;
  aov: number;
  ipt: number; // items_per_transaction approximated as revenue/aov/transactions
  repeatRate: number;
}

export function useStoreMetricsTrend(storeId: string | null, days = 30) {
  const { tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['store-metrics-trend', tenantId, storeId, days],
    queryFn: async (): Promise<DailyMetricPoint[]> => {
      if (!tenantId || !storeId) return [];

      // First get max date for this store
      const { data: maxRow } = await supabase
        .from('store_daily_metrics')
        .select('metrics_date')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .order('metrics_date', { ascending: false })
        .limit(1)
        .single();

      if (!maxRow) return [];

      const maxDate = maxRow.metrics_date;
      const startDate = new Date(maxDate);
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('store_daily_metrics')
        .select('metrics_date, customer_count, total_transactions, total_revenue, avg_transaction_value, repeat_customer_count, new_customer_count')
        .eq('tenant_id', tenantId)
        .eq('store_id', storeId)
        .gte('metrics_date', startStr)
        .lte('metrics_date', maxDate)
        .order('metrics_date', { ascending: true });

      if (error || !data) return [];

      return data.map((d: any) => {
        const customers = d.customer_count || 0;
        const transactions = d.total_transactions || 0;
        const revenue = d.total_revenue || 0;
        const aov = d.avg_transaction_value || 0;
        const repeatCount = d.repeat_customer_count || 0;
        const repeatRate = customers > 0 ? (repeatCount / customers) * 100 : 0;
        const ipt = transactions > 0 && aov > 0 ? revenue / transactions / aov : 0;

        const dt = new Date(d.metrics_date);
        const label = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;

        return {
          date: d.metrics_date,
          label,
          customers,
          transactions,
          revenue,
          aov,
          ipt: Math.round(ipt * 10) / 10,
          repeatRate: Math.round(repeatRate * 10) / 10,
        };
      });
    },
    enabled: !!tenantId && isReady && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}
