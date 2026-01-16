import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to measure metrics for an entity
async function measureEntityMetrics(
  supabase: any,
  tenantId: string,
  entityType: string,
  entityId: string | null
): Promise<Record<string, number | null>> {
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
      return {
        gross_margin_percent: skuData.gross_margin_percent ?? null,
        daily_revenue: skuData.daily_revenue ?? null,
        net_profit: skuData.net_profit ?? null,
      };

    case 'CASH':
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('tenant_id', tenantId);
      
      const totalCash = (bankData || []).reduce((sum: number, b: any) => sum + (b.current_balance || 0), 0);
      
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const monthlyBurn = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const runwayDays = monthlyBurn > 0 ? Math.round((totalCash / monthlyBurn) * 30) : 999;

      return {
        cash_balance: totalCash,
        runway_days: runwayDays,
        monthly_burn: monthlyBurn,
      };

    case 'CHANNEL':
      // Channel metrics would come from marketing data
      return {
        ad_spend_7d: null,
        roas: null,
        cpa: null,
      };

    default:
      return {};
  }
}

// Calculate variance between baseline and current metrics
function calculateVariance(
  baseline: Record<string, any>,
  current: Record<string, any>
): Record<string, { baseline: number; current: number; change: number; changePercent: number }> {
  const variance: Record<string, any> = {};
  
  for (const key of Object.keys(baseline)) {
    const baseVal = typeof baseline[key] === 'number' ? baseline[key] : 0;
    const currVal = typeof current[key] === 'number' ? current[key] : 0;
    const change = currVal - baseVal;
    const changePercent = baseVal !== 0 ? (change / Math.abs(baseVal)) * 100 : 0;
    
    variance[key] = {
      baseline: baseVal,
      current: currVal,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }
  
  return variance;
}

// Suggest outcome status based on entity type and variance
function suggestOutcomeStatus(
  entityType: string,
  variance: Record<string, any>,
  actionType: string | null
): 'positive' | 'neutral' | 'negative' | 'too_early' {
  switch (entityType.toUpperCase()) {
    case 'SKU':
      const marginChange = variance.gross_margin_percent?.change || 0;
      if (marginChange > 5) return 'positive';
      if (marginChange < -5) return 'negative';
      return 'neutral';

    case 'CASH':
      const runwayChange = variance.runway_days?.change || 0;
      if (runwayChange > 7) return 'positive';
      if (runwayChange < -7) return 'negative';
      return 'neutral';

    case 'CHANNEL':
      if (actionType === 'PAUSE') return 'positive'; // Assumed positive if we stopped spending
      return 'neutral';

    default:
      return 'neutral';
  }
}

// Generate outcome summary
function generateSummary(
  entityType: string,
  entityLabel: string | null,
  variance: Record<string, any>
): string {
  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toFixed(0);
  };

  switch (entityType.toUpperCase()) {
    case 'SKU':
      const margin = variance.gross_margin_percent;
      return margin 
        ? `[Tự động] Margin ${entityLabel || 'SKU'}: ${margin.baseline.toFixed(1)}% → ${margin.current.toFixed(1)}%`
        : `[Tự động] Đo lường ${entityLabel || 'SKU'}`;

    case 'CASH':
      const runway = variance.runway_days;
      const cash = variance.cash_balance;
      if (runway && cash) {
        return `[Tự động] Cash: ${formatNum(cash.baseline)}đ → ${formatNum(cash.current)}đ | Runway: ${runway.baseline} → ${runway.current} ngày`;
      }
      return `[Tự động] Cash position đã cập nhật`;

    case 'CHANNEL':
      return `[Tự động] Đo lường ${entityLabel || 'Channel'}`;

    default:
      return `[Tự động] Đo lường ${entityLabel || entityType}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Find decisions that are due for follow-up (today or overdue)
    const { data: dueFollowups, error: fetchError } = await supabase
      .from('decision_audit_log')
      .select('*')
      .in('follow_up_status', ['pending', 'in_progress'])
      .lte('follow_up_date', today)
      .not('entity_type', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${dueFollowups?.length || 0} decisions due for auto-measurement`);

    const results: any[] = [];

    for (const decision of (dueFollowups || [])) {
      try {
        const tenantId = decision.tenant_id;
        const entityType = decision.entity_type || 'UNKNOWN';
        const entityId = decision.entity_id;
        const entityLabel = decision.entity_label;

        // Get baseline metrics
        let baselineMetrics: Record<string, any> = {};
        if (decision.baseline_metrics) {
          baselineMetrics = decision.baseline_metrics;
        } else if (decision.card_snapshot) {
          const snapshot = decision.card_snapshot as Record<string, any>;
          baselineMetrics = {
            gross_margin_percent: snapshot.margin_percent ?? snapshot.gross_margin_percent,
            cash_balance: snapshot.cash_balance,
            runway_days: snapshot.runway_days,
          };
        }

        // Measure current metrics
        const currentMetrics = await measureEntityMetrics(supabase, tenantId, entityType, entityId);

        // Calculate variance
        const variance = calculateVariance(baselineMetrics, currentMetrics);

        // Check if we have any current data
        const hasCurrentData = Object.values(currentMetrics).some(v => v != null && v !== 0);

        // Suggest status
        const outcomeStatus = hasCurrentData 
          ? suggestOutcomeStatus(entityType, variance, decision.selected_action_type)
          : 'too_early';

        // Generate summary
        const outcomeSummary = hasCurrentData
          ? generateSummary(entityType, entityLabel, variance)
          : `[Tự động] Chưa có đủ dữ liệu để đo lường ${entityLabel || entityType}`;

        // Calculate impact
        let actualImpact: number | null = null;
        if (variance.cash_balance?.change != null) actualImpact = variance.cash_balance.change;
        else if (variance.revenue_7d?.change != null) actualImpact = variance.revenue_7d.change;

        // Insert outcome
        const { data: outcome, error: insertError } = await supabase
          .from('decision_outcomes')
          .insert({
            tenant_id: tenantId,
            decision_audit_id: decision.id,
            measured_by: null, // System auto-measure
            actual_impact_amount: actualImpact,
            outcome_status: outcomeStatus,
            outcome_summary: outcomeSummary,
            is_auto_measured: true,
            baseline_metrics: baselineMetrics,
            current_metrics: currentMetrics,
            measurement_timestamp: now.toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting outcome for ${decision.id}:`, insertError);
          continue;
        }

        // Update follow-up status to completed
        await supabase
          .from('decision_audit_log')
          .update({ follow_up_status: 'completed' })
          .eq('id', decision.id);

        results.push({
          decisionId: decision.id,
          entityLabel,
          outcomeStatus,
          success: true,
        });

        console.log(`Auto-measured outcome for ${entityLabel || decision.id}: ${outcomeStatus}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing decision ${decision.id}:`, err);
        results.push({
          decisionId: decision.id,
          error: errorMessage,
          success: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in auto-measure-outcomes:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
