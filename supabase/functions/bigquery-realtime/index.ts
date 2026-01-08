import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate JWT for BigQuery API authentication using jose library
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
    console.error('Token response:', tokenData);
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// Execute BigQuery query - returns null if table doesn't exist or no permission
async function queryBigQuery(accessToken: string, projectId: string, query: string): Promise<any[] | null> {
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
    // Return null for permission/not found errors instead of throwing
    if (data.error.code === 403 || data.error.code === 404) {
      console.warn(`Query skipped (${data.error.code}): ${data.error.message}`);
      return null;
    }
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

// Generate SHA-256 hash for query caching
async function hashQuery(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Channel-specific query builders
const CHANNEL_QUERIES = {
  shopee: {
    daily_revenue: (p: any) => `
      SELECT 
        DATE(create_time) as date,
        'shopee' as channel,
        COUNT(*) as order_count,
        SUM(CAST(total_amount AS FLOAT64)) as revenue,
        SUM(CAST(seller_income AS FLOAT64)) as net_revenue
      FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
    channel_summary: (p: any) => `
      SELECT 
        'shopee' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(total_amount AS FLOAT64)) as gross_revenue,
        SUM(CAST(seller_income AS FLOAT64)) as net_revenue,
        AVG(CAST(total_amount AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    `,
    order_status: (p: any) => `
      SELECT 
        'shopee' as channel,
        order_status as status,
        COUNT(*) as count
      FROM \`${p.project_id}.menstaysimplicity_shopee.shopee_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
    hourly_trend: (p: any) => `
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
    top_products: (p: any) => `
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
  },
  lazada: {
    daily_revenue: (p: any) => `
      SELECT 
        DATE(createdAt) as date,
        'lazada' as channel,
        COUNT(*) as order_count,
        SUM(CAST(price AS FLOAT64)) as revenue,
        SUM(CAST(sellerRevenue AS FLOAT64)) as net_revenue
      FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
      WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
    channel_summary: (p: any) => `
      SELECT 
        'lazada' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(price AS FLOAT64)) as gross_revenue,
        SUM(CAST(sellerRevenue AS FLOAT64)) as net_revenue,
        AVG(CAST(price AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
      WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
    `,
    order_status: (p: any) => `
      SELECT 
        'lazada' as channel,
        status,
        COUNT(*) as count
      FROM \`${p.project_id}.menstaysimplicity_lazada.lazada_Orders\`
      WHERE DATE(createdAt) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
  },
  tiktok: {
    daily_revenue: (p: any) => `
      SELECT 
        DATE(create_time) as date,
        'tiktok' as channel,
        COUNT(*) as order_count,
        SUM(CAST(payment_info.total_amount AS FLOAT64)) as revenue,
        SUM(CAST(payment_info.seller_revenue AS FLOAT64)) as net_revenue
      FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
    channel_summary: (p: any) => `
      SELECT 
        'tiktok' as channel,
        COUNT(*) as total_orders,
        SUM(CAST(payment_info.total_amount AS FLOAT64)) as gross_revenue,
        SUM(CAST(payment_info.seller_revenue AS FLOAT64)) as net_revenue,
        AVG(CAST(payment_info.total_amount AS FLOAT64)) as avg_order_value
      FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
    `,
    order_status: (p: any) => `
      SELECT 
        'tiktok' as channel,
        order_status as status,
        COUNT(*) as count
      FROM \`${p.project_id}.menstaysimplicity_tiktokshop.tiktok_Orders\`
      WHERE DATE(create_time) BETWEEN '${p.start_date}' AND '${p.end_date}'
      GROUP BY 1, 2
    `,
  },
};

// Query each channel separately and combine results
async function queryAllChannels(
  accessToken: string, 
  projectId: string, 
  queryType: string, 
  params: any
): Promise<{ data: any[], channels_queried: string[], channels_failed: string[] }> {
  const results: any[] = [];
  const channelsQueried: string[] = [];
  const channelsFailed: string[] = [];
  
  for (const [channel, queries] of Object.entries(CHANNEL_QUERIES)) {
    const queryFn = (queries as any)[queryType];
    if (!queryFn) continue;
    
    const query = queryFn(params);
    console.log(`Querying ${channel}...`);
    
    const channelResults = await queryBigQuery(accessToken, projectId, query);
    
    if (channelResults === null) {
      console.warn(`Channel ${channel} skipped - no access or table not found`);
      channelsFailed.push(channel);
    } else {
      results.push(...channelResults);
      channelsQueried.push(channel);
      console.log(`${channel}: ${channelResults.length} rows`);
    }
  }
  
  return { data: results, channels_queried: channelsQueried, channels_failed: channelsFailed };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tenant_id,
      query_type,
      start_date,
      end_date,
      custom_query,
      use_cache = true,
      cache_ttl_minutes = 15,
      project_id: customProjectId,
    } = await req.json();

    console.log('BigQuery Realtime query:', { tenant_id, query_type, start_date, end_date, use_cache });

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured. Please add your Google Cloud service account credentials.');
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format. Please ensure it is valid JSON.');
    }
    
    const projectId = customProjectId || serviceAccount.project_id || 'bluecore-dcp';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const params = {
      project_id: projectId,
      start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: end_date || new Date().toISOString().split('T')[0],
    };

    // Check cache if enabled
    const cacheKey = `${query_type}_${params.start_date}_${params.end_date}_${tenant_id}`;
    if (use_cache && query_type !== 'custom') {
      const queryHash = await hashQuery(cacheKey);
      
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

    console.log('Getting access token...');
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Access token obtained');

    let rows: any[];
    let channelsQueried: string[] = [];
    let channelsFailed: string[] = [];

    if (query_type === 'custom' && custom_query) {
      // Custom query - execute directly
      const result = await queryBigQuery(accessToken, projectId, custom_query);
      rows = result || [];
    } else if (['daily_revenue', 'channel_summary', 'order_status', 'hourly_trend', 'top_products'].includes(query_type)) {
      // Query each channel separately
      const startTime = Date.now();
      const result = await queryAllChannels(accessToken, projectId, query_type, params);
      rows = result.data;
      channelsQueried = result.channels_queried;
      channelsFailed = result.channels_failed;
      console.log(`All channels queried in ${Date.now() - startTime}ms`);
    } else {
      throw new Error(`Unknown query_type: ${query_type}. Available types: daily_revenue, channel_summary, order_status, hourly_trend, top_products, custom`);
    }

    // Cache results if enabled
    if (use_cache && query_type !== 'custom' && rows.length > 0) {
      const queryHash = await hashQuery(cacheKey);
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
        row_count: rows.length,
        channels_queried: channelsQueried,
        channels_failed: channelsFailed,
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
