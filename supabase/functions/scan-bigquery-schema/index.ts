import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get BigQuery sources for this tenant
    const { data: sources, error: srcErr } = await supabaseAdmin
      .from('bigquery_tenant_sources')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('model_type', 'orders');

    if (srcErr) throw srcErr;
    if (!sources?.length) throw new Error('No BigQuery order sources found');

    // Get credentials
    const credSecret = sources[0].service_account_secret || 'GOOGLE_SERVICE_ACCOUNT_JSON';
    const credJson = Deno.env.get(credSecret) || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!credJson) throw new Error('No BigQuery credentials found');

    const cred = JSON.parse(credJson);
    
    // Get access token
    const token = await getAccessToken(cred);

    const results: Record<string, string[]> = {};

    for (const source of sources) {
      const dataset = source.dataset;
      const tableName = source.table_name;
      const channel = source.channel;
      const projectId = cred.project_id;

      // Query INFORMATION_SCHEMA
      const query = `SELECT column_name, data_type FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${tableName}' ORDER BY ordinal_position`;

      const response = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            useLegacySql: false,
            maxResults: 200,
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        results[`${channel}/${tableName}`] = [`ERROR: ${data.error.message}`];
        continue;
      }

      const columns = (data.rows || []).map((r: any) => 
        `${r.f[0].v} (${r.f[1].v})`
      );
      results[`${channel}/${tableName}`] = columns;
    }

    return new Response(JSON.stringify({ success: true, schemas: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAccessToken(cred: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = btoa(JSON.stringify({
    iss: cred.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signInput = `${header}.${claim}`;
  
  // Import private key
  const pemContent = cred.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${claim}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}
