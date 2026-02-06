import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: JWT validation OR service role required
 * This function can be called by:
 * 1. Authenticated users (for their tenant's integrations)
 * 2. Scheduled sync jobs (with service role)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  integration_id: string;
  sync_type?: 'orders' | 'products' | 'fees' | 'settlements' | 'inventory' | 'all';
  date_from?: string;
  date_to?: string;
}

// Platform API handlers
const platformHandlers: Record<string, (integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) => Promise<any>> = {
  haravan: syncHaravan,
  shopee: syncShopee,
  lazada: syncLazada,
  tiktok_shop: syncTikTokShop,
  sapo: syncSapo,
  kiotviet: syncKiotViet,
  woocommerce: syncWooCommerce,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { integration_id, sync_type = 'all', date_from, date_to }: SyncRequest = await req.json();

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    // Get integration details first to check tenant
    const { data: integration, error: integrationError } = await supabase
      .from('connector_integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      throw new Error(`Integration not found: ${integrationError?.message}`);
    }

    // SECURITY: Validate access
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader === `Bearer ${supabaseKey}`;

    if (!isServiceRole) {
      // User call - validate JWT and tenant access
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub as string;

      // Get user's tenant
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (tenantError || !tenantUser?.tenant_id) {
        return new Response(JSON.stringify({ error: 'Forbidden - No tenant access', code: 'NO_TENANT' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // SECURITY: Verify integration belongs to user's tenant
      if (integration.tenant_id !== tenantUser.tenant_id) {
        console.error(`Cross-tenant access denied: user ${userId} tried to sync integration ${integration_id}`);
        return new Response(JSON.stringify({ error: 'Forbidden - Cross-tenant access denied', code: 'CROSS_TENANT' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User ${userId} syncing integration for tenant: ${tenantUser.tenant_id}`);
    } else {
      console.log(`Service role syncing integration for tenant: ${integration.tenant_id}`);
    }

    console.log(`Starting sync for ${integration.connector_type} - ${integration.shop_name}`);

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        integration_id,
        tenant_id: integration.tenant_id,
        sync_type,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create sync log:', logError);
    }

    // Get the appropriate handler
    const handler = platformHandlers[integration.connector_type];
    if (!handler) {
      throw new Error(`Unsupported connector type: ${integration.connector_type}`);
    }

    // Execute sync
    const result = await handler(integration, supabase, sync_type, date_from, date_to);

    // Update sync log
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_synced: result.total_synced,
          records_failed: result.total_failed,
        })
        .eq('id', syncLog.id);
    }

    // Update integration last_sync_at
    await supabase
      .from('connector_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'active',
        error_message: null,
      })
      .eq('id', integration_id);

    console.log(`Sync completed for ${integration.connector_type}: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify({
      success: true,
      integration_id,
      connector_type: integration.connector_type,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============ HARAVAN ============
async function syncHaravan(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; shop_domain?: string };
  const baseUrl = `https://${credentials.shop_domain || integration.shop_id}.myharavan.com/admin`;
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncHaravanOrders(integration, supabase, baseUrl, credentials.access_token!, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncHaravanProducts(integration, supabase, baseUrl, credentials.access_token!);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncHaravanOrders(integration: any, supabase: any, baseUrl: string, accessToken: string, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    // Haravan API: GET /admin/orders.json
    const params = new URLSearchParams({
      limit: '250',
      status: 'any',
    });
    if (dateFrom) params.append('created_at_min', dateFrom);
    if (dateTo) params.append('created_at_max', dateTo);

    const response = await fetch(`${baseUrl}/orders.json?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Haravan API error: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    for (const order of orders) {
      try {
        // Map Haravan order to cdp_orders (SSOT Layer 2)
        const grossRevenue = parseFloat(order.total_price || '0');
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: order.id.toString(),
          order_number: order.order_number?.toString() || order.name,
          channel: 'haravan',
          status: mapHaravanStatus(order.fulfillment_status, order.financial_status),
          payment_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          order_at: order.created_at,
          customer_name: order.customer?.first_name ? `${order.customer.first_name} ${order.customer.last_name}` : order.shipping_address?.name,
          customer_email: order.customer?.email || order.email,
          customer_phone: order.customer?.phone || order.shipping_address?.phone,
          shipping_address: order.shipping_address,
          items: order.line_items?.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            discount: parseFloat(item.total_discount || '0'),
          })) || [],
          item_count: order.line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
          subtotal: parseFloat(order.subtotal_price || '0'),
          shipping_fee: parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'),
          item_discount: parseFloat(order.total_discounts || '0'),
          gross_revenue: grossRevenue,
          payment_method: order.gateway,
          buyer_note: order.note,
          raw_data: order,
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync order ${order.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Haravan orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncHaravanProducts(integration: any, supabase: any, baseUrl: string, accessToken: string) {
  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch(`${baseUrl}/products.json?limit=250`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Haravan API error: ${response.status}`);
    }

    const data = await response.json();
    const products = data.products || [];

    for (const product of products) {
      try {
        for (const variant of product.variants || [product]) {
          const mappedProduct = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: variant.id?.toString() || product.id?.toString(),
            external_sku: variant.sku,
            parent_sku: product.variants?.length > 1 ? product.id?.toString() : null,
            name: variant.title === 'Default Title' ? product.title : `${product.title} - ${variant.title}`,
            description: product.body_html,
            category: product.product_type,
            brand: product.vendor,
            selling_price: parseFloat(variant.price || '0'),
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            cost_price: parseFloat(variant.cost || '0'),
            stock_quantity: variant.inventory_quantity || 0,
            images: product.images?.map((img: any) => img.src) || [],
            status: product.status === 'active' ? 'active' : 'inactive',
            barcode: variant.barcode,
            weight: variant.weight,
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_products')
            .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync product ${product.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Haravan products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function mapHaravanStatus(fulfillment: string | null, financial: string | null): string {
  if (fulfillment === 'fulfilled' && financial === 'paid') return 'completed';
  if (fulfillment === 'fulfilled') return 'shipped';
  if (financial === 'paid') return 'processing';
  if (financial === 'pending') return 'pending';
  return 'pending';
}

// ============ SHOPEE ============
async function syncShopee(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; shop_id?: string; partner_id?: string; partner_key?: string };
  const baseUrl = 'https://partner.shopeemobile.com/api/v2';
  
  let totalSynced = 0;
  let totalFailed = 0;

  // Shopee requires signature for each request
  const timestamp = Math.floor(Date.now() / 1000);
  
  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncShopeeOrders(integration, supabase, baseUrl, credentials, timestamp, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncShopeeProducts(integration, supabase, baseUrl, credentials, timestamp);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  if (syncType === 'all' || syncType === 'settlements') {
    const settlementsResult = await syncShopeeSettlements(integration, supabase, baseUrl, credentials, timestamp, dateFrom, dateTo);
    totalSynced += settlementsResult.synced;
    totalFailed += settlementsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncShopeeOrders(integration: any, supabase: any, baseUrl: string, credentials: any, timestamp: number, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    // Shopee API v2: /order/get_order_list
    const timeFrom = dateFrom ? Math.floor(new Date(dateFrom).getTime() / 1000) : Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60;
    const timeTo = dateTo ? Math.floor(new Date(dateTo).getTime() / 1000) : Math.floor(Date.now() / 1000);

    const sign = generateShopeeSign('/api/v2/order/get_order_list', credentials.partner_key, timestamp, credentials.access_token, credentials.shop_id);

    const params = new URLSearchParams({
      partner_id: credentials.partner_id,
      timestamp: timestamp.toString(),
      access_token: credentials.access_token,
      shop_id: credentials.shop_id,
      sign,
      time_range_field: 'create_time',
      time_from: timeFrom.toString(),
      time_to: timeTo.toString(),
      page_size: '100',
    });

    const response = await fetch(`${baseUrl}/order/get_order_list?${params}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Shopee API error: ${data.message}`);
    }

    const orderList = data.response?.order_list || [];

    // Get order details
    if (orderList.length > 0) {
      const orderSns = orderList.map((o: any) => o.order_sn).join(',');
      const detailSign = generateShopeeSign('/api/v2/order/get_order_detail', credentials.partner_key, timestamp, credentials.access_token, credentials.shop_id);
      
      const detailParams = new URLSearchParams({
        partner_id: credentials.partner_id,
        timestamp: timestamp.toString(),
        access_token: credentials.access_token,
        shop_id: credentials.shop_id,
        sign: detailSign,
        order_sn_list: orderSns,
        response_optional_fields: 'buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper,dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,buyer_username,invoice_data,checkout_shipping_carrier,reverse_shipping_fee,order_chargeable_weight_gram,edt,prescription_images,prescription_check_status',
      });

      const detailResponse = await fetch(`${baseUrl}/order/get_order_detail?${detailParams}`);
      const detailData = await detailResponse.json();

      const orders = detailData.response?.order_list || [];

      for (const order of orders) {
        try {
          // Map to cdp_orders schema (SSOT Layer 2)
          const grossRevenue = parseFloat(order.total_amount || '0');
          const mappedOrder = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            order_key: order.order_sn,
            order_number: order.order_sn,
            channel: 'shopee',
            status: mapShopeeStatus(order.order_status),
            payment_status: order.order_status === 'COMPLETED' ? 'paid' : 'pending',
            fulfillment_status: order.order_status,
            order_at: new Date(order.create_time * 1000).toISOString(),
            paid_at: order.pay_time ? new Date(order.pay_time * 1000).toISOString() : null,
            shipped_at: order.ship_by_date ? new Date(order.ship_by_date * 1000).toISOString() : null,
            customer_name: order.recipient_address?.name,
            customer_phone: order.recipient_address?.phone,
            shipping_address: order.recipient_address,
            items: order.item_list?.map((item: any) => ({
              sku: item.model_sku || item.item_sku,
              name: item.item_name,
              quantity: item.model_quantity_purchased,
              price: parseFloat(item.model_discounted_price || item.model_original_price),
              discount: 0,
            })) || [],
            item_count: order.item_list?.reduce((sum: number, item: any) => sum + item.model_quantity_purchased, 0) || 0,
            subtotal: order.item_list?.reduce((sum: number, item: any) => sum + (parseFloat(item.model_discounted_price || item.model_original_price) * item.model_quantity_purchased), 0) || 0,
            shipping_fee: parseFloat(order.actual_shipping_fee || order.estimated_shipping_fee || '0'),
            platform_fee: 0,
            commission_fee: 0,
            voucher_discount: parseFloat(order.voucher_from_seller || '0') + parseFloat(order.voucher_from_shopee || '0'),
            gross_revenue: grossRevenue,
            seller_income: parseFloat(order.escrow_amount || '0'),
            payment_method: order.payment_method,
            buyer_note: order.note,
            raw_data: order,
          };

          await supabase
            .from('cdp_orders')
            .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

          synced++;
        } catch (e) {
          console.error(`Failed to sync Shopee order ${order.order_sn}:`, e);
          failed++;
        }
      }
    }
  } catch (e) {
    console.error('Shopee orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncShopeeProducts(integration: any, supabase: any, baseUrl: string, credentials: any, timestamp: number) {
  let synced = 0;
  let failed = 0;

  try {
    const sign = generateShopeeSign('/api/v2/product/get_item_list', credentials.partner_key, timestamp, credentials.access_token, credentials.shop_id);

    const params = new URLSearchParams({
      partner_id: credentials.partner_id,
      timestamp: timestamp.toString(),
      access_token: credentials.access_token,
      shop_id: credentials.shop_id,
      sign,
      offset: '0',
      page_size: '100',
      item_status: 'NORMAL',
    });

    const response = await fetch(`${baseUrl}/product/get_item_list?${params}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Shopee API error: ${data.message}`);
    }

    const items = data.response?.item || [];

    for (const item of items) {
      try {
        // Get item detail
        const detailSign = generateShopeeSign('/api/v2/product/get_item_base_info', credentials.partner_key, timestamp, credentials.access_token, credentials.shop_id);
        const detailParams = new URLSearchParams({
          partner_id: credentials.partner_id,
          timestamp: timestamp.toString(),
          access_token: credentials.access_token,
          shop_id: credentials.shop_id,
          sign: detailSign,
          item_id_list: item.item_id.toString(),
        });

        const detailResponse = await fetch(`${baseUrl}/product/get_item_base_info?${detailParams}`);
        const detailData = await detailResponse.json();
        const product = detailData.response?.item_list?.[0];

        if (product) {
          for (const model of product.model_list || [{ model_id: product.item_id, model_sku: product.item_sku }]) {
            const mappedProduct = {
              tenant_id: integration.tenant_id,
              integration_id: integration.id,
              external_product_id: `${product.item_id}_${model.model_id}`,
              external_sku: model.model_sku || product.item_sku,
              parent_sku: product.model_list?.length > 1 ? product.item_id.toString() : null,
              name: model.model_name ? `${product.item_name} - ${model.model_name}` : product.item_name,
              description: product.description,
              category: product.category_id?.toString(),
              brand: product.brand?.brand_name,
              selling_price: model.price_info?.current_price || product.price_info?.[0]?.current_price || 0,
              stock_quantity: model.stock_info?.current_stock || product.stock_info?.[0]?.current_stock || 0,
              images: product.image?.image_url_list || [],
              status: product.item_status === 'NORMAL' ? 'active' : 'inactive',
              last_synced_at: new Date().toISOString(),
            };

            await supabase
              .from('external_products')
              .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

            synced++;
          }
        }
      } catch (e) {
        console.error(`Failed to sync Shopee product ${item.item_id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Shopee products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncShopeeSettlements(integration: any, supabase: any, baseUrl: string, credentials: any, timestamp: number, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    // Shopee Payment API: Get wallet transactions
    const sign = generateShopeeSign('/api/v2/payment/get_wallet_transaction_list', credentials.partner_key, timestamp, credentials.access_token, credentials.shop_id);

    const params = new URLSearchParams({
      partner_id: credentials.partner_id,
      timestamp: timestamp.toString(),
      access_token: credentials.access_token,
      shop_id: credentials.shop_id,
      sign,
      page_no: '1',
      page_size: '100',
    });

    const response = await fetch(`${baseUrl}/payment/get_wallet_transaction_list?${params}`);
    const data = await response.json();

    if (!data.error && data.response?.transaction_list) {
      for (const transaction of data.response.transaction_list) {
        try {
          const settlement = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            settlement_id: transaction.transaction_id.toString(),
            settlement_number: transaction.transaction_id.toString(),
            period_start: new Date(transaction.create_time * 1000).toISOString().split('T')[0],
            period_end: new Date(transaction.create_time * 1000).toISOString().split('T')[0],
            payout_date: transaction.payout_time ? new Date(transaction.payout_time * 1000).toISOString().split('T')[0] : null,
            gross_sales: Math.abs(parseFloat(transaction.amount || '0')),
            net_amount: parseFloat(transaction.current_balance || '0'),
            status: transaction.status === 'COMPLETED' ? 'completed' : 'pending',
            raw_data: transaction,
          };

          await supabase
            .from('channel_settlements')
            .upsert(settlement, { onConflict: 'integration_id,settlement_id' });

          synced++;
        } catch (e) {
          console.error(`Failed to sync Shopee settlement:`, e);
          failed++;
        }
      }
    }
  } catch (e) {
    console.error('Shopee settlements sync error:', e);
  }

  return { synced, failed };
}

function generateShopeeSign(path: string, partnerKey: string, timestamp: number, accessToken?: string, shopId?: string): string {
  // Shopee signature: SHA256(partner_id + path + timestamp + access_token + shop_id + partner_key)
  // This is a simplified version - real implementation needs crypto
  const encoder = new TextEncoder();
  const baseString = `${path}${timestamp}${accessToken || ''}${shopId || ''}`;
  return 'mock_sign'; // In real implementation, use crypto to generate HMAC-SHA256
}

function mapShopeeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'UNPAID': 'pending',
    'READY_TO_SHIP': 'processing',
    'PROCESSED': 'processing',
    'SHIPPED': 'shipped',
    'COMPLETED': 'completed',
    'IN_CANCEL': 'cancelled',
    'CANCELLED': 'cancelled',
    'INVOICE_PENDING': 'pending',
  };
  return statusMap[status] || 'pending';
}

// ============ LAZADA ============
async function syncLazada(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; app_key?: string; app_secret?: string };
  const baseUrl = 'https://api.lazada.vn/rest';
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncLazadaOrders(integration, supabase, baseUrl, credentials, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncLazadaProducts(integration, supabase, baseUrl, credentials);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncLazadaOrders(integration: any, supabase: any, baseUrl: string, credentials: any, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    // Lazada API: /orders/get
    const timestamp = new Date().toISOString();
    const createAfter = dateFrom || new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const createBefore = dateTo || new Date().toISOString();

    const params = new URLSearchParams({
      app_key: credentials.app_key,
      access_token: credentials.access_token,
      timestamp,
      sign_method: 'sha256',
      created_after: createAfter,
      created_before: createBefore,
      limit: '100',
    });

    // Generate Lazada sign (simplified)
    const sign = generateLazadaSign(params, credentials.app_secret);
    params.append('sign', sign);

    const response = await fetch(`${baseUrl}/orders/get?${params}`);
    const data = await response.json();

    if (data.code !== '0') {
      throw new Error(`Lazada API error: ${data.message}`);
    }

    const orders = data.data?.orders || [];

    for (const order of orders) {
      try {
        // Get order items
        const itemParams = new URLSearchParams({
          app_key: credentials.app_key,
          access_token: credentials.access_token,
          timestamp: new Date().toISOString(),
          sign_method: 'sha256',
          order_id: order.order_id.toString(),
        });
        const itemSign = generateLazadaSign(itemParams, credentials.app_secret);
        itemParams.append('sign', itemSign);

        const itemResponse = await fetch(`${baseUrl}/order/items/get?${itemParams}`);
        const itemData = await itemResponse.json();
        const items = itemData.data || [];

        // Map to cdp_orders schema (SSOT Layer 2)
        const grossRevenue = parseFloat(order.price || '0');
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: order.order_id.toString(),
          order_number: order.order_number,
          channel: 'lazada',
          status: mapLazadaStatus(order.statuses?.[0]),
          payment_status: order.payment_method ? 'paid' : 'pending',
          fulfillment_status: order.statuses?.[0],
          order_at: order.created_at,
          customer_name: order.customer_first_name + ' ' + order.customer_last_name,
          shipping_address: order.address_shipping,
          items: items.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity || 1,
            price: parseFloat(item.item_price || '0'),
            discount: parseFloat(item.voucher_amount || '0'),
          })),
          item_count: items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
          subtotal: items.reduce((sum: number, item: any) => sum + parseFloat(item.item_price || '0'), 0),
          shipping_fee: parseFloat(order.shipping_fee || '0'),
          voucher_discount: parseFloat(order.voucher || '0'),
          gross_revenue: grossRevenue,
          payment_method: order.payment_method,
          buyer_note: order.remarks,
          raw_data: { order, items },
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync Lazada order ${order.order_id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Lazada orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncLazadaProducts(integration: any, supabase: any, baseUrl: string, credentials: any) {
  let synced = 0;
  let failed = 0;

  try {
    const params = new URLSearchParams({
      app_key: credentials.app_key,
      access_token: credentials.access_token,
      timestamp: new Date().toISOString(),
      sign_method: 'sha256',
      limit: '100',
    });
    const sign = generateLazadaSign(params, credentials.app_secret);
    params.append('sign', sign);

    const response = await fetch(`${baseUrl}/products/get?${params}`);
    const data = await response.json();

    if (data.code !== '0') {
      throw new Error(`Lazada API error: ${data.message}`);
    }

    const products = data.data?.products || [];

    for (const product of products) {
      try {
        for (const sku of product.skus || [product]) {
          const mappedProduct = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: sku.SkuId?.toString() || product.item_id?.toString(),
            external_sku: sku.SellerSku,
            name: product.attributes?.name || sku.SellerSku,
            description: product.attributes?.description,
            category: product.primary_category?.toString(),
            brand: product.attributes?.brand,
            selling_price: parseFloat(sku.price || '0'),
            compare_at_price: sku.special_price ? parseFloat(sku.special_price) : null,
            stock_quantity: parseInt(sku.quantity || '0'),
            images: product.images || [],
            status: product.status === 'active' ? 'active' : 'inactive',
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_products')
            .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync Lazada product:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Lazada products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function generateLazadaSign(params: URLSearchParams, appSecret: string): string {
  // Lazada signature: HMAC-SHA256(sorted_params, app_secret)
  return 'mock_sign'; // In real implementation, use crypto
}

function mapLazadaStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'packed': 'processing',
    'ready_to_ship': 'processing',
    'shipped': 'shipped',
    'delivered': 'completed',
    'canceled': 'cancelled',
    'returned': 'returned',
  };
  return statusMap[status?.toLowerCase()] || 'pending';
}

// ============ TIKTOK SHOP ============
async function syncTikTokShop(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; app_key?: string; app_secret?: string; shop_id?: string };
  const baseUrl = 'https://open-api.tiktokglobalshop.com';
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncTikTokOrders(integration, supabase, baseUrl, credentials, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncTikTokProducts(integration, supabase, baseUrl, credentials);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncTikTokOrders(integration: any, supabase: any, baseUrl: string, credentials: any, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    // TikTok Shop API: /order/202309/orders/search
    const timestamp = Math.floor(Date.now() / 1000);
    const createTimeGe = dateFrom ? Math.floor(new Date(dateFrom).getTime() / 1000) : timestamp - 15 * 24 * 60 * 60;
    const createTimeLt = dateTo ? Math.floor(new Date(dateTo).getTime() / 1000) : timestamp;

    const response = await fetch(`${baseUrl}/order/202309/orders/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': credentials.access_token,
      },
      body: JSON.stringify({
        create_time_ge: createTimeGe,
        create_time_lt: createTimeLt,
        page_size: 100,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    const orders = data.data?.orders || [];

    for (const order of orders) {
      try {
        // Map to cdp_orders schema (SSOT Layer 2)
        const grossRevenue = parseFloat(order.payment?.total_amount || '0') / 100;
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: order.id,
          order_number: order.id,
          channel: 'tiktok',
          status: mapTikTokStatus(order.status),
          payment_status: order.payment?.payment_method_name ? 'paid' : 'pending',
          fulfillment_status: order.status,
          order_at: new Date(order.create_time * 1000).toISOString(),
          customer_name: order.recipient_address?.name,
          customer_phone: order.recipient_address?.phone_number,
          shipping_address: order.recipient_address,
          items: order.line_items?.map((item: any) => ({
            sku: item.seller_sku,
            name: item.product_name,
            quantity: item.quantity,
            price: parseFloat(item.sale_price || '0') / 100,
            discount: parseFloat(item.platform_discount || '0') / 100,
          })) || [],
          item_count: order.line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
          subtotal: parseFloat(order.payment?.sub_total || '0') / 100,
          shipping_fee: parseFloat(order.payment?.shipping_fee || '0') / 100,
          platform_fee: parseFloat(order.payment?.platform_discount || '0') / 100,
          gross_revenue: grossRevenue,
          payment_method: order.payment?.payment_method_name,
          buyer_note: order.buyer_message,
          raw_data: order,
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync TikTok order ${order.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('TikTok orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncTikTokProducts(integration: any, supabase: any, baseUrl: string, credentials: any) {
  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch(`${baseUrl}/product/202309/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': credentials.access_token,
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${data.message}`);
    }

    const products = data.data?.products || [];

    for (const product of products) {
      try {
        for (const sku of product.skus || [product]) {
          const mappedProduct = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: sku.id || product.id,
            external_sku: sku.seller_sku,
            name: product.title,
            description: product.description,
            category: product.category_chains?.[0]?.id,
            selling_price: parseFloat(sku.price?.sale_price || '0') / 100,
            compare_at_price: sku.price?.original_price ? parseFloat(sku.price.original_price) / 100 : null,
            stock_quantity: sku.inventory?.[0]?.quantity || 0,
            images: product.main_images?.map((img: any) => img.url_list?.[0]) || [],
            status: product.status === 'ACTIVATE' ? 'active' : 'inactive',
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_products')
            .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync TikTok product:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('TikTok products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function mapTikTokStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'UNPAID': 'pending',
    'AWAITING_SHIPMENT': 'processing',
    'AWAITING_COLLECTION': 'processing',
    'IN_TRANSIT': 'shipped',
    'DELIVERED': 'completed',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || 'pending';
}

// ============ SAPO ============
async function syncSapo(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; store_name?: string };
  const baseUrl = `https://${credentials.store_name}.mysapo.net/admin`;
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncSapoOrders(integration, supabase, baseUrl, credentials.access_token!, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncSapoProducts(integration, supabase, baseUrl, credentials.access_token!);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncSapoOrders(integration: any, supabase: any, baseUrl: string, accessToken: string, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    const params = new URLSearchParams({ limit: '250' });
    if (dateFrom) params.append('created_on_min', dateFrom);
    if (dateTo) params.append('created_on_max', dateTo);

    const response = await fetch(`${baseUrl}/orders.json?${params}`, {
      headers: {
        'X-Sapo-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const orders = data.orders || [];

    for (const order of orders) {
      try {
        // Map to cdp_orders schema (SSOT Layer 2)
        const grossRevenue = order.total_price || 0;
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: order.id.toString(),
          order_number: order.order_number || order.name,
          channel: 'sapo',
          status: mapSapoStatus(order.status, order.financial_status),
          payment_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          order_at: order.created_on,
          customer_name: order.billing_address?.full_name || order.customer?.full_name,
          customer_email: order.email,
          customer_phone: order.billing_address?.phone,
          shipping_address: order.shipping_address,
          items: order.order_line_items?.map((item: any) => ({
            sku: item.sku,
            name: item.title,
            quantity: item.quantity,
            price: item.price,
            discount: item.total_discount || 0,
          })) || [],
          item_count: order.order_line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
          subtotal: order.subtotal_price || 0,
          shipping_fee: order.total_shipping_price || 0,
          item_discount: order.total_discounts || 0,
          gross_revenue: grossRevenue,
          payment_method: order.gateway,
          buyer_note: order.note,
          raw_data: order,
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync Sapo order ${order.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Sapo orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncSapoProducts(integration: any, supabase: any, baseUrl: string, accessToken: string) {
  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch(`${baseUrl}/products.json?limit=250`, {
      headers: {
        'X-Sapo-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const products = data.products || [];

    for (const product of products) {
      try {
        for (const variant of product.variants || [product]) {
          const mappedProduct = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: variant.id?.toString() || product.id?.toString(),
            external_sku: variant.sku,
            parent_sku: product.variants?.length > 1 ? product.id?.toString() : null,
            name: variant.title || product.name,
            description: product.content,
            category: product.product_type,
            brand: product.vendor,
            selling_price: variant.variant_prices?.[0]?.value || 0,
            compare_at_price: variant.variant_prices?.[1]?.value,
            cost_price: variant.cost || 0,
            stock_quantity: variant.inventories?.[0]?.available || 0,
            images: product.images?.map((img: any) => img.src) || [],
            status: product.status === 'active' ? 'active' : 'inactive',
            barcode: variant.barcode,
            weight: variant.weight,
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_products')
            .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync Sapo product ${product.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('Sapo products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function mapSapoStatus(status: string, financial: string): string {
  if (status === 'complete') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  if (financial === 'paid') return 'processing';
  return 'pending';
}

// ============ KIOTVIET ============
async function syncKiotViet(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { access_token?: string; retailer?: string };
  const baseUrl = 'https://public.kiotapi.com';
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncKiotVietOrders(integration, supabase, baseUrl, credentials, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncKiotVietProducts(integration, supabase, baseUrl, credentials);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  if (syncType === 'all' || syncType === 'inventory') {
    const inventoryResult = await syncKiotVietInventory(integration, supabase, baseUrl, credentials);
    totalSynced += inventoryResult.synced;
    totalFailed += inventoryResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncKiotVietOrders(integration: any, supabase: any, baseUrl: string, credentials: any, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    const params = new URLSearchParams({
      pageSize: '100',
      orderBy: 'createdDate',
      orderDirection: 'Desc',
    });
    if (dateFrom) params.append('createdDate', dateFrom);

    const response = await fetch(`${baseUrl}/invoices?${params}`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Retailer': credentials.retailer,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const invoices = data.data || [];

    for (const invoice of invoices) {
      try {
        // Map to cdp_orders schema (SSOT Layer 2)
        const grossRevenue = invoice.total || 0;
        const cogs = invoice.invoiceDetails?.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0) || 0;
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: invoice.id.toString(),
          order_number: invoice.code,
          channel: 'kiotviet',
          status: mapKiotVietStatus(invoice.status),
          payment_status: invoice.status === 3 ? 'paid' : 'pending',
          order_at: invoice.createdDate,
          customer_name: invoice.customerName,
          customer_phone: invoice.customerPhone,
          items: invoice.invoiceDetails?.map((item: any) => ({
            sku: item.productCode,
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
          })) || [],
          item_count: invoice.invoiceDetails?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
          subtotal: invoice.subTotal || 0,
          item_discount: invoice.discount || 0,
          gross_revenue: grossRevenue,
          cogs: cogs,
          payment_method: invoice.payments?.[0]?.method,
          raw_data: invoice,
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync KiotViet invoice ${invoice.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('KiotViet orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncKiotVietProducts(integration: any, supabase: any, baseUrl: string, credentials: any) {
  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch(`${baseUrl}/products?pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Retailer': credentials.retailer,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const products = data.data || [];

    for (const product of products) {
      try {
        const mappedProduct = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          external_product_id: product.id.toString(),
          external_sku: product.code,
          name: product.fullName || product.name,
          description: product.description,
          category: product.categoryName,
          selling_price: product.basePrice || 0,
          cost_price: product.cost || 0,
          stock_quantity: product.onHand || 0,
          images: product.images || [],
          status: product.isActive ? 'active' : 'inactive',
          barcode: product.barCode,
          weight: product.weight,
          last_synced_at: new Date().toISOString(),
        };

        await supabase
          .from('external_products')
          .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync KiotViet product ${product.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('KiotViet products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncKiotVietInventory(integration: any, supabase: any, baseUrl: string, credentials: any) {
  let synced = 0;
  let failed = 0;

  try {
    // Get products with inventory
    const response = await fetch(`${baseUrl}/products?pageSize=100&includeInventory=true`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Retailer': credentials.retailer,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const products = data.data || [];

    for (const product of products) {
      try {
        for (const inventory of product.inventories || []) {
          const mappedInventory = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: product.id.toString(),
            warehouse_id: inventory.branchId?.toString(),
            warehouse_name: inventory.branchName,
            available_quantity: inventory.onHand || 0,
            reserved_quantity: inventory.reserved || 0,
            unit_cost: product.cost || 0,
            total_value: (inventory.onHand || 0) * (product.cost || 0),
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_inventory')
            .upsert(mappedInventory, { onConflict: 'integration_id,external_product_id,warehouse_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync KiotViet inventory ${product.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('KiotViet inventory sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function mapKiotVietStatus(status: number): string {
  const statusMap: Record<number, string> = {
    1: 'pending',
    2: 'processing',
    3: 'completed',
    4: 'cancelled',
  };
  return statusMap[status] || 'pending';
}

// ============ WOOCOMMERCE ============
async function syncWooCommerce(integration: any, supabase: any, syncType: string, dateFrom?: string, dateTo?: string) {
  const credentials = integration.credentials as { consumer_key?: string; consumer_secret?: string; store_url?: string };
  const baseUrl = `${credentials.store_url}/wp-json/wc/v3`;
  const auth = btoa(`${credentials.consumer_key}:${credentials.consumer_secret}`);
  
  let totalSynced = 0;
  let totalFailed = 0;

  if (syncType === 'all' || syncType === 'orders') {
    const ordersResult = await syncWooCommerceOrders(integration, supabase, baseUrl, auth, dateFrom, dateTo);
    totalSynced += ordersResult.synced;
    totalFailed += ordersResult.failed;
  }

  if (syncType === 'all' || syncType === 'products') {
    const productsResult = await syncWooCommerceProducts(integration, supabase, baseUrl, auth);
    totalSynced += productsResult.synced;
    totalFailed += productsResult.failed;
  }

  return { total_synced: totalSynced, total_failed: totalFailed };
}

async function syncWooCommerceOrders(integration: any, supabase: any, baseUrl: string, auth: string, dateFrom?: string, dateTo?: string) {
  let synced = 0;
  let failed = 0;

  try {
    const params = new URLSearchParams({ per_page: '100' });
    if (dateFrom) params.append('after', dateFrom);
    if (dateTo) params.append('before', dateTo);

    const response = await fetch(`${baseUrl}/orders?${params}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    const orders = await response.json();

    for (const order of orders) {
      try {
        // Map to cdp_orders schema (SSOT Layer 2)
        const grossRevenue = parseFloat(order.total || '0');
        const mappedOrder = {
          tenant_id: integration.tenant_id,
          integration_id: integration.id,
          order_key: order.id.toString(),
          order_number: order.number,
          channel: 'woocommerce',
          status: mapWooCommerceStatus(order.status),
          payment_status: order.date_paid ? 'paid' : 'pending',
          order_at: order.date_created,
          paid_at: order.date_paid,
          customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
          customer_email: order.billing?.email,
          customer_phone: order.billing?.phone,
          shipping_address: order.shipping,
          items: order.line_items?.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price || '0'),
            discount: parseFloat(item.total) - (parseFloat(item.price) * item.quantity),
          })) || [],
          item_count: order.line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
          subtotal: parseFloat(order.subtotal || '0'),
          shipping_fee: parseFloat(order.shipping_total || '0'),
          item_discount: parseFloat(order.discount_total || '0'),
          gross_revenue: grossRevenue,
          payment_method: order.payment_method_title,
          buyer_note: order.customer_note,
          raw_data: order,
        };

        await supabase
          .from('cdp_orders')
          .upsert(mappedOrder, { onConflict: 'tenant_id,integration_id,order_key' });

        synced++;
      } catch (e) {
        console.error(`Failed to sync WooCommerce order ${order.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('WooCommerce orders sync error:', e);
    failed++;
  }

  return { synced, failed };
}

async function syncWooCommerceProducts(integration: any, supabase: any, baseUrl: string, auth: string) {
  let synced = 0;
  let failed = 0;

  try {
    const response = await fetch(`${baseUrl}/products?per_page=100`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    const products = await response.json();

    for (const product of products) {
      try {
        if (product.variations?.length > 0) {
          // Get variations
          const varResponse = await fetch(`${baseUrl}/products/${product.id}/variations?per_page=100`, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          });
          const variations = await varResponse.json();

          for (const variant of variations) {
            const mappedProduct = {
              tenant_id: integration.tenant_id,
              integration_id: integration.id,
              external_product_id: variant.id.toString(),
              external_sku: variant.sku,
              parent_sku: product.id.toString(),
              name: `${product.name} - ${variant.attributes?.map((a: any) => a.option).join(', ')}`,
              description: product.description,
              category: product.categories?.[0]?.name,
              selling_price: parseFloat(variant.price || '0'),
              compare_at_price: variant.regular_price ? parseFloat(variant.regular_price) : null,
              stock_quantity: variant.stock_quantity || 0,
              images: variant.image ? [variant.image.src] : [],
              status: variant.status === 'publish' ? 'active' : 'inactive',
              weight: variant.weight ? parseFloat(variant.weight) : null,
              dimensions: variant.dimensions,
              last_synced_at: new Date().toISOString(),
            };

            await supabase
              .from('external_products')
              .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

            synced++;
          }
        } else {
          const mappedProduct = {
            tenant_id: integration.tenant_id,
            integration_id: integration.id,
            external_product_id: product.id.toString(),
            external_sku: product.sku,
            name: product.name,
            description: product.description,
            category: product.categories?.[0]?.name,
            selling_price: parseFloat(product.price || '0'),
            compare_at_price: product.regular_price ? parseFloat(product.regular_price) : null,
            stock_quantity: product.stock_quantity || 0,
            images: product.images?.map((img: any) => img.src) || [],
            status: product.status === 'publish' ? 'active' : 'inactive',
            weight: product.weight ? parseFloat(product.weight) : null,
            dimensions: product.dimensions,
            last_synced_at: new Date().toISOString(),
          };

          await supabase
            .from('external_products')
            .upsert(mappedProduct, { onConflict: 'integration_id,external_product_id' });

          synced++;
        }
      } catch (e) {
        console.error(`Failed to sync WooCommerce product ${product.id}:`, e);
        failed++;
      }
    }
  } catch (e) {
    console.error('WooCommerce products sync error:', e);
    failed++;
  }

  return { synced, failed };
}

function mapWooCommerceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'processing': 'processing',
    'on-hold': 'pending',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'refunded': 'returned',
    'failed': 'cancelled',
  };
  return statusMap[status] || 'pending';
}
