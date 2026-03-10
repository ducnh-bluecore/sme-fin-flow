import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const dataset = body.dataset || '160store';
    const projectId = body.project_id || 'bluecore-dcp';
    const saKeyName = body.sa_key || 'ICONDENIM_GOOGLE_SERVICE_ACCOUNT_JSON';
    const action = body.action || 'list_tables';

    const saJson = Deno.env.get(saKeyName) || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const sa = JSON.parse(saJson);
    console.log(`[bq-check] SA email: ${sa.client_email}, project: ${sa.project_id}`);
    const token = await getAccessToken(sa);

    if (action === 'list_tables') {
      const filter = body.filter || '%nvent%';
      const query = body.query || `SELECT table_name FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.TABLES\` WHERE table_name LIKE '${filter}' OR table_name LIKE '%roduct%' ORDER BY table_name`;
      const bqRes = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, useLegacySql: false, maxResults: 100, timeoutMs: 30000 }),
        }
      );
      const bqData = await bqRes.json();
      if (bqData.error) throw new Error(bqData.error.message);
      const schema = bqData.schema?.fields || [];
      const rows = (bqData.rows || []).map((r: any) => {
        const obj: Record<string, any> = {};
        r.f.forEach((f: any, i: number) => { obj[schema[i].name] = f.v; });
        return obj;
      });
      return new Response(JSON.stringify({ dataset, rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: query specific product
    const productCode = body.product_code || '222011808FS';
    const table = body.table || 'raw_kiotviet_ProductInventories';
    const query = `
      SELECT CAST(branchId AS STRING) AS branch_id, productCode, IFNULL(onHand,0) AS on_hand
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE productCode = '${productCode}'
      QUALIFY ROW_NUMBER() OVER (PARTITION BY branchId ORDER BY dw_timestamp DESC) = 1
    `;
    const bqRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, useLegacySql: false, maxResults: 500, timeoutMs: 30000 }),
      }
    );
    const bqData = await bqRes.json();
    if (bqData.error) throw new Error(bqData.error.message);
    const schema = bqData.schema?.fields || [];
    const rows = (bqData.rows || []).map((r: any) => {
      const obj: Record<string, any> = {};
      r.f.forEach((f: any, i: number) => { obj[schema[i].name] = f.v; });
      return obj;
    });
    return new Response(JSON.stringify({ product_code: productCode, rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
