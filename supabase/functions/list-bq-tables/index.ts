import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { tenant_id, dataset } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Get tenant BQ config
  const { data: config } = await supabase
    .from('bigquery_configs')
    .select('gcp_project_id, dataset_id, credentials_json')
    .eq('tenant_id', tenant_id)
    .single();

  // Get service account key
  const { data: source } = await supabase
    .from('bigquery_tenant_sources')
    .select('service_account_secret')
    .eq('tenant_id', tenant_id)
    .limit(1)
    .single();

  const secretName = source?.service_account_secret;
  const saKey = JSON.parse(Deno.env.get(secretName) || config?.credentials_json || '{}');
  const projectId = config?.gcp_project_id || 'bluecore-dcp';
  const datasetId = dataset || config?.dataset_id || '160store';

  // Get access token
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(saKey.private_key, 'RS256');
  const jwt = await new SignJWT({
    iss: saKey.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).sign(privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokenRes.json();

  // List tables
  const query = `SELECT table_name FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.TABLES\` ORDER BY table_name`;
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, maxResults: 500 }),
  });
  const data = await res.json();
  
  const tables = (data.rows || []).map((r: any) => r.f[0].v);
  const productTables = tables.filter((t: string) => 
    t.toLowerCase().includes('product') || t.toLowerCase().includes('prod')
  );

  return new Response(JSON.stringify({ tables: productTables, all_tables_count: tables.length, all_hrv_tables: tables.filter((t: string) => t.toLowerCase().includes('hrv')) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
