/**
 * backfill-demand-state - Populate inv_state_demand from BigQuery order data
 * 
 * Supports dynamic tenant_id + resolves BQ config from DB.
 * Queries Orders + OrdersLineItems to aggregate units sold per store + SKU.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get GCP access token');
  return data.access_token;
}

interface BqConfig {
  projectId: string;
  dataset: string;
  accessToken: string;
  sourceType: string;
}

async function resolveBqConfig(supabase: any, tenantId: string): Promise<BqConfig> {
  let projectId = 'bluecore-dcp';
  let dataset = 'olvboutique';
  let sourceType = 'kiotviet';
  let serviceAccountJson: string | null = null;

  const { data: bqCfg } = await supabase
    .from('bigquery_configs')
    .select('gcp_project_id, dataset_id, credentials_json')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle();

  if (bqCfg?.gcp_project_id) projectId = bqCfg.gcp_project_id;
  if (bqCfg?.dataset_id) dataset = bqCfg.dataset_id;
  if (bqCfg?.credentials_json) {
    serviceAccountJson = typeof bqCfg.credentials_json === 'string'
      ? bqCfg.credentials_json : JSON.stringify(bqCfg.credentials_json);
  }

  // Check orders source for channel info
  const { data: ordSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, channel, service_account_secret')
    .eq('tenant_id', tenantId)
    .eq('model_type', 'orders')
    .eq('is_enabled', true)
    .maybeSingle();

  if (ordSource?.dataset) dataset = ordSource.dataset;
  if (ordSource?.channel) sourceType = ordSource.channel;
  if (!serviceAccountJson && ordSource?.service_account_secret) {
    const envVal = Deno.env.get(ordSource.service_account_secret);
    if (envVal) serviceAccountJson = envVal;
  }

  if (!serviceAccountJson) {
    serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || null;
  }
  if (!serviceAccountJson) throw new Error('No service account credentials found');

  console.log(`[demand-state] Config: project=${projectId}, dataset=${dataset}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, accessToken, sourceType };
}

async function queryBigQuery(accessToken: string, projectId: string, sql: string): Promise<any[]> {
  console.log('[demand-state] BQ:', sql.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 100000, timeoutMs: 180000 }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`BigQuery error: ${data.error.message}`);
  const schema = data.schema?.fields || [];
  return (data.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((f: any, i: number) => { obj[schema[i]?.name || `col_${i}`] = f.v; });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const tenantId = body.tenant_id || DEFAULT_TENANT_ID;
    const periodStart: string = body.period_start;
    const periodEnd: string = body.period_end;

    if (!periodStart || !periodEnd) {
      return new Response(JSON.stringify({ error: 'Missing period_start or period_end' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[demand-state] tenant=${tenantId}, period ${periodStart} → ${periodEnd}`);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // Build query based on source type
    let bqQuery: string;

    if (bqConfig.sourceType === 'haravan') {
      bqQuery = `
        SELECT
          CAST(o.LocationId AS STRING) AS branch_id,
          v.Sku AS sku,
          SUM(CAST(li.Quantity AS INT64)) AS total_sold,
          COUNT(DISTINCT CAST(o.Id AS STRING)) AS order_count
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_hrv_Orders\` o
        JOIN \`${bqConfig.projectId}.${bqConfig.dataset}.raw_hrv_OrdersLineItems\` li
          ON CAST(o.Id AS STRING) = CAST(li.OrderId AS STRING)
        LEFT JOIN \`${bqConfig.projectId}.${bqConfig.dataset}.raw_hrv_Product_Variants\` v
          ON CAST(li.VariantId AS STRING) = CAST(v.Id AS STRING)
        WHERE DATE(TIMESTAMP(o.Created_at)) >= '${periodStart}'
          AND DATE(TIMESTAMP(o.Created_at)) <= '${periodEnd}'
          AND LOWER(COALESCE(o.Cancel_reason, '')) = ''
          AND o.LocationId IS NOT NULL
          AND v.Sku IS NOT NULL AND v.Sku != ''
        GROUP BY branch_id, sku
        HAVING total_sold > 0
        ORDER BY total_sold DESC
      `;
    } else {
      // KiotViet - use known column names directly (no INFORMATION_SCHEMA)
      bqQuery = `
        SELECT
          CAST(o.BranchId AS STRING) AS branch_id,
          li.ProductCode AS sku,
          SUM(CAST(li.Quantity AS INT64)) AS total_sold,
          COUNT(DISTINCT CAST(o.OrderId AS STRING)) AS order_count
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_Orders\` o
        JOIN \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_OrdersLineItems\` li
          ON CAST(o.OrderId AS STRING) = CAST(li.OrderId AS STRING)
        WHERE DATE(TIMESTAMP(o.PurchaseDate)) >= '${periodStart}'
          AND DATE(TIMESTAMP(o.PurchaseDate)) <= '${periodEnd}'
          AND LOWER(CAST(o.StatusValue AS STRING)) NOT IN ('cancelled', 'voided', '4', '5')
          AND o.BranchId IS NOT NULL
          AND li.ProductCode IS NOT NULL AND li.ProductCode != ''
        GROUP BY branch_id, sku
        HAVING total_sold > 0
        ORDER BY total_sold DESC
      `;
    }

    const rows = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, bqQuery);
    console.log(`[demand-state] Got ${rows.length} store+SKU aggregates from BQ`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: 'No data found', rows_processed: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch store mapping (store_code → store_id)
    const { data: stores } = await supabase
      .from('inv_stores')
      .select('id, store_code')
      .eq('tenant_id', tenantId);

    const storeMap = new Map<string, string>();
    for (const s of (stores || [])) {
      storeMap.set(s.store_code, s.id);
    }

    // Fetch SKU → fc_id mapping (paginated)
    const skus = [...new Set(rows.map(r => r.sku))];
    const skuFcMap = new Map<string, string>();

    for (let i = 0; i < skus.length; i += 500) {
      const chunk = skus.slice(i, i + 500);
      const { data: mappings } = await supabase
        .from('inv_sku_fc_mapping')
        .select('sku, fc_id')
        .eq('tenant_id', tenantId)
        .in('sku', chunk);

      for (const m of (mappings || [])) {
        skuFcMap.set(m.sku, m.fc_id);
      }
    }

    console.log(`[demand-state] Stores: ${storeMap.size}, SKU→FC mappings: ${skuFcMap.size}`);

    // Calculate period days
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);
    const periodDays = Math.max(1, Math.ceil((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)));

    // Build records
    let upserted = 0;
    let skippedNoStore = 0;
    let skippedNoFc = 0;
    const BATCH_SIZE = 500;

    const records: any[] = [];
    for (const row of rows) {
      const storeId = storeMap.get(String(row.branch_id));
      if (!storeId) { skippedNoStore++; continue; }

      const fcId = skuFcMap.get(row.sku);
      if (!fcId) { skippedNoFc++; continue; }

      const totalSold = parseInt(row.total_sold) || 0;
      const avgDaily = totalSold / periodDays;

      records.push({
        tenant_id: tenantId,
        store_id: storeId,
        fc_id: fcId,
        sku: row.sku,
        period_start: periodStart,
        period_end: periodEnd,
        total_sold: totalSold,
        avg_daily_sales: Math.round(avgDaily * 100) / 100,
        sales_velocity: Math.round(avgDaily * 100) / 100,
        trend: 'stable',
      });
    }

    // Upsert in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('inv_state_demand')
        .upsert(batch, {
          onConflict: 'tenant_id,store_id,sku,period_start',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[demand-state] Upsert error batch ${i}:`, error.message);
        for (const rec of batch) {
          await supabase.from('inv_state_demand').delete()
            .eq('tenant_id', rec.tenant_id).eq('store_id', rec.store_id)
            .eq('sku', rec.sku).eq('period_start', rec.period_start);
        }
        const { error: insertErr } = await supabase.from('inv_state_demand').insert(batch);
        if (!insertErr) upserted += batch.length;
        else console.error(`[demand-state] Insert fallback error:`, insertErr.message);
      } else {
        upserted += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[demand-state] Done in ${duration}ms. Upserted: ${upserted}, No store: ${skippedNoStore}, No FC: ${skippedNoFc}`);

    return new Response(JSON.stringify({
      success: true, tenant_id: tenantId,
      upserted, skipped_no_store: skippedNoStore, skipped_no_fc: skippedNoFc,
      total_bq_rows: rows.length, total_records: records.length,
      period: { start: periodStart, end: periodEnd, days: periodDays },
      duration_ms: duration,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[demand-state] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
