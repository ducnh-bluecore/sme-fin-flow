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

    const query = `
      SELECT 
        COUNT(DISTINCT code) as unique_products,
        COUNT(*) as total_rows,
        COUNT(DISTINCT CASE WHEN isActive = 'true' OR isActive IS NULL THEN code END) as active_products,
        MIN(createdDate) as earliest_created,
        MAX(createdDate) as latest_created
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Product\`
      WHERE code IS NOT NULL AND code != ''
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
