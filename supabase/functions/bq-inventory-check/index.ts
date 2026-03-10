import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const pk = await importPKCS8(sa.private_key, 'RS256');
  const jwt = await new SignJWT({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).sign(pk);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('No GCP token');
  return d.access_token;
}

async function runBqQuery(token: string, projectId: string, query: string, maxResults = 500) {
  const bqRes = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, useLegacySql: false, maxResults, timeoutMs: 30000 }),
    }
  );
  const bqData = await bqRes.json();
  if (bqData.error) throw new Error(bqData.error.message);
  const schema = bqData.schema?.fields || [];
  return (bqData.rows || []).map((r: any) => {
    const obj: Record<string, any> = {};
    r.f.forEach((f: any, i: number) => { obj[schema[i].name] = f.v; });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'product_inventory';
    const tenantId = body.tenantId || body.tenant_id;

    // ── Resolve credentials: prefer tenant-specific from bigquery_configs ──
    let sa: any;
    let projectId = body.project_id || 'bluecore-dcp';
    let dataset = body.dataset || 'olvboutique';

    if (tenantId) {
      // Try loading credentials from bigquery_configs
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: config } = await supabase
        .from('bigquery_configs')
        .select('credentials_json, gcp_project_id, dataset_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (config?.credentials_json) {
        sa = config.credentials_json;
        projectId = config.gcp_project_id || projectId;
        dataset = config.dataset_id || dataset;
        console.log(`[bq-check] Using tenant credentials: ${sa.client_email}, dataset: ${dataset}`);
      }
    }

    // Fallback to env secret
    if (!sa) {
      const saKeyName = body.sa_key || 'GOOGLE_SERVICE_ACCOUNT_JSON';
      const saJson = Deno.env.get(saKeyName);
      if (!saJson) throw new Error(`No credentials found (secret: ${saKeyName})`);
      sa = JSON.parse(saJson);
      console.log(`[bq-check] Using env secret SA: ${sa.client_email}`);
    }

    const token = await getAccessToken(sa);

    // ── Action: list_datasets ──
    if (action === 'list_datasets') {
      const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets?maxResults=200`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const datasets = (data.datasets || []).map((d: any) => d.datasetReference.datasetId);
      return new Response(JSON.stringify({ datasets }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: list_tables ──
    if (action === 'list_tables') {
      const filter = body.filter || '%nvent%';
      const query = body.query || `SELECT table_name FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.TABLES\` WHERE table_name LIKE '${filter}' OR table_name LIKE '%roduct%' ORDER BY table_name`;
      const rows = await runBqQuery(token, projectId, query, 100);
      return new Response(JSON.stringify({ dataset, rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Action: custom query ──
    if (action === 'query') {
      const query = body.query;
      if (!query) throw new Error('Missing query parameter');
      const rows = await runBqQuery(token, projectId, query, body.maxResults || 1000);
      return new Response(JSON.stringify({ dataset, rows, totalRows: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Default: product_inventory ──
    const productCode = body.product_code || body.fcCode || '222011808FS';
    const table = body.table || 'raw_kiotviet_ProductInventories';
    const query = `
      SELECT CAST(branchId AS STRING) AS branch_id, productCode, IFNULL(onHand,0) AS on_hand
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE productCode LIKE '${productCode}%'
      QUALIFY ROW_NUMBER() OVER (PARTITION BY branchId, productCode ORDER BY dw_timestamp DESC) = 1
      ORDER BY productCode, on_hand DESC
    `;
    const rows = await runBqQuery(token, projectId, query);
    return new Response(JSON.stringify({ product_code: productCode, dataset, rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[bq-check] Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
