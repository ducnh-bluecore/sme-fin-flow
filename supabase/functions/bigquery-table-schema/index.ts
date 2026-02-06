/**
 * bigquery-table-schema - Get schema of a specific BigQuery table
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token');
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dataset, table } = await req.json();
    
    if (!dataset || !table) {
      throw new Error('dataset and table are required');
    }
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'bluecore-dcp';
    
    const accessToken = await getAccessToken(serviceAccount);
    
    // Get table schema
    const schemaUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}`;
    const schemaResponse = await fetch(schemaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const schemaData = await schemaResponse.json();
    
    if (schemaData.error) {
      throw new Error(schemaData.error.message);
    }
    
    const columns = (schemaData.schema?.fields || []).map((f: any) => ({
      name: f.name,
      type: f.type,
      mode: f.mode,
    }));

    return new Response(JSON.stringify({
      success: true,
      project_id: projectId,
      dataset,
      table,
      columns,
      row_count: schemaData.numRows,
    }, null, 2), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
