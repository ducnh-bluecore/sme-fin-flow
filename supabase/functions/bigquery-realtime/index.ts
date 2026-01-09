import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChannelConfig {
  enabled: boolean;
  dataset: string;
  orders_table: string;
  order_items_table: string;
  date_field: string;
  amount_field: string;
  net_amount_field: string;
  status_field: string;
  order_id_field: string;
}

interface BigQueryConfig {
  project_id: string;
  dataset_prefix: string;
  channels: Record<string, ChannelConfig>;
  cache_ttl_minutes: number;
}

// Default config if none exists in database
// Use safe field names that are more likely to exist across channels
const DEFAULT_CONFIG: BigQueryConfig = {
  project_id: 'bluecore-dcp',
  dataset_prefix: 'bluecoredcp',
  cache_ttl_minutes: 15,
  channels: {
    shopee: {
      enabled: true,
      dataset: 'bluecoredcp_shopee',
      orders_table: 'shopee_Orders',
      order_items_table: 'shopee_OrderItems',
      date_field: 'create_time',
      amount_field: 'total_amount',
      net_amount_field: 'total_amount',
      status_field: 'order_status',
      order_id_field: 'order_sn'
    },
    lazada: {
      enabled: true,
      dataset: 'bluecoredcp_lazada',
      orders_table: 'lazada_Orders',
      order_items_table: 'lazada_OrderItems',
      date_field: 'created_at',
      amount_field: 'price',
      net_amount_field: 'price',
      status_field: 'statuses',
      order_id_field: 'order_id'
    },
    tiktok: {
      enabled: false,
      dataset: 'bluecoredcp_tiktokshop',
      orders_table: 'tiktok_Orders',
      order_items_table: 'tiktok_OrderItems',
      date_field: 'create_time',
      amount_field: 'total_amount',
      net_amount_field: 'total_amount',
      status_field: 'order_status',
      order_id_field: 'order_id'
    }
  }
};

// Generate JWT for BigQuery API authentication
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

// Execute BigQuery query - returns null if table doesn't exist, no permission, or invalid query
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
    // Skip on permission, not found, or invalid query (field not exists)
    if (data.error.code === 403 || data.error.code === 404 || data.error.code === 400) {
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

// Build dynamic query based on channel config - uses safe field access
function buildQuery(
  queryType: string, 
  channel: string, 
  config: ChannelConfig, 
  projectId: string, 
  startDate: string, 
  endDate: string
): string | null {
  const { dataset, orders_table, date_field, amount_field, status_field } = config;
  const fullTable = `\`${projectId}.${dataset}.${orders_table}\``;

  // Use only amount_field for net_revenue to avoid field not found errors
  // The actual net amount calculation should be done per-channel if needed
  switch (queryType) {
    case 'daily_revenue':
      return `
        SELECT 
          DATE(${date_field}) as date,
          '${channel}' as channel,
          COUNT(*) as order_count,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as revenue,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as net_revenue
        FROM ${fullTable}
        WHERE DATE(${date_field}) BETWEEN '${startDate}' AND '${endDate}'
        GROUP BY 1, 2
      `;
    
    case 'channel_summary':
      return `
        SELECT 
          '${channel}' as channel,
          COUNT(*) as total_orders,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as gross_revenue,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as net_revenue,
          AVG(SAFE_CAST(${amount_field} AS FLOAT64)) as avg_order_value
        FROM ${fullTable}
        WHERE DATE(${date_field}) BETWEEN '${startDate}' AND '${endDate}'
      `;
    
    case 'order_status':
      return `
        SELECT 
          '${channel}' as channel,
          CAST(${status_field} AS STRING) as status,
          COUNT(*) as count
        FROM ${fullTable}
        WHERE DATE(${date_field}) BETWEEN '${startDate}' AND '${endDate}'
        GROUP BY 1, 2
      `;
    
    case 'hourly_trend':
      return `
        SELECT 
          EXTRACT(HOUR FROM ${date_field}) as hour,
          '${channel}' as channel,
          COUNT(*) as orders,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as revenue
        FROM ${fullTable}
        WHERE DATE(${date_field}) = CURRENT_DATE()
        GROUP BY 1, 2
        ORDER BY hour
      `;
    
    case 'top_products':
      return `
        SELECT 
          '${channel}' as channel,
          COUNT(*) as order_count,
          SUM(SAFE_CAST(${amount_field} AS FLOAT64)) as revenue
        FROM ${fullTable}
        WHERE DATE(${date_field}) BETWEEN '${startDate}' AND '${endDate}'
      `;
    
    default:
      return null;
  }
}

// Query each channel separately and combine results
async function queryAllChannels(
  accessToken: string, 
  projectId: string, 
  queryType: string, 
  config: BigQueryConfig,
  startDate: string,
  endDate: string
): Promise<{ data: any[], channels_queried: string[], channels_failed: string[] }> {
  const results: any[] = [];
  const channelsQueried: string[] = [];
  const channelsFailed: string[] = [];
  
  for (const [channel, channelConfig] of Object.entries(config.channels)) {
    if (!channelConfig.enabled) {
      console.log(`Channel ${channel} is disabled, skipping`);
      continue;
    }
    
    const query = buildQuery(queryType, channel, channelConfig, projectId, startDate, endDate);
    if (!query) {
      console.log(`No query template for ${queryType} on ${channel}`);
      continue;
    }
    
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
    } = await req.json();

    console.log('BigQuery Realtime query:', { tenant_id, query_type, start_date, end_date, use_cache });

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    // Get service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tenant's BigQuery config from database
    let config: BigQueryConfig = DEFAULT_CONFIG;
    const { data: dbConfig } = await supabase
      .from('bigquery_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();
    
    if (dbConfig) {
      console.log('Using tenant-specific BigQuery config');
      config = {
        project_id: dbConfig.project_id || DEFAULT_CONFIG.project_id,
        dataset_prefix: dbConfig.dataset_prefix || DEFAULT_CONFIG.dataset_prefix,
        channels: dbConfig.channels || DEFAULT_CONFIG.channels,
        cache_ttl_minutes: dbConfig.cache_ttl_minutes || DEFAULT_CONFIG.cache_ttl_minutes,
      };
    } else {
      console.log('Using default BigQuery config');
    }

    const projectId = config.project_id;
    const startDateStr = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDateStr = end_date || new Date().toISOString().split('T')[0];

    // Check cache
    const cacheKey = `${query_type}_${startDateStr}_${endDateStr}_${tenant_id}`;
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
      const result = await queryBigQuery(accessToken, projectId, custom_query);
      rows = result || [];
    } else if (['daily_revenue', 'channel_summary', 'order_status', 'hourly_trend', 'top_products'].includes(query_type)) {
      const startTime = Date.now();
      const result = await queryAllChannels(accessToken, projectId, query_type, config, startDateStr, endDateStr);
      rows = result.data;
      channelsQueried = result.channels_queried;
      channelsFailed = result.channels_failed;
      console.log(`All channels queried in ${Date.now() - startTime}ms`);
    } else {
      throw new Error(`Unknown query_type: ${query_type}`);
    }

    // Cache results
    if (use_cache && query_type !== 'custom' && rows.length > 0) {
      const queryHash = await hashQuery(cacheKey);
      const expiresAt = new Date(Date.now() + config.cache_ttl_minutes * 60 * 1000);

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
        config_used: {
          project_id: projectId,
          channels: Object.keys(config.channels).filter(c => config.channels[c].enabled)
        }
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
