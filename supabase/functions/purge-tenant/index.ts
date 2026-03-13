
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
    batch_size = 500,
    cumulative_deleted = 0,
    invocation = 1,
  } = body;

  const startMs = Date.now();
  const MAX_TIME = 50000;
  let totalDeleted = 0;
  let batchNum = 0;
  let completed = false;
  const logs: string[] = [];

  try {
    const table = target === "customers" ? "cdp_customers" 
                : target === "family_codes" ? "inv_family_codes"
                : target === "connector" ? "connector_integrations"
                : "cdp_orders";

    while (Date.now() - startMs < MAX_TIME) {
      // Fetch a batch of IDs
      const { data: rows, error: fetchErr } = await supabase
        .from(table)
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(batch_size);

      if (fetchErr) {
        logs.push(`Fetch error: ${fetchErr.message}`);
        break;
      }

      if (!rows || rows.length === 0) {
        completed = true;
        logs.push(`${table}: ALL DONE ✅`);
        break;
      }

      const ids = rows.map((r: any) => r.id);

      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .in("id", ids);

      if (delErr) {
        logs.push(`Delete error batch ${batchNum}: ${delErr.message}`);
        break;
      }

      totalDeleted += ids.length;
      batchNum++;

      if (batchNum % 10 === 0) {
        logs.push(`Batch ${batchNum}: deleted ${totalDeleted} this run`);
      }
    }

    const grandTotal = cumulative_deleted + totalDeleted;

    if (!completed) {
      logs.push(`Time limit. Auto-continuing invocation ${invocation + 1}...`);
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
      success: true, completed, target, invocation,
      batches_this_run: batchNum, deleted_this_run: totalDeleted,
      grand_total_deleted: grandTotal, elapsed_ms: Date.now() - startMs, logs,
    };

    console.log(`[purge-tenant] Result:`, JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
