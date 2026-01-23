import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

interface BoardSummary {
  financialTruth: {
    cashToday: { value: number; truthLevel: string; authority: string; snapshotId: string | null };
    cashNext7d: { value: number; truthLevel: string; confidence: number; snapshotId: string | null };
  };
  risk: {
    totalArOverdue: number;
    largestRisk: { amount: number; description: string } | null;
    aging: { days_0_7: number; days_8_30: number; days_30_plus: number };
    openExceptions: number;
  };
  controls: {
    autoRate: number;
    manualRate: number;
    guardrailBlockRate: number;
    falseAutoRate: number;
    totalReconciliations: number;
  };
  ml: {
    status: 'ACTIVE' | 'LIMITED' | 'DISABLED';
    accuracy: number | null;
    calibrationError: number | null;
    driftSignals: Array<{ type: string; severity: string; metric: string }>;
    lastFallbackReason: string | null;
  };
  governance: {
    lastAuditEvent: string | null;
    totalAuditEvents: number;
    openApprovals: number;
    policyCoverage: number;
    auditReadyChecklist: {
      appendOnlyLedger: boolean;
      approvalWorkflows: boolean;
      auditorAccess: boolean;
      mlKillSwitch: boolean;
    };
  };
  delta: {
    cashChange: { value: number; percent: number };
    riskChange: { value: number; percent: number };
    newExceptions: number;
    policyChanges: number;
    mlStatusChanged: boolean;
  };
  period: {
    start: string;
    end: string;
    comparisonStart: string;
    comparisonEnd: string;
  };
}

Deno.serve(async (req) => {
  // Use shared auth - handles CORS and JWT validation
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  
  const { supabase: supabaseClient, tenantId } = authResult;

  try {
    // Parse query params for period
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d';
    
    const now = new Date();
    let periodDays = 30;
    if (period === '7d') periodDays = 7;
    else if (period === '90d') periodDays = 90;
    
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = now;
    
    const comparisonStart = new Date(periodStart);
    comparisonStart.setDate(comparisonStart.getDate() - periodDays);
    const comparisonEnd = new Date(periodStart);

    // ========== 1. FINANCIAL TRUTH ==========
    const { data: cashSnapshots } = await supabaseClient
      .from('v_decision_latest')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('metric_code', ['cash_today', 'cash_next_7d']);

    const cashTodaySnap = cashSnapshots?.find((s: any) => s.metric_code === 'cash_today');
    const cashNext7dSnap = cashSnapshots?.find((s: any) => s.metric_code === 'cash_next_7d');

    // ========== 2. RISK EXPOSURE ==========
    const { data: openExceptions } = await supabaseClient
      .from('exceptions_queue')
      .select('id, exception_type, severity, impact_amount, detected_at, title')
      .eq('tenant_id', tenantId)
      .eq('status', 'open');

    const arOverdueExceptions = openExceptions?.filter((e: any) => e.exception_type === 'AR_OVERDUE') || [];
    const totalArOverdue = arOverdueExceptions.reduce((sum: number, e: any) => sum + (Number(e.impact_amount) || 0), 0);
    
    // Find largest risk
    const sortedByImpact = [...(openExceptions || [])].sort((a: any, b: any) => 
      (Number(b.impact_amount) || 0) - (Number(a.impact_amount) || 0)
    );
    const largestRisk = sortedByImpact[0] ? {
      amount: Number(sortedByImpact[0].impact_amount) || 0,
      description: sortedByImpact[0].title || 'Unknown',
    } : null;

    // Aging breakdown
    const aging = { days_0_7: 0, days_8_30: 0, days_30_plus: 0 };
    for (const ex of arOverdueExceptions) {
      const daysAged = Math.floor((Date.now() - new Date(ex.detected_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAged <= 7) aging.days_0_7 += Number(ex.impact_amount) || 0;
      else if (daysAged <= 30) aging.days_8_30 += Number(ex.impact_amount) || 0;
      else aging.days_30_plus += Number(ex.impact_amount) || 0;
    }

    // ========== 3. CONTROL EFFECTIVENESS ==========
    const { data: recentOutcomes } = await supabaseClient
      .from('reconciliation_suggestion_outcomes')
      .select('outcome, confirmed_by, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString());

    const totalReconciliations = recentOutcomes?.length || 0;
    const autoConfirmed = recentOutcomes?.filter((o: any) => o.outcome === 'AUTO_CONFIRMED').length || 0;
    const manualConfirmed = recentOutcomes?.filter((o: any) => o.outcome === 'CONFIRMED').length || 0;
    const falseAuto = recentOutcomes?.filter((o: any) => o.outcome === 'FALSE_AUTO').length || 0;

    // Guardrail events
    const { data: guardrailEvents } = await supabaseClient
      .from('reconciliation_guardrail_events')
      .select('event_type')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString());

    const blockedByGuardrail = guardrailEvents?.filter((e: any) => e.event_type === 'BLOCKED').length || 0;

    const autoRate = totalReconciliations > 0 ? (autoConfirmed / totalReconciliations) * 100 : 0;
    const manualRate = totalReconciliations > 0 ? (manualConfirmed / totalReconciliations) * 100 : 0;
    const guardrailBlockRate = totalReconciliations > 0 ? (blockedByGuardrail / totalReconciliations) * 100 : 0;
    const falseAutoRate = autoConfirmed > 0 ? (falseAuto / autoConfirmed) * 100 : 0;

    // ========== 4. ML OVERSIGHT ==========
    const { data: mlSettings } = await supabaseClient
      .from('tenant_ml_settings')
      .select('ml_enabled, ml_status, last_fallback_reason')
      .eq('tenant_id', tenantId)
      .single();

    const { data: latestMLPerf } = await supabaseClient
      .from('ml_performance_snapshots')
      .select('accuracy, calibration_error')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeDriftSignals } = await supabaseClient
      .from('ml_drift_signals')
      .select('drift_type, severity, metric')
      .eq('tenant_id', tenantId)
      .in('severity', ['high', 'critical'])
      .order('detected_at', { ascending: false })
      .limit(5);

    let mlStatus: 'ACTIVE' | 'LIMITED' | 'DISABLED' = 'ACTIVE';
    if (mlSettings) {
      if (!mlSettings.ml_enabled) mlStatus = 'DISABLED';
      else if (mlSettings.ml_status === 'LIMITED') mlStatus = 'LIMITED';
    }

    // ========== 5. GOVERNANCE ==========
    const { data: auditEvents } = await supabaseClient
      .from('audit_events')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false });

    const { data: pendingApprovals } = await supabaseClient
      .from('approval_requests')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    const { data: policies } = await supabaseClient
      .from('enterprise_policies')
      .select('id, enabled')
      .eq('tenant_id', tenantId);

    const enabledPolicies = policies?.filter((p: any) => p.enabled).length || 0;
    const totalPolicyTypes = 4; // AUTO_RECONCILIATION, MANUAL_RECONCILIATION, VOID_RECONCILIATION, ML_ENABLEMENT
    const policyCoverage = (enabledPolicies / totalPolicyTypes) * 100;

    // Check auditor access exists
    const { data: auditorAccess } = await supabaseClient
      .from('auditor_access')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(1);

    // ========== 6. DELTA CALCULATIONS ==========
    // Previous period cash
    const { data: previousCashSnap } = await supabaseClient
      .from('decision_snapshots')
      .select('metric_value')
      .eq('tenant_id', tenantId)
      .eq('metric_code', 'cash_today')
      .lte('as_of', comparisonEnd.toISOString())
      .order('as_of', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentCash = cashTodaySnap?.metric_value || 0;
    const previousCash = previousCashSnap?.metric_value || currentCash;
    const cashChange = currentCash - previousCash;
    const cashChangePercent = previousCash !== 0 ? (cashChange / previousCash) * 100 : 0;

    // Previous period risk
    const { data: previousExceptions } = await supabaseClient
      .from('exceptions_queue')
      .select('id, impact_amount, exception_type')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .lte('detected_at', comparisonEnd.toISOString());

    const previousArOverdue = previousExceptions
      ?.filter((e: any) => e.exception_type === 'AR_OVERDUE')
      .reduce((sum: number, e: any) => sum + (Number(e.impact_amount) || 0), 0) || 0;
    const riskChange = totalArOverdue - previousArOverdue;
    const riskChangePercent = previousArOverdue !== 0 ? (riskChange / previousArOverdue) * 100 : 0;

    // New exceptions in period
    const newExceptions = openExceptions?.filter((e: any) => 
      new Date(e.detected_at) >= periodStart
    ).length || 0;

    // Policy changes (count of policies created in period)
    const { data: recentPolicies } = await supabaseClient
      .from('enterprise_policies')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString());

    const policyChanges = recentPolicies?.length || 0;

    // ML status changed check
    const { data: mlAuditEvents } = await supabaseClient
      .from('audit_events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('resource_type', 'ml_settings')
      .gte('created_at', periodStart.toISOString());

    const mlStatusChanged = (mlAuditEvents?.length || 0) > 0;

    // ========== BUILD RESPONSE ==========
    const summary: BoardSummary = {
      financialTruth: {
        cashToday: {
          value: cashTodaySnap?.metric_value || 0,
          truthLevel: cashTodaySnap?.truth_level || 'provisional',
          authority: cashTodaySnap?.authority || 'UNKNOWN',
          snapshotId: cashTodaySnap?.id || null,
        },
        cashNext7d: {
          value: cashNext7dSnap?.metric_value || 0,
          truthLevel: cashNext7dSnap?.truth_level || 'provisional',
          confidence: 62, // Default confidence for 7-day forecast
          snapshotId: cashNext7dSnap?.id || null,
        },
      },
      risk: {
        totalArOverdue,
        largestRisk,
        aging,
        openExceptions: openExceptions?.length || 0,
      },
      controls: {
        autoRate: Math.round(autoRate * 10) / 10,
        manualRate: Math.round(manualRate * 10) / 10,
        guardrailBlockRate: Math.round(guardrailBlockRate * 10) / 10,
        falseAutoRate: Math.round(falseAutoRate * 100) / 100,
        totalReconciliations,
      },
      ml: {
        status: mlStatus,
        accuracy: latestMLPerf?.accuracy ?? null,
        calibrationError: latestMLPerf?.calibration_error ?? null,
        driftSignals: (activeDriftSignals || []).map((d: any) => ({
          type: d.drift_type,
          severity: d.severity,
          metric: d.metric,
        })),
        lastFallbackReason: mlSettings?.last_fallback_reason || null,
      },
      governance: {
        lastAuditEvent: auditEvents?.[0]?.created_at || null,
        totalAuditEvents: auditEvents?.length || 0,
        openApprovals: pendingApprovals?.length || 0,
        policyCoverage: Math.round(policyCoverage),
        auditReadyChecklist: {
          appendOnlyLedger: true, // Always true by design
          approvalWorkflows: enabledPolicies > 0,
          auditorAccess: (auditorAccess?.length || 0) > 0,
          mlKillSwitch: mlStatus !== 'DISABLED' || mlSettings?.last_fallback_reason !== null,
        },
      },
      delta: {
        cashChange: {
          value: cashChange,
          percent: Math.round(cashChangePercent * 10) / 10,
        },
        riskChange: {
          value: riskChange,
          percent: Math.round(riskChangePercent * 10) / 10,
        },
        newExceptions,
        policyChanges,
        mlStatusChanged,
      },
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        comparisonStart: comparisonStart.toISOString(),
        comparisonEnd: comparisonEnd.toISOString(),
      },
    };

    return jsonResponse(summary);

  } catch (error: unknown) {
    console.error('Board summary error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
});
