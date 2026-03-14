
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
    table = "cdp_order_items",
    batch_size = 10000,
    timeout_seconds = 300,
  } = body;

  try {
    // Use execute_sql_admin to run with elevated timeout inside DB
    const sql = `
      SET LOCAL statement_timeout = '${timeout_seconds}s';
      
      DO $$
      DECLARE
        total_deleted bigint := 0;
        batch_deleted bigint;
        batch_num int := 0;
      BEGIN
        LOOP
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
          
          total_deleted := total_deleted + batch_deleted;
          batch_num := batch_num + 1;
          
          IF batch_num % 10 = 0 THEN
            RAISE NOTICE 'Batch %: deleted % total so far', batch_num, total_deleted;
          END IF;
          
          EXIT WHEN batch_deleted = 0;
        END LOOP;
        
        RAISE NOTICE 'DONE: % total deleted from ${table}', total_deleted;
      END $$;
    `;

    const { data, error } = await supabase.rpc('execute_sql_admin', {
      sql_query: sql,
    });

    if (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: "Try smaller batch_size or specific table",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      table,
      message: `Purge completed for ${table}`,
      result: data,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
