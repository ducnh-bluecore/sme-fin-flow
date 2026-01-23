import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Thresholds for drift detection
const THRESHOLDS = {
  ACCURACY_DROP: 0.05,           // 5% accuracy drop
  CALIBRATION_ERROR: 0.08,       // ECE > 0.08
  PSI_THRESHOLD: 0.25,           // Feature distribution shift
  INCORRECT_RATE_MULTIPLIER: 2,  // 2x baseline incorrect rate
  FALSE_AUTO_RATE: 0.01,         // 1% false auto rate
  GUARDRAIL_BLOCK_SPIKE: 0.20,   // 20% guardrail block rate
};

interface DriftSignal {
  drift_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  baseline_value: number | null;
  current_value: number | null;
  delta: number | null;
  details: Record<string, unknown>;
}

// Calculate Expected Calibration Error (ECE)
function calculateECE(predictions: Array<{ predicted: number; actual: boolean }>): number {
  if (predictions.length === 0) return 0;

  const bins = 10;
  const binSize = 1 / bins;
  let ece = 0;

  for (let i = 0; i < bins; i++) {
    const binLower = i * binSize;
    const binUpper = (i + 1) * binSize;
    
    const binPredictions = predictions.filter(
      p => p.predicted >= binLower && p.predicted < binUpper
    );
    
    if (binPredictions.length === 0) continue;
    
    const avgConfidence = binPredictions.reduce((sum, p) => sum + p.predicted, 0) / binPredictions.length;
    const actualAccuracy = binPredictions.filter(p => p.actual).length / binPredictions.length;
    
    ece += Math.abs(avgConfidence - actualAccuracy) * (binPredictions.length / predictions.length);
  }
  
  return ece;
}

// Calculate Population Stability Index (PSI) for feature drift
function calculatePSI(baseline: number[], current: number[]): number {
  if (baseline.length === 0 || current.length === 0) return 0;

  const bins = 10;
  const min = Math.min(...baseline, ...current);
  const max = Math.max(...baseline, ...current);
  const binSize = (max - min) / bins || 1;
  
  let psi = 0;
  
  for (let i = 0; i < bins; i++) {
    const binLower = min + i * binSize;
    const binUpper = min + (i + 1) * binSize;
    
    const baselineCount = baseline.filter(v => v >= binLower && v < binUpper).length;
    const currentCount = current.filter(v => v >= binLower && v < binUpper).length;
    
    const baselinePct = Math.max(baselineCount / baseline.length, 0.0001);
    const currentPct = Math.max(currentCount / current.length, 0.0001);
    
    psi += (currentPct - baselinePct) * Math.log(currentPct / baselinePct);
  }
  
  return psi;
}

// Detect drift and return signals
async function detectDrift(
  supabase: any,
  tenantId: string,
  modelVersion: string
): Promise<DriftSignal[]> {
  const signals: DriftSignal[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get recent predictions
  const { data: recentPredictions } = await supabase
    .from('ml_prediction_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', sevenDaysAgo.toISOString());

  // Get baseline predictions (30 days ago to 7 days ago)
  const { data: baselinePredictions } = await supabase
    .from('ml_prediction_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .lt('created_at', sevenDaysAgo.toISOString());

  // Get outcomes for accuracy calculation
  const { data: outcomes } = await supabase
    .from('reconciliation_suggestion_outcomes')
    .select('suggestion_id, final_result, outcome')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const outcomeMap = new Map<string, any>(outcomes?.map((o: any) => [o.suggestion_id, o]) || []);

  // C1. Accuracy Drift
  if (recentPredictions && recentPredictions.length >= 10) {
    const recentWithOutcomes = recentPredictions.filter((p: any) => outcomeMap.has(p.suggestion_id));
    const baselineWithOutcomes = (baselinePredictions || []).filter((p: any) => outcomeMap.has(p.suggestion_id));

    if (recentWithOutcomes.length >= 5 && baselineWithOutcomes.length >= 5) {
      const recentAccuracy = recentWithOutcomes.filter(
        (p: any) => outcomeMap.get(p.suggestion_id)?.final_result === 'CORRECT'
      ).length / recentWithOutcomes.length;

      const baselineAccuracy = baselineWithOutcomes.filter(
        (p: any) => outcomeMap.get(p.suggestion_id)?.final_result === 'CORRECT'
      ).length / baselineWithOutcomes.length;

      const accuracyDrop = baselineAccuracy - recentAccuracy;

      if (accuracyDrop > THRESHOLDS.ACCURACY_DROP) {
        const severity = accuracyDrop > 0.15 ? 'critical' : accuracyDrop > 0.10 ? 'high' : 'medium';
        signals.push({
          drift_type: 'OUTCOME_SHIFT',
          severity,
          metric: 'accuracy',
          baseline_value: baselineAccuracy,
          current_value: recentAccuracy,
          delta: -accuracyDrop,
          details: {
            baseline_sample_size: baselineWithOutcomes.length,
            recent_sample_size: recentWithOutcomes.length,
          },
        });
      }
    }
  }

  // C2. Calibration Drift (ECE)
  if (recentPredictions && recentPredictions.length >= 10) {
    const calibrationData = recentPredictions
      .filter((p: any) => outcomeMap.has(p.suggestion_id))
      .map((p: any) => ({
        predicted: p.predicted_confidence / 100,
        actual: outcomeMap.get(p.suggestion_id)?.final_result === 'CORRECT',
      }));

    if (calibrationData.length >= 10) {
      const ece = calculateECE(calibrationData);
      
      if (ece > THRESHOLDS.CALIBRATION_ERROR) {
        const severity = ece > 0.15 ? 'high' : 'medium';
        signals.push({
          drift_type: 'CONFIDENCE_CALIBRATION',
          severity,
          metric: 'expected_calibration_error',
          baseline_value: 0,
          current_value: ece,
          delta: ece,
          details: {
            sample_size: calibrationData.length,
            threshold: THRESHOLDS.CALIBRATION_ERROR,
          },
        });
      }
    }
  }

  // C3. Feature Distribution Drift (PSI)
  if (recentPredictions && baselinePredictions && 
      recentPredictions.length >= 10 && baselinePredictions.length >= 10) {
    
    // Extract amount_diff_ratio from features
    const extractFeature = (predictions: any[], featureName: string): number[] => {
      return predictions
        .map((p: any) => p.explanation?.[featureName] || 0)
        .filter((v: number) => typeof v === 'number');
    };

    const baselineAmounts = extractFeature(baselinePredictions, 'amount_diff_ratio');
    const currentAmounts = extractFeature(recentPredictions, 'amount_diff_ratio');

    if (baselineAmounts.length >= 10 && currentAmounts.length >= 10) {
      const psi = calculatePSI(baselineAmounts, currentAmounts);
      
      if (psi > THRESHOLDS.PSI_THRESHOLD) {
        const severity = psi > 0.5 ? 'high' : 'medium';
        signals.push({
          drift_type: 'FEATURE_DISTRIBUTION',
          severity,
          metric: 'amount_diff_ratio_psi',
          baseline_value: 0,
          current_value: psi,
          delta: psi,
          details: {
            baseline_sample_size: baselineAmounts.length,
            current_sample_size: currentAmounts.length,
            threshold: THRESHOLDS.PSI_THRESHOLD,
          },
        });
      }
    }
  }

  // C4. Outcome Shift (incorrect rate)
  if (outcomes && outcomes.length >= 10) {
    const recentOutcomes = outcomes.filter((o: any) => 
      new Date(o.decided_at || o.created_at) >= sevenDaysAgo
    );
    const baselineOutcomes = outcomes.filter((o: any) => {
      const date = new Date(o.decided_at || o.created_at);
      return date >= thirtyDaysAgo && date < sevenDaysAgo;
    });

    if (recentOutcomes.length >= 5 && baselineOutcomes.length >= 5) {
      const recentIncorrectRate = recentOutcomes.filter(
        (o: any) => o.final_result === 'INCORRECT'
      ).length / recentOutcomes.length;
      
      const baselineIncorrectRate = baselineOutcomes.filter(
        (o: any) => o.final_result === 'INCORRECT'
      ).length / baselineOutcomes.length;

      if (baselineIncorrectRate > 0 && 
          recentIncorrectRate > baselineIncorrectRate * THRESHOLDS.INCORRECT_RATE_MULTIPLIER) {
        const severity = recentIncorrectRate > 0.2 ? 'high' : 'medium';
        signals.push({
          drift_type: 'OUTCOME_SHIFT',
          severity,
          metric: 'incorrect_rate',
          baseline_value: baselineIncorrectRate,
          current_value: recentIncorrectRate,
          delta: recentIncorrectRate - baselineIncorrectRate,
          details: {
            multiplier: recentIncorrectRate / baselineIncorrectRate,
            threshold_multiplier: THRESHOLDS.INCORRECT_RATE_MULTIPLIER,
          },
        });
      }
    }
  }

  // C5. Automation Risk Drift
  if (outcomes && outcomes.length >= 10) {
    const autoConfirmed = outcomes.filter((o: any) => o.outcome === 'AUTO_CONFIRMED');
    if (autoConfirmed.length >= 5) {
      const falseAutoRate = autoConfirmed.filter(
        (o: any) => o.final_result === 'INCORRECT'
      ).length / autoConfirmed.length;

      if (falseAutoRate > THRESHOLDS.FALSE_AUTO_RATE) {
        const severity = falseAutoRate > 0.05 ? 'critical' : falseAutoRate > 0.02 ? 'high' : 'medium';
        signals.push({
          drift_type: 'AUTOMATION_RISK',
          severity,
          metric: 'false_auto_rate',
          baseline_value: THRESHOLDS.FALSE_AUTO_RATE,
          current_value: falseAutoRate,
          delta: falseAutoRate - THRESHOLDS.FALSE_AUTO_RATE,
          details: {
            auto_confirmed_count: autoConfirmed.length,
            false_positives: autoConfirmed.filter((o: any) => o.final_result === 'INCORRECT').length,
          },
        });
      }
    }
  }

  // Check guardrail block rate
  const { count: totalGuardrails } = await supabase
    .from('reconciliation_guardrail_events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', sevenDaysAgo.toISOString());

  const { count: blockedGuardrails } = await supabase
    .from('reconciliation_guardrail_events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('action', 'BLOCK')
    .gte('created_at', sevenDaysAgo.toISOString());

  if ((totalGuardrails || 0) >= 10) {
    const blockRate = (blockedGuardrails || 0) / (totalGuardrails || 1);
    if (blockRate > THRESHOLDS.GUARDRAIL_BLOCK_SPIKE) {
      signals.push({
        drift_type: 'AUTOMATION_RISK',
        severity: blockRate > 0.4 ? 'high' : 'medium',
        metric: 'guardrail_block_rate',
        baseline_value: THRESHOLDS.GUARDRAIL_BLOCK_SPIKE,
        current_value: blockRate,
        delta: blockRate - THRESHOLDS.GUARDRAIL_BLOCK_SPIKE,
        details: {
          total_guardrails: totalGuardrails,
          blocked_guardrails: blockedGuardrails,
        },
      });
    }
  }

  return signals;
}

// Apply auto-response based on drift severity
async function applyAutoResponse(
  supabase: any,
  tenantId: string,
  signals: DriftSignal[]
): Promise<{ action: string; mlStatus: string }> {
  const maxSeverity = signals.reduce((max, s) => {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityOrder[s.severity] > severityOrder[max] ? s.severity : max;
  }, 'low' as 'low' | 'medium' | 'high' | 'critical');

  let action = 'none';
  let mlStatus = 'ACTIVE';
  let fallbackReason: string | null = null;

  if (maxSeverity === 'critical') {
    // Kill switch - disable ML
    action = 'kill_switch';
    mlStatus = 'DISABLED';
    fallbackReason = signals.find(s => s.severity === 'critical')?.metric || 'critical_drift';
    
    await supabase
      .from('tenant_ml_settings')
      .update({
        ml_enabled: false,
        ml_status: 'DISABLED',
        last_fallback_reason: fallbackReason,
        last_fallback_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
      
  } else if (maxSeverity === 'high') {
    // Hard warning - limit ML (guardrails force manual)
    action = 'limit';
    mlStatus = 'LIMITED';
    
    await supabase
      .from('tenant_ml_settings')
      .update({
        ml_status: 'LIMITED',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
      
  } else if (maxSeverity === 'medium') {
    // Soft warning - just log
    action = 'warn';
    mlStatus = 'ACTIVE';
  }

  // Update drift signals with auto action taken
  for (const signal of signals) {
    await supabase
      .from('ml_drift_signals')
      .insert({
        tenant_id: tenantId,
        model_version: 'v2.0',
        ...signal,
        auto_action_taken: action,
      });
  }

  return { action, mlStatus };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate JWT and get tenant
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Get user's tenant
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (tenantError || !tenantUser?.tenant_id) {
      return new Response(JSON.stringify({ error: 'Forbidden - No tenant access', code: 'NO_TENANT' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenantUser.tenant_id;

    const url = new URL(req.url);
    const path = url.pathname.replace('/ml-monitoring', '');

    // GET /ml-monitoring/summary - Main monitoring summary
    if (req.method === 'GET' && path === '/summary') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get ML settings
      const { data: mlSettings } = await supabase
        .from('tenant_ml_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Get recent predictions
      const { data: predictions, count: totalPredictions } = await supabase
        .from('ml_prediction_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get outcomes
      const { data: outcomes } = await supabase
        .from('reconciliation_suggestion_outcomes')
        .select('suggestion_id, final_result, outcome')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const outcomeMap = new Map(outcomes?.map((o: any) => [o.suggestion_id, o]) || []);

      // Calculate accuracy
      const predictionsWithOutcomes = (predictions || []).filter(
        (p: any) => outcomeMap.has(p.suggestion_id)
      );
      const correctPredictions = predictionsWithOutcomes.filter(
        (p: any) => outcomeMap.get(p.suggestion_id)?.final_result === 'CORRECT'
      ).length;
      const accuracy = predictionsWithOutcomes.length > 0
        ? (correctPredictions / predictionsWithOutcomes.length) * 100
        : null;

      // Calculate calibration error
      const calibrationData = predictionsWithOutcomes.map((p: any) => ({
        predicted: p.predicted_confidence / 100,
        actual: outcomeMap.get(p.suggestion_id)?.final_result === 'CORRECT',
      }));
      const calibrationError = calculateECE(calibrationData);

      // Get recent drift signals
      const { data: driftSignals } = await supabase
        .from('ml_drift_signals')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('detected_at', sevenDaysAgo.toISOString())
        .order('detected_at', { ascending: false })
        .limit(10);

      // Calculate false auto rate
      const autoConfirmed = (outcomes || []).filter((o: any) => o.outcome === 'AUTO_CONFIRMED');
      const falseAutoRate = autoConfirmed.length > 0
        ? (autoConfirmed.filter((o: any) => o.final_result === 'INCORRECT').length / autoConfirmed.length) * 100
        : 0;

      // Get guardrail stats
      const { count: totalGuardrails } = await supabase
        .from('reconciliation_guardrail_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: blockedGuardrails } = await supabase
        .from('reconciliation_guardrail_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('action', 'BLOCK')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const guardrailBlockRate = (totalGuardrails || 0) > 0
        ? ((blockedGuardrails || 0) / (totalGuardrails || 1)) * 100
        : 0;

      return new Response(
        JSON.stringify({
          modelVersion: mlSettings?.ml_model_version || 'v2.0',
          mlStatus: mlSettings?.ml_status || 'DISABLED',
          mlEnabled: mlSettings?.ml_enabled || false,
          lastFallbackReason: mlSettings?.last_fallback_reason,
          lastFallbackAt: mlSettings?.last_fallback_at,
          
          // Model health
          accuracy: accuracy ? Math.round(accuracy * 10) / 10 : null,
          calibrationError: Math.round(calibrationError * 1000) / 1000,
          sampleSize: totalPredictions || 0,
          
          // Automation safety
          falseAutoRate: Math.round(falseAutoRate * 100) / 100,
          guardrailBlockRate: Math.round(guardrailBlockRate * 10) / 10,
          autoConfirmedCount: autoConfirmed.length,
          
          // Drift signals
          driftSignals: (driftSignals || []).map((s: any) => ({
            type: s.drift_type,
            severity: s.severity,
            metric: s.metric,
            delta: s.delta,
            detectedAt: s.detected_at,
            acknowledged: !!s.acknowledged_at,
            autoActionTaken: s.auto_action_taken,
          })),
          
          activeDriftCount: (driftSignals || []).filter((s: any) => !s.acknowledged_at).length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ml-monitoring/drift-events - Detailed drift history
    if (req.method === 'GET' && path === '/drift-events') {
      const limit = parseInt(url.searchParams.get('limit') || '50');

      const { data: driftEvents } = await supabase
        .from('ml_drift_signals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('detected_at', { ascending: false })
        .limit(limit);

      return new Response(
        JSON.stringify({
          events: driftEvents || [],
          total: driftEvents?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ml-monitoring/detect - Run drift detection
    if (req.method === 'POST' && path === '/detect') {
      const { data: mlSettings } = await supabase
        .from('tenant_ml_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!mlSettings?.ml_enabled && mlSettings?.ml_status !== 'LIMITED') {
        return new Response(
          JSON.stringify({ 
            message: 'ML not active, skipping drift detection',
            mlStatus: mlSettings?.ml_status || 'DISABLED',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const signals = await detectDrift(supabase, tenantId, mlSettings?.ml_model_version || 'v2.0');
      
      let response = { signals, action: 'none', mlStatus: mlSettings?.ml_status || 'ACTIVE' };
      
      if (signals.length > 0) {
        const autoResponse = await applyAutoResponse(supabase, tenantId, signals);
        response = { signals, ...autoResponse };
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ml-monitoring/acknowledge - Acknowledge a drift signal
    if (req.method === 'POST' && path === '/acknowledge') {
      const { signalId } = await req.json();

      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      const { error } = await supabase
        .from('ml_drift_signals')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq('id', signalId)
        .eq('tenant_id', tenantId);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to acknowledge signal' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ml-monitoring/reset-status - Reset ML status (admin action)
    if (req.method === 'POST' && path === '/reset-status') {
      const { status } = await req.json();

      if (!['ACTIVE', 'LIMITED'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('tenant_ml_settings')
        .update({
          ml_status: status,
          ml_enabled: status === 'ACTIVE',
          last_fallback_reason: null,
          last_fallback_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to reset status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, mlStatus: status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('ML Monitoring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
