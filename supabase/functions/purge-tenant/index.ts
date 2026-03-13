
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
    { db: { schema: "public" }, global: { headers: { "x-supabase-db-timeout": "120s" } } }
  );

  const tenantId = "364a23ad-66f5-44d6-8da9-74c7ff333dcc";
  const results: string[] = [];

  try {
    // Use raw SQL via rpc for large deletes in batches
    const batchSize = 5000;
    
    // Delete cdp_orders in small batches
    for (let i = 0; i < 300; i++) { // max 300 iterations = 1.5M rows
      const { data, error } = await supabase.rpc("exec_sql_admin" as any, {
        sql_query: `DELETE FROM cdp_orders WHERE id IN (SELECT id FROM cdp_orders WHERE tenant_id = '${tenantId}' LIMIT ${batchSize})`
      });
      
      // Fallback: direct delete with small limit
      if (error) {
        const { error: e2, count } = await supabase.from("cdp_orders")
          .delete({ count: "exact" })
          .eq("tenant_id", tenantId)
          .limit(batchSize);
        
        if (e2) {
          results.push(`cdp_orders iteration ${i} error: ${e2.message}`);
          break;
        }
        if (count === 0) { results.push(`cdp_orders done after ${i} batches`); break; }
        if (i % 20 === 0) results.push(`cdp_orders batch ${i}, deleted ${count}`);
      }
    }

    // Delete cdp_customers in small batches
    for (let i = 0; i < 100; i++) {
      const { error, count } = await supabase.from("cdp_customers")
        .delete({ count: "exact" })
        .eq("tenant_id", tenantId)
        .limit(batchSize);
      
      if (error) { results.push(`cdp_customers error: ${error.message}`); break; }
      if (count === 0) { results.push(`cdp_customers done after ${i} batches`); break; }
      if (i % 20 === 0) results.push(`cdp_customers batch ${i}, deleted ${count}`);
    }

    // Cleanup remaining
    await supabase.from("inv_sku_fc_mapping" as any).delete().eq("tenant_id", tenantId);
    const { error: fcErr } = await supabase.from("inv_family_codes").delete().eq("tenant_id", tenantId);
    results.push(`inv_family_codes: ${fcErr ? fcErr.message : "ok"}`);

    const { error: ciErr } = await supabase.from("connector_integrations").delete().eq("tenant_id", tenantId);
    results.push(`connector_integrations: ${ciErr ? ciErr.message : "ok"}`);

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
