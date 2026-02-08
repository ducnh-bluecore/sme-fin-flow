/**
 * daily-bigquery-sync - Daily incremental sync orchestrator
 * 
 * Calls backfill-bigquery for each model type with a 2-day lookback window.
 * Scheduled via pg_cron at 1:00 AM UTC (8:00 AM Vietnam).
 * Logs run results to daily_sync_runs table for history tracking.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const SYNC_SEQUENCE = [
  'products',
  'customers',
  'orders',
  'order_items',
  // after order_items → run update_order_items_cogs()
  'payments',
  'fulfillments',
  'refunds',
  'ad_spend',
  'campaigns',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse optional body for manual triggers
  let triggeredBy = 'cron';
  let lookbackDays = 2;
  try {
    const body = await req.json();
    if (body?.triggered_by) triggeredBy = body.triggered_by;
    if (body?.lookback_days) lookbackDays = Math.max(1, Math.min(30, body.lookback_days));
  } catch {
    // No body = cron trigger, use defaults
  }

  // Lookback window
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - lookbackDays);
  const dateFromStr = dateFrom.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create run log entry
  const { data: runLog } = await supabase
    .from('daily_sync_runs')
    .insert({
      tenant_id: TENANT_ID,
      run_type: triggeredBy === 'manual' ? 'manual_full' : 'daily_incremental',
      status: 'running',
      date_from: dateFromStr,
      total_models: SYNC_SEQUENCE.length,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const runId = runLog?.id;

  const results: Record<string, { success: boolean; duration_ms: number; error?: string; processed?: number }> = {};
  let totalProcessed = 0;

  console.log(`[daily-sync] Run ${runId} - Starting incremental sync with date_from=${dateFromStr} (lookback=${lookbackDays}d, trigger=${triggeredBy})`);

  for (const modelType of SYNC_SEQUENCE) {
    const modelStart = Date.now();
    try {
      console.log(`[daily-sync] Syncing ${modelType}...`);

      const { data, error } = await supabase.functions.invoke('backfill-bigquery', {
        body: {
          action: 'start',
          tenant_id: TENANT_ID,
          model_type: modelType,
          options: {
            date_from: dateFromStr,
          },
        },
      });

      if (error) {
        throw new Error(error.message || `Function invoke error for ${modelType}`);
      }

      const duration = Date.now() - modelStart;
      const processed = data?.result?.processed ?? 0;
      totalProcessed += processed;
      results[modelType] = {
        success: data?.success ?? true,
        duration_ms: duration,
        processed,
        error: data?.error,
      };

      console.log(`[daily-sync] ${modelType} done in ${duration}ms - processed: ${processed}`);
    } catch (err) {
      const duration = Date.now() - modelStart;
      results[modelType] = {
        success: false,
        duration_ms: duration,
        error: err.message,
      };
      console.error(`[daily-sync] ${modelType} FAILED: ${err.message}`);
      // Continue to next model - don't stop
    }

    // After order_items, run full COGS pipeline
    if (modelType === 'order_items') {
      const cogsStart = Date.now();
      try {
        console.log(`[daily-sync] Running backfill_cogs_pipeline()...`);
        const { data: cogsData, error } = await supabase.rpc('backfill_cogs_pipeline', {
          p_tenant_id: TENANT_ID,
        });
        const cogsDuration = Date.now() - cogsStart;
        results['cogs_pipeline'] = {
          success: !error,
          duration_ms: cogsDuration,
          processed: cogsData?.items_updated ?? 0,
          error: error?.message,
        };
        if (cogsData) {
          console.log(`[daily-sync] COGS pipeline done in ${cogsDuration}ms - items: ${cogsData.items_updated}, orders: ${cogsData.orders_updated}`);
        }
      } catch (err) {
        results['cogs_pipeline'] = {
          success: false,
          duration_ms: Date.now() - cogsStart,
          error: err.message,
        };
        console.error(`[daily-sync] COGS pipeline FAILED: ${err.message}`);
      }
    }
  }

  // === Post-sync pipeline: KPI recompute + Alert detection ===
  
  // Step 2: Recompute KPI facts (2-day lookback)
  const kpiStart = Date.now();
  try {
    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);
    console.log(`[daily-sync] Running compute_kpi_facts_daily()...`);
    const { data: kpiData, error } = await supabase.rpc('compute_kpi_facts_daily', {
      p_tenant_id: TENANT_ID,
      p_start_date: lookbackStart.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    });
    const kpiDuration = Date.now() - kpiStart;
    results['kpi_recompute'] = {
      success: !error,
      duration_ms: kpiDuration,
      processed: kpiData?.rows_upserted ?? 0,
      error: error?.message,
    };
    console.log(`[daily-sync] KPI recompute done in ${kpiDuration}ms`);
  } catch (err) {
    results['kpi_recompute'] = {
      success: false,
      duration_ms: Date.now() - kpiStart,
      error: err.message,
    };
    console.error(`[daily-sync] KPI recompute FAILED: ${err.message}`);
  }

  // Step 3: Detect threshold breaches → alerts
  const alertStart = Date.now();
  try {
    console.log(`[daily-sync] Running detect_threshold_breaches()...`);
    const { data: alertData, error } = await supabase.rpc('detect_threshold_breaches', {
      p_tenant_id: TENANT_ID,
    });
    const alertDuration = Date.now() - alertStart;
    results['alert_detection'] = {
      success: !error,
      duration_ms: alertDuration,
      processed: alertData?.alerts_created ?? 0,
      error: error?.message,
    };
    console.log(`[daily-sync] Alert detection done in ${alertDuration}ms`);
  } catch (err) {
    results['alert_detection'] = {
      success: false,
      duration_ms: Date.now() - alertStart,
      error: err.message,
    };
    console.error(`[daily-sync] Alert detection FAILED: ${err.message}`);
  }

  const totalDuration = Date.now() - startTime;
  const succeededCount = Object.values(results).filter(r => r.success).length;
  const failedCount = Object.values(results).filter(r => !r.success).length;
  const failedModels = Object.entries(results).filter(([, r]) => !r.success).map(([k]) => k);

  const status = failedCount === 0 ? 'completed' : succeededCount === 0 ? 'failed' : 'partial';

  // Update run log
  if (runId) {
    await supabase
      .from('daily_sync_runs')
      .update({
        status,
        total_duration_ms: totalDuration,
        succeeded_count: succeededCount,
        failed_count: failedCount,
        total_records_processed: totalProcessed,
        results,
        error_summary: failedModels.length > 0 ? `Failed: ${failedModels.join(', ')}` : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  }

  const summary = {
    success: failedCount === 0,
    run_id: runId,
    date_from: dateFromStr,
    total_duration_ms: totalDuration,
    total_models: SYNC_SEQUENCE.length,
    succeeded_count: succeededCount,
    failed_count: failedCount,
    total_records_processed: totalProcessed,
    results,
  };

  console.log(`[daily-sync] Run ${runId} completed in ${totalDuration}ms. Status: ${status}. Processed: ${totalProcessed}. Failed: ${failedCount}/${SYNC_SEQUENCE.length}`);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: failedCount > 0 ? 207 : 200,
  });
});
