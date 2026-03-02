import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { tenant_id, user_id, action, run_type, dry_run } = body;

    if (!tenant_id) {
      return jsonResponse({ error: "tenant_id required" }, 400);
    }

    if (action === "rebalance") {
      return await handleRebalance(supabase, tenant_id, user_id);
    } else if (action === "allocate") {
      const rt = run_type || "both";
      return await handleAllocate(supabase, tenant_id, user_id, rt, dry_run || false);
    }

    return jsonResponse({ error: "Unknown action. Use 'rebalance' or 'allocate'" }, 400);
  } catch (error) {
    console.error("Engine error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── Allocate: Delegated to PL/pgSQL fn_allocation_engine ────────

async function handleAllocate(
  supabase: any,
  tenantId: string,
  userId: string | undefined,
  runType: string,
  dryRun: boolean
) {
  const { data: run, error: runError } = await supabase
    .from("inv_allocation_runs")
    .insert({
      tenant_id: tenantId,
      run_date: new Date().toISOString().split("T")[0],
      status: "running",
      run_type: runType,
      started_at: new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (runError) throw runError;

  try {
    console.log(`[ALLOC] Calling fn_allocation_engine for run ${run.id}, type=${runType}...`);

    const { data, error } = await supabase.rpc("fn_allocation_engine", {
      p_tenant_id: tenantId,
      p_run_id: run.id,
      p_run_type: runType,
    });

    if (error) throw error;

    const result = data || { total_recommendations: 0, v1_count: 0, v2_count: 0, total_units: 0 };
    console.log(`[ALLOC] Done:`, JSON.stringify(result));

    // Update run record
    await supabase
      .from("inv_allocation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_recommendations: result.total_recommendations,
        total_units: result.total_units,
      })
      .eq("id", run.id);

    // Batch size split in DB — single RPC call, no N+1
    const sizeResult = await batchSizeSplit(supabase, tenantId, run.id, "alloc");
    console.log(`[ALLOC] Size split:`, JSON.stringify(sizeResult));

    return jsonResponse({
      run_id: run.id,
      run_type: runType,
      dry_run: dryRun,
      size_split: sizeResult,
      ...result,
    });
  } catch (error) {
    await supabase
      .from("inv_allocation_runs")
      .update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

// ─── Rebalance: Delegated to PL/pgSQL fn_rebalance_engine ───────

async function handleRebalance(supabase: any, tenantId: string, userId?: string) {
  const { data: run, error: runError } = await supabase
    .from("inv_rebalance_runs")
    .insert({
      tenant_id: tenantId,
      run_date: new Date().toISOString().split("T")[0],
      status: "running",
      started_at: new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (runError) throw runError;

  try {
    console.log(`[Rebalance] Calling fn_rebalance_engine for run ${run.id}...`);
    const { data, error } = await supabase.rpc("fn_rebalance_engine", {
      p_tenant_id: tenantId,
      p_run_id: run.id,
    });

    if (error) throw error;

    const result = data || { push_suggestions: 0, push_units: 0, lateral_suggestions: 0, lateral_units: 0, total_suggestions: 0 };
    console.log(`[Rebalance] Done:`, JSON.stringify(result));

    await supabase
      .from("inv_rebalance_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_suggestions: result.total_suggestions,
        total_units: (result.push_units || 0) + (result.lateral_units || 0),
        push_units: result.push_units || 0,
        lateral_units: result.lateral_units || 0,
      })
      .eq("id", run.id);

    // Batch size split in DB — single RPC call, no N+1
    const sizeResult = await batchSizeSplit(supabase, tenantId, run.id, "rebalance");
    console.log(`[Rebalance] Size split:`, JSON.stringify(sizeResult));

    return jsonResponse({ run_id: run.id, size_split: sizeResult, ...result });
  } catch (error) {
    await supabase
      .from("inv_rebalance_runs")
      .update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

// ─── Batch Size Split — retry loop until all records processed ───

async function batchSizeSplit(
  supabase: any,
  tenantId: string,
  runId: string,
  tableName: "alloc" | "rebalance"
) {
  const BATCH = 2000;
  const MAX_ROUNDS = 10;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    try {
      const { data, error } = await supabase.rpc("fn_batch_size_split", {
        p_tenant_id: tenantId,
        p_run_id: runId,
        p_table_name: tableName,
        p_max_records: BATCH,
      });

      if (error) {
        console.error(`[SizeSplit] Round ${round} RPC error:`, error.message);
        break;
      }

      const result = data || { updated: 0, skipped: 0, total: 0 };
      totalUpdated += result.updated || 0;
      totalSkipped += result.skipped || 0;

      console.log(`[SizeSplit] Round ${round}: ${result.updated}/${result.total} updated`);

      // If processed fewer than batch size, all done
      if ((result.total || 0) < BATCH) break;
    } catch (err) {
      console.error(`[SizeSplit] Round ${round} exception:`, err);
      break;
    }
  }

  return { updated: totalUpdated, skipped: totalSkipped };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
