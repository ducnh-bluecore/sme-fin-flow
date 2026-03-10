/**
 * sync-color-from-bigquery
 * 
 * Fetches MAU (color) attribute from BigQuery raw_kiotviet_ProductAttributes,
 * joins with raw_kiotviet_Product to get SKU, then updates inv_sku_fc_mapping.color
 * via batch_update_sku_color RPC for performance.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

async function queryBigQuery(accessToken: string, projectId: string, sql: string): Promise<any[]> {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, dry_run = false } = await req.json();
    if (!tenant_id) throw new Error('tenant_id is required');

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'bluecore-dcp';
    const accessToken = await getAccessToken(serviceAccount);

    // Fetch color data from BigQuery
    console.log('Fetching MAU color data from BigQuery...');
    const colorSql = `
      SELECT DISTINCT p.code AS sku, a.attributeValue AS color
      FROM \`${projectId}.olvboutique.raw_kiotviet_ProductAttributes\` a
      JOIN \`${projectId}.olvboutique.raw_kiotviet_Product\` p ON a.productId = p.id
      WHERE a.attributeName = 'MAU' AND a.attributeValue IS NOT NULL AND p.code IS NOT NULL
    `;
    const colorData = await queryBigQuery(accessToken, projectId, colorSql);
    console.log(`Fetched ${colorData.length} SKU-color mappings`);

    // Deduplicate: one color per SKU
    const skuColorMap = new Map<string, string>();
    colorData.forEach(row => {
      if (!skuColorMap.has(row.sku)) skuColorMap.set(row.sku, row.color);
    });

    const uniqueMappings = [...skuColorMap.entries()].map(([sku, color]) => ({ sku, color }));

    if (dry_run) {
      const colorSummary: Record<string, number> = {};
      uniqueMappings.forEach(r => { colorSummary[r.color] = (colorSummary[r.color] || 0) + 1; });
      return new Response(JSON.stringify({
        success: true, dry_run: true,
        total_unique_sku_mappings: uniqueMappings.length,
        color_summary: colorSummary,
        sample: uniqueMappings.slice(0, 20),
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Supabase setup
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Batch update via RPC (500 per batch)
    const BATCH_SIZE = 500;
    let totalUpdated = 0;

    for (let i = 0; i < uniqueMappings.length; i += BATCH_SIZE) {
      const batch = uniqueMappings.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.rpc('batch_update_sku_color', {
        updates: batch,
      });

      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      } else {
        const batchUpdated = (data as any)?.updated || 0;
        totalUpdated += batchUpdated;
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueMappings.length / BATCH_SIZE)}: updated ${batchUpdated}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: {
        bigquery_mappings: colorData.length,
        unique_sku_mappings: uniqueMappings.length,
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
