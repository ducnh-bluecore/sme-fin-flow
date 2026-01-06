import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { useFinancialMetrics } from './useFinancialMetrics';

/**
 * Working Capital Hook - Refactored
 * Now uses useFinancialMetrics for core DSO/DPO calculations.
 * Avoids duplicate calculations with useCashConversionCycle.
 */

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

export function useWorkingCapitalMetrics() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['working-capital-metrics', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('working_capital_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as WorkingCapitalMetric[];
    },
    enabled: !!tenantId,
  });
}

export function useWorkingCapitalSummary() {
  const { data: tenantId } = useActiveTenantId();
  const { data: metrics } = useFinancialMetrics();
  
  return useQuery({
    queryKey: ['working-capital-summary', tenantId],
    queryFn: async () => {
      // Get historical metrics from DB
      const { data: dbMetrics, error: metricsError } = await supabase
        .from('working_capital_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(12);
      
      if (metricsError) throw metricsError;
      
      // Use centralized metrics for current calculations
      const totalAR = metrics?.avgAR || 0;
      const totalAP = metrics?.avgAP || 0;
      const calculatedDSO = metrics?.dso || 0;
      const calculatedDPO = metrics?.dpo || 0;
      const dailyRevenue = metrics?.dailySales || 0;
      const dailyExpenses = metrics?.totalExpenses ? metrics.totalExpenses / metrics.daysInPeriod : 0;
      const annualRevenue = metrics?.totalSales ? metrics.totalSales * (365 / metrics.daysInPeriod) : 0;
      const annualExpenses = metrics?.totalExpenses ? metrics.totalExpenses * (365 / metrics.daysInPeriod) : 0;
      
      // Build current metric using centralized data
      const current: WorkingCapitalMetric = {
        id: 'current',
        tenant_id: tenantId || '',
        metric_date: format(new Date(), 'yyyy-MM-dd'),
        dso_days: calculatedDSO,
        dpo_days: calculatedDPO,
        dio_days: metrics?.dio || 0,
        ccc_days: metrics?.ccc || (calculatedDSO - calculatedDPO),
        accounts_receivable: totalAR,
        accounts_payable: totalAP,
        inventory_value: metrics?.avgInventory || 0,
        current_assets: totalAR,
        current_liabilities: totalAP,
        net_working_capital: totalAR - totalAP,
        ar_turnover: totalAR > 0 ? annualRevenue / totalAR : 0,
        ap_turnover: totalAP > 0 ? annualExpenses / totalAP : 0,
        inventory_turnover: 0,
        target_dso: 30,
        target_dpo: 45,
        target_dio: null,
        potential_cash_release: calculatedDSO > 30 ? (calculatedDSO - 30) * dailyRevenue : 0,
        created_at: new Date().toISOString(),
      };
      
      // Generate recommendations based on centralized metrics
      const recommendations: WorkingCapitalRecommendation[] = [];
      
      if (calculatedDSO > 45) {
        recommendations.push({
          id: 'dso-high',
          type: 'dso',
          priority: 'high',
          title: 'DSO cao - Cần cải thiện thu hồi công nợ',
          description: `DSO hiện tại ${calculatedDSO} ngày, cao hơn mức tối ưu 30-45 ngày`,
          potentialImpact: (calculatedDSO - 30) * dailyRevenue,
          action: 'Tăng cường theo dõi công nợ, áp dụng chính sách thanh toán sớm',
        });
      }
      
      if (calculatedDPO < 30) {
        recommendations.push({
          id: 'dpo-low',
          type: 'dpo',
          priority: 'medium',
          title: 'DPO thấp - Có thể kéo dài kỳ thanh toán',
          description: `DPO hiện tại ${calculatedDPO} ngày, có thể đàm phán kéo dài với NCC`,
          potentialImpact: (45 - calculatedDPO) * dailyExpenses,
          action: 'Đàm phán lại điều khoản thanh toán với nhà cung cấp chính',
        });
      }
      
      const cccDays = calculatedDSO - calculatedDPO;
      if (cccDays > 60) {
        recommendations.push({
          id: 'ccc-high',
          type: 'general',
          priority: 'high',
          title: 'Chu kỳ tiền mặt dài',
          description: `CCC ${cccDays} ngày, vốn bị kẹt trong hoạt động kinh doanh`,
          potentialImpact: cccDays * dailyRevenue * 0.1,
          action: 'Cần cải thiện đồng thời DSO và DPO',
        });
      }
      
      // Determine CCC trend from historical data
      let cccTrend: 'improving' | 'stable' | 'worsening' = 'stable';
      if (dbMetrics && dbMetrics.length >= 3) {
        const recentCCC = dbMetrics.slice(0, 3).map(m => m.ccc_days);
        const avgRecent = recentCCC.reduce((a, b) => a + b, 0) / 3;
        const oldCCC = dbMetrics.slice(-3).map(m => m.ccc_days);
        const avgOld = oldCCC.reduce((a, b) => a + b, 0) / 3;
        
        if (avgRecent < avgOld - 5) cccTrend = 'improving';
        else if (avgRecent > avgOld + 5) cccTrend = 'worsening';
      }
      
      const summary: WorkingCapitalSummary = {
        current,
        trend: dbMetrics as WorkingCapitalMetric[] || [],
        recommendations,
        totalPotentialCashRelease: recommendations.reduce((sum, r) => sum + r.potentialImpact, 0),
        cccTrend,
      };
      
      return summary;
    },
    enabled: !!tenantId && !!metrics,
  });
}

export function useSaveWorkingCapitalMetric() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  
  return useMutation({
    mutationFn: async (metric: Partial<WorkingCapitalMetric>) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
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
