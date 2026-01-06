import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate JWT for BigQuery API authentication
async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signInput = `${headerB64}.${payloadB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// Execute BigQuery query
async function queryBigQuery(accessToken: string, projectId: string, query: string): Promise<any[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults: 10000,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`BigQuery error: ${JSON.stringify(data.error)}`);
  }

  if (!data.rows) {
    return [];
  }

  const schema = data.schema?.fields || [];
  return data.rows.map((row: any) => {
    const obj: any = {};
    row.f.forEach((field: any, index: number) => {
      const fieldName = schema[index]?.name || `col_${index}`;
      obj[fieldName] = field.v;
    });
    return obj;
  });
}

// Generate MD5 hash for query caching
async function hashQuery(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-defined query templates for common analytics
const QUERY_TEMPLATES: Record<string, (params: any) => string> = {
  // Daily revenue across all channels
  daily_revenue: (p) => `
    SELECT 
      DATE(create_time) as date,
      'shopee' as channel,
      COUNT(*) as order_count,
      SUM(CAST(total_amount AS FLOAT64)) as revenue,
      SUM(CAST(seller_income AS FLOAT64)) as net_revenue
    FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
    WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    
    UNION ALL
    
    SELECT 
      DATE(createdAt) as date,
      'lazada' as channel,
      COUNT(*) as order_count,
      SUM(CAST(price AS FLOAT64)) as revenue,
      SUM(CAST(sellerRevenue AS FLOAT64)) as net_revenue
    FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
    WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    
    UNION ALL
    
    SELECT 
      DATE(create_time) as date,
      'tiktok' as channel,
      COUNT(*) as order_count,
      SUM(CAST(payment_info.total_amount AS FLOAT64)) as revenue,
      SUM(CAST(payment_info.seller_revenue AS FLOAT64)) as net_revenue
    FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
    WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    
    ORDER BY date DESC, channel
  `,
  
  // Channel comparison summary
  channel_summary: (p) => `
    WITH shopee AS (
      SELECT 
        'shopee' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(total_amount AS FLOAT64)) as gross_revenue,
        SUM(CAST(seller_income AS FLOAT64)) as net_revenue,
        AVG(CAST(total_amount AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    ),
    lazada AS (
      SELECT 
        'lazada' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(price AS FLOAT64)) as gross_revenue,
        SUM(CAST(sellerRevenue AS FLOAT64)) as net_revenue,
        AVG(CAST(price AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
      WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
    ),
    tiktok AS (
      SELECT 
        'tiktok' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(payment_info.total_amount AS FLOAT64)) as gross_revenue,
        SUM(CAST(payment_info.seller_revenue AS FLOAT64)) as net_revenue,
        AVG(CAST(payment_info.total_amount AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    )
    SELECT * FROM shopee
    UNION ALL
    SELECT * FROM lazada
    UNION ALL
    SELECT * FROM tiktok
  `,
  
  // Order status breakdown
  order_status: (p) => `
    SELECT 
      'shopee' as channel,
      order_status as status,
      COUNT(*) as count
    FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
    WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    
    UNION ALL
    
    SELECT 
      'lazada' as channel,
      status,
      COUNT(*) as count
    FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
    WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    
    UNION ALL
    
    SELECT 
      'tiktok' as channel,
      order_status as status,
      COUNT(*) as count
    FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
    WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
  `,

  // Hourly trend for today
  hourly_trend: (p) => `
    SELECT 
      EXTRACT(HOUR FROM create_time) as hour,
      'shopee' as channel,
      COUNT(*) as orders,
      SUM(CAST(total_amount AS FLOAT64)) as revenue
    FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
    WHERE DATE(create_time) = CURRENT_DATE()
    GROUP BY 1, 2
    ORDER BY hour
  `,

  // Top products
  top_products: (p) => `
    SELECT 
      item_name as product_name,
      item_sku as sku,
      SUM(CAST(item_count AS INT64)) as quantity_sold,
      SUM(CAST(item_price AS FLOAT64) * CAST(item_count AS INT64)) as revenue
    FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`,
    UNNEST(items) as item
    WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    GROUP BY 1, 2
    ORDER BY quantity_sold DESC
    LIMIT 20
  `,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tenant_id,
      query_type, // 'daily_revenue', 'channel_summary', 'order_status', 'hourly_trend', 'top_products', 'custom'
      start_date,
      end_date,
      custom_query, // For advanced users
      use_cache = true,
      cache_ttl_minutes = 15,
      project_id: customProjectId,
    } = await req.json();

    console.log('BigQuery Realtime query:', { tenant_id, query_type, start_date, end_date, use_cache });

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    // Get service account from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = customProjectId || serviceAccount.project_id || 'bluecore-dcp';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query: string;
    if (query_type === 'custom' && custom_query) {
      query = custom_query;
    } else if (QUERY_TEMPLATES[query_type]) {
      query = QUERY_TEMPLATES[query_type]({
        project_id: projectId,
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0],
      });
    } else {
      throw new Error(`Unknown query_type: ${query_type}`);
    }

    // Check cache if enabled
    if (use_cache && query_type !== 'custom') {
      const queryHash = await hashQuery(query + tenant_id);
      
      const { data: cached } = await supabase
        .from('bigquery_query_cache')
        .select('result_data, cached_at, expires_at')
        .eq('tenant_id', tenant_id)
        .eq('query_hash', queryHash)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log('Returning cached result from:', cached.cached_at);
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: cached.result_data,
            cached: true,
            cached_at: cached.cached_at,
            expires_at: cached.expires_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Execute query on BigQuery
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Executing BigQuery query...');
    
    const startTime = Date.now();
    const rows = await queryBigQuery(accessToken, projectId, query);
    const queryTime = Date.now() - startTime;
    console.log(`Query executed in ${queryTime}ms, returned ${rows.length} rows`);

    // Cache results if enabled
    if (use_cache && query_type !== 'custom') {
      const queryHash = await hashQuery(query + tenant_id);
      const expiresAt = new Date(Date.now() + cache_ttl_minutes * 60 * 1000);

      await supabase
        .from('bigquery_query_cache')
        .upsert({
          tenant_id,
          query_hash: queryHash,
          query_type,
          date_range_start: start_date,
          date_range_end: end_date,
          result_data: rows,
          cached_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_valid: true,
        }, {
          onConflict: 'tenant_id,query_hash',
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: rows,
        cached: false,
        query_time_ms: queryTime,
        row_count: rows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('BigQuery Realtime error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
