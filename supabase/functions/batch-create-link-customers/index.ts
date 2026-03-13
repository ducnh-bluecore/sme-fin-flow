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
    const { 
      mode = "both",           // "create" | "link" | "both"
      batch_size = 500, 
      link_batch_size = 5000,
      max_iterations = 50,
      start_offset = 0 
    } = body;

    const startMs = Date.now();
    let totalCreated = 0;
    let totalLinked = 0;
    const rounds: Array<{ phase: string; count: number; ms: number }> = [];

    // Phase 1: Create customers
    if (mode === "create" || mode === "both") {
      let offset = start_offset;
      for (let i = 0; i < max_iterations; i++) {
        if (Date.now() - startMs > 50000) break;

        const roundStart = Date.now();
        const { data, error } = await supabase.rpc("batch_create_customers_v2", {
          p_batch_size: batch_size,
          p_offset: offset,
        });

        if (error) {
          console.error(`[Create ${i + 1}] Error:`, error.message);
          rounds.push({ phase: "create", count: -1, ms: Date.now() - roundStart });
          break;
        }

        const created = (data as any).created ?? 0;
        totalCreated += created;
        rounds.push({ phase: "create", count: created, ms: Date.now() - roundStart });
        console.log(`[Create ${i + 1}] offset=${offset} created=${created}`);

        offset += batch_size;
        // If we got 0 created for 3 consecutive batches, likely done
        if (created === 0 && i > 2) break;
      }
    }

    // Phase 2: Link orders
    if (mode === "link" || mode === "both") {
      for (let i = 0; i < max_iterations; i++) {
        if (Date.now() - startMs > 50000) break;

        const roundStart = Date.now();
        const { data, error } = await supabase.rpc("batch_link_orders_v2", {
          p_batch_size: link_batch_size,
        });

        if (error) {
          console.error(`[Link ${i + 1}] Error:`, error.message);
          rounds.push({ phase: "link", count: -1, ms: Date.now() - roundStart });
          break;
        }

        const linked = (data as any).linked ?? 0;
        totalLinked += linked;
        rounds.push({ phase: "link", count: linked, ms: Date.now() - roundStart });
        console.log(`[Link ${i + 1}] linked=${linked}`);

        if (linked === 0) break;
      }
    }

    const response = {
      success: true,
      total_created: totalCreated,
      total_linked: totalLinked,
      rounds_count: rounds.length,
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
