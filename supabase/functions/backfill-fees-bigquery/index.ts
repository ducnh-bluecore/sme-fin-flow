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

    // Build channel-specific query for fees
    let feeQuery = '';
    let keyField = '';
    
    if (channel === 'shopee') {
      keyField = 'order_sn';
      feeQuery = `
        SELECT 
          order_sn,
          COALESCE(\`actual_shipping_fee_\`, estimated_shipping_fee, 0) as shipping_fee,
          0 as platform_discount,
          0 as seller_discount
        FROM \`${projectId}.${source.dataset}.${source.table_name}\`
        WHERE order_sn IS NOT NULL
        ORDER BY order_sn
        LIMIT ${batch_size} OFFSET ${offset}
      `;
    } else if (channel === 'tiktok') {
      keyField = 'order_id';
      feeQuery = `
        SELECT 
          order_id,
          COALESCE(payment_shipping_fee, payment_original_shipping_fee, 0) as shipping_fee,
          COALESCE(payment_platform_discount, 0) as platform_discount,
          COALESCE(payment_seller_discount, 0) as seller_discount,
          COALESCE(payment_shipping_fee_platform_discount, 0) as shipping_platform_discount,
          COALESCE(payment_shipping_fee_seller_discount, 0) as shipping_seller_discount,
          COALESCE(payment_sub_total, 0) as sub_total,
          COALESCE(payment_total_amount, 0) as total_amount
        FROM \`${projectId}.${source.dataset}.${source.table_name}\`
        WHERE order_id IS NOT NULL
        ORDER BY order_id
        LIMIT ${batch_size} OFFSET ${offset}
      `;
    } else {
      return new Response(JSON.stringify({ 
        message: `Channel ${channel} has no fee data in BigQuery` 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Query BigQuery
    const bqResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: feeQuery,
          useLegacySql: false,
          maxResults: batch_size,
          timeoutMs: 60000,
        }),
      }
    );

    const bqData = await bqResponse.json();
    if (bqData.error) throw new Error(`BigQuery error: ${bqData.error.message}`);

    const rows = bqData.rows || [];
    const schema = bqData.schema?.fields || [];
    const fieldNames = schema.map((f: any) => f.name);

    console.log(`Got ${rows.length} rows from BigQuery for ${channel}`);

    // Get tenant schema
    const { data: tenantData } = await supabaseAdmin
      .rpc('init_tenant_session', { p_tenant_id: tenant_id });
    const schemaName = tenantData?.schema || 'public';

    // Process in batches of 500
    let updated = 0;
    const updateBatchSize = 500;

    for (let i = 0; i < rows.length; i += updateBatchSize) {
      const batch = rows.slice(i, i + updateBatchSize);
      
      // Build update SQL
      const updates: string[] = [];
      
      for (const row of batch) {
        const values: Record<string, any> = {};
        fieldNames.forEach((name: string, idx: number) => {
          values[name] = row.f[idx].v;
        });

        const orderKey = values[keyField];
        if (!orderKey) continue;

        const shippingFee = Math.abs(parseFloat(values.shipping_fee || 0));
        
        if (channel === 'tiktok') {
          const platformDiscount = Math.abs(parseFloat(values.platform_discount || 0));
          const sellerDiscount = Math.abs(parseFloat(values.seller_discount || 0));
          const shippingPlatformDisc = Math.abs(parseFloat(values.shipping_platform_discount || 0));
          const shippingSellerDisc = Math.abs(parseFloat(values.shipping_seller_discount || 0));
          const totalDiscount = platformDiscount + sellerDiscount + shippingPlatformDisc + shippingSellerDisc;
          
          updates.push(`
            UPDATE ${schemaName}.cdp_orders 
            SET shipping_fee = ${shippingFee},
                platform_fee = ${platformDiscount},
                voucher_discount = ${sellerDiscount},
                discount_amount = ${totalDiscount},
                total_fees = ${shippingFee + platformDiscount}
            WHERE order_key = '${orderKey.replace(/'/g, "''")}' AND channel = '${channel}'
          `);
        } else {
          // Shopee
          updates.push(`
            UPDATE ${schemaName}.cdp_orders 
            SET shipping_fee = ${shippingFee},
                total_fees = ${shippingFee}
            WHERE order_key = '${orderKey.replace(/'/g, "''")}' AND channel = '${channel}'
          `);
        }
      }

      if (updates.length > 0) {
        const sql = updates.join('; ');
        const { error: updateErr } = await supabaseAdmin.rpc('execute_sql_admin', { sql_text: sql });
        if (updateErr) {
          console.error(`Batch update error at offset ${i}:`, updateErr);
          // Fallback: update one by one
          for (const updateSql of updates) {
            await supabaseAdmin.rpc('execute_sql_admin', { sql_text: updateSql });
          }
        }
        updated += updates.length;
      }
    }

    const hasMore = rows.length === batch_size;

    return new Response(JSON.stringify({ 
      success: true, 
      channel,
      updated,
      offset,
      nextOffset: hasMore ? offset + batch_size : null,
      hasMore,
      totalRows: rows.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Backfill error:', error);
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
  const pemContent = cred.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key,
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
  if (!tokenData.access_token) throw new Error('Failed to get access token');
  return tokenData.access_token;
}
