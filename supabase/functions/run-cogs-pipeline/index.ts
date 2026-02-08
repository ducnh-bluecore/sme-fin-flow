/**
 * run-cogs-pipeline - Batched COGS aggregation for high-volume datasets
 * 
 * Aggregates line_cogs from cdp_order_items → cdp_orders.cogs
 * Auto-continues until all orders processed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const BATCH_SIZE = 3000;
const TIME_LIMIT_MS = 50000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let runKpi = false;
  try {
    const body = await req.json();
    runKpi = body?.run_kpi === true;
  } catch { /* defaults */ }

  let totalUpdated = 0;
  let iterations = 0;
  let completed = false;

  console.log('[cogs] Starting batched COGS aggregate...');

  while (Date.now() - startTime < TIME_LIMIT_MS) {
    iterations++;
    try {
      const { data, error } = await supabase.rpc('aggregate_order_cogs_batch', {
        p_tenant_id: TENANT_ID,
        p_batch_size: BATCH_SIZE,
      });
      if (error) {
        console.error(`[cogs] Batch ${iterations} error: ${error.message}`);
        break;
      }
      const updated = data ?? 0;
      if (updated === 0) { completed = true; break; }
      totalUpdated += updated;
      if (iterations % 5 === 0) {
        console.log(`[cogs] Batch ${iterations}: total ${totalUpdated} orders updated`);
      }
    } catch (err) {
      console.error(`[cogs] Batch ${iterations} error: ${err.message}`);
      break;
    }
  }

  console.log(`[cogs] Phase done: ${totalUpdated} orders in ${iterations} batches (${Date.now() - startTime}ms). Completed: ${completed}`);

  // Auto-continue if not done
  if (!completed && totalUpdated > 0) {
    console.log('[cogs] Auto-continuing...');
    try {
      await supabase.functions.invoke('run-cogs-pipeline', {
        body: { run_kpi: runKpi },
      });
    } catch (err) {
      console.error(`[cogs] Auto-continue invoke: ${err.message}`);
    }
  }

  // KPI recompute only when fully done
  if (completed && runKpi) {
    const t = Date.now();
    try {
      const d = new Date(); d.setDate(d.getDate() - 90);
      console.log('[cogs] Recomputing KPIs...');
      const { error } = await supabase.rpc('compute_kpi_facts_daily', {
        p_tenant_id: TENANT_ID,
        p_start_date: d.toISOString().split('T')[0],
        p_end_date: new Date().toISOString().split('T')[0],
      });
      console.log(`[cogs] KPI done in ${Date.now() - t}ms${error ? ' ERROR: ' + error.message : ''}`);
    } catch (err) {
      console.error(`[cogs] KPI error: ${err.message}`);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total_duration_ms: Date.now() - startTime,
    orders_updated: totalUpdated,
    iterations,
    completed,
    auto_continued: !completed && totalUpdated > 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
