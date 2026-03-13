
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const tenantId = "364a23ad-66f5-44d6-8da9-74c7ff333dcc";

  const body = await req.json().catch(() => ({}));
  const {
    target = "orders",
    batch_size = 1000,
    cumulative_deleted = 0,
    invocation = 1,
  } = body;

  const startMs = Date.now();
  const MAX_TIME = 50000; // 50s safety
  let totalDeleted = 0;
  let batchNum = 0;
  let completed = false;
  const logs: string[] = [];

  try {
    while (Date.now() - startMs < MAX_TIME) {
      const table = target === "customers" ? "cdp_customers" : "cdp_orders";
      
      const { data, error } = await supabase.rpc("execute_sql_admin", {
        sql_query: `WITH ids AS (SELECT id FROM ${table} WHERE tenant_id = '${tenantId}' ORDER BY id LIMIT ${batch_size}), del AS (DELETE FROM ${table} o USING ids WHERE o.id = ids.id RETURNING 1) SELECT count(*) AS d FROM del;`
      });

      if (error) {
        logs.push(`Batch ${batchNum} error: ${error.message}`);
        break;
      }

      const deleted = data?.[0]?.d ?? 0;
      totalDeleted += Number(deleted);
      batchNum++;

      if (batchNum % 20 === 0) {
        logs.push(`Batch ${batchNum}: total deleted this run = ${totalDeleted}`);
      }

      if (Number(deleted) === 0) {
        completed = true;
        logs.push(`${table}: ALL DONE ✅`);
        break;
      }
    }

    const grandTotal = cumulative_deleted + totalDeleted;

    // Auto-continue if not completed
    if (!completed) {
      logs.push(`Time limit. Auto-continuing from invocation ${invocation + 1}...`);
      
      fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          target,
          batch_size,
          cumulative_deleted: grandTotal,
          invocation: invocation + 1,
        }),
      }).catch(err => console.error("Auto-continue error:", err));
    }

    const result = {
      success: true,
      completed,
      target,
      invocation,
      batches_this_run: batchNum,
      deleted_this_run: totalDeleted,
      grand_total_deleted: grandTotal,
      elapsed_ms: Date.now() - startMs,
      logs,
    };

    console.log(`[purge-tenant] Result:`, JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
