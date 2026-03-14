
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
    batch_size = 5000,
    max_batches = 8,  // ~40k per call, keeps under 50s
    cumulative = 0,
    chain = 0,
    max_chains = 100,
  } = body;

  try {
    // DO block with limited iterations to stay within edge function timeout
    const sql = `
      DO $$
      DECLARE
        batch_deleted bigint;
        i int := 0;
      BEGIN
        SET LOCAL statement_timeout = '45s';
        LOOP
          i := i + 1;
          EXIT WHEN i > ${max_batches};
          
          WITH del AS (
            DELETE FROM public.${table}
            WHERE ctid IN (
              SELECT ctid FROM public.${table}
              WHERE tenant_id = '${tenantId}'
              LIMIT ${batch_size}
            )
            RETURNING 1
          )
          SELECT count(*) INTO batch_deleted FROM del;
          
          EXIT WHEN batch_deleted = 0;
          
          RAISE NOTICE 'Batch %: deleted %', i, batch_deleted;
        END LOOP;
      END $$;
    `;

    const { data, error } = await supabase.rpc('execute_sql_admin', {
      sql_text: sql,
    });

    if (error) {
      return new Response(JSON.stringify({ 
        success: false, error: error.message, table, chain,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if more rows remain
    const { data: remaining } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    const estimatedDeleted = cumulative + (max_batches * batch_size);

    // Auto-chain if rows remain
    const hasMore = remaining !== null; // if query succeeded, check count
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    const rowsLeft = count ?? 0;

    if (rowsLeft > 0 && chain < max_chains) {
      // Fire next chain asynchronously
      fetch(`${supabaseUrl}/functions/v1/purge-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          table, batch_size, max_batches,
          cumulative: estimatedDeleted,
          chain: chain + 1,
          max_chains,
        }),
      }).catch(err => console.error("Chain error:", err));
    }

    return new Response(JSON.stringify({ 
      success: true, table, chain,
      rows_remaining: rowsLeft,
      message: rowsLeft > 0 
        ? `Chain ${chain}: ~${max_batches * batch_size} deleted, ${rowsLeft} remaining. Auto-continuing...`
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
