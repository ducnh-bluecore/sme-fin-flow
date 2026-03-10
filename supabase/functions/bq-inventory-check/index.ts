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
    const body = await req.json().catch(() => ({}));
    const productCode = body.product_code || '222011808FS';

    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!saJson) throw new Error('No SA');
    const token = await getAccessToken(JSON.parse(saJson));

    // Query raw inventory
    const query = `
      SELECT 
        CAST(pi.branchId AS STRING) AS branch_id,
        pi.productCode,
        IFNULL(pi.onHand, 0) AS on_hand,
        IFNULL(pi.reserveda, 0) AS reserved,
        pi.dw_timestamp
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_ProductInventories\` pi
      WHERE pi.productCode = '${productCode}'
      QUALIFY ROW_NUMBER() OVER (PARTITION BY pi.branchId ORDER BY pi.dw_timestamp DESC) = 1
      ORDER BY pi.onHand DESC
    `;

    const bqRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, useLegacySql: false, maxResults: 500, timeoutMs: 60000 }),
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

    // Also check product info
    const prodQuery = `
      SELECT productCode, name, createdDate, modifiedDate, isActive
      FROM \`${PROJECT_ID}.${DATASET}.raw_kiotviet_Product\`
      WHERE productCode = '${productCode}'
      QUALIFY ROW_NUMBER() OVER (PARTITION BY productCode ORDER BY dw_timestamp DESC) = 1
    `;
    const prodRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prodQuery, useLegacySql: false, maxResults: 10, timeoutMs: 30000 }),
      }
    );
    const prodData = await prodRes.json();
    const prodSchema = prodData.schema?.fields || [];
    const prodRows = (prodData.rows || []).map((r: any) => {
      const obj: Record<string, any> = {};
      r.f.forEach((f: any, i: number) => { obj[prodSchema[i].name] = f.v; });
      return obj;
    });

    const totalOnHand = rows.reduce((s: number, r: any) => s + Number(r.on_hand || 0), 0);

    return new Response(JSON.stringify({
      product_code: productCode,
      product_info: prodRows[0] || null,
      total_on_hand: totalOnHand,
      branches: rows,
      branch_count: rows.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
