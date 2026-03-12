import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PASSES = [
  "link_orders_pass_phone",
  "link_orders_pass_canonical",
  "link_orders_pass_haravan_phone",
  "link_orders_pass_name",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { tenant_id, batch_size = 5000, max_iterations = 5, pass } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startMs = Date.now();
    const passesToRun = pass ? [pass] : PASSES;
    const results: Record<string, number> = {};
    let totalLinked = 0;

    for (const passName of passesToRun) {
      if (Date.now() - startMs > 50000) break;
      
      let passTotal = 0;
      for (let i = 0; i < max_iterations; i++) {
        if (Date.now() - startMs > 50000) break;

        const { data: linked, error } = await supabase.rpc(passName, {
          p_tenant_id: tenant_id,
          p_batch_size: batch_size,
        });

        if (error) {
          console.error(`[Link] ${passName} batch ${i+1} error:`, error.message);
          results[passName + "_error"] = -1;
          break;
        }

        passTotal += linked || 0;
        console.log(`[Link] ${passName} batch ${i+1}: ${linked} (pass total: ${passTotal})`);
        if (!linked || linked === 0) break;
      }
      results[passName] = passTotal;
      totalLinked += passTotal;
    }

    const result = {
      success: true,
      total_linked: totalLinked,
      passes: results,
      duration_ms: Date.now() - startMs,
    };

    console.log(`[Link Orders] Done:`, JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Link Orders] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
