/**
 * sync-stores-from-bq
 * 
 * Pulls branch list from BigQuery raw_kiotviet_Branches
 * and upserts into inv_stores, adding new branches that don't exist yet.
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
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

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
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      maxResults: 10000,
    }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  
  const fields = data.schema?.fields || [];
  const rows = data.rows || [];
  return rows.map((r: any) => {
    const obj: any = {};
    fields.forEach((f: any, i: number) => {
      obj[f.name] = r.f[i].v;
    });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get('GCP_SERVICE_ACCOUNT') || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('GCP_SERVICE_ACCOUNT not configured');
    const sa = JSON.parse(saJson);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get access token
    const accessToken = await getAccessToken(sa);

    // 2. Query distinct branches from BigQuery inventory table
    const sql = `
      SELECT
        CAST(branchId AS STRING) as branch_id,
        ANY_VALUE(branchName) as branchName
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_ProductInventories\`
      WHERE branchName IS NOT NULL AND branchId IS NOT NULL
      GROUP BY branchId
      ORDER BY branchName
    `;
    
    const bqBranches = await queryBigQuery(accessToken, sql);
    console.log(`[sync-stores] Found ${bqBranches.length} branches in BigQuery`);

    console.log(`[sync-stores] Found ${bqBranches.length} branches in BigQuery`);

    // 3. Get existing stores
    const { data: existing } = await supabase
      .from('inv_stores')
      .select('store_code')
      .eq('tenant_id', TENANT_ID);
    
    const existingCodes = new Set((existing || []).map((s: any) => String(s.store_code)));

    // 4. Find new branches
    const newBranches = bqBranches.filter(b => !existingCodes.has(String(b.branch_id)));
    console.log(`[sync-stores] ${newBranches.length} new branches to add`);

    // 5. Upsert new branches
    let inserted = 0;
    let errors = 0;
    for (const b of newBranches) {
      const { error } = await supabase
        .from('inv_stores')
        .insert({
          tenant_id: TENANT_ID,
          store_code: String(b.branch_id),
          store_name: b.branchName,
          location_type: 'store',
          is_active: true,
          is_transfer_eligible: true,
        });
      if (error) {
        console.error(`[sync-stores] Error inserting ${b.branchName}:`, error.message);
        errors++;
      } else {
        inserted++;
        console.log(`[sync-stores] Added: ${b.branchName} (${b.branch_id})`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      bq_branches: bqBranches.length,
      existing_stores: existingCodes.size,
      new_added: inserted,
      errors,
      new_branches: newBranches.map(b => ({ code: b.branch_id, name: b.branchName })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[sync-stores] Error:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
