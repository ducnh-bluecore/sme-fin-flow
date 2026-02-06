/**
 * bigquery-list-datasets - List all datasets available in BigQuery project
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
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'bluecore-dcp';
    const clientEmail = serviceAccount.client_email;
    
    const accessToken = await getAccessToken(serviceAccount);
    
    // List datasets
    const datasetsUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets`;
    const datasetsResponse = await fetch(datasetsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const datasetsData = await datasetsResponse.json();
    
    const datasets = (datasetsData.datasets || []).map((d: any) => d.datasetReference.datasetId);
    
    // For each dataset, list tables
    const result: Record<string, string[]> = {};
    
    for (const datasetId of datasets) {
      const tablesUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables`;
      const tablesResponse = await fetch(tablesUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const tablesData = await tablesResponse.json();
      
      result[datasetId] = (tablesData.tables || []).map((t: any) => t.tableReference.tableId);
    }

    return new Response(JSON.stringify({
      success: true,
      project_id: projectId,
      service_account_email: clientEmail,
      datasets: result,
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
