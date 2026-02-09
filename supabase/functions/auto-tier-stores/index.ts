import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id from body or auth
    let tenantId: string | null = null;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      tenantId = body.tenant_id || null;
    }

    // If called from cron (no tenant_id), run for all active tenants
    if (!tenantId) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id")
        .eq("is_active", true);

      const results = [];
      for (const t of tenants || []) {
        const { data, error } = await supabase.rpc("fn_auto_tier_stores", {
          p_tenant_id: t.id,
        });
        if (error) {
          results.push({ tenant: t.id, error: error.message });
        } else {
          // Log tier changes
          if (data && data.length > 0) {
            const historyRows = data.map((r: any) => ({
              tenant_id: t.id,
              store_id: r.store_id,
              old_tier: r.old_tier,
              new_tier: r.new_tier,
              total_sold: r.total_sold,
              avg_velocity: r.avg_velocity,
              rank_pct: r.rank_pct,
            }));
            await supabase.from("inv_tier_history").insert(historyRows);
          }
          results.push({
            tenant: t.id,
            updated: data?.length || 0,
            changes: data?.filter((r: any) => r.old_tier !== r.new_tier).length || 0,
          });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single tenant call
    const { data, error } = await supabase.rpc("fn_auto_tier_stores", {
      p_tenant_id: tenantId,
    });

    if (error) throw error;

    // Log tier changes
    if (data && data.length > 0) {
      const historyRows = data.map((r: any) => ({
        tenant_id: tenantId,
        store_id: r.store_id,
        old_tier: r.old_tier,
        new_tier: r.new_tier,
        total_sold: r.total_sold,
        avg_velocity: r.avg_velocity,
        rank_pct: r.rank_pct,
      }));
      await supabase.from("inv_tier_history").insert(historyRows);
    }

    const changes = data?.filter((r: any) => r.old_tier !== r.new_tier) || [];

    return new Response(
      JSON.stringify({
        total_stores: data?.length || 0,
        tier_changes: changes.length,
        details: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
