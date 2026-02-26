import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, user_id } = await req.json();
    if (!tenant_id) throw new Error('tenant_id required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Create run record
    const { data: run, error: runErr } = await supabase
      .from('inv_rebalance_runs')
      .insert({
        tenant_id,
        status: 'running',
        total_suggestions: 0,
        total_units: 0,
        push_units: 0,
        lateral_units: 0,
      })
      .select('id')
      .single();
    if (runErr) throw runErr;
    const runId = run.id;

    // 2. Get active stores
    const { data: stores, error: storesErr } = await supabase
      .from('inv_stores')
      .select('id, store_name, store_code, capacity, location_type')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);
    if (storesErr) throw storesErr;

    // Find central warehouse
    const cwStore = stores?.find((s: any) => s.location_type === 'central_warehouse');
    const cwId = cwStore?.id || null;
    const cwName = cwStore?.store_name || 'Kho tổng';
    const retailStores = stores?.filter((s: any) => s.location_type !== 'central_warehouse') || [];

    // 3. Get positions for all stores (paginated)
    const PAGE_SIZE = 1000;
    const positions: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_state_positions')
        .select('store_id, fc_id, sku, on_hand')
        .eq('tenant_id', tenant_id)
        .gt('on_hand', 0)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      positions.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // 4. Get demand data (paginated)
    const demands: any[] = [];
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_state_demand')
        .select('store_id, fc_id, sku, avg_daily_sales, total_sold, sales_velocity')
        .eq('tenant_id', tenant_id)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      demands.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // Build demand lookup
    const demandMap = new Map<string, any>();
    for (const d of demands) {
      demandMap.set(`${d.store_id}|${d.fc_id}`, d);
    }

    // 5. Identify recall candidates
    const recallSuggestions: any[] = [];
    const MIN_KEEP = 1; // Keep at least 1 unit per SKU at store

    // Group positions by store+fc
    const storeFcPositions = new Map<string, { store_id: string; fc_id: string; sku: string; on_hand: number }[]>();
    for (const p of positions) {
      const key = `${p.store_id}|${p.fc_id}`;
      if (!storeFcPositions.has(key)) storeFcPositions.set(key, []);
      storeFcPositions.get(key)!.push(p);
    }

    // Get FC names (paginated - can be >1000)
    const fcNameMap: Record<string, string> = {};
    let fcOffset = 0;
    while (true) {
      const { data: fcs, error: fcErr } = await supabase
        .from('inv_family_codes')
        .select('id, fc_name, fc_code')
        .eq('tenant_id', tenant_id)
        .range(fcOffset, fcOffset + PAGE_SIZE - 1);
      if (fcErr) { console.error('FC fetch error:', fcErr); break; }
      if (!fcs || fcs.length === 0) break;
      for (const fc of fcs) {
        fcNameMap[fc.id] = fc.fc_name || fc.fc_code || fc.id;
      }
      if (fcs.length < PAGE_SIZE) break;
      fcOffset += PAGE_SIZE;
    }
    console.log(`Loaded ${Object.keys(fcNameMap).length} family codes`);

    const storeNameMap: Record<string, string> = {};
    for (const s of stores || []) {
      storeNameMap[s.id] = s.store_name || s.store_code || s.id;
    }

    for (const [key, items] of storeFcPositions) {
      const [storeId, fcId] = key.split('|');
      
      // Skip central warehouse
      if (storeId === cwId) continue;

      const totalOnHand = items.reduce((s, i) => s + (i.on_hand || 0), 0);
      if (totalOnHand <= MIN_KEEP) continue;

      const demand = demandMap.get(key);
      const avgDailySales = demand?.avg_daily_sales || 0;
      const velocity = demand?.sales_velocity || 0;
      const totalSold = demand?.total_sold || 0;

      // DOC = Days of Cover
      const doc = avgDailySales > 0 ? totalOnHand / avgDailySales : 999;
      // WOC = Weeks of Cover
      const woc = avgDailySales > 0 ? totalOnHand / (avgDailySales * 7) : 999;

      let shouldRecall = false;
      let reason = '';
      let priority = 'P2';

      // Criteria for recall
      if (doc > 90 && totalOnHand >= 3) {
        shouldRecall = true;
        reason = `DOC = ${doc.toFixed(0)} ngày (>${90}), velocity ${velocity.toFixed(3)}/day. Hàng tồn quá lâu, cần thu hồi`;
        priority = 'P1';
      } else if (doc > 60 && velocity < 0.05 && totalOnHand >= 3) {
        shouldRecall = true;
        reason = `DOC = ${doc.toFixed(0)} ngày, velocity = ${velocity.toFixed(3)}/day. Hàng bán chậm, nên thu hồi`;
        priority = 'P2';
      } else if (woc > 16 && totalOnHand >= 5) {
        shouldRecall = true;
        reason = `WOC = ${woc.toFixed(1)} tuần (>16w). Tồn kho vượt mức an toàn`;
        priority = 'P2';
      }

      if (shouldRecall && cwId) {
        const recallQty = Math.max(1, totalOnHand - MIN_KEEP);
        const avgPrice = 350000;
        
        recallSuggestions.push({
          run_id: runId,
          tenant_id,
          transfer_type: 'recall',
          fc_id: fcId,
          fc_name: fcNameMap[fcId] || fcId,
          from_location: storeId,
          from_location_name: storeNameMap[storeId] || storeId,
          from_location_type: 'retail',
          to_location: cwId,
          to_location_name: cwName,
          to_location_type: 'central_warehouse',
          qty: recallQty,
          reason,
          from_weeks_cover: woc,
          to_weeks_cover: 0,
          balanced_weeks_cover: 0,
          priority,
          potential_revenue_gain: 0,
          logistics_cost_estimate: recallQty * 5000,
          net_benefit: recallQty * avgPrice * 0.1, // 10% recovery value estimate
          status: 'pending',
        });
      }
    }

    // 6. Batch insert recall suggestions
    let insertedCount = 0;
    if (recallSuggestions.length > 0) {
      const BATCH_SIZE = 200;
      for (let i = 0; i < recallSuggestions.length; i += BATCH_SIZE) {
        const batch = recallSuggestions.slice(i, i + BATCH_SIZE);
        const { error: insErr } = await supabase
          .from('inv_rebalance_suggestions')
          .insert(batch);
        if (insErr) {
          console.error('Batch insert error:', insErr);
          continue;
        }
        insertedCount += batch.length;
      }
    }

    // 7. Update run
    const totalUnits = recallSuggestions.reduce((s, r) => s + r.qty, 0);
    await supabase
      .from('inv_rebalance_runs')
      .update({
        status: 'completed',
        total_suggestions: insertedCount,
        total_units: totalUnits,
      })
      .eq('id', runId);

    return new Response(JSON.stringify({
      success: true,
      run_id: runId,
      total_suggestions: insertedCount,
      total_units: totalUnits,
      stores_analyzed: retailStores.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Recall engine error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
