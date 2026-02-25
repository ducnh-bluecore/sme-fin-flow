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

async function queryBigQueryAll(
  accessToken: string,
  query: string,
): Promise<Record<string, any>[]> {
  console.log('[sync-inv] BQ query:', query.substring(0, 200));
  
  // Start query job
  const jobUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const response = await fetch(jobUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: BQ_BATCH_SIZE,
      timeoutMs: 300000,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`BigQuery error: ${data.error.message}`);

  const schema = data.schema?.fields || [];
  const parseRows = (rows: any[]) =>
    rows.map((row: any) => {
      const obj: Record<string, any> = {};
      row.f.forEach((field: any, i: number) => {
        obj[schema[i]?.name || `col_${i}`] = field.v;
      });
      return obj;
    });

  const allRows = parseRows(data.rows || []);
  console.log(`[sync-inv] First page: ${allRows.length} rows`);

  // Fetch remaining pages using pageToken (no re-execution)
  let pageToken = data.pageToken;
  const jobRef = data.jobReference;
  const jobProjectId = jobRef?.projectId || PROJECT_ID;
  const jobId = jobRef?.jobId;
  
  while (pageToken && jobId) {
    const pageUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${jobProjectId}/queries/${jobId}?pageToken=${pageToken}&maxResults=${BQ_BATCH_SIZE}&location=${jobRef?.location || 'US'}`;
    const pageRes = await fetch(pageUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const pageData = await pageRes.json();
    if (pageData.error) throw new Error(`BQ page error: ${pageData.error.message}`);
    
    const pageRows = parseRows(pageData.rows || []);
    allRows.push(...pageRows);
    console.log(`[sync-inv] Fetched ${allRows.length} rows so far...`);
    pageToken = pageData.pageToken;
  }

  return allRows;
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. GCP auth
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const serviceAccount = JSON.parse(saJson);
    const accessToken = await getAccessToken(serviceAccount);

    // 2. Load mappings from Supabase (paginated)
    const storesRes = await supabase
      .from('inv_stores')
      .select('id, store_code')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .limit(500);
    if (storesRes.error) throw new Error(`Stores fetch error: ${storesRes.error.message}`);

    const storeMap = new Map<string, string>();
    for (const s of (storesRes.data || []) as any[]) {
      storeMap.set(String(s.store_code), s.id);
    }

    // Paginated SKU mapping load
    const skuToFc = new Map<string, string>();
    const PAGE_SIZE = 1000;
    let skuPage = 0;
    while (true) {
      const from = skuPage * PAGE_SIZE;
      const { data, error } = await supabase
        .from('inv_sku_fc_mapping')
        .select('sku, fc_id')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .range(from, from + PAGE_SIZE - 1)
        .limit(PAGE_SIZE);
      if (error) throw new Error(`SKU map fetch error: ${error.message}`);
      if (!data?.length) break;
      for (const m of data as any[]) skuToFc.set(m.sku, m.fc_id);
      if (data.length < PAGE_SIZE) break;
      skuPage++;
    }

    console.log(`[sync-inv] Loaded ${storeMap.size} stores, ${skuToFc.size} SKU mappings`);

    // 3. Query BigQuery - latest active product inventories (deduped)
    // Filter known branch IDs to reduce data volume
    const branchIds = Array.from(storeMap.keys());
    const branchFilter = branchIds.map(b => `'${b}'`).join(',');
    
    const bqQuery = `
      SELECT 
        CAST(branchId AS STRING) AS branch_id,
        productCode AS product_code,
        IFNULL(onHand, 0) AS on_hand,
        IFNULL(reserveda, 0) AS reserved
      FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
      WHERE (isActive = 'true' OR isActive IS NULL)
        AND productCode IS NOT NULL AND productCode != ''
        AND CAST(branchId AS STRING) IN (${branchFilter})
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY branchId, productCode 
        ORDER BY dw_timestamp DESC
      ) = 1
    `;

    const bqRows = await queryBigQueryAll(accessToken, bqQuery);
    console.log(`[sync-inv] Total BQ rows: ${bqRows.length}`);

    // 4. Map & aggregate by (store_id, sku, fc_id)
    const today = new Date().toISOString().split('T')[0];
    let skipped = 0;
    let noStore = 0;
    let noFc = 0;

    const upsertRows: any[] = [];

    for (const row of bqRows) {
      const storeId = storeMap.get(row.branch_id);
      if (!storeId) { noStore++; continue; }

      const sku = row.product_code;
      if (!sku) { skipped++; continue; }

      const fcId = skuToFc.get(sku);
      if (!fcId) { noFc++; continue; }

      const onHand = Math.round(Number(row.on_hand) || 0);
      const reserved = Math.round(Number(row.reserved) || 0);

      upsertRows.push({
        tenant_id: TENANT_ID,
        store_id: storeId,
        fc_id: fcId,
        sku,
        snapshot_date: today,
        on_hand: onHand,
        reserved,
        in_transit: 0,
        safety_stock: 0,
      });
    }

    console.log(`[sync-inv] Mapped ${upsertRows.length} rows. Skipped: noStore=${noStore}, noFc=${noFc}, noSku=${skipped}`);

    // 5. Batch upsert into inv_state_positions
    const UPSERT_BATCH = 2000;
    let totalUpserted = 0;
    let upsertErrors = 0;

    // First, delete old snapshot for today to avoid stale SKUs
    await supabase
      .from('inv_state_positions')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .eq('snapshot_date', today);

    for (let i = 0; i < upsertRows.length; i += UPSERT_BATCH) {
      const batch = upsertRows.slice(i, i + UPSERT_BATCH);
      const { error } = await supabase
        .from('inv_state_positions')
        .upsert(batch, { onConflict: 'tenant_id,store_id,sku,snapshot_date' });

      if (error) {
        console.error(`[sync-inv] Upsert batch error at ${i}:`, error.message);
        upsertErrors++;
      } else {
        totalUpserted += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: upsertErrors === 0,
      bq_rows: bqRows.length,
      mapped_rows: upsertRows.length,
      upserted: totalUpserted,
      upsert_errors: upsertErrors,
      skipped: { no_store: noStore, no_fc: noFc, no_sku: skipped },
      stores_loaded: storeMap.size,
      sku_mappings_loaded: skuToFc.size,
      snapshot_date: today,
      duration_ms: duration,
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
