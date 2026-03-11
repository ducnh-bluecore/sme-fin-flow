/**
 * sync-stores-from-bq
 * 
 * Pulls branch list from BigQuery and upserts into inv_stores.
 * Supports dynamic tenant_id + resolves BQ config from DB.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

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
  table: string;
  accessToken: string;
  sourceType: string;
}

async function resolveBqConfig(supabase: any, tenantId: string): Promise<BqConfig> {
  let projectId = 'bluecore-dcp';
  let dataset = 'olvboutique';
  let table = 'raw_kiotviet_ProductInventories';
  let sourceType = 'kiotviet';
  let serviceAccountJson: string | null = null;

  // 1) bigquery_configs (credentials_json preferred)
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

  // 2) bigquery_tenant_sources for inventory model
  const { data: invSource } = await supabase
    .from('bigquery_tenant_sources')
    .select('dataset, table_name, service_account_secret, channel, mapping_overrides')
    .eq('tenant_id', tenantId)
    .in('model_type', ['inventory_positions', 'inventory'])
    .eq('is_enabled', true)
    .limit(1)
    .maybeSingle();

  if (invSource?.dataset) {
    dataset = invSource.dataset;
    table = invSource.table_name || table;
    if (invSource.channel) sourceType = invSource.channel;
    if (!serviceAccountJson && invSource.service_account_secret) {
      const envVal = Deno.env.get(invSource.service_account_secret);
      if (envVal) serviceAccountJson = envVal;
    }
  }

  // 3) Fallback to default env secret
  if (!serviceAccountJson) {
    serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || null;
  }
  if (!serviceAccountJson) throw new Error('No service account credentials found');

  console.log(`[sync-stores] Config: project=${projectId}, dataset=${dataset}, type=${sourceType}`);
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  return { projectId, dataset, table, accessToken, sourceType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id || DEFAULT_TENANT_ID;
    const mode = body.mode || 'sync'; // 'sync' | 'discover_tables' | 'sample_table'

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bqConfig = await resolveBqConfig(supabase, tenantId);

    // Mode: discover tables in dataset
    if (mode === 'discover_tables') {
      const sql = `SELECT table_name FROM \`${bqConfig.projectId}.${bqConfig.dataset}.INFORMATION_SCHEMA.TABLES\` ORDER BY table_name`;
      const res = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${bqConfig.projectId}/queries`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${bqConfig.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 500 }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const tables = (data.rows || []).map((r: any) => r.f[0].v);
      return new Response(JSON.stringify({ success: true, dataset: bqConfig.dataset, tables }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode: sample a specific table
    if (mode === 'sample_table') {
      const tableName = body.table_name;
      if (!tableName) throw new Error('table_name required');
      const sql = `SELECT * FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${tableName}\` LIMIT 5`;
      const res = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${bqConfig.projectId}/queries`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${bqConfig.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 5 }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const fields = (data.schema?.fields || []).map((f: any) => f.name);
      const rows = (data.rows || []).map((r: any) => {
        const obj: any = {};
        fields.forEach((f: string, i: number) => { obj[f] = r.f[i].v; });
        return obj;
      });
      return new Response(JSON.stringify({ success: true, table: tableName, columns: fields, sample: rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query based on source type
    let sql: string;
    if (bqConfig.sourceType === 'haravan') {
      // Use raw_hrv_Locations table which has actual location names
      const locationsTable = `${bqConfig.projectId}.${bqConfig.dataset}.raw_hrv_Locations`;
      // Filter by OrgName matching the tenant if needed, get distinct locations
      sql = `
        SELECT DISTINCT
          CAST(Id AS STRING) as branch_id,
          name as branchName,
          address1,
          district,
          province,
          phone
        FROM \`${locationsTable}\`
        WHERE Id IS NOT NULL AND name IS NOT NULL
        ORDER BY name
      `;
      console.log(`[sync-stores] Using raw_hrv_Locations for Haravan stores`);
    } else {
      // KiotViet - discover columns first
      const discoverSql = `SELECT * FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.table}\` LIMIT 1`;
      const discoverRes = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${bqConfig.projectId}/queries`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${bqConfig.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: discoverSql, useLegacySql: false, maxResults: 1 }),
        }
      );
      const discoverData = await discoverRes.json();
      if (discoverData.error) throw new Error(`BigQuery schema discovery error: ${discoverData.error.message}`);
      const columnNames = (discoverData.schema?.fields || []).map((f: any) => f.name);

      const idCol = columnNames.find((c: string) => /^(branchId|BranchId|branch_id)$/i.test(c)) || 'branchId';
      const nameCol = columnNames.find((c: string) => /^(branchName|BranchName|branch_name)$/i.test(c)) || 'branchName';
      
      sql = `
        SELECT
          CAST(${idCol} AS STRING) as branch_id,
          ANY_VALUE(${nameCol}) as branchName
        FROM \`${bqConfig.projectId}.${bqConfig.dataset}.${bqConfig.table}\`
        WHERE ${nameCol} IS NOT NULL AND ${idCol} IS NOT NULL
        GROUP BY ${idCol}
        ORDER BY branchName
      `;
    }

    const bqRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${bqConfig.projectId}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${bqConfig.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 10000 }),
      }
    );
    const bqData = await bqRes.json();
    if (bqData.error) throw new Error(`BigQuery error: ${bqData.error.message}`);

    const fields = bqData.schema?.fields || [];
    const bqBranches = (bqData.rows || []).map((r: any) => {
      const obj: any = {};
      fields.forEach((f: any, i: number) => { obj[f.name] = r.f[i].v; });
      return obj;
    });
    console.log(`[sync-stores] Found ${bqBranches.length} branches in BigQuery`);

    // Get existing stores
    const { data: existing } = await supabase
      .from('inv_stores')
      .select('id, store_code, store_name, is_active')
      .eq('tenant_id', tenantId);

    const existingCodes = new Set((existing || []).map((s: any) => String(s.store_code)));
    const bqCodes = new Set(bqBranches.map((b: any) => String(b.branch_id)));

    const newBranches = bqBranches.filter((b: any) => !existingCodes.has(String(b.branch_id)));
    const toDeactivate = (existing || []).filter((s: any) => s.is_active && !bqCodes.has(String(s.store_code)));
    const toReactivate = (existing || []).filter((s: any) => !s.is_active && bqCodes.has(String(s.store_code)));

    let inserted = 0, errors = 0;
    for (const b of newBranches) {
      const { error } = await supabase.from('inv_stores').insert({
        tenant_id: tenantId,
        store_code: String(b.branch_id),
        store_name: b.branchName,
        location_type: 'store',
        is_active: true,
        is_transfer_eligible: true,
      });
      if (error) { errors++; } else { inserted++; }
    }

    let deactivated = 0;
    for (const s of toDeactivate) {
      const { error } = await supabase.from('inv_stores')
        .update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', s.id);
      if (!error) deactivated++;
    }

    let reactivated = 0;
    for (const s of toReactivate) {
      const { error } = await supabase.from('inv_stores')
        .update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', s.id);
      if (!error) reactivated++;
    }

    return new Response(JSON.stringify({
      success: true, tenant_id: tenantId,
      bq_branches: bqBranches.length, existing_stores: existingCodes.size,
      new_added: inserted, deactivated, reactivated, errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[sync-stores] Error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
