/**
 * sync-categories-from-bigquery
 * 
 * Fetches product categories from BigQuery, upserts into inv_collections,
 * and updates inv_family_codes.collection_id accordingly.
 * Now supports dynamic tenant_id + resolves BQ config from DB.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const FASHION_PARENT_IDS = [186470, 263785];

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

  // Check products source for channel info
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

  console.log(`[sync-categories] Config: project=${projectId}, dataset=${dataset}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, accessToken, sourceType };
}

async function queryBigQuery(accessToken: string, projectId: string, sql: string): Promise<any[]> {
  console.log('[sync-categories] BQ:', sql.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 50000, timeoutMs: 120000 }),
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
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id || DEFAULT_TENANT_ID;
    const dryRun = body.dry_run === true;

    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // Haravan doesn't have a categories table → skip
    if (bqConfig.sourceType === 'haravan') {
      return new Response(JSON.stringify({
        success: true, message: 'Category sync not supported for Haravan source', tenant_id: tenantId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // KiotViet category sync
    const parentList = FASHION_PARENT_IDS.join(',');
    const categoriesRows = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, `
      SELECT categoryId, categoryName, parentId
      FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_Categories\`
      WHERE CAST(parentId AS INT64) IN (${parentList})
      QUALIFY ROW_NUMBER() OVER (PARTITION BY categoryId ORDER BY dw_timestamp DESC) = 1
      ORDER BY categoryName
    `);
    console.log(`[sync-categories] Fetched ${categoriesRows.length} fashion categories`);

    const categoryMap = new Map<string, { categoryIds: string[]; categoryName: string }>();
    for (const row of categoriesRows) {
      const name = row.categoryName;
      if (!categoryMap.has(name)) {
        categoryMap.set(name, { categoryIds: [row.categoryId], categoryName: name });
      } else {
        categoryMap.get(name)!.categoryIds.push(row.categoryId);
      }
    }

    const productCategoryRows = await queryBigQuery(bqConfig.accessToken, bqConfig.projectId, `
      SELECT DISTINCT code AS sku, categoryId, categoryName
      FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_Product\`
      WHERE code IS NOT NULL AND code != ''
        AND CAST(categoryId AS INT64) IN (
          SELECT categoryId FROM \`${bqConfig.projectId}.${bqConfig.dataset}.raw_kiotviet_Categories\`
          WHERE CAST(parentId AS INT64) IN (${parentList})
        )
      QUALIFY ROW_NUMBER() OVER (PARTITION BY code ORDER BY COALESCE(modifiedDate, createdDate) DESC) = 1
    `);

    if (dryRun) {
      const catSummary: Record<string, number> = {};
      productCategoryRows.forEach((r: any) => { catSummary[r.categoryName] = (catSummary[r.categoryName] || 0) + 1; });
      return new Response(JSON.stringify({
        success: true, dry_run: true, tenant_id: tenantId,
        unique_categories: categoryMap.size, total_product_mappings: productCategoryRows.length,
        category_product_counts: catSummary,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert categories
    const collectionRows = [...categoryMap.values()].map(cat => ({
      tenant_id: tenantId, collection_code: cat.categoryName,
      collection_name: cat.categoryName, is_new_collection: false,
    }));

    let collectionsUpserted = 0;
    const collectionCodeToId = new Map<string, string>();
    const BATCH = 50;

    for (let i = 0; i < collectionRows.length; i += BATCH) {
      const batch = collectionRows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('inv_collections')
        .upsert(batch, { onConflict: 'tenant_id,collection_code' })
        .select('id, collection_code');
      if (!error) {
        (data || []).forEach((r: any) => collectionCodeToId.set(r.collection_code, r.id));
        collectionsUpserted += (data || []).length;
      }
    }

    if (collectionCodeToId.size === 0) {
      const { data } = await supabase.from('inv_collections')
        .select('id, collection_code').eq('tenant_id', tenantId);
      (data || []).forEach((r: any) => collectionCodeToId.set(r.collection_code, r.id));
    }

    // Build FC → collection mapping
    const catNameToCollId = new Map<string, string>();
    for (const [name] of categoryMap) {
      const collId = collectionCodeToId.get(name);
      if (collId) catNameToCollId.set(name, collId);
    }
    const catIdToCollId = new Map<string, string>();
    for (const row of categoriesRows) {
      const collId = catNameToCollId.get(row.categoryName);
      if (collId) catIdToCollId.set(row.categoryId, collId);
    }

    const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
    function stripSize(sku: string): string {
      const match = sku.match(SIZE_SUFFIXES);
      return match ? match[1] : sku;
    }

    const fcToCollId = new Map<string, string>();
    for (const row of productCategoryRows) {
      const fcCode = stripSize(row.sku);
      const collId = catIdToCollId.get(row.categoryId);
      if (collId && !fcToCollId.has(fcCode)) fcToCollId.set(fcCode, collId);
    }

    // Update FCs
    const PAGE = 5000;
    let offset = 0;
    const existingFcs: { id: string; fc_code: string }[] = [];
    while (true) {
      const { data, error } = await supabase.from('inv_family_codes')
        .select('id, fc_code').eq('tenant_id', tenantId).range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      existingFcs.push(...data as any[]);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    let fcsUpdated = 0;
    const collIdToFcIds = new Map<string, { fcIds: string[]; category: string }>();
    for (const fc of existingFcs) {
      const collId = fcToCollId.get(fc.fc_code);
      if (collId) {
        const catName = [...catNameToCollId.entries()].find(([_, id]) => id === collId)?.[0] || '';
        if (!collIdToFcIds.has(collId)) collIdToFcIds.set(collId, { fcIds: [], category: catName });
        collIdToFcIds.get(collId)!.fcIds.push(fc.id);
      }
    }

    for (const [collId, { fcIds, category }] of collIdToFcIds) {
      for (let i = 0; i < fcIds.length; i += 500) {
        const batch = fcIds.slice(i, i + 500);
        const { error } = await supabase.from('inv_family_codes')
          .update({ collection_id: collId, category }).in('id', batch);
        if (!error) fcsUpdated += batch.length;
      }
    }

    const summary = {
      success: true, tenant_id: tenantId,
      bq_categories: categoriesRows.length, unique_categories: categoryMap.size,
      collections_upserted: collectionsUpserted, fcs_updated: fcsUpdated,
      duration_ms: Date.now() - startTime,
    };
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`[sync-categories] FATAL:`, err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
