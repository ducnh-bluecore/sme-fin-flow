import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
    const { tenant_id, run_id, user_id } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    console.log(`[Packager] tenant=${tenant_id} run_id=${run_id || 'latest'}`);

    // ── Fetch allocation recs (pending) ──
    let recsQuery = supabase
      .from("inv_allocation_recommendations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("status", "pending");
    
    if (run_id) recsQuery = recsQuery.eq("run_id", run_id);
    
    const { data: recs, error: recsErr } = await recsQuery.limit(1000);
    if (recsErr) throw recsErr;

    // ── Fetch rebalance suggestions (pending) ──
    const { data: rebalRecs, error: rebalErr } = await supabase
      .from("inv_rebalance_suggestions")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("status", "pending")
      .limit(1000);
    if (rebalErr) throw rebalErr;

    console.log(`[Packager] allocation recs: ${(recs || []).length}, rebalance: ${(rebalRecs || []).length}`);

    const packages: any[] = [];

    // ── Package 1: Allocation Push ──
    if (recs && recs.length > 0) {
      // Group by stage (V1/V2)
      const byStage = new Map<string, any[]>();
      for (const r of recs) {
        const stage = r.stage || "V1";
        if (!byStage.has(stage)) byStage.set(stage, []);
        byStage.get(stage)!.push(r);
      }

      for (const [stage, items] of byStage) {
        const totalUnits = items.reduce((s: number, r: any) => s + (r.recommended_qty || 0), 0);
        const totalRevenue = items.reduce((s: number, r: any) => s + (r.potential_revenue || 0), 0);
        const uniqueStores = new Set(items.map((r: any) => r.store_id)).size;
        const uniqueFCs = new Set(items.map((r: any) => r.fc_id)).size;
        const p1Count = items.filter((r: any) => r.priority === "P1").length;

        const riskLevel = p1Count > items.length * 0.3 ? "HIGH" : p1Count > 0 ? "MEDIUM" : "LOW";
        const confidence = Math.min(0.95, 0.7 + (items.length > 10 ? 0.1 : 0) + (p1Count < items.length * 0.1 ? 0.1 : 0));

        const pkg = {
          tenant_id,
          as_of_date: today,
          package_type: `ALLOCATION_${stage}`,
          scope_summary: {
            description: `${stage} Push Allocation: ${totalUnits.toLocaleString()} units to ${uniqueStores} stores`,
            units: totalUnits,
            skus: uniqueFCs,
            stores: uniqueStores,
            p1_count: p1Count,
          },
          impact_summary: {
            revenue_protected: totalRevenue,
            units_moved: totalUnits,
          },
          risk_level: riskLevel,
          confidence,
          status: "PROPOSED",
          created_by: user_id || null,
        };

        const { data: pkgData, error: pkgErr } = await supabase
          .from("dec_decision_packages")
          .insert(pkg)
          .select()
          .single();
        
        if (pkgErr) { console.error(`[Packager] pkg insert error:`, pkgErr.message); continue; }

        // Insert lines
        const lines = items.map((r: any) => ({
          tenant_id,
          package_id: pkgData.id,
          sku_id: r.sku || null,
          fc_id: r.fc_id,
          from_location_id: null, // CW
          to_location_id: r.store_id,
          qty_suggested: r.recommended_qty,
          reason_code: r.priority || "V1",
          line_impact: {
            potential_revenue: r.potential_revenue,
            current_cover: r.current_weeks_cover,
            projected_cover: r.projected_weeks_cover,
          },
        }));

        for (let i = 0; i < lines.length; i += 500) {
          const { error } = await supabase.from("dec_decision_package_lines").insert(lines.slice(i, i + 500));
          if (error) console.error(`[Packager] lines insert error:`, error.message);
        }

        packages.push({ id: pkgData.id, type: pkg.package_type, lines: lines.length });
      }
    }

    // ── Package 2: Rebalance Lateral ──
    if (rebalRecs && rebalRecs.length > 0) {
      const totalUnits = rebalRecs.reduce((s: number, r: any) => s + (r.suggested_qty || 0), 0);
      const totalBenefit = rebalRecs.reduce((s: number, r: any) => s + (r.net_benefit || 0), 0);
      const uniqueStores = new Set([
        ...rebalRecs.map((r: any) => r.from_store_id),
        ...rebalRecs.map((r: any) => r.to_store_id),
      ]).size;

      const pkg = {
        tenant_id,
        as_of_date: today,
        package_type: "REBALANCE",
        scope_summary: {
          description: `Lateral Rebalance: ${totalUnits.toLocaleString()} units across ${uniqueStores} stores`,
          units: totalUnits,
          skus: new Set(rebalRecs.map((r: any) => r.fc_id)).size,
          stores: uniqueStores,
        },
        impact_summary: {
          revenue_protected: totalBenefit,
          units_moved: totalUnits,
        },
        risk_level: "MEDIUM",
        confidence: 0.8,
        status: "PROPOSED",
        created_by: user_id || null,
      };

      const { data: pkgData, error: pkgErr } = await supabase
        .from("dec_decision_packages")
        .insert(pkg)
        .select()
        .single();

      if (!pkgErr && pkgData) {
        const lines = rebalRecs.map((r: any) => ({
          tenant_id,
          package_id: pkgData.id,
          sku_id: null,
          fc_id: r.fc_id,
          from_location_id: r.from_store_id,
          to_location_id: r.to_store_id,
          qty_suggested: r.suggested_qty,
          reason_code: "REBALANCE",
          line_impact: {
            net_benefit: r.net_benefit,
            logistics_cost: r.logistics_cost,
          },
        }));

        for (let i = 0; i < lines.length; i += 500) {
          const { error } = await supabase.from("dec_decision_package_lines").insert(lines.slice(i, i + 500));
          if (error) console.error(`[Packager] rebal lines error:`, error.message);
        }

        packages.push({ id: pkgData.id, type: "REBALANCE", lines: lines.length });
      }
    }

    const result = {
      success: true,
      packages_created: packages.length,
      packages,
    };

    console.log(`[Packager] Done:`, JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Packager] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
