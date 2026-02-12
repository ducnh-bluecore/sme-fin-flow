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
    const { tenant_id, as_of_date } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = as_of_date || new Date().toISOString().split("T")[0];
    console.log(`[KPI Engine] tenant=${tenant_id} date=${today}`);

    // ── Fetch data ──
    const [posResult, demandResult, fcMappingResult, storesResult] = await Promise.all([
      fetchAll(supabase, "inv_state_positions", "id,store_id,fc_id,sku,on_hand,reserved,in_transit,safety_stock,weeks_of_cover", tenant_id),
      fetchAll(supabase, "inv_state_demand", "store_id,fc_id,avg_daily_sales,sales_velocity", tenant_id),
      fetchAll(supabase, "inv_sku_fc_mapping", "fc_id,sku,size", tenant_id),
      fetchAll(supabase, "inv_stores", "id,store_name,store_code,tier,region,location_type,is_active", tenant_id),
    ]);

    const positions = posResult;
    const demand = demandResult;
    const skuMapping = fcMappingResult;
    const stores = storesResult.filter((s: any) => s.is_active);
    const retailStores = stores.filter((s: any) => s.location_type !== "central_warehouse");

    console.log(`[KPI Engine] positions=${positions.length} demand=${demand.length} skuMapping=${skuMapping.length} stores=${stores.length}`);

    // ── 1. Compute IDI (Inventory Distortion Index) per FC ──
    const idiResults = computeIDI(tenant_id, today, positions, demand, retailStores);
    console.log(`[KPI Engine] IDI computed: ${idiResults.length} FCs`);

    // ── 2. Compute SCS (Size Completeness Score) per style-store ──
    const scsResults = computeSCS(tenant_id, today, positions, skuMapping, retailStores);
    console.log(`[KPI Engine] SCS computed: ${scsResults.length} style-store pairs`);

    // ── 3. Compute CHI (Curve Health Index) per style ──
    const chiResults = computeCHI(tenant_id, today, scsResults);
    console.log(`[KPI Engine] CHI computed: ${chiResults.length} styles`);

    // ── 4. Compute Network Gap per style ──
    const gapResults = computeNetworkGap(tenant_id, today, positions, demand, skuMapping, retailStores);
    console.log(`[KPI Engine] Network Gap computed: ${gapResults.length} styles`);

    // ── Upsert results ──
    const results = { idi: 0, scs: 0, chi: 0, gap: 0, errors: [] as string[] };

    // Delete old data for today first, then insert
    if (idiResults.length > 0) {
      await supabase.from("kpi_inventory_distortion").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < idiResults.length; i += 500) {
        const { error } = await supabase.from("kpi_inventory_distortion").insert(idiResults.slice(i, i + 500));
        if (error) results.errors.push(`IDI: ${error.message}`);
        else results.idi += Math.min(500, idiResults.length - i);
      }
    }

    if (scsResults.length > 0) {
      await supabase.from("kpi_size_completeness").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < scsResults.length; i += 500) {
        const { error } = await supabase.from("kpi_size_completeness").insert(scsResults.slice(i, i + 500));
        if (error) results.errors.push(`SCS: ${error.message}`);
        else results.scs += Math.min(500, scsResults.length - i);
      }
    }

    if (chiResults.length > 0) {
      await supabase.from("kpi_curve_health").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < chiResults.length; i += 500) {
        const { error } = await supabase.from("kpi_curve_health").insert(chiResults.slice(i, i + 500));
        if (error) results.errors.push(`CHI: ${error.message}`);
        else results.chi += Math.min(500, chiResults.length - i);
      }
    }

    if (gapResults.length > 0) {
      await supabase.from("kpi_network_gap").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < gapResults.length; i += 500) {
        const { error } = await supabase.from("kpi_network_gap").insert(gapResults.slice(i, i + 500));
        if (error) results.errors.push(`GAP: ${error.message}`);
        else results.gap += Math.min(500, gapResults.length - i);
      }
    }

    const summary = {
      success: results.errors.length === 0,
      date: today,
      idi_rows: results.idi,
      scs_rows: results.scs,
      chi_rows: results.chi,
      gap_rows: results.gap,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };

    console.log(`[KPI Engine] Done:`, JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[KPI Engine] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──

async function fetchAll(supabase: any, table: string, cols: string, tenantId: string) {
  const PAGE = 1000;
  let all: any[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.from(table).select(cols).eq("tenant_id", tenantId).range(offset, offset + PAGE - 1);
    if (error) { console.error(`fetchAll ${table}:`, error.message); break; }
    all = all.concat(data || []);
    hasMore = (data || []).length === PAGE;
    offset += PAGE;
  }
  return all;
}

// ── IDI: stddev of DOC across stores per FC ──
function computeIDI(tenantId: string, date: string, positions: any[], demand: any[], retailStores: any[]) {
  const demandMap = new Map<string, number>();
  for (const d of demand) {
    demandMap.set(`${d.store_id}:${d.fc_id}`, d.avg_daily_sales || 0);
  }

  const retailIds = new Set(retailStores.map((s: any) => s.id));

  // Group positions by FC (retail only)
  const fcStoreStock = new Map<string, { storeId: string; onHand: number; velocity: number }[]>();
  for (const p of positions) {
    if (!retailIds.has(p.store_id)) continue;
    const key = p.fc_id;
    if (!fcStoreStock.has(key)) fcStoreStock.set(key, []);
    const vel = demandMap.get(`${p.store_id}:${p.fc_id}`) || 0;
    fcStoreStock.get(key)!.push({ storeId: p.store_id, onHand: p.on_hand || 0, velocity: vel });
  }

  const results: any[] = [];
  for (const [fcId, entries] of fcStoreStock) {
    if (entries.length < 2) continue;

    // DOC per store
    const docs = entries.map(e => e.velocity > 0 ? e.onHand / e.velocity : (e.onHand > 0 ? 999 : 0));
    const mean = docs.reduce((s, v) => s + v, 0) / docs.length;
    const variance = docs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / docs.length;
    const stddev = Math.sqrt(variance);

    const overstock = entries.filter((e, i) => docs[i] > mean * 1.5).map(e => e.storeId);
    const understock = entries.filter((e, i) => docs[i] < mean * 0.5 && docs[i] < 14).map(e => e.storeId);

    const lockedCash = entries
      .filter((e, i) => docs[i] > mean * 1.5)
      .reduce((s, e) => s + e.onHand * 250000, 0); // avg unit cost estimate

    results.push({
      tenant_id: tenantId,
      as_of_date: date,
      fc_id: fcId,
      distortion_score: Math.round(stddev * 100) / 100,
      overstock_locations: overstock,
      understock_locations: understock,
      locked_cash_estimate: lockedCash,
    });
  }

  return results;
}

// ── SCS: Size Completeness per style-store ──
function computeSCS(tenantId: string, date: string, positions: any[], skuMapping: any[], retailStores: any[]) {
  const retailIds = new Set(retailStores.map((s: any) => s.id));

  // Build fc_id (as style) → expected sizes
  const styleSizes = new Map<string, Set<string>>();
  const skuToStyle = new Map<string, { styleId: string; sizeCode: string }>();
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!styleSizes.has(m.fc_id)) styleSizes.set(m.fc_id, new Set());
    styleSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) skuToStyle.set(m.sku, { styleId: m.fc_id, sizeCode: m.size });
  }

  // Group positions by store-style and track which sizes have stock
  const storeStyleSizes = new Map<string, Set<string>>();
  for (const p of positions) {
    if (!retailIds.has(p.store_id)) continue;
    if ((p.on_hand || 0) <= 0) continue;

    let styleId: string | undefined;
    let sizeCode: string | undefined;

    if (p.sku && skuToStyle.has(p.sku)) {
      const info = skuToStyle.get(p.sku)!;
      styleId = info.styleId;
      sizeCode = info.sizeCode;
    } else if (p.fc_id) {
      // Use fc_id directly as style — but we need a size match
      styleId = p.fc_id;
      // Try to find size from sku mapping for this fc_id
      const sizes = styleSizes.get(p.fc_id);
      if (sizes && sizes.size === 1) sizeCode = [...sizes][0];
    }

    if (!styleId || !sizeCode) continue;

    const key = `${p.store_id}:${styleId}`;
    if (!storeStyleSizes.has(key)) storeStyleSizes.set(key, new Set());
    storeStyleSizes.get(key)!.add(sizeCode);
  }

  const results: any[] = [];
  for (const [key, presentSizes] of storeStyleSizes) {
    const [storeId, styleId] = key.split(":");
    const totalSizes = styleSizes.get(styleId);
    if (!totalSizes || totalSizes.size === 0) continue;

    const scs = presentSizes.size / totalSizes.size;
    const missing = [...totalSizes].filter(s => !presentSizes.has(s));

    let status = "HEALTHY";
    if (scs < 0.3) status = "BROKEN";
    else if (scs < 0.5) status = "AT_RISK";

    results.push({
      tenant_id: tenantId,
      as_of_date: date,
      store_id: storeId,
      style_id: styleId,
      sizes_present: presentSizes.size,
      sizes_total: totalSizes.size,
      size_completeness_score: Math.round(scs * 10000) / 10000,
      missing_sizes: missing,
      status,
    });
  }

  return results;
}

// ── CHI: Curve Health Index per style (weighted SCS across network) ──
function computeCHI(tenantId: string, date: string, scsResults: any[]) {
  // Group SCS by style
  const styleScores = new Map<string, number[]>();
  for (const scs of scsResults) {
    if (!styleScores.has(scs.style_id)) styleScores.set(scs.style_id, []);
    styleScores.get(scs.style_id)!.push(scs.size_completeness_score || 0);
  }

  const results: any[] = [];
  for (const [styleId, scores] of styleScores) {
    if (scores.length === 0) continue;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;

    let riskBand = "LOW";
    if (avg < 0.3) riskBand = "CRITICAL";
    else if (avg < 0.5) riskBand = "HIGH";
    else if (avg < 0.7) riskBand = "MEDIUM";

    results.push({
      tenant_id: tenantId,
      as_of_date: date,
      style_id: styleId,
      curve_health_index: Math.round(avg * 10000) / 10000,
      markdown_risk_band: riskBand,
    });
  }

  return results;
}

// ── Network Gap: demand - available stock per FC (style) ──
function computeNetworkGap(tenantId: string, date: string, positions: any[], demand: any[], skuMapping: any[], retailStores: any[]) {
  const retailIds = new Set(retailStores.map((s: any) => s.id));

  // Use fc_id directly as style unit
  const validFcIds = new Set(skuMapping.map((m: any) => m.fc_id).filter(Boolean));

  // Aggregate stock by fc_id (all locations)
  const styleStock = new Map<string, number>();
  for (const p of positions) {
    if (!p.fc_id) continue;
    styleStock.set(p.fc_id, (styleStock.get(p.fc_id) || 0) + (p.on_hand || 0));
  }

  // Aggregate demand by fc_id (retail only, 28-day projection)
  const styleDemand = new Map<string, number>();
  for (const d of demand) {
    if (!retailIds.has(d.store_id)) continue;
    if (!d.fc_id) continue;
    styleDemand.set(d.fc_id, (styleDemand.get(d.fc_id) || 0) + (d.avg_daily_sales || 0) * 28);
  }

  const results: any[] = [];
  const allStyles = new Set([...styleStock.keys(), ...styleDemand.keys()]);

  for (const styleId of allStyles) {
    const totalStock = styleStock.get(styleId) || 0;
    const totalDemand28d = styleDemand.get(styleId) || 0;
    if (totalDemand28d <= 0 && totalStock <= 0) continue;

    const reallocatable = Math.floor(totalStock * 0.7);
    const trueShortage = Math.max(0, Math.ceil(totalDemand28d) - totalStock);
    const netGap = Math.max(0, Math.ceil(totalDemand28d) - reallocatable);
    const revenueAtRisk = trueShortage * 250000;

    if (trueShortage <= 0 && netGap <= 0) continue;

    results.push({
      tenant_id: tenantId,
      as_of_date: date,
      style_id: styleId,
      reallocatable_units: reallocatable,
      true_shortage_units: trueShortage,
      net_gap_units: netGap,
      revenue_at_risk: revenueAtRisk,
    });
  }

  return results;
}
