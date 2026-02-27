import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NON_FASHION_PREFIXES = [
  'DTR', '333', 'dichvu', 'GC', 'LB', 'RFID', 'CLI', 'SER', 'TXN', 'OBG', 'BVSE', 'VC0', 'VCOLV',
];

const NON_FASHION_KEYWORDS = [
  'nhãn dệt', 'nhãn det', 'nhan det', 'tags rfid', 'tag rfid',
  'dịch vụ', 'dich vu', 'điều trị', 'dieu tri',
  'voucher', 'gift card', 'thank you card', 'card valentine',
  'móc đầm', 'móc kẹp', 'móc nhựa', 'moc dam', 'moc kep',
  'giấy pelure', 'giay pelure', 'túi biodegrade', 'tui biodegrade',
  'túi giấy', 'tui giay', 'serum', 'cream', 'obagi',
  'quà tặng không bán', 'gift olv',
];

function isNonFashion(fcCode: string, fcName: string): boolean {
  const codeUpper = fcCode.toUpperCase();
  for (const prefix of NON_FASHION_PREFIXES) {
    if (codeUpper.startsWith(prefix.toUpperCase())) return true;
  }
  const nameLower = fcName.toLowerCase();
  for (const kw of NON_FASHION_KEYWORDS) {
    if (nameLower.includes(kw)) return true;
  }
  return false;
}

interface FcTierRange { max_fc: number; tiers: string[] }

function getEligibleRecallTiers(systemFcTotal: number, ranges: FcTierRange[]): string[] {
  for (const r of ranges) {
    if (systemFcTotal <= r.max_fc) return r.tiers;
  }
  return [];
}

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
      .insert({ tenant_id, status: 'running', total_suggestions: 0, total_units: 0, push_units: 0, lateral_units: 0 })
      .select('id').single();
    if (runErr) throw runErr;
    const runId = run.id;

    // 2. Load constraints
    const { data: constraintRows } = await supabase
      .from('inv_constraint_registry')
      .select('constraint_key,constraint_value')
      .eq('tenant_id', tenant_id).eq('is_active', true);
    
    const cm: Record<string, any> = {};
    for (const c of constraintRows || []) cm[c.constraint_key] = c.constraint_value;

    const bstNewAgeDays = cm.bst_new_age_days?.days ?? 60;
    const slowSellWeeks = cm.slow_sell_observation_weeks?.weeks ?? 2;
    const recallTierRanges: FcTierRange[] = cm.fc_recall_tier_rules?.ranges || [];

    // 3. Get stores
    const { data: stores } = await supabase
      .from('inv_stores')
      .select('id, store_name, store_code, capacity, location_type, tier')
      .eq('tenant_id', tenant_id).eq('is_active', true);

    const cwStore = stores?.find((s: any) => s.location_type === 'central_warehouse');
    const cwId = cwStore?.id || null;
    const cwName = cwStore?.store_name || 'Kho tổng';
    const retailStores = stores?.filter((s: any) => s.location_type !== 'central_warehouse') || [];
    const storeNameMap: Record<string, string> = {};
    const storeTierMap: Record<string, string> = {};
    for (const s of stores || []) {
      storeNameMap[s.id] = s.store_name || s.store_code || s.id;
      storeTierMap[s.id] = s.tier || '';
    }

    // 4. Get FC data
    const PAGE_SIZE = 1000;
    const fcInfoMap: Record<string, { name: string; code: string; category: string | null; createdDate: string | null; isRestock: boolean }> = {};
    let fcOffset = 0;
    while (true) {
      const { data: fcs, error: fcErr } = await supabase
        .from('inv_family_codes')
        .select('id, fc_name, fc_code, category, product_created_date, is_restock, restock_confirmed_at')
        .eq('tenant_id', tenant_id)
        .range(fcOffset, fcOffset + PAGE_SIZE - 1);
      if (fcErr) break;
      if (!fcs || fcs.length === 0) break;
      for (const fc of fcs) {
        fcInfoMap[fc.id] = {
          name: fc.fc_name || fc.fc_code || fc.id,
          code: fc.fc_code || '',
          category: fc.category,
          createdDate: fc.product_created_date,
          isRestock: fc.is_restock === true && fc.restock_confirmed_at != null,
        };
      }
      if (fcs.length < PAGE_SIZE) break;
      fcOffset += PAGE_SIZE;
    }

    // 5. Snapshots
    const { data: snapRows } = await supabase
      .from('inv_state_positions')
      .select('snapshot_date')
      .eq('tenant_id', tenant_id)
      .order('snapshot_date', { ascending: false }).limit(2);
    
    if (!snapRows || snapRows.length === 0) throw new Error('No inventory snapshot found');
    const latestSnapshot = snapRows[0].snapshot_date;
    const prevSnapshot = snapRows.length > 1 ? snapRows[1].snapshot_date : null;
    let daysBetween = 1;
    if (prevSnapshot) {
      daysBetween = Math.max(1, Math.round((new Date(latestSnapshot).getTime() - new Date(prevSnapshot).getTime()) / 86400000));
    }

    // 6. Positions
    const positions: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.from('inv_state_positions')
        .select('store_id, fc_id, sku, on_hand, in_transit')
        .eq('tenant_id', tenant_id).eq('snapshot_date', latestSnapshot).gt('on_hand', 0)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      positions.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // Previous positions for velocity
    const prevPositions: any[] = [];
    if (prevSnapshot) {
      offset = 0;
      while (true) {
        const { data, error } = await supabase.from('inv_state_positions')
          .select('store_id, fc_id, on_hand')
          .eq('tenant_id', tenant_id).eq('snapshot_date', prevSnapshot).gt('on_hand', 0)
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        prevPositions.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    }

    const prevOnHandMap = new Map<string, number>();
    for (const p of prevPositions) {
      const key = `${p.store_id}|${p.fc_id}`;
      prevOnHandMap.set(key, (prevOnHandMap.get(key) || 0) + (p.on_hand || 0));
    }

    // 7. Demand data
    const demands: any[] = [];
    offset = 0;
    while (true) {
      const { data, error } = await supabase.from('inv_state_demand')
        .select('store_id, fc_id, avg_daily_sales, total_sold, sales_velocity')
        .eq('tenant_id', tenant_id)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      demands.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    const demandMap = new Map<string, any>();
    for (const d of demands) demandMap.set(`${d.store_id}|${d.fc_id}`, d);

    // 8. Build system FC stock for tier filtering
    const systemFcStock = new Map<string, number>();
    for (const p of positions) {
      systemFcStock.set(p.fc_id, (systemFcStock.get(p.fc_id) || 0) + (p.on_hand || 0));
    }

    // 9. Group positions by store+fc
    const storeFcPositions = new Map<string, any[]>();
    for (const p of positions) {
      const key = `${p.store_id}|${p.fc_id}`;
      if (!storeFcPositions.has(key)) storeFcPositions.set(key, []);
      storeFcPositions.get(key)!.push(p);
    }

    // 10. Identify recall candidates
    const recallSuggestions: any[] = [];
    const MIN_KEEP = 1;
    let skippedNonFashion = 0;

    for (const [key, items] of storeFcPositions) {
      const [storeId, fcId] = key.split('|');
      if (storeId === cwId) continue;

      const fcInfo = fcInfoMap[fcId];
      if (!fcInfo) continue;
      if (isNonFashion(fcInfo.code, fcInfo.name)) { skippedNonFashion++; continue; }

      // ── Exclusion: BST mới (age < bstNewAgeDays) ──
      if (fcInfo.createdDate) {
        const ageDays = Math.round((Date.now() - new Date(fcInfo.createdDate).getTime()) / 86400000);
        if (ageDays < bstNewAgeDays) continue;
      }

      // ── Exclusion: Hàng restock ──
      if (fcInfo.isRestock) continue;

      // ── Exclusion: Hàng đang chuyển đến ──
      const hasInTransit = items.some(i => (i.in_transit || 0) > 0);
      if (hasInTransit) continue;

      const totalOnHand = items.reduce((s: number, i: any) => s + (i.on_hand || 0), 0);
      if (totalOnHand <= MIN_KEEP) continue;

      // Velocity calculation
      const prevOnHand = prevOnHandMap.get(key) || 0;
      let snapshotVelocity = 0;
      if (prevSnapshot && prevOnHand > 0) {
        snapshotVelocity = Math.max(0, prevOnHand - totalOnHand) / daysBetween;
      }
      const demand = demandMap.get(key);
      const demandVelocity = demand?.avg_daily_sales || 0;
      const totalSold = demand?.total_sold || 0;
      const velocity = Math.max(snapshotVelocity, demandVelocity);

      const doc = velocity > 0 ? totalOnHand / velocity : 999;
      const woc = velocity > 0 ? totalOnHand / (velocity * 7) : 999;

      let productAgeDays: number | null = null;
      if (fcInfo.createdDate) {
        productAgeDays = Math.round((Date.now() - new Date(fcInfo.createdDate).getTime()) / 86400000);
      }

      // ── FC-tier based recall filtering ──
      const storeTier = storeTierMap[storeId] || '';
      if (recallTierRanges.length > 0 && storeTier) {
        const fcTotal = systemFcStock.get(fcId) || 0;
        const eligibleTiers = getEligibleRecallTiers(fcTotal, recallTierRanges);
        if (!eligibleTiers.includes(storeTier)) continue;
      }

      let shouldRecall = false;
      let reason = '';
      let priority = 'P2';
      let actionCategory: string | null = null;

      // ── Action classification ──
      const sellThroughRate = velocity;
      const isSlowSelling = velocity < 0.05 && totalOnHand >= 3;
      const isSlowExtended = isSlowSelling && productAgeDays !== null && productAgeDays > 90;

      if (doc > 90 && totalOnHand >= 3) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `DOC = ${doc >= 999 ? '∞' : doc.toFixed(0)} ngày, velocity ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Hàng tồn quá lâu`;
        priority = 'P1';
        actionCategory = isSlowExtended ? 'slow_extended' : 'slow_selling';
      } else if (doc > 60 && velocity < 0.05 && totalOnHand >= 3) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `DOC = ${doc.toFixed(0)} ngày, velocity = ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Hàng bán chậm`;
        priority = 'P2';
        actionCategory = 'slow_selling';
      } else if (woc > 16 && totalOnHand >= 5) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `WOC = ${woc >= 999 ? '∞' : woc.toFixed(1)} tuần, velocity ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Tồn kho vượt mức`;
        priority = 'P2';
        actionCategory = 'slow_extended';
      }

      if (shouldRecall && cwId) {
        const recallQty = Math.max(1, totalOnHand - MIN_KEEP);
        const avgPrice = 350000;
        recallSuggestions.push({
          run_id: runId, tenant_id,
          transfer_type: 'recall', fc_id: fcId, fc_name: fcInfo.name,
          from_location: storeId, from_location_name: storeNameMap[storeId] || storeId,
          from_location_type: 'retail',
          to_location: cwId, to_location_name: cwName, to_location_type: 'central_warehouse',
          qty: recallQty, reason,
          from_weeks_cover: woc >= 999 ? 999 : parseFloat(woc.toFixed(1)),
          to_weeks_cover: 0, balanced_weeks_cover: 0,
          priority,
          potential_revenue_gain: 0,
          logistics_cost_estimate: recallQty * 5000,
          net_benefit: recallQty * avgPrice * 0.1,
          status: 'pending',
          action_category: actionCategory,
        });
      }
    }

    console.log(`Recall candidates: ${recallSuggestions.length}, Skipped non-fashion: ${skippedNonFashion}`);

    // 11. Batch insert
    let insertedCount = 0;
    if (recallSuggestions.length > 0) {
      const BATCH_SIZE = 200;
      for (let i = 0; i < recallSuggestions.length; i += BATCH_SIZE) {
        const batch = recallSuggestions.slice(i, i + BATCH_SIZE);
        const { error: insErr } = await supabase.from('inv_rebalance_suggestions').insert(batch);
        if (insErr) { console.error('Batch insert error:', insErr); continue; }
        insertedCount += batch.length;
      }
    }

    const totalUnits = recallSuggestions.reduce((s, r) => s + r.qty, 0);
    await supabase.from('inv_rebalance_runs').update({
      status: 'completed', total_suggestions: insertedCount, total_units: totalUnits,
    }).eq('id', runId);

    return new Response(JSON.stringify({
      success: true, run_id: runId,
      total_suggestions: insertedCount, total_units: totalUnits,
      stores_analyzed: retailStores.length, skipped_non_fashion: skippedNonFashion,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Recall engine error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
