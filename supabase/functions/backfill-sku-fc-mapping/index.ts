/**
 * backfill-sku-fc-mapping
 * 
 * Fetches all productCodes from BigQuery inventory table,
 * finds missing SKUs not in inv_sku_fc_mapping, strips size suffix to derive
 * fc_code, finds or creates inv_family_codes, then inserts mappings.
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

// ============= Auth =============

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
  console.log('[backfill-sku] BQ:', query.substring(0, 200));
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

// ============= Size Stripping =============

const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
const NON_FASHION_PREFIXES = ['BAG', 'BOX', 'TAG', 'TUI', 'HOP', 'GIFT'];

function stripSizeFromSku(sku: string): string {
  const match = sku.match(SIZE_SUFFIXES);
  if (match) return match[1];
  return sku;
}

function isNonFashion(sku: string): boolean {
  const upper = sku.toUpperCase();
  return NON_FASHION_PREFIXES.some(p => upper.startsWith(p));
}

// ============= Config Resolution =============

interface BqConfig {
  projectId: string;
  dataset: string;
  table: string;
  accessToken: string;
}

async function resolveBqConfig(supabase: any, tenantId: string): Promise<BqConfig> {
  let projectId = DEFAULT_PROJECT_ID;
  let dataset = DEFAULT_DATASET;
  let table = DEFAULT_TABLE;
  let saSecretName = 'GOOGLE_SERVICE_ACCOUNT_JSON';

  const { data: config } = await supabase
    .from('bigquery_configs')
    .select('project_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (config?.project_id) projectId = config.project_id;

  // Check for inventory-specific source first, then fall back to products
  const { data: invSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, table_name, service_account_secret')
    .eq('tenant_id', tenantId)
    .eq('model_type', 'inventory')
    .eq('is_enabled', true)
    .maybeSingle();

  if (invSource?.dataset) {
    dataset = invSource.dataset;
    table = invSource.table_name || DEFAULT_TABLE;
    if (invSource.service_account_secret) saSecretName = invSource.service_account_secret;
  } else {
    // Fallback: use products source
    const { data: source } = await supabase
      .from('bigquery_tenant_sources')
      .select('dataset, table_name, service_account_secret')
      .eq('tenant_id', tenantId)
      .eq('model_type', 'products')
      .eq('is_enabled', true)
      .maybeSingle();
    if (source?.dataset) {
      dataset = source.dataset;
      table = DEFAULT_TABLE; // KiotViet default
    }
    if (source?.service_account_secret) saSecretName = source.service_account_secret;
  }

  console.log(`[backfill-sku] Config: project=${projectId}, dataset=${dataset}, table=${table}, key=${saSecretName}`);

  const saJson = Deno.env.get(saSecretName) || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!saJson) throw new Error(`No service account key found (tried ${saSecretName})`);
  const accessToken = await getAccessToken(JSON.parse(saJson));
  return { projectId, dataset, table, accessToken };
}

// ============= Main =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id || DEFAULT_TENANT_ID;
    
    console.log(`[backfill-sku] tenant=${tenantId}`);
    
    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // 1. Get distinct productCodes from BQ
    const bqRows = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, `
      SELECT DISTINCT productCode AS sku, productName AS name
      FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.table}\`
      WHERE productCode IS NOT NULL AND productCode != ''
    `);
    console.log(`[backfill-sku] BQ distinct SKUs: ${bqRows.length}`);

    // 2. Load existing SKU mappings
    const PAGE = 5000;
    const existingSkus = new Set<string>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_sku_fc_mapping')
        .select('sku')
        .eq('tenant_id', tenantId)
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      data.forEach((r: any) => existingSkus.add(r.sku));
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`[backfill-sku] Existing SKU mappings: ${existingSkus.size}`);

    // 3. Load existing FCs
    const existingFcs = new Map<string, string>();
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code')
        .eq('tenant_id', tenantId)
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      data.forEach((r: any) => existingFcs.set(r.fc_code, r.id));
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`[backfill-sku] Existing FCs: ${existingFcs.size}`);

    // 4. Find missing SKUs & derive FCs
    const missingSKUs: { sku: string; name: string }[] = [];
    const newFcCodes = new Map<string, string>();

    for (const row of bqRows) {
      const sku = row.sku;
      if (existingSkus.has(sku)) continue;
      if (isNonFashion(sku)) continue;

      missingSKUs.push({ sku, name: row.name || '' });
      const fcCode = stripSizeFromSku(sku);
      if (!existingFcs.has(fcCode) && !newFcCodes.has(fcCode)) {
        const name = row.name || fcCode;
        const cleanName = name.replace(/\s*[-/]\s*(XXXL|XXL|XL|XS|S|M|L|F)\s*$/i, '').trim();
        newFcCodes.set(fcCode, cleanName || fcCode);
      }
    }

    console.log(`[backfill-sku] Missing SKUs: ${missingSKUs.length}, New FCs to create: ${newFcCodes.size}`);

    // 5. Create new FCs in batches
    const BATCH = 500;
    let fcsCreated = 0;
    const fcEntries = Array.from(newFcCodes.entries());

    for (let i = 0; i < fcEntries.length; i += BATCH) {
      const batch = fcEntries.slice(i, i + BATCH).map(([code, name]) => ({
        tenant_id: tenantId,
        fc_code: code,
        fc_name: name,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from('inv_family_codes')
        .upsert(batch, { onConflict: 'tenant_id,fc_code' })
        .select('id, fc_code');

      if (error) {
        console.error(`[backfill-sku] FC upsert error:`, error.message);
      } else {
        (data || []).forEach((r: any) => existingFcs.set(r.fc_code, r.id));
        fcsCreated += (data || []).length;
      }
    }

    console.log(`[backfill-sku] Created ${fcsCreated} new FCs`);

    // 6. Create SKU→FC mappings
    let mappingsCreated = 0;
    let mappingErrors = 0;

    for (let i = 0; i < missingSKUs.length; i += BATCH) {
      const batch = missingSKUs.slice(i, i + BATCH)
        .map(({ sku }) => {
          const fcCode = stripSizeFromSku(sku);
          const fcId = existingFcs.get(fcCode);
          if (!fcId) return null;
          return { tenant_id: tenantId, sku, fc_id: fcId, is_active: true };
        })
        .filter(Boolean);

      if (!batch.length) continue;

      const { error } = await supabase
        .from('inv_sku_fc_mapping')
        .upsert(batch as any[], { onConflict: 'tenant_id,sku' });

      if (error) {
        console.error(`[backfill-sku] Mapping error at ${i}:`, error.message);
        mappingErrors++;
      } else {
        mappingsCreated += batch.length;
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: mappingErrors === 0,
      tenant_id: tenantId,
      bq_distinct_skus: bqRows.length,
      existing_mappings: existingSkus.size,
      missing_skus: missingSKUs.length,
      new_fcs_created: fcsCreated,
      mappings_created: mappingsCreated,
      mapping_errors: mappingErrors,
      duration_ms: duration,
    };

    console.log(`[backfill-sku] Done in ${duration}ms. New FCs: ${fcsCreated}, New mappings: ${mappingsCreated}`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`[backfill-sku] FATAL:`, err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
