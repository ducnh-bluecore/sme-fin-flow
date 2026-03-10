/**
 * sync-inventory-positions
 * 
 * Pulls current inventory (onHand) from BigQuery raw_kiotviet_ProductInventories
 * and upserts into inv_state_positions, mapping:
 *   branchId → inv_stores.store_code → store_id
 *   productCode → inv_sku_fc_mapping.sku → fc_id
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
const TABLE = 'raw_kiotviet_ProductInventories';
const BQ_BATCH_SIZE = 10000;

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

async function startBqJob(accessToken: string, query: string) {
  console.log('[sync-inv] BQ query:', query.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, maxResults: BQ_BATCH_SIZE, timeoutMs: 300000 }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`BigQuery error: ${data.error.message}`);
  return data;
}

function parseBqRows(data: any): Record<string, any>[] {
  const schema = data.schema?.fields || [];
  return (data.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, i: number) => { obj[schema[i]?.name || `col_${i}`] = field.v; });
    return obj;
  });
}

async function fetchBqPage(accessToken: string, jobProjectId: string, jobId: string, pageToken: string, location: string) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${jobProjectId}/queries/${jobId}?pageToken=${pageToken}&maxResults=${BQ_BATCH_SIZE}&location=${location}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return await res.json();
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Parse optional chunk parameter (0-based, splits 44 stores into groups of CHUNK_SIZE)
  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }
  const chunk = Number(body.chunk ?? 0);
  const CHUNK_SIZE = 5; // ~5 stores per chunk to stay within CPU limit

  try {
    // 1. GCP auth
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const accessToken = await getAccessToken(JSON.parse(saJson));

    // 2. Load mappings
    const storesRes = await supabase.from('inv_stores').select('id, store_code')
      .eq('tenant_id', TENANT_ID).eq('is_active', true).limit(500);
    if (storesRes.error) throw new Error(`Stores: ${storesRes.error.message}`);
    const allStores: any[] = storesRes.data || [];
    
    // Split stores into chunks
    const chunkStores = allStores.slice(chunk * CHUNK_SIZE, (chunk + 1) * CHUNK_SIZE);
    if (!chunkStores.length) {
      return new Response(JSON.stringify({ success: true, message: 'No stores in this chunk', chunk }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const storeMap = new Map<string, string>();
    for (const s of chunkStores) storeMap.set(String(s.store_code), s.id);
    console.log(`[sync-inv] Chunk ${chunk}: processing ${storeMap.size}/${allStores.length} stores`);

    const skuToFc = new Map<string, string>();
    let skuPage = 0;
    while (true) {
      const from = skuPage * 1000;
      const { data, error } = await supabase.from('inv_sku_fc_mapping').select('sku, fc_id')
        .eq('tenant_id', TENANT_ID).eq('is_active', true).range(from, from + 999).limit(1000);
      if (error) throw new Error(`SKU map: ${error.message}`);
      if (!data?.length) break;
      for (const m of data as any[]) skuToFc.set(m.sku, m.fc_id);
      if (data.length < 1000) break;
      skuPage++;
    }
    console.log(`[sync-inv] Loaded ${storeMap.size} stores, ${skuToFc.size} SKU mappings`);

    // 3. Start BQ query
    const branchFilter = Array.from(storeMap.keys()).map(b => `'${b}'`).join(',');
    const bqQuery = `
      SELECT CAST(branchId AS STRING) AS branch_id, productCode AS product_code,
        IFNULL(onHand, 0) AS on_hand, IFNULL(reserveda, 0) AS reserved
      FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
      WHERE (isActive = 'true' OR isActive IS NULL)
        AND productCode IS NOT NULL AND productCode != ''
        AND CAST(branchId AS STRING) IN (${branchFilter})
      QUALIFY ROW_NUMBER() OVER (PARTITION BY branchId, productCode ORDER BY dw_timestamp DESC) = 1
    `;

    const today = new Date().toISOString().split('T')[0];
    let totalBqRows = 0, totalUpserted = 0, upsertErrors = 0;
    let noFc = 0, noStore = 0, skipped = 0;
    const UPSERT_BATCH = 2000;

    // Helper: map BQ rows to upsert rows and flush
    const mapAndUpsert = async (bqRows: Record<string, any>[]) => {
      const upsertRows: any[] = [];
      for (const row of bqRows) {
        const storeId = storeMap.get(row.branch_id);
        if (!storeId) { noStore++; continue; }
        const sku = row.product_code;
        if (!sku) { skipped++; continue; }
        const fcId = skuToFc.get(sku);
        if (!fcId) { noFc++; continue; }
        upsertRows.push({
          tenant_id: TENANT_ID, store_id: storeId, fc_id: fcId, sku,
          snapshot_date: today, on_hand: Math.round(Number(row.on_hand) || 0),
          reserved: Math.round(Number(row.reserved) || 0), in_transit: 0, safety_stock: 0,
        });
      }
      // Fire upserts in parallel chunks of UPSERT_BATCH
      const promises: Promise<void>[] = [];
      for (let i = 0; i < upsertRows.length; i += UPSERT_BATCH) {
        const batch = upsertRows.slice(i, i + UPSERT_BATCH);
        promises.push(
          supabase.from('inv_state_positions')
            .upsert(batch, { onConflict: 'tenant_id,store_id,sku,snapshot_date' })
            .then(({ error }: any) => {
              if (error) { console.error(`[sync-inv] Upsert err:`, error.message); upsertErrors++; }
              else { totalUpserted += batch.length; }
            })
        );
      }
      await Promise.all(promises);
    };

    // 4. Stream: fetch BQ pages and upsert as we go
    const firstPage = await startBqJob(accessToken, bqQuery);
    const firstRows = parseBqRows(firstPage);
    totalBqRows += firstRows.length;
    console.log(`[sync-inv] First page: ${firstRows.length} rows`);
    await mapAndUpsert(firstRows);
    console.log(`[sync-inv] Upserted so far: ${totalUpserted}`);

    let pageToken = firstPage.pageToken;
    const jobRef = firstPage.jobReference;
    const jobProjectId = jobRef?.projectId || PROJECT_ID;
    const jobId = jobRef?.jobId;
    const location = jobRef?.location || 'US';

    while (pageToken && jobId) {
      const pageData = await fetchBqPage(accessToken, jobProjectId, jobId, pageToken, location);
      if (pageData.error) throw new Error(`BQ page: ${pageData.error.message}`);
      const pageRows = parseBqRows(pageData);
      totalBqRows += pageRows.length;
      // Upsert this page immediately
      await mapAndUpsert(pageRows);
      console.log(`[sync-inv] Fetched ${totalBqRows}, upserted ${totalUpserted}`);
      pageToken = pageData.pageToken;
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: upsertErrors === 0, bq_rows: totalBqRows, upserted: totalUpserted,
      upsert_errors: upsertErrors, skipped: { no_store: noStore, no_fc: noFc, no_sku: skipped },
      stores: storeMap.size, sku_mappings: skuToFc.size, snapshot_date: today, duration_ms: duration,
    };
    console.log(`[sync-inv] Done in ${duration}ms. Upserted: ${totalUpserted}, Errors: ${upsertErrors}`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: upsertErrors > 0 ? 207 : 200,
    });
  } catch (err: any) {
    console.error(`[sync-inv] FATAL:`, err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
