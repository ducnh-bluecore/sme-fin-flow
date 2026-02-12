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
    const [posResult, demandResult, fcMappingResult, storesResult, avgPriceResult, curveProfileResult] = await Promise.all([
      fetchAll(supabase, "inv_state_positions", "id,store_id,fc_id,sku,on_hand,reserved,in_transit,safety_stock,weeks_of_cover", tenant_id),
      fetchAll(supabase, "inv_state_demand", "store_id,fc_id,avg_daily_sales,sales_velocity", tenant_id),
      fetchAll(supabase, "inv_sku_fc_mapping", "fc_id,sku,size", tenant_id),
      fetchAll(supabase, "inv_stores", "id,store_name,store_code,tier,region,location_type,is_active", tenant_id),
      fetchAll(supabase, "v_inv_avg_unit_price", "sku,avg_unit_price", tenant_id),
      fetchAll(supabase, "sem_size_curve_profiles", "id,category_id,size_ratios,is_current", tenant_id),
    ]);

    const positions = posResult;
    const demand = demandResult;
    const skuMapping = fcMappingResult;
    const stores = storesResult.filter((s: any) => s.is_active);
    const retailStores = stores.filter((s: any) => s.location_type !== "central_warehouse");

    // Build price map: sku -> avg_unit_price
    const priceMap = new Map<string, number>();
    for (const p of avgPriceResult) {
      if (p.sku && p.avg_unit_price > 0) priceMap.set(p.sku, Number(p.avg_unit_price));
    }

    // Build curve profiles (if any)
    const curveProfiles = curveProfileResult.filter((cp: any) => cp.is_current && cp.size_ratios);

    console.log(`[KPI Engine] positions=${positions.length} demand=${demand.length} skuMapping=${skuMapping.length} stores=${stores.length} prices=${priceMap.size} curveProfiles=${curveProfiles.length}`);

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

    // ── 5. SIZE INTELLIGENCE: Size Health Score ──
    const sizeHealthResults = computeSizeHealth(tenant_id, today, positions, skuMapping, retailStores, curveProfiles);
    console.log(`[KPI Engine] Size Health computed: ${sizeHealthResults.length}`);

    // ── 6. SIZE INTELLIGENCE: Lost Revenue Estimation ──
    const lostRevenueResults = computeLostRevenue(tenant_id, today, positions, demand, skuMapping, priceMap);
    console.log(`[KPI Engine] Lost Revenue computed: ${lostRevenueResults.length}`);

    // ── 7. SIZE INTELLIGENCE: Markdown Risk ──
    const markdownRiskResults = computeMarkdownRisk(tenant_id, today, sizeHealthResults, demand, positions, skuMapping);
    console.log(`[KPI Engine] Markdown Risk computed: ${markdownRiskResults.length}`);

    // ── 8. SIZE INTELLIGENCE Phase 2: Smart Transfer ──
    const sizeTransferResults = computeSizeTransfers(tenant_id, today, positions, demand, skuMapping, retailStores, priceMap);
    console.log(`[KPI Engine] Size Transfers computed: ${sizeTransferResults.length}`);

    // ── 9. SIZE INTELLIGENCE Phase 2: Per-store Size Health ──
    const storeHealthResults = computePerStoreSizeHealth(tenant_id, today, positions, skuMapping, retailStores);
    console.log(`[KPI Engine] Per-store Health computed: ${storeHealthResults.length}`);

    // ── Upsert results ──
    const results = { idi: 0, scs: 0, chi: 0, gap: 0, size_health: 0, lost_revenue: 0, markdown_risk: 0, size_transfers: 0, store_health: 0, errors: [] as string[] };

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

    // ── New: Size Intelligence tables ──
    if (sizeHealthResults.length > 0) {
      await supabase.from("state_size_health_daily").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < sizeHealthResults.length; i += 500) {
        const { error } = await supabase.from("state_size_health_daily").insert(sizeHealthResults.slice(i, i + 500));
        if (error) results.errors.push(`SizeHealth: ${error.message}`);
        else results.size_health += Math.min(500, sizeHealthResults.length - i);
      }
    }

    if (lostRevenueResults.length > 0) {
      await supabase.from("state_lost_revenue_daily").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < lostRevenueResults.length; i += 500) {
        const { error } = await supabase.from("state_lost_revenue_daily").insert(lostRevenueResults.slice(i, i + 500));
        if (error) results.errors.push(`LostRevenue: ${error.message}`);
        else results.lost_revenue += Math.min(500, lostRevenueResults.length - i);
      }
    }

    if (markdownRiskResults.length > 0) {
      await supabase.from("state_markdown_risk_daily").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < markdownRiskResults.length; i += 500) {
        const { error } = await supabase.from("state_markdown_risk_daily").insert(markdownRiskResults.slice(i, i + 500));
        if (error) results.errors.push(`MarkdownRisk: ${error.message}`);
        else results.markdown_risk += Math.min(500, markdownRiskResults.length - i);
      }
    }

    // Phase 2: Size Transfers
    if (sizeTransferResults.length > 0) {
      await supabase.from("state_size_transfer_daily").delete().eq("tenant_id", tenant_id).eq("as_of_date", today);
      for (let i = 0; i < sizeTransferResults.length; i += 500) {
        const { error } = await supabase.from("state_size_transfer_daily").insert(sizeTransferResults.slice(i, i + 500));
        if (error) results.errors.push(`SizeTransfer: ${error.message}`);
        else results.size_transfers += Math.min(500, sizeTransferResults.length - i);
      }
    }

    // Phase 2: Per-store Health (append to existing size_health table)
    if (storeHealthResults.length > 0) {
      // Delete only store-level entries (store_id IS NOT NULL) for today
      await supabase.from("state_size_health_daily").delete()
        .eq("tenant_id", tenant_id).eq("as_of_date", today).not("store_id", "is", null);
      for (let i = 0; i < storeHealthResults.length; i += 500) {
        const { error } = await supabase.from("state_size_health_daily").insert(storeHealthResults.slice(i, i + 500));
        if (error) results.errors.push(`StoreHealth: ${error.message}`);
        else results.store_health += Math.min(500, storeHealthResults.length - i);
      }
    }

    const summary = {
      success: results.errors.length === 0,
      date: today,
      idi_rows: results.idi,
      scs_rows: results.scs,
      chi_rows: results.chi,
      gap_rows: results.gap,
      size_health_rows: results.size_health,
      lost_revenue_rows: results.lost_revenue,
      markdown_risk_rows: results.markdown_risk,
      size_transfer_rows: results.size_transfers,
      store_health_rows: results.store_health,
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

    const docs = entries.map(e => e.velocity > 0 ? e.onHand / e.velocity : (e.onHand > 0 ? 999 : 0));
    const mean = docs.reduce((s, v) => s + v, 0) / docs.length;
    const variance = docs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / docs.length;
    const stddev = Math.sqrt(variance);

    const overstock = entries.filter((e, i) => docs[i] > mean * 1.5).map(e => e.storeId);
    const understock = entries.filter((e, i) => docs[i] < mean * 0.5 && docs[i] < 14).map(e => e.storeId);

    const lockedCash = entries
      .filter((e, i) => docs[i] > mean * 1.5)
      .reduce((s, e) => s + e.onHand * 250000, 0);

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

  const styleSizes = new Map<string, Set<string>>();
  const skuToStyle = new Map<string, { styleId: string; sizeCode: string }>();
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!styleSizes.has(m.fc_id)) styleSizes.set(m.fc_id, new Set());
    styleSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) skuToStyle.set(m.sku, { styleId: m.fc_id, sizeCode: m.size });
  }

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
      styleId = p.fc_id;
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

// ── CHI: Curve Health Index per style ──
function computeCHI(tenantId: string, date: string, scsResults: any[]) {
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

// ── Network Gap: demand - available stock per FC ──
function computeNetworkGap(tenantId: string, date: string, positions: any[], demand: any[], skuMapping: any[], retailStores: any[]) {
  const retailIds = new Set(retailStores.map((s: any) => s.id));
  const validFcIds = new Set(skuMapping.map((m: any) => m.fc_id).filter(Boolean));

  const styleStock = new Map<string, number>();
  for (const p of positions) {
    if (!p.fc_id) continue;
    styleStock.set(p.fc_id, (styleStock.get(p.fc_id) || 0) + (p.on_hand || 0));
  }

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

// ══════════════════════════════════════════════════════════════
// SIZE INTELLIGENCE ENGINE — Phase 1
// ══════════════════════════════════════════════════════════════

const CORE_SIZES = new Set(["M", "L"]);
const DEFAULT_UNIT_PRICE = 250000;

/**
 * Engine #1+#2: Size Health Score
 * 
 * Score = 100 - deviation_penalty - core_missing_penalty - shallow_depth_penalty
 * Maps to curve_state: >=80 healthy, >=60 watch, >=40 risk, <40 broken
 */
function computeSizeHealth(
  tenantId: string,
  date: string,
  positions: any[],
  skuMapping: any[],
  retailStores: any[],
  _curveProfiles: any[]
): any[] {
  const retailIds = new Set(retailStores.map((s: any) => s.id));

  // Build fc -> expected sizes and sku -> (fc, size) mapping
  const fcSizes = new Map<string, Set<string>>();
  const skuToFC = new Map<string, { fcId: string; size: string }>();
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!fcSizes.has(m.fc_id)) fcSizes.set(m.fc_id, new Set());
    fcSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) skuToFC.set(m.sku, { fcId: m.fc_id, size: m.size });
  }

  // Only process multi-size FCs (>=2 sizes)
  const multiSizeFCs = new Set<string>();
  for (const [fcId, sizes] of fcSizes) {
    if (sizes.size >= 2) multiSizeFCs.add(fcId);
  }

  // Aggregate on_hand per fc-size (network-wide, retail only)
  const fcSizeStock = new Map<string, Map<string, number>>();
  for (const p of positions) {
    if (!retailIds.has(p.store_id)) continue;
    if ((p.on_hand || 0) <= 0) continue;

    let fcId: string | undefined;
    let size: string | undefined;
    if (p.sku && skuToFC.has(p.sku)) {
      const info = skuToFC.get(p.sku)!;
      fcId = info.fcId;
      size = info.size;
    } else if (p.fc_id && fcSizes.has(p.fc_id)) {
      fcId = p.fc_id;
      const sizes = fcSizes.get(p.fc_id)!;
      if (sizes.size === 1) size = [...sizes][0];
    }
    if (!fcId || !size || !multiSizeFCs.has(fcId)) continue;

    if (!fcSizeStock.has(fcId)) fcSizeStock.set(fcId, new Map());
    const sizeMap = fcSizeStock.get(fcId)!;
    sizeMap.set(size, (sizeMap.get(size) || 0) + (p.on_hand || 0));
  }

  const results: any[] = [];

  for (const fcId of multiSizeFCs) {
    const expectedSizes = fcSizes.get(fcId)!;
    const actualStock = fcSizeStock.get(fcId) || new Map<string, number>();

    const totalOnHand = [...actualStock.values()].reduce((s, v) => s + v, 0);
    if (totalOnHand <= 0) continue; // No stock at all, skip

    // 1. Deviation penalty: how far actual ratio deviates from uniform expected
    const expectedRatio = 1 / expectedSizes.size;
    let deviationSum = 0;
    for (const size of expectedSizes) {
      const actualQty = actualStock.get(size) || 0;
      const actualRatio = totalOnHand > 0 ? actualQty / totalOnHand : 0;
      const deviation = Math.abs(expectedRatio - actualRatio);
      const weight = CORE_SIZES.has(size) ? 1.5 : 1.0;
      deviationSum += deviation * weight;
    }
    // Normalize: max possible deviation ~ 2, scale penalty to 0-40
    const deviationPenalty = Math.min(40, deviationSum * 20);

    // 2. Core size missing penalty
    let coreMissing = false;
    for (const cs of CORE_SIZES) {
      if (expectedSizes.has(cs) && (!actualStock.has(cs) || actualStock.get(cs)! <= 0)) {
        coreMissing = true;
        break;
      }
    }
    const corePenalty = coreMissing ? 30 : 0;

    // 3. Shallow depth penalty (sizes with depth < 2)
    let shallowCount = 0;
    for (const size of expectedSizes) {
      const qty = actualStock.get(size) || 0;
      if (qty > 0 && qty < 2) shallowCount++;
    }
    const shallowPenalty = shallowCount * 5;

    // Composite score
    const score = Math.max(0, Math.min(100, 100 - deviationPenalty - corePenalty - shallowPenalty));

    let curveState = "healthy";
    if (score < 40) curveState = "broken";
    else if (score < 60) curveState = "risk";
    else if (score < 80) curveState = "watch";

    results.push({
      tenant_id: tenantId,
      product_id: fcId,
      store_id: null, // network-wide
      as_of_date: date,
      size_health_score: Math.round(score * 100) / 100,
      curve_state: curveState,
      deviation_score: Math.round(deviationSum * 10000) / 10000,
      core_size_missing: coreMissing,
      shallow_depth_count: shallowCount,
    });
  }

  return results;
}

/**
 * Engine #3: Lost Revenue Estimation
 * 
 * For each FC with missing sizes:
 * lost_units = expected_demand_for_missing_sizes (velocity * 28 days * size_ratio)
 * lost_revenue = lost_units * avg_unit_price
 */
function computeLostRevenue(
  tenantId: string,
  date: string,
  positions: any[],
  demand: any[],
  skuMapping: any[],
  priceMap: Map<string, number>
): any[] {
  // Build fc -> sizes, sku -> (fc, size)
  const fcSizes = new Map<string, Set<string>>();
  const skuToFC = new Map<string, { fcId: string; size: string }>();
  const fcSkus = new Map<string, string[]>(); // fc -> list of skus (for price lookup)
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!fcSizes.has(m.fc_id)) fcSizes.set(m.fc_id, new Set());
    fcSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) {
      skuToFC.set(m.sku, { fcId: m.fc_id, size: m.size });
      if (!fcSkus.has(m.fc_id)) fcSkus.set(m.fc_id, []);
      fcSkus.get(m.fc_id)!.push(m.sku);
    }
  }

  // Only multi-size FCs
  const multiSizeFCs = new Set<string>();
  for (const [fcId, sizes] of fcSizes) {
    if (sizes.size >= 2) multiSizeFCs.add(fcId);
  }

  // Aggregate on_hand per fc-size (all retail stores)
  const fcSizeStock = new Map<string, Map<string, number>>();
  for (const p of positions) {
    if ((p.on_hand || 0) <= 0) continue;
    let fcId: string | undefined;
    let size: string | undefined;
    if (p.sku && skuToFC.has(p.sku)) {
      const info = skuToFC.get(p.sku)!;
      fcId = info.fcId;
      size = info.size;
    }
    if (!fcId || !size || !multiSizeFCs.has(fcId)) continue;
    if (!fcSizeStock.has(fcId)) fcSizeStock.set(fcId, new Map());
    const sizeMap = fcSizeStock.get(fcId)!;
    sizeMap.set(size, (sizeMap.get(size) || 0) + (p.on_hand || 0));
  }

  // FC-level velocity (sum across stores)
  const fcVelocity = new Map<string, number>();
  for (const d of demand) {
    if (!d.fc_id) continue;
    fcVelocity.set(d.fc_id, (fcVelocity.get(d.fc_id) || 0) + (d.avg_daily_sales || 0));
  }

  // FC avg price (avg across SKUs)
  const fcPrice = new Map<string, number>();
  for (const [fcId, skus] of fcSkus) {
    const prices = skus.map(s => priceMap.get(s)).filter(Boolean) as number[];
    if (prices.length > 0) {
      fcPrice.set(fcId, prices.reduce((s, v) => s + v, 0) / prices.length);
    }
  }

  const results: any[] = [];

  for (const fcId of multiSizeFCs) {
    const expectedSizes = fcSizes.get(fcId)!;
    const actualStock = fcSizeStock.get(fcId) || new Map<string, number>();
    const velocity = fcVelocity.get(fcId) || 0;
    if (velocity <= 0) continue;

    // Identify missing/stockout sizes
    const missingSizes: string[] = [];
    let driver = "imbalance";
    for (const size of expectedSizes) {
      if (!actualStock.has(size) || actualStock.get(size)! <= 0) {
        missingSizes.push(size);
        if (CORE_SIZES.has(size)) driver = "core_missing";
      }
    }

    // Check shallow sizes
    let shallowSizes = 0;
    for (const size of expectedSizes) {
      const qty = actualStock.get(size) || 0;
      if (qty > 0 && qty < 2) shallowSizes++;
    }
    if (shallowSizes > 0 && driver === "imbalance") driver = "shallow";

    if (missingSizes.length === 0 && shallowSizes === 0) continue;

    // Expected demand for missing sizes (uniform distribution assumption over 28d)
    const missingRatio = missingSizes.length / expectedSizes.size;
    const shallowRatio = shallowSizes / expectedSizes.size * 0.3; // 30% of shallow demand is "lost"
    const lostRatio = missingRatio + shallowRatio;

    const lostUnits = Math.ceil(velocity * 28 * lostRatio);
    const unitPrice = fcPrice.get(fcId) || DEFAULT_UNIT_PRICE;
    const lostRevenue = lostUnits * unitPrice;

    if (lostUnits <= 0) continue;

    results.push({
      tenant_id: tenantId,
      product_id: fcId,
      as_of_date: date,
      lost_units_est: lostUnits,
      lost_revenue_est: Math.round(lostRevenue),
      driver,
    });
  }

  return results;
}

/**
 * Engine #5: Markdown Risk Prediction
 * 
 * If size_health < 45 AND velocity declining AND inventory aging → high risk
 * markdown_eta_days estimated from velocity trend
 */
function computeMarkdownRisk(
  tenantId: string,
  date: string,
  sizeHealthResults: any[],
  demand: any[],
  positions: any[],
  skuMapping: any[]
): any[] {
  // FC-level velocity
  const fcVelocity = new Map<string, number>();
  for (const d of demand) {
    if (!d.fc_id) continue;
    fcVelocity.set(d.fc_id, (fcVelocity.get(d.fc_id) || 0) + (d.avg_daily_sales || 0));
  }

  // FC-level total stock
  const fcStock = new Map<string, number>();
  for (const p of positions) {
    if (!p.fc_id) continue;
    fcStock.set(p.fc_id, (fcStock.get(p.fc_id) || 0) + (p.on_hand || 0));
  }

  // FC weeks of cover (from positions avg)
  const fcWOC = new Map<string, number[]>();
  for (const p of positions) {
    if (!p.fc_id || !p.weeks_of_cover) continue;
    if (!fcWOC.has(p.fc_id)) fcWOC.set(p.fc_id, []);
    fcWOC.get(p.fc_id)!.push(p.weeks_of_cover);
  }

  const results: any[] = [];

  for (const sh of sizeHealthResults) {
    const fcId = sh.product_id;
    const healthScore = sh.size_health_score;

    const velocity = fcVelocity.get(fcId) || 0;
    const stock = fcStock.get(fcId) || 0;
    const wocArr = fcWOC.get(fcId) || [];
    const avgWOC = wocArr.length > 0 ? wocArr.reduce((s: number, v: number) => s + v, 0) / wocArr.length : 0;

    // Markdown risk factors
    let riskScore = 0;
    const reasons: string[] = [];

    // Factor 1: Size health (broken curve = high markdown risk)
    if (healthScore < 40) {
      riskScore += 40;
      reasons.push("size_break");
    } else if (healthScore < 60) {
      riskScore += 20;
      reasons.push("size_stress");
    }

    // Factor 2: High inventory age (weeks of cover > 8 = aging)
    if (avgWOC > 12) {
      riskScore += 30;
      reasons.push("high_age");
    } else if (avgWOC > 8) {
      riskScore += 15;
      reasons.push("moderate_age");
    }

    // Factor 3: Low velocity relative to stock
    if (velocity > 0 && stock > 0) {
      const daysOfSupply = stock / velocity;
      if (daysOfSupply > 90) {
        riskScore += 30;
        reasons.push("slow_velocity");
      } else if (daysOfSupply > 60) {
        riskScore += 15;
        reasons.push("declining_velocity");
      }
    } else if (stock > 0 && velocity <= 0) {
      riskScore += 30;
      reasons.push("zero_velocity");
    }

    riskScore = Math.min(100, riskScore);

    // Estimate markdown ETA
    let etaDays: number | null = null;
    if (riskScore >= 60) {
      // High risk: estimate 14-30 days
      etaDays = velocity > 0 ? Math.min(90, Math.max(7, Math.round(stock / velocity / 2))) : 30;
    } else if (riskScore >= 40) {
      etaDays = velocity > 0 ? Math.min(120, Math.round(stock / velocity)) : 60;
    }

    if (riskScore < 20) continue; // Don't store low-risk entries

    results.push({
      tenant_id: tenantId,
      product_id: fcId,
      as_of_date: date,
      markdown_risk_score: riskScore,
      markdown_eta_days: etaDays,
      reason: reasons.join(" + "),
    });
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// SIZE INTELLIGENCE ENGINE — Phase 2: Smart Transfer
// ══════════════════════════════════════════════════════════════

const TRANSFER_COST_SAME_REGION = 15000; // VND per unit same region
const TRANSFER_COST_CROSS_REGION = 35000; // VND per unit cross region

/**
 * Engine #4: Smart Size-aware Transfer Logic
 * 
 * Detects transfer opportunities when:
 * - Store A has excess of a size (high DOC, low velocity)
 * - Store B has stockout/low stock of same size (high velocity)
 * 
 * Priority: transfer_score = (stockout_risk * margin) - transfer_cost - demand_uncertainty
 * Prefers same-region transfers for lower cost.
 */
function computeSizeTransfers(
  tenantId: string,
  date: string,
  positions: any[],
  demand: any[],
  skuMapping: any[],
  retailStores: any[],
  priceMap: Map<string, number>
): any[] {
  const retailIds = new Set(retailStores.map((s: any) => s.id));
  const storeRegion = new Map<string, string>();
  for (const s of retailStores) {
    storeRegion.set(s.id, s.region || 'unknown');
  }

  // Build sku -> (fc, size)
  const skuToFC = new Map<string, { fcId: string; size: string }>();
  const fcSizes = new Map<string, Set<string>>();
  const fcSkus = new Map<string, string[]>();
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!fcSizes.has(m.fc_id)) fcSizes.set(m.fc_id, new Set());
    fcSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) {
      skuToFC.set(m.sku, { fcId: m.fc_id, size: m.size });
      if (!fcSkus.has(m.fc_id)) fcSkus.set(m.fc_id, []);
      fcSkus.get(m.fc_id)!.push(m.sku);
    }
  }

  // Only multi-size FCs
  const multiSizeFCs = new Set<string>();
  for (const [fcId, sizes] of fcSizes) {
    if (sizes.size >= 2) multiSizeFCs.add(fcId);
  }

  // Build per-store per-fc per-size stock
  // key: `storeId:fcId:size` -> on_hand
  const storeFcSizeStock = new Map<string, number>();
  for (const p of positions) {
    if (!retailIds.has(p.store_id)) continue;
    if ((p.on_hand || 0) <= 0) continue;
    if (!p.sku || !skuToFC.has(p.sku)) continue;
    const info = skuToFC.get(p.sku)!;
    if (!multiSizeFCs.has(info.fcId)) continue;
    const key = `${p.store_id}:${info.fcId}:${info.size}`;
    storeFcSizeStock.set(key, (storeFcSizeStock.get(key) || 0) + (p.on_hand || 0));
  }

  // Per-store per-fc velocity
  const storeFcVelocity = new Map<string, number>();
  for (const d of demand) {
    if (!retailIds.has(d.store_id) || !d.fc_id) continue;
    const key = `${d.store_id}:${d.fc_id}`;
    storeFcVelocity.set(key, (storeFcVelocity.get(key) || 0) + (d.avg_daily_sales || 0));
  }

  // FC avg price
  const fcPrice = new Map<string, number>();
  for (const [fcId, skus] of fcSkus) {
    const prices = skus.map(s => priceMap.get(s)).filter(Boolean) as number[];
    if (prices.length > 0) {
      fcPrice.set(fcId, prices.reduce((s, v) => s + v, 0) / prices.length);
    }
  }

  const results: any[] = [];

  // For each multi-size FC, find transfer opportunities per size
  for (const fcId of multiSizeFCs) {
    const sizes = fcSizes.get(fcId)!;
    const unitPrice = fcPrice.get(fcId) || DEFAULT_UNIT_PRICE;

    for (const size of sizes) {
      // Collect per-store data for this fc+size
      const storeData: { storeId: string; onHand: number; velocity: number; doc: number }[] = [];

      for (const store of retailStores) {
        const stockKey = `${store.id}:${fcId}:${size}`;
        const velKey = `${store.id}:${fcId}`;
        const onHand = storeFcSizeStock.get(stockKey) || 0;
        const velocity = (storeFcVelocity.get(velKey) || 0) / sizes.size; // Approximate per-size velocity
        const doc = velocity > 0 ? onHand / velocity : (onHand > 0 ? 999 : 0);

        storeData.push({ storeId: store.id, onHand, velocity, doc });
      }

      // Find sources (excess: DOC > 60 days AND on_hand > 3) and destinations (needing: on_hand <= 1 AND velocity > 0)
      const sources = storeData.filter(s => s.doc > 60 && s.onHand > 3);
      const dests = storeData.filter(s => s.onHand <= 1 && s.velocity > 0);

      if (sources.length === 0 || dests.length === 0) continue;

      // Sort destinations by velocity desc (highest demand first)
      dests.sort((a, b) => b.velocity - a.velocity);

      for (const dest of dests) {
        // Find best source (prefer same region, then highest excess)
        const destRegion = storeRegion.get(dest.storeId);
        const sortedSources = [...sources].sort((a, b) => {
          const aRegion = storeRegion.get(a.storeId);
          const bRegion = storeRegion.get(b.storeId);
          // Same region first
          if (aRegion === destRegion && bRegion !== destRegion) return -1;
          if (bRegion === destRegion && aRegion !== destRegion) return 1;
          // Then by excess (higher DOC first)
          return b.doc - a.doc;
        });

        const source = sortedSources[0];
        if (!source || source.storeId === dest.storeId) continue;

        // Calculate transfer qty: enough for ~14 days of dest demand, max 50% of source stock
        const transferQty = Math.min(
          Math.max(1, Math.ceil(dest.velocity * 14)),
          Math.floor(source.onHand * 0.5)
        );
        if (transferQty <= 0) continue;

        const sameRegion = storeRegion.get(source.storeId) === destRegion;
        const transferCost = transferQty * (sameRegion ? TRANSFER_COST_SAME_REGION : TRANSFER_COST_CROSS_REGION);
        const revenueGain = transferQty * unitPrice;
        const netBenefit = revenueGain - transferCost;

        if (netBenefit <= 0) continue;

        // Transfer score: higher = more urgent
        const stockoutUrgency = dest.onHand === 0 ? 2 : 1;
        const coreSizeBonus = CORE_SIZES.has(size) ? 1.5 : 1.0;
        const transferScore = Math.round(
          (stockoutUrgency * coreSizeBonus * revenueGain - transferCost) / 1000
        );

        const reason = [
          dest.onHand === 0 ? 'stockout' : 'low_stock',
          sameRegion ? 'same_region' : 'cross_region',
          CORE_SIZES.has(size) ? 'core_size' : null,
        ].filter(Boolean).join(' + ');

        results.push({
          tenant_id: tenantId,
          product_id: fcId,
          size_code: size,
          source_store_id: source.storeId,
          dest_store_id: dest.storeId,
          as_of_date: date,
          transfer_qty: transferQty,
          transfer_score: transferScore,
          source_on_hand: source.onHand,
          dest_on_hand: dest.onHand,
          dest_velocity: Math.round(dest.velocity * 100) / 100,
          estimated_revenue_gain: Math.round(revenueGain),
          estimated_transfer_cost: Math.round(transferCost),
          net_benefit: Math.round(netBenefit),
          reason,
        });

        // Remove this source from pool for next dest
        const idx = sources.indexOf(source);
        if (idx >= 0) {
          source.onHand -= transferQty;
          if (source.onHand <= 3) sources.splice(idx, 1);
        }
      }
    }
  }

  // Sort by transfer_score desc, limit to top 200
  results.sort((a, b) => b.transfer_score - a.transfer_score);
  return results.slice(0, 200);
}

/**
 * Per-store Size Health Score
 * Same logic as network-wide but computed per store
 */
function computePerStoreSizeHealth(
  tenantId: string,
  date: string,
  positions: any[],
  skuMapping: any[],
  retailStores: any[]
): any[] {
  const retailIds = new Set(retailStores.map((s: any) => s.id));

  const fcSizes = new Map<string, Set<string>>();
  const skuToFC = new Map<string, { fcId: string; size: string }>();
  for (const m of skuMapping) {
    if (!m.fc_id || !m.size) continue;
    if (!fcSizes.has(m.fc_id)) fcSizes.set(m.fc_id, new Set());
    fcSizes.get(m.fc_id)!.add(m.size);
    if (m.sku) skuToFC.set(m.sku, { fcId: m.fc_id, size: m.size });
  }

  const multiSizeFCs = new Set<string>();
  for (const [fcId, sizes] of fcSizes) {
    if (sizes.size >= 2) multiSizeFCs.add(fcId);
  }

  // Per store-fc-size stock
  const storeFcSizeStock = new Map<string, Map<string, number>>(); // `storeId:fcId` -> Map<size, qty>
  for (const p of positions) {
    if (!retailIds.has(p.store_id) || (p.on_hand || 0) <= 0) continue;
    if (!p.sku || !skuToFC.has(p.sku)) continue;
    const info = skuToFC.get(p.sku)!;
    if (!multiSizeFCs.has(info.fcId)) continue;
    const key = `${p.store_id}:${info.fcId}`;
    if (!storeFcSizeStock.has(key)) storeFcSizeStock.set(key, new Map());
    const sizeMap = storeFcSizeStock.get(key)!;
    sizeMap.set(info.size, (sizeMap.get(info.size) || 0) + (p.on_hand || 0));
  }

  const results: any[] = [];

  for (const [key, sizeStock] of storeFcSizeStock) {
    const [storeId, fcId] = key.split(':');
    const expectedSizes = fcSizes.get(fcId);
    if (!expectedSizes || expectedSizes.size < 2) continue;

    const totalOnHand = [...sizeStock.values()].reduce((s, v) => s + v, 0);
    if (totalOnHand <= 0) continue;

    const expectedRatio = 1 / expectedSizes.size;
    let deviationSum = 0;
    for (const size of expectedSizes) {
      const actualQty = sizeStock.get(size) || 0;
      const actualRatio = actualQty / totalOnHand;
      const deviation = Math.abs(expectedRatio - actualRatio);
      const weight = CORE_SIZES.has(size) ? 1.5 : 1.0;
      deviationSum += deviation * weight;
    }
    const deviationPenalty = Math.min(40, deviationSum * 20);

    let coreMissing = false;
    for (const cs of CORE_SIZES) {
      if (expectedSizes.has(cs) && (!sizeStock.has(cs) || sizeStock.get(cs)! <= 0)) {
        coreMissing = true;
        break;
      }
    }
    const corePenalty = coreMissing ? 30 : 0;

    let shallowCount = 0;
    for (const size of expectedSizes) {
      const qty = sizeStock.get(size) || 0;
      if (qty > 0 && qty < 2) shallowCount++;
    }
    const shallowPenalty = shallowCount * 5;

    const score = Math.max(0, Math.min(100, 100 - deviationPenalty - corePenalty - shallowPenalty));
    let curveState = "healthy";
    if (score < 40) curveState = "broken";
    else if (score < 60) curveState = "risk";
    else if (score < 80) curveState = "watch";

    results.push({
      tenant_id: tenantId,
      product_id: fcId,
      store_id: storeId,
      as_of_date: date,
      size_health_score: Math.round(score * 100) / 100,
      curve_state: curveState,
      deviation_score: Math.round(deviationSum * 10000) / 10000,
      core_size_missing: coreMissing,
      shallow_depth_count: shallowCount,
    });
  }

  return results;
}
