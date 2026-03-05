/**
 * sync-lifecycle-batches
 * 
 * Detects inventory batches (initial stock + restocks) from BigQuery snapshot data
 * and upserts into inv_lifecycle_batches.
 * 
 * Logic:
 * - Batch 1: MAX(SUM(onHand)) within first 30 days after product_created_date
 * - Batch 2+: Detect inventory spikes (delta > RESTOCK_THRESHOLD) after initial period
 * 
 * Uses same BigQuery auth pattern as sync-inventory-positions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const PROJECT_ID = 'bluecore-dcp';
const DATASET = 'olvboutique';
const RESTOCK_THRESHOLD = 20; // Min units increase to detect restock

// ============= Auth =============

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error('Failed to get GCP access token');
  return tokenData.access_token;
}

// ============= BigQuery =============

async function runBqQuery(accessToken: string, query: string): Promise<Record<string, any>[]> {
  console.log('[lifecycle] BQ query:', query.substring(0, 300));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, maxResults: 50000, timeoutMs: 300000 }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`BigQuery error: ${data.error.message}`);

  const schema = data.schema?.fields || [];
  const rows = (data.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, i: number) => {
      obj[schema[i]?.name || `col_${i}`] = field.v;
    });
    return obj;
  });

  // Handle pagination
  let pageToken = data.pageToken;
  const jobRef = data.jobReference;
  while (pageToken && jobRef?.jobId) {
    const pageUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${jobRef.projectId || PROJECT_ID}/queries/${jobRef.jobId}?pageToken=${pageToken}&maxResults=50000&location=${jobRef.location || 'US'}`;
    const pageRes = await fetch(pageUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const pageData = await pageRes.json();
    if (pageData.error) throw new Error(`BQ page: ${pageData.error.message}`);
    const pageSchema = pageData.schema?.fields || schema;
    for (const row of (pageData.rows || [])) {
      const obj: Record<string, any> = {};
      row.f.forEach((field: any, i: number) => {
        obj[pageSchema[i]?.name || `col_${i}`] = field.v;
      });
      rows.push(obj);
    }
    pageToken = pageData.pageToken;
  }

  return rows;
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // 1. GCP auth
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const accessToken = await getAccessToken(JSON.parse(saJson));

    // 2. Load ALL FCs with product_created_date (paginated, exclude non-fashion)
    const NON_FASHION_PREFIXES = ['SP', 'GIFT', 'BAG', 'BOX', 'LB', 'BVSE', 'VC0', 'VCOLV'];
    const fcs: { id: string; fc_code: string; product_created_date: string }[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: page, error: fcErr } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code, product_created_date')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .not('product_created_date', 'is', null)
        .range(from, from + PAGE_SIZE - 1);

      if (fcErr) throw new Error(`FCs: ${fcErr.message}`);
      if (!page?.length) { hasMore = false; break; }
      
      // Filter out non-fashion items
      for (const fc of page) {
        const upper = fc.fc_code.toUpperCase();
        const isExcluded = NON_FASHION_PREFIXES.some(p => upper.startsWith(p))
          || upper.includes('BAO LI XI') || upper.includes('SO TAY')
          || upper.startsWith('333.0'); // raw materials prefix
        if (!isExcluded) fcs.push(fc);
      }

      from += PAGE_SIZE;
      if (page.length < PAGE_SIZE) hasMore = false;
    }

    if (!fcs.length) {
      return new Response(JSON.stringify({ success: true, message: 'No fashion FCs with product_created_date' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[lifecycle] Processing ${fcs.length} fashion FCs (excluded non-fashion)`);

    // Build FC code → id map
    const fcMap = new Map<string, { id: string; createdDate: string }>();
    for (const fc of fcs) {
      fcMap.set(fc.fc_code, { id: fc.id, createdDate: fc.product_created_date });
    }

    // 3. Load existing batches to avoid re-creating
    const { data: existingBatches } = await supabase
      .from('inv_lifecycle_batches')
      .select('fc_id, batch_number')
      .eq('tenant_id', TENANT_ID);

    const existingSet = new Set<string>();
    for (const b of (existingBatches || [])) {
      existingSet.add(`${b.fc_id}_${b.batch_number}`);
    }

    // 4. Query BQ: daily total on_hand per productCode
    // This gets the total system inventory per product per day
    const bqQuery = `
      SELECT 
        productCode,
        CAST(dw_timestamp AS DATE) AS snapshot_date,
        SUM(IFNULL(onHand, 0)) AS total_on_hand
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_ProductInventories\`
      WHERE productCode IS NOT NULL AND productCode != ''
      GROUP BY productCode, CAST(dw_timestamp AS DATE)
      ORDER BY productCode, snapshot_date
    `;

    const bqRows = await runBqQuery(accessToken, bqQuery);
    console.log(`[lifecycle] Got ${bqRows.length} BQ rows`);

    // 5. Group by productCode
    const byProduct = new Map<string, { date: string; qty: number }[]>();
    for (const row of bqRows) {
      const code = row.productCode;
      if (!fcMap.has(code)) continue;
      if (!byProduct.has(code)) byProduct.set(code, []);
      byProduct.get(code)!.push({
        date: row.snapshot_date,
        qty: Math.round(Number(row.total_on_hand) || 0),
      });
    }

    // 6. Detect batches for each product
    const batchRows: any[] = [];
    let batch1Count = 0;
    let restockCount = 0;

    for (const [fcCode, snapshots] of byProduct) {
      const fcInfo = fcMap.get(fcCode)!;
      const createdDate = new Date(fcInfo.createdDate);
      const thirtyDaysLater = new Date(createdDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      // Sort by date
      snapshots.sort((a, b) => a.date.localeCompare(b.date));

      // --- Batch 1: MAX on_hand in first 30 days ---
      let maxQtyFirst30 = 0;
      let maxDateFirst30 = '';
      for (const s of snapshots) {
        const d = new Date(s.date);
        if (d <= thirtyDaysLater) {
          if (s.qty > maxQtyFirst30) {
            maxQtyFirst30 = s.qty;
            maxDateFirst30 = s.date;
          }
        }
      }

      if (maxQtyFirst30 > 0 && !existingSet.has(`${fcInfo.id}_1`)) {
        batchRows.push({
          tenant_id: TENANT_ID,
          fc_id: fcInfo.id,
          batch_number: 1,
          batch_qty: maxQtyFirst30,
          batch_start_date: maxDateFirst30 || fcInfo.createdDate,
          source: 'bigquery_sync',
          is_completed: false,
        });
        batch1Count++;
      }

      // --- Batch 2+: Detect restock spikes after day 30 ---
      let batchNum = 2;
      let prevQty = 0;
      let cooldownUntil = ''; // Prevent detecting the same spike multiple days

      for (let i = 0; i < snapshots.length; i++) {
        const s = snapshots[i];
        const d = new Date(s.date);
        if (d <= thirtyDaysLater) {
          prevQty = s.qty;
          continue;
        }

        if (s.date <= cooldownUntil) {
          prevQty = s.qty;
          continue;
        }

        const delta = s.qty - prevQty;
        if (delta >= RESTOCK_THRESHOLD) {
          // Restock detected!
          if (!existingSet.has(`${fcInfo.id}_${batchNum}`)) {
            batchRows.push({
              tenant_id: TENANT_ID,
              fc_id: fcInfo.id,
              batch_number: batchNum,
              batch_qty: delta,
              batch_start_date: s.date,
              source: 'auto_detected',
              is_completed: false,
            });
            restockCount++;
          }
          batchNum++;
          // Cooldown 7 days to avoid duplicate detections from the same restock
          const cd = new Date(d);
          cd.setDate(cd.getDate() + 7);
          cooldownUntil = cd.toISOString().split('T')[0];
        }

        prevQty = s.qty;
      }
    }

    console.log(`[lifecycle] Detected ${batch1Count} initial batches, ${restockCount} restocks`);

    // 7. Upsert batches
    let upsertedCount = 0;
    let upsertErrors = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < batchRows.length; i += BATCH_SIZE) {
      const chunk = batchRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('inv_lifecycle_batches')
        .upsert(chunk, { onConflict: 'tenant_id,fc_id,batch_number' });
      if (error) {
        console.error('[lifecycle] Upsert error:', error.message);
        upsertErrors++;
      } else {
        upsertedCount += chunk.length;
      }
    }

    // 8. Populate first_sale_date from cdp_orders for batch 1
    console.log('[lifecycle] Populating first_sale_date from cdp_orders...');
    const { error: fsdErr } = await supabase.rpc('populate_first_sale_dates' as any, { p_tenant_id: TENANT_ID });
    if (fsdErr) {
      console.error('[lifecycle] first_sale_date error:', fsdErr.message);
    }

    // 9. Mark FCs with restocks
    const restockedFcIds = new Set<string>();
    for (const b of batchRows) {
      if (b.batch_number >= 2) restockedFcIds.add(b.fc_id);
    }
    if (restockedFcIds.size > 0) {
      await supabase
        .from('inv_lifecycle_batches' as any)
        .update({ is_restock: true } as any)
        .in('id', Array.from(restockedFcIds))
        .eq('tenant_id', TENANT_ID);
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: upsertErrors === 0,
      fcs_processed: byProduct.size,
      total_fcs: fcs.length,
      batch1_created: batch1Count,
      restocks_detected: restockCount,
      total_upserted: upsertedCount,
      upsert_errors: upsertErrors,
      duration_ms: duration,
    };

    console.log(`[lifecycle] Done in ${duration}ms`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: upsertErrors > 0 ? 207 : 200,
    });
  } catch (err: any) {
    console.error('[lifecycle] FATAL:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
