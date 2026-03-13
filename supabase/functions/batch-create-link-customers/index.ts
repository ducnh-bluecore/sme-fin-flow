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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { batch_size = 2000, max_iterations = 10 } = body;

    const startMs = Date.now();
    let totalCreated = 0;
    let totalLinked = 0;
    const rounds: Array<{ created: number; linked: number; ms: number }> = [];

    for (let i = 0; i < max_iterations; i++) {
      if (Date.now() - startMs > 50000) break; // 50s safety

      const roundStart = Date.now();
      const { data, error } = await supabase.rpc(
        "batch_create_and_link_customers",
        { p_batch_size: batch_size }
      );

      if (error) {
        console.error(`[Batch ${i + 1}] Error:`, error.message);
        rounds.push({ created: -1, linked: -1, ms: Date.now() - roundStart });
        break;
      }

      const result = data as { created: number; linked: number };
      totalCreated += result.created;
      totalLinked += result.linked;
      rounds.push({
        created: result.created,
        linked: result.linked,
        ms: Date.now() - roundStart,
      });

      console.log(
        `[Batch ${i + 1}] Created: ${result.created}, Linked: ${result.linked}`
      );

      // Stop if no more work
      if (result.created === 0 && result.linked === 0) break;
    }

    const response = {
      success: true,
      total_created: totalCreated,
      total_linked: totalLinked,
      rounds,
      duration_ms: Date.now() - startMs,
    };

    console.log("[BatchCreateLink] Done:", JSON.stringify(response));
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[BatchCreateLink] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
