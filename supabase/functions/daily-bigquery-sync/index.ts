/**
 * daily-bigquery-sync - Daily incremental sync orchestrator (Multi-tenant)
 * 
 * When called by pg_cron (no tenant_id): queries all active tenants with bigquery_configs and syncs each.
 * When called manually with tenant_id: syncs only that tenant.
 * Logs run results to daily_sync_runs table for history tracking.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface SyncResult {
  success: boolean;
  duration_ms: number;
  error?: string;
  processed?: number;
}

/** Run sync pipeline for a single tenant */
async function syncTenant(
  supabase: any,
  tenantId: string,
  lookbackDays: number,
  triggeredBy: string,
): Promise<{
  tenant_id: string;
  run_id?: string;
  status: string;
  total_duration_ms: number;
  results: Record<string, SyncResult>;
  total_records_processed: number;
}> {
  const startTime = Date.now();

  // Lookback window
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - lookbackDays);
  const dateFromStr = dateFrom.toISOString().split('T')[0];

  // Create run log entry
  const { data: runLog } = await supabase
    .from('daily_sync_runs')
    .insert({
      tenant_id: tenantId,
      run_type: triggeredBy === 'manual' || triggeredBy === 'admin' ? 'manual_full' : 'daily_incremental',
      status: 'running',
      date_from: dateFromStr,
      total_models: SYNC_SEQUENCE.length,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const runId = runLog?.id;
  const results: Record<string, SyncResult> = {};
  let totalProcessed = 0;

  console.log(`[daily-sync] Tenant ${tenantId.substring(0, 8)}... Run ${runId} - date_from=${dateFromStr} (lookback=${lookbackDays}d, trigger=${triggeredBy})`);

  for (const modelType of SYNC_SEQUENCE) {
    const modelStart = Date.now();
    try {
      console.log(`[daily-sync] [${tenantId.substring(0, 8)}] Syncing ${modelType}...`);

      const { data, error } = await supabase.functions.invoke('backfill-bigquery', {
        body: {
          action: 'start',
          tenant_id: tenantId,
          model_type: modelType,
          options: { date_from: dateFromStr },
        },
      });

      if (error) throw new Error(error.message || `Function invoke error for ${modelType}`);

      const duration = Date.now() - modelStart;
      const processed = data?.result?.processed ?? 0;
      totalProcessed += processed;
      results[modelType] = { success: data?.success ?? true, duration_ms: duration, processed, error: data?.error };

      console.log(`[daily-sync] [${tenantId.substring(0, 8)}] ${modelType} done in ${duration}ms - processed: ${processed}`);
    } catch (err) {
      results[modelType] = { success: false, duration_ms: Date.now() - modelStart, error: err.message };
      console.error(`[daily-sync] [${tenantId.substring(0, 8)}] ${modelType} FAILED: ${err.message}`);
    }

    // After order_items, run COGS pipeline
    if (modelType === 'order_items') {
      const cogsStart = Date.now();
      try {
        console.log(`[daily-sync] [${tenantId.substring(0, 8)}] Running backfill_cogs_pipeline()...`);
        const { data: cogsData, error } = await supabase.rpc('backfill_cogs_pipeline', { p_tenant_id: tenantId });
        const cogsDuration = Date.now() - cogsStart;
        results['cogs_pipeline'] = { success: !error, duration_ms: cogsDuration, processed: cogsData?.items_updated ?? 0, error: error?.message };
        if (cogsData) {
          console.log(`[daily-sync] [${tenantId.substring(0, 8)}] COGS pipeline done in ${cogsDuration}ms`);
        }
      } catch (err) {
        results['cogs_pipeline'] = { success: false, duration_ms: Date.now() - cogsStart, error: err.message };
        console.error(`[daily-sync] [${tenantId.substring(0, 8)}] COGS pipeline FAILED: ${err.message}`);
      }
    }
  }

  // Post-sync: KPI recompute
  const kpiStart = Date.now();
  try {
    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);
    const { data: kpiData, error } = await supabase.rpc('compute_kpi_facts_daily', {
      p_tenant_id: tenantId,
      p_start_date: lookbackStart.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    });
    results['kpi_recompute'] = { success: !error, duration_ms: Date.now() - kpiStart, processed: kpiData?.rows_upserted ?? 0, error: error?.message };
  } catch (err) {
    results['kpi_recompute'] = { success: false, duration_ms: Date.now() - kpiStart, error: err.message };
  }

  // Post-sync: Alert detection
  const alertStart = Date.now();
  try {
    const { data: alertData, error } = await supabase.rpc('detect_threshold_breaches', { p_tenant_id: tenantId });
    results['alert_detection'] = { success: !error, duration_ms: Date.now() - alertStart, processed: alertData?.alerts_created ?? 0, error: error?.message };
  } catch (err) {
    results['alert_detection'] = { success: false, duration_ms: Date.now() - alertStart, error: err.message };
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

  console.log(`[daily-sync] Tenant ${tenantId.substring(0, 8)}... completed in ${totalDuration}ms. Status: ${status}. Processed: ${totalProcessed}. Failed: ${failedCount}`);

  return { tenant_id: tenantId, run_id: runId, status, total_duration_ms: totalDuration, results, total_records_processed: totalProcessed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse body
  let triggeredBy = 'cron';
  let lookbackDays = 2;
  let specificTenantId: string | null = null;

  try {
    const body = await req.json();
    if (body?.triggered_by) triggeredBy = body.triggered_by;
    if (body?.lookback_days) lookbackDays = Math.max(1, Math.min(30, body.lookback_days));
    if (body?.tenant_id) specificTenantId = body.tenant_id;
  } catch {
    // No body = cron trigger
  }

  // Determine which tenants to sync
  let tenantIds: string[] = [];

  if (specificTenantId) {
    // Manual trigger for specific tenant
    tenantIds = [specificTenantId];
  } else {
    // Cron trigger: query all active tenants with active bigquery_configs
    const { data: activeTenants, error } = await supabase
      .from('bigquery_configs')
      .select('tenant_id')
      .eq('is_active', true);

    if (error) {
      console.error(`[daily-sync] Failed to query active tenants: ${error.message}`);
      return new Response(JSON.stringify({ success: false, error: 'Failed to query active tenants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    tenantIds = [...new Set((activeTenants || []).map((t: any) => t.tenant_id))];
    console.log(`[daily-sync] Found ${tenantIds.length} active tenant(s) to sync`);
  }

  if (tenantIds.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'No active tenants to sync', tenants: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Single tenant → return detailed result
  if (tenantIds.length === 1) {
    const result = await syncTenant(supabase, tenantIds[0], lookbackDays, triggeredBy);
    const hasFailures = Object.values(result.results).some(r => !r.success);
    return new Response(JSON.stringify({ success: !hasFailures, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: hasFailures ? 207 : 200,
    });
  }

  // Multi-tenant → run sequentially, return summary
  const allResults: any[] = [];
  for (const tid of tenantIds) {
    try {
      const result = await syncTenant(supabase, tid, lookbackDays, triggeredBy);
      allResults.push(result);
    } catch (err) {
      allResults.push({ tenant_id: tid, status: 'failed', error: err.message });
      console.error(`[daily-sync] Tenant ${tid.substring(0, 8)}... CRASHED: ${err.message}`);
    }
  }

  const totalFailed = allResults.filter(r => r.status === 'failed').length;

  return new Response(JSON.stringify({
    success: totalFailed === 0,
    total_tenants: tenantIds.length,
    succeeded: tenantIds.length - totalFailed,
    failed: totalFailed,
    tenants: allResults,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: totalFailed > 0 ? 207 : 200,
  });
});
