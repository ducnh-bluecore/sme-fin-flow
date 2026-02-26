import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Non-fashion fc_code prefixes to exclude
const NON_FASHION_PREFIXES = [
  'DTR', '333', 'dichvu', 'GC', 'LB', 'RFID', 'CLI', 'SER', 'TXN', 'OBG', 'BVSE', 'VC0', 'VCOLV',
];

// Non-fashion keywords in fc_name to exclude
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

    const cwStore = stores?.find((s: any) => s.location_type === 'central_warehouse');
    const cwId = cwStore?.id || null;
    const cwName = cwStore?.store_name || 'Kho tổng';
    const retailStores = stores?.filter((s: any) => s.location_type !== 'central_warehouse') || [];

    const storeNameMap: Record<string, string> = {};
    for (const s of stores || []) {
      storeNameMap[s.id] = s.store_name || s.store_code || s.id;
    }

    // 3. Get FC data (name, category, product_created_date) - paginated
    const PAGE_SIZE = 1000;
    const fcInfoMap: Record<string, { name: string; code: string; category: string | null; createdDate: string | null }> = {};
    let fcOffset = 0;
    while (true) {
      const { data: fcs, error: fcErr } = await supabase
        .from('inv_family_codes')
        .select('id, fc_name, fc_code, category, product_created_date')
        .eq('tenant_id', tenant_id)
        .range(fcOffset, fcOffset + PAGE_SIZE - 1);
      if (fcErr) { console.error('FC fetch error:', fcErr); break; }
      if (!fcs || fcs.length === 0) break;
      for (const fc of fcs) {
        fcInfoMap[fc.id] = {
          name: fc.fc_name || fc.fc_code || fc.id,
          code: fc.fc_code || '',
          category: fc.category,
          createdDate: fc.product_created_date,
        };
      }
      if (fcs.length < PAGE_SIZE) break;
      fcOffset += PAGE_SIZE;
    }
    console.log(`Loaded ${Object.keys(fcInfoMap).length} family codes`);

    // 4. Get 2 most recent snapshot dates for velocity calculation
    const { data: snapRows } = await supabase
      .from('inv_state_positions')
      .select('snapshot_date')
      .eq('tenant_id', tenant_id)
      .order('snapshot_date', { ascending: false })
      .limit(2);
    
    if (!snapRows || snapRows.length === 0) {
      throw new Error('No inventory snapshot found');
    }
    const latestSnapshot = snapRows[0].snapshot_date;
    const prevSnapshot = snapRows.length > 1 ? snapRows[1].snapshot_date : null;
    console.log(`Latest snapshot: ${latestSnapshot}, Previous: ${prevSnapshot}`);

    // Calculate days between snapshots for velocity
    let daysBetween = 1;
    if (prevSnapshot) {
      const d1 = new Date(prevSnapshot);
      const d2 = new Date(latestSnapshot);
      daysBetween = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    }
    console.log(`Days between snapshots: ${daysBetween}`);

    // 5. Get latest positions (paginated)
    const positions: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_state_positions')
        .select('store_id, fc_id, sku, on_hand')
        .eq('tenant_id', tenant_id)
        .eq('snapshot_date', latestSnapshot)
        .gt('on_hand', 0)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      positions.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    console.log(`Latest positions: ${positions.length}`);

    // 6. Get previous snapshot positions for velocity calculation
    const prevPositions: any[] = [];
    if (prevSnapshot) {
      offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('inv_state_positions')
          .select('store_id, fc_id, on_hand')
          .eq('tenant_id', tenant_id)
          .eq('snapshot_date', prevSnapshot)
          .gt('on_hand', 0)
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        prevPositions.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    }
    console.log(`Previous positions: ${prevPositions.length}`);

    // Build previous on_hand lookup (store|fc → total on_hand)
    const prevOnHandMap = new Map<string, number>();
    for (const p of prevPositions) {
      const key = `${p.store_id}|${p.fc_id}`;
      prevOnHandMap.set(key, (prevOnHandMap.get(key) || 0) + (p.on_hand || 0));
    }

    // 7. Also get demand data as fallback
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

    const demandMap = new Map<string, any>();
    for (const d of demands) {
      demandMap.set(`${d.store_id}|${d.fc_id}`, d);
    }

    // 8. Group latest positions by store+fc
    const storeFcPositions = new Map<string, { store_id: string; fc_id: string; sku: string; on_hand: number }[]>();
    for (const p of positions) {
      const key = `${p.store_id}|${p.fc_id}`;
      if (!storeFcPositions.has(key)) storeFcPositions.set(key, []);
      storeFcPositions.get(key)!.push(p);
    }

    // 9. Identify recall candidates
    const recallSuggestions: any[] = [];
    const MIN_KEEP = 1;
    let skippedNonFashion = 0;

    for (const [key, items] of storeFcPositions) {
      const [storeId, fcId] = key.split('|');
      
      // Skip central warehouse
      if (storeId === cwId) continue;

      // Skip non-fashion items
      const fcInfo = fcInfoMap[fcId];
      if (!fcInfo) continue;
      if (isNonFashion(fcInfo.code, fcInfo.name)) {
        skippedNonFashion++;
        continue;
      }

      const totalOnHand = items.reduce((s, i) => s + (i.on_hand || 0), 0);
      if (totalOnHand <= MIN_KEEP) continue;

      // Calculate velocity from snapshot difference (units sold = prev - current, if positive)
      const prevOnHand = prevOnHandMap.get(key) || 0;
      let snapshotVelocity = 0;
      if (prevSnapshot && prevOnHand > 0) {
        const unitsSold = Math.max(0, prevOnHand - totalOnHand);
        snapshotVelocity = unitsSold / daysBetween;
      }

      // Fallback to demand data velocity
      const demand = demandMap.get(key);
      const demandVelocity = demand?.avg_daily_sales || 0;
      const totalSold = demand?.total_sold || 0;

      // Use the higher of snapshot velocity or demand velocity (more optimistic = more conservative recall)
      const velocity = Math.max(snapshotVelocity, demandVelocity);

      // DOC = Days of Cover
      const doc = velocity > 0 ? totalOnHand / velocity : 999;
      // WOC = Weeks of Cover
      const woc = velocity > 0 ? totalOnHand / (velocity * 7) : 999;

      // Product age in days
      let productAgeDays: number | null = null;
      if (fcInfo.createdDate) {
        const created = new Date(fcInfo.createdDate);
        const now = new Date();
        productAgeDays = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }

      let shouldRecall = false;
      let reason = '';
      let priority = 'P2';

      // Criteria for recall
      if (doc > 90 && totalOnHand >= 3) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `DOC = ${doc >= 999 ? '∞' : doc.toFixed(0)} ngày, velocity ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Hàng tồn quá lâu`;
        priority = 'P1';
      } else if (doc > 60 && velocity < 0.05 && totalOnHand >= 3) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `DOC = ${doc.toFixed(0)} ngày, velocity = ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Hàng bán chậm`;
        priority = 'P2';
      } else if (woc > 16 && totalOnHand >= 5) {
        shouldRecall = true;
        const ageStr = productAgeDays !== null ? `, SP tạo ${productAgeDays} ngày trước` : '';
        reason = `WOC = ${woc >= 999 ? '∞' : woc.toFixed(1)} tuần, velocity ${velocity.toFixed(3)}/ngày, đã bán ${totalSold} (30d)${ageStr}. Tồn kho vượt mức`;
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
          fc_name: fcInfo.name,
          from_location: storeId,
          from_location_name: storeNameMap[storeId] || storeId,
          from_location_type: 'retail',
          to_location: cwId,
          to_location_name: cwName,
          to_location_type: 'central_warehouse',
          qty: recallQty,
          reason,
          from_weeks_cover: woc >= 999 ? 999 : parseFloat(woc.toFixed(1)),
          to_weeks_cover: 0,
          balanced_weeks_cover: 0,
          priority,
          potential_revenue_gain: 0,
          logistics_cost_estimate: recallQty * 5000,
          net_benefit: recallQty * avgPrice * 0.1,
          status: 'pending',
        });
      }
    }

    console.log(`Recall candidates: ${recallSuggestions.length}, Skipped non-fashion: ${skippedNonFashion}`);

    // 10. Batch insert
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

    // 11. Update run
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
      skipped_non_fashion: skippedNonFashion,
      snapshot_velocity_days: daysBetween,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Recall engine error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
