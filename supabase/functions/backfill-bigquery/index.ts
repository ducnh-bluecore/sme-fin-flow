/**
 * backfill-bigquery - Backfill data from BigQuery to L2 Master Model
 * 
 * @architecture Layer 10 → L2 Integration
 * Supports batch backfill with resume capability, customer deduplication,
 * source progress tracking, and pagination for all model types.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Types =============

type ModelType = 
  | 'customers' 
  | 'products' 
  | 'orders' 
  | 'order_items'
  | 'refunds'
  | 'payments'
  | 'fulfillments'
  | 'inventory'
  | 'campaigns'
  | 'ad_spend';

// Legacy alias: UI may still send 'inventory_snapshots' but we handle it as 'inventory'
type ModelTypeWithLegacy = ModelType | 'inventory_snapshots';

type ActionType = 'start' | 'continue' | 'status' | 'cancel' | 'update_discounts' | 'schema_check';

interface BackfillRequest {
  action: ActionType;
  tenant_id: string;
  model_type: ModelType;
  options?: {
    source_table?: string;
    batch_size?: number;
    date_from?: string;
    date_to?: string;
  };
}

interface CustomerSource {
  name: string;
  dataset: string;
  table: string;
  mapping: Record<string, string>;
}

interface SourceProgress {
  source_name: string;
  dataset: string;
  table_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  total_records: number;
  processed_records: number;
  last_offset: number;
  error_message?: string;
}

// ============= Constants =============

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;

// Edge Functions thường bị giới hạn runtime ~60s. Ta chủ động dừng sớm để kịp cập nhật progress.
const MAX_EXECUTION_TIME_MS = 50_000;

function shouldPause(startTimeMs: number) {
  return Date.now() - startTimeMs >= MAX_EXECUTION_TIME_MS;
}

// ============= KiotViet Marketplace Dedup =============
// SaleChannelId values that represent marketplace orders flowing through KiotViet POS.
// These orders are already synced from their native marketplace datasets,
// so they must be filtered OUT to prevent double-counting.
const KIOTVIET_MARKETPLACE_CHANNEL_IDS = new Set([
  '38487',       // Shopee (104.5k orders, prefix DELETEDHSPE_)
  '5389',        // Haravan channel 1 (68.7k orders)
  '5872',        // Haravan channel 2 (43.8k orders, prefix DHHRV-)
  '277489',      // Haravan channel 3 (31.6k orders, prefix DHHRV-)
  '38485',       // Lazada (39.5k orders, prefix DELETEDDHLZD_)
  '1000000082',  // Lazada channel 2 (6.7k orders)
  '238790',      // TikTok Shop
]);

function isKiotVietNativeOrder(saleChannelId: string | null | undefined): boolean {
  if (!saleChannelId || saleChannelId === '0') return true; // NULL or 0 = native KiotViet
  return !KIOTVIET_MARKETPLACE_CHANNEL_IDS.has(saleChannelId);
}

const CUSTOMER_SOURCES: CustomerSource[] = [
  {
    name: 'kiotviet',
    dataset: 'olvboutique',
    table: 'raw_kiotviet_Customers',
    mapping: {
      id: 'CusId',
      code: 'Code',
      name: 'Name',
      phone: 'ContactNumber',
      email: 'Email',
      address: 'Address',
      province: 'Province', 
      district: 'District',
      lifetime_value: 'TotalRevenue',
      loyalty_points: 'TotalPoint',
      created_at: 'CreatedDate',
      tags: 'Groups',
    }
  },
  {
    name: 'haravan',
    dataset: 'olvboutique',
    table: 'raw_hrv_Customers',
    mapping: {
      id: 'CusId',
      first_name: 'First_name',
      last_name: 'Last_name',
      phone: 'PhoneFormat',
      email: 'Email',
      address: 'Address1',
      province: 'Province',
      district: 'District',
      lifetime_value: 'Total_spent',
      order_count: 'Orders_count',
      created_at: 'Created_at',
      tags: 'Tags',
      source: 'Source',
    }
  },
  {
    name: 'bluecore',
    dataset: 'olvboutique',
    table: 'BCApp_MemberInfo',
    mapping: {
      id: 'id',
      name: 'Name',
      phone: 'Phone',
      source: 'Source',
      tags: 'Tag',
      created_at: 'CreatedAt',
    }
  }
];

const ORDER_SOURCES = [
  { 
    channel: 'shopee', 
    dataset: 'olvboutique_shopee', 
    table: 'shopee_Orders',
    mapping: {
      order_key: 'order_sn',
      order_at: 'create_time',
      status: 'order_status',
      customer_name: 'buyer_username',
      customer_phone: 'recipient_address_phone',
      gross_revenue: 'total_amount',
      payment_method: 'payment_method',
    }
  },
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_Orders',
    mapping: {
      order_key: 'order_id',
      order_at: 'created_at',
      status: 'statuses',
      customer_name: 'customer_first_name',
      gross_revenue: 'price',
      payment_method: 'payment_method',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_Orders',
    mapping: {
      order_key: 'order_id',
      order_at: 'create_time',
      status: 'order_status',
      customer_name: 'recipient_address_name',
      customer_phone: 'recipient_address_phone',
      gross_revenue: 'payment_total_amount',
      payment_method: 'payment_method_name',
    }
  },
  {
    channel: 'tiki',
    dataset: 'olvboutique_tiki',
    table: 'tiki_Orders',
    mapping: {
      order_key: 'code',
      order_at: 'created_at',
      status: 'status',
      customer_name: 'customer_full_name',
      gross_revenue: 'invoice_grand_total',
      payment_method: 'payment_method',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'raw_kiotviet_Orders',
    mapping: {
      order_key: 'OrderId',
      order_at: 'PurchaseDate',
      status: 'StatusValue',
      customer_id: 'CusId',
      customer_name: 'CustomerName',
      gross_revenue: 'Total',
      discount_amount: 'discount',          // KiotViet order-level discount (lowercase in BQ)
      net_revenue: 'TotalPayment',          // Total after discount
      sale_channel_id: 'SaleChannelId',     // For marketplace dedup filtering
      order_code: 'Code',                   // Order code for traceability
    }
  }
];

const ORDER_ITEM_SOURCES = [
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_OrderItems',
    mapping: {
      order_key: 'order_sn',
      item_id: 'item_id',
      sku: 'item_sku',
      name: 'item_name',
      quantity: 'model_quantity_purchased',
      unit_price: 'model_original_price',
      discount: 'model_discounted_price',
      total: 'model_discounted_price',
    }
  },
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_OrderItems',
    mapping: {
      order_key: 'order_id',
      item_id: 'order_item_id',
      sku: 'sku',
      name: 'name',
      // Lazada has no quantity column - each row = 1 item
      unit_price: 'item_price',
      discount: 'voucher_amount',
      total: 'paid_price',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_OrderItems',
    mapping: {
      order_key: 'order_id',
      item_id: 'sku_id',
      sku: 'seller_sku',
      name: 'product_name',
      quantity: 'quantity',
      unit_price: 'sku_original_price',
      discount: 'sku_platform_discount',
      total: 'sku_sale_price',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'bdm_kov_OrderLineItems',
    mapping: {
      order_key: 'OrderId',
      item_id: 'ProductID',
      sku: 'Productcode',
      name: 'Productname',
      quantity: 'Quantity',
      unit_price: 'SubTotal',
      discount: 'Discount',
      total: 'Total',
    }
  }
];

const REFUND_SOURCES = [
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_Returns',
    mapping: {
      refund_key: 'return_sn',
      refund_at: 'create_time',
      refund_amount: 'refund_amount',
      order_key: 'order_sn',
      reason: 'text_reason',
    }
  },
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_ReverseOrders',
    mapping: {
      refund_key: 'reverse_order_id',
      refund_at: 'return_order_line_gmt_create',
      refund_amount: 'refund_amount',
      order_key: 'trade_order_id',
      reason: 'reason_text',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_Returns',
    mapping: {
      refund_key: 'reverse_order_id',
      refund_at: 'reverse_request_time',
      refund_amount: 'refund_total',
      order_key: 'order_id',
      reason: 'return_reason',
    }
  }
];

const PAYMENT_SOURCES = [
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_Orders',
    mapping: {
      payment_key: 'order_sn',
      order_key: 'order_sn',
      payment_method: 'payment_method',
      payment_status: 'order_status',
      amount: 'total_amount',
      paid_at: 'pay_time',
    }
  },
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_Orders',
    mapping: {
      payment_key: 'order_id',
      order_key: 'order_id',
      payment_method: 'payment_method',
      payment_status: 'statuses',
      amount: 'price',
      paid_at: 'updated_at',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_Orders',
    mapping: {
      payment_key: 'order_id',
      order_key: 'order_id',
      payment_method: 'payment_method_name',
      payment_status: 'order_status',
      amount: 'payment_total_amount',
      paid_at: 'update_time',
    }
  },
  {
    channel: 'tiki',
    dataset: 'olvboutique_tiki',
    table: 'tiki_Orders',
    mapping: {
      payment_key: 'code',
      order_key: 'code',
      payment_method: 'payment_method',
      payment_status: 'status',
      amount: 'invoice_grand_total',
      paid_at: 'updated_at',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'raw_kiotviet_Orders',
    mapping: {
      payment_key: 'OrderId',
      order_key: 'OrderId',
      payment_method: 'UsingCod',
      payment_status: 'Status',
      amount: 'TotalPayment',
      paid_at: 'PurchaseDate',
      sale_channel_id: 'SaleChannelId',  // For marketplace dedup
    }
  }
];

const FULFILLMENT_SOURCES = [
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_Orders',
    mapping: {
      fulfillment_key: 'order_sn',
      order_key: 'order_sn',
      tracking_number: null,
      shipping_carrier: 'shipping_carrier',
      fulfillment_status: 'order_status',
      shipped_at: 'ship_by_date',
    }
  },
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_Orders',
    mapping: {
      fulfillment_key: 'order_id',
      order_key: 'order_id',
      tracking_number: null,
      shipping_carrier: 'delivery_info',
      fulfillment_status: 'statuses',
      shipped_at: 'updated_at',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_Orders',
    mapping: {
      fulfillment_key: 'order_id',
      order_key: 'order_id',
      tracking_number: 'tracking_number',
      shipping_carrier: 'shipping_provider',
      fulfillment_status: 'order_status',
      shipped_at: 'update_time',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'raw_kiotviet_Orders',
    mapping: {
      fulfillment_key: 'OrderId',
      order_key: 'OrderId',
      tracking_number: 'DeliveryCode',
      shipping_carrier: null,
      fulfillment_status: 'Status',
      shipped_at: 'PurchaseDate',
      sale_channel_id: 'SaleChannelId',  // For marketplace dedup
    }
  },
  {
    channel: 'haravan',
    dataset: 'olvboutique',
    table: 'raw_hrv_Orders',
    mapping: {
      fulfillment_key: 'OrderId',
      order_key: 'OrderId',
      tracking_number: 'TrackingNumber',
      shipping_carrier: 'ShippingCarrier',
      fulfillment_status: 'FulfillmentStatus',
      shipped_at: 'UpdatedAt',
    }
  },
];

const PRODUCT_SOURCES = [
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'raw_kiotviet_Product',
    mapping: {
      product_id: 'id',
      sku: 'code',
      name: 'name',
      category: 'categoryName',
      brand: 'tradeMarkName',
      cost_price: 'basePrice',
      selling_price: 'basePrice',
      current_stock: null,
      date_col: 'modifiedDate',
      created_col: 'createdDate',
    }
  },
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_Products',
    mapping: {
      product_id: 'item_id',
      sku: 'item_sku',
      name: 'item_name',
      category: 'category_id',
      brand: 'original_brand_name',
      cost_price: null,
      selling_price: 'price_info_original_price',
      current_stock: 'total_available_stock',
      date_col: 'dw_timestamp',
      created_col: 'create_time',
    }
  },
  {
    // Lazada: main product table has no SKU/price - use lazada_ProductSKU instead
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_ProductSKU',
    useCustomQuery: true,
    mapping: {
      product_id: 'item_id',
      sku: 'SellerSku',
      name: null, // Will JOIN with lazada_Products for name
      category: 'primary_category',
      brand: null,
      cost_price: null,
      selling_price: 'price',
      current_stock: 'quantity',
      date_col: 'dw_timestamp',
      created_col: null,
    }
  },
  {
    // TikTok: SKU/price in tiktok_ProductSkus, name in tiktok_Products
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_ProductSkus',
    useCustomQuery: true,
    mapping: {
      product_id: 'product_id',
      sku: 'seller_sku',
      name: null, // Will JOIN with tiktok_Products for name
      category: null,
      brand: null,
      cost_price: null,
      selling_price: 'original_price',
      current_stock: null,
      date_col: 'dw_timestamp',
      created_col: null,
    }
  },
  {
    channel: 'tiki',
    dataset: 'olvboutique_tiki',
    table: 'tiki_Products',
    mapping: {
      product_id: 'product_id',
      sku: 'sku',
      name: 'name',
      category: null,
      brand: 'brand_value',
      cost_price: null,
      selling_price: 'price',
      current_stock: null,
      date_col: 'dw_timestamp',
      created_col: null,
    }
  },
] as const;

// Ad Insights: daily aggregated ad spend (no campaign_id, no ad_id - shop-level daily)
const AD_SPEND_SOURCES = [
  {
    channel: 'shopee_ads',
    dataset: 'olvboutique_shopeeads',
    table: 'shopeeads_ad_insights',
    mapping: {
      spend_date: 'date',
      // No campaign_id or ad_id in this table - shop-level daily aggregation
      impressions: 'impression',
      clicks: 'clicks',
      expense: 'expense',
      ctr: 'ctr',
      direct_conversions: 'direct_conversions',
      broad_conversions: 'broad_conversions',
      direct_order: 'direct_order',
      broad_order: 'broad_order',
      direct_gmv: 'direct_gmv',
      broad_gmv: 'broad_gmv',
    }
  },
];

// Inventory: daily stock movements from KiotViet
// Actual BigQuery columns: createdDate, branchId, branchName, productCode, productName,
// nhap_ncc, nhap_tra, nhap_chuyen, xuat_ban, xuat_chuyen, doanhthuthuan, doanhthuthuan_hoantra
// Missing: begin_stock, end_stock, cost_amount (not in this table)
const INVENTORY_SOURCES = [
  {
    channel: 'kiotviet',
    dataset: 'olvboutique',
    table: 'bdm_kov_xuat_nhap_ton',
    mapping: {
      movement_date: 'createdDate',
      branch_id: 'branchId',
      branch_name: 'branchName',
      product_code: 'productCode',
      product_name: 'productName',
      begin_stock: null,
      purchase_qty: 'nhap_ncc',
      sold_qty: 'xuat_ban',
      return_qty: 'nhap_tra',
      transfer_in_qty: 'nhap_chuyen',
      transfer_out_qty: 'xuat_chuyen',
      end_stock: null,
      net_revenue: 'doanhthuthuan',
      cost_amount: null,
    }
  },
];

// Marketplace inventory snapshot sources (current stock levels, not daily movements)
const INVENTORY_SNAPSHOT_SOURCES = [
  {
    channel: 'lazada',
    dataset: 'olvboutique_lazada',
    table: 'lazada_ProductMultiWarehouseInventories',
    mapping: {
      product_id: 'item_id',
      sku: null,
      warehouse_id: 'warehouseCode',
      warehouse_name: null,
      quantity: 'totalQuantity',
      available_quantity: 'sellableQuantity',
      reserved_quantity: 'occupyQuantity',
      sellable_quantity: 'sellableQuantity',
      snapshot_date: 'dw_timestamp',
    }
  },
  {
    channel: 'shopee',
    dataset: 'olvboutique_shopee',
    table: 'shopee_ProductStocks',
    mapping: {
      product_id: 'item_id',
      sku: 'model_sku',
      warehouse_id: 'location_id',
      warehouse_name: null,
      quantity: 'stock',
      available_quantity: 'stock',
      reserved_quantity: null,
      sellable_quantity: 'stock',
      snapshot_date: 'dw_timestamp',
    }
  },
  {
    channel: 'tiktok',
    dataset: 'olvboutique_tiktokshop',
    table: 'tiktok_ProductSkuStocks',
    mapping: {
      product_id: 'product_id',
      sku: 'sku_id',
      warehouse_id: 'warehouse_id',
      warehouse_name: null,
      quantity: 'available_stock',
      available_quantity: 'available_stock',
      reserved_quantity: null,
      sellable_quantity: 'available_stock',
      snapshot_date: 'dw_timestamp',
    }
  },
  {
    channel: 'tiki',
    dataset: 'olvboutique_tiki',
    table: 'tiki_ProductInventories',
    mapping: {
      product_id: 'product_id',
      sku: 'sku',
      warehouse_id: 'warehouse_id',
      warehouse_name: null,
      quantity: 'quantity',
      available_quantity: 'quantity_available',
      reserved_quantity: 'quantity_reserved',
      sellable_quantity: 'quantity_sellable',
      snapshot_date: 'dw_timestamp',
    }
  },
];

// Campaign Insights: per-campaign per-day metrics
const CAMPAIGN_SOURCES = [
  {
    channel: 'shopee_ads',
    dataset: 'olvboutique_shopeeads',
    table: 'shopeeads_campaign_insights',
    mapping: {
      campaign_id: 'campaign_id',
      campaign_name: 'ad_name',
      campaign_type: 'ad_type',
      campaign_placement: 'campaign_placement',
      spend_date: 'date',
      impressions: 'impression',
      clicks: 'clicks',
      expense: 'expense',
      ctr: 'ctr',
      cpc: 'cpc',
      direct_order: 'direct_order',
      direct_gmv: 'direct_gmv',
      direct_order_amount: 'direct_order_amount',
      broad_order: 'broad_order',
      broad_gmv: 'broad_gmv',
      broad_order_amount: 'broad_order_amount',
    }
  },
  {
    channel: 'bluecore',
    dataset: 'olvboutique',
    table: 'bc_Campaigns',
    mapping: {
      campaign_id: 'Id',
      campaign_name: 'Name',
      campaign_type: 'Provider',
      status: 'Status',
      created_at: 'CreationTime',
    }
  },
];

// ============= Auth Functions =============

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
    throw new Error('Failed to get access token');
  }
  return tokenData.access_token;
}

// ============= BigQuery Query Function =============

async function queryBigQuery(
  accessToken: string,
  projectId: string,
  query: string
): Promise<{ rows: Record<string, any>[]; totalRows: number }> {
  console.log('Executing BigQuery:', query.substring(0, 300));
  
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
      timeoutMs: 60000,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`BigQuery error: ${data.error.message}`);
  }

  const schema = data.schema?.fields || [];
  const rows = (data.rows || []).map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, index: number) => {
      obj[schema[index]?.name || `col_${index}`] = field.v;
    });
    return obj;
  });

  return { 
    rows, 
    totalRows: parseInt(data.totalRows || '0', 10) 
  };
}

// ============= Count Source Records =============

async function countSourceRecords(
  accessToken: string,
  projectId: string,
  dataset: string,
  table: string,
  dateColumn?: string,
  dateFrom?: string
): Promise<number> {
  let query = `SELECT COUNT(*) as cnt FROM \`${projectId}.${dataset}.${table}\``;
  if (dateFrom && dateColumn) {
    query += ` WHERE DATE(\`${dateColumn}\`) >= '${dateFrom}'`;
  }
  
  try {
    const { rows } = await queryBigQuery(accessToken, projectId, query);
    return parseInt(rows[0]?.cnt || '0', 10);
  } catch (error) {
    console.error(`Error counting ${table}:`, error);
    return 0;
  }
}

// ============= Source Progress Functions =============

async function initSourceProgress(
  supabase: any,
  jobId: string,
  sources: Array<{ name: string; dataset: string; table: string }>
): Promise<void> {
  const records = sources.map(s => ({
    job_id: jobId,
    source_name: s.name,
    dataset: s.dataset,
    table_name: s.table,
    status: 'pending',
    total_records: 0,
    processed_records: 0,
    last_offset: 0,
  }));
  
  // Use ignoreDuplicates to NOT reset existing progress on continue
  await supabase.from('backfill_source_progress').upsert(records, {
    onConflict: 'job_id,source_name',
    ignoreDuplicates: true,
  });
}

async function updateSourceProgress(
  supabase: any,
  jobId: string,
  sourceName: string,
  updates: Partial<SourceProgress>
): Promise<void> {
  await supabase
    .from('backfill_source_progress')
    .update(updates)
    .eq('job_id', jobId)
    .eq('source_name', sourceName);
}

async function getSourceProgress(
  supabase: any,
  jobId: string,
  sourceName: string
): Promise<SourceProgress | null> {
  const { data } = await supabase
    .from('backfill_source_progress')
    .select('*')
    .eq('job_id', jobId)
    .eq('source_name', sourceName)
    .single();
  
  return data;
}

// ============= Phone Normalization =============

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Vietnam formats
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.substring(3);
  }
  
  // Validate length (Vietnam: 10-11 digits starting with 0)
  if (cleaned.length >= 9 && cleaned.length <= 11) {
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    return cleaned;
  }
  
  return null;
}

// ============= Customer Sync with Dedup & Source Progress =============

async function syncCustomers(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string },
  startTimeMs: number,
): Promise<{ processed: number; created: number; merged: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  const customerMap = new Map<string, any>(); // phone/email -> customer data
  
  let totalProcessed = 0;
  let created = 0;
  let merged = 0;
  
  const sourceErrors: string[] = [];
  const sourceResults: SourceProgress[] = [];
  let paused = false;
  // Initialize source progress
  await initSourceProgress(supabase, jobId, CUSTOMER_SOURCES.map(s => ({
    name: s.name,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of CUSTOMER_SOURCES) {
    // Read saved progress to resume from where we left off
    const savedProgress = await getSourceProgress(supabase, jobId, source.name);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.name}`);
      continue;
    }

    console.log(`Processing customer source: ${source.name} (resuming from offset ${savedProgress?.last_offset || 0})`);
    
    // Count total records first
    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.created_at, options.date_from
    );
    
    await updateSourceProgress(supabase, jobId, source.name, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      // Build a safe SELECT list. Some column names (e.g. "Groups") collide with keywords.
      // We quote both the column AND alias to handle reserved words.
      const selectList = Object.values(source.mapping)
        .filter(Boolean)
        .map((col) => `\`${col}\` AS \`${col}\``)
        .join(', ');

      let query = `SELECT ${selectList} FROM \`${projectId}.${source.dataset}.${source.table}\``;

      if (options.date_from && source.mapping.created_at) {
        query += ` WHERE DATE(\`${source.mapping.created_at}\`) >= '${options.date_from}'`;
      }

      query += ` ORDER BY \`${source.mapping.id}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          const phone = normalizePhone(row[source.mapping.phone]);
          const email = row[source.mapping.email]?.toLowerCase()?.trim();

          // Create dedup key: prefer phone, fallback to email
          const dedupKey = phone || email;
          if (!dedupKey) continue;

          // Build customer data
          const name = source.mapping.first_name && source.mapping.last_name
            ? `${row[source.mapping.first_name] || ''} ${row[source.mapping.last_name] || ''}`.trim()
            : row[source.mapping.name];

          const externalId = {
            source: source.name,
            id: String(row[source.mapping.id]),
            code: row[source.mapping.code],
          };

          if (customerMap.has(dedupKey)) {
            // Merge with existing
            const existing = customerMap.get(dedupKey);
            existing.external_ids.push(externalId);
            existing.lifetime_value += parseFloat(row[source.mapping.lifetime_value] || '0');
            existing.loyalty_points += parseInt(row[source.mapping.loyalty_points] || '0', 10);

            // Keep earliest created_at
            const newCreatedAt = row[source.mapping.created_at];
            if (newCreatedAt && (!existing.created_at || newCreatedAt < existing.created_at)) {
              existing.created_at = newCreatedAt;
            }

            merged++;
          } else {
            // New customer
            customerMap.set(dedupKey, {
              phone,
              email,
              name,
              address: row[source.mapping.address],
              province: row[source.mapping.province],
              district: row[source.mapping.district],
              acquisition_source: source.name,
              external_ids: [externalId],
              tags: row[source.mapping.tags] ? [row[source.mapping.tags]] : [],
              lifetime_value: parseFloat(row[source.mapping.lifetime_value] || '0'),
              loyalty_points: parseInt(row[source.mapping.loyalty_points] || '0', 10),
              created_at: row[source.mapping.created_at],
            });
            created++;
          }

          totalProcessed++;
          sourceProcessed++;
        }

        offset += rows.length;
        
        // Update source progress
        await updateSourceProgress(supabase, jobId, source.name, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });
        
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        const msg = error?.message ? String(error.message) : String(error);
        console.error(`Error processing ${source.name} at offset ${offset}:`, error);
        sourceErrors.push(`${source.name}: ${msg}`);
        sourceFailed = true;
        hasMore = false;
        
        await updateSourceProgress(supabase, jobId, source.name, {
          status: 'failed',
          error_message: msg,
        });
      }
    }

    // Mark source as completed only if finished and not paused
    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.name, {
        status: 'completed',
        processed_records: sourceProcessed,
        completed_at: new Date().toISOString(),
      });
    }
    
    sourceResults.push({
      source_name: source.name,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
    });
    if (paused) break;
  }

  if (totalProcessed === 0 && sourceErrors.length > 0) {
    throw new Error(`All customer sources failed. ${sourceErrors.join(' | ')}`);
  }

  // Upsert customers to database in batches
  const customers = Array.from(customerMap.values());
  const upsertBatchSize = 100;
  
  for (let i = 0; i < customers.length; i += upsertBatchSize) {
    const batch = customers.slice(i, i + upsertBatchSize).map(c => ({
      tenant_id: tenantId,
      canonical_key: c.phone || c.email,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      province: c.province,
      district: c.district,
      acquisition_source: c.acquisition_source,
      external_ids: c.external_ids,
      tags: c.tags,
      lifetime_value: c.lifetime_value,
      loyalty_points: c.loyalty_points,
      source_created_at: c.created_at || null,
    }));
    
    const { error } = await supabase
      .from('cdp_customers')
      .upsert(batch, { onConflict: 'tenant_id,canonical_key' });
    
    if (error) {
      console.error('Upsert error:', error);
    }
  }

  // Phase 2: Cross-source dedup by email (merge KiotViet phone-keyed + Haravan email-keyed)
  if (!paused) {
    try {
      console.log(`[Phase 2] Running cross-source customer merge for tenant ${tenantId}...`);
      const { data: mergeResult, error: mergeError } = await supabase
        .rpc('merge_duplicate_customers', { p_tenant_id: tenantId });
      
      if (mergeError) {
        console.error('Customer merge error:', mergeError);
      } else {
        const mergedCount = mergeResult || 0;
        merged += mergedCount;
        console.log(`[Phase 2] Merged ${mergedCount} duplicate customers across sources`);
      }
    } catch (err) {
      console.error('Customer merge exception:', err);
    }
  }
  
  return { processed: totalProcessed, created, merged, sources: sourceResults, paused: paused || undefined };
}

// ============= Orders Sync with Source Progress =============

async function syncOrders(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; date_to?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;
  // Filter to specific source if provided, otherwise all
  const sources = options.source_table
    ? ORDER_SOURCES.filter(s => s.table === options.source_table)
    : ORDER_SOURCES;
  
  // Initialize source progress
  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));
  
  for (const source of sources) {
    // Read saved progress to resume
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing orders from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);
    
    // Count total records
    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.order_at, options.date_from
    );
    
    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });
    
    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';
    
    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      
      const conditions: string[] = [];
      if (options.date_from) {
        conditions.push(`DATE(\`${source.mapping.order_at}\`) >= '${options.date_from}'`);
      }
      if (options.date_to) {
        conditions.push(`DATE(\`${source.mapping.order_at}\`) <= '${options.date_to}'`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY \`${source.mapping.order_at}\` LIMIT ${batchSize} OFFSET ${offset}`;
      
      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);
        
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        
        // Transform and upsert
        // For KiotViet: filter out marketplace orders (already synced from native datasets)
        const filteredRows = source.channel === 'kiotviet'
          ? rows.filter(row => isKiotVietNativeOrder(row[source.mapping.sale_channel_id]))
          : rows;
        
        if (source.channel === 'kiotviet' && filteredRows.length < rows.length) {
          console.log(`[kiotviet dedup] Filtered ${rows.length - filteredRows.length}/${rows.length} marketplace orders in batch at offset ${offset}`);
        }
        
        const orders = filteredRows.map(row => {
          const grossRevenue = parseFloat(row[source.mapping.gross_revenue] || '0');
          // KiotViet discount from raw_kiotviet_Orders
          const discountAmount = source.channel === 'kiotviet' && source.mapping.discount_amount
            ? parseFloat(row[source.mapping.discount_amount] || '0')
            : 0;
          const netRevenue = source.channel === 'kiotviet' && source.mapping.net_revenue
            ? parseFloat(row[source.mapping.net_revenue] || '0') || (grossRevenue - discountAmount)
            : parseFloat(row[source.mapping.net_revenue] || '0') || grossRevenue;

          return {
            tenant_id: tenantId,
            integration_id: integrationId,
            order_key: String(row[source.mapping.order_key]),
            channel: source.channel,
            order_at: row[source.mapping.order_at],
            status: row[source.mapping.status],
            customer_name: row[source.mapping.customer_name],
            customer_phone: row[source.mapping.customer_phone] || null,
            buyer_id: row[source.mapping.customer_id] ? String(row[source.mapping.customer_id]) : null,
            gross_revenue: grossRevenue,
            discount_amount: discountAmount,
            net_revenue: netRevenue,
            currency: 'VND',
            payment_method: row[source.mapping.payment_method],
            // Store SaleChannelId + OrderCode in raw_data for KiotViet traceability
            ...(source.channel === 'kiotviet' ? {
              raw_data: {
                SaleChannelId: row[source.mapping.sale_channel_id],
                OrderCode: row[source.mapping.order_code],
              }
            } : {}),
          };
        });
        
        const { error, count } = await supabase
          .from('cdp_orders')
          .upsert(orders, { 
            onConflict: 'tenant_id,channel,order_key',
            count: 'exact'
          });
        
        if (error) {
          console.error('Order upsert error:', error);
        } else {
          inserted += count || orders.length;
        }
        
        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;
        
        // Update source progress
        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });
        
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} orders:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;
        
        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }
    
    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
    
    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }
  
  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Order Items Sync with Source Progress =============

async function syncOrderItems(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; date_to?: string; source_table?: string; },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  let skipped = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;
  // Filter to specific source if provided, otherwise all
  const sources = options.source_table
    ? ORDER_ITEM_SOURCES.filter(s => s.table === options.source_table)
    : ORDER_ITEM_SOURCES;
  
  // Initialize source progress
  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));
  
  for (const source of sources) {
    // Read saved progress to resume
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing order items from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);
    
    // Count total records (with date filter if available via order join)
    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table
    );

    
    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });
    
    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';
    
    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const mappingValues = Object.values(source.mapping).filter(Boolean);
      const columns = mappingValues.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      // Incremental: filter order items by joining with orders that have date >= date_from
      if (options.date_from) {
        // Use subquery to filter items belonging to recent orders only
        const orderSource = ORDER_SOURCES.find(os => os.channel === source.channel);
        if (orderSource) {
          const orderDateCol = orderSource.mapping.order_at;
          query += ` WHERE \`${source.mapping.order_key}\` IN (
            SELECT \`${orderSource.mapping.order_key}\` 
            FROM \`${projectId}.${orderSource.dataset}.${orderSource.table}\`
            WHERE \`${orderDateCol}\` >= '${options.date_from}'
          )`;
        }
      }
      query += ` ORDER BY \`${source.mapping.order_key}\` LIMIT ${batchSize} OFFSET ${offset}`;
      
      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);
        
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        
        // Step 1: Collect unique order keys from this batch
        const batchOrderKeys = [...new Set(rows.map(row => String(row[source.mapping.order_key])))];
        
        // Step 2: Lookup UUIDs from cdp_orders for these order keys
        // Query in chunks of 200 to avoid URL length limits
        const orderKeyToUuid: Record<string, string> = {};
        for (let i = 0; i < batchOrderKeys.length; i += 200) {
          const chunk = batchOrderKeys.slice(i, i + 200);
          const { data: orderRows, error: lookupError } = await supabase
            .from('cdp_orders')
            .select('id, order_key')
            .eq('tenant_id', tenantId)
            .eq('channel', source.channel)
            .in('order_key', chunk);
          
          if (lookupError) {
            console.error(`Order UUID lookup error for ${source.channel}:`, lookupError);
          } else if (orderRows) {
            for (const o of orderRows) {
              orderKeyToUuid[o.order_key] = o.id;
            }
          }
        }
        
        // Step 3: Transform rows, skip orphans (orders not yet in cdp_orders)
        let batchSkipped = 0;
        const orderItems = [];
        for (const row of rows) {
          const orderKey = String(row[source.mapping.order_key]);
          const resolvedOrderId = orderKeyToUuid[orderKey];
          
          if (!resolvedOrderId) {
            batchSkipped++;
            continue; // Skip orphan items
          }
          
          const qty = source.mapping.quantity ? parseInt(row[source.mapping.quantity] || '1', 10) : 1;
          const lineRevenue = parseFloat(row[source.mapping.total] || '0');
          
          orderItems.push({
            tenant_id: tenantId,
            integration_id: integrationId,
            order_id: resolvedOrderId, // UUID from cdp_orders
            product_id: String(row[source.mapping.item_id] || ''),
            sku: row[source.mapping.sku] || `unknown_${row[source.mapping.item_id]}`,
            product_name: row[source.mapping.name],
            qty,
            unit_price: parseFloat(row[source.mapping.unit_price] || '0'),
            original_price: parseFloat(row[source.mapping.unit_price] || '0'),
            discount_amount: parseFloat(row[source.mapping.discount] || '0'),
            line_revenue: lineRevenue,
            raw_data: {
              source_channel: source.channel,
              source_order_key: orderKey,
            },
          });
        }
        
        skipped += batchSkipped;
        if (batchSkipped > 0) {
          console.warn(`[order_items/${source.channel}] Skipped ${batchSkipped} orphan items (no matching order in cdp_orders)`);
        }
        
        // Step 4: Upsert only valid items
        if (orderItems.length > 0) {
          const { error, count } = await supabase
            .from('cdp_order_items')
            .upsert(orderItems, { onConflict: 'tenant_id,order_id,sku' })
            .select('id');
          
          if (error) {
            console.error('Order item upsert error:', error);
          } else {
            inserted += count || orderItems.length;
          }
        } else {
          console.warn(`[order_items/${source.channel}] Batch at offset ${offset}: all ${rows.length} items skipped (no matching orders)`);
        }
        
        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;
        
        // Update source progress
        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });
        
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} order items:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;
        
        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }
    
    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
    
    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }
  
  // After all sources complete (not paused), UPDATE COGS from master products table (SSOT)
  if (!paused) {
    console.log('Calculating COGS from master products table...');
    const { error: cogsError, count: cogsCount } = await supabase.rpc('update_order_items_cogs', {
      p_tenant_id: tenantId,
    });
    if (cogsError) {
      console.error('COGS UPDATE error:', cogsError);
    } else {
      console.log(`COGS updated for ${cogsCount || 'unknown'} order items from master products`);
    }
  }
  
  console.log(`[order_items] Summary: processed=${totalProcessed}, inserted=${inserted}, skipped=${skipped}`);
  return { processed: totalProcessed, inserted, skipped, sources: sourceResults, paused: paused || undefined };
}

// ============= Refunds Sync =============

async function syncRefunds(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? REFUND_SOURCES.filter(s => s.table === options.source_table)
    : REFUND_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing refunds from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.refund_at, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      if (options.date_from && source.mapping.refund_at) {
        query += ` WHERE DATE(\`${source.mapping.refund_at}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.refund_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const refunds = rows.map(row => ({
          tenant_id: tenantId,
          refund_key: `${source.channel}:${String(row[source.mapping.refund_key] || '')}`,
          refund_at: row[source.mapping.refund_at] || new Date().toISOString(),
          refund_amount: parseFloat(row[source.mapping.refund_amount] || '0'),
          reason: row[source.mapping.reason] || null,
          order_id: null, // Cannot resolve FK without lookup; store in raw_data
        }));

        // Upsert to update changed data (unique on tenant_id + refund_key)
        const { error, count } = await supabase
          .from('cdp_refunds')
          .upsert(refunds, { onConflict: 'tenant_id,refund_key' })
          .select('id');

        if (error) {
          console.error('Refund upsert error:', error);
        } else {
          inserted += count || refunds.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} refunds:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Payments Sync =============

async function syncPayments(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? PAYMENT_SOURCES.filter(s => s.table === options.source_table)
    : PAYMENT_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing payments from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.paid_at, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      // Deduplicate columns (payment_key and order_key often map to the same column)
      const uniqueColumns = [...new Set(Object.values(source.mapping))];
      const columns = uniqueColumns.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      if (options.date_from && source.mapping.paid_at) {
        query += ` WHERE DATE(\`${source.mapping.paid_at}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.payment_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        // For KiotViet: filter out marketplace orders
        const filteredRows = source.channel === 'kiotviet'
          ? rows.filter(row => isKiotVietNativeOrder(row[source.mapping.sale_channel_id]))
          : rows;

        const payments = filteredRows.map(row => ({
          tenant_id: tenantId,
          payment_key: `${source.channel}:${String(row[source.mapping.payment_key] || '')}`,
          order_key: `${source.channel}:${String(row[source.mapping.order_key] || '')}`,
          channel: source.channel,
          payment_method: source.channel === 'kiotviet' 
            ? (String(row[source.mapping.payment_method]) === 'true' ? 'COD' : 'Online')
            : (row[source.mapping.payment_method] || null),
          payment_status: row[source.mapping.payment_status] != null ? String(row[source.mapping.payment_status]) : null,
          amount: parseFloat(row[source.mapping.amount] || '0'),
          paid_at: row[source.mapping.paid_at] || null,
        }));

        const { error, count } = await supabase
          .from('cdp_payments')
          .upsert(payments, { onConflict: 'tenant_id,payment_key' })
          .select('id');

        if (error) {
          console.error('Payment upsert error:', error);
        } else {
          inserted += count || payments.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} payments:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Fulfillments Sync =============

async function syncFulfillments(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? FULFILLMENT_SOURCES.filter(s => s.table === options.source_table)
    : FULFILLMENT_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing fulfillments from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.shipped_at, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const validColumns = [...new Set(Object.values(source.mapping).filter((v): v is string => v !== null))];
      const columns = validColumns.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      if (options.date_from && source.mapping.shipped_at) {
        query += ` WHERE DATE(\`${source.mapping.shipped_at}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.fulfillment_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        // For KiotViet: filter out marketplace orders
        const filteredRows = source.channel === 'kiotviet'
          ? rows.filter(row => isKiotVietNativeOrder(row[source.mapping.sale_channel_id]))
          : rows;

        const fulfillments = filteredRows.map(row => ({
          tenant_id: tenantId,
          fulfillment_key: `${source.channel}:${String(row[source.mapping.fulfillment_key] || '')}`,
          order_key: `${source.channel}:${String(row[source.mapping.order_key] || '')}`,
          channel: source.channel,
          tracking_number: source.mapping.tracking_number ? row[source.mapping.tracking_number] || null : null,
          shipping_carrier: source.mapping.shipping_carrier ? row[source.mapping.shipping_carrier] || null : null,
          fulfillment_status: source.mapping.fulfillment_status ? row[source.mapping.fulfillment_status] || null : null,
          shipped_at: source.mapping.shipped_at ? row[source.mapping.shipped_at] || null : null,
        }));

        const { error, count } = await supabase
          .from('cdp_fulfillments')
          .upsert(fulfillments, { onConflict: 'tenant_id,fulfillment_key' })
          .select('id');

        if (error) {
          console.error('Fulfillment upsert error:', error);
        } else {
          inserted += count || fulfillments.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} fulfillments:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Products Sync with Pagination =============

async function syncProducts(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; date_to?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  // Initialize source progress for all channels
  await initSourceProgress(supabase, jobId, PRODUCT_SOURCES.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of PRODUCT_SOURCES) {
    // Read saved progress to resume
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing products from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    // Count total records
    let countQuery = `SELECT COUNT(*) as cnt FROM \`${projectId}.${source.dataset}.${source.table}\``;
    if (options.date_from && source.mapping.date_col) {
      countQuery += ` WHERE \`${source.mapping.date_col}\` >= '${options.date_from}'`;
    }
    let totalRecords = 0;
    try {
      const { rows: countRows } = await queryBigQuery(accessToken, projectId, countQuery);
      totalRecords = parseInt(countRows[0]?.cnt || '0', 10);
    } catch (e: any) {
      console.warn(`Failed to count ${source.channel} products: ${e.message}`);
      // If table doesn't exist, skip this source
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'skipped',
        error_message: `Table not found or count failed: ${e.message}`,
      });
      sourceResults.push({
        source_name: source.channel,
        dataset: source.dataset,
        table_name: source.table,
        status: 'skipped',
        total_records: 0,
        processed_records: 0,
        last_offset: 0,
        error_message: e.message,
      });
      continue;
    }

    console.log(`${source.channel} products: ${totalRecords} total records`);

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let hasMore = true;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }

      // Build query based on source type
      let query: string;
      
      if (source.channel === 'lazada') {
        // Lazada: JOIN ProductSKU with Products for name
        query = `SELECT s.\`SellerSku\`, s.\`item_id\`, s.\`price\`, s.\`quantity\`, s.\`primary_category\`, p.\`name\`
          FROM \`${projectId}.${source.dataset}.lazada_ProductSKU\` s
          LEFT JOIN \`${projectId}.${source.dataset}.lazada_Products\` p ON s.\`item_id\` = p.\`item_id\``;
        if (options.date_from) {
          query += ` WHERE s.\`dw_timestamp\` >= '${options.date_from}'`;
        }
        query += ` ORDER BY s.\`item_id\` LIMIT ${batchSize} OFFSET ${offset}`;
      } else if (source.channel === 'tiktok') {
        // TikTok: JOIN ProductSkus with Products for name
        query = `SELECT s.\`seller_sku\`, s.\`product_id\`, s.\`original_price\`, p.\`product_name\`
          FROM \`${projectId}.${source.dataset}.tiktok_ProductSkus\` s
          LEFT JOIN \`${projectId}.${source.dataset}.tiktok_Products\` p ON s.\`product_id\` = p.\`product_id\``;
        if (options.date_from) {
          query += ` WHERE s.\`dw_timestamp\` >= '${options.date_from}'`;
        }
        query += ` ORDER BY s.\`product_id\` LIMIT ${batchSize} OFFSET ${offset}`;
      } else {
        // Standard: build from mapping
        const selectCols = Object.entries(source.mapping)
          .filter(([k, v]) => v !== null && k !== 'date_col' && k !== 'created_col')
          .map(([_, v]) => `\`${v}\``)
          .join(', ');
        // Also select created_col if available
        const createdCol = source.mapping.created_col;
        const extraCols = createdCol ? `, \`${createdCol}\`` : '';
        query = `SELECT ${selectCols}${extraCols} FROM \`${projectId}.${source.dataset}.${source.table}\``;
        if (options.date_from && source.mapping.date_col) {
          query += ` WHERE \`${source.mapping.date_col}\` >= '${options.date_from}'`;
        }
        query += ` ORDER BY \`${source.mapping.product_id}\` LIMIT ${batchSize} OFFSET ${offset}`;
      }

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        let products: any[];
        if (source.channel === 'lazada') {
          products = rows.map(row => ({
            tenant_id: tenantId,
            channel: 'lazada',
            sku: String(row.SellerSku || `unknown_${row.item_id}`),
            name: row.name || null,
            category: row.primary_category || null,
            brand: null,
            unit: null,
            cost_price: 0,
            selling_price: parseFloat(row.price || '0'),
            current_stock: parseFloat(row.quantity || '0'),
            source_created_at: null,
          }));
        } else if (source.channel === 'tiktok') {
          products = rows.map(row => ({
            tenant_id: tenantId,
            channel: 'tiktok',
            sku: String(row.seller_sku || `unknown_${row.product_id}`),
            name: row.product_name || null,
            category: null,
            brand: null,
            unit: null,
            cost_price: 0,
            selling_price: parseFloat(row.original_price || '0'),
            current_stock: 0,
            source_created_at: null,
          }));
        } else {
          products = rows.map(row => ({
            tenant_id: tenantId,
            channel: source.channel,
            sku: String(row[source.mapping.sku!] || `unknown_${row[source.mapping.product_id]}`),
            name: source.mapping.name ? row[source.mapping.name] : null,
            category: source.mapping.category ? row[source.mapping.category] : null,
            brand: source.mapping.brand ? row[source.mapping.brand] : null,
            unit: null,
            cost_price: source.mapping.cost_price ? parseFloat(row[source.mapping.cost_price] || '0') : 0,
            selling_price: source.mapping.selling_price ? parseFloat(row[source.mapping.selling_price] || '0') : 0,
            current_stock: source.mapping.current_stock ? parseFloat(row[source.mapping.current_stock] || '0') : 0,
            source_created_at: source.mapping.created_col ? (row[source.mapping.created_col] || null) : null,
          }));
        }

        const { error, count } = await supabase
          .from('products')
          .upsert(products, {
            onConflict: 'tenant_id,channel,sku',
            count: 'exact'
          });

        if (error) {
          console.error(`Product upsert error (${source.channel}):`, error);
        } else {
          inserted += count || products.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        await updateJobStatus(supabase, jobId, {
          processed_records: totalProcessed,
          total_records: totalRecords,
          last_watermark: String(offset),
        });

        console.log(`Products [${source.channel}] progress: ${sourceProcessed}/${totalRecords}`);

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error syncing ${source.channel} products:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return {
    processed: totalProcessed,
    inserted,
    sources: sourceResults,
    paused: paused || undefined,
  };
}

// ============= Job Management =============

async function getOrCreateJob(
  supabase: any,
  tenantId: string,
  modelType: ModelType,
  sourceTable: string
): Promise<any> {
  // Check for existing pending/running job
  // IMPORTANT: Use .limit(1) instead of .single() to avoid error when multiple jobs exist
  const { data: existingJobs } = await supabase
    .from('bigquery_backfill_jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('model_type', modelType)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: true })
    .limit(1);
  
  if (existingJobs && existingJobs.length > 0) {
    console.log(`Reusing existing job ${existingJobs[0].id} for ${modelType} (status: ${existingJobs[0].status})`);
    return existingJobs[0];
  }
  
  // Create new job only if none exists
  const { data: newJob, error } = await supabase
    .from('bigquery_backfill_jobs')
    .insert({
      tenant_id: tenantId,
      model_type: modelType,
      source_table: sourceTable,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }
  
  console.log(`Created new job ${newJob.id} for ${modelType}`);
  return newJob;
}

async function updateJobStatus(
  supabase: any,
  jobId: string,
  updates: Record<string, any>
): Promise<void> {
  await supabase
    .from('bigquery_backfill_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// ============= Job Totals from Source Progress =============

async function getJobTotalsFromSources(
  supabase: any,
  jobId: string,
): Promise<{ totalProcessed: number; totalRecords: number }> {
  const { data } = await supabase
    .from('backfill_source_progress')
    .select('processed_records, total_records')
    .eq('job_id', jobId);

  return {
    totalProcessed: data?.reduce((s: number, r: any) => s + (r.processed_records || 0), 0) || 0,
    totalRecords: data?.reduce((s: number, r: any) => s + (r.total_records || 0), 0) || 0,
  };
}

// ============= Ad Spend Sync =============

async function syncAdSpend(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? AD_SPEND_SOURCES.filter(s => s.table === options.source_table)
    : AD_SPEND_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing ad_spend from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.spend_date, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const uniqueColumns = [...new Set(Object.values(source.mapping))];
      const columns = uniqueColumns.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      if (options.date_from && source.mapping.spend_date) {
        query += ` WHERE DATE(\`${source.mapping.spend_date}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.spend_date}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const adSpendRows = rows.map(row => ({
          tenant_id: tenantId,
          channel: source.channel,
          spend_date: row[source.mapping.spend_date] || null,
          campaign_id: source.mapping.campaign_id ? String(row[source.mapping.campaign_id] || 'shop_total') : 'shop_total',
          campaign_name: source.mapping.campaign_name ? (row[source.mapping.campaign_name] || null) : null,
          ad_id: source.mapping.ad_id ? String(row[source.mapping.ad_id] || 'all') : 'all',
          impressions: parseInt(row[source.mapping.impressions] || '0', 10),
          clicks: parseInt(row[source.mapping.clicks] || '0', 10),
          expense: parseFloat(row[source.mapping.expense] || '0'),
          ctr: parseFloat(row[source.mapping.ctr] || '0'),
          cpc: source.mapping.cpc ? parseFloat(row[source.mapping.cpc] || '0') : 0,
          conversions: parseInt(row[source.mapping.direct_conversions] || '0', 10),
          direct_order_amount: parseFloat(row[source.mapping.direct_gmv] || '0'),
          broad_order_amount: parseFloat(row[source.mapping.broad_gmv] || '0'),
          direct_conversions: parseInt(row[source.mapping.direct_conversions] || '0', 10),
          broad_conversions: parseInt(row[source.mapping.broad_conversions] || '0', 10),
        }));

        const { error, count } = await supabase
          .from('ad_spend_daily')
          .upsert(adSpendRows, { onConflict: 'tenant_id,channel,spend_date,campaign_id,ad_id' })
          .select('id');

        if (error) {
          console.error('Ad spend upsert error:', error);
        } else {
          inserted += count || adSpendRows.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} ad_spend:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Campaigns Sync =============

async function syncCampaigns(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? CAMPAIGN_SOURCES.filter(s => s.table === options.source_table)
    : CAMPAIGN_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing campaigns from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const dateCol = source.mapping.spend_date || source.mapping.created_at;
    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      dateCol, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }
      const uniqueColumns = [...new Set(Object.values(source.mapping))];
      const columns = uniqueColumns.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      const campaignDateCol = source.mapping.spend_date || source.mapping.created_at;
      if (options.date_from && campaignDateCol) {
        query += ` WHERE DATE(\`${campaignDateCol}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.campaign_id}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const campaigns = rows.map(row => ({
          tenant_id: tenantId,
          campaign_name: row[source.mapping.campaign_name] || 'Unknown',
          campaign_type: row[source.mapping.campaign_type] || null,
          channel: source.channel,
          status: source.mapping.status ? (row[source.mapping.status] || null) : 'active',
          impressions: source.mapping.impressions ? parseInt(row[source.mapping.impressions] || '0', 10) : null,
          clicks: source.mapping.clicks ? parseInt(row[source.mapping.clicks] || '0', 10) : null,
          actual_cost: source.mapping.expense ? parseFloat(row[source.mapping.expense] || '0') : null,
          ctr: source.mapping.ctr ? parseFloat(row[source.mapping.ctr] || '0') : null,
          cpc: source.mapping.cpc ? parseFloat(row[source.mapping.cpc] || '0') : null,
          total_orders: source.mapping.direct_order ? parseInt(row[source.mapping.direct_order] || '0', 10) : null,
          total_revenue: source.mapping.direct_gmv ? parseFloat(row[source.mapping.direct_gmv] || '0') : null,
          start_date: source.mapping.spend_date ? row[source.mapping.spend_date] : (source.mapping.created_at ? row[source.mapping.created_at] : null),
        }));

        // Upsert campaigns (unique on tenant_id, channel, campaign_name, start_date)
        const { error, count } = await supabase
          .from('promotion_campaigns')
          .upsert(campaigns, { onConflict: 'tenant_id,channel,campaign_name,start_date' })
          .select('id');

        if (error) {
          console.error('Campaign upsert error:', error);
        } else {
          inserted += count || campaigns.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} campaigns:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Inventory Sync =============

async function syncInventory(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; date_from?: string; source_table?: string },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  const sourceResults: SourceProgress[] = [];
  let paused = false;

  const sources = options.source_table
    ? INVENTORY_SOURCES.filter(s => s.table === options.source_table)
    : INVENTORY_SOURCES;

  await initSourceProgress(supabase, jobId, sources.map(s => ({
    name: s.channel,
    dataset: s.dataset,
    table: s.table,
  })));

  for (const source of sources) {
    const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
    if (savedProgress?.status === 'completed') {
      console.log(`Skipping completed source: ${source.channel}`);
      continue;
    }

    console.log(`Processing inventory from: ${source.channel} (resuming from offset ${savedProgress?.last_offset || 0})`);

    const totalRecords = await countSourceRecords(
      accessToken, projectId, source.dataset, source.table,
      source.mapping.movement_date, options.date_from
    );

    await updateSourceProgress(supabase, jobId, source.channel, {
      status: 'running',
      total_records: totalRecords,
      started_at: savedProgress?.started_at || new Date().toISOString(),
    });

    let offset = savedProgress?.last_offset || 0;
    let hasMore = true;
    let sourceProcessed = savedProgress?.processed_records || 0;
    let sourceFailed = false;
    let errorMessage = '';

    while (hasMore) {
      if (shouldPause(startTimeMs)) {
        paused = true;
        break;
      }

      const validColumns = Object.values(source.mapping).filter((v): v is string => v !== null);
      const uniqueColumns = [...new Set(validColumns)];
      const columns = uniqueColumns.map(c => `\`${c}\``).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      if (options.date_from && source.mapping.movement_date) {
        query += ` WHERE DATE(\`${source.mapping.movement_date}\`) >= '${options.date_from}'`;
      }
      query += ` ORDER BY \`${source.mapping.movement_date}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const rawRows = rows.map(row => ({
          tenant_id: tenantId,
          channel: source.channel,
          movement_date: source.mapping.movement_date ? row[source.mapping.movement_date] : null,
          branch_id: source.mapping.branch_id ? String(row[source.mapping.branch_id] || '') : null,
          branch_name: source.mapping.branch_name ? row[source.mapping.branch_name] : null,
          product_code: source.mapping.product_code ? row[source.mapping.product_code] || '' : '',
          product_name: source.mapping.product_name ? row[source.mapping.product_name] : null,
          begin_stock: source.mapping.begin_stock ? parseFloat(row[source.mapping.begin_stock] || '0') : 0,
          purchase_qty: source.mapping.purchase_qty ? parseFloat(row[source.mapping.purchase_qty] || '0') : 0,
          sold_qty: source.mapping.sold_qty ? parseFloat(row[source.mapping.sold_qty] || '0') : 0,
          return_qty: source.mapping.return_qty ? parseFloat(row[source.mapping.return_qty] || '0') : 0,
          transfer_in_qty: source.mapping.transfer_in_qty ? parseFloat(row[source.mapping.transfer_in_qty] || '0') : 0,
          transfer_out_qty: source.mapping.transfer_out_qty ? parseFloat(row[source.mapping.transfer_out_qty] || '0') : 0,
          end_stock: source.mapping.end_stock ? parseFloat(row[source.mapping.end_stock] || '0') : 0,
          net_revenue: source.mapping.net_revenue ? parseFloat(row[source.mapping.net_revenue] || '0') : 0,
          cost_amount: source.mapping.cost_amount ? parseFloat(row[source.mapping.cost_amount] || '0') : 0,
        }));

        // Deduplicate within batch: aggregate rows with same unique key
        const deduped = new Map<string, typeof rawRows[0]>();
        for (const r of rawRows) {
          const key = `${r.movement_date}|${r.branch_id}|${r.product_code}`;
          const existing = deduped.get(key);
          if (existing) {
            // Sum numeric fields
            existing.purchase_qty += r.purchase_qty;
            existing.sold_qty += r.sold_qty;
            existing.return_qty += r.return_qty;
            existing.transfer_in_qty += r.transfer_in_qty;
            existing.transfer_out_qty += r.transfer_out_qty;
            existing.net_revenue += r.net_revenue;
            existing.cost_amount += r.cost_amount;
          } else {
            deduped.set(key, { ...r });
          }
        }
        const inventoryRows = Array.from(deduped.values());

        const { error, count } = await supabase
          .from('inventory_movements')
          .upsert(inventoryRows, { onConflict: 'tenant_id,movement_date,branch_id,product_code' })
          .select('id');

        if (error) {
          console.error('Inventory upsert error:', error);
        } else {
          inserted += count || inventoryRows.length;
        }

        sourceProcessed += rows.length;
        totalProcessed += rows.length;
        offset += rows.length;

        await updateSourceProgress(supabase, jobId, source.channel, {
          processed_records: sourceProcessed,
          last_offset: offset,
        });

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error processing ${source.channel} inventory:`, error);
        errorMessage = error?.message || String(error);
        sourceFailed = true;
        hasMore = false;

        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'failed',
          error_message: errorMessage,
        });
      }
    }

    if (!sourceFailed && !paused) {
      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }

    sourceResults.push({
      source_name: source.channel,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: sourceProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    });

    if (paused) break;
  }

  // --- Phase 2: Marketplace Snapshots ---
  if (!paused) {
    const snapshotSources = options.source_table
      ? INVENTORY_SNAPSHOT_SOURCES.filter(s => s.table === options.source_table)
      : INVENTORY_SNAPSHOT_SOURCES;

    await initSourceProgress(supabase, jobId, snapshotSources.map(s => ({
      name: s.channel,
      dataset: s.dataset,
      table: s.table,
    })));

    for (const source of snapshotSources) {
      const savedProgress = await getSourceProgress(supabase, jobId, source.channel);
      if (savedProgress?.status === 'completed') {
        console.log(`Skipping completed snapshot source: ${source.channel}`);
        continue;
      }

      console.log(`Processing inventory snapshots from: ${source.channel} (offset ${savedProgress?.last_offset || 0})`);

      const totalRecords = await countSourceRecords(
        accessToken, projectId, source.dataset, source.table,
        source.mapping.snapshot_date, options.date_from
      );

      await updateSourceProgress(supabase, jobId, source.channel, {
        status: 'running',
        total_records: totalRecords,
        started_at: savedProgress?.started_at || new Date().toISOString(),
      });

      let offset = savedProgress?.last_offset || 0;
      let hasMore = true;
      let sourceProcessed = savedProgress?.processed_records || 0;
      let sourceFailed = false;
      let errorMessage = '';

      while (hasMore) {
        if (shouldPause(startTimeMs)) {
          paused = true;
          break;
        }

        const validColumns = Object.values(source.mapping).filter((v): v is string => v !== null);
        const uniqueColumns = [...new Set(validColumns)];
        const columns = uniqueColumns.map(c => `\`${c}\``).join(', ');
        let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
        if (options.date_from && source.mapping.snapshot_date) {
          query += ` WHERE DATE(\`${source.mapping.snapshot_date}\`) >= '${options.date_from}'`;
        }
        query += ` ORDER BY \`${source.mapping.snapshot_date}\` LIMIT ${batchSize} OFFSET ${offset}`;

        try {
          const { rows } = await queryBigQuery(accessToken, projectId, query);

          if (rows.length === 0) {
            hasMore = false;
            break;
          }

          const snapshotRows = rows.map(row => {
            const m = source.mapping;
            const snapshotDateRaw = m.snapshot_date ? row[m.snapshot_date] : null;
            const snapshotDate = snapshotDateRaw ? snapshotDateRaw.split('T')[0] : new Date().toISOString().split('T')[0];
            
            return {
              tenant_id: tenantId,
              channel: source.channel,
              product_id: String(m.product_id ? row[m.product_id] || '' : ''),
              sku: m.sku ? String(row[m.sku] || '') : '',
              warehouse_id: m.warehouse_id ? String(row[m.warehouse_id] || '') : '',
              warehouse_name: m.warehouse_name ? row[m.warehouse_name] : null,
              quantity: m.quantity ? parseInt(row[m.quantity] || '0', 10) : 0,
              available_quantity: m.available_quantity ? parseInt(row[m.available_quantity] || '0', 10) : 0,
              reserved_quantity: m.reserved_quantity ? parseInt(row[m.reserved_quantity] || '0', 10) : 0,
              sellable_quantity: m.sellable_quantity ? parseInt(row[m.sellable_quantity] || '0', 10) : 0,
              snapshot_date: snapshotDate,
              source_table: source.table,
            };
          });

          const { error, count } = await supabase
            .from('inventory_snapshots')
            .upsert(snapshotRows, { onConflict: 'tenant_id,channel,product_id,sku,warehouse_id,snapshot_date' })
            .select('id');

          if (error) {
            console.error('Inventory snapshot upsert error:', error);
          } else {
            inserted += count || snapshotRows.length;
          }

          sourceProcessed += rows.length;
          totalProcessed += rows.length;
          offset += rows.length;

          await updateSourceProgress(supabase, jobId, source.channel, {
            processed_records: sourceProcessed,
            last_offset: offset,
          });

          if (rows.length < batchSize) {
            hasMore = false;
          }
        } catch (error: any) {
          console.error(`Error processing ${source.channel} snapshot:`, error);
          errorMessage = error?.message || String(error);
          sourceFailed = true;
          hasMore = false;

          await updateSourceProgress(supabase, jobId, source.channel, {
            status: 'failed',
            error_message: errorMessage,
          });
        }
      }

      if (!sourceFailed && !paused) {
        await updateSourceProgress(supabase, jobId, source.channel, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      sourceResults.push({
        source_name: source.channel,
        dataset: source.dataset,
        table_name: source.table,
        status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
        total_records: totalRecords,
        processed_records: sourceProcessed,
        last_offset: offset,
        error_message: errorMessage || undefined,
      });

      if (paused) break;
    }
  }

  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const autoContinue = req.headers.get('x-auto-continue') === '1';

  try {
    const params: BackfillRequest = await req.json();
    
    console.log('Backfill request:', {
      action: params.action,
      tenant_id: params.tenant_id,
      model_type: params.model_type,
    });

    // Validate required params
    if (!params.tenant_id) {
      throw new Error('tenant_id is required');
    }
    if (!params.model_type && params.action !== 'schema_check' && params.action !== 'update_discounts') {
      throw new Error('model_type is required');
    }

    // Get service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'bluecore-dcp';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get default integration ID for tenant
    const { data: integration } = await supabase
      .from('connector_integrations')
      .select('id')
      .eq('tenant_id', params.tenant_id)
      .eq('connector_type', 'bigquery')
      .eq('status', 'active')
      .single();
    
    const integrationId = integration?.id || params.tenant_id; // Fallback to tenant_id

    // Handle different actions
    if (params.action === 'status') {
      const { data: jobs } = await supabase
        .from('bigquery_backfill_jobs')
        .select('*')
        .eq('tenant_id', params.tenant_id)
        .eq('model_type', params.model_type)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Also get source progress for each job
      const jobIds = jobs?.map(j => j.id) || [];
      const { data: sourceProgress } = await supabase
        .from('backfill_source_progress')
        .select('*')
        .in('job_id', jobIds);
      
      // Attach source progress to each job
      const jobsWithProgress = jobs?.map(j => ({
        ...j,
        source_progress: sourceProgress?.filter(sp => sp.job_id === j.id) || [],
      }));
      
      return new Response(JSON.stringify({
        success: true,
        jobs: jobsWithProgress,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Schema check action - query BigQuery INFORMATION_SCHEMA
    if (params.action === 'schema_check') {
      const accessToken = await getAccessToken(serviceAccount);
      const dataset = params.options?.dataset || 'olvboutique';
      const tableName = params.options?.table_name;
      
      let query: string;
      if (tableName) {
        query = `SELECT column_name, data_type FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${tableName}' ORDER BY ordinal_position`;
      } else {
        query = `SELECT table_name FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.TABLES\` ORDER BY table_name`;
      }
      
      const { rows } = await queryBigQuery(accessToken, projectId, query);
      return new Response(JSON.stringify({
        success: true,
        query,
        rows,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= Update Discounts Action =============
    // Queries RAW BigQuery raw_kiotviet_Orders directly (source of truth)
    // Then batch UPDATE cdp_orders.discount_amount and net_revenue
    // LOOPS INTERNALLY to process many batches per invocation (~45s budget)
    if (params.action === 'update_discounts') {
      const accessToken = await getAccessToken(serviceAccount);
      const batchSize = params.options?.batch_size || 2000;  // Larger batch per BQ query
      let currentOffset = params.options?.offset || 0;
      const startTime = Date.now();
      const TIME_BUDGET_MS = 45_000; // 45s budget, leave 15s margin
      
      let totalUpdated = 0;
      let totalErrors = 0;
      let totalBqRows = 0;
      let batchesProcessed = 0;
      let completed = false;
      
      console.log(`[update_discounts] Starting internal loop from offset=${currentOffset}, batchSize=${batchSize}`);
      
      while (Date.now() - startTime < TIME_BUDGET_MS) {
        // Query batch from RAW table
        const bqQuery = `
          SELECT 
            CAST(OrderId AS STRING) as order_id,
            IFNULL(discount, 0) as discount_amount,
            IFNULL(TotalPayment, 0) as total_payment
          FROM \`${projectId}.olvboutique.raw_kiotviet_Orders\`
          ORDER BY OrderId
          LIMIT ${batchSize} OFFSET ${currentOffset}
        `;
        
        let rows: any[];
        let totalRows: number;
        try {
          const result = await queryBigQuery(accessToken, projectId, bqQuery);
          rows = result.rows;
          totalRows = result.totalRows;
          totalBqRows = totalRows;
        } catch (bqErr) {
          console.error(`[update_discounts] BQ query failed at offset=${currentOffset}:`, bqErr);
          // Return partial progress so frontend can resume
          break;
        }
        
        if (rows.length === 0) {
          completed = true;
          console.log(`[update_discounts] All records processed at offset=${currentOffset}`);
          break;
        }
        
        // Build batch payload
        const updates = rows.map(r => ({
          order_key: String(r.order_id),
          discount: parseFloat(r.discount_amount || '0'),
        }));
        
        // RPC call
        try {
          const { data: count, error: rpcError } = await supabase
            .rpc('update_order_discounts_batch', {
              p_tenant_id: params.tenant_id,
              p_updates: updates,
            });
          
          if (rpcError) {
            console.error(`[update_discounts] RPC error at offset=${currentOffset}:`, rpcError.message);
            totalErrors += updates.length;
          } else {
            totalUpdated += (count || 0);
          }
        } catch (rpcErr) {
          console.error(`[update_discounts] RPC exception at offset=${currentOffset}:`, rpcErr);
          totalErrors += updates.length;
        }
        
        currentOffset += rows.length;
        batchesProcessed++;
        
        if (rows.length < batchSize) {
          completed = true;
          break;
        }
        
        console.log(`[update_discounts] Batch #${batchesProcessed} done. offset=${currentOffset}, updated=${totalUpdated}, elapsed=${Date.now() - startTime}ms`);
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`[update_discounts] Invocation done. Batches: ${batchesProcessed}, Updated: ${totalUpdated}, Errors: ${totalErrors}, Next offset: ${currentOffset}, Completed: ${completed}, Elapsed: ${elapsed}ms`);
      
      return new Response(JSON.stringify({
        success: true,
        offset: params.options?.offset || 0,
        next_offset: currentOffset,
        total_bq_rows: totalBqRows,
        updated: totalUpdated,
        errors: totalErrors,
        batches_processed: batchesProcessed,
        elapsed_ms: elapsed,
        completed,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (params.action === 'cancel') {
      await supabase
        .from('bigquery_backfill_jobs')
        .update({ status: 'cancelled' })
        .eq('tenant_id', params.tenant_id)
        .eq('model_type', params.model_type)
        .in('status', ['pending', 'running']);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Job cancelled',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Start or continue backfill
    const sourceTable = params.options?.source_table || params.model_type;
    const job = await getOrCreateJob(supabase, params.tenant_id, params.model_type, sourceTable);
    
    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    
    // Update job to running
    await updateJobStatus(supabase, job.id, { 
      status: 'running', 
      started_at: job.started_at || new Date().toISOString() 
    });

    let result: any;
    
    try {
      switch (params.model_type) {
        case 'customers':
          result = await syncCustomers(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'orders':
          result = await syncOrders(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'products':
          result = await syncProducts(
            supabase, accessToken, projectId,
            params.tenant_id, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'order_items':
          result = await syncOrderItems(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'refunds':
          result = await syncRefunds(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'payments':
          result = await syncPayments(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'fulfillments':
          result = await syncFulfillments(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'ad_spend':
          result = await syncAdSpend(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        case 'campaigns':
          result = await syncCampaigns(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;

        case 'inventory':
        case 'inventory_snapshots': // Legacy: treat as inventory
          result = await syncInventory(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId, job.id,
            params.options || {},
            startTime,
          );
          break;
          
        default:
          throw new Error(`Model type not yet implemented: ${params.model_type}`);
      }
      
      // Get accurate cumulative totals from source progress (source of truth)
      const sourceTotals = await getJobTotalsFromSources(supabase, job.id);
      const accurateProcessed = sourceTotals.totalProcessed || result.processed || 0;
      const accurateTotalRecords = sourceTotals.totalRecords || result.sources?.reduce((sum: number, s: SourceProgress) => sum + (s.total_records || 0), 0) || result.processed;

      if (result?.paused) {
        // Pause before timeout: leave job in pending so it can be resumed safely.
        await updateJobStatus(supabase, job.id, {
          status: 'pending',
          processed_records: accurateProcessed,
          total_records: accurateTotalRecords,
          metadata: result,
        });

        // Auto-continue: always fire next chunk regardless of how this one was triggered
        const functionUrl = `${supabaseUrl}/functions/v1/backfill-bigquery`;
        const body = {
          ...params,
          action: 'continue',
        };

        console.log('Auto-continue: firing next chunk...');
        fetch(functionUrl, {
          method: 'POST',
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
            'x-auto-continue': '1',
          },
          body: JSON.stringify(body),
        }).catch((e) => console.error('Auto-continue failed:', e));
      } else {
        // Completed normally
        await updateJobStatus(supabase, job.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_records: accurateProcessed,
          total_records: accurateTotalRecords,
          metadata: result,
        });
      }
      
    } catch (syncError: any) {
      await updateJobStatus(supabase, job.id, {
        status: 'failed',
        error_message: syncError.message,
      });
      throw syncError;
    }

    const duration = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      model_type: params.model_type,
      result,
      duration_ms: duration,
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Backfill error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
