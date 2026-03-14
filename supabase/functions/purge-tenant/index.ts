
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
    batch_size = 50000,
    chain = 0,
    max_chains = 50,
    phase = "purge",  // "kill_locks" | "disable_triggers" | "purge" | "enable_triggers"
  } = body;

  try {
    if (phase === "kill_locks") {
      const sql = `
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE pid != pg_backend_pid() 
        AND query LIKE '%cdp_orders%'
        AND state != 'idle';
      `;
      const { data, error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, result: data, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "disable_triggers") {
      const sql = `
        ALTER TABLE public.cdp_orders DISABLE TRIGGER trg_cdp_orders_queue_refresh;
        ALTER TABLE public.cdp_orders DISABLE TRIGGER trg_guard_order_source;
      `;
      const { error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (phase === "enable_triggers") {
      const sql = `
        ALTER TABLE public.cdp_orders ENABLE TRIGGER trg_cdp_orders_queue_refresh;
        ALTER TABLE public.cdp_orders ENABLE TRIGGER trg_guard_order_source;
      `;
      const { error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });
      return new Response(JSON.stringify({ success: !error, phase, error: error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use execute_sql_admin for DELETE with extended timeout
    const sql = `
      SET LOCAL statement_timeout = '55s';
      WITH del AS (
        DELETE FROM public.${table}
        WHERE ctid IN (
          SELECT ctid FROM public.${table}
          WHERE tenant_id = '${tenantId}'
          LIMIT ${batch_size}
        )
        RETURNING 1
      )
      SELECT count(*) as deleted FROM del;
    `;

    const { data, error } = await supabase.rpc('execute_sql_admin', { sql_text: sql });

    if (error) {
      // Retry on lock/timeout
      if (chain < max_chains) {
        fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ table, batch_size: Math.max(1000, batch_size / 2), chain: chain + 1, max_chains, phase }),
        }).catch(() => {});
      }
      return new Response(JSON.stringify({ success: false, error: error.message, chain, retrying: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if done
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    const rowsLeft = count ?? 0;

    if (rowsLeft > 0 && chain < max_chains) {
      fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ table, batch_size, chain: chain + 1, max_chains, phase }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ 
      success: true, table, chain, rows_remaining: rowsLeft,
      result: data,
      done: rowsLeft === 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
