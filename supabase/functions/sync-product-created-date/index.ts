/**
 * sync-product-created-date
 * 
 * Fetches createdDate from BigQuery product table and updates
 * inv_family_codes.product_created_date for all FCs.
 * Supports dynamic tenant_id + resolves BQ config from DB.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function queryBigQuery(accessToken: string, projectId: string, query: string) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, maxResults: 50000, timeoutMs: 120000 }),
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

const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
function stripSizeFromSku(sku: string): string {
  const match = sku.match(SIZE_SUFFIXES);
  return match ? match[1] : sku;
}

interface BqConfig {
  projectId: string;
  dataset: string;
  accessToken: string;
  sourceType: string;
  productTable: string;
}

async function resolveBqConfig(supabase: any, tenantId: string): Promise<BqConfig> {
  let projectId = 'bluecore-dcp';
  let dataset = 'olvboutique';
  let sourceType = 'kiotviet';
  let productTable = 'raw_kiotviet_Product';
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

  // Check products source
  const { data: prodSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, table_name, channel, service_account_secret')
    .eq('tenant_id', tenantId)
    .eq('model_type', 'products')
    .eq('is_enabled', true)
    .maybeSingle();

  if (prodSource?.dataset) dataset = prodSource.dataset;
  if (prodSource?.table_name) productTable = prodSource.table_name;
  if (prodSource?.channel) sourceType = prodSource.channel;
  if (!serviceAccountJson && prodSource?.service_account_secret) {
    const envVal = Deno.env.get(prodSource.service_account_secret);
    if (envVal) serviceAccountJson = envVal;
  }

  if (!serviceAccountJson) {
    serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || null;
  }
  if (!serviceAccountJson) throw new Error('No service account credentials found');

  console.log(`[sync-created-date] Config: project=${projectId}, dataset=${dataset}, table=${productTable}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, accessToken, sourceType, productTable };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    if (!tenantId) throw new Error('tenant_id is required');

    const { error: initErr } = await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });
    if (initErr) console.warn('[sync-created-date] init_tenant_session warning:', initErr.message);

    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // Build query based on source type
    let bqQuery: string;
    if (bqConfig.sourceType === 'haravan') {
      bqQuery = `
        SELECT Sku AS sku, MIN(Created_at) AS created_date
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.productTable}\`
        WHERE Sku IS NOT NULL AND Sku != '' AND Created_at IS NOT NULL
        GROUP BY Sku
      `;
    } else {
      // KiotViet
      bqQuery = `
        SELECT code AS sku, MIN(createdDate) AS created_date
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.productTable}\`
        WHERE code IS NOT NULL AND code != '' AND createdDate IS NOT NULL
        GROUP BY code
      `;
    }

    const bqRows = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, bqQuery);
    console.log(`[sync-created-date] BQ rows: ${bqRows.length}`);

    // Group by FC code → take earliest created_date
    const fcDateMap = new Map<string, string>();
    for (const row of bqRows) {
      const fcCode = stripSizeFromSku(row.sku);
      const existing = fcDateMap.get(fcCode);
      if (!existing || row.created_date < existing) {
        fcDateMap.set(fcCode, row.created_date);
      }
    }

    // Load FCs missing product_created_date
    const PAGE = 1000;
    const allFcs: { id: string; fc_code: string }[] = [];
    let offset = 0;
    while (allFcs.length < 3000) {
      const { data, error } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code')
        .eq('tenant_id', tenantId)
        .is('product_created_date', null)
        .range(offset, offset + PAGE - 1)
        .order('fc_code');
      if (error) throw error;
      if (!data?.length) break;
      allFcs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    let updated = 0;
    const toUpdate = allFcs.filter(fc => fcDateMap.has(fc.fc_code));
    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(fc =>
        supabase.from('inv_family_codes')
          .update({ product_created_date: fcDateMap.get(fc.fc_code)!.substring(0, 10) })
          .eq('id', fc.id)
      ));
      updated += results.filter(r => !r.error).length;
    }

    return new Response(JSON.stringify({
      success: true, tenant_id: tenantId,
      bq_rows: bqRows.length, fcs_updated: updated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[sync-created-date] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
