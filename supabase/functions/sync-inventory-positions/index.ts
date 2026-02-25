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

async function queryBigQuery(
  accessToken: string,
  query: string,
): Promise<{ rows: Record<string, any>[]; totalRows: number }> {
  console.log('[sync-inv] BQ query:', query.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: BQ_BATCH_SIZE,
      timeoutMs: 120000,
    }),
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
  return { rows, totalRows: parseInt(data.totalRows || '0', 10) };
}

// ============= Paginated BigQuery =============

async function queryAllPages(
  accessToken: string,
  baseQuery: string,
): Promise<Record<string, any>[]> {
  const allRows: Record<string, any>[] = [];
  let offset = 0;
  while (true) {
    const paginated = `${baseQuery} LIMIT ${BQ_BATCH_SIZE} OFFSET ${offset}`;
    const { rows } = await queryBigQuery(accessToken, paginated);
    if (!rows.length) break;
    allRows.push(...rows);
    console.log(`[sync-inv] Fetched ${allRows.length} rows so far...`);
    if (rows.length < BQ_BATCH_SIZE) break;
    offset += BQ_BATCH_SIZE;
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
    const PAGE_SIZE = 5000;
    let skuOffset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_sku_fc_mapping')
        .select('sku, fc_id')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .range(skuOffset, skuOffset + PAGE_SIZE - 1);
      if (error) throw new Error(`SKU map fetch error: ${error.message}`);
      if (!data?.length) break;
      for (const m of data as any[]) skuToFc.set(m.sku, m.fc_id);
      if (data.length < PAGE_SIZE) break;
      skuOffset += PAGE_SIZE;
    }

    console.log(`[sync-inv] Loaded ${storeMap.size} stores, ${skuToFc.size} SKU mappings`);

    // 3. Query BigQuery - all active product inventories
    const bqQuery = `
      SELECT 
        CAST(branchId AS STRING) AS branch_id,
        productCode AS product_code,
        IFNULL(onHand, 0) AS on_hand,
        IFNULL(reserveda, 0) AS reserved
      FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
      WHERE isActive = 'true' OR isActive IS NULL
      ORDER BY branchId, productCode
    `;

    const bqRows = await queryAllPages(accessToken, bqQuery);
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
    const UPSERT_BATCH = 500;
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
