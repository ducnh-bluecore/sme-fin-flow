
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
    batch_size = 2000,
    chain = 0,
    max_chains = 200,
  } = body;

  try {
    const sql = `
      SET LOCAL statement_timeout = '50s';
      SET LOCAL lock_timeout = '10s';
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

    const { data, error } = await supabase.rpc('execute_sql_admin', {
      sql_text: sql,
    });

    if (error) {
      // On lock/timeout, just retry via chain
      if (chain < max_chains && (error.message.includes('lock') || error.message.includes('timeout'))) {
        fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ table, batch_size, chain: chain + 1, max_chains }),
        }).catch(() => {});

        return new Response(JSON.stringify({ 
          success: false, retrying: true, error: error.message, chain,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, error: error.message, chain }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check remaining
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    const rowsLeft = count ?? 0;

    // Auto-chain if more rows
    if (rowsLeft > 0 && chain < max_chains) {
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
      success: true, table, chain, rows_remaining: rowsLeft,
      message: rowsLeft > 0 
        ? `Chain ${chain}: batch done, ${rowsLeft} remaining. Auto-continuing...`
        : `DONE! ${table} fully purged.`,
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
