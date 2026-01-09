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

// Map BigQuery order data to external_orders schema with new fields
function mapOrderData(row: any, channel: string, integrationId: string, tenantId: string): any {
  const channelLower = channel.toLowerCase();
  
  // Extract shop_id based on channel
  const shopId = row.shop_id || row.shopId || row.shop_id_str || row.organization_id || null;
  
  // Parse items to calculate totals
  let items: any[] = [];
  let totalQuantity = 0;
  let totalCogs = 0;
  
  try {
    items = row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [];
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        totalQuantity += parseInt(item.quantity || item.qty || 1);
        totalCogs += parseFloat(item.cogs || item.cost || 0) * parseInt(item.quantity || item.qty || 1);
      });
    }
  } catch (e) {
    items = [];
  }
  
  // Calculate fees
  const platformFee = parseFloat(row.platform_fee || row.transaction_fee || row.service_fee || 0);
  const commissionFee = parseFloat(row.commission_fee || row.commission || row.commission_amount || 0);
  const paymentFee = parseFloat(row.payment_fee || row.payment_promotion || 0);
  const serviceFee = parseFloat(row.service_fee || row.seller_service_fee || 0);
  const shippingFee = parseFloat(row.shipping_fee || row.shippingFee || row.buyer_paid_shipping_fee || 0);
  const shippingFeeDiscount = parseFloat(row.shipping_fee_discount || row.seller_discount || row.shipping_rebate || 0);
  const voucherDiscount = parseFloat(row.voucher_discount || row.voucher_seller || row.voucher_platform || row.seller_voucher || row.platform_voucher || 0);
  const coinDiscount = parseFloat(row.coin_discount || row.coins_used || row.shopee_coins || 0);
  
  // Calculate total fees
  const totalFees = platformFee + commissionFee + paymentFee + serviceFee;
  
  // Calculate revenue and profit
  const totalAmount = parseFloat(row.total_amount || row.totalAmount || row.total_paid_amount || row.escrow_amount || 0);
  const subtotal = parseFloat(row.subtotal || row.items_total || row.product_subtotal || row.original_price || 0);
  const sellerIncome = parseFloat(row.seller_income || row.escrow_amount || row.actual_amount || 0);
  const netRevenue = sellerIncome > 0 ? sellerIncome : (totalAmount - totalFees);
  const grossProfit = netRevenue - totalCogs;
  const netProfit = grossProfit - shippingFee + shippingFeeDiscount;
  
  const mapped: any = {
    tenant_id: tenantId,
    integration_id: integrationId,
    channel: channelLower,
    external_order_id: row.order_id || row.orderId || row.order_sn || row.order_code,
    order_number: row.order_id || row.orderId || row.order_sn || row.order_code,
    order_date: row.create_time || row.createTime || row.created_at || row.created_on || new Date().toISOString(),
    status: mapOrderStatus(row.order_status || row.orderStatus || row.status, channelLower),
    
    // Customer info
    customer_name: row.buyer_username || row.buyerUsername || row.customer_name || row.recipient_name || row.buyer_name,
    customer_phone: row.recipient_phone || row.buyerPhone || row.buyer_phone || row.phone,
    buyer_id: row.buyer_id || row.buyerId || row.buyer_user_id || row.customer_id,
    
    // Location
    province_code: row.province_code || row.provinceCode || row.region || row.state,
    district_code: row.district_code || row.districtCode || row.city,
    ward_code: row.ward_code || row.wardCode,
    
    // Shop/Organization
    shop_id: shopId,
    shop_name: row.shop_name || row.shopName || row.organization_name,
    
    // Amounts
    total_amount: totalAmount,
    subtotal: subtotal,
    
    // Shipping
    shipping_fee: shippingFee,
    shipping_fee_discount: shippingFeeDiscount,
    actual_shipping_fee: parseFloat(row.actual_shipping_fee || row.actual_shipping_cost || 0),
    
    // Platform fees - detailed breakdown
    platform_fee: platformFee,
    commission_fee: commissionFee,
    payment_fee: paymentFee,
    service_fee: serviceFee,
    total_fees: totalFees,
    
    // Discounts
    voucher_discount: voucherDiscount,
    coin_discount: coinDiscount,
    seller_discount: parseFloat(row.seller_discount || row.seller_voucher || 0),
    platform_discount: parseFloat(row.platform_discount || row.platform_voucher || 0),
    
    // Revenue & Profit
    seller_income: sellerIncome,
    cogs: totalCogs,
    net_revenue: netRevenue,
    gross_profit: grossProfit,
    net_profit: netProfit,
    
    // Items
    items: items,
    item_count: items.length || parseInt(row.item_count || row.itemCount || 1),
    total_quantity: totalQuantity || parseInt(row.total_quantity || row.quantity || 1),
    
    // Payment
    payment_method: row.payment_method || row.paymentMethod || row.payment_type,
    payment_status: row.payment_status || row.paymentStatus,
    
    // Shipping details
    shipping_carrier: row.shipping_carrier || row.carrier || row.logistics_channel,
    tracking_number: row.tracking_number || row.trackingNumber || row.tracking_no,
    shipping_address: row.shipping_address ? (typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address) : null,
    
    // Timestamps
    last_synced_at: new Date().toISOString(),
    
    // Raw data for reference
    raw_data: row,
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
    mapped.cancel_reason = row.cancel_reason || row.cancelReason || row.cancel_reason_text;
  }
  if (row.pay_time || row.payTime || row.paid_at) {
    mapped.paid_at = row.pay_time || row.payTime || row.paid_at;
  }
  if (row.return_time || row.returnTime || row.returned_at) {
    mapped.returned_at = row.return_time || row.returnTime || row.returned_at;
    mapped.return_reason = row.return_reason || row.returnReason;
  }

  return mapped;
}

// Map order items from BigQuery
function mapOrderItems(orderId: string, items: any[], tenantId: string, integrationId: string, channel: string): any[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  
  return items.map((item, index) => ({
    tenant_id: tenantId,
    external_order_id: orderId,
    integration_id: integrationId,
    item_id: item.item_id || item.itemId || item.sku || `${orderId}-${index}`,
    sku: item.sku || item.model_sku || item.variation_sku || item.product_sku,
    product_name: item.name || item.item_name || item.product_name,
    variation_name: item.variation_name || item.variation || item.model_name,
    quantity: parseInt(item.quantity || item.qty || 1),
    unit_price: parseFloat(item.item_price || item.price || item.unit_price || 0),
    original_price: parseFloat(item.original_price || item.item_original_price || 0),
    discount_amount: parseFloat(item.discount || item.discount_amount || 0),
    total_amount: parseFloat(item.item_price || item.price || 0) * parseInt(item.quantity || item.qty || 1),
    cogs: parseFloat(item.cogs || item.cost || item.cost_price || 0),
    margin: 0, // Will be calculated
    weight: parseFloat(item.weight || 0),
    image_url: item.image_url || item.image || item.product_image,
    raw_data: item,
  }));
}

// Map settlement data
function mapSettlementData(row: any, channel: string, integrationId: string, tenantId: string): any {
  return {
    tenant_id: tenantId,
    integration_id: integrationId,
    settlement_id: row.settlement_id || row.settlementId || row.statement_id || row.id,
    settlement_number: row.settlement_number || row.statement_number,
    period_start: row.period_start || row.start_date || row.statement_start_time,
    period_end: row.period_end || row.end_date || row.statement_end_time,
    payout_date: row.payout_date || row.payment_date || row.transfer_date,
    gross_sales: parseFloat(row.gross_sales || row.total_released_amount || row.gross_amount || 0),
    total_fees: parseFloat(row.total_fees || row.total_fee || row.fee_amount || 0),
    total_commission: parseFloat(row.commission || row.total_commission || 0),
    total_service_fee: parseFloat(row.service_fee || row.seller_service_fee || 0),
    total_payment_fee: parseFloat(row.payment_fee || row.payment_promotion || 0),
    total_shipping_fee: parseFloat(row.shipping_fee || row.actual_shipping_fee || 0),
    total_refunds: parseFloat(row.refund_amount || row.total_refund || 0),
    total_adjustments: parseFloat(row.adjustment_amount || row.other_amount || 0),
    net_amount: parseFloat(row.net_amount || row.payout_amount || row.actual_amount || 0),
    total_orders: parseInt(row.order_count || row.total_orders || 0),
    status: row.status || 'pending',
    bank_name: row.bank_name || row.bank,
    bank_account: row.bank_account || row.account_number,
    transaction_id: row.transaction_id || row.payment_reference,
    fee_breakdown: {
      commission: parseFloat(row.commission || 0),
      service_fee: parseFloat(row.service_fee || 0),
      payment_fee: parseFloat(row.payment_fee || 0),
      shipping_fee: parseFloat(row.shipping_fee || 0),
      other_fees: parseFloat(row.other_fee || 0),
    },
    raw_data: row,
  };
}

// Map product data to external_products schema
function mapExternalProduct(row: any, tenantId: string, integrationId: string, channel: string): any {
  return {
    tenant_id: tenantId,
    integration_id: integrationId,
    external_product_id: String(row.item_id || row.product_id || row.id || row.sku),
    external_sku: row.sku || row.model_sku || row.variation_sku || row.seller_sku,
    name: row.name || row.product_name || row.item_name || 'Unknown',
    description: row.description || row.item_description,
    category: row.category_name || row.category || row.primary_category,
    brand: row.brand || row.brand_name,
    selling_price: parseFloat(row.price || row.selling_price || row.current_price || 0),
    cost_price: parseFloat(row.cogs || row.cost || row.unit_cost || 0),
    compare_at_price: parseFloat(row.original_price || row.compare_at_price || 0),
    stock_quantity: parseInt(row.stock || row.quantity || row.available_stock || 0),
    available_quantity: parseInt(row.available_quantity || row.sellable_quantity || row.stock || 0),
    weight: parseFloat(row.weight || 0),
    status: row.status || row.item_status || 'active',
    images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : null,
    variants: row.variants ? (typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants) : null,
    last_synced_at: new Date().toISOString(),
  };
}

// Map customer data
function mapCustomerData(row: any, tenantId: string): any {
  const fullName = row.name || row.full_name || 
    `${row.first_name || ''} ${row.last_name || ''}`.trim() ||
    row.billing_address_name || 'Unknown';
    
  return {
    tenant_id: tenantId,
    name: fullName,
    email: row.email || row.customer_email,
    phone: row.phone || row.mobile || row.billing_address_phone,
    address: row.address || row.address1 || row.billing_address_address1,
    city: row.city || row.billing_address_city,
    province: row.province || row.state || row.billing_address_province,
    country: row.country || row.billing_address_country || 'Vietnam',
    tax_code: row.tax_code || row.tax_id,
    notes: row.note || row.notes,
    status: row.status || 'active',
    total_orders: parseInt(row.orders_count || row.total_orders || 0),
    total_spent: parseFloat(row.total_spent || row.lifetime_value || 0),
    created_at: row.created_at || row.created_on || new Date().toISOString(),
  };
}

// Map product data for product_master (legacy)
function mapProductData(row: any, tenantId: string, integrationId: string, channel: string): any {
  const unitCost = parseFloat(row.cogs || row.cost || row.unit_cost || 0);
  const sellingPrice = parseFloat(row.price || row.selling_price || row.current_price || 0);
  const margin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice * 100) : 0;
  
  return {
    tenant_id: tenantId,
    sku: row.sku || row.model_sku || row.variation_sku,
    product_name: row.name || row.product_name || row.item_name,
    variation_name: row.variation_name || row.variation,
    category: row.category || row.category_name,
    brand: row.brand || row.brand_name,
    unit_cost: unitCost,
    selling_price: sellingPrice,
    margin_percent: margin,
    weight: parseFloat(row.weight || 0),
    status: row.status || 'active',
    image_url: row.image_url || row.image,
    channels: [channel],
    channel_data: {
      [channel]: {
        integration_id: integrationId,
        item_id: row.item_id || row.product_id,
        shop_id: row.shop_id,
        stock: parseInt(row.stock || row.quantity || 0),
        last_synced: new Date().toISOString(),
      }
    },
    last_synced_at: new Date().toISOString(),
  };
}

// Map channel-specific status to unified status
function mapOrderStatus(status: string, channel: string): string {
  if (!status) return 'pending';
  
  const statusLower = status.toLowerCase();
  
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
    return 'shipping';
  }
  if (statusLower.includes('process') || statusLower.includes('ready')) {
    return 'processing';
  }
  if (statusLower.includes('confirm') || statusLower.includes('paid') || statusLower.includes('pay')) {
    return 'confirmed';
  }
  if (statusLower.includes('pending') || statusLower.includes('unpaid')) {
    return 'pending';
  }
  
  return 'pending';
}

// Channel-specific queries
const CHANNEL_QUERIES: Record<string, { 
  dataset: string; 
  orderTable: string; 
  orderIdField: string;
  orderItemsTable?: string;
  settlementTable?: string;
  productTable?: string;
  customerTable?: string;
}> = {
  shopee: {
    dataset: 'bluecoredcp_shopee',
    orderTable: 'shopee_Orders',
    orderIdField: 'order_sn',
    orderItemsTable: 'shopee_OrderItems',
    settlementTable: 'shopee_Payments',
    productTable: 'shopee_Products',
  },
  lazada: {
    dataset: 'bluecoredcp_lazada',
    orderTable: 'lazada_Orders',
    orderIdField: 'orderNumber',
    orderItemsTable: 'lazada_OrderItems',
    settlementTable: 'lazada_FinanceTransactionDetails',
    productTable: 'lazada_Products',
  },
  tiktok: {
    dataset: 'bluecoredcp_tiktokshop',
    orderTable: 'tiktok_Orders',
    orderIdField: 'order_id',
    settlementTable: 'tiktok_Settlements',
    productTable: 'tiktok_Products',
  },
  tiki: {
    dataset: 'bluecoredcp_tiki',
    orderTable: 'tiki_Orders',
    orderIdField: 'code',
    orderItemsTable: 'tiki_OrderItems',
    productTable: 'tiki_Products',
  },
  sapo: {
    dataset: 'bluecoredcp_sapo',
    orderTable: 'sapo_Orders',
    orderIdField: 'id',
    orderItemsTable: 'sapo_OrdersLineItems',
    productTable: 'sapo_Products',
    customerTable: 'sapo_Customers',
  },
  sapogo: {
    dataset: 'bluecoredcp_sapogo',
    orderTable: 'sapogo_Orders',
    orderIdField: 'Id',
    productTable: 'sapogo_Products',
  },
  shopify: {
    dataset: 'bluecoredcp_shopify',
    orderTable: 'shopify_Order',
    orderIdField: 'id',
    orderItemsTable: 'shopify_OrderLineItem',
    productTable: 'shopify_Product',
    customerTable: 'shopify_Customer',
  },
};

// Handle sync from DataModelManager (model-based sync)
async function handleModelSync(params: {
  tenant_id: string;
  model_name: string;
  dataset: string;
  table: string;
  target_table?: string;
  primary_key_field: string;
  timestamp_field?: string;
  accessToken: string;
  projectId: string;
  batch_size: number;
}): Promise<Response> {
  const { tenant_id, model_name, dataset, table, target_table, primary_key_field, timestamp_field, accessToken, projectId, batch_size } = params;
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Model sync: ${model_name} from ${dataset}.${table}`);

  try {
    // Update watermark to syncing
    await supabase.from('bigquery_sync_watermarks').upsert({
      tenant_id,
      data_model: model_name,
      dataset_id: dataset,
      table_id: table,
      sync_status: 'syncing',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,data_model' });

    // Build query
    let query = `SELECT * FROM \`${projectId}.${dataset}.${table}\``;
    if (timestamp_field) {
      query += ` ORDER BY ${timestamp_field} DESC`;
    }
    query += ` LIMIT ${batch_size}`;

    console.log('Query:', query);
    const rows = await queryBigQuery(accessToken, projectId, query);
    console.log(`Fetched ${rows.length} rows`);

    // Update watermark with success
    await supabase.from('bigquery_sync_watermarks').upsert({
      tenant_id,
      data_model: model_name,
      dataset_id: dataset,
      table_id: table,
      sync_status: 'completed',
      last_sync_at: new Date().toISOString(),
      total_records_synced: rows.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,data_model' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        records_synced: rows.length,
        model_name,
        dataset,
        table,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Model sync error:', error);
    
    // Update watermark with error
    await supabase.from('bigquery_sync_watermarks').upsert({
      tenant_id,
      data_model: model_name,
      dataset_id: dataset,
      table_id: table,
      sync_status: 'failed',
      error_message: error.message,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,data_model' });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncLogId: string | null = null;
  let supabase: any = null;

  try {
    const body = await req.json();
    const { 
      integration_id, 
      tenant_id, 
      channels = ['shopee', 'lazada', 'tiktok', 'tiki', 'sapo', 'sapogo', 'shopify'],
      days_back = 30,
      action = 'sync', // 'sync', 'count', 'sync_all'
      batch_size = 2000,
      offset = 0,
      single_channel,
      sync_items = true, // Also sync order items
      sync_settlements = false, // Sync settlement data
      sync_products = false, // Sync product catalog
      sync_customers = false, // Sync customers
      // New params from DataModelManager
      model_name,
      dataset,
      table,
      target_table,
      primary_key_field,
      timestamp_field,
    } = body;

    // Get service account from environment or request body
    let serviceAccountJson = body.service_account_key;
    let projectId = body.project_id;
    
    // If not provided in body, try to get from environment
    if (!serviceAccountJson) {
      serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    }
    
    if (!serviceAccountJson) {
      throw new Error('Missing service_account_key - please configure GOOGLE_SERVICE_ACCOUNT_JSON secret');
    }
    
    const serviceAccount = typeof serviceAccountJson === 'string' 
      ? JSON.parse(serviceAccountJson) 
      : serviceAccountJson;
    
    // Get project_id from service account if not provided
    if (!projectId) {
      projectId = serviceAccount.project_id || 'bluecore-dcp';
    }

    console.log('Sync BigQuery started:', { 
      integration_id, 
      tenant_id, 
      channels: single_channel ? [single_channel] : channels, 
      days_back, 
      action,
      batch_size,
      offset,
      sync_items,
      sync_settlements,
      sync_products,
      model_name,
      dataset,
      table,
    });

    if (!tenant_id) {
      throw new Error('Missing tenant_id');
    }

    // Create alias for backward compatibility
    const project_id = projectId;

    const accessToken = await getAccessToken(serviceAccount);
    console.log('Got BigQuery access token');

    // Handle model-based sync (from DataModelManager)
    if (model_name && dataset && table) {
      return await handleModelSync({
        tenant_id,
        model_name,
        dataset,
        table,
        target_table,
        primary_key_field,
        timestamp_field,
        accessToken,
        projectId,
        batch_size,
      });
    }

    // If action is 'count', just count records without syncing
    if (action === 'count') {
      const countResults: Record<string, { orders: number; settlements?: number; products?: number; error?: string }> = {};
      let totalCount = 0;

      for (const channel of channels) {
        const channelConfig = CHANNEL_QUERIES[channel.toLowerCase()];
        if (!channelConfig) {
          countResults[channel] = { orders: 0, error: 'Unknown channel' };
          continue;
        }

        try {
          // Count orders
          const orderCountQuery = `
            SELECT COUNT(*) as total_count
            FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.orderTable}\`
          `;
          const orderRows = await queryBigQuery(accessToken, project_id, orderCountQuery);
          const orderCount = parseInt(orderRows[0]?.total_count || 0);
          
          countResults[channel] = { orders: orderCount };
          totalCount += orderCount;

          // Count settlements if table exists
          if (channelConfig.settlementTable) {
            try {
              const settlementQuery = `
                SELECT COUNT(*) as total_count
                FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.settlementTable}\`
              `;
              const settRows = await queryBigQuery(accessToken, project_id, settlementQuery);
              countResults[channel].settlements = parseInt(settRows[0]?.total_count || 0);
            } catch (e) {
              // Settlement table might not exist
            }
          }

          // Count products if table exists
          if (channelConfig.productTable) {
            try {
              const productQuery = `
                SELECT COUNT(*) as total_count
                FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.productTable}\`
              `;
              const prodRows = await queryBigQuery(accessToken, project_id, productQuery);
              countResults[channel].products = parseInt(prodRows[0]?.total_count || 0);
            } catch (e) {
              // Product table might not exist
            }
          }

          console.log(`${channel}: orders=${orderCount}, settlements=${countResults[channel].settlements || 0}, products=${countResults[channel].products || 0}`);
        } catch (e: any) {
          console.error(`Error counting ${channel}:`, e.message);
          countResults[channel] = { orders: 0, error: e.message };
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            total_orders: totalCount,
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

    const channelsToSync = single_channel ? [single_channel] : channels;

    // Get or create integration_id if not provided
    let effectiveIntegrationId = integration_id;
    if (!effectiveIntegrationId) {
      // Try to find existing BigQuery integration
      const { data: existing } = await supabase
        .from('connector_integrations')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('connector_type', 'bigquery')
        .single();
      
      if (existing) {
        effectiveIntegrationId = existing.id;
      } else {
        // Create new integration with service role (bypasses RLS)
        const { data: newIntegration, error: createError } = await supabase
          .from('connector_integrations')
          .insert({
            tenant_id,
            connector_type: 'bigquery',
            connector_name: 'Google BigQuery',
            status: 'active',
            settings: { project_id },
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating integration:', createError);
        } else {
          effectiveIntegrationId = newIntegration.id;
          console.log('Created BigQuery integration:', effectiveIntegrationId);
        }
      }
    }

    // Create sync log for first batch
    if (offset === 0 && effectiveIntegrationId) {
      const { data: syncLog, error: logError } = await supabase
        .from('sync_logs')
        .insert({
          tenant_id,
          integration_id: effectiveIntegrationId,
          connector_type: 'bigquery',
          connector_name: 'BigQuery',
          sync_type: 'manual',
          status: 'running',
          started_at: new Date().toISOString(),
          sync_metadata: { 
            channels: channelsToSync, 
            days_back, 
            project_id, 
            batch_size,
            sync_items,
            sync_settlements,
            sync_products
          }
        })
        .select()
        .single();

      if (!logError && syncLog) {
        syncLogId = syncLog.id;
        console.log('Created sync log:', syncLogId);
      }
    }

    const results: Record<string, { 
      orders_synced: number; 
      items_synced: number;
      settlements_synced: number;
      products_synced: number;
      errors: number; 
      fetched: number; 
      has_more: boolean 
    }> = {};
    
    let totalFetched = 0;
    let totalOrdersSynced = 0;
    let totalItemsSynced = 0;
    let totalSettlementsSynced = 0;
    let totalProductsSynced = 0;
    let totalErrors = 0;
    let hasMoreData = false;

    // Sync each channel
    for (const channel of channelsToSync) {
      const channelConfig = CHANNEL_QUERIES[channel.toLowerCase()];
      if (!channelConfig) {
        console.log(`Unknown channel: ${channel}, skipping`);
        continue;
      }

      let channelOrdersSynced = 0;
      let channelItemsSynced = 0;
      let channelSettlementsSynced = 0;
      let channelProductsSynced = 0;
      let channelErrors = 0;
      let channelFetched = 0;
      let channelHasMore = false;

      try {
        console.log(`Syncing ${channel} orders (offset: ${offset}, limit: ${batch_size})...`);
        
        // Query orders with pagination
        const orderQuery = `
          SELECT * 
          FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.orderTable}\`
          ORDER BY ${channelConfig.orderIdField}
          LIMIT ${batch_size}
          OFFSET ${offset}
        `;

        const rows = await queryBigQuery(accessToken, project_id, orderQuery);
        console.log(`${channel}: Found ${rows.length} orders (offset: ${offset})`);
        channelFetched = rows.length;
        totalFetched += rows.length;

        channelHasMore = rows.length === batch_size;
        if (channelHasMore) hasMoreData = true;

        if (rows.length > 0) {
          // Map orders
          const mappedOrders = rows.map(row => mapOrderData(row, channel, effectiveIntegrationId || 'default', tenant_id));
          
          // Prepare order items if sync_items is enabled
          const allOrderItems: any[] = [];
          if (sync_items) {
            rows.forEach(row => {
              const orderId = row.order_id || row.orderId || row.order_sn || row.order_code;
              let items: any[] = [];
              try {
                items = row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [];
              } catch (e) {
                items = [];
              }
              if (items.length > 0) {
                const mappedItems = mapOrderItems(orderId, items, tenant_id, effectiveIntegrationId || 'default', channel);
                allOrderItems.push(...mappedItems);
              }
            });
          }

          // Batch upsert orders
          const UPSERT_BATCH_SIZE = 100;
          
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
                    console.error(`Error upserting orders batch ${i}-${i + batch.length}:`, error.message);
                    channelErrors += batch.length;
                  } else {
                    await new Promise(r => setTimeout(r, 500));
                  }
                } else {
                  channelOrdersSynced += batch.length;
                  success = true;
                }
              } catch (e: any) {
                retries--;
                if (retries === 0) {
                  console.error(`Exception orders batch ${i}-${i + batch.length}:`, e?.message || e);
                  channelErrors += batch.length;
                } else {
                  await new Promise(r => setTimeout(r, 500));
                }
              }
            }
          }

          // Batch upsert order items
          if (sync_items && allOrderItems.length > 0) {
            for (let i = 0; i < allOrderItems.length; i += UPSERT_BATCH_SIZE) {
              const batch = allOrderItems.slice(i, i + UPSERT_BATCH_SIZE);
              try {
                const { error } = await supabase
                  .from('external_order_items')
                  .upsert(batch, { 
                    onConflict: 'tenant_id,external_order_id,item_id',
                    ignoreDuplicates: false 
                  });

                if (!error) {
                  channelItemsSynced += batch.length;
                } else {
                  console.error(`Error upserting items:`, error.message);
                }
              } catch (e: any) {
                console.error(`Exception items batch:`, e?.message || e);
              }
            }
          }
        }

        // Sync settlements if enabled
        if (sync_settlements && channelConfig.settlementTable && offset === 0) {
          try {
            console.log(`Syncing ${channel} settlements...`);
            const settlementQuery = `
              SELECT * 
              FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.settlementTable}\`
              LIMIT 1000
            `;
            const settlementRows = await queryBigQuery(accessToken, project_id, settlementQuery);
            
            if (settlementRows.length > 0) {
              const mappedSettlements = settlementRows.map(row => 
                mapSettlementData(row, channel, effectiveIntegrationId || 'default', tenant_id)
              );
              
              const { error } = await supabase
                .from('channel_settlements')
                .upsert(mappedSettlements, { 
                  onConflict: 'tenant_id,integration_id,settlement_id',
                  ignoreDuplicates: false 
                });

              if (!error) {
                channelSettlementsSynced = mappedSettlements.length;
                console.log(`${channel}: Synced ${channelSettlementsSynced} settlements`);
              } else {
                console.error(`Error syncing ${channel} settlements:`, error.message);
              }
            }
          } catch (e: any) {
            console.error(`Error syncing ${channel} settlements:`, e.message);
          }
        }

        // Sync products if enabled - to external_products table
        if (sync_products && channelConfig.productTable && offset === 0) {
          try {
            console.log(`Syncing ${channel} products to external_products...`);
            const productQuery = `
              SELECT * 
              FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.productTable}\`
              LIMIT 5000
            `;
            const productRows = await queryBigQuery(accessToken, project_id, productQuery);
            
            if (productRows.length > 0) {
              const mappedProducts = productRows.map(row => 
                mapExternalProduct(row, tenant_id, effectiveIntegrationId || 'default', channel)
              );
              
              // Upsert to external_products
              for (let i = 0; i < mappedProducts.length; i += 100) {
                const batch = mappedProducts.slice(i, i + 100);
                const { error } = await supabase
                  .from('external_products')
                  .upsert(batch, { 
                    onConflict: 'tenant_id,integration_id,external_product_id',
                    ignoreDuplicates: false 
                  });

                if (!error) {
                  channelProductsSynced += batch.length;
                } else {
                  console.error(`Error upserting products:`, error.message);
                }
              }
              console.log(`${channel}: Synced ${channelProductsSynced} products`);
            }
          } catch (e: any) {
            console.error(`Error syncing ${channel} products:`, e.message);
          }
        }

        // Sync customers if enabled
        if (sync_customers && channelConfig.customerTable && offset === 0) {
          try {
            console.log(`Syncing ${channel} customers...`);
            const customerQuery = `
              SELECT * 
              FROM \`${project_id}.${channelConfig.dataset}.${channelConfig.customerTable}\`
              LIMIT 10000
            `;
            const customerRows = await queryBigQuery(accessToken, project_id, customerQuery);
            
            if (customerRows.length > 0) {
              const mappedCustomers = customerRows.map(row => 
                mapCustomerData(row, tenant_id)
              );
              
              // Upsert customers - use phone or email as conflict key
              for (let i = 0; i < mappedCustomers.length; i += 100) {
                const batch = mappedCustomers.slice(i, i + 100);
                const { error } = await supabase
                  .from('customers')
                  .upsert(batch, { 
                    onConflict: 'tenant_id,phone',
                    ignoreDuplicates: true 
                  });

                if (error) {
                  console.error(`Error upserting customers:`, error.message);
                }
              }
              console.log(`${channel}: Synced ${customerRows.length} customers`);
            }
          } catch (e: any) {
            console.error(`Error syncing ${channel} customers:`, e.message);
          }
        }

        results[channel] = { 
          orders_synced: channelOrdersSynced, 
          items_synced: channelItemsSynced,
          settlements_synced: channelSettlementsSynced,
          products_synced: channelProductsSynced,
          errors: channelErrors, 
          fetched: channelFetched, 
          has_more: channelHasMore 
        };
        
        totalOrdersSynced += channelOrdersSynced;
        totalItemsSynced += channelItemsSynced;
        totalSettlementsSynced += channelSettlementsSynced;
        totalProductsSynced += channelProductsSynced;
        totalErrors += channelErrors;
        
        console.log(`${channel}: Orders=${channelOrdersSynced}, Items=${channelItemsSynced}, Settlements=${channelSettlementsSynced}, Products=${channelProductsSynced}, Errors=${channelErrors}`);

      } catch (e) {
        console.error(`Error syncing ${channel}:`, e);
        results[channel] = { 
          orders_synced: 0, 
          items_synced: 0,
          settlements_synced: 0,
          products_synced: 0,
          errors: 1, 
          fetched: 0, 
          has_more: false 
        };
        totalErrors++;
      }
    }

    const endTime = new Date();

    // Update sync log
    if (syncLogId) {
      await supabase
        .from('sync_logs')
        .update({
          status: hasMoreData ? 'partial' : 'completed',
          completed_at: endTime.toISOString(),
          records_fetched: totalFetched,
          records_created: totalOrdersSynced + totalItemsSynced + totalSettlementsSynced + totalProductsSynced,
          records_failed: totalErrors,
          sync_metadata: { 
            channels: channelsToSync, 
            offset, 
            batch_size, 
            has_more: hasMoreData,
            next_offset: hasMoreData ? offset + batch_size : null,
            orders_synced: totalOrdersSynced,
            items_synced: totalItemsSynced,
            settlements_synced: totalSettlementsSynced,
            products_synced: totalProductsSynced,
          }
        })
        .eq('id', syncLogId);
    }

    // Update integration last_sync_at
    if (effectiveIntegrationId) {
      await supabase
        .from('connector_integrations')
        .update({ 
          last_sync_at: endTime.toISOString(),
          status: 'active',
          error_message: null
        })
        .eq('id', effectiveIntegrationId);
    }

    console.log('Sync batch completed:', { 
      totalFetched, 
      totalOrdersSynced, 
      totalItemsSynced,
      totalSettlementsSynced,
      totalProductsSynced,
      totalErrors, 
      hasMoreData 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          total_orders_synced: totalOrdersSynced,
          total_items_synced: totalItemsSynced,
          total_settlements_synced: totalSettlementsSynced,
          total_products_synced: totalProductsSynced,
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
