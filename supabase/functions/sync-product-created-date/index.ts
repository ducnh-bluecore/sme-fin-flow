/**
 * sync-product-created-date
 * 
 * Fetches createdDate from BigQuery raw_kiotviet_Product and updates
 * inv_family_codes.product_created_date for all FCs.
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

async function queryBigQuery(accessToken: string, query: string) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
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

// Strip size suffix to get FC code (same logic as backfill-sku-fc-mapping)
const SIZE_SUFFIXES = /^(.*\d)(XXXL|XXL|XL|XS|S|M|L|F)$/i;
function stripSizeFromSku(sku: string): string {
  const match = sku.match(SIZE_SUFFIXES);
  return match ? match[1] : sku;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    const accessToken = await getAccessToken(JSON.parse(saJson));

    // Get earliest createdDate per product code from BigQuery
    const bqRows = await queryBigQuery(accessToken, `
      SELECT code AS sku, MIN(createdDate) AS created_date
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Product\`
      WHERE code IS NOT NULL AND code != '' AND createdDate IS NOT NULL
      GROUP BY code
    `);
    console.log(`[sync-created-date] BQ rows: ${bqRows.length}`);

    // Group by FC code → take earliest created_date across all SKUs in the FC
    const fcDateMap = new Map<string, string>();
    for (const row of bqRows) {
      const fcCode = stripSizeFromSku(row.sku);
      const existing = fcDateMap.get(fcCode);
      if (!existing || row.created_date < existing) {
        fcDateMap.set(fcCode, row.created_date);
      }
    }
    console.log(`[sync-created-date] Unique FCs: ${fcDateMap.size}`);

    // Load all inv_family_codes for this tenant
    const PAGE = 1000;
    const MAX_PER_RUN = 3000; // Process max 3000 per invocation to avoid timeout
    const allFcs: { id: string; fc_code: string }[] = [];
    let offset = 0;
    while (allFcs.length < MAX_PER_RUN) {
      const { data, error } = await supabase
        .from('inv_family_codes')
        .select('id, fc_code')
        .eq('tenant_id', TENANT_ID)
        .is('product_created_date', null)
        .range(offset, offset + PAGE - 1)
        .order('fc_code');
      if (error) throw error;
      if (!data?.length) break;
      allFcs.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    console.log(`[sync-created-date] FCs missing date: ${allFcs.length}`);
    // Debug: check sample matches
    const sample = allFcs.slice(0, 5).map(fc => ({ fc_code: fc.fc_code, has_match: fcDateMap.has(fc.fc_code), date: fcDateMap.get(fc.fc_code) }));
    console.log(`[sync-created-date] Sample matches:`, JSON.stringify(sample));

    // Batch update using individual updates
    let updated = 0;
    const toUpdate = allFcs.filter(fc => fcDateMap.has(fc.fc_code));
    console.log(`[sync-created-date] FCs with BQ match: ${toUpdate.length}`);
    
    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(fc => 
        supabase
          .from('inv_family_codes')
          .update({ product_created_date: fcDateMap.get(fc.fc_code)!.substring(0, 10) })
          .eq('id', fc.id)
      ));
      updated += results.filter(r => !r.error).length;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      bq_rows: bqRows.length,
      fcs_updated: updated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[sync-created-date] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
