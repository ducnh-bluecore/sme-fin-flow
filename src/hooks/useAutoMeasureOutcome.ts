import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

interface EntityMetrics {
  entity_type: string;
  entity_id: string;
  metrics: Record<string, number | string | null>;
  measured_at: string;
}

interface MeasurementResult {
  baseline: EntityMetrics;
  current: EntityMetrics;
  variance: Record<string, { 
    baseline: number; 
    current: number; 
    change: number; 
    changePercent: number;
    hasCurrentData: boolean;  // New flag
  }>;
  summary: string;
  suggestedStatus: 'positive' | 'neutral' | 'negative' | 'too_early';
  hasCurrentData: boolean;  // Overall flag
}

// Hàm đo lường metrics theo entity type
async function measureEntityMetrics(
  tenantId: string,
  entityType: string,
  entityId: string | null
): Promise<Record<string, number | string | null>> {
  switch (entityType.toUpperCase()) {
    case 'SKU':
      if (!entityId) return {};
      const { data: skuData } = await supabase
        .from('object_calculated_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('object_type', 'sku')
        .eq('external_id', entityId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!skuData) return {};
      
      // Use available columns from object_calculated_metrics
      const skuMetrics = skuData as Record<string, any>;
      return {
        gross_margin_percent: skuMetrics.gross_margin_percent ?? null,
        daily_revenue: skuMetrics.daily_revenue ?? null,
        net_profit: skuMetrics.net_profit ?? null,
        total_quantity_sold: skuMetrics.total_quantity_sold ?? null,
      };

    case 'CASH':
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('tenant_id', tenantId);
      
      const totalCash = (bankData || []).reduce((sum, b) => sum + (b.current_balance || 0), 0);
      
      // Get runway estimate from expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const monthlyBurn = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const runwayDays = monthlyBurn > 0 ? Math.round((totalCash / monthlyBurn) * 30) : 999;

      return {
        cash_balance: totalCash,
        runway_days: runwayDays,
        monthly_burn: monthlyBurn,
      };

    case 'CHANNEL':
      // Skip channel measurement for now - requires custom query
      return {
        revenue_7d: null,
      };

    default:
      return {};
  }
}

// Tính variance giữa baseline và current
function calculateVariance(
  baseline: Record<string, any>,
  current: Record<string, any>
): { 
  variance: Record<string, { baseline: number; current: number; change: number; changePercent: number; hasCurrentData: boolean }>;
  hasAnyCurrentData: boolean;
} {
  const variance: Record<string, { baseline: number; current: number; change: number; changePercent: number; hasCurrentData: boolean }> = {};
  let hasAnyCurrentData = false;
  
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  
  for (const key of allKeys) {
    const baseVal = typeof baseline[key] === 'number' ? baseline[key] : 0;
    const currVal = typeof current[key] === 'number' ? current[key] : null;
    const hasCurrentData = currVal !== null && currVal !== 0;
    
    if (hasCurrentData) hasAnyCurrentData = true;
    
    const actualCurrent = currVal ?? 0;
    const change = actualCurrent - baseVal;
    const changePercent = baseVal !== 0 ? (change / Math.abs(baseVal)) * 100 : (actualCurrent !== 0 ? 100 : 0);
    
    variance[key] = {
      baseline: baseVal,
      current: actualCurrent,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      hasCurrentData,
    };
  }
  
  return { variance, hasAnyCurrentData };
}

// Đề xuất status dựa trên variance
function suggestOutcomeStatus(
  entityType: string,
  variance: Record<string, { baseline: number; current: number; change: number; changePercent: number; hasCurrentData: boolean }>,
  actionType: string | null
): 'positive' | 'neutral' | 'negative' | 'too_early' {
  // Logic cơ bản dựa trên entity type
  switch (entityType.toUpperCase()) {
    case 'SKU':
      const marginChange = variance.gross_margin_percent?.change || variance.margin_percent?.change || 0;
      if (marginChange > 5) return 'positive';
      if (marginChange < -5) return 'negative';
      return 'neutral';

    case 'CASH':
      const runwayChange = variance.runway_days?.change || 0;
      const cashChange = variance.cash_balance?.change || 0;
      if (runwayChange > 7 || cashChange > 0) return 'positive';
      if (runwayChange < -7 || cashChange < 0) return 'negative';
      return 'neutral';

    case 'CHANNEL':
      // For ads channels, lower spend can be positive if PAUSE was the action
      const adSpendChange = variance.ad_spend_7d?.change || 0;
      const roasChange = variance.roas?.change || 0;
      if (actionType === 'PAUSE' && adSpendChange < 0) return 'positive'; // Successfully reduced spend
      if (roasChange > 0.5) return 'positive';
      if (roasChange < -0.5) return 'negative';
      return 'neutral';

    default:
      return 'neutral';
  }
}

// Generate summary text
function generateSummary(
  entityType: string,
  entityLabel: string | null,
  variance: Record<string, { baseline: number; current: number; change: number; changePercent: number; hasCurrentData: boolean }>,
  suggestedStatus: string
): string {
  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toFixed(0);
  };

  switch (entityType.toUpperCase()) {
    case 'SKU':
      const margin = variance.margin_percent;
      return margin 
        ? `Margin ${entityLabel || 'SKU'}: ${margin.baseline.toFixed(1)}% → ${margin.current.toFixed(1)}% (${margin.change >= 0 ? '+' : ''}${margin.change.toFixed(1)}%)`
        : `Không đủ dữ liệu để đo lường ${entityLabel || 'SKU'}`;

    case 'CASH':
      const runway = variance.runway_days;
      const cash = variance.cash_balance;
      if (runway && cash) {
        return `Cash: ${formatNum(cash.baseline)}đ → ${formatNum(cash.current)}đ | Runway: ${runway.baseline} → ${runway.current} ngày`;
      }
      return `Cash position đã thay đổi`;

    case 'CHANNEL':
      // For ads channels, show relevant metrics
      const adSpend = variance.ad_spend_7d;
      const roas = variance.roas;
      const cpa = variance.cpa;
      
      if (adSpend?.hasCurrentData && roas?.hasCurrentData) {
        return `${entityLabel || 'Channel'}: Ad Spend ${formatNum(adSpend.baseline)}đ → ${formatNum(adSpend.current)}đ | ROAS ${roas.baseline} → ${roas.current}`;
      }
      if (adSpend?.baseline && !adSpend?.hasCurrentData) {
        return `${entityLabel || 'Channel'}: Baseline Ad Spend ${formatNum(adSpend.baseline)}đ, ROAS ${roas?.baseline || 'N/A'}. Chưa có data hiện tại để so sánh.`;
      }
      return `Chưa có đủ dữ liệu để đo lường ${entityLabel || 'Channel'}`;

    default:
      return `Đã đo lường ${entityLabel || entityType}`;
  }
}

// Hook chính: Auto-measure outcome
export function useAutoMeasureOutcome() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (decisionAuditId: string): Promise<MeasurementResult> => {
      if (!tenantId) throw new Error('Missing tenantId');

      // 1. Lấy thông tin decision
      const { data: decision, error } = await supabase
        .from('decision_audit_log')
        .select('*')
        .eq('id', decisionAuditId)
        .single();

      if (error || !decision) throw new Error('Decision not found');

      const entityType = decision.entity_type || 'UNKNOWN';
      const entityId = decision.entity_id;
      const entityLabel = decision.entity_label;

      // 2. Lấy baseline từ card_snapshot hoặc baseline_metrics
      let baselineMetrics: Record<string, any> = {};
      
      if (decision.baseline_metrics) {
        baselineMetrics = decision.baseline_metrics as Record<string, any>;
      } else if (decision.card_snapshot) {
        const snapshot = decision.card_snapshot as Record<string, any>;
        // Extract metrics from snapshot
        baselineMetrics = {
          margin_percent: snapshot.margin_percent ?? snapshot.facts?.find((f: any) => f.label?.includes('Margin'))?.value,
          revenue_7d: snapshot.revenue_7d ?? snapshot.facts?.find((f: any) => f.label?.includes('Revenue'))?.value,
          cash_balance: snapshot.cash_balance,
          runway_days: snapshot.runway_days ?? snapshot.facts?.find((f: any) => f.label?.includes('Runway'))?.value,
        };
      }

      // 3. Đo metrics hiện tại
      const currentMetrics = await measureEntityMetrics(tenantId, entityType, entityId);

      // 4. Tính variance
      const { variance, hasAnyCurrentData } = calculateVariance(baselineMetrics, currentMetrics);

      // 5. Suggest status - nếu không có data hiện tại, suggest "too_early"
      const suggestedStatus = hasAnyCurrentData 
        ? suggestOutcomeStatus(entityType, variance, decision.selected_action_type)
        : 'too_early';

      // 6. Generate summary
      const summary = hasAnyCurrentData 
        ? generateSummary(entityType, entityLabel, variance, suggestedStatus)
        : `Chưa có đủ dữ liệu để đo lường ${entityLabel || entityType}. Vui lòng nhập thủ công hoặc thử lại sau.`;

      return {
        baseline: {
          entity_type: entityType,
          entity_id: entityId || '',
          metrics: baselineMetrics,
          measured_at: decision.decided_at,
        },
        current: {
          entity_type: entityType,
          entity_id: entityId || '',
          metrics: currentMetrics,
          measured_at: new Date().toISOString(),
        },
        variance,
        summary,
        suggestedStatus,
        hasCurrentData: hasAnyCurrentData,
      };
    },
    onError: (error) => {
      console.error('Error auto-measuring outcome:', error);
      toast.error('Không thể đo lường tự động');
    },
  });
}

// Hook để lưu measured outcome
export function useSaveMeasuredOutcome() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({
      decisionAuditId,
      measurementResult,
      outcomeSummary,
      outcomeStatus,
      lessonsLearned,
      wouldRepeat,
    }: {
      decisionAuditId: string;
      measurementResult: MeasurementResult;
      outcomeSummary: string;
      outcomeStatus: 'positive' | 'neutral' | 'negative' | 'too_early';
      lessonsLearned?: string;
      wouldRepeat?: boolean;
    }) => {
      if (!tenantId) throw new Error('Missing tenantId');

      const { data: { user } } = await supabase.auth.getUser();

      // Calculate impact from variance if possible
      let actualImpact: number | null = null;
      const cashChange = measurementResult.variance.cash_balance?.change;
      const revenueChange = measurementResult.variance.revenue_7d?.change;
      
      if (cashChange != null) actualImpact = cashChange;
      else if (revenueChange != null) actualImpact = revenueChange;

      // Insert outcome
      const { data, error } = await supabase
        .from('decision_outcomes')
        .insert({
          tenant_id: tenantId,
          decision_audit_id: decisionAuditId,
          measured_by: user?.id ?? null,
          actual_impact_amount: actualImpact,
          outcome_status: outcomeStatus,
          outcome_summary: outcomeSummary,
          lessons_learned: lessonsLearned ?? null,
          would_repeat: wouldRepeat ?? null,
          is_auto_measured: true,
          baseline_metrics: measurementResult.baseline.metrics,
          current_metrics: measurementResult.current.metrics,
          measurement_timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update follow-up status
      await supabase
        .from('decision_audit_log')
        .update({ follow_up_status: 'completed' })
        .eq('id', decisionAuditId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] });
      queryClient.invalidateQueries({ queryKey: ['unified-decision-history'] });
      toast.success('Đã ghi nhận kết quả tự động');
    },
    onError: (error) => {
      console.error('Error saving measured outcome:', error);
      toast.error('Không thể lưu kết quả');
    },
  });
}
