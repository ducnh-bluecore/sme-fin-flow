import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

// Feature extraction utilities
interface MLFeatures {
  // Amount signals
  amount_diff_ratio: number;
  exact_amount_match: boolean;
  
  // Identity signals
  invoice_number_match: boolean;
  customer_name_match: boolean;
  reference_similarity_score: number;
  
  // Temporal signals
  date_distance_days: number;
  due_date_relation: string;
  
  // Historical signals
  past_success_rate_same_customer: number;
  past_success_rate_same_amount_bucket: number;
  calibration_bucket_success_rate: number;
  
  // Guardrail context
  is_single_candidate: boolean;
  competing_suggestions_count: number;
}

interface PredictionExplanation {
  [key: string]: number;
}

// Simple hash function for features
function hashFeatures(features: MLFeatures): string {
  const str = JSON.stringify(features);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Calculate similarity between two strings (simple Levenshtein-based)
function stringSimilarity(str1: string | null, str2: string | null): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

// Extract features from suggestion and context
async function extractFeatures(
  supabase: any,
  tenantId: string,
  suggestion: any
): Promise<MLFeatures> {
  // Get competing suggestions count
  const { data: competingSuggestions } = await supabase
    .from('reconciliation_suggestions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('exception_id', suggestion.exception_id)
    .neq('id', suggestion.id);
  
  const competingCount = competingSuggestions?.length || 0;
  
  // Get historical success rate for same customer
  const { data: customerOutcomes } = await supabase
    .from('reconciliation_suggestion_outcomes')
    .select('final_result')
    .eq('tenant_id', tenantId)
    .limit(100);
  
  const customerSuccessRate = customerOutcomes?.length > 0
    ? customerOutcomes.filter((o: any) => o.final_result === 'CORRECT').length / customerOutcomes.length
    : 0.5;
  
  // Get amount bucket success rate
  const amountBucket = Math.floor(Math.log10(Math.max(suggestion.suggested_amount || 1, 1)));
  const { data: amountOutcomes } = await supabase
    .from('reconciliation_suggestion_outcomes')
    .select('final_result')
    .eq('tenant_id', tenantId)
    .limit(50);
  
  const amountSuccessRate = amountOutcomes?.length > 0
    ? amountOutcomes.filter((o: any) => o.final_result === 'CORRECT').length / amountOutcomes.length
    : 0.5;
  
  // Get calibration bucket success rate
  const { data: calibrationStats } = await supabase
    .from('confidence_calibration_stats')
    .select('empirical_success_rate')
    .eq('tenant_id', tenantId)
    .eq('suggestion_type', suggestion.suggestion_type)
    .limit(1)
    .maybeSingle();
  
  const calibrationRate = calibrationStats?.empirical_success_rate || 50;
  
  // Parse rationale for feature signals
  const rationale = suggestion.rationale || {};
  
  // Amount signals
  const bankAmount = rationale.bank_amount || suggestion.suggested_amount || 0;
  const invoiceAmount = rationale.invoice_amount || suggestion.suggested_amount || 0;
  const amountDiff = Math.abs(bankAmount - invoiceAmount);
  const amountDiffRatio = invoiceAmount > 0 ? amountDiff / invoiceAmount : 0;
  const exactMatch = amountDiffRatio < 0.001;
  
  // Identity signals
  const invoiceNumberMatch = rationale.reference_match === true || 
    (typeof rationale.reference_similarity === 'number' && rationale.reference_similarity > 0.8);
  const customerNameMatch = rationale.customer_match === true;
  const referenceSimilarity = rationale.reference_similarity || 0;
  
  // Temporal signals
  const dateDistance = rationale.date_distance_days || 0;
  const dueDateRelation = dateDistance < 0 ? 'before_due' : (dateDistance < 7 ? 'near_due' : 'past_due');
  
  return {
    amount_diff_ratio: amountDiffRatio,
    exact_amount_match: exactMatch,
    invoice_number_match: invoiceNumberMatch,
    customer_name_match: customerNameMatch,
    reference_similarity_score: referenceSimilarity,
    date_distance_days: Math.abs(dateDistance),
    due_date_relation: dueDateRelation,
    past_success_rate_same_customer: customerSuccessRate,
    past_success_rate_same_amount_bucket: amountSuccessRate,
    calibration_bucket_success_rate: calibrationRate / 100,
    is_single_candidate: competingCount === 0,
    competing_suggestions_count: competingCount,
  };
}

// Rule-based ML model (v2.0) - XGBoost-like decision tree simulation
function predictConfidence(features: MLFeatures): { confidence: number; explanation: PredictionExplanation } {
  const explanation: PredictionExplanation = {};
  let baseScore = 50;
  
  // Amount signals (highest weight)
  if (features.exact_amount_match) {
    explanation.exact_amount_match = 0.35;
    baseScore += 35;
  } else if (features.amount_diff_ratio < 0.01) {
    explanation.amount_near_match = 0.25;
    baseScore += 25;
  } else if (features.amount_diff_ratio < 0.05) {
    explanation.amount_partial_match = 0.10;
    baseScore += 10;
  }
  
  // Identity signals
  if (features.invoice_number_match) {
    explanation.invoice_number_match = 0.25;
    baseScore += 25;
  }
  if (features.customer_name_match) {
    explanation.customer_name_match = 0.10;
    baseScore += 10;
  }
  if (features.reference_similarity_score > 0.7) {
    explanation.reference_similarity = 0.08;
    baseScore += 8;
  }
  
  // Temporal signals
  if (features.date_distance_days <= 3) {
    explanation.date_proximity = 0.10;
    baseScore += 10;
  } else if (features.date_distance_days <= 7) {
    explanation.date_proximity = 0.05;
    baseScore += 5;
  }
  
  // Historical signals (calibration-aware)
  const historicalBoost = (
    features.past_success_rate_same_customer * 0.3 +
    features.past_success_rate_same_amount_bucket * 0.2 +
    features.calibration_bucket_success_rate * 0.5
  ) * 15;
  
  if (historicalBoost > 0) {
    explanation.historical_success_rate = Math.round(historicalBoost) / 100;
    baseScore += historicalBoost;
  }
  
  // Single candidate bonus
  if (features.is_single_candidate) {
    explanation.single_candidate = 0.05;
    baseScore += 5;
  } else if (features.competing_suggestions_count >= 3) {
    explanation.multiple_candidates = -0.10;
    baseScore -= 10;
  }
  
  // Normalize to 0-100
  const confidence = Math.max(0, Math.min(100, baseScore));
  
  // Normalize explanation values to sum to ~1
  const totalWeight = Object.values(explanation).reduce((sum, v) => sum + Math.abs(v), 0);
  if (totalWeight > 0) {
    Object.keys(explanation).forEach(key => {
      explanation[key] = Math.round((explanation[key] / totalWeight) * 100) / 100;
    });
  }
  
  return { confidence, explanation };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate JWT and get tenant from claims
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
    const path = url.pathname.replace('/ml-reconciliation', '');

    // POST /ml-reconciliation/predict - Predict confidence for a suggestion
    if (req.method === 'POST' && path === '/predict') {
      const { suggestionId } = await req.json();

      if (!suggestionId) {
        return new Response(
          JSON.stringify({ error: 'suggestionId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if ML is enabled for tenant
      const { data: mlSettings } = await supabase
        .from('tenant_ml_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // P0-CRITICAL: Kill-switch defense-in-depth at edge function level
      if (!mlSettings?.ml_enabled) {
        console.warn(`[ML-KILLSWITCH] ML is disabled for tenant ${tenantId} - rejecting predict request`);
        return new Response(
          JSON.stringify({ 
            error: 'ML is disabled (kill-switch active)',
            mlEnabled: false,
            code: 'ML_DISABLED'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get suggestion
      const { data: suggestion, error: suggestionError } = await supabase
        .from('reconciliation_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (suggestionError || !suggestion) {
        return new Response(
          JSON.stringify({ error: 'Suggestion not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract features
      const features = await extractFeatures(supabase, tenantId, suggestion);
      
      // Get prediction
      const { confidence: predictedConfidence, explanation } = predictConfidence(features);
      
      // Get calibrated confidence for comparison
      const { data: calibrationStats } = await supabase
        .from('confidence_calibration_stats')
        .select('empirical_success_rate, total_suggestions')
        .eq('tenant_id', tenantId)
        .eq('suggestion_type', suggestion.suggestion_type)
        .order('last_computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const calibratedConfidence = calibrationStats?.empirical_success_rate || suggestion.confidence_score;
      
      // Final confidence = min(predicted, calibrated) for safety
      const finalConfidence = Math.min(predictedConfidence, calibratedConfidence || 100);

      // Store features
      const featuresHash = hashFeatures(features);
      await supabase
        .from('reconciliation_ml_features')
        .insert({
          tenant_id: tenantId,
          suggestion_id: suggestionId,
          exception_type: suggestion.exception_type || 'UNKNOWN',
          suggestion_type: suggestion.suggestion_type,
          features: features,
        });

      // Store prediction
      await supabase
        .from('reconciliation_ml_predictions')
        .insert({
          tenant_id: tenantId,
          suggestion_id: suggestionId,
          model_version: mlSettings.ml_model_version,
          predicted_confidence: predictedConfidence,
          explanation: explanation,
          features_hash: featuresHash,
          final_confidence: finalConfidence,
        });

      return new Response(
        JSON.stringify({
          mlEnabled: true,
          modelVersion: mlSettings.ml_model_version,
          predictedConfidence: Math.round(predictedConfidence * 100) / 100,
          calibratedConfidence: calibratedConfidence ? Math.round(calibratedConfidence * 100) / 100 : null,
          finalConfidence: Math.round(finalConfidence * 100) / 100,
          explanation,
          sampleSize: calibrationStats?.total_suggestions || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ml-reconciliation/settings - Get ML settings for tenant
    if (req.method === 'GET' && path === '/settings') {
      const { data: mlSettings } = await supabase
        .from('tenant_ml_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Get accuracy stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: predictions } = await supabase
        .from('reconciliation_ml_predictions')
        .select('id, predicted_confidence, final_confidence, suggestion_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: outcomes } = await supabase
        .from('reconciliation_suggestion_outcomes')
        .select('suggestion_id, final_result')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate accuracy
      let correctPredictions = 0;
      let totalPredictions = 0;
      
      if (predictions && outcomes) {
        const outcomeMap = new Map(outcomes.map((o: any) => [o.suggestion_id, o.final_result]));
        
        for (const pred of predictions) {
          const outcome = outcomeMap.get(pred.suggestion_id);
          if (outcome) {
            totalPredictions++;
            const wasHighConfidence = pred.predicted_confidence >= 70;
            const wasCorrect = outcome === 'CORRECT';
            if ((wasHighConfidence && wasCorrect) || (!wasHighConfidence && !wasCorrect)) {
              correctPredictions++;
            }
          }
        }
      }

      const accuracy = totalPredictions > 0 
        ? Math.round((correctPredictions / totalPredictions) * 100) 
        : null;

      // Get guardrail override rate
      const { count: totalGuardrails } = await supabase
        .from('reconciliation_guardrail_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: overriddenGuardrails } = await supabase
        .from('reconciliation_guardrail_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('human_override', true)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const guardrailOverrideRate = (totalGuardrails || 0) > 0
        ? Math.round(((overriddenGuardrails || 0) / (totalGuardrails || 1)) * 100)
        : 0;

      return new Response(
        JSON.stringify({
          mlEnabled: mlSettings?.ml_enabled || false,
          modelVersion: mlSettings?.ml_model_version || 'v2.0',
          minConfidenceThreshold: mlSettings?.min_confidence_threshold || 90,
          enabledAt: mlSettings?.enabled_at,
          sampleSizeLast30Days: totalPredictions,
          accuracyLast30Days: accuracy,
          guardrailOverrideRate,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /ml-reconciliation/settings - Update ML settings
    if (req.method === 'PUT' && path === '/settings') {
      const { mlEnabled, minConfidenceThreshold } = await req.json();

      // Get auth user
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Check if we need to disable due to safety (kill switch)
      if (mlEnabled) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Check false auto rate
        const { data: outcomes } = await supabase
          .from('reconciliation_suggestion_outcomes')
          .select('outcome, final_result')
          .eq('tenant_id', tenantId)
          .eq('outcome', 'AUTO_CONFIRMED')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (outcomes && outcomes.length > 10) {
          const incorrectCount = outcomes.filter((o: any) => o.final_result === 'INCORRECT').length;
          const falseAutoRate = incorrectCount / outcomes.length;

          if (falseAutoRate > 0.05) {
            // Kill switch triggered - do not enable
            return new Response(
              JSON.stringify({ 
                error: 'ML cannot be enabled due to high false automation rate',
                falseAutoRate: Math.round(falseAutoRate * 100),
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Upsert settings
      const { data, error } = await supabase
        .from('tenant_ml_settings')
        .upsert({
          tenant_id: tenantId,
          ml_enabled: mlEnabled,
          min_confidence_threshold: minConfidenceThreshold || 90,
          enabled_at: mlEnabled ? new Date().toISOString() : null,
          enabled_by: mlEnabled ? userId : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating ML settings:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          mlEnabled: data.ml_enabled,
          modelVersion: data.ml_model_version,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('ML Reconciliation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
