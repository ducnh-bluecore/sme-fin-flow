import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Types ───────────────────────────────────────────────────────

interface ConstraintMap {
  [key: string]: any;
}

interface StoreInfo {
  id: string;
  store_name: string;
  store_code: string;
  tier: string;
  region: string;
  location_type: string;
  is_active: boolean;
  capacity: number;
}

interface AllocationRec {
  tenant_id: string;
  run_id: string;
  fc_id: string;
  fc_name: string;
  store_id: string;
  store_name: string;
  sku: string | null;
  recommended_qty: number;
  current_on_hand: number;
  current_weeks_cover: number;
  projected_weeks_cover: number;
  sales_velocity: number;
  priority: string;
  reason: string;
  potential_revenue: number;
  status: string;
  stage: string;
  constraint_checks: Record<string, any>;
  explain_text: string;
  size_breakdown: any | null;
}

// ─── Main Handler ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { tenant_id, user_id, action, run_type, dry_run } = body;

    if (!tenant_id) {
      return jsonResponse({ error: "tenant_id required" }, 400);
    }

    if (action === "rebalance") {
      return await handleRebalance(supabase, tenant_id, user_id);
    } else if (action === "allocate") {
      const rt = run_type || "both"; // V1, V2, or both
      return await handleAllocate(supabase, tenant_id, user_id, rt, dry_run || false);
    }

    return jsonResponse({ error: "Unknown action. Use 'rebalance' or 'allocate'" }, 400);
  } catch (error) {
    console.error("Engine error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── Allocate: SOP 2-Round (V1 + V2) ────────────────────────────

async function handleAllocate(
  supabase: any,
  tenantId: string,
  userId: string | undefined,
  runType: "V1" | "V2" | "both",
  dryRun: boolean
) {
  // Create run
  const { data: run, error: runError } = await supabase
    .from("inv_allocation_runs")
    .insert({
      tenant_id: tenantId,
      run_date: new Date().toISOString().split("T")[0],
      status: "running",
      run_type: runType,
      started_at: new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (runError) throw runError;

  try {
    // ── Paginated fetch helper ──
    async function fetchAll(table: string, selectCols: string, filters: Record<string, any> = {}, extraFilter?: (q: any) => any): Promise<any[]> {
      const PAGE_SIZE = 1000;
      let query = supabase.from(table).select(selectCols, { count: 'exact' }).eq("tenant_id", tenantId);
      for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
      if (extraFilter) query = extraFilter(query);
      const first = await query.range(0, PAGE_SIZE - 1);
      if (first.error) throw first.error;
      const firstData = first.data || [];
      const total = first.count || firstData.length;
      if (total <= PAGE_SIZE) return firstData;
      const pages = Math.ceil(total / PAGE_SIZE);
      const promises = [];
      for (let i = 1; i < pages; i++) {
        let q = supabase.from(table).select(selectCols).eq("tenant_id", tenantId);
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
        if (extraFilter) q = extraFilter(q);
        promises.push(q.range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1));
      }
      const results = await Promise.all(promises);
      let allData = [...firstData];
      for (const r of results) {
        if (r.error) throw r.error;
        allData = allData.concat(r.data || []);
      }
      return allData;
    }

    // ── Stage 1: Fetch lightweight data first (stores, positions, constraints) ──
    const [storesRaw, posAgg, storeTotalsRaw, constraints, collections] =
      await Promise.all([
        fetchAll("inv_stores", "id,store_name,store_code,tier,region,location_type,is_active,capacity", { is_active: true }),
        supabase.rpc("fn_inv_positions_agg", { p_tenant_id: tenantId }),
        supabase.rpc("fn_inv_store_totals", { p_tenant_id: tenantId }),
        fetchAll("inv_constraint_registry", "constraint_key,constraint_value", { is_active: true }),
        fetchAll("inv_collections", "id,is_new_collection,air_date"),
      ]);

    if (posAgg.error) throw posAgg.error;
    if (storeTotalsRaw.error) throw storeTotalsRaw.error;

    const positions = (posAgg.data || []).map((p: any) => ({
      store_id: p.store_id,
      fc_id: p.fc_id,
      on_hand: Number(p.total_on_hand) || 0,
      reserved: Number(p.total_reserved) || 0,
      in_transit: Number(p.total_in_transit) || 0,
      safety_stock: Number(p.total_safety_stock) || 0,
      sku: null,
    }));

    const stores: StoreInfo[] = storesRaw.map((s: any) => ({
      ...s,
      capacity: Number(s.capacity) || 0,
    }));

    if (!stores.length || !positions.length) {
      await completeRun(supabase, run.id, 0, 0);
      return jsonResponse({ run_id: run.id, recommendations: 0, message: "No data" });
    }

    const centralStores = stores.filter((s) => s.location_type === "central_warehouse");
    const retailStores = stores.filter((s) => s.location_type !== "central_warehouse");

    // ── Early exit: check if CW has any stock ──
    const cwStock = buildCWStock(positions, centralStores);
    console.log(`[ALLOC] stores: ${stores.length}, positions: ${positions.length}, cwStock FCs: ${cwStock.size}, central: ${centralStores.length}, retail: ${retailStores.length}`);

    if (cwStock.size === 0) {
      console.log(`[ALLOC] No CW stock found — completing with 0 recs (skipping heavy fetches)`);
      await completeRun(supabase, run.id, 0, 0);
      return jsonResponse({ run_id: run.id, run_type: runType, total_recommendations: 0, v1_count: 0, v2_count: 0, total_units: 0, message: "No CW stock available" });
    }

    // ── Stage 2: Only fetch data for FCs that have CW stock ──
    const cwFcIds = [...cwStock.keys()];
    console.log(`[ALLOC] Fetching data for ${cwFcIds.length} FCs with CW stock...`);

    // Fetch FCs, demand, sizeIntegrity, skuMappings — filtered to relevant FCs only
    const fcFilter = (q: any) => q.in("id", cwFcIds);
    const fcFieldFilter = (q: any) => q.in("fc_id", cwFcIds);

    const [fcs, demand, sizeIntegrity, skuMappings] = await Promise.all([
      fetchAll("inv_family_codes", "id,fc_code,fc_name,is_core_hero,collection_id", { is_active: true }, fcFilter),
      fetchAll("inv_state_demand", "store_id,fc_id,avg_daily_sales,sales_velocity,customer_orders_qty,store_orders_qty", {}, fcFieldFilter),
      fetchAll("inv_state_size_integrity", "fc_id,is_full_size_run", {}, fcFieldFilter),
      fetchAll("inv_sku_fc_mapping", "fc_id,sku", {}, fcFieldFilter),
    ]);

    console.log(`[ALLOC DATA] fcs: ${fcs.length}, demand: ${demand.length}, sizeInt: ${sizeIntegrity.length}, skuMap: ${skuMappings.length}`);

    const storeTotalOnHand = new Map<string, number>();
    for (const st of (storeTotalsRaw.data || [])) {
      storeTotalOnHand.set(st.store_id, Number(st.total_on_hand) || 0);
    }

    const cm = buildConstraintMap(constraints);
    const demandMap = buildDemandMap(demand);
    const fcMap = new Map(fcs.map((f: any) => [f.id, f]));
    const sizeIntMap = buildSizeIntegrityMap(sizeIntegrity);

    const allRecs: AllocationRec[] = [];

    // ── V1: Baseline by Collection/Tier ──
    if (runType === "V1" || runType === "both") {
      const v1Recs = runV1(
        tenantId, run.id, stores, retailStores, centralStores,
        positions, fcs, collections, cm, sizeIntMap, cwStock, skuMappings, demandMap, storeTotalOnHand
      );
      allRecs.push(...v1Recs);
    }

    // ── V2: Demand-based detail ──
    if (runType === "V2" || runType === "both") {
      const v2Recs = runV2(
        tenantId, run.id, stores, retailStores, centralStores,
        positions, demand, fcs, cm, sizeIntMap, cwStock, skuMappings, demandMap, storeTotalOnHand
      );
      allRecs.push(...v2Recs);
    }

    // ── Inline Size Split ──
    const sizeSplitStart = Date.now();
    const SIZE_BATCH = 20;
    const SIZE_TIMEOUT_MS = 50000; // 50s guard
    let sizeSplitDone = 0;
    let sizeSplitSkipped = 0;

    for (let i = 0; i < allRecs.length; i += SIZE_BATCH) {
      if (Date.now() - sizeSplitStart > SIZE_TIMEOUT_MS) {
        console.log(`[SIZE SPLIT] Timeout after ${sizeSplitDone} done, ${allRecs.length - i} remaining`);
        break;
      }
      const batch = allRecs.slice(i, i + SIZE_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (rec) => {
          try {
            const { data: sizeData, error: rpcError } = await supabase.rpc('fn_allocate_size_split', {
              p_tenant_id: tenantId,
              p_fc_id: rec.fc_id,
              p_source_store_id: null,
              p_dest_store_id: rec.store_id,
              p_total_qty: rec.recommended_qty,
            });
            if (rpcError) {
              console.error(`[SIZE SPLIT] RPC error for FC ${rec.fc_id}:`, rpcError.message);
              rec.size_breakdown = [];
              sizeSplitSkipped++;
              return;
            }
            rec.size_breakdown = sizeData || [];
            sizeSplitDone++;
          } catch (e) {
            console.error(`[SIZE SPLIT] Exception for FC ${rec.fc_id}:`, e);
            rec.size_breakdown = [];
            sizeSplitSkipped++;
          }
        })
      );
    }
    console.log(`[SIZE SPLIT] Done: ${sizeSplitDone} split, ${sizeSplitSkipped} skipped, ${allRecs.length - sizeSplitDone - sizeSplitSkipped} remaining`);

    // ── Persist ──
    if (!dryRun && allRecs.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < allRecs.length; i += 500) {
        const batch = allRecs.slice(i, i + 500);
        const { error } = await supabase.from("inv_allocation_recommendations").insert(batch);
        if (error) throw error;
      }
    }

    const totalUnits = allRecs.reduce((s, r) => s + r.recommended_qty, 0);
    const v1Count = allRecs.filter((r) => r.stage === "V1").length;
    const v2Count = allRecs.filter((r) => r.stage === "V2").length;

    await completeRun(supabase, run.id, allRecs.length, totalUnits);

    return jsonResponse({
      run_id: run.id,
      run_type: runType,
      dry_run: dryRun,
      total_recommendations: allRecs.length,
      v1_count: v1Count,
      v2_count: v2Count,
      total_units: totalUnits,
    });
  } catch (error) {
    await supabase
      .from("inv_allocation_runs")
      .update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// V1: Phủ nền theo BST — Baseline Allocation
// ═══════════════════════════════════════════════════════════════════

function runV1(
  tenantId: string,
  runId: string,
  allStores: StoreInfo[],
  retailStores: StoreInfo[],
  centralStores: StoreInfo[],
  positions: any[],
  fcs: any[],
  collections: any[],
  cm: ConstraintMap,
  sizeIntMap: Map<string, boolean>,
  cwStock: Map<string, number>,
  skuMappings: any[],
  demandMap: Map<string, number>,
  storeTotalOnHand: Map<string, number>
): AllocationRec[] {
  const recs: AllocationRec[] = [];

  // ── 1. Filter FC scope by collection ──
  const scopeFcIds = getV1ScopeFcIds(fcs, collections, cm);

  // ── 2. Get min stock rules ──
  const minStockRanges = getConstraintRanges(cm, "v1_min_store_stock_by_total_sku", "min_qty");
  const cwReservedRanges = getConstraintRanges(cm, "cw_reserved_min_by_total_sku", "min_pcs");
  const coreHeroMinPerSku = cm.cw_core_hero_min_per_sku?.min_pcs ?? 15;
  const noBrokenSize = cm.no_broken_size?.enabled !== false;

  // ── 3. Count total SKU per store (for tier-based lookup) ──
  const storeTotalSkuCount = new Map<string, number>();
  for (const store of retailStores) {
    const storeSkuCount = new Set(
      positions.filter((p: any) => p.store_id === store.id).map((p: any) => p.fc_id)
    ).size;
    storeTotalSkuCount.set(store.id, storeSkuCount);
  }

  // Count CW total SKUs for reserve calculation
  const cwTotalSkus = new Set(
    positions.filter((p: any) => centralStores.some((cw) => cw.id === p.store_id)).map((p: any) => p.fc_id)
  ).size;

  // ── 4. Sort retail stores by tier priority: S → A → B → C ──
  const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
  const sortedRetail = [...retailStores].sort(
    (a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
  );

  // ── 5. For each FC in scope → allocate baseline ──
  console.log(`[V1] scopeFcIds: ${scopeFcIds.length}, cwStock entries: ${cwStock.size}, retailStores: ${sortedRetail.length}, noBrokenSize: ${noBrokenSize}`);
  let debugSkipNoFc = 0, debugSkipSizeInt = 0, debugSkipNoCw = 0, debugSkipNoShortage = 0, debugAllocated = 0;
  
  for (const fcId of scopeFcIds) {
    const fc = fcs.find((f: any) => f.id === fcId);
    if (!fc) { debugSkipNoFc++; continue; }

    // Check size integrity
    if (noBrokenSize && !isSizeRunComplete(sizeIntMap, fcId)) {
      debugSkipSizeInt++;
      continue;
    }

    // Available at CW
    let cwAvailable = cwStock.get(fcId) ?? 0;
    if (cwAvailable <= 0) { debugSkipNoCw++; continue; }

    // CW reserve floor
    const cwReserveMin = lookupRange(cwReservedRanges, cwTotalSkus);

    // Core/Hero: higher reserve at CW
    const isCoreHero = fc.is_core_hero === true;
    const fcSkuCount = skuMappings.filter((m: any) => m.fc_id === fcId).length || 1;
    const coreHeroReserve = isCoreHero ? coreHeroMinPerSku * fcSkuCount : 0;
    const effectiveCwReserve = Math.max(cwReserveMin, coreHeroReserve);

    for (const store of sortedRetail) {
      if (cwAvailable <= effectiveCwReserve) break;

      const totalSkuAtStore = storeTotalSkuCount.get(store.id) ?? 0;
      const minQty = lookupRange(minStockRanges, totalSkuAtStore);

      // Current stock at store for this FC
      const storePos = positions.filter((p: any) => p.store_id === store.id && p.fc_id === fcId);
      const currentStock = storePos.reduce(
        (sum: number, p: any) => sum + (p.on_hand || 0) + (p.in_transit || 0),
        0
      );

      const shortage = minQty - currentStock;
      if (shortage <= 0) { debugSkipNoShortage++; continue; }

      let allocQty = Math.min(shortage, cwAvailable - effectiveCwReserve);
      if (allocQty <= 0) continue;

      // ── Capacity check ──
      let capacityCapped = false;
      if (store.capacity > 0) {
        const currentTotalOnHand = storeTotalOnHand.get(store.id) || 0;
        const remainingCapacity = store.capacity - currentTotalOnHand;
        if (remainingCapacity <= 0) continue;
        if (allocQty > remainingCapacity) {
          allocQty = remainingCapacity;
          capacityCapped = true;
        }
      }
      if (allocQty <= 0) continue;

      const velocity = getDemandVelocity(demandMap, store.id, fcId);
      const newCover = velocity > 0 ? (currentStock + allocQty) / (velocity * 7) : 99;

      // Get demand detail for sold_7d
      const ddKey = `${store.id}:${fcId}`;
      const dd = demandMap.get(ddKey) || 0;

      const constraintChecks = {
        rule: "v1_min_store_stock",
        tier: store.tier,
        total_sku_at_store: totalSkuAtStore,
        min_qty_required: minQty,
        current_stock: currentStock,
        cw_available_before: cwAvailable,
        cw_reserve_floor: effectiveCwReserve,
        is_core_hero: isCoreHero,
        size_integrity: true,
        capacity_capped: capacityCapped,
        store_capacity: store.capacity || null,
        source_on_hand: cwAvailable,
        dest_on_hand: currentStock,
        sold_7d: Math.round(dd * 7),
      };

      recs.push({
        tenant_id: tenantId,
        run_id: runId,
        fc_id: fcId,
        fc_name: fc.fc_name || fc.fc_code || "",
        store_id: store.id,
        store_name: store.store_name || store.store_code || "",
        sku: null,
        recommended_qty: allocQty,
        current_on_hand: currentStock,
        current_weeks_cover: velocity > 0 ? currentStock / (velocity * 7) : 99,
        projected_weeks_cover: newCover,
        sales_velocity: velocity,
        priority: currentStock === 0 ? "P1" : shortage > minQty * 0.5 ? "P2" : "P3",
        reason: `V1: ${store.store_name} thiếu ${shortage} units (min=${minQty}, tier=${store.tier})`,
        potential_revenue: allocQty * (cm.avg_unit_price_default?.amount ?? 250000),
        status: "pending",
        stage: "V1",
        constraint_checks: constraintChecks,
        explain_text: `V1 Phủ nền: FC ${fc.fc_name || fc.fc_code}, CH ${store.store_name} (tier ${store.tier}) cần min ${minQty} units, hiện có ${currentStock}, bổ sung ${allocQty}. CW còn ${cwAvailable - allocQty} sau chia.`,
        size_breakdown: null,
      });

      cwAvailable -= allocQty;
      cwStock.set(fcId, cwAvailable);
      // Update store on-hand tracker for capacity
      storeTotalOnHand.set(store.id, (storeTotalOnHand.get(store.id) || 0) + allocQty);
    }
  }

  console.log(`[V1 Summary] recs: ${recs.length}, skipNoFc: ${debugSkipNoFc}, skipSizeInt: ${debugSkipSizeInt}, skipNoCw: ${debugSkipNoCw}, skipNoShortage: ${debugSkipNoShortage}`);
  return recs;
}

// ═══════════════════════════════════════════════════════════════════
// V2: Chia chi tiết theo nhu cầu CH — Demand Allocation
// ═══════════════════════════════════════════════════════════════════

function runV2(
  tenantId: string,
  runId: string,
  allStores: StoreInfo[],
  retailStores: StoreInfo[],
  centralStores: StoreInfo[],
  positions: any[],
  demand: any[],
  fcs: any[],
  cm: ConstraintMap,
  sizeIntMap: Map<string, boolean>,
  cwStock: Map<string, number>,
  skuMappings: any[],
  demandMap: Map<string, number>,
  storeTotalOnHand: Map<string, number>
): AllocationRec[] {
  const recs: AllocationRec[] = [];

  const priorityOrder: string[] = cm.v2_priority_order || ["customer_orders", "store_orders", "top_fc"];
  const minCoverWeeks = cm.v2_min_cover_weeks?.weeks ?? 1;
  const noBrokenSize = cm.no_broken_size?.enabled !== false;
  const cwReservedRanges = getConstraintRanges(cm, "cw_reserved_min_by_total_sku", "min_pcs");
  const coreHeroMinPerSku = cm.cw_core_hero_min_per_sku?.min_pcs ?? 15;

  const cwTotalSkus = new Set(
    positions.filter((p: any) => centralStores.some((cw) => cw.id === p.store_id)).map((p: any) => p.fc_id)
  ).size;
  const cwReserveMin = lookupRange(cwReservedRanges, cwTotalSkus);

  // Build demand detail map: storeId:fcId → full demand record
  const demandDetailMap = new Map<string, any>();
  for (const d of demand) {
    demandDetailMap.set(`${d.store_id}:${d.fc_id}`, d);
  }

  // Build priority-scored list of (store, fc) pairs needing stock
  interface DemandEntry {
    store: StoreInfo;
    fc: any;
    fcId: string;
    priorityType: string;
    demandQty: number;
    velocity: number;
    currentStock: number;
    weeksCover: number;
  }

  const entries: DemandEntry[] = [];

  for (const store of retailStores) {
    const storeFcIds = [...new Set(
      [...positions.filter((p: any) => p.store_id === store.id).map((p: any) => p.fc_id),
       ...demand.filter((d: any) => d.store_id === store.id).map((d: any) => d.fc_id)]
    )];

    for (const fcId of storeFcIds) {
      const fc = fcs.find((f: any) => f.id === fcId);
      if (!fc) continue;

      if (noBrokenSize && !isSizeRunComplete(sizeIntMap, fcId)) continue;

      const storePos = positions.filter((p: any) => p.store_id === store.id && p.fc_id === fcId);
      const currentStock = storePos.reduce((s: number, p: any) => s + (p.on_hand || 0), 0);
      const velocity = getDemandVelocity(demandMap, store.id, fcId);
      const weeksCover = velocity > 0 ? currentStock / (velocity * 7) : (currentStock > 0 ? 99 : 0);

      const dd = demandDetailMap.get(`${store.id}:${fcId}`);
      const customerOrders = dd?.customer_orders_qty || 0;
      const storeOrders = dd?.store_orders_qty || 0;

      // Determine priority type & demand qty
      for (const pType of priorityOrder) {
        let qty = 0;
        if (pType === "customer_orders" && customerOrders > 0) {
          qty = customerOrders;
        } else if (pType === "store_orders" && storeOrders > 0) {
          qty = storeOrders;
        } else if (pType === "top_fc" && velocity > 0 && weeksCover < minCoverWeeks) {
          qty = Math.ceil(minCoverWeeks * velocity * 7 - currentStock);
        }

        if (qty > 0) {
          entries.push({
            store,
            fc,
            fcId,
            priorityType: pType,
            demandQty: qty,
            velocity,
            currentStock,
            weeksCover,
          });
          break; // only highest-priority type per store-fc pair
        }
      }
    }
  }

  // Sort: customer_orders first, then store_orders, then top_fc
  const priorityRank: Record<string, number> = {};
  priorityOrder.forEach((p, i) => (priorityRank[p] = i));
  entries.sort((a, b) => {
    const pDiff = (priorityRank[a.priorityType] ?? 9) - (priorityRank[b.priorityType] ?? 9);
    if (pDiff !== 0) return pDiff;
    return a.weeksCover - b.weeksCover; // more urgent first within same priority
  });

  // ── Greedy allocate ──
  for (const entry of entries) {
    let cwAvailable = cwStock.get(entry.fcId) ?? 0;

    const isCoreHero = entry.fc.is_core_hero === true;
    const fcSkuCount = skuMappings.filter((m: any) => m.fc_id === entry.fcId).length || 1;
    const coreHeroReserve = isCoreHero ? coreHeroMinPerSku * fcSkuCount : 0;
    const effectiveCwReserve = Math.max(cwReserveMin, coreHeroReserve);

    if (cwAvailable <= effectiveCwReserve) continue;

    const maxAlloc = cwAvailable - effectiveCwReserve;
    let allocQty = Math.min(entry.demandQty, maxAlloc);
    if (allocQty <= 0) continue;

    // ── Capacity check ──
    let capacityCapped = false;
    if (entry.store.capacity > 0) {
      const currentTotalOnHand = storeTotalOnHand.get(entry.store.id) || 0;
      const remainingCapacity = entry.store.capacity - currentTotalOnHand;
      if (remainingCapacity <= 0) continue;
      if (allocQty > remainingCapacity) {
        allocQty = remainingCapacity;
        capacityCapped = true;
      }
    }
    if (allocQty <= 0) continue;

    const newCover =
      entry.velocity > 0
        ? (entry.currentStock + allocQty) / (entry.velocity * 7)
        : 99;

    const constraintChecks = {
      rule: "v2_demand",
      priority_type: entry.priorityType,
      demand_qty: entry.demandQty,
      cw_available_before: cwAvailable,
      cw_reserve_floor: effectiveCwReserve,
      is_core_hero: isCoreHero,
      size_integrity: true,
      cover_after: newCover,
      min_cover_weeks: minCoverWeeks,
      capacity_capped: capacityCapped,
      store_capacity: entry.store.capacity || null,
      source_on_hand: cwAvailable,
      dest_on_hand: entry.currentStock,
      sold_7d: Math.round(entry.velocity * 7),
    };

    const priorityLabel =
      entry.priorityType === "customer_orders"
        ? "ĐH khách"
        : entry.priorityType === "store_orders"
        ? "ĐH cửa hàng"
        : "Top bán FC";

    recs.push({
      tenant_id: tenantId,
      run_id: runId,
      fc_id: entry.fcId,
      fc_name: entry.fc.fc_name || entry.fc.fc_code || "",
      store_id: entry.store.id,
      store_name: entry.store.store_name || entry.store.store_code || "",
      sku: null,
      recommended_qty: allocQty,
      current_on_hand: entry.currentStock,
      current_weeks_cover: entry.weeksCover,
      projected_weeks_cover: newCover,
      sales_velocity: entry.velocity,
      priority: entry.priorityType === "customer_orders" ? "P1" : entry.priorityType === "store_orders" ? "P2" : "P3",
      reason: `V2: ${priorityLabel} — ${entry.store.store_name} cần ${entry.demandQty}, chia ${allocQty}`,
      potential_revenue: allocQty * (cm.avg_unit_price_default?.amount ?? 250000),
      status: "pending",
      stage: "V2",
      constraint_checks: constraintChecks,
      explain_text: `V2 ${priorityLabel}: FC ${entry.fc.fc_name || entry.fc.fc_code}, CH ${entry.store.store_name} cần ${entry.demandQty} units (${entry.priorityType}), chia ${allocQty}. Cover sau: ${newCover.toFixed(1)}w. CW còn ${cwAvailable - allocQty}.`,
      size_breakdown: null,
    });

    cwStock.set(entry.fcId, cwAvailable - allocQty);
    storeTotalOnHand.set(entry.store.id, (storeTotalOnHand.get(entry.store.id) || 0) + allocQty);
  }

  return recs;
}

// ═══════════════════════════════════════════════════════════════════
// Rebalance: Delegated to PL/pgSQL fn_rebalance_engine
// ═══════════════════════════════════════════════════════════════════

async function handleRebalance(supabase: any, tenantId: string, userId?: string) {
  // Create run record
  const { data: run, error: runError } = await supabase
    .from("inv_rebalance_runs")
    .insert({
      tenant_id: tenantId,
      run_date: new Date().toISOString().split("T")[0],
      status: "running",
      started_at: new Date().toISOString(),
      created_by: userId || null,
    })
    .select()
    .single();

  if (runError) throw runError;

  try {
    console.log(`[Rebalance] Calling fn_rebalance_engine for run ${run.id}...`);
    const { data, error } = await supabase.rpc("fn_rebalance_engine", {
      p_tenant_id: tenantId,
      p_run_id: run.id,
    });

    if (error) throw error;

    const result = data || { push_suggestions: 0, push_units: 0, lateral_suggestions: 0, lateral_units: 0, total_suggestions: 0 };
    console.log(`[Rebalance] Done:`, JSON.stringify(result));

    // Update run record
    await supabase
      .from("inv_rebalance_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_suggestions: result.total_suggestions,
        total_units: (result.push_units || 0) + (result.lateral_units || 0),
        push_units: result.push_units || 0,
        lateral_units: result.lateral_units || 0,
      })
      .eq("id", run.id);

    return jsonResponse({
      run_id: run.id,
      ...result,
    });
  } catch (error) {
    await supabase
      .from("inv_rebalance_runs")
      .update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function buildConstraintMap(constraints: any[]): ConstraintMap {
  const map: ConstraintMap = {};
  for (const c of constraints) {
    // Store the full constraint_value object, not unwrapped
    map[c.constraint_key] = c.constraint_value;
  }
  return map;
}

function buildDemandMap(demand: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of demand) {
    map.set(`${d.store_id}:${d.fc_id}`, d.avg_daily_sales || d.sales_velocity || 0);
  }
  return map;
}

function getDemandVelocity(demandMap: Map<string, number>, storeId: string, fcId: string): number {
  return demandMap.get(`${storeId}:${fcId}`) || 0;
}

function buildSizeIntegrityMap(sizeIntegrity: any[]): Map<string, boolean> {
  // Key: fc_id (global) or fc_id:store_id
  const map = new Map<string, boolean>();
  for (const si of sizeIntegrity) {
    // Global FC-level: if ANY entry is false, the FC is incomplete
    const existing = map.get(si.fc_id);
    if (existing === false) continue; // already marked incomplete
    map.set(si.fc_id, si.is_full_size_run);
  }
  return map;
}

function isSizeRunComplete(sizeIntMap: Map<string, boolean>, fcId: string): boolean {
  // If no integrity data exists, assume complete (backward compat)
  if (!sizeIntMap.has(fcId)) return true;
  return sizeIntMap.get(fcId) === true;
}

function buildCWStock(positions: any[], centralStores: any[]): Map<string, number> {
  const cwIds = new Set(centralStores.map((cw: any) => cw.id));
  const map = new Map<string, number>();
  for (const p of positions) {
    if (!cwIds.has(p.store_id)) continue;
    const fcId = p.fc_id;
    const available = (p.on_hand || 0) - (p.reserved || 0) - (p.safety_stock || 0);
    map.set(fcId, (map.get(fcId) || 0) + Math.max(available, 0));
  }
  return map;
}

function getV1ScopeFcIds(fcs: any[], collections: any[], cm: ConstraintMap): string[] {
  const recentCount = cm.bst_scope_recent_count?.count ?? 10;
  const restockDays = cm.restock_lookback_days?.days ?? 14;
  const now = new Date();

  // If no collections exist, fall back to all active FCs
  if (!collections.length) {
    return fcs.map((f: any) => f.id);
  }

  // New collections
  const newCollIds = new Set(
    collections.filter((c: any) => c.is_new_collection).map((c: any) => c.id)
  );

  // Recent N collections by air_date
  const sorted = [...collections]
    .filter((c: any) => c.air_date)
    .sort((a, b) => new Date(b.air_date).getTime() - new Date(a.air_date).getTime());
  const recentCollIds = new Set(sorted.slice(0, recentCount).map((c: any) => c.id));

  // Combined scope
  const scopeCollIds = new Set([...newCollIds, ...recentCollIds]);

  // FCs in scope: those linked to these collections, or FCs without collection (restock/general)
  const scopeFcIds = fcs
    .filter((f: any) => {
      if (f.collection_id && scopeCollIds.has(f.collection_id)) return true;
      // FCs without collection_id = general/restock items (include all)
      if (!f.collection_id) return true;
      return false;
    })
    .map((f: any) => f.id);

  return scopeFcIds;
}

/**
 * Look up a value from a ranges array based on total count.
 * Ranges: [{ max_sku: 50, min_qty: 2 }, { max_sku: 100, min_qty: 3 }, ...]
 */
function getConstraintRanges(cm: ConstraintMap, key: string, valueField: string): { max: number; value: number }[] {
  const raw = cm[key];
  if (!raw?.ranges) return [{ max: 9999, value: 5 }]; // default fallback
  return raw.ranges.map((r: any) => ({
    max: r.max_sku ?? r.max ?? 9999,
    value: r[valueField] ?? r.min_qty ?? r.min_pcs ?? 5,
  }));
}

function lookupRange(ranges: { max: number; value: number }[], count: number): number {
  for (const r of ranges) {
    if (count <= r.max) return r.value;
  }
  return ranges[ranges.length - 1]?.value ?? 5;
}

async function completeRun(supabase: any, runId: string, totalRecs: number, totalUnits: number) {
  await supabase
    .from("inv_allocation_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_recommendations: totalRecs,
      total_units: totalUnits,
    })
    .eq("id", runId);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
