import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  source: string;
  status: 'success' | 'error' | 'skipped';
  records_synced: number;
  error?: string;
  using_real_api: boolean;
}

interface PlatformConfig {
  platform: string;
  shop_id?: string;
  access_token?: string;
  refresh_token?: string;
  app_key?: string;
  app_secret?: string;
}

// ============ SHOPEE API INTEGRATION ============
// Docs: https://open.shopee.com/documents/v2/
async function fetchShopeeData(config: PlatformConfig): Promise<{ orders: any[]; products: any[]; settlements: any[] }> {
  console.log('📦 Fetching Shopee data...');
  
  const shopId = config.shop_id;
  const accessToken = config.access_token;
  const appKey = config.app_key;
  
  // Check if we have real credentials
  if (!shopId || !accessToken || !appKey) {
    console.log('⚠️ Shopee: No credentials, returning demo data');
    return {
      orders: [
        { order_id: 'SPE001', total: 450000, status: 'completed', platform: 'shopee', order_date: new Date().toISOString() },
        { order_id: 'SPE002', total: 680000, status: 'shipping', platform: 'shopee', order_date: new Date().toISOString() },
      ],
      products: [],
      settlements: [],
    };
  }

  try {
    // Real Shopee API call
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/order/get_order_list';
    
    // Generate signature (simplified - in production use proper HMAC)
    const baseString = `${appKey}${path}${timestamp}${accessToken}${shopId}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.app_secret || '');
    const msgData = encoder.encode(baseString);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch(
      `https://partner.shopeemobile.com${path}?partner_id=${appKey}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${signatureHex}&time_range_field=create_time&time_from=${timestamp - 86400 * 7}&time_to=${timestamp}&page_size=50`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`Shopee API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Shopee: Fetched ${data.response?.order_list?.length || 0} orders`);

    return {
      orders: data.response?.order_list || [],
      products: [],
      settlements: [],
    };
  } catch (error) {
    console.error('❌ Shopee API error:', error);
    throw error;
  }
}

// ============ LAZADA API INTEGRATION ============
// Docs: https://open.lazada.com/apps/doc/api
async function fetchLazadaData(config: PlatformConfig): Promise<{ orders: any[]; products: any[]; settlements: any[] }> {
  console.log('📦 Fetching Lazada data...');
  
  const accessToken = config.access_token;
  const appKey = config.app_key;
  
  if (!accessToken || !appKey) {
    console.log('⚠️ Lazada: No credentials, returning demo data');
    return {
      orders: [
        { order_id: 'LZD001', total: 890000, status: 'delivered', platform: 'lazada', order_date: new Date().toISOString() },
        { order_id: 'LZD002', total: 1250000, status: 'shipping', platform: 'lazada', order_date: new Date().toISOString() },
      ],
      products: [],
      settlements: [],
    };
  }

  try {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
    
    // Generate signature
    const params = {
      app_key: appKey,
      timestamp,
      sign_method: 'sha256',
      access_token: accessToken,
    };
    
    const sortedParams = Object.keys(params).sort().map(k => `${k}${params[k as keyof typeof params]}`).join('');
    const signString = `/orders/get${sortedParams}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.app_secret || '');
    const msgData = encoder.encode(signString);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const response = await fetch(
      `https://api.lazada.vn/rest/orders/get?app_key=${appKey}&timestamp=${timestamp}&sign_method=sha256&access_token=${accessToken}&sign=${signatureHex}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`Lazada API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Lazada: Fetched ${data.data?.orders?.length || 0} orders`);

    return {
      orders: data.data?.orders || [],
      products: [],
      settlements: [],
    };
  } catch (error) {
    console.error('❌ Lazada API error:', error);
    throw error;
  }
}

// ============ TIKTOK SHOP API INTEGRATION ============
// Docs: https://partner.tiktokshop.com/doc/
async function fetchTikTokData(config: PlatformConfig): Promise<{ orders: any[]; products: any[]; settlements: any[] }> {
  console.log('📦 Fetching TikTok Shop data...');
  
  const accessToken = config.access_token;
  const appKey = config.app_key;
  const shopId = config.shop_id;
  
  if (!accessToken || !appKey || !shopId) {
    console.log('⚠️ TikTok: No credentials, returning demo data');
    return {
      orders: [
        { order_id: 'TIK001', total: 280000, status: 'completed', platform: 'tiktok', order_date: new Date().toISOString() },
        { order_id: 'TIK002', total: 550000, status: 'pending', platform: 'tiktok', order_date: new Date().toISOString() },
      ],
      products: [],
      settlements: [],
    };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/orders/search';
    
    // Generate signature
    const params = `app_key=${appKey}&shop_id=${shopId}&timestamp=${timestamp}`;
    const signString = `${path}?${params}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.app_secret || '');
    const msgData = encoder.encode(signString);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch(
      `https://open-api.tiktokglobalshop.com${path}?${params}&sign=${signatureHex}`,
      { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tts-access-token': accessToken,
        },
        body: JSON.stringify({
          page_size: 50,
          sort_type: 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ TikTok: Fetched ${data.data?.orders?.length || 0} orders`);

    return {
      orders: data.data?.orders || [],
      products: [],
      settlements: [],
    };
  } catch (error) {
    console.error('❌ TikTok API error:', error);
    throw error;
  }
}

// Transform platform data to standard format
function transformOrders(orders: any[], platform: string): any[] {
  return orders.map(order => {
    switch (platform) {
      case 'shopee':
        return {
          external_order_id: order.order_sn || order.order_id,
          channel: 'Shopee',
          order_date: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
          status: mapShopeeStatus(order.order_status),
          total_amount: order.total_amount || order.total || 0,
          payment_status: order.order_status === 'COMPLETED' ? 'paid' : 'pending',
          shipping_fee: order.actual_shipping_fee || 0,
          raw_data: order,
        };
      case 'lazada':
        return {
          external_order_id: order.order_number || order.order_id,
          channel: 'Lazada',
          order_date: order.created_at || new Date().toISOString(),
          status: mapLazadaStatus(order.statuses?.[0]),
          total_amount: parseFloat(order.price) || order.total || 0,
          payment_status: order.payment_method ? 'paid' : 'pending',
          shipping_fee: parseFloat(order.shipping_fee) || 0,
          raw_data: order,
        };
      case 'tiktok':
        return {
          external_order_id: order.order_id,
          channel: 'TikTok',
          order_date: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
          status: mapTikTokStatus(order.order_status),
          total_amount: order.payment_info?.total_amount || order.total || 0,
          payment_status: order.payment_info?.payment_status === 1 ? 'paid' : 'pending',
          shipping_fee: order.payment_info?.shipping_fee || 0,
          raw_data: order,
        };
      default:
        return {
          external_order_id: order.order_id,
          channel: platform,
          order_date: new Date().toISOString(),
          status: 'pending',
          total_amount: order.total || 0,
          payment_status: 'pending',
          shipping_fee: 0,
          raw_data: order,
        };
    }
  });
}

function mapShopeeStatus(status: string): string {
  const map: Record<string, string> = {
    'UNPAID': 'pending',
    'READY_TO_SHIP': 'confirmed',
    'PROCESSED': 'processing',
    'SHIPPED': 'shipping',
    'COMPLETED': 'delivered',
    'IN_CANCEL': 'cancelled',
    'CANCELLED': 'cancelled',
  };
  return map[status] || 'pending';
}

function mapLazadaStatus(status: string): string {
  const map: Record<string, string> = {
    'pending': 'pending',
    'packed': 'confirmed',
    'ready_to_ship': 'processing',
    'shipped': 'shipping',
    'delivered': 'delivered',
    'canceled': 'cancelled',
    'returned': 'returned',
  };
  return map[status?.toLowerCase()] || 'pending';
}

function mapTikTokStatus(status: number): string {
  const map: Record<number, string> = {
    100: 'pending',
    111: 'confirmed',
    112: 'processing',
    121: 'shipping',
    122: 'delivered',
    130: 'cancelled',
    140: 'returned',
  };
  return map[status] || 'pending';
}

async function syncPlatformData(
  supabase: any, 
  tenantId: string, 
  source: any
): Promise<SyncResult> {
  const config = source.source_config as PlatformConfig;
  const platform = config?.platform;
  
  console.log(`\n🔄 Syncing ${source.source_name}...`);
  
  try {
    let data: { orders: any[]; products: any[]; settlements: any[] };
    let usingRealApi = false;
    
    switch (platform) {
      case 'shopee':
        data = await fetchShopeeData(config);
        usingRealApi = !!(config.access_token && config.shop_id && config.app_key);
        break;
      case 'lazada':
        data = await fetchLazadaData(config);
        usingRealApi = !!(config.access_token && config.app_key);
        break;
      case 'tiktok':
        data = await fetchTikTokData(config);
        usingRealApi = !!(config.access_token && config.shop_id && config.app_key);
        break;
      default:
        console.log(`Skipping unknown platform: ${platform}`);
        return { source: source.source_name, status: 'skipped', records_synced: 0, using_real_api: false };
    }

    // Transform and upsert orders
    const transformedOrders = transformOrders(data.orders, platform);
    
    if (transformedOrders.length > 0) {
      const ordersToInsert = transformedOrders.map(order => ({
        ...order,
        tenant_id: tenantId,
        integration_id: source.connector_integration_id || 'aaaa0001-0001-0001-0001-000000000001',
      }));

      const { error: insertError } = await supabase
        .from('external_orders')
        .upsert(ordersToInsert, { 
          onConflict: 'external_order_id,tenant_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.warn('Order upsert warning:', insertError.message);
      }
    }

    // Update sync status
    await supabase
      .from('alert_data_sources')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'completed',
        next_sync_at: new Date(Date.now() + source.sync_frequency_minutes * 60000).toISOString(),
        error_message: null
      })
      .eq('id', source.id);

    // Log sync
    await supabase.from('sync_logs').insert({
      tenant_id: tenantId,
      integration_id: source.connector_integration_id || 'aaaa0001-0001-0001-0001-000000000001',
      sync_type: 'orders',
      status: 'completed',
      records_fetched: data.orders.length,
      records_created: transformedOrders.length,
      records_updated: 0,
      records_failed: 0,
      triggered_by: 'scheduled',
      metadata: { using_real_api: usingRealApi, platform }
    });

    console.log(`✅ Synced ${transformedOrders.length} records from ${source.source_name} (Real API: ${usingRealApi})`);
    
    return { 
      source: source.source_name, 
      status: 'success', 
      records_synced: transformedOrders.length,
      using_real_api: usingRealApi,
    };

  } catch (error: any) {
    console.error(`❌ Error syncing ${source.source_name}:`, error);
    
    // Update error status
    await supabase
      .from('alert_data_sources')
      .update({
        sync_status: 'error',
        error_message: error.message
      })
      .eq('id', source.id);

    return { 
      source: source.source_name, 
      status: 'error', 
      records_synced: 0,
      error: error.message,
      using_real_api: false,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Starting platform data sync...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Security: Require service role key for e-commerce sync operations
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${supabaseKey}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Service role key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { tenant_id, source_id } = body;

    // Build query
    let query = supabase
      .from('alert_data_sources')
      .select('*')
      .eq('is_active', true)
      .in('source_type', ['ecommerce_api', 'pos_api', 'analytics_api']);

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }
    if (source_id) {
      query = query.eq('id', source_id);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      throw sourcesError;
    }

    console.log(`Found ${sources?.length || 0} active data sources`);

    const results: SyncResult[] = [];

    // Sync each source
    for (const source of sources || []) {
      const result = await syncPlatformData(supabase, source.tenant_id, source);
      results.push(result);
    }

    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + r.records_synced, 0);
    const successCount = results.filter(r => r.status === 'success').length;
    const realApiCount = results.filter(r => r.using_real_api).length;

    console.log(`\n🏁 Sync completed in ${duration}ms`);
    console.log(`   Sources: ${successCount}/${sources?.length || 0} successful`);
    console.log(`   Real API: ${realApiCount}/${sources?.length || 0} sources`);
    console.log(`   Total records: ${totalSynced}`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        sources_processed: sources?.length || 0,
        total_records_synced: totalSynced,
        real_api_sources: realApiCount,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
