import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const BATCH_SIZE = 20;
const MAX_SECONDS = 45; // loop internally for ~45s

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ctx = await requireAuth(req);
  if (isErrorResponse(ctx)) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const runId = body.run_id || null;
    const tenantId = ctx.tenantId;

    const startTime = Date.now();
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process allocation recommendations
    const allocResult = await backfillTable(
      ctx.supabase, tenantId, runId,
      'inv_allocation_recommendations', 'store_id', 'recommended_qty',
      startTime, MAX_SECONDS
    );
    totalUpdated += allocResult.updated;
    totalSkipped += allocResult.skipped;

    // Process rebalance suggestions if still have time
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed < MAX_SECONDS) {
      const rebalResult = await backfillTable(
        ctx.supabase, tenantId, runId,
        'inv_rebalance_suggestions', 'to_location', 'qty',
        startTime, MAX_SECONDS
      );
      totalUpdated += rebalResult.updated;
      totalSkipped += rebalResult.skipped;
    }

    return jsonResponse({
      updated_count: totalUpdated,
      skipped_count: totalSkipped,
      elapsed_seconds: Math.round((Date.now() - startTime) / 1000),
    });
  } catch (err) {
    console.error('Backfill error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Backfill failed', 500);
  }
});

async function backfillTable(
  supabase: any,
  tenantId: string,
  runId: string | null,
  tableName: string,
  destColumn: string,   // 'store_id' or 'to_location'
  qtyColumn: string,    // 'recommended_qty' or 'qty'
  startTime: number,
  maxSeconds: number
) {
  let updated = 0;
  let skipped = 0;

  // Query records with null size_breakdown
  let query = supabase
    .from(tableName)
    .select(`id, fc_id, ${destColumn}, ${qtyColumn}`)
    .eq('tenant_id', tenantId)
    .is('size_breakdown', null)
    .limit(1000);

  if (runId) {
    query = query.eq('run_id', runId);
  }

  const { data: records, error: fetchError } = await query;
  if (fetchError) {
    console.error(`Error fetching ${tableName}:`, fetchError);
    return { updated, skipped };
  }
  if (!records || records.length === 0) {
    return { updated, skipped };
  }

  console.log(`[Backfill] ${tableName}: ${records.length} records to process`);

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    // Time check
    if ((Date.now() - startTime) / 1000 > maxSeconds) {
      console.log(`[Backfill] Time limit reached after ${updated} updates`);
      break;
    }

    const batch = records.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (rec: any) => {
        try {
          const { data: sizeData, error: rpcError } = await supabase.rpc(
            'fn_allocate_size_split',
            {
              p_tenant_id: tenantId,
              p_fc_id: rec.fc_id,
              p_source_store_id: null,  // central warehouse
              p_dest_store_id: rec[destColumn],
              p_total_qty: rec[qtyColumn] || 0,
            }
          );

          if (rpcError) {
            console.error(`RPC error for ${rec.id}:`, rpcError.message);
            skipped++;
            return;
          }

          // Update the record with size_breakdown
          const breakdown = sizeData || [];
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ size_breakdown: breakdown })
            .eq('id', rec.id);

          if (updateError) {
            console.error(`Update error for ${rec.id}:`, updateError.message);
            skipped++;
          } else {
            updated++;
          }
        } catch (e) {
          console.error(`Exception for ${rec.id}:`, e);
          skipped++;
        }
      })
    );
  }

  console.log(`[Backfill] ${tableName}: ${updated} updated, ${skipped} skipped`);
  return { updated, skipped };
}
