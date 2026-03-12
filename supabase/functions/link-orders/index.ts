import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { tenant_id, batch_size = 5000, max_iterations = 10 } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startMs = Date.now();
    let totalLinked = 0;
    const errors: string[] = [];

    for (let i = 0; i < max_iterations; i++) {
      if (Date.now() - startMs > 50000) {
        console.log(`[Link Orders] Time limit at iteration ${i}`);
        break;
      }

      const { data: linked, error } = await supabase.rpc("link_orders_batch", {
        p_tenant_id: tenant_id,
        p_batch_size: batch_size,
      });

      if (error) {
        console.error(`[Link Orders] Batch ${i + 1} error:`, error.message);
        errors.push(error.message);
        break;
      }

      totalLinked += linked || 0;
      console.log(`[Link Orders] Batch ${i + 1}: linked ${linked} (total: ${totalLinked})`);

      if (!linked || linked === 0) break;
    }

    const result = {
      success: errors.length === 0,
      total_linked: totalLinked,
      duration_ms: Date.now() - startMs,
      errors: errors.length > 0 ? errors : undefined,
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
