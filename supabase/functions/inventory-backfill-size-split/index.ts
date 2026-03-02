import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const BATCH_PER_ROUND = 1000;
const MAX_ROUNDS = 20;
const MAX_SECONDS = 55;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ctx = await requireAuth(req);
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    let runId = body.run_id || null;
    const tenantId = ctx.tenantId;
    const table = body.table || 'both';

    // Auto-detect latest run_id if not provided
    if (!runId) {
      const { data: latestRun } = await ctx.supabase
        .from('inv_rebalance_runs')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      runId = latestRun?.id || null;
      if (runId) console.log(`[Backfill] Auto-detected run_id: ${runId}`);
    }

    const startTime = Date.now();
    let allocResult = { updated: 0, skipped: 0 };
    let rebalResult = { updated: 0, skipped: 0 };

    if (table === 'alloc' || table === 'both') {
      allocResult = await batchBackfill(ctx.supabase, tenantId, runId, 'alloc', startTime);
    }

    if ((table === 'rebalance' || table === 'both') && (Date.now() - startTime) / 1000 < MAX_SECONDS) {
      rebalResult = await batchBackfill(ctx.supabase, tenantId, runId, 'rebalance', startTime);
    }

    return jsonResponse({
      alloc: allocResult,
      rebalance: rebalResult,
      elapsed_seconds: Math.round((Date.now() - startTime) / 1000),
    });
  } catch (err) {
    console.error('Backfill error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Backfill failed', 500);
  }
});

async function batchBackfill(
  supabase: any,
  tenantId: string,
  runId: string | null,
  tableName: 'alloc' | 'rebalance',
  startTime: number,
) {
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if ((Date.now() - startTime) / 1000 > MAX_SECONDS) {
      console.log(`[Backfill] ${tableName}: time limit at round ${round}`);
      break;
    }

    try {
      // Use v2 set-based function for performance
      const params: any = {
        p_tenant_id: tenantId,
        p_table_name: tableName,
        p_max_records: BATCH_PER_ROUND,
      };
      if (runId) params.p_run_id = runId;

      const { data, error } = await supabase.rpc('fn_batch_size_split_v2', params);

      if (error) {
        console.error(`[Backfill] ${tableName} round ${round} error:`, error.message);
        break;
      }

      const result = data || { updated: 0, skipped: 0, total: 0 };
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;

      console.log(`[Backfill] ${tableName} round ${round}: ${result.updated}/${result.total}`);

      if ((result.total || 0) < BATCH_PER_ROUND) break;
    } catch (err) {
      console.error(`[Backfill] ${tableName} round ${round} exception:`, err);
      break;
    }
  }

  return { updated: totalUpdated, skipped: totalSkipped };
}
