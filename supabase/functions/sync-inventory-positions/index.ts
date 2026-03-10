/**
 * sync-inventory-positions
 * 
 * Pulls current inventory (onHand) from BigQuery raw_kiotviet_ProductInventories
 * and upserts into inv_state_positions, mapping:
 *   branchId → inv_stores.store_code → store_id
 *   productCode → inv_sku_fc_mapping.sku → fc_id
 * 
 * Now supports dynamic tenant_id + resolves BQ config from DB.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const DEFAULT_PROJECT_ID = 'bluecore-dcp';
const DEFAULT_DATASET = 'olvboutique';
const DEFAULT_TABLE = 'raw_kiotviet_ProductInventories';
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

async function startBqJob(accessToken: string, projectId: string, query: string) {
  console.log('[sync-inv] BQ query:', query.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
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

// ============= Config Resolution =============

interface BqConfig {
  projectId: string;
  dataset: string;
  table: string;
  accessToken: string;
  sourceType: string; // 'kiotviet' or 'haravan'
  variantTable?: string; // for haravan JOIN
}

async function resolveBqConfig(supabase: any, tenantId: string): Promise<BqConfig> {
  let projectId = DEFAULT_PROJECT_ID;
  let dataset = DEFAULT_DATASET;
  let table = DEFAULT_TABLE;
  let sourceType = 'kiotviet';
  let variantTable: string | undefined;
  let serviceAccountJson: string | null = null;

  // 1) Check bigquery_configs for credentials_json (preferred)
  const { data: bqCfg } = await supabase
    .from('bigquery_configs')
    .select('gcp_project_id, dataset_id, credentials_json')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle();

  if (bqCfg?.gcp_project_id) projectId = bqCfg.gcp_project_id;
  if (bqCfg?.dataset_id) dataset = bqCfg.dataset_id;

  if (bqCfg?.credentials_json) {
    const creds = typeof bqCfg.credentials_json === 'string'
      ? bqCfg.credentials_json
      : JSON.stringify(bqCfg.credentials_json);
    serviceAccountJson = creds;
  }

  // 2) Check bigquery_tenant_sources for inventory_positions or inventory
  const { data: invSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, table_name, service_account_secret, mapping_overrides')
    .eq('tenant_id', tenantId)
    .in('model_type', ['inventory_positions', 'inventory'])
    .eq('is_enabled', true)
    .order('model_type') // inventory_positions first alphabetically
    .limit(1)
    .maybeSingle();

  if (invSource?.dataset) {
    dataset = invSource.dataset;
    table = invSource.table_name || DEFAULT_TABLE;
    const overrides = invSource.mapping_overrides;
    if (overrides?.source_type) sourceType = overrides.source_type;
    if (overrides?.variant_table) variantTable = overrides.variant_table;

    // Use env secret if no DB credentials
    if (!serviceAccountJson && invSource.service_account_secret) {
      const envVal = Deno.env.get(invSource.service_account_secret);
      if (envVal) serviceAccountJson = envVal;
    }
  } else {
    // Fallback: check products source
    const { data: source } = await supabase
      .from('bigquery_tenant_sources')
      .select('dataset, service_account_secret')
      .eq('tenant_id', tenantId)
      .eq('model_type', 'products')
      .eq('is_enabled', true)
      .maybeSingle();
    if (source?.dataset) dataset = source.dataset;
    if (!serviceAccountJson && source?.service_account_secret) {
      const envVal = Deno.env.get(source.service_account_secret);
      if (envVal) serviceAccountJson = envVal;
    }
  }

  // 3) Final fallback to default env secret
  if (!serviceAccountJson) {
    const envVal = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (envVal) serviceAccountJson = envVal;
  }

  if (!serviceAccountJson) throw new Error('No service account credentials found');

  console.log(`[sync-inv] Config: project=${projectId}, dataset=${dataset}, table=${table}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, table, accessToken, sourceType, variantTable };
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }
  const tenantId = body.tenant_id || DEFAULT_TENANT_ID;
  const chunk = Number(body.chunk ?? 0);
  const CHUNK_SIZE = 5;

  try {
    console.log(`[sync-inv] tenant=${tenantId}, chunk=${chunk}`);
    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // Load mappings
    const storesRes = await supabase.from('inv_stores').select('id, store_code')
      .eq('tenant_id', tenantId).eq('is_active', true).limit(500);
    if (storesRes.error) throw new Error(`Stores: ${storesRes.error.message}`);
    const allStores: any[] = storesRes.data || [];
    
    const chunkStores = allStores.slice(chunk * CHUNK_SIZE, (chunk + 1) * CHUNK_SIZE);
    if (!chunkStores.length) {
      return new Response(JSON.stringify({ success: true, message: 'No stores in this chunk', chunk, total_stores: allStores.length }), {
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
        .eq('tenant_id', tenantId).eq('is_active', true).range(from, from + 999).limit(1000);
      if (error) throw new Error(`SKU map: ${error.message}`);
      if (!data?.length) break;
      for (const m of data as any[]) skuToFc.set(m.sku, m.fc_id);
      if (data.length < 1000) break;
      skuPage++;
    }
    console.log(`[sync-inv] Loaded ${storeMap.size} stores, ${skuToFc.size} SKU mappings`);

    // Start BQ query - different SQL for KiotViet vs Haravan
    const branchFilter = Array.from(storeMap.keys()).map(b => `'${b}'`).join(',');
    let bqQuery: string;

    if (bqConfig.sourceType === 'haravan' && bqConfig.variantTable) {
      // Haravan: JOIN InventoryLocations with Product_Variants to get SKU
      bqQuery = `
        SELECT CAST(inv.loc_id AS STRING) AS branch_id, v.SKU AS product_code,
          IFNULL(inv.qty_onhand, 0) AS on_hand, IFNULL(inv.qty_commited, 0) AS reserved
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.table}\` inv
        JOIN \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.variantTable}\` v
          ON inv.variant_id = v.Id
        WHERE v.SKU IS NOT NULL AND v.SKU != ''
          AND CAST(inv.loc_id AS STRING) IN (${branchFilter})
        QUALIFY ROW_NUMBER() OVER (PARTITION BY inv.loc_id, v.SKU ORDER BY inv.dw_timestamp DESC) = 1
      `;
    } else {
      // KiotViet (default)
      bqQuery = `
        SELECT CAST(branchId AS STRING) AS branch_id, productCode AS product_code,
          IFNULL(onHand, 0) AS on_hand, IFNULL(reserveda, 0) AS reserved
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.table}\`
        WHERE (isActive = 'true' OR isActive IS NULL)
          AND productCode IS NOT NULL AND productCode != ''
          AND CAST(branchId AS STRING) IN (${branchFilter})
        QUALIFY ROW_NUMBER() OVER (PARTITION BY branchId, productCode ORDER BY dw_timestamp DESC) = 1
      `;
    }

    const today = new Date().toISOString().split('T')[0];
    let totalBqRows = 0, totalUpserted = 0, upsertErrors = 0;
    let noFc = 0, noStore = 0, skipped = 0;
    const UPSERT_BATCH = 2000;

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
          tenant_id: tenantId, store_id: storeId, fc_id: fcId, sku,
          snapshot_date: today, on_hand: Math.round(Number(row.on_hand) || 0),
          reserved: Math.round(Number(row.reserved) || 0), in_transit: 0, safety_stock: 0,
        });
      }
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

    const firstPage = await startBqJob(bqConfig.accessToken, bqConfig.projectId, bqQuery);
    const firstRows = parseBqRows(firstPage);
    totalBqRows += firstRows.length;
    console.log(`[sync-inv] First page: ${firstRows.length} rows`);
    await mapAndUpsert(firstRows);

    let pageToken = firstPage.pageToken;
    const jobRef = firstPage.jobReference;
    const jobProjectId = jobRef?.projectId || bqConfig.projectId;
    const jobId = jobRef?.jobId;
    const location = jobRef?.location || 'US';

    while (pageToken && jobId) {
      const pageData = await fetchBqPage(bqConfig.accessToken, jobProjectId, jobId, pageToken, location);
      if (pageData.error) throw new Error(`BQ page: ${pageData.error.message}`);
      const pageRows = parseBqRows(pageData);
      totalBqRows += pageRows.length;
      await mapAndUpsert(pageRows);
      console.log(`[sync-inv] Fetched ${totalBqRows}, upserted ${totalUpserted}`);
      pageToken = pageData.pageToken;
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: upsertErrors === 0, tenant_id: tenantId, bq_rows: totalBqRows, upserted: totalUpserted,
      upsert_errors: upsertErrors, skipped: { no_store: noStore, no_fc: noFc, no_sku: skipped },
      stores: storeMap.size, sku_mappings: skuToFc.size, snapshot_date: today, chunk, duration_ms: duration,
    };
    console.log(`[sync-inv] Done in ${duration}ms. Upserted: ${totalUpserted}`);

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
