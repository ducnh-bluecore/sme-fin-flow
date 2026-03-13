
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
  const batchSize = 20000;
  const results: string[] = [];

  try {
    // Delete cdp_orders in batches
    let totalOrders = 0;
    while (true) {
      const { error } = await supabase.from("cdp_orders")
        .delete()
        .eq("tenant_id", tenantId)
        .limit(batchSize);
      
      if (error) {
        results.push(`cdp_orders error: ${error.message}`);
        break;
      }

      const { count } = await supabase.from("cdp_orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      
      totalOrders += batchSize;
      results.push(`cdp_orders batch, remaining: ${count}`);
      
      if (!count || count === 0) break;
      if (totalOrders > 2000000) break;
    }

    // Delete cdp_customers in batches
    while (true) {
      const { error } = await supabase.from("cdp_customers")
        .delete()
        .eq("tenant_id", tenantId)
        .limit(batchSize);
      
      if (error) {
        results.push(`cdp_customers error: ${error.message}`);
        break;
      }

      const { count } = await supabase.from("cdp_customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      
      results.push(`cdp_customers batch, remaining: ${count}`);
      if (!count || count === 0) break;
    }

    // Remaining tables
    const tables = [
      "kpi_facts_daily", "kpi_targets", "central_metric_facts",
      "products", "inv_family_codes",
      "bigquery_backfill_jobs", "bigquery_sync_watermarks", 
      "bigquery_data_models", "bigquery_tenant_sources", "bigquery_configs",
      "connector_integrations", "tenant_ltv_config",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table as any)
        .delete()
        .eq("tenant_id", tenantId);
      results.push(`${table}: ${error ? error.message : "ok"}`);
    }

    // Tenant users & tenant
    await supabase.from("tenant_users").delete().eq("tenant_id", tenantId);
    results.push("tenant_users: ok");

    await supabase.from("tenants").delete().eq("id", tenantId);
    results.push("tenants: ok");

    // Clean profiles
    await supabase.from("profiles").update({ active_tenant_id: null } as any).eq("active_tenant_id", tenantId);
    results.push("profiles cleaned");

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
