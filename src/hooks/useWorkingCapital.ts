/**
 * useWorkingCapital - REFACTORED to use precomputed data
 * 
 * ⚠️ NOW USES CANONICAL HOOKS ONLY - NO CLIENT-SIDE CALCULATIONS
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useWorkingCapitalDaily, useLatestWorkingCapital, FormattedWorkingCapital } from './useWorkingCapitalDaily';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useTenantSupabaseCompat } from './useTenantSupabase';

// =============================================================
// TYPES
// =============================================================

export interface WorkingCapitalMetric {
  id: string;
  tenant_id: string;
  metric_date: string;
  dso_days: number;
  dpo_days: number;
  dio_days: number;
  ccc_days: number;
  accounts_receivable: number;
  accounts_payable: number;
  inventory_value: number;
  current_assets: number;
  current_liabilities: number;
  net_working_capital: number;
  ar_turnover: number;
  ap_turnover: number;
  inventory_turnover: number;
  target_dso: number | null;
  target_dpo: number | null;
  target_dio: number | null;
  potential_cash_release: number;
  created_at: string;
}

export interface WorkingCapitalSummary {
  current: WorkingCapitalMetric | null;
  trend: WorkingCapitalMetric[];
  recommendations: WorkingCapitalRecommendation[];
  totalPotentialCashRelease: number;
  cccTrend: 'improving' | 'stable' | 'worsening';
}

export interface WorkingCapitalRecommendation {
  id: string;
  type: 'dso' | 'dpo' | 'dio' | 'general';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialImpact: number;
  action: string;
}

// =============================================================
// MAIN HOOKS - Now thin wrappers over canonical hooks
// =============================================================

export function useWorkingCapitalMetrics() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['working-capital-metrics', tenantId],
    queryFn: async () => {
      let query = client
        .from('working_capital_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(12);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WorkingCapitalMetric[];
    },
    enabled: isReady,
  });
}

/**
 * REFACTORED: Now uses precomputed data from working_capital_daily
 * NO client-side DSO/DPO/CCC calculations
 */
export function useWorkingCapitalSummary() {
  const { tenantId, isReady } = useTenantSupabaseCompat();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  
  // Use canonical precomputed hooks
  const { data: dailyData } = useWorkingCapitalDaily({ days: 90 });
  const { data: latestWC } = useLatestWorkingCapital();
  const { data: snapshot } = useFinanceTruthSnapshot();
  
  return useQuery({
    queryKey: ['working-capital-summary', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<WorkingCapitalSummary | null> => {
      // Build current metric from precomputed data ONLY
      const dso = snapshot?.dso ?? latestWC?.dso ?? 0;
      const dpo = snapshot?.dpo ?? latestWC?.dpo ?? 0;
      const dio = snapshot?.dio ?? latestWC?.dio ?? 0;
      const ccc = snapshot?.ccc ?? latestWC?.ccc ?? (dso + dio - dpo);
      const totalAR = snapshot?.totalAR ?? latestWC?.totalAR ?? 0;
      const totalAP = snapshot?.totalAP ?? latestWC?.totalAP ?? 0;
      const inventory = snapshot?.totalInventoryValue ?? latestWC?.inventory ?? 0;
      
      // Targets from DB or industry defaults
      const targetDSO = 30;
      const targetDPO = 45;
      const targetDIO = 45;
      
      const potentialCashRelease = dso > targetDSO && dso > 0
        ? totalAR * (1 - targetDSO / dso)
        : 0;
      
      const current: WorkingCapitalMetric = {
        id: 'current',
        tenant_id: tenantId || '',
        metric_date: latestWC?.day || format(new Date(), 'yyyy-MM-dd'),
        dso_days: dso,
        dpo_days: dpo,
        dio_days: dio,
        ccc_days: ccc,
        accounts_receivable: totalAR,
        accounts_payable: totalAP,
        inventory_value: inventory,
        current_assets: totalAR + inventory,
        current_liabilities: totalAP,
        net_working_capital: latestWC?.netWorkingCapital ?? (totalAR + inventory - totalAP),
        ar_turnover: latestWC?.arTurnover ?? 0,
        ap_turnover: latestWC?.apTurnover ?? 0,
        inventory_turnover: latestWC?.inventoryTurnover ?? 0,
        target_dso: targetDSO,
        target_dpo: targetDPO,
        target_dio: targetDIO,
        potential_cash_release: potentialCashRelease,
        created_at: new Date().toISOString(),
      };
      
      // Build trend from precomputed daily data
      const trend: WorkingCapitalMetric[] = (dailyData || []).map((d: FormattedWorkingCapital) => ({
        id: d.day,
        tenant_id: tenantId || '',
        metric_date: d.day,
        dso_days: d.dso,
        dpo_days: d.dpo,
        dio_days: d.dio,
        ccc_days: d.ccc,
        accounts_receivable: d.totalAR,
        accounts_payable: d.totalAP,
        inventory_value: d.inventory,
        current_assets: d.totalAR + d.inventory,
        current_liabilities: d.totalAP,
        net_working_capital: d.netWorkingCapital,
        ar_turnover: d.arTurnover,
        ap_turnover: d.apTurnover,
        inventory_turnover: d.inventoryTurnover,
        target_dso: targetDSO,
        target_dpo: targetDPO,
        target_dio: targetDIO,
        potential_cash_release: 0,
        created_at: d.day,
      }));
      
      // Generate recommendations from precomputed values
      const recommendations: WorkingCapitalRecommendation[] = [];
      const dailyRevenue = snapshot?.netRevenue && snapshot?.netRevenue > 0 
        ? snapshot.netRevenue / 30 : 0;
      
      if (dso > 45) {
        recommendations.push({
          id: 'dso-high',
          type: 'dso',
          priority: 'high',
          title: 'DSO cao - Cần cải thiện thu hồi công nợ',
          description: `DSO hiện tại ${dso} ngày, cao hơn mức tối ưu 30-45 ngày`,
          potentialImpact: (dso - 30) * dailyRevenue,
          action: 'Tăng cường theo dõi công nợ, áp dụng chính sách thanh toán sớm',
        });
      }
      
      if (dpo < 30) {
        recommendations.push({
          id: 'dpo-low',
          type: 'dpo',
          priority: 'medium',
          title: 'DPO thấp - Có thể kéo dài kỳ thanh toán',
          description: `DPO hiện tại ${dpo} ngày, có thể đàm phán kéo dài với NCC`,
          potentialImpact: (45 - dpo) * dailyRevenue * 0.7,
          action: 'Đàm phán lại điều khoản thanh toán với nhà cung cấp chính',
        });
      }
      
      if (ccc > 60) {
        recommendations.push({
          id: 'ccc-high',
          type: 'general',
          priority: 'high',
          title: 'Chu kỳ tiền mặt dài',
          description: `CCC ${ccc} ngày, vốn bị kẹt trong hoạt động kinh doanh`,
          potentialImpact: ccc * dailyRevenue * 0.1,
          action: 'Cần cải thiện đồng thời DSO và DPO',
        });
      }
      
      // Determine CCC trend from precomputed trend data
      let cccTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (trend.length >= 6) {
        const recentCCC = trend.slice(0, 3).map(m => m.ccc_days);
        const avgRecent = recentCCC.reduce((a, b) => a + b, 0) / 3;
        const oldCCC = trend.slice(-3).map(m => m.ccc_days);
        const avgOld = oldCCC.reduce((a, b) => a + b, 0) / 3;
        
        if (avgRecent < avgOld - 5) cccTrend = 'improving';
        else if (avgRecent > avgOld + 5) cccTrend = 'worsening';
      }
      
      return {
        current,
        trend,
        recommendations,
        totalPotentialCashRelease: recommendations.reduce((sum, r) => sum + r.potentialImpact, 0),
        cccTrend,
      };
    },
    enabled: isReady && (!!latestWC || !!snapshot),
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================
// MUTATION - Keep for saving metrics
// =============================================================

export function useSaveWorkingCapitalMetric() {
  const queryClient = useQueryClient();
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  
  return useMutation({
    mutationFn: async (metric: Partial<WorkingCapitalMetric>) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await client
        .from('working_capital_metrics')
        .upsert({
          ...metric,
          tenant_id: tenantId,
          metric_date: metric.metric_date || format(new Date(), 'yyyy-MM-dd'),
        }, {
          onConflict: 'tenant_id,metric_date',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-capital'] });
      toast.success('Đã lưu chỉ số vốn lưu động');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
