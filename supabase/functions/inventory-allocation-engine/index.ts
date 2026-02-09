import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RebalanceSuggestion {
  tenant_id: string;
  run_id: string;
  transfer_type: "push" | "lateral";
  fc_id: string;
  fc_name: string;
  from_location: string;
  from_location_name: string;
  from_location_type: string;
  to_location: string;
  to_location_name: string;
  to_location_type: string;
  qty: number;
  reason: string;
  from_weeks_cover: number;
  to_weeks_cover: number;
  balanced_weeks_cover: number;
  priority: string;
  potential_revenue_gain: number;
  logistics_cost_estimate: number;
  net_benefit: number;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { tenant_id, user_id, action } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rebalance") {
      return await handleRebalance(supabase, tenant_id, user_id);
    } else if (action === "allocate") {
      return await handleAllocate(supabase, tenant_id, user_id);
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use action: 'rebalance' or 'allocate'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
    // Fetch stores
    const { data: stores } = await supabase
      .from("inv_stores")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // Fetch latest positions
    const { data: positions } = await supabase
      .from("inv_state_positions")
      .select("*")
      .eq("tenant_id", tenantId);

    // Fetch demand data
    const { data: demand } = await supabase
      .from("inv_state_demand")
      .select("*")
      .eq("tenant_id", tenantId);

    // Fetch constraints
    const { data: constraints } = await supabase
      .from("inv_constraint_registry")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    const constraintMap = buildConstraintMap(constraints || []);

    if (!stores?.length || !positions?.length) {
      await supabase
        .from("inv_rebalance_runs")
        .update({ status: "completed", completed_at: new Date().toISOString(), total_suggestions: 0, total_units: 0 })
        .eq("id", run.id);

      return jsonResponse({ run_id: run.id, suggestions: [], message: "No data to rebalance" });
    }

    const storeMap = new Map(stores.map((s: any) => [s.id, s]));
    const demandMap = buildDemandMap(demand || []);
    const suggestions: RebalanceSuggestion[] = [];

    // Get unique FC IDs
    const fcIds = [...new Set(positions.map((p: any) => p.fc_id))];

    // Phase 1: Push from central warehouse
    const centralStores = stores.filter((s: any) => s.location_type === "central_warehouse");
    
    for (const fcId of fcIds) {
      for (const cw of centralStores) {
        const cwPositions = positions.filter((p: any) => p.store_id === cw.id && p.fc_id === fcId);
        if (!cwPositions.length) continue;

        const cwOnHand = cwPositions.reduce((sum: number, p: any) => sum + (p.on_hand || 0), 0);
        const cwReserved = cwPositions.reduce((sum: number, p: any) => sum + (p.reserved || 0), 0);
        const cwSafety = cwPositions.reduce((sum: number, p: any) => sum + (p.safety_stock || 0), 0);
        let availableToPush = cwOnHand - cwReserved - cwSafety;

        if (availableToPush <= 0) continue;

        // Find stores with shortage
        const minCoverWeeks = constraintMap.min_cover_weeks ?? 2;
        const shortageStores: any[] = [];

        for (const store of stores) {
          if (store.location_type === "central_warehouse") continue;
          const storePos = positions.filter((p: any) => p.store_id === store.id && p.fc_id === fcId);
          if (!storePos.length) {
            // Store has 0 stock = max priority
            shortageStores.push({ store, weeksCover: 0, onHand: 0, velocity: getDemandVelocity(demandMap, store.id, fcId) });
            continue;
          }
          const totalOnHand = storePos.reduce((sum: number, p: any) => sum + (p.available || p.on_hand - p.reserved || 0), 0);
          const velocity = getDemandVelocity(demandMap, store.id, fcId);
          const weeksCover = velocity > 0 ? totalOnHand / (velocity * 7) : (totalOnHand > 0 ? 99 : 0);
          
          if (weeksCover < minCoverWeeks) {
            shortageStores.push({ store, weeksCover, onHand: totalOnHand, velocity });
          }
        }

        // Sort by weeks cover ascending (most urgent first)
        shortageStores.sort((a, b) => a.weeksCover - b.weeksCover);

        // Greedy allocate
        for (const target of shortageStores) {
          if (availableToPush <= 0) break;

          const idealQty = Math.ceil((minCoverWeeks - target.weeksCover) * target.velocity * 7);
          const qty = Math.min(idealQty, availableToPush);
          if (qty <= 0) continue;

          const newTargetCover = target.velocity > 0 ? (target.onHand + qty) / (target.velocity * 7) : minCoverWeeks;
          const revenueGain = qty * (target.velocity > 0 ? target.velocity * 7 * 250000 : 250000); // Avg price estimate

          suggestions.push({
            tenant_id: tenantId,
            run_id: run.id,
            transfer_type: "push",
            fc_id: fcId,
            fc_name: cwPositions[0]?.fc_name || fcId,
            from_location: cw.id,
            from_location_name: cw.store_name,
            from_location_type: cw.location_type,
            to_location: target.store.id,
            to_location_name: target.store.store_name,
            to_location_type: target.store.location_type,
            qty,
            reason: `Store ${target.store.store_name} chỉ còn ${target.weeksCover.toFixed(1)} tuần cover, cần bổ sung từ kho tổng`,
            from_weeks_cover: cwPositions[0]?.weeks_of_cover || 0,
            to_weeks_cover: target.weeksCover,
            balanced_weeks_cover: newTargetCover,
            priority: target.weeksCover < 0.5 ? "P1" : target.weeksCover < 1 ? "P2" : "P3",
            potential_revenue_gain: revenueGain,
            logistics_cost_estimate: qty * 15000, // Estimate per unit
            net_benefit: revenueGain - qty * 15000,
            status: "pending",
          });

          availableToPush -= qty;
        }
      }
    }

    // Phase 2: Lateral rebalancing
    const lateralEnabled = constraintMap.lateral_enabled !== false;
    const minNetBenefit = constraintMap.min_lateral_net_benefit ?? 500000;
    const thresholdHigh = constraintMap.threshold_high_weeks ?? 6;
    const thresholdLow = constraintMap.threshold_low_weeks ?? 1;

    if (lateralEnabled) {
      for (const fcId of fcIds) {
        // After push, recalculate positions conceptually
        const surplusStores: any[] = [];
        const shortageStores: any[] = [];

        for (const store of stores) {
          if (store.location_type === "central_warehouse") continue;

          const storePos = positions.filter((p: any) => p.store_id === store.id && p.fc_id === fcId);
          const totalOnHand = storePos.reduce((sum: number, p: any) => sum + (p.available || p.on_hand - p.reserved || 0), 0);
          const safetySt = storePos.reduce((sum: number, p: any) => sum + (p.safety_stock || 0), 0);
          const velocity = getDemandVelocity(demandMap, store.id, fcId);
          const weeksCover = velocity > 0 ? totalOnHand / (velocity * 7) : (totalOnHand > 0 ? 99 : 0);

          // Adjust for push allocations already made
          const pushQty = suggestions
            .filter((s) => s.to_location === store.id && s.fc_id === fcId && s.transfer_type === "push")
            .reduce((sum, s) => sum + s.qty, 0);
          const adjustedOnHand = totalOnHand + pushQty;
          const adjustedCover = velocity > 0 ? adjustedOnHand / (velocity * 7) : (adjustedOnHand > 0 ? 99 : 0);

          if (adjustedCover > thresholdHigh) {
            const surplus = adjustedOnHand - safetySt - Math.ceil(thresholdHigh * velocity * 7);
            if (surplus > 0) {
              surplusStores.push({ store, weeksCover: adjustedCover, onHand: adjustedOnHand, surplus, velocity, region: store.region });
            }
          } else if (adjustedCover < thresholdLow) {
            const shortage = Math.ceil((thresholdLow - adjustedCover) * velocity * 7);
            if (shortage > 0) {
              shortageStores.push({ store, weeksCover: adjustedCover, onHand: adjustedOnHand, shortage, velocity, region: store.region });
            }
          }
        }

        // Pair surplus → shortage, prioritize same region
        shortageStores.sort((a, b) => a.weeksCover - b.weeksCover);

        for (const target of shortageStores) {
          // Same region first
          const sameRegion = surplusStores.filter((s) => s.region && s.region === target.region && s.surplus > 0);
          const diffRegion = surplusStores.filter((s) => (!s.region || s.region !== target.region) && s.surplus > 0);
          const sorted = [...sameRegion, ...diffRegion];

          let remaining = target.shortage;
          for (const source of sorted) {
            if (remaining <= 0 || source.surplus <= 0) break;

            const qty = Math.min(remaining, source.surplus);
            const isSameRegion = source.region && source.region === target.region;
            const logisticsCost = qty * (isSameRegion ? 20000 : 45000);
            const revenueGain = qty * (target.velocity > 0 ? target.velocity * 7 * 250000 : 250000);
            const netBen = revenueGain - logisticsCost;

            if (netBen < minNetBenefit) continue;

            const newSourceCover = source.velocity > 0 ? (source.onHand - qty) / (source.velocity * 7) : 0;
            const newTargetCover = target.velocity > 0 ? (target.onHand + qty) / (target.velocity * 7) : 0;

            suggestions.push({
              tenant_id: tenantId,
              run_id: run.id,
              transfer_type: "lateral",
              fc_id: fcId,
              fc_name: "",
              from_location: source.store.id,
              from_location_name: source.store.store_name,
              from_location_type: source.store.location_type,
              to_location: target.store.id,
              to_location_name: target.store.store_name,
              to_location_type: target.store.location_type,
              qty,
              reason: `${source.store.store_name} thừa (${source.weeksCover.toFixed(1)}w) → ${target.store.store_name} thiếu (${target.weeksCover.toFixed(1)}w)${isSameRegion ? " [cùng vùng]" : ""}`,
              from_weeks_cover: source.weeksCover,
              to_weeks_cover: target.weeksCover,
              balanced_weeks_cover: newTargetCover,
              priority: target.weeksCover < 0.5 ? "P1" : target.weeksCover < 1 ? "P2" : "P3",
              potential_revenue_gain: revenueGain,
              logistics_cost_estimate: logisticsCost,
              net_benefit: netBen,
              status: "pending",
            });

            source.surplus -= qty;
            remaining -= qty;
          }
        }
      }
    }

    // Insert suggestions
    if (suggestions.length > 0) {
      const { error: insertError } = await supabase.from("inv_rebalance_suggestions").insert(suggestions);
      if (insertError) throw insertError;
    }

    const pushUnits = suggestions.filter((s) => s.transfer_type === "push").reduce((sum, s) => sum + s.qty, 0);
    const lateralUnits = suggestions.filter((s) => s.transfer_type === "lateral").reduce((sum, s) => sum + s.qty, 0);

    // Update run
    await supabase
      .from("inv_rebalance_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_suggestions: suggestions.length,
        total_units: pushUnits + lateralUnits,
        push_units: pushUnits,
        lateral_units: lateralUnits,
      })
      .eq("id", run.id);

    return jsonResponse({
      run_id: run.id,
      total_suggestions: suggestions.length,
      push_suggestions: suggestions.filter((s) => s.transfer_type === "push").length,
      lateral_suggestions: suggestions.filter((s) => s.transfer_type === "lateral").length,
      push_units: pushUnits,
      lateral_units: lateralUnits,
    });
  } catch (error) {
    await supabase
      .from("inv_rebalance_runs")
      .update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    throw error;
  }
}

async function handleAllocate(supabase: any, tenantId: string, userId?: string) {
  // Allocate is similar to push phase but creates allocation_recommendations
  const { data: run, error: runError } = await supabase
    .from("inv_allocation_runs")
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
    const { data: stores } = await supabase.from("inv_stores").select("*").eq("tenant_id", tenantId).eq("is_active", true);
    const { data: positions } = await supabase.from("inv_state_positions").select("*").eq("tenant_id", tenantId);
    const { data: demand } = await supabase.from("inv_state_demand").select("*").eq("tenant_id", tenantId);
    const { data: fcs } = await supabase.from("inv_family_codes").select("*").eq("tenant_id", tenantId);

    if (!stores?.length || !positions?.length) {
      await supabase.from("inv_allocation_runs").update({ status: "completed", completed_at: new Date().toISOString(), total_recommendations: 0, total_units: 0 }).eq("id", run.id);
      return jsonResponse({ run_id: run.id, recommendations: 0, message: "No data" });
    }

    const demandMap = buildDemandMap(demand || []);
    const fcMap = new Map((fcs || []).map((f: any) => [f.id, f]));
    const recs: any[] = [];

    for (const store of stores) {
      if (store.location_type === "central_warehouse") continue;

      const storePositions = positions.filter((p: any) => p.store_id === store.id);
      const fcIds = [...new Set(storePositions.map((p: any) => p.fc_id))];

      for (const fcId of fcIds) {
        const pos = storePositions.filter((p: any) => p.fc_id === fcId);
        const totalOnHand = pos.reduce((sum: number, p: any) => sum + (p.on_hand || 0), 0);
        const velocity = getDemandVelocity(demandMap, store.id, fcId);
        const weeksCover = velocity > 0 ? totalOnHand / (velocity * 7) : (totalOnHand > 0 ? 99 : 0);

        if (weeksCover < 2) {
          const idealQty = Math.ceil((3 - weeksCover) * velocity * 7);
          if (idealQty <= 0) continue;

          const fc = fcMap.get(fcId);
          recs.push({
            tenant_id: tenantId,
            run_id: run.id,
            fc_id: fcId,
            fc_name: fc?.fc_name || "",
            store_id: store.id,
            store_name: store.store_name,
            recommended_qty: idealQty,
            current_on_hand: totalOnHand,
            current_weeks_cover: weeksCover,
            projected_weeks_cover: velocity > 0 ? (totalOnHand + idealQty) / (velocity * 7) : 3,
            sales_velocity: velocity,
            priority: weeksCover < 0.5 ? "P1" : weeksCover < 1 ? "P2" : "P3",
            reason: `Chỉ còn ${weeksCover.toFixed(1)} tuần cover, cần bổ sung ${idealQty} units`,
            potential_revenue: idealQty * velocity * 7 * 250000,
            status: "pending",
          });
        }
      }
    }

    if (recs.length > 0) {
      await supabase.from("inv_allocation_recommendations").insert(recs);
    }

    await supabase.from("inv_allocation_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_recommendations: recs.length,
      total_units: recs.reduce((s: number, r: any) => s + r.recommended_qty, 0),
    }).eq("id", run.id);

    return jsonResponse({ run_id: run.id, recommendations: recs.length, total_units: recs.reduce((s: number, r: any) => s + r.recommended_qty, 0) });
  } catch (error) {
    await supabase.from("inv_allocation_runs").update({ status: "failed", error_message: error.message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

// Helpers
function buildConstraintMap(constraints: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const c of constraints) {
    map[c.constraint_key] = typeof c.constraint_value === "object" && c.constraint_value?.value !== undefined ? c.constraint_value.value : c.constraint_value;
  }
  return map;
}

function buildDemandMap(demand: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of demand) {
    const key = `${d.store_id}:${d.fc_id}`;
    map.set(key, d.avg_daily_sales || d.sales_velocity || 0);
  }
  return map;
}

function getDemandVelocity(demandMap: Map<string, number>, storeId: string, fcId: string): number {
  return demandMap.get(`${storeId}:${fcId}`) || 0;
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
