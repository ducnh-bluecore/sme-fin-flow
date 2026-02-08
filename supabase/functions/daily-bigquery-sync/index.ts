/**
 * daily-bigquery-sync - Daily incremental sync orchestrator
 * 
 * Calls backfill-bigquery for each model type with a 2-day lookback window.
 * Scheduled via pg_cron at 1:00 AM UTC (8:00 AM Vietnam).
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

  // 2-day lookback
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 2);
  const dateFromStr = dateFrom.toISOString().split('T')[0]; // YYYY-MM-DD

  const results: Record<string, { success: boolean; duration_ms: number; error?: string; processed?: number }> = {};

  console.log(`[daily-sync] Starting incremental sync with date_from=${dateFromStr}`);

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
      results[modelType] = {
        success: data?.success ?? true,
        duration_ms: duration,
        processed: data?.result?.processed ?? 0,
        error: data?.error,
      };

      console.log(`[daily-sync] ${modelType} done in ${duration}ms - processed: ${data?.result?.processed ?? 0}`);
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

    // After order_items, run COGS update
    if (modelType === 'order_items') {
      const cogsStart = Date.now();
      try {
        console.log(`[daily-sync] Running update_order_items_cogs()...`);
        const { error } = await supabase.rpc('update_order_items_cogs');
        const cogsDuration = Date.now() - cogsStart;
        results['update_cogs'] = {
          success: !error,
          duration_ms: cogsDuration,
          error: error?.message,
        };
        console.log(`[daily-sync] COGS update done in ${cogsDuration}ms`);
      } catch (err) {
        results['update_cogs'] = {
          success: false,
          duration_ms: Date.now() - cogsStart,
          error: err.message,
        };
        console.error(`[daily-sync] COGS update FAILED: ${err.message}`);
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  const failedCount = Object.values(results).filter(r => !r.success).length;

  const summary = {
    success: failedCount === 0,
    date_from: dateFromStr,
    total_duration_ms: totalDuration,
    total_models: SYNC_SEQUENCE.length,
    failed_count: failedCount,
    results,
  };

  console.log(`[daily-sync] Completed in ${totalDuration}ms. Failed: ${failedCount}/${SYNC_SEQUENCE.length}`);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: failedCount > 0 ? 207 : 200,
  });
});
