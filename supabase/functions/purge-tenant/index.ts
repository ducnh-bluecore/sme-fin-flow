
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tenantId = "364a23ad-66f5-44d6-8da9-74c7ff333dcc";
  const results: string[] = [];

  // Parse which table to target from query param (default: all)
  const url = new URL(req.url);
  const target = url.searchParams.get("target") || "all";

  try {
    const batchDelete = async (table: string, batchSize: number, maxIterations: number) => {
      let totalDeleted = 0;
      for (let i = 0; i < maxIterations; i++) {
        const { data, error } = await supabase.rpc("execute_sql_admin", {
          sql_query: `DELETE FROM ${table} WHERE ctid IN (SELECT ctid FROM ${table} WHERE tenant_id = '${tenantId}' LIMIT ${batchSize})`
        });
        if (error) {
          results.push(`${table} error at batch ${i}: ${error.message}`);
          break;
        }
        // Check if rows remain
        const { data: countData } = await supabase.rpc("execute_sql_admin", {
          sql_query: `SELECT COUNT(*)::int as c FROM ${table} WHERE tenant_id = '${tenantId}'`
        });
        const remaining = countData?.[0]?.c ?? 0;
        totalDeleted += batchSize;
        if (i % 10 === 0) results.push(`${table}: batch ${i}, ~${remaining} remaining`);
        if (remaining === 0) { results.push(`${table}: DONE ✅`); break; }
      }
      return totalDeleted;
    };

    if (target === "all" || target === "orders") {
      await batchDelete("cdp_orders", 5000, 500);
    }
    if (target === "all" || target === "customers") {
      await batchDelete("cdp_customers", 5000, 200);
    }
    if (target === "all" || target === "family_codes") {
      await batchDelete("inv_family_codes", 2000, 100);
    }
    if (target === "all" || target === "connector") {
      const { error } = await supabase.from("connector_integrations").delete().eq("tenant_id", tenantId);
      results.push(`connector_integrations: ${error ? error.message : "ok ✅"}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
