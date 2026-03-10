/**
 * sync-color-from-bigquery
 * 
 * Fetches MAU (color) attribute from BigQuery, updates inv_sku_fc_mapping.color.
 * Supports dynamic tenant_id + resolves BQ config from DB.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

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

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}

async function queryBigQuery(accessToken: string, projectId: string, sql: string): Promise<any[]> {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 50000 }),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BigQuery error: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  const fields = result.schema?.fields || [];
  return (result.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((cell: any, i: number) => { obj[fields[i].name] = cell.v; });
    return obj;
  });
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

  const { data: prodSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, channel, service_account_secret')
    .eq('tenant_id', tenantId)
    .eq('model_type', 'products')
    .eq('is_enabled', true)
    .maybeSingle();

  if (prodSource?.dataset) dataset = prodSource.dataset;
  if (prodSource?.channel) sourceType = prodSource.channel;
  if (!serviceAccountJson && prodSource?.service_account_secret) {
    const envVal = Deno.env.get(prodSource.service_account_secret);
    if (envVal) serviceAccountJson = envVal;
  }

  if (!serviceAccountJson) {
    serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || null;
  }
  if (!serviceAccountJson) throw new Error('No service account credentials found');

  console.log(`[sync-color] Config: project=${projectId}, dataset=${dataset}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, accessToken, sourceType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, dry_run = false } = await req.json();
    if (!tenant_id) throw new Error('tenant_id is required');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error: initErr } = await supabase.rpc('init_tenant_session', { p_tenant_id: tenant_id });
    if (initErr) console.warn('[sync-color] init_tenant_session warning:', initErr.message);

    const bqConfig = await resolveBqConfig(supabase, tenant_id);

    // Build query based on source type
    let colorSql: string;
    if (bqConfig.sourceType === 'haravan') {
      // Haravan: color might be in product options or tags - skip if not available
      return new Response(JSON.stringify({
        success: true, message: 'Color sync not yet supported for Haravan source', tenant_id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // KiotViet: MAU attribute
      colorSql = `
        SELECT DISTINCT p.code AS sku, a.attributeValue AS color
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_ProductAttributes\` a
        JOIN \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_Product\` p ON a.productId = p.id
        WHERE a.attributeName = 'MAU' AND a.attributeValue IS NOT NULL AND p.code IS NOT NULL
      `;
    }

    console.log('Fetching color data from BigQuery...');
    const colorData = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, colorSql);
    console.log(`Fetched ${colorData.length} SKU-color mappings`);

    const skuColorMap = new Map<string, string>();
    colorData.forEach(row => {
      if (!skuColorMap.has(row.sku)) skuColorMap.set(row.sku, row.color);
    });

    const uniqueMappings = [...skuColorMap.entries()].map(([sku, color]) => ({ sku, color }));

    if (dry_run) {
      const colorSummary: Record<string, number> = {};
      uniqueMappings.forEach(r => { colorSummary[r.color] = (colorSummary[r.color] || 0) + 1; });
      return new Response(JSON.stringify({
        success: true, dry_run: true, tenant_id,
        total_unique_sku_mappings: uniqueMappings.length, color_summary: colorSummary,
        sample: uniqueMappings.slice(0, 20),
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const BATCH_SIZE = 500;
    let totalUpdated = 0;
    for (let i = 0; i < uniqueMappings.length; i += BATCH_SIZE) {
      const batch = uniqueMappings.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.rpc('batch_update_sku_color', { updates: batch });
      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      } else {
        const batchUpdated = (data as any)?.updated || 0;
        totalUpdated += batchUpdated;
      }
    }

    return new Response(JSON.stringify({
      success: true, tenant_id,
      summary: {
        bigquery_mappings: colorData.length, unique_sku_mappings: uniqueMappings.length,
        rows_updated: totalUpdated,
        unique_colors: [...new Set(uniqueMappings.map(r => r.color))].sort(),
      },
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
