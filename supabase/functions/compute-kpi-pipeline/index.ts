import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getMonthChunks(start: string, end: string): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  let current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + 13); // 14-day chunks
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

    chunks.push({
      start: current.toISOString().split("T")[0],
      end: chunkEnd.toISOString().split("T")[0],
    });

    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { tenant_id, start_date, end_date, skip_alerts = false } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveStart = start_date || addDays(new Date().toISOString().split("T")[0], -7);
    const effectiveEnd = end_date || new Date().toISOString().split("T")[0];

    const startMs = Date.now();
    console.log(`[KPI Pipeline] tenant=${tenant_id} range=${effectiveStart}..${effectiveEnd}`);

    // Step 0: Link orders to customers in batches
    const { link_customers = false } = body;
    let totalLinked = 0;
    if (link_customers) {
      console.log(`[KPI Pipeline] Linking orders to customers in batches...`);
      for (let i = 0; i < 50; i++) {
        const { data: linked, error: linkError } = await supabase.rpc("link_orders_batch", {
          p_tenant_id: tenant_id,
          p_batch_size: 10000,
        });
        if (linkError) {
          console.error(`[KPI Pipeline] Link batch error:`, linkError.message);
          break;
        }
        totalLinked += (linked || 0);
        console.log(`[KPI Pipeline] Batch ${i+1}: linked ${linked} (total: ${totalLinked})`);
        if (!linked || linked === 0) break;
        if (Date.now() - startMs > 50000) { console.log(`[KPI Pipeline] Time limit, pausing link`); break; }
      }
      console.log(`[KPI Pipeline] Total linked: ${totalLinked}`);
    }

    // Step 1: Chunk into 14-day windows to avoid statement timeout
    const chunks = getMonthChunks(effectiveStart, effectiveEnd);
    let totalUpserted = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      console.log(`[KPI Pipeline] Processing chunk ${chunk.start}..${chunk.end}`);
      const { data, error } = await supabase.rpc("compute_kpi_facts_daily", {
        p_tenant_id: tenant_id,
        p_start_date: chunk.start,
        p_end_date: chunk.end,
      });

      if (error) {
        console.error(`[KPI Pipeline] Chunk ${chunk.start} error:`, error.message);
        errors.push(`${chunk.start}: ${error.message}`);
      } else if (data) {
        totalUpserted += (data as any).kpi_facts_upserted || 0;
        console.log(`[KPI Pipeline] Chunk done: ${JSON.stringify(data)}`);
      }
    }

    // Step 2: CDP Daily Build (metrics + equity)
    let cdpResult = null;
    const { skip_cdp = false } = body;
    if (!skip_cdp) {
      console.log(`[KPI Pipeline] Running CDP daily build for ${effectiveEnd}...`);
      const { data, error } = await supabase.rpc("cdp_run_daily_build", {
        p_tenant_id: tenant_id,
        p_as_of_date: effectiveEnd,
      });
      if (error) {
        console.error(`[KPI Pipeline] CDP build error:`, error.message);
        cdpResult = { error: error.message };
      } else {
        cdpResult = data;
        console.log(`[KPI Pipeline] CDP build done:`, JSON.stringify(data));
      }
    }

    // Step 3: Detect alerts
    let alertResult = null;
    if (!skip_alerts) {
      const { data, error } = await supabase.rpc("detect_threshold_breaches", {
        p_tenant_id: tenant_id,
        p_date: effectiveEnd,
      });
      alertResult = error ? { error: error.message } : data;
    }

    // Summary
    const { count: kpiCount } = await supabase
      .from("kpi_facts_daily")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant_id);

    const { count: alertCount } = await supabase
      .from("alert_instances")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant_id)
      .eq("status", "open");

    const result = {
      success: errors.length === 0,
      chunks_processed: chunks.length,
      total_upserted: totalUpserted,
      errors: errors.length > 0 ? errors : undefined,
      cdp_build: cdpResult,
      alert_detection: alertResult,
      summary: { total_kpi_facts: kpiCount, open_alerts: alertCount },
    };

    console.log("[KPI Pipeline] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[KPI Pipeline] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
