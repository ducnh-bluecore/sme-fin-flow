/**
 * backfill-store-metrics - Aggregate store daily metrics from BigQuery KiotViet orders
 * 
 * Queries raw_kiotviet_Orders (which has BranchId/BranchName) and aggregates
 * daily transactions, revenue, customer counts per store branch.
 * Maps BranchId to inv_stores.store_code for store_id lookup.
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
const TABLE = 'raw_kiotviet_Orders';

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
      maxResults: 50000,
      timeoutMs: 120000,
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
    let dateFrom = '2024-01-01';
    let dateTo = new Date().toISOString().split('T')[0];
    
    try {
      const body = await req.json();
      if (body?.date_from) dateFrom = body.date_from;
      if (body?.date_to) dateTo = body.date_to;
    } catch { /* use defaults */ }

    // Get BigQuery access
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    // Step 1: First check what columns exist
    console.log('[store-metrics] Checking BQ schema...');
    const schemaQuery = `
      SELECT column_name 
      FROM \`${PROJECT_ID}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = '${TABLE}'
    `;
    const schemaCols = await queryBigQuery(accessToken, schemaQuery);
    const colNames = schemaCols.map(r => r.column_name);
    console.log('[store-metrics] Available columns:', colNames.join(', '));

    const hasBranchId = colNames.includes('BranchId');
    const hasBranchName = colNames.includes('BranchName');
    if (!hasBranchId) {
      // Try lowercase
      const hasLower = colNames.includes('branchId') || colNames.includes('branchid');
      if (!hasLower) {
        throw new Error('No BranchId column found in raw_kiotviet_Orders. Available: ' + colNames.join(', '));
      }
    }

    // Determine exact column names (BigQuery is case-sensitive)
    const branchIdCol = colNames.find(c => c.toLowerCase() === 'branchid') || 'BranchId';
    const branchNameCol = colNames.find(c => c.toLowerCase() === 'branchname') || 'BranchName';
    const purchaseDateCol = colNames.find(c => c.toLowerCase() === 'purchasedate') || 'PurchaseDate';
    const totalPaymentCol = colNames.find(c => c.toLowerCase() === 'totalpayment') || 'TotalPayment';
    const totalCol = colNames.find(c => c.toLowerCase() === 'total') || 'Total';
    const cusIdCol = colNames.find(c => c.toLowerCase() === 'cusid') || 'CusId';
    const statusCol = colNames.find(c => c.toLowerCase() === 'statusvalue') || 'StatusValue';
    const saleChannelCol = colNames.find(c => c.toLowerCase() === 'salechannelid') || 'SaleChannelId';

    // Step 2: Query aggregated store daily metrics from BigQuery
    console.log(`[store-metrics] Querying BQ for ${dateFrom} to ${dateTo}...`);
    
    const aggregateQuery = `
      SELECT
        CAST(${branchIdCol} AS STRING) as branch_id,
        ${branchNameCol} as branch_name,
        DATE(TIMESTAMP(${purchaseDateCol})) as metrics_date,
        COUNT(*) as total_transactions,
        SUM(COALESCE(SAFE_CAST(${totalPaymentCol} AS FLOAT64), SAFE_CAST(${totalCol} AS FLOAT64), 0)) as total_revenue,
        COUNT(DISTINCT ${cusIdCol}) as customer_count
      FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
      WHERE DATE(TIMESTAMP(${purchaseDateCol})) >= '${dateFrom}'
        AND DATE(TIMESTAMP(${purchaseDateCol})) <= '${dateTo}'
        AND LOWER(CAST(${statusCol} AS STRING)) NOT IN ('cancelled', 'voided', '4', '5')
        AND (${saleChannelCol} IS NULL
             OR SAFE_CAST(${saleChannelCol} AS INT64) NOT IN (59373, 59374, 59375, 59376, 113822))
        AND ${branchIdCol} IS NOT NULL
      GROUP BY branch_id, branch_name, metrics_date
      ORDER BY metrics_date DESC, total_revenue DESC
    `;

    const rows = await queryBigQuery(accessToken, aggregateQuery);
    console.log(`[store-metrics] Got ${rows.length} aggregated rows from BQ`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, message: 'No data found', rows_processed: 0 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 3: Get store mapping from inv_stores
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: stores, error: storesError } = await supabase
      .from('inv_stores')
      .select('id, store_code, store_name')
      .eq('tenant_id', TENANT_ID);

    if (storesError) throw storesError;

    // Build mapping: store_code → store_id
    const storeMap = new Map<string, string>();
    for (const store of (stores || [])) {
      storeMap.set(store.store_code, store.id);
    }
    console.log(`[store-metrics] Loaded ${storeMap.size} store mappings`);

    // Step 4: Upsert into store_daily_metrics in batches
    let upserted = 0;
    let skipped = 0;
    const unmappedBranches = new Set<string>();
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records: any[] = [];

      for (const row of batch) {
        const branchId = String(row.branch_id);
        const storeId = storeMap.get(branchId);
        
        if (!storeId) {
          unmappedBranches.add(`${branchId}:${row.branch_name || 'unknown'}`);
          skipped++;
          continue;
        }

        const revenue = parseFloat(row.total_revenue) || 0;
        const transactions = parseInt(row.total_transactions) || 0;

        records.push({
          tenant_id: TENANT_ID,
          store_id: storeId,
          metrics_date: row.metrics_date,
          total_transactions: transactions,
          total_revenue: revenue,
          customer_count: parseInt(row.customer_count) || 0,
          avg_transaction_value: transactions > 0 ? Math.round(revenue / transactions) : 0,
        });
      }

      if (records.length > 0) {
        const { error } = await supabase
          .from('store_daily_metrics')
          .upsert(records, { 
            onConflict: 'tenant_id,store_id,metrics_date',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`[store-metrics] Batch upsert error:`, error.message);
          // Try without unique constraint - delete + insert
          for (const rec of records) {
            await supabase
              .from('store_daily_metrics')
              .delete()
              .eq('tenant_id', rec.tenant_id)
              .eq('store_id', rec.store_id)
              .eq('metrics_date', rec.metrics_date);
          }
          const { error: insertError } = await supabase
            .from('store_daily_metrics')
            .insert(records);
          if (insertError) {
            console.error(`[store-metrics] Insert fallback error:`, insertError.message);
          } else {
            upserted += records.length;
          }
        } else {
          upserted += records.length;
        }
      }
    }

    const duration = Date.now() - startTime;
    const unmappedList = Array.from(unmappedBranches).slice(0, 20);

    console.log(`[store-metrics] Done in ${duration}ms. Upserted: ${upserted}, Skipped: ${skipped}`);
    if (unmappedList.length > 0) {
      console.log(`[store-metrics] Unmapped branches:`, unmappedList.join(', '));
    }

    return new Response(JSON.stringify({
      success: true,
      upserted,
      skipped,
      total_bq_rows: rows.length,
      duration_ms: duration,
      unmapped_branches: unmappedList,
      date_range: { from: dateFrom, to: dateTo },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[store-metrics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
