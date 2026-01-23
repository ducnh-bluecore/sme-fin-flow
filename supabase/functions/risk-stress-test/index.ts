import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

interface SimulatedRule {
  metricCode: string;
  originalThreshold: number;
  simulatedThreshold: number;
  operator: string;
}

interface ImpactResult {
  metricCode: string;
  metricLabel: string;
  currentValue: number;
  originalThreshold: number;
  simulatedThreshold: number;
  wasBreached: boolean;
  wouldBreach: boolean;
  impactType: 'no_change' | 'new_breach' | 'resolved' | 'still_breached';
}

// Re-evaluate metrics with simulated thresholds
async function simulateRuleImpact(
  supabaseClient: any,
  tenantId: string,
  originalRules: Array<{
    metric_code: string;
    metric_label: string;
    threshold: number;
    operator: string;
  }>,
  simulatedChanges: SimulatedRule[]
): Promise<ImpactResult[]> {
  const results: ImpactResult[] = [];

  // Get current metric values via risk-appetite evaluation
  const { data: evaluation } = await supabaseClient.functions.invoke('risk-appetite', {
    body: {},
    method: 'GET',
  }).catch(() => ({ data: null }));

  // Fallback: compute from historical data if evaluation unavailable
  const metricValues: Record<string, number> = {};
  
  if (evaluation?.evaluations) {
    for (const e of evaluation.evaluations) {
      metricValues[e.metricCode] = e.currentValue;
    }
  }

  for (const rule of originalRules) {
    const simulatedChange = simulatedChanges.find(s => s.metricCode === rule.metric_code);
    const currentValue = metricValues[rule.metric_code] ?? 0;
    const originalThreshold = Number(rule.threshold);
    const simulatedThreshold = simulatedChange?.simulatedThreshold ?? originalThreshold;

    const wasBreached = evaluateThreshold(currentValue, rule.operator, originalThreshold);
    const wouldBreach = evaluateThreshold(currentValue, rule.operator, simulatedThreshold);

    let impactType: ImpactResult['impactType'] = 'no_change';
    if (!wasBreached && wouldBreach) impactType = 'new_breach';
    else if (wasBreached && !wouldBreach) impactType = 'resolved';
    else if (wasBreached && wouldBreach) impactType = 'still_breached';

    results.push({
      metricCode: rule.metric_code,
      metricLabel: rule.metric_label || rule.metric_code,
      currentValue,
      originalThreshold,
      simulatedThreshold,
      wasBreached,
      wouldBreach,
      impactType,
    });
  }

  return results;
}

function evaluateThreshold(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '=': return Math.abs(value - threshold) < 0.0001;
    default: return false;
  }
}

async function estimateAutomationImpact(
  supabaseClient: any,
  tenantId: string,
  simulatedChanges: SimulatedRule[]
): Promise<{ current: number; simulated: number; delta: number }> {
  // Get historical auto-reconciliation data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: outcomes } = await supabaseClient
    .from('reconciliation_suggestion_outcomes')
    .select('outcome, confidence_score, suggested_amount')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo);

  const total = outcomes?.length || 0;
  const autoConfirmed = outcomes?.filter((o: any) => o.outcome === 'AUTO_CONFIRMED').length || 0;
  const currentRate = total > 0 ? (autoConfirmed / total) * 100 : 0;

  // Simulate: if thresholds are tighter, fewer transactions would auto-confirm
  const hasAutoThresholdChange = simulatedChanges.some(s => 
    s.metricCode === 'false_auto_rate' || s.metricCode === 'auto_reconciliation_rate'
  );

  let simulatedRate = currentRate;
  if (hasAutoThresholdChange) {
    const falseAutoChange = simulatedChanges.find(s => s.metricCode === 'false_auto_rate');
    if (falseAutoChange && falseAutoChange.simulatedThreshold < falseAutoChange.originalThreshold) {
      // Tighter threshold = less automation
      const reductionFactor = falseAutoChange.simulatedThreshold / falseAutoChange.originalThreshold;
      simulatedRate = currentRate * reductionFactor;
    }
  }

  return {
    current: Math.round(currentRate * 10) / 10,
    simulated: Math.round(simulatedRate * 10) / 10,
    delta: Math.round((simulatedRate - currentRate) * 10) / 10,
  };
}

async function estimateApprovalImpact(
  supabaseClient: any,
  tenantId: string,
  simulatedChanges: SimulatedRule[]
): Promise<{ current: number; simulated: number; delta: number }> {
  // Get current approval count
  const { data: approvals } = await supabaseClient
    .from('approval_requests')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const currentCount = approvals?.length || 0;

  // Estimate: tighter thresholds = more approvals needed
  let simulatedCount = currentCount;
  for (const change of simulatedChanges) {
    if (change.simulatedThreshold < change.originalThreshold) {
      // Tighter threshold increases approvals
      const increaseRatio = 1 + (change.originalThreshold - change.simulatedThreshold) / change.originalThreshold;
      simulatedCount = Math.round(simulatedCount * increaseRatio);
    }
  }

  return {
    current: currentCount,
    simulated: simulatedCount,
    delta: simulatedCount - currentCount,
  };
}

Deno.serve(async (req) => {
  // Use shared auth - handles CORS and JWT validation
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  
  const { supabase: supabaseClient, tenantId, userId } = authResult;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    // POST /simulate - Run stress test simulation
    if (req.method === 'POST' && path === 'simulate') {
      const body = await req.json();
      const { simulatedChanges, testName, description } = body as {
        simulatedChanges: SimulatedRule[];
        testName?: string;
        description?: string;
      };

      // Get active risk appetite with rules
      const { data: appetite } = await supabaseClient
        .from('risk_appetites')
        .select('*, risk_appetite_rules(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (!appetite) {
        return errorResponse('No active risk appetite to simulate against', 400);
      }

      // Run simulations
      const ruleImpacts = await simulateRuleImpact(
        supabaseClient,
        tenantId,
        appetite.risk_appetite_rules || [],
        simulatedChanges
      );

      const automationImpact = await estimateAutomationImpact(
        supabaseClient,
        tenantId,
        simulatedChanges
      );

      const approvalImpact = await estimateApprovalImpact(
        supabaseClient,
        tenantId,
        simulatedChanges
      );

      // Calculate risk exposure change
      const { data: exceptions } = await supabaseClient
        .from('exceptions_queue')
        .select('impact_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      const currentRiskExposure = exceptions?.reduce(
        (sum: number, e: { impact_amount: number }) => sum + (Number(e.impact_amount) || 0), 
        0
      ) || 0;

      // Simulated: tighter thresholds might catch more exceptions earlier
      const newBreaches = ruleImpacts.filter(r => r.impactType === 'new_breach').length;
      const simulatedRiskExposure = currentRiskExposure * (1 - newBreaches * 0.05);

      const impactSummary = {
        autoReconciliationRate: automationImpact,
        approvalsRequired: approvalImpact,
        riskExposure: {
          current: currentRiskExposure,
          simulated: simulatedRiskExposure,
          delta: simulatedRiskExposure - currentRiskExposure,
        },
        breachChanges: {
          newBreaches: ruleImpacts.filter(r => r.impactType === 'new_breach').length,
          resolved: ruleImpacts.filter(r => r.impactType === 'resolved').length,
          unchanged: ruleImpacts.filter(r => r.impactType === 'no_change' || r.impactType === 'still_breached').length,
        },
      };

      // Save stress test result
      const { data: stressTest, error } = await supabaseClient
        .from('risk_stress_tests')
        .insert({
          tenant_id: tenantId,
          test_name: testName || `Stress Test ${new Date().toISOString().split('T')[0]}`,
          description,
          base_risk_appetite_id: appetite.id,
          simulated_risk_appetite: simulatedChanges,
          impact_summary: impactSummary,
          detailed_impacts: ruleImpacts,
          baseline_metrics: {
            appetiteVersion: appetite.version,
            evaluatedAt: new Date().toISOString(),
          },
          simulated_metrics: {
            simulatedAt: new Date().toISOString(),
            changesApplied: simulatedChanges.length,
          },
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({
        testId: stressTest?.id,
        impactSummary,
        detailedImpacts: ruleImpacts,
        simulatedAt: new Date().toISOString(),
      });
    }

    // POST /preview - Quick preview without saving
    if (req.method === 'POST' && path === 'preview') {
      const body = await req.json();
      const { simulatedChanges } = body as { simulatedChanges: SimulatedRule[] };

      const { data: appetite } = await supabaseClient
        .from('risk_appetites')
        .select('*, risk_appetite_rules(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (!appetite) {
        return errorResponse('No active risk appetite', 400);
      }

      const ruleImpacts = await simulateRuleImpact(
        supabaseClient,
        tenantId,
        appetite.risk_appetite_rules || [],
        simulatedChanges
      );

      const newBreaches = ruleImpacts.filter(r => r.impactType === 'new_breach');
      const resolved = ruleImpacts.filter(r => r.impactType === 'resolved');

      return jsonResponse({
        preview: true,
        newBreaches: newBreaches.length,
        resolved: resolved.length,
        impacts: ruleImpacts.filter(r => r.impactType !== 'no_change'),
        message: newBreaches.length > 0
          ? `Warning: ${newBreaches.length} new breach(es) would occur with these thresholds.`
          : resolved.length > 0
            ? `${resolved.length} current breach(es) would be resolved.`
            : 'No impact on current breach status.',
      });
    }

    // GET /history - List stress test history
    if (req.method === 'GET' && path === 'history') {
      const limit = parseInt(url.searchParams.get('limit') || '20');

      const { data: tests, error } = await supabaseClient
        .from('risk_stress_tests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('simulated_at', { ascending: false })
        .limit(limit);

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({ tests });
    }

    // GET /:id - Get specific test
    if (req.method === 'GET' && path !== 'history') {
      const { data: test, error } = await supabaseClient
        .from('risk_stress_tests')
        .select('*')
        .eq('id', path)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return errorResponse('Test not found', 404);
      }

      return jsonResponse(test);
    }

    return errorResponse('Not found', 404);

  } catch (error: any) {
    return errorResponse(error?.message || 'Unknown error', 500);
  }
});
