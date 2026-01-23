import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

interface ScenarioAssumptions {
  revenueChange?: number;        // % change
  arDelayDays?: number;          // additional days
  costInflation?: number;        // % increase
  automationPaused?: boolean;
  customFactors?: Record<string, number>;
}

interface ProjectedOutcome {
  metric: string;
  baseline: number;
  projected: number;
  delta: number;
  deltaPercent: number;
  unit: string;
}

interface RiskBreach {
  metricCode: string;
  metricLabel: string;
  threshold: number;
  projectedValue: number;
  severity: string;
}

async function getBaselineMetrics(
  supabaseClient: any,
  tenantId: string
): Promise<Record<string, number>> {
  const baseline: Record<string, number> = {};

  // Cash position
  const { data: cashSnapshot } = await supabaseClient
    .from('v_decision_latest')
    .select('metric_value')
    .eq('tenant_id', tenantId)
    .eq('metric_code', 'cash_today')
    .maybeSingle();
  baseline.cashPosition = Number(cashSnapshot?.metric_value) || 0;

  // Cash next 7 days
  const { data: cashForecast } = await supabaseClient
    .from('v_decision_latest')
    .select('metric_value')
    .eq('tenant_id', tenantId)
    .eq('metric_code', 'cash_next_7d')
    .maybeSingle();
  baseline.cashNext7d = Number(cashForecast?.metric_value) || 0;

  // AR outstanding
  const { data: invoices } = await supabaseClient
    .from('invoices')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .in('status', ['sent', 'overdue']);
  baseline.arOutstanding = invoices?.reduce(
    (sum: number, i: any) => sum + Number(i.total_amount), 
    0
  ) || 0;

  // AR overdue
  const { data: overdueExceptions } = await supabaseClient
    .from('exceptions_queue')
    .select('impact_amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .eq('exception_type', 'AR_OVERDUE');
  baseline.arOverdue = overdueExceptions?.reduce(
    (sum: number, e: any) => sum + Number(e.impact_amount), 
    0
  ) || 0;

  // Monthly revenue (estimate from recent invoices)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentInvoices } = await supabaseClient
    .from('invoices')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .gte('invoice_date', thirtyDaysAgo);
  baseline.monthlyRevenue = recentInvoices?.reduce(
    (sum: number, i: any) => sum + Number(i.total_amount), 
    0
  ) || 0;

  // Monthly costs (estimate from recent bills)
  const { data: recentBills } = await supabaseClient
    .from('bills')
    .select('total_amount')
    .eq('tenant_id', tenantId)
    .gte('bill_date', thirtyDaysAgo);
  baseline.monthlyCosts = recentBills?.reduce(
    (sum: number, b: any) => sum + Number(b.total_amount), 
    0
  ) || 0;

  // Auto reconciliation rate
  const { data: outcomes } = await supabaseClient
    .from('reconciliation_suggestion_outcomes')
    .select('outcome')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo);
  const total = outcomes?.length || 0;
  const autoConfirmed = outcomes?.filter((o: any) => o.outcome === 'AUTO_CONFIRMED').length || 0;
  baseline.autoReconciliationRate = total > 0 ? (autoConfirmed / total) * 100 : 0;

  return baseline;
}

function projectScenario(
  baseline: Record<string, number>,
  assumptions: ScenarioAssumptions,
  scenarioType: string
): ProjectedOutcome[] {
  const outcomes: ProjectedOutcome[] = [];

  // Revenue impact
  let projectedRevenue = baseline.monthlyRevenue;
  if (assumptions.revenueChange) {
    projectedRevenue = baseline.monthlyRevenue * (1 + assumptions.revenueChange / 100);
  }
  if (scenarioType === 'REVENUE_SHOCK') {
    outcomes.push({
      metric: 'Monthly Revenue',
      baseline: baseline.monthlyRevenue,
      projected: projectedRevenue,
      delta: projectedRevenue - baseline.monthlyRevenue,
      deltaPercent: assumptions.revenueChange || -20,
      unit: 'VND',
    });
  }

  // AR impact
  let projectedAR = baseline.arOutstanding;
  let projectedOverdue = baseline.arOverdue;
  if (assumptions.arDelayDays) {
    // More delay = more becomes overdue
    const overdueIncrease = (assumptions.arDelayDays / 30) * baseline.arOutstanding * 0.3;
    projectedOverdue = baseline.arOverdue + overdueIncrease;
  }
  if (scenarioType === 'AR_DELAY') {
    outcomes.push({
      metric: 'AR Overdue',
      baseline: baseline.arOverdue,
      projected: projectedOverdue,
      delta: projectedOverdue - baseline.arOverdue,
      deltaPercent: baseline.arOverdue > 0 
        ? ((projectedOverdue - baseline.arOverdue) / baseline.arOverdue) * 100 
        : 0,
      unit: 'VND',
    });
  }

  // Cost impact
  let projectedCosts = baseline.monthlyCosts;
  if (assumptions.costInflation) {
    projectedCosts = baseline.monthlyCosts * (1 + assumptions.costInflation / 100);
  }
  if (scenarioType === 'COST_INFLATION') {
    outcomes.push({
      metric: 'Monthly Costs',
      baseline: baseline.monthlyCosts,
      projected: projectedCosts,
      delta: projectedCosts - baseline.monthlyCosts,
      deltaPercent: assumptions.costInflation || 10,
      unit: 'VND',
    });
  }

  // Cash impact (always shown)
  const cashInflow = projectedRevenue * 0.7; // Assume 70% collection
  const cashOutflow = projectedCosts;
  const projectedCash = baseline.cashPosition + cashInflow - cashOutflow;
  
  outcomes.push({
    metric: 'Cash Position (30d)',
    baseline: baseline.cashPosition,
    projected: projectedCash,
    delta: projectedCash - baseline.cashPosition,
    deltaPercent: baseline.cashPosition > 0 
      ? ((projectedCash - baseline.cashPosition) / baseline.cashPosition) * 100 
      : 0,
    unit: 'VND',
  });

  // Automation impact
  if (assumptions.automationPaused || scenarioType === 'AUTOMATION_PAUSE') {
    outcomes.push({
      metric: 'Auto-Reconciliation Rate',
      baseline: baseline.autoReconciliationRate,
      projected: 0,
      delta: -baseline.autoReconciliationRate,
      deltaPercent: -100,
      unit: '%',
    });
  }

  // Cash runway
  const monthlyBurn = projectedCosts - (projectedRevenue * 0.7);
  const projectedRunway = monthlyBurn > 0 
    ? Math.round((projectedCash / monthlyBurn) * 30) 
    : 365;
  outcomes.push({
    metric: 'Cash Runway',
    baseline: baseline.cashPosition > 0 && baseline.monthlyCosts > 0
      ? Math.round((baseline.cashPosition / (baseline.monthlyCosts - baseline.monthlyRevenue * 0.7)) * 30)
      : 365,
    projected: projectedRunway,
    delta: 0,
    deltaPercent: 0,
    unit: 'days',
  });

  return outcomes;
}

async function checkRiskBreaches(
  supabaseClient: any,
  tenantId: string,
  projectedOutcomes: ProjectedOutcome[]
): Promise<RiskBreach[]> {
  const breaches: RiskBreach[] = [];

  // Get active risk appetite rules
  const { data: appetite } = await supabaseClient
    .from('risk_appetites')
    .select('*, risk_appetite_rules(*)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!appetite?.risk_appetite_rules) return breaches;

  const rules = appetite.risk_appetite_rules as any[];
  for (const rule of rules) {
    // Map rule metric to projected outcome
    let projectedValue: number | undefined;

    if (rule.metric_code === 'cash_runway_days') {
      const runway = projectedOutcomes.find(o => o.metric === 'Cash Runway');
      projectedValue = runway?.projected;
    } else if (rule.metric_code === 'ar_overdue_ratio') {
      const arOverdue = projectedOutcomes.find(o => o.metric === 'AR Overdue');
      const arTotal = projectedOutcomes.find(o => o.metric === 'Monthly Revenue');
      if (arOverdue && arTotal && arTotal.projected > 0) {
        projectedValue = (arOverdue.projected / arTotal.projected) * 100;
      }
    } else if (rule.metric_code === 'auto_reconciliation_rate') {
      const autoRate = projectedOutcomes.find(o => o.metric === 'Auto-Reconciliation Rate');
      projectedValue = autoRate?.projected;
    }

    if (projectedValue !== undefined) {
      const threshold = Number(rule.threshold);
      let wouldBreach = false;

      switch (rule.operator) {
        case '<': wouldBreach = projectedValue < threshold; break;
        case '<=': wouldBreach = projectedValue <= threshold; break;
        case '>': wouldBreach = projectedValue > threshold; break;
        case '>=': wouldBreach = projectedValue >= threshold; break;
      }

      if (wouldBreach) {
        breaches.push({
          metricCode: rule.metric_code,
          metricLabel: rule.metric_label || rule.metric_code,
          threshold,
          projectedValue,
          severity: rule.severity,
        });
      }
    }
  }

  return breaches;
}

Deno.serve(async (req) => {
  // Use shared auth - handles CORS and JWT validation
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  
  const { supabase: supabaseClient, tenantId, userId } = authResult;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    // POST /simulate - Run scenario simulation
    if (req.method === 'POST' && path === 'simulate') {
      const body = await req.json();
      const {
        scenarioName,
        scenarioType,
        description,
        assumptions,
      } = body as {
        scenarioName: string;
        scenarioType: string;
        description?: string;
        assumptions: ScenarioAssumptions;
      };

      // Get baseline metrics
      const baseline = await getBaselineMetrics(supabaseClient, tenantId);

      // Project outcomes
      const projectedOutcomes = projectScenario(baseline, assumptions, scenarioType);

      // Check for risk breaches
      const riskBreaches = await checkRiskBreaches(supabaseClient, tenantId, projectedOutcomes);

      // Calculate control impacts
      const controlImpacts = {
        automationAffected: assumptions.automationPaused || false,
        approvalVolumeChange: riskBreaches.length > 0 ? 'increased' : 'unchanged',
        manualReviewRequired: riskBreaches.some(b => b.severity === 'critical'),
      };

      /**
       * GOVERNANCE ISOLATION (v3.1):
       * Scenario outputs are stored ONLY in board_scenarios table.
       * 
       * CRITICAL: DO NOT write scenario data to:
       * - decision_snapshots (truth ledger)
       * - risk_breach_events (actual breaches)
       * - Any other SSOT table
       * 
       * Scenario data is simulation-only and must never pollute financial truth.
       */
      const { data: scenario, error } = await supabaseClient
        .from('board_scenarios')
        .insert({
          tenant_id: tenantId,
          scenario_name: scenarioName,
          scenario_type: scenarioType,
          description,
          assumptions,
          projected_outcomes: projectedOutcomes, // JSON only, not in SSOT
          risk_breaches: riskBreaches, // Simulated breaches, not actual
          control_impacts: controlImpacts,
          baseline_snapshot: baseline,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({
        scenarioId: scenario?.id,
        scenarioName,
        scenarioType,
        baseline,
        projectedOutcomes,
        riskBreaches,
        controlImpacts,
        simulatedAt: new Date().toISOString(),
        // Explicitly mark as simulation - NOT truth data
        isSimulation: true,
        truthLevel: 'simulated', // Never 'settled' or 'provisional'
      });
    }

    // GET /compare - Compare multiple scenarios
    if (req.method === 'GET' && path === 'compare') {
      const scenarioIds = url.searchParams.get('ids')?.split(',') || [];

      if (scenarioIds.length < 2) {
        return errorResponse('At least 2 scenario IDs required for comparison', 400);
      }

      const { data: scenarios, error } = await supabaseClient
        .from('board_scenarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('id', scenarioIds);

      if (error) {
        return errorResponse(error.message, 400);
      }

      // Build comparison matrix
      const metrics = new Set<string>();
      for (const s of scenarios || []) {
        const outcomes = s.projected_outcomes as ProjectedOutcome[];
        for (const o of outcomes) {
          metrics.add(o.metric);
        }
      }

      const comparison: Record<string, Record<string, number>> = {};
      for (const metric of metrics) {
        comparison[metric] = { baseline: 0 };
        for (const s of scenarios || []) {
          const outcomes = s.projected_outcomes as ProjectedOutcome[];
          const outcome = outcomes.find(o => o.metric === metric);
          comparison[metric][s.scenario_name] = outcome?.projected || 0;
          if (outcome?.baseline && !comparison[metric].baseline) {
            comparison[metric].baseline = outcome.baseline;
          }
        }
      }

      return jsonResponse({
        scenarios: scenarios?.map(s => ({
          id: s.id,
          name: s.scenario_name,
          type: s.scenario_type,
          breachCount: (s.risk_breaches as RiskBreach[])?.length || 0,
        })),
        comparison,
      });
    }

    // GET /list - List all scenarios
    if (req.method === 'GET' && path === 'list') {
      const includeArchived = url.searchParams.get('archived') === 'true';

      let query = supabaseClient
        .from('board_scenarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data: scenarios, error } = await query;

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({ scenarios });
    }

    // GET /templates - Get scenario templates
    if (req.method === 'GET' && path === 'templates') {
      const templates = [
        {
          id: 'REVENUE_SHOCK',
          name: 'Revenue Shock',
          description: 'Simulate sudden revenue decline',
          defaultAssumptions: { revenueChange: -20 },
        },
        {
          id: 'AR_DELAY',
          name: 'AR Collection Delay',
          description: 'Simulate delayed customer payments',
          defaultAssumptions: { arDelayDays: 30 },
        },
        {
          id: 'COST_INFLATION',
          name: 'Cost Inflation',
          description: 'Simulate rising operational costs',
          defaultAssumptions: { costInflation: 15 },
        },
        {
          id: 'AUTOMATION_PAUSE',
          name: 'Automation Pause',
          description: 'Simulate disabling auto-reconciliation',
          defaultAssumptions: { automationPaused: true },
        },
      ];

      return jsonResponse({ templates });
    }

    // POST /archive - Archive a scenario
    if (req.method === 'POST' && path === 'archive') {
      const { scenarioId } = await req.json();

      const { error } = await supabaseClient
        .from('board_scenarios')
        .update({ is_archived: true })
        .eq('id', scenarioId)
        .eq('tenant_id', tenantId);

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({ success: true });
    }

    // GET /:id - Get specific scenario
    if (req.method === 'GET' && path !== 'list' && path !== 'templates' && path !== 'compare') {
      const { data: scenario, error } = await supabaseClient
        .from('board_scenarios')
        .select('*')
        .eq('id', path)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return errorResponse('Scenario not found', 404);
      }

      return jsonResponse(scenario);
    }

    return errorResponse('Not found', 404);

  } catch (error: unknown) {
    console.error('Board scenarios error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
});
