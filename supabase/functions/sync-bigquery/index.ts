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

  // Parse the private key
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

  // Exchange JWT for access token
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

  // Convert rows to objects using schema
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

// Map BigQuery order data to external_orders schema
function mapOrderData(row: any, channel: string, integrationId: string, tenantId: string): any {
  const channelLower = channel.toLowerCase();
  
  // Common mapping for all channels
  const mapped: any = {
    tenant_id: tenantId,
    integration_id: integrationId,
    channel: channelLower,
    external_order_id: row.order_id || row.orderId || row.order_sn,
    order_number: row.order_id || row.orderId || row.order_sn,
    order_date: row.create_time || row.createTime || row.created_at || new Date().toISOString(),
    status: mapOrderStatus(row.order_status || row.orderStatus || row.status, channelLower),
    customer_name: row.buyer_username || row.buyerUsername || row.customer_name || row.recipient_name,
    customer_phone: row.recipient_phone || row.buyerPhone,
    total_amount: parseFloat(row.total_amount || row.totalAmount || row.total_paid_amount || 0),
    subtotal: parseFloat(row.subtotal || row.items_total || row.product_subtotal || 0),
    shipping_fee: parseFloat(row.shipping_fee || row.shippingFee || row.buyer_paid_shipping_fee || 0),
    shipping_fee_discount: parseFloat(row.shipping_fee_discount || row.seller_discount || 0),
    platform_fee: parseFloat(row.platform_fee || row.transaction_fee || 0),
    commission_fee: parseFloat(row.commission_fee || row.commission || 0),
    payment_fee: parseFloat(row.payment_fee || row.service_fee || 0),
    voucher_discount: parseFloat(row.voucher_discount || row.voucher_seller || row.voucher_platform || 0),
    seller_income: parseFloat(row.seller_income || row.escrow_amount || row.actual_shipping_fee || 0),
    payment_method: row.payment_method || row.paymentMethod,
    payment_status: row.payment_status || row.paymentStatus,
    items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [],
    item_count: parseInt(row.item_count || row.itemCount || 1),
    shipping_address: row.shipping_address ? (typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address) : null,
    raw_data: row,
    last_synced_at: new Date().toISOString(),
  };

  // Parse dates
  if (row.ship_time || row.shipTime || row.shipped_at) {
    mapped.shipped_at = row.ship_time || row.shipTime || row.shipped_at;
  }
  if (row.complete_time || row.completeTime || row.delivered_at) {
    mapped.delivered_at = row.complete_time || row.completeTime || row.delivered_at;
  }
  if (row.cancel_time || row.cancelTime || row.cancelled_at) {
    mapped.cancelled_at = row.cancel_time || row.cancelTime || row.cancelled_at;
    mapped.cancel_reason = row.cancel_reason || row.cancelReason;
  }
  if (row.pay_time || row.payTime || row.paid_at) {
    mapped.paid_at = row.pay_time || row.payTime || row.paid_at;
  }

  return mapped;
}

// Map channel-specific status to unified status
// Valid enum values: pending, confirmed, processing, shipping, delivered, cancelled, returned
function mapOrderStatus(status: string, channel: string): string {
  if (!status) return 'pending';
  
  const statusLower = status.toLowerCase();
  
  // Common status mappings - must match order_status enum values
  if (statusLower.includes('complete') || statusLower.includes('delivered') || statusLower.includes('finish')) {
    return 'delivered';
  }
  if (statusLower.includes('cancel')) {
    return 'cancelled';
  }
  if (statusLower.includes('return') || statusLower.includes('refund')) {
    return 'returned';
  }
  if (statusLower.includes('ship') || statusLower.includes('transit') || statusLower.includes('delivery')) {
    return 'shipping'; // Fixed: was 'shipped', enum value is 'shipping'
  }
  if (statusLower.includes('process') || statusLower.includes('ready')) {
    return 'processing';
  }
  if (statusLower.includes('confirm') || statusLower.includes('paid') || statusLower.includes('pay')) {
    return 'confirmed'; // Fixed: 'paid' maps to 'confirmed'
  }
  if (statusLower.includes('pending') || statusLower.includes('unpaid')) {
    return 'pending';
  }
  
  return 'pending';
}

// Channel-specific queries
const CHANNEL_QUERIES: Record<string, { dataset: string; table: string; orderIdField: string }> = {
  shopee: {
    dataset: 'menstaysimplicity_shopee',
    table: 'shopee_Orders',
    orderIdField: 'order_sn',
  },
  lazada: {
    dataset: 'menstaysimplicity_lazada',
    table: 'lazada_Orders',
    orderIdField: 'orderNumber',
  },
  tiktok: {
    dataset: 'menstaysimplicity_tiktokshop',
    table: 'tiktok_Orders',
    orderIdField: 'order_id',
  },
  tiki: {
    dataset: 'menstaysimplicity_tiki',
    table: 'tiki_Orders',
    orderIdField: 'order_code',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncLogId: string | null = null;
  let supabase: any = null;

  try {
    const { 
      integration_id, 
      tenant_id, 
      channels = ['shopee', 'lazada', 'tiktok', 'tiki'],
      days_back = 30,
      service_account_key,
      project_id,
      action = 'sync', // 'sync' or 'count'
      batch_size = 2000, // Records per batch
      offset = 0, // For pagination
      single_channel // If specified, only sync this channel
    } = await req.json();

    console.log('Sync BigQuery started:', { 
      integration_id, 
      tenant_id, 
      channels: single_channel ? [single_channel] : channels, 
      days_back, 
      action,
      batch_size,
      offset 
    });

    if (!service_account_key || !project_id) {
      throw new Error('Missing service_account_key or project_id');
    }

    if (!tenant_id) {
      throw new Error('Missing tenant_id');
    }

    // Parse service account
    const serviceAccount = typeof service_account_key === 'string' 
      ? JSON.parse(service_account_key) 
      : service_account_key;

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Got BigQuery access token');

    // If action is 'count', just count records without syncing
    if (action === 'count') {
      const countResults: Record<string, { count: number; error?: string }> = {};
      let totalCount = 0;

      for (const channel of channels) {
        const channelConfig = CHANNEL_QUERIES[channel.toLowerCase()];
        if (!channelConfig) {
          countResults[channel] = { count: 0, error: 'Unknown channel' };
          continue;
        }

        try {
          const countQuery = `
            SELECT COUNT(*) as total_count
            FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.table}\`
          `;

          const rows = await queryBigQuery(accessToken, project_id, countQuery);
          const count = parseInt(rows[0]?.total_count || 0);
          countResults[channel] = { count };
          totalCount += count;
          console.log(`${channel}: ${count} records`);
        } catch (e: any) {
          console.error(`Error counting ${channel}:`, e.message);
          countResults[channel] = { count: 0, error: e.message };
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            total_count: totalCount,
            channels: countResults
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for sync
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which channels to sync
    const channelsToSync = single_channel ? [single_channel] : channels;

    // For single channel sync, don't create new sync log each time
    // Only create sync log for full sync (no offset) or first batch
    if (offset === 0) {
      const { data: syncLog, error: logError } = await supabase
        .from('sync_logs')
        .insert({
          tenant_id,
          integration_id,
          connector_type: 'bigquery',
          connector_name: 'BigQuery',
          sync_type: 'manual',
          status: 'running',
          started_at: new Date().toISOString(),
          sync_metadata: { channels: channelsToSync, days_back, project_id, batch_size }
        })
        .select()
        .single();

      if (!logError && syncLog) {
        syncLogId = syncLog.id;
        console.log('Created sync log:', syncLogId);
      }
    }

    const results: Record<string, { synced: number; errors: number; fetched: number; has_more: boolean }> = {};
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let hasMoreData = false;

    // Sync each channel
    for (const channel of channelsToSync) {
      const channelConfig = CHANNEL_QUERIES[channel.toLowerCase()];
      if (!channelConfig) {
        console.log(`Unknown channel: ${channel}, skipping`);
        continue;
      }

      try {
        console.log(`Syncing ${channel} orders (offset: ${offset}, limit: ${batch_size})...`);
        
        // Query with LIMIT and OFFSET for pagination
        const query = `
          SELECT * 
          FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.table}\`
          ORDER BY ${channelConfig.orderIdField}
          LIMIT ${batch_size}
          OFFSET ${offset}
        `;

        const rows = await queryBigQuery(accessToken, project_id, query);
        console.log(`${channel}: Found ${rows.length} orders (offset: ${offset})`);
        totalFetched += rows.length;

        // Check if there might be more data
        const channelHasMore = rows.length === batch_size;
        if (channelHasMore) hasMoreData = true;

        if (rows.length === 0) {
          results[channel] = { synced: 0, errors: 0, fetched: 0, has_more: false };
          continue;
        }

        // Map orders first
        const mappedOrders = rows.map(row => mapOrderData(row, channel, integration_id, tenant_id));
        
        // Batch upsert orders (100 at a time)
        const UPSERT_BATCH_SIZE = 100;
        let synced = 0;
        let errors = 0;

        for (let i = 0; i < mappedOrders.length; i += UPSERT_BATCH_SIZE) {
          const batch = mappedOrders.slice(i, i + UPSERT_BATCH_SIZE);
          let retries = 3;
          let success = false;
          
          while (retries > 0 && !success) {
            try {
              const { error } = await supabase
                .from('external_orders')
                .upsert(batch, { 
                  onConflict: 'tenant_id,integration_id,external_order_id',
                  ignoreDuplicates: false 
                });

              if (error) {
                retries--;
                if (retries === 0) {
                  console.error(`Error upserting batch ${i}-${i + batch.length}:`, error.message);
                  errors += batch.length;
                } else {
                  await new Promise(r => setTimeout(r, 500));
                }
              } else {
                synced += batch.length;
                success = true;
              }
            } catch (e: any) {
              retries--;
              if (retries === 0) {
                console.error(`Exception batch ${i}-${i + batch.length}:`, e?.message || e);
                errors += batch.length;
              } else {
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }
        }

        results[channel] = { synced, errors, fetched: rows.length, has_more: channelHasMore };
        totalInserted += synced;
        totalErrors += errors;
        console.log(`${channel}: Synced ${synced}, Errors ${errors}, Has more: ${channelHasMore}`);

      } catch (e) {
        console.error(`Error syncing ${channel}:`, e);
        results[channel] = { synced: 0, errors: 1, fetched: 0, has_more: false };
        totalErrors++;
      }
    }

    const endTime = new Date();

    // Only update sync log if we created one
    if (syncLogId) {
      await supabase
        .from('sync_logs')
        .update({
          status: hasMoreData ? 'partial' : 'completed',
          completed_at: endTime.toISOString(),
          records_fetched: totalFetched,
          records_created: totalInserted,
          records_failed: totalErrors,
          sync_metadata: { 
            channels: channelsToSync, 
            offset, 
            batch_size, 
            has_more: hasMoreData,
            next_offset: hasMoreData ? offset + batch_size : null
          }
        })
        .eq('id', syncLogId);
    }

    // Update integration last_sync_at
    if (integration_id) {
      await supabase
        .from('connector_integrations')
        .update({ 
          last_sync_at: endTime.toISOString(),
          status: 'active',
          error_message: null
        })
        .eq('id', integration_id);
    }

    console.log('Sync batch completed:', { totalFetched, totalInserted, totalErrors, hasMoreData });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          total_synced: totalInserted,
          total_fetched: totalFetched,
          total_errors: totalErrors,
          has_more: hasMoreData,
          next_offset: hasMoreData ? offset + batch_size : null,
          channels: results
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync BigQuery error:', errorMessage);

    // Update sync log with error
    if (syncLogId && supabase) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', syncLogId);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});