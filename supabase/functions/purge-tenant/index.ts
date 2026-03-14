
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
    table = "cdp_orders",
    batch_size = 500,
    chain = 0,
    max_chains = 2000,
  } = body;

  const startMs = Date.now();
  let totalDeleted = 0;
  let batchNum = 0;

  try {
    // Run as many batches as possible within 45s
    while (Date.now() - startMs < 45000) {
      const { data: rows, error: fetchErr } = await supabase
        .from(table)
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(batch_size);

      if (fetchErr) break;
      if (!rows || rows.length === 0) {
        // All done!
        return new Response(JSON.stringify({ 
          success: true, done: true, table, chain,
          deleted_this_run: totalDeleted,
          message: `DONE! ${table} fully purged after chain ${chain}.`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ids = rows.map((r: any) => r.id);
      const { error: delErr } = await supabase.from(table).delete().in("id", ids);
      
      if (delErr) {
        // On error, still chain to retry
        break;
      }

      totalDeleted += ids.length;
      batchNum++;
    }

    // Auto-chain
    if (chain < max_chains) {
      fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ table, batch_size, chain: chain + 1, max_chains }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ 
      success: true, table, chain, batchNum,
      deleted_this_run: totalDeleted,
      elapsed_ms: Date.now() - startMs,
      message: `Chain ${chain}: deleted ${totalDeleted}. Auto-continuing...`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, table, chain }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
