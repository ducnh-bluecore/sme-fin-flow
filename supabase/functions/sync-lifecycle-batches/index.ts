/**
 * sync-lifecycle-batches
 * 
 * Detects inventory batches (initial stock + restocks) from BigQuery snapshot data
 * and upserts into inv_lifecycle_batches.
 * 
 * KEY FIX: BQ productCode = SKU (e.g. 222011808FS), but inv_family_codes uses
 * fc_code = size-stripped (e.g. 222011808F). Must aggregate at FC level.
 * 
 * Logic:
 * - Batch 1: MAX(SUM(onHand across all SKUs in FC)) across all snapshot dates
 *   within first 30 days after product_created_date
 * - Batch 2+: Detect inventory spikes (delta > RESTOCK_THRESHOLD) after initial period
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
const RESTOCK_THRESHOLD = 20;

// Size suffix stripping - same as backfill-sku-fc-mapping
const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
function stripSizeFromSku(sku: string): string {
  const match = sku.match(SIZE_SUFFIXES);
  return match ? match[1] : sku;
}

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

    while (true) {
      const { data: page, error: fcErr } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code, product_created_date')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .not('product_created_date', 'is', null)
        .range(from, from + PAGE_SIZE - 1);

      if (fcErr) throw new Error(`FCs: ${fcErr.message}`);
      if (!page?.length) break;
      
      for (const fc of page) {
        const upper = fc.fc_code.toUpperCase();
        const isExcluded = NON_FASHION_PREFIXES.some(p => upper.startsWith(p))
          || upper.includes('BAO LI XI') || upper.includes('SO TAY')
          || upper.startsWith('333.0');
        if (!isExcluded) fcs.push(fc);
      }

      from += PAGE_SIZE;
      if (page.length < PAGE_SIZE) break;
    }

    if (!fcs.length) {
      return new Response(JSON.stringify({ success: true, message: 'No fashion FCs with product_created_date' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[lifecycle] Processing ${fcs.length} fashion FCs`);

    // Build FC code → id map
    const fcMap = new Map<string, { id: string; createdDate: string }>();
    for (const fc of fcs) {
      fcMap.set(fc.fc_code, { id: fc.id, createdDate: fc.product_created_date });
    }

    // 3. Load existing batches to avoid re-creating
    const existingSet = new Set<string>();
    let batchFrom = 0;
    while (true) {
      const { data: existingBatches, error: bErr } = await supabase
        .from('inv_lifecycle_batches')
        .select('fc_id, batch_number')
        .eq('tenant_id', TENANT_ID)
        .range(batchFrom, batchFrom + 999);
      if (bErr) throw new Error(`Batches: ${bErr.message}`);
      if (!existingBatches?.length) break;
      for (const b of existingBatches) {
        existingSet.add(`${b.fc_id}_${b.batch_number}`);
      }
      batchFrom += 1000;
      if (existingBatches.length < 1000) break;
    }
    console.log(`[lifecycle] Existing batches: ${existingSet.size}`);

    // 4. Query BQ: aggregate on_hand per SKU per snapshot date, summed across branches
    // We aggregate at SKU level in BQ, then strip size in JS to get FC level
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

    // 5. Group by FC code (strip size from SKU) and aggregate
    // Key: fc_code → date → total on_hand (sum of all SKUs in the FC)
    const byFc = new Map<string, Map<string, number>>();
    let matchedSkus = 0;
    let unmatchedSkus = 0;

    for (const row of bqRows) {
      const sku = row.productCode;
      const fcCode = stripSizeFromSku(sku);
      
      if (!fcMap.has(fcCode)) {
        unmatchedSkus++;
        continue;
      }
      matchedSkus++;

      if (!byFc.has(fcCode)) byFc.set(fcCode, new Map());
      const dateMap = byFc.get(fcCode)!;
      const date = row.snapshot_date;
      const qty = Math.round(Number(row.total_on_hand) || 0);
      dateMap.set(date, (dateMap.get(date) || 0) + qty);
    }

    console.log(`[lifecycle] Matched SKUs: ${matchedSkus}, Unmatched: ${unmatchedSkus}, FCs with data: ${byFc.size}`);

    // 6. Detect batches for each FC
    const batchRows: any[] = [];
    let batch1Count = 0;
    let restockCount = 0;
    let noDataInWindow = 0;

    for (const [fcCode, dateMap] of byFc) {
      const fcInfo = fcMap.get(fcCode)!;
      const createdDate = new Date(fcInfo.createdDate);
      
      // Sort snapshots by date
      const snapshots = Array.from(dateMap.entries())
        .map(([date, qty]) => ({ date, qty }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (!snapshots.length) continue;

      // --- Batch 1: Use MAX on_hand across ALL available snapshots ---
      // Since we only have ~9 snapshots (not daily), use a broader window
      // or simply the max on_hand if product is newer than earliest snapshot
      let maxQty = 0;
      let maxDate = '';
      
      // If product was created before our earliest snapshot, use the first
      // snapshot's data as proxy for initial stock (it's the best we have)
      for (const s of snapshots) {
        if (s.qty > maxQty) {
          maxQty = s.qty;
          maxDate = s.date;
        }
      }

      if (maxQty > 0 && !existingSet.has(`${fcInfo.id}_1`)) {
        batchRows.push({
          tenant_id: TENANT_ID,
          fc_id: fcInfo.id,
          batch_number: 1,
          batch_qty: maxQty,
          batch_start_date: fcInfo.createdDate, // Use product created date
          source: 'bigquery_sync',
          is_completed: false,
        });
        batch1Count++;
      } else if (maxQty === 0) {
        noDataInWindow++;
      }

      // --- Batch 2+: Detect restock spikes between consecutive snapshots ---
      let batchNum = 2;
      for (let i = 1; i < snapshots.length; i++) {
        const delta = snapshots[i].qty - snapshots[i - 1].qty;
        if (delta >= RESTOCK_THRESHOLD && !existingSet.has(`${fcInfo.id}_${batchNum}`)) {
          batchRows.push({
            tenant_id: TENANT_ID,
            fc_id: fcInfo.id,
            batch_number: batchNum,
            batch_qty: delta,
            batch_start_date: snapshots[i].date,
            source: 'auto_detected',
            is_completed: false,
          });
          restockCount++;
          batchNum++;
        }
      }
    }

    console.log(`[lifecycle] Batch 1: ${batch1Count}, Restocks: ${restockCount}, No data: ${noDataInWindow}`);

    // 7. Upsert batches in chunks
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
      if (i % 2000 === 0 && i > 0) {
        console.log(`[lifecycle] Upserted ${upsertedCount}/${batchRows.length}...`);
      }
    }

    // 8. Populate first_sale_date from cdp_orders for batch 1
    console.log('[lifecycle] Populating first_sale_date...');
    const { error: fsdErr } = await supabase.rpc('populate_first_sale_dates' as any, { p_tenant_id: TENANT_ID });
    if (fsdErr) {
      console.error('[lifecycle] first_sale_date error:', fsdErr.message);
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: upsertErrors === 0,
      fcs_with_bq_data: byFc.size,
      total_fcs: fcs.length,
      existing_batches: existingSet.size,
      batch1_created: batch1Count,
      restocks_detected: restockCount,
      total_upserted: upsertedCount,
      upsert_errors: upsertErrors,
      no_data_fcs: noDataInWindow,
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
