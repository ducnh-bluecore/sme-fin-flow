/**
 * backfill-demand-state - Populate inv_state_demand from BigQuery order data
 * 
 * Queries raw_kiotviet_Orders + OrdersLineItems to aggregate
 * units sold per store + SKU for a given period window.
 * Maps BranchId → inv_stores.store_code, SKU → inv_sku_fc_mapping.fc_id
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
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}

// ============= BigQuery Query =============

async function queryBigQuery(accessToken: string, query: string): Promise<any[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: 100000,
      timeoutMs: 180000,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`BigQuery error: ${data.error.message}`);

  const schema = data.schema?.fields || [];
  return (data.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, index: number) => {
      obj[schema[index]?.name || `col_${index}`] = field.v;
    });
    return obj;
  });
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const periodStart: string = body.period_start; // e.g. '2025-12-11'
    const periodEnd: string = body.period_end;     // e.g. '2026-01-09'

    if (!periodStart || !periodEnd) {
      return new Response(JSON.stringify({ error: 'Missing period_start or period_end' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[demand-state] Backfilling period ${periodStart} → ${periodEnd}`);

    // Get BigQuery access
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    // Step 1: Detect exact column names (BigQuery is case-sensitive)
    const ordersTable = 'raw_kiotviet_Orders';
    const itemsTable = 'raw_kiotviet_OrdersLineItems';

    const [orderCols, itemCols] = await Promise.all([
      queryBigQuery(accessToken, `SELECT column_name FROM \`${PROJECT_ID}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${ordersTable}'`),
      queryBigQuery(accessToken, `SELECT column_name FROM \`${PROJECT_ID}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${itemsTable}'`),
    ]);

    const oNames = orderCols.map(r => r.column_name);
    const iNames = itemCols.map(r => r.column_name);

    const findCol = (names: string[], target: string) => names.find(c => c.toLowerCase() === target.toLowerCase()) || target;

    const oOrderId = findCol(oNames, 'OrderId');
    const oBranchId = findCol(oNames, 'BranchId');
    const oPurchaseDate = findCol(oNames, 'PurchaseDate');
    const oStatusValue = findCol(oNames, 'StatusValue');
    const oSaleChannelId = findCol(oNames, 'SaleChannelId');
    const iOrderId = findCol(iNames, 'OrderId');
    const iProductCode = findCol(iNames, 'ProductCode');
    const iQuantity = findCol(iNames, 'Quantity');

    console.log(`[demand-state] Order cols: ${oOrderId}, ${oBranchId}. Item cols: ${iOrderId}, ${iProductCode}`);

    // Step 2: Query aggregated qty sold per BranchId + SKU
    const bqQuery = `
      SELECT
        CAST(o.${oBranchId} AS STRING) AS branch_id,
        li.${iProductCode} AS sku,
        SUM(CAST(li.${iQuantity} AS INT64)) AS total_sold,
        COUNT(DISTINCT CAST(o.${oOrderId} AS STRING)) AS order_count
      FROM \`${PROJECT_ID}.${DATASET}.${ordersTable}\` o
      JOIN \`${PROJECT_ID}.${DATASET}.${itemsTable}\` li
        ON CAST(o.${oOrderId} AS STRING) = CAST(li.${iOrderId} AS STRING)
      WHERE DATE(TIMESTAMP(o.${oPurchaseDate})) >= '${periodStart}'
        AND DATE(TIMESTAMP(o.${oPurchaseDate})) <= '${periodEnd}'
        AND LOWER(CAST(o.${oStatusValue} AS STRING)) NOT IN ('cancelled', 'voided', '4', '5')
        AND (o.${oSaleChannelId} IS NULL
             OR SAFE_CAST(o.${oSaleChannelId} AS INT64) NOT IN (59373, 59374, 59375, 59376, 113822))
        AND o.${oBranchId} IS NOT NULL
        AND li.${iProductCode} IS NOT NULL
      GROUP BY branch_id, sku
      HAVING total_sold > 0
      ORDER BY total_sold DESC
    `;

    console.log(`[demand-state] BQ Query (first 200 chars):`, bqQuery.substring(0, 200));
    const rows = await queryBigQuery(accessToken, bqQuery);
    console.log(`[demand-state] Got ${rows.length} store+SKU aggregates from BQ`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: 'No data found', rows_processed: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get store mapping and SKU→FC mapping from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch store mapping (store_code → store_id)
    const { data: stores } = await supabase
      .from('inv_stores')
      .select('id, store_code')
      .eq('tenant_id', TENANT_ID);
    
    const storeMap = new Map<string, string>();
    for (const s of (stores || [])) {
      storeMap.set(s.store_code, s.id);
    }

    // Fetch SKU → fc_id mapping
    const skus = [...new Set(rows.map(r => r.sku))];
    const skuFcMap = new Map<string, string>();
    
    // Batch fetch in chunks of 500
    for (let i = 0; i < skus.length; i += 500) {
      const chunk = skus.slice(i, i + 500);
      const { data: mappings } = await supabase
        .from('inv_sku_fc_mapping')
        .select('sku, fc_id')
        .eq('tenant_id', TENANT_ID)
        .in('sku', chunk);
      
      for (const m of (mappings || [])) {
        skuFcMap.set(m.sku, m.fc_id);
      }
    }

    console.log(`[demand-state] Stores: ${storeMap.size}, SKU→FC mappings: ${skuFcMap.size}`);

    // Calculate period days for avg_daily_sales
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
        tenant_id: TENANT_ID,
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
        // Fallback: delete + insert
        for (const rec of batch) {
          await supabase
            .from('inv_state_demand')
            .delete()
            .eq('tenant_id', rec.tenant_id)
            .eq('store_id', rec.store_id)
            .eq('sku', rec.sku)
            .eq('period_start', rec.period_start);
        }
        const { error: insertErr } = await supabase
          .from('inv_state_demand')
          .insert(batch);
        if (!insertErr) upserted += batch.length;
        else console.error(`[demand-state] Insert fallback error:`, insertErr.message);
      } else {
        upserted += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[demand-state] Done in ${duration}ms. Upserted: ${upserted}, Skipped (no store): ${skippedNoStore}, Skipped (no FC): ${skippedNoFc}`);

    return new Response(JSON.stringify({
      success: true,
      upserted,
      skipped_no_store: skippedNoStore,
      skipped_no_fc: skippedNoFc,
      total_bq_rows: rows.length,
      total_records: records.length,
      period: { start: periodStart, end: periodEnd, days: periodDays },
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[demand-state] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
