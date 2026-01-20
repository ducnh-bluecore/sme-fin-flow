import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurable assumptions
const MANUAL_RECONCILIATION_MINUTES = 7;
const HOURLY_RATE_VND = 150000; // VND per hour for ops staff

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get tenant
    const { data: tenantUser } = await supabaseClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: 'No tenant found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = tenantUser.tenant_id;
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d';

    // Calculate date range
    const endDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get outcomes for the period
    const { data: outcomes, error: outcomesError } = await supabaseClient
      .from('reconciliation_suggestion_outcomes')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);

    if (outcomesError) {
      console.error('Error fetching outcomes:', outcomesError);
    }

    const outcomesList = outcomes || [];

    // Calculate KPIs
    const autoConfirmedCount = outcomesList.filter(o => o.outcome === 'AUTO_CONFIRMED').length;
    const manualConfirmedCount = outcomesList.filter(o => o.outcome === 'CONFIRMED_MANUAL').length;
    const rejectedCount = outcomesList.filter(o => o.outcome === 'REJECTED').length;
    const totalSuggestions = outcomesList.length;

    // False auto = auto-confirmed that were later marked incorrect (VOID in ledger)
    const falseAutoCount = outcomesList.filter(
      o => o.outcome === 'AUTO_CONFIRMED' && o.final_result === 'INCORRECT'
    ).length;

    // Average confidence at time of decision
    const confidences = outcomesList
      .filter(o => o.confidence_at_time !== null)
      .map(o => Number(o.confidence_at_time));
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    // Calculate savings
    const totalAutoReconciled = autoConfirmedCount + manualConfirmedCount;
    const estimatedMinutesSaved = autoConfirmedCount * MANUAL_RECONCILIATION_MINUTES;
    const estimatedHoursSaved = estimatedMinutesSaved / 60;
    const estimatedCostSaved = estimatedHoursSaved * HOURLY_RATE_VND;

    // Get reconciliation links for cash acceleration calculation
    const { data: recentLinks } = await supabaseClient
      .from('reconciliation_links')
      .select('amount, matched_at, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .eq('status', 'ACTIVE');

    // Estimate cash acceleration (simplified: assume auto-reconciliation saves 2 days on average)
    const AVG_DAYS_SAVED_BY_AUTO = 2;
    const cashAccelerationAmount = (recentLinks || [])
      .reduce((sum, link) => sum + Number(link.amount || 0), 0);
    const cashAccelerationDays = autoConfirmedCount * AVG_DAYS_SAVED_BY_AUTO;

    // Calculate rates
    const autoReconciliationRate = totalAutoReconciled > 0
      ? (autoConfirmedCount / totalAutoReconciled) * 100
      : 0;
    const safeAutomationRate = totalSuggestions > 0
      ? (autoConfirmedCount / totalSuggestions) * 100
      : 0;
    const falseAutomationRate = autoConfirmedCount > 0
      ? (falseAutoCount / autoConfirmedCount) * 100
      : 0;

    // Get previous period for trend
    const prevEndDate = startDate;
    const prevStartDate = new Date(prevEndDate.getTime() - (endDate.getTime() - startDate.getTime()));
    
    const { data: prevOutcomes } = await supabaseClient
      .from('reconciliation_suggestion_outcomes')
      .select('outcome')
      .eq('tenant_id', tenantId)
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDateStr);

    const prevAutoCount = (prevOutcomes || []).filter(o => o.outcome === 'AUTO_CONFIRMED').length;
    const prevManualCount = (prevOutcomes || []).filter(o => o.outcome === 'CONFIRMED_MANUAL').length;
    const prevTotal = prevAutoCount + prevManualCount;
    const prevAutoRate = prevTotal > 0 ? (prevAutoCount / prevTotal) * 100 : 0;
    
    const trendDelta = autoReconciliationRate - prevAutoRate;

    // Get guardrail events for trust panel
    const { data: guardrailEvents } = await supabaseClient
      .from('reconciliation_guardrail_events')
      .select('event_type, verdict')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);

    const blockedCount = (guardrailEvents || []).filter(e => e.verdict === 'BLOCK').length;
    const manualOverrides = (guardrailEvents || []).filter(e => e.verdict === 'OVERRIDE_ALLOWED').length;

    // Get exceptions resolved by auto
    const { data: resolvedExceptions } = await supabaseClient
      .from('exceptions_queue')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'resolved')
      .eq('resolved_reason', 'auto_reconciled')
      .gte('resolved_at', startDateStr)
      .lte('resolved_at', endDateStr);

    const exceptionsResolvedByAuto = (resolvedExceptions || []).length;

    const kpiData = {
      period,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      
      // Core counts
      autoConfirmedCount,
      manualConfirmedCount,
      totalSuggestions,
      falseAutoCount,
      rejectedCount,
      
      // Rates
      autoReconciliationRate: Math.round(autoReconciliationRate * 100) / 100,
      safeAutomationRate: Math.round(safeAutomationRate * 100) / 100,
      falseAutomationRate: Math.round(falseAutomationRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      
      // Savings
      estimatedMinutesSaved: Math.round(estimatedMinutesSaved),
      estimatedHoursSaved: Math.round(estimatedHoursSaved * 100) / 100,
      estimatedCostSaved: Math.round(estimatedCostSaved),
      
      // Cash impact
      cashAccelerationAmount: Math.round(cashAccelerationAmount),
      cashAccelerationDays: Math.round(cashAccelerationDays),
      
      // Trust metrics
      guardrailBlocks: blockedCount,
      manualOverrides,
      exceptionsResolvedByAuto,
      
      // Trend
      trendDelta: Math.round(trendDelta * 100) / 100,
      trendDirection: trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'stable'
    };

    // Store snapshot in database
    const { error: insertError } = await supabaseClient
      .from('reconciliation_kpi_snapshots')
      .insert({
        tenant_id: tenantId,
        period_start: kpiData.periodStart,
        period_end: kpiData.periodEnd,
        auto_confirmed_count: autoConfirmedCount,
        manual_confirmed_count: manualConfirmedCount,
        total_suggestions: totalSuggestions,
        false_auto_count: falseAutoCount,
        avg_confidence: avgConfidence,
        estimated_minutes_saved: estimatedMinutesSaved,
        estimated_cost_saved: estimatedCostSaved,
        cash_acceleration_amount: cashAccelerationAmount,
        cash_acceleration_days: cashAccelerationDays
      });

    if (insertError) {
      console.error('Error storing KPI snapshot:', insertError);
    }

    // Write decision snapshot for ROI metric
    const { error: snapshotError } = await supabaseClient
      .from('decision_snapshots')
      .insert({
        tenant_id: tenantId,
        metric_code: 'auto_reconciliation_roi',
        metric_value: estimatedCostSaved,
        truth_level: 'settled',
        authority: 'SYSTEM',
        derived_from: {
          auto_confirmed: autoConfirmedCount,
          minutes_saved: estimatedMinutesSaved,
          hourly_rate: HOURLY_RATE_VND,
          period: period
        }
      });

    if (snapshotError) {
      console.error('Error storing decision snapshot:', snapshotError);
    }

    return new Response(JSON.stringify(kpiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in reconciliation-kpis:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
