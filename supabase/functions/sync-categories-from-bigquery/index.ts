/**
 * sync-categories-from-bigquery
 * 
 * Fetches product categories from BigQuery (raw_kiotviet_Categories + raw_kiotviet_Product),
 * upserts into inv_collections, and updates inv_family_codes.collection_id accordingly.
 * 
 * Categories are deduplicated by name (e.g. "01-Ao" appears under two parent trees).
 * Only fashion-related categories under known parent IDs are synced.
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

// Known fashion parent category IDs in KiotViet
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

async function queryBigQuery(accessToken: string, sql: string): Promise<any[]> {
  console.log('[sync-categories] BQ:', sql.substring(0, 200));
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
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
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const accessToken = await getAccessToken(JSON.parse(saJson));

    // ── Step 1: Fetch fashion categories from BigQuery ──
    const parentList = FASHION_PARENT_IDS.join(',');
    const categoriesRows = await queryBigQuery(accessToken, `
      SELECT categoryId, categoryName, parentId
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Categories\`
      WHERE CAST(parentId AS INT64) IN (${parentList})
      QUALIFY ROW_NUMBER() OVER (PARTITION BY categoryId ORDER BY dw_timestamp DESC) = 1
      ORDER BY categoryName
    `);
    console.log(`[sync-categories] Fetched ${categoriesRows.length} fashion categories`);

    // Deduplicate by categoryName (same name under different parents → one collection)
    const categoryMap = new Map<string, { categoryIds: string[]; categoryName: string }>();
    for (const row of categoriesRows) {
      const name = row.categoryName;
      if (!categoryMap.has(name)) {
        categoryMap.set(name, { categoryIds: [row.categoryId], categoryName: name });
      } else {
        categoryMap.get(name)!.categoryIds.push(row.categoryId);
      }
    }
    console.log(`[sync-categories] Unique categories by name: ${categoryMap.size}`);

    // ── Step 2: Fetch product → category mapping from BigQuery ──
    const productCategoryRows = await queryBigQuery(accessToken, `
      SELECT DISTINCT code AS sku, categoryId, categoryName
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Product\`
      WHERE code IS NOT NULL AND code != ''
        AND CAST(categoryId AS INT64) IN (
          SELECT categoryId FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Categories\`
          WHERE CAST(parentId AS INT64) IN (${parentList})
        )
      QUALIFY ROW_NUMBER() OVER (PARTITION BY code ORDER BY COALESCE(modifiedDate, createdDate) DESC) = 1
    `);
    console.log(`[sync-categories] Fetched ${productCategoryRows.length} product-category mappings`);

    if (dryRun) {
      const catSummary: Record<string, number> = {};
      productCategoryRows.forEach((r: any) => {
        catSummary[r.categoryName] = (catSummary[r.categoryName] || 0) + 1;
      });
      return new Response(JSON.stringify({
        success: true, dry_run: true,
        unique_categories: categoryMap.size,
        total_product_mappings: productCategoryRows.length,
        category_product_counts: catSummary,
        categories: [...categoryMap.values()],
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Step 3: Upsert categories into inv_collections ──
    const collectionRows = [...categoryMap.values()].map(cat => ({
      tenant_id: TENANT_ID,
      collection_code: cat.categoryName, // e.g. "01-Ao", "03-Dam"
      collection_name: cat.categoryName,
      is_new_collection: false,
      air_date: null,
      season: null,
    }));

    let collectionsUpserted = 0;
    const BATCH = 50;
    // Map collection_code → id for later FK updates
    const collectionCodeToId = new Map<string, string>();

    for (let i = 0; i < collectionRows.length; i += BATCH) {
      const batch = collectionRows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from('inv_collections')
        .upsert(batch, { onConflict: 'tenant_id,collection_code' })
        .select('id, collection_code');

      if (error) {
        console.error(`[sync-categories] Collection upsert error:`, error.message);
      } else {
        (data || []).forEach((r: any) => collectionCodeToId.set(r.collection_code, r.id));
        collectionsUpserted += (data || []).length;
      }
    }
    console.log(`[sync-categories] Upserted ${collectionsUpserted} collections`);

    // If upsert didn't return IDs (no change), fetch them
    if (collectionCodeToId.size === 0) {
      const { data } = await supabase
        .from('inv_collections')
        .select('id, collection_code')
        .eq('tenant_id', TENANT_ID);
      (data || []).forEach((r: any) => collectionCodeToId.set(r.collection_code, r.id));
    }

    // ── Step 4: Build SKU → collection_id mapping via FC ──
    // Build categoryName → collection_id
    const catNameToCollId = new Map<string, string>();
    for (const [name, _] of categoryMap) {
      const collId = collectionCodeToId.get(name);
      if (collId) catNameToCollId.set(name, collId);
    }

    // Build categoryId → collection_id (for all BQ categoryIds)
    const catIdToCollId = new Map<string, string>();
    for (const row of categoriesRows) {
      const collId = catNameToCollId.get(row.categoryName);
      if (collId) catIdToCollId.set(row.categoryId, collId);
    }

    // Build fc_code → collection_id from product mappings
    const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
    function stripSize(sku: string): string {
      const match = sku.match(SIZE_SUFFIXES);
      return match ? match[1] : sku;
    }

    const fcToCollId = new Map<string, string>();
    for (const row of productCategoryRows) {
      const fcCode = stripSize(row.sku);
      const collId = catIdToCollId.get(row.categoryId);
      if (collId && !fcToCollId.has(fcCode)) {
        fcToCollId.set(fcCode, collId);
      }
    }
    console.log(`[sync-categories] FC→Collection mappings: ${fcToCollId.size}`);

    // ── Step 5: Update inv_family_codes.collection_id + category ──
    // Load existing FCs
    const PAGE = 5000;
    let offset = 0;
    const existingFcs: { id: string; fc_code: string }[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code')
        .eq('tenant_id', TENANT_ID)
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      existingFcs.push(...data as any[]);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    let fcsUpdated = 0;
    let fcUpdateErrors = 0;

    // Group FCs by collection_id for batch updates
    const collIdToFcIds = new Map<string, { fcIds: string[]; category: string }>();
    for (const fc of existingFcs) {
      const collId = fcToCollId.get(fc.fc_code);
      if (collId) {
        const catName = [...catNameToCollId.entries()].find(([_, id]) => id === collId)?.[0] || '';
        if (!collIdToFcIds.has(collId)) {
          collIdToFcIds.set(collId, { fcIds: [], category: catName });
        }
        collIdToFcIds.get(collId)!.fcIds.push(fc.id);
      }
    }

    // Batch update per collection (one UPDATE per category)
    for (const [collId, { fcIds, category }] of collIdToFcIds) {
      for (let i = 0; i < fcIds.length; i += 500) {
        const batch = fcIds.slice(i, i + 500);
        const { error, count } = await supabase
          .from('inv_family_codes')
          .update({ collection_id: collId, category })
          .in('id', batch);
        if (error) {
          console.error(`[sync-categories] FC update error for ${category}:`, error.message);
          fcUpdateErrors++;
        } else {
          fcsUpdated += batch.length;
        }
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: fcUpdateErrors === 0,
      bq_categories: categoriesRows.length,
      unique_categories: categoryMap.size,
      bq_product_mappings: productCategoryRows.length,
      collections_upserted: collectionsUpserted,
      fc_collection_mappings: fcToCollId.size,
      fcs_updated: fcsUpdated,
      fc_update_errors: fcUpdateErrors,
      duration_ms: duration,
    };

    console.log(`[sync-categories] Done in ${duration}ms`, summary);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`[sync-categories] FATAL:`, err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
