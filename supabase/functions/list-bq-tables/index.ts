import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { tenant_id, query: customQuery } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: source } = await supabase
    .from('bigquery_tenant_sources')
    .select('service_account_secret, dataset')
    .eq('tenant_id', tenant_id)
    .limit(1)
    .single();

  const { data: config } = await supabase
    .from('bigquery_configs')
    .select('gcp_project_id')
    .eq('tenant_id', tenant_id)
    .single();

  const saKey = JSON.parse(Deno.env.get(source?.service_account_secret) || '{}');
  const projectId = config?.gcp_project_id || 'bluecore-dcp';

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

  // Run custom query or list datasets
  const query = customQuery || `SELECT schema_name FROM INFORMATION_SCHEMA.SCHEMATA WHERE catalog_name = '${projectId}'`;
  
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, maxResults: 500 }),
  });
  const data = await res.json();
  
  if (data.error) {
    return new Response(JSON.stringify({ error: data.error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const schema = data.schema?.fields || [];
  const rows = (data.rows || []).map((r: any) => {
    const obj: Record<string, any> = {};
    r.f.forEach((f: any, i: number) => { obj[schema[i]?.name] = f.v; });
    return obj;
  });

  return new Response(JSON.stringify({ rows, total: data.totalRows }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
