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
    const { tenant_id, channel, batch_size = 5000, offset = 0 } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get BigQuery source config
    const { data: sources } = await supabaseAdmin
      .from('bigquery_tenant_sources')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('model_type', 'orders')
      .eq('channel', channel);

    if (!sources?.length) throw new Error(`No BigQuery source for channel: ${channel}`);
    const source = sources[0];

    // Get credentials
    const credSecret = source.service_account_secret || 'GOOGLE_SERVICE_ACCOUNT_JSON';
    const credJson = Deno.env.get(credSecret) || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!credJson) throw new Error('No BigQuery credentials');
    const cred = JSON.parse(credJson);
    const token = await getAccessToken(cred);
    const projectId = cred.project_id;

    // Build channel-specific query
    let feeQuery = '';
    
    if (channel === 'shopee') {
      feeQuery = `
        SELECT order_sn as order_key,
          COALESCE(\`actual_shipping_fee_\`, estimated_shipping_fee, 0) as shipping_fee
        FROM \`${projectId}.${source.dataset}.${source.table_name}\`
        WHERE order_sn IS NOT NULL
          AND (COALESCE(\`actual_shipping_fee_\`, 0) > 0 OR COALESCE(estimated_shipping_fee, 0) > 0)
        ORDER BY order_sn
        LIMIT ${batch_size} OFFSET ${offset}
      `;
    } else if (channel === 'tiktok') {
      feeQuery = `
        SELECT order_id as order_key,
          COALESCE(payment_shipping_fee, payment_original_shipping_fee, 0) as shipping_fee,
          COALESCE(payment_platform_discount, 0) as platform_discount,
          COALESCE(payment_seller_discount, 0) as seller_discount
        FROM \`${projectId}.${source.dataset}.${source.table_name}\`
        WHERE order_id IS NOT NULL
          AND (COALESCE(payment_shipping_fee, 0) != 0 OR COALESCE(payment_platform_discount, 0) != 0)
        ORDER BY order_id
        LIMIT ${batch_size} OFFSET ${offset}
      `;
    } else {
      return new Response(JSON.stringify({ message: `No fee data for ${channel}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query BigQuery
    const bqResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: feeQuery, useLegacySql: false, maxResults: batch_size, timeoutMs: 60000 }),
      }
    );

    const bqData = await bqResponse.json();
    if (bqData.error) throw new Error(`BigQuery error: ${bqData.error.message}`);

    const rows = bqData.rows || [];
    const schema = bqData.schema?.fields || [];
    const fieldNames = schema.map((f: any) => f.name);

    console.log(`Got ${rows.length} rows from BigQuery for ${channel}`);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0, hasMore: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tenant schema
    const { data: tenantData } = await supabaseAdmin.rpc('init_tenant_session', { p_tenant_id: tenant_id });
    const schemaName = tenantData?.schema || 'public';

    // Process in small batches using VALUES + UPDATE
    let updated = 0;
    const updateChunkSize = 100;

    for (let i = 0; i < rows.length; i += updateChunkSize) {
      const chunk = rows.slice(i, i + updateChunkSize);
      
      const parsed = chunk.map((row: any) => {
        const values: Record<string, any> = {};
        fieldNames.forEach((name: string, idx: number) => { values[name] = row.f[idx].v; });
        return values;
      }).filter((v: any) => v.order_key);

      if (parsed.length === 0) continue;

      if (channel === 'shopee') {
        const valuesList = parsed.map((v: any) => 
          `('${v.order_key.replace(/'/g, "''")}', ${Math.abs(parseFloat(v.shipping_fee || 0))})`
        ).join(',');

        const sql = `
          SET statement_timeout = '30s';
          UPDATE ${schemaName}.cdp_orders o
          SET shipping_fee = v.sf,
              total_fees = v.sf
          FROM (VALUES ${valuesList}) AS v(ok, sf)
          WHERE o.order_key = v.ok AND o.channel = 'shopee'
        `;
        
        const { error } = await supabaseAdmin.rpc('execute_sql_admin', { sql_text: sql });
        if (error) console.error(`Chunk ${i} error:`, error.message);
        else updated += parsed.length;
      } else if (channel === 'tiktok') {
        const valuesList = parsed.map((v: any) => {
          const sf = Math.abs(parseFloat(v.shipping_fee || 0));
          const pd = Math.abs(parseFloat(v.platform_discount || 0));
          const sd = Math.abs(parseFloat(v.seller_discount || 0));
          return `('${v.order_key.replace(/'/g, "''")}', ${sf}, ${pd}, ${sd})`;
        }).join(',');

        const sql = `
          SET statement_timeout = '30s';
          UPDATE ${schemaName}.cdp_orders o
          SET shipping_fee = v.sf,
              platform_fee = v.pd,
              voucher_discount = v.sd,
              discount_amount = v.pd + v.sd,
              total_fees = v.sf + v.pd
          FROM (VALUES ${valuesList}) AS v(ok, sf, pd, sd)
          WHERE o.order_key = v.ok AND o.channel = 'tiktok'
        `;
        
        const { error } = await supabaseAdmin.rpc('execute_sql_admin', { sql_text: sql });
        if (error) console.error(`Chunk ${i} error:`, error.message);
        else updated += parsed.length;
      }
    }

    const hasMore = rows.length === batch_size;
    return new Response(JSON.stringify({ 
      success: true, channel, updated, offset, 
      nextOffset: hasMore ? offset + batch_size : null, hasMore 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    exp: now + 3600, iat: now,
  }));
  const signInput = `${header}.${claim}`;
  const pemContent = cred.private_key.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${header}.${claim}.${sig}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}
