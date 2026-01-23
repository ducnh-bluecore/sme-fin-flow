import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

interface MetricValue {
  code: string;
  value: number;
  source: string;
}

// Metric evaluation functions
async function getMetricValue(
  supabaseClient: any,
  tenantId: string,
  metricCode: string
): Promise<MetricValue | null> {
  switch (metricCode) {
    // AR Metrics
    case 'ar_overdue_ratio': {
      const { data: exceptions } = await supabaseClient
        .from('exceptions_queue')
        .select('impact_amount, exception_type')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');
      
      const arOverdue = exceptions?.filter((e: { exception_type: string }) => e.exception_type === 'AR_OVERDUE')
        .reduce((sum: number, e: { impact_amount: number }) => sum + (Number(e.impact_amount) || 0), 0) || 0;
      
      const { data: invoices } = await supabaseClient
        .from('invoices')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'overdue']);
      
      const totalAR = invoices?.reduce((sum: number, i: { total_amount: number }) => sum + (Number(i.total_amount) || 0), 0) || 1;
      
      return { code: metricCode, value: (arOverdue / totalAR) * 100, source: 'exceptions_queue + invoices' };
    }
    
    case 'ar_overdue_amount': {
      const { data: exceptions } = await supabaseClient
        .from('exceptions_queue')
        .select('impact_amount, exception_type')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .eq('exception_type', 'AR_OVERDUE');
      
      const total = exceptions?.reduce((sum: number, e: { impact_amount: number }) => sum + (Number(e.impact_amount) || 0), 0) || 0;
      return { code: metricCode, value: total, source: 'exceptions_queue' };
    }
    
    // Cash Metrics
    case 'cash_runway_days': {
      const { data: snapshot } = await supabaseClient
        .from('v_decision_latest')
        .select('metric_value')
        .eq('tenant_id', tenantId)
        .eq('metric_code', 'cash_runway')
        .maybeSingle();
      
      return { code: metricCode, value: Number(snapshot?.metric_value) || 0, source: 'decision_snapshots' };
    }
    
    case 'cash_position': {
      const { data: snapshot } = await supabaseClient
        .from('v_decision_latest')
        .select('metric_value')
        .eq('tenant_id', tenantId)
        .eq('metric_code', 'cash_today')
        .maybeSingle();
      
      return { code: metricCode, value: Number(snapshot?.metric_value) || 0, source: 'decision_snapshots' };
    }
    
    // Automation Metrics
    case 'false_auto_rate': {
      const { data: outcomes } = await supabaseClient
        .from('reconciliation_suggestion_outcomes')
        .select('outcome')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const autoConfirmed = outcomes?.filter((o: { outcome: string }) => o.outcome === 'AUTO_CONFIRMED').length || 0;
      const falseAuto = outcomes?.filter((o: { outcome: string }) => o.outcome === 'FALSE_AUTO').length || 0;
      
      const rate = autoConfirmed > 0 ? (falseAuto / autoConfirmed) * 100 : 0;
      return { code: metricCode, value: rate, source: 'reconciliation_suggestion_outcomes' };
    }
    
    case 'auto_reconciliation_rate': {
      const { data: outcomes } = await supabaseClient
        .from('reconciliation_suggestion_outcomes')
        .select('outcome')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const total = outcomes?.length || 0;
      const autoConfirmed = outcomes?.filter((o: { outcome: string }) => o.outcome === 'AUTO_CONFIRMED').length || 0;
      
      const rate = total > 0 ? (autoConfirmed / total) * 100 : 0;
      return { code: metricCode, value: rate, source: 'reconciliation_suggestion_outcomes' };
    }
    
    case 'guardrail_block_rate': {
      const { data: events } = await supabaseClient
        .from('reconciliation_guardrail_events')
        .select('event_type')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: outcomes } = await supabaseClient
        .from('reconciliation_suggestion_outcomes')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const blocked = events?.filter((e: { event_type: string }) => e.event_type === 'BLOCKED').length || 0;
      const total = outcomes?.length || 1;
      
      return { code: metricCode, value: (blocked / total) * 100, source: 'reconciliation_guardrail_events' };
    }
    
    // ML Metrics
    case 'ml_accuracy': {
      const { data: perf } = await supabaseClient
        .from('ml_performance_snapshots')
        .select('accuracy')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return { code: metricCode, value: Number(perf?.accuracy) || 0, source: 'ml_performance_snapshots' };
    }
    
    case 'calibration_error': {
      const { data: perf } = await supabaseClient
        .from('ml_performance_snapshots')
        .select('calibration_error')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return { code: metricCode, value: Number(perf?.calibration_error) || 0, source: 'ml_performance_snapshots' };
    }
    
    case 'drift_signal_count': {
      const { data: signals } = await supabaseClient
        .from('ml_drift_signals')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('severity', ['high', 'critical']);
      
      return { code: metricCode, value: signals?.length || 0, source: 'ml_drift_signals' };
    }
    
    // Governance Metrics
    case 'pending_approvals': {
      const { data: approvals } = await supabaseClient
        .from('approval_requests')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');
      
      return { code: metricCode, value: approvals?.length || 0, source: 'approval_requests' };
    }
    
    case 'open_exceptions': {
      const { data: exceptions } = await supabaseClient
        .from('exceptions_queue')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');
      
      return { code: metricCode, value: exceptions?.length || 0, source: 'exceptions_queue' };
    }
    
    default:
      return null;
  }
}

function evaluateRule(
  metricValue: number,
  operator: string,
  threshold: number
): boolean {
  switch (operator) {
    case '<': return metricValue < threshold;
    case '<=': return metricValue <= threshold;
    case '>': return metricValue > threshold;
    case '>=': return metricValue >= threshold;
    case '=': return Math.abs(metricValue - threshold) < 0.0001;
    default: return false;
  }
}

async function executeEnforcementAction(
  supabaseClient: any,
  tenantId: string,
  action: string,
  rule: { id: string; metric_code: string; severity: string },
  metricValue: number
): Promise<{ success: boolean; details: Record<string, unknown> }> {
  const details: Record<string, unknown> = { action, executedAt: new Date().toISOString() };
  
  switch (action) {
    case 'ALERT': {
      // Create alert instance
      await supabaseClient.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'risk_breach',
        category: 'governance',
        severity: rule.severity,
        title: `Risk Appetite Breach: ${rule.metric_code}`,
        message: `Metric ${rule.metric_code} breached threshold. Current value: ${metricValue}`,
        status: 'open',
      });
      details.alertCreated = true;
      break;
    }
    
    case 'REQUIRE_APPROVAL': {
      // Flag that approvals are required - handled by approval system
      details.approvalRequired = true;
      details.message = 'Future actions in this domain will require approval';
      break;
    }
    
    case 'BLOCK_AUTOMATION': {
      // Disable auto-reconciliation
      await supabaseClient
        .from('tenant_ml_settings')
        .update({ 
          auto_reconciliation_enabled: false,
          last_fallback_reason: `Risk breach: ${rule.metric_code} exceeded threshold`,
          last_fallback_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
      details.automationBlocked = true;
      break;
    }
    
    case 'DISABLE_ML': {
      // Disable ML
      await supabaseClient
        .from('tenant_ml_settings')
        .update({ 
          ml_enabled: false,
          ml_status: 'DISABLED',
          last_fallback_reason: `Risk breach: ${rule.metric_code} exceeded threshold`,
          last_fallback_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
      details.mlDisabled = true;
      break;
    }
    
    case 'ESCALATE_TO_BOARD': {
      // Create high-priority alert for board
      await supabaseClient.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'board_escalation',
        category: 'governance',
        severity: 'critical',
        title: `BOARD ESCALATION: Risk Breach - ${rule.metric_code}`,
        message: `Critical risk appetite breach requires board attention. Metric: ${rule.metric_code}, Value: ${metricValue}`,
        status: 'open',
        priority: 1,
      });
      details.escalatedToBoard = true;
      break;
    }
  }
  
  // Log audit event
  await supabaseClient.from('audit_events').insert({
    tenant_id: tenantId,
    actor_type: 'SYSTEM',
    action: 'RISK_BREACH_ENFORCEMENT',
    resource_type: 'risk_appetite_rule',
    resource_id: rule.id,
    after_state: { action, metricValue, rule_id: rule.id },
  });
  
  return { success: true, details };
}

Deno.serve(async (req) => {
  // Use shared auth - handles CORS and JWT validation
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  
  const { supabase: supabaseClient, tenantId } = authResult;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    // GET /evaluate - Evaluate all rules against current metrics
    if (req.method === 'GET' && path === 'evaluate') {
      // Get active risk appetite
      const { data: appetite } = await supabaseClient
        .from('risk_appetites')
        .select('*, risk_appetite_rules(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (!appetite) {
        return jsonResponse({ 
          hasActiveAppetite: false, 
          evaluations: [] 
        });
      }

      const evaluations = [];
      for (const rule of (appetite.risk_appetite_rules || [])) {
        if (!rule.is_enabled) continue;

        const metricData = await getMetricValue(supabaseClient, tenantId, rule.metric_code);
        if (!metricData) continue;

        const isBreached = evaluateRule(metricData.value, rule.operator, Number(rule.threshold));

        evaluations.push({
          ruleId: rule.id,
          domain: rule.risk_domain,
          metricCode: rule.metric_code,
          metricLabel: rule.metric_label,
          currentValue: metricData.value,
          threshold: Number(rule.threshold),
          operator: rule.operator,
          unit: rule.unit,
          isBreached,
          severity: rule.severity,
          actionOnBreach: rule.action_on_breach,
          source: metricData.source,
        });
      }

      return jsonResponse({
        hasActiveAppetite: true,
        appetiteId: appetite.id,
        version: appetite.version,
        name: appetite.name,
        evaluations,
        breachCount: evaluations.filter(e => e.isBreached).length,
        evaluatedAt: new Date().toISOString(),
      });
    }

    // POST /detect - Run breach detection and enforce actions
    if (req.method === 'POST' && path === 'detect') {
      const { data: appetite } = await supabaseClient
        .from('risk_appetites')
        .select('*, risk_appetite_rules(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (!appetite) {
        return jsonResponse({ 
          detected: false, 
          reason: 'No active risk appetite' 
        });
      }

      const breaches = [];
      for (const rule of (appetite.risk_appetite_rules || [])) {
        if (!rule.is_enabled) continue;

        const metricData = await getMetricValue(supabaseClient, tenantId, rule.metric_code);
        if (!metricData) continue;

        const isBreached = evaluateRule(metricData.value, rule.operator, Number(rule.threshold));
        
        if (isBreached) {
          // Check if this breach already exists (avoid duplicates)
          const { data: existingBreach } = await supabaseClient
            .from('risk_breach_events')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('rule_id', rule.id)
            .eq('is_resolved', false)
            .maybeSingle();

          if (!existingBreach) {
            // Execute enforcement action
            const actionResult = await executeEnforcementAction(
              supabaseClient,
              tenantId,
              rule.action_on_breach,
              { id: rule.id, metric_code: rule.metric_code, severity: rule.severity },
              metricData.value
            );

            // Record breach event
            const { data: breach } = await supabaseClient
              .from('risk_breach_events')
              .insert({
                tenant_id: tenantId,
                risk_appetite_id: appetite.id,
                rule_id: rule.id,
                metric_code: rule.metric_code,
                metric_value: metricData.value,
                threshold: Number(rule.threshold),
                action_taken: rule.action_on_breach,
                action_result: actionResult.details,
                severity: rule.severity,
              })
              .select()
              .single();

            breaches.push({
              breachId: breach?.id,
              ruleId: rule.id,
              metricCode: rule.metric_code,
              value: metricData.value,
              threshold: Number(rule.threshold),
              severity: rule.severity,
              action: rule.action_on_breach,
              actionResult: actionResult.details,
            });
          }
        }
      }

      return jsonResponse({
        detected: true,
        appetiteId: appetite.id,
        newBreaches: breaches,
        detectedAt: new Date().toISOString(),
      });
    }

    // GET /breaches - Get breach history
    if (req.method === 'GET' && path === 'breaches') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const unresolved = url.searchParams.get('unresolved') === 'true';

      let query = supabaseClient
        .from('risk_breach_events')
        .select(`
          *,
          risk_appetite_rules(metric_label, risk_domain)
        `)
        .eq('tenant_id', tenantId)
        .order('breached_at', { ascending: false })
        .limit(limit);

      if (unresolved) {
        query = query.eq('is_resolved', false);
      }

      const { data: breaches, error } = await query;

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse({ breaches });
    }

    // POST /resolve - Resolve a breach
    if (req.method === 'POST' && path === 'resolve') {
      const { breachId, resolution } = await req.json();

      const { data: breach, error } = await supabaseClient
        .from('risk_breach_events')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution,
        })
        .eq('id', breachId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse(breach);
    }

    // GET /impact-preview - Preview impact of potential threshold change
    if (req.method === 'GET' && path === 'impact-preview') {
      const metricCode = url.searchParams.get('metricCode');
      const newThreshold = parseFloat(url.searchParams.get('threshold') || '0');
      const operator = url.searchParams.get('operator') || '>';

      if (!metricCode) {
        return errorResponse('metricCode is required', 400);
      }

      const metricData = await getMetricValue(supabaseClient, tenantId, metricCode);
      if (!metricData) {
        return errorResponse('Unknown metric', 400);
      }

      const wouldBreach = evaluateRule(metricData.value, operator, newThreshold);

      return jsonResponse({
        metricCode,
        currentValue: metricData.value,
        proposedThreshold: newThreshold,
        operator,
        wouldBreach,
        source: metricData.source,
      });
    }

    return errorResponse('Not found', 404);

  } catch (error: any) {
    return errorResponse(error?.message || 'Unknown error', 500);
  }
});
