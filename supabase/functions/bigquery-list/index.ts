import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google OAuth2 JWT for Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Import private key and sign
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${signatureInput}.${signatureB64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("Token error:", tokenData);
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, action, dataset_id, table_id, limit = 100 } = await req.json();
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = project_id || serviceAccount.project_id || 'bluecore-dcp';
    
    console.log(`BigQuery action: ${action}, project: ${projectId}`);
    
    const accessToken = await getAccessToken(serviceAccount);
    
    let result;
    
    if (action === 'list_datasets') {
      // List all datasets in project
      const response = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("BigQuery API error:", response.status, errorText);
        throw new Error(`BigQuery API error: ${response.status} - ${errorText}`);
      }
      
      result = await response.json();
      
    } else if (action === 'list_tables') {
      // List tables in a dataset
      if (!dataset_id) {
        throw new Error('dataset_id is required for list_tables');
      }
      
      const response = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset_id}/tables`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("BigQuery API error:", response.status, errorText);
        throw new Error(`BigQuery API error: ${response.status} - ${errorText}`);
      }
      
      result = await response.json();
      
    } else if (action === 'get_schema') {
      // Get table schema
      if (!dataset_id || !table_id) {
        throw new Error('dataset_id and table_id are required for get_schema');
      }
      
      const response = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset_id}/tables/${table_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BigQuery API error: ${response.status} - ${errorText}`);
      }
      
      result = await response.json();
      
    } else if (action === 'preview_data') {
      // Preview data from a table
      if (!dataset_id || !table_id) {
        throw new Error('dataset_id and table_id are required for preview_data');
      }
      
      const query = `SELECT * FROM \`${projectId}.${dataset_id}.${table_id}\` LIMIT ${limit}`;
      
      const response = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            useLegacySql: false,
            maxResults: limit
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BigQuery query error: ${response.status} - ${errorText}`);
      }
      
      result = await response.json();
      
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('BigQuery list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
