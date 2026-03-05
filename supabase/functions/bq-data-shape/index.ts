import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_ID = 'bluecore-dcp';
const DATASET = 'olvboutique';

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
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('No SA');
    const token = await getAccessToken(JSON.parse(saJson));

    // Check how many distinct snapshot dates exist
    const query = `
      SELECT 
        COUNT(DISTINCT CAST(dw_timestamp AS DATE)) as distinct_dates,
        MIN(CAST(dw_timestamp AS DATE)) as earliest_date,
        MAX(CAST(dw_timestamp AS DATE)) as latest_date,
        COUNT(*) as total_rows,
        COUNT(DISTINCT productCode) as distinct_products
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_ProductInventories\`
      WHERE productCode IS NOT NULL AND productCode != ''
    `;

    const bqRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 60000 }),
      }
    );
    const bqData = await bqRes.json();
    if (bqData.error) throw new Error(bqData.error.message);

    const schema = bqData.schema?.fields || [];
    const row = bqData.rows?.[0];
    const result: Record<string, any> = {};
    if (row) row.f.forEach((f: any, i: number) => { result[schema[i].name] = f.v; });

    // Also check a sample product to understand data shape
    const sampleQuery = `
      SELECT productCode, CAST(dw_timestamp AS DATE) AS snapshot_date, 
             CAST(branchId AS STRING) as branch_id, onHand, reserveda
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_ProductInventories\`
      WHERE productCode = '222011808FS'
      ORDER BY dw_timestamp
      LIMIT 20
    `;
    const sampleRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sampleQuery, useLegacySql: false, timeoutMs: 30000 }),
      }
    );
    const sampleData = await sampleRes.json();
    const sampleSchema = sampleData.schema?.fields || [];
    const sampleRows = (sampleData.rows || []).map((r: any) => {
      const obj: Record<string, any> = {};
      r.f.forEach((f: any, i: number) => { obj[sampleSchema[i].name] = f.v; });
      return obj;
    });

    return new Response(JSON.stringify({ summary: result, sample_product: sampleRows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
