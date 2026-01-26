/**
 * useWorkingCapitalDaily - SSOT Wrapper
 * 
 * ⚠️ DB-First: Fetches precomputed data from working_capital_daily table
 * NO client-side calculations for DSO/DPO/DIO/CCC
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface FormattedWorkingCapital {
  day: string;
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  totalAR: number;
  totalAP: number;
  inventory: number;
  netWorkingCapital: number;
  arTurnover: number;
  apTurnover: number;
  inventoryTurnover: number;
}

/**
 * Fetch precomputed working capital daily metrics
 */
export function useWorkingCapitalDaily(options?: { days?: number }) {
  const { data: tenantId } = useActiveTenantId();
  const days = options?.days || 90;

  return useQuery({
    queryKey: ['working-capital-daily', tenantId, days],
    queryFn: async (): Promise<FormattedWorkingCapital[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('working_capital_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('metric_date', { ascending: false })
        .limit(days);

      if (error) {
        console.error('[useWorkingCapitalDaily] Error:', error);
        return [];
      }

      return (data || []).map((row) => ({
        day: row.metric_date,
        dso: Number(row.dso_days) || 0,
        dpo: Number(row.dpo_days) || 0,
        dio: Number(row.dio_days) || 0,
        ccc: Number(row.ccc_days) || 0,
        totalAR: Number(row.accounts_receivable) || 0,
        totalAP: Number(row.accounts_payable) || 0,
        inventory: Number(row.inventory_value) || 0,
        netWorkingCapital: Number(row.net_working_capital) || 0,
        arTurnover: Number(row.ar_turnover) || 0,
        apTurnover: Number(row.ap_turnover) || 0,
        inventoryTurnover: Number(row.inventory_turnover) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch latest working capital snapshot
 */
export function useLatestWorkingCapital() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['working-capital-latest', tenantId],
    queryFn: async (): Promise<FormattedWorkingCapital | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('working_capital_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const row = data as any;
      return {
        day: row.metric_date,
        dso: Number(row.dso_days) || 0,
        dpo: Number(row.dpo_days) || 0,
        dio: Number(row.dio_days) || 0,
        ccc: Number(row.ccc_days) || 0,
        totalAR: Number(row.accounts_receivable) || 0,
        totalAP: Number(row.accounts_payable) || 0,
        inventory: Number(row.inventory_value) || 0,
        netWorkingCapital: Number(row.net_working_capital) || 0,
        arTurnover: Number(row.ar_turnover) || 0,
        apTurnover: Number(row.ap_turnover) || 0,
        inventoryTurnover: Number(row.inventory_turnover) || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch CCC trend data
 */
export function useCCCTrend() {
  const { data: dailyData, isLoading } = useWorkingCapitalDaily({ days: 180 });

  const trend = (dailyData || []).map(d => ({
    date: d.day,
    ccc: d.ccc,
    dso: d.dso,
    dpo: d.dpo,
    dio: d.dio,
  }));

  return { data: trend, isLoading };
}
