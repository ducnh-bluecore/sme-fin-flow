
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
    batch_size = 100,
    phase = "purge",
  } = body;

  try {
    // Trigger management phases
    if (phase === "kill_locks") {
      const sql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND query LIKE '%cdp_orders%' AND state != 'idle';`;
      const { data, error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (phase === "disable_triggers") {
      const sql = `SET LOCAL lock_timeout = '30s'; ALTER TABLE public.cdp_orders DISABLE TRIGGER trg_cdp_orders_queue_refresh; ALTER TABLE public.cdp_orders DISABLE TRIGGER trg_guard_order_source;`;
      const { error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (phase === "enable_triggers") {
      const sql = `SET LOCAL lock_timeout = '30s'; ALTER TABLE public.cdp_orders ENABLE TRIGGER trg_cdp_orders_queue_refresh; ALTER TABLE public.cdp_orders ENABLE TRIGGER trg_guard_order_source;`;
      const { error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Purge phase - use Supabase client with small batches, auto-chain
    const startMs = Date.now();
    let totalDeleted = 0;
    let batchNum = 0;
    let lastError = "";

    while (Date.now() - startMs < 48000) {
      const { data: rows, error: fetchErr } = await supabase
        .from(table)
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(batch_size);

      if (fetchErr) { lastError = `fetch: ${fetchErr.message}`; break; }
      if (!rows || rows.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, done: true, table, deleted_this_run: totalDeleted,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ids = rows.map((r: any) => r.id);
      const { error: delErr } = await supabase.from(table).delete().in("id", ids);
      
      if (delErr) { lastError = `delete: ${delErr.message}`; break; }

      totalDeleted += ids.length;
      batchNum++;
      
      if (batchNum % 10 === 0) {
        console.log(`Batch ${batchNum}: deleted ${totalDeleted} total`);
      }
    }

    // Auto-chain: fire and forget
    fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({ table, batch_size, phase: "purge" }),
    }).catch(() => {});

    return new Response(JSON.stringify({ 
      success: true, table, batchNum,
      deleted_this_run: totalDeleted,
      elapsed_ms: Date.now() - startMs,
      lastError: lastError || undefined,
      message: `Deleted ${totalDeleted}, auto-continuing...`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
