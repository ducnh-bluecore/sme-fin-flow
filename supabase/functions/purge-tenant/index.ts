
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
    target = "items",  // "items" -> "orders" -> "customers" -> "cleanup"
    batch_size = 50,
    cumulative_deleted = 0,
    invocation = 1,
    max_invocations = 500,
  } = body;

  const startMs = Date.now();
  const MAX_TIME = 50000;
  let totalDeleted = 0;
  let batchNum = 0;
  let completed = false;
  const logs: string[] = [];

  const tableMap: Record<string, string> = {
    items: "cdp_order_items",
    orders: "cdp_orders",
    customers: "cdp_customers",
    family_codes: "inv_family_codes",
    connector: "connector_integrations",
  };

  const table = tableMap[target] || target;

  try {
    while (Date.now() - startMs < MAX_TIME) {
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

      if (batchNum % 20 === 0) {
        logs.push(`Batch ${batchNum}: deleted ${totalDeleted} this run`);
      }
    }

    const grandTotal = cumulative_deleted + totalDeleted;

    // Auto-continue: same target if not done, or next target
    let nextTarget = target;
    if (completed) {
      const sequence = ["items", "orders", "customers", "family_codes", "connector"];
      const idx = sequence.indexOf(target);
      if (idx >= 0 && idx < sequence.length - 1) {
        nextTarget = sequence[idx + 1];
        completed = false; // still more work
        logs.push(`Moving to next target: ${nextTarget}`);
      }
    }

    if (!completed && invocation < max_invocations) {
      const continueBody = {
        target: nextTarget === target ? target : nextTarget,
        batch_size,
        cumulative_deleted: nextTarget === target ? grandTotal : 0,
        invocation: invocation + 1,
      };

      fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(continueBody),
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
