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
}

// Mock API responses for demo - replace with real API calls when credentials are available
async function fetchShopeeData(config: any): Promise<any[]> {
  console.log('📦 Fetching Shopee data...', config);
  // In production, this would call the real Shopee API
  // const response = await fetch(`https://partner.shopeemobile.com/api/v2/...`, {
  //   headers: { 'Authorization': `Bearer ${config.access_token}` }
  // });
  
  // Return mock data for demo
  return [
    { order_id: 'SPE001', total: 450000, status: 'completed', platform: 'shopee' },
    { order_id: 'SPE002', total: 680000, status: 'shipping', platform: 'shopee' },
    { order_id: 'SPE003', total: 320000, status: 'pending', platform: 'shopee' },
  ];
}

async function fetchLazadaData(config: any): Promise<any[]> {
  console.log('📦 Fetching Lazada data...', config);
  // In production, this would call the real Lazada API
  // const response = await fetch(`https://api.lazada.vn/rest/...`, {
  //   headers: { 'Authorization': `Bearer ${config.access_token}` }
  // });
  
  return [
    { order_id: 'LZD001', total: 890000, status: 'delivered', platform: 'lazada' },
    { order_id: 'LZD002', total: 1250000, status: 'shipping', platform: 'lazada' },
  ];
}

async function fetchTikTokData(config: any): Promise<any[]> {
  console.log('📦 Fetching TikTok Shop data...', config);
  // In production, this would call the real TikTok Shop API
  
  return [
    { order_id: 'TIK001', total: 280000, status: 'completed', platform: 'tiktok' },
    { order_id: 'TIK002', total: 550000, status: 'pending', platform: 'tiktok' },
  ];
}

async function syncPlatformData(
  supabase: any, 
  tenantId: string, 
  source: any
): Promise<SyncResult> {
  const config = source.source_config as any;
  const platform = config?.platform;
  
  console.log(`\n🔄 Syncing ${source.source_name}...`);
  
  try {
    let data: any[] = [];
    
    switch (platform) {
      case 'shopee':
        data = await fetchShopeeData(config);
        break;
      case 'lazada':
        data = await fetchLazadaData(config);
        break;
      case 'tiktok':
        data = await fetchTikTokData(config);
        break;
      default:
        console.log(`Skipping unknown platform: ${platform}`);
        return { source: source.source_name, status: 'skipped', records_synced: 0 };
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
      records_fetched: data.length,
      records_created: data.length,
      records_updated: 0,
      records_failed: 0,
      triggered_by: 'scheduled'
    });

    console.log(`✅ Synced ${data.length} records from ${source.source_name}`);
    
    return { 
      source: source.source_name, 
      status: 'success', 
      records_synced: data.length 
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
      error: error.message 
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

    console.log(`\n🏁 Sync completed in ${duration}ms`);
    console.log(`   Sources: ${successCount}/${sources?.length || 0} successful`);
    console.log(`   Total records: ${totalSynced}`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        sources_processed: sources?.length || 0,
        total_records_synced: totalSynced,
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
