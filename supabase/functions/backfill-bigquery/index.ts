/**
 * backfill-bigquery - Backfill data from BigQuery to L2 Master Model
 * 
 * @architecture Layer 10 → L2 Integration
 * Supports batch backfill with resume capability, customer deduplication,
 * and progress tracking via bigquery_backfill_jobs table.
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

type ActionType = 'start' | 'continue' | 'status' | 'cancel';

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

// ============= Constants =============

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 1000;
const MAX_EXECUTION_TIME_MS = 120000; // 2 minutes, leave buffer for 150s limit

const CUSTOMER_SOURCES: CustomerSource[] = [
  {
    name: 'kiotviet',
    dataset: 'olvboutique_kiotviet',
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
    dataset: 'olvboutique_haravan',
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
    dataset: 'olvboutique_bcapp',
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
      net_revenue: 'escrow_amount',
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
      order_key: 'id',
      order_at: 'create_time',
      status: 'status',
      gross_revenue: 'paid_amount',
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
      customer_name: 'billing_full_name',
      gross_revenue: 'grand_total',
      payment_method: 'payment_method',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique_kiotviet',
    table: 'raw_kiotviet_Orders',
    mapping: {
      order_key: 'Id',
      order_at: 'PurchaseDate',
      status: 'Status',
      customer_id: 'CustomerId',
      customer_name: 'CustomerName',
      gross_revenue: 'Total',
      discount: 'Discount',
      payment_method: 'PaymentMethodStr',
    }
  }
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
      maxResults: MAX_BATCH_SIZE,
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

// ============= Customer Sync with Dedup =============

async function syncCustomers(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  options: { batch_size?: number; date_from?: string }
): Promise<{ processed: number; created: number; merged: number }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  const customerMap = new Map<string, any>(); // phone/email -> customer data
  
  let totalProcessed = 0;
  let created = 0;
  let merged = 0;
  
  const sourceErrors: string[] = [];

  for (const source of CUSTOMER_SOURCES) {
    console.log(`Processing customer source: ${source.name}`);

    let offset = 0;
    let hasMore = true;
    let sourceProcessed = 0;
    let sourceFailed = false;

    while (hasMore) {
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
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error: any) {
        const msg = error?.message ? String(error.message) : String(error);
        console.error(`Error processing ${source.name} at offset ${offset}:`, error);
        sourceErrors.push(`${source.name}: ${msg}`);
        sourceFailed = true;
        hasMore = false;
      }
    }

    // If a source fails immediately and produces nothing, keep going to next source;
    // but if ALL sources fail and we end up with 0 processed, we should fail the job.
    if (sourceFailed && sourceProcessed === 0) {
      continue;
    }
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
      integration_id: integrationId,
      customer_key: c.phone || c.email,
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
    }));
    
    const { error } = await supabase
      .from('cdp_customers')
      .upsert(batch, { onConflict: 'tenant_id,integration_id,customer_key' });
    
    if (error) {
      console.error('Upsert error:', error);
    }
  }
  
  return { processed: totalProcessed, created, merged };
}

// ============= Orders Sync =============

async function syncOrders(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  options: { batch_size?: number; date_from?: string; date_to?: string; source_table?: string }
): Promise<{ processed: number; inserted: number }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  
  // Filter to specific source if provided, otherwise all
  const sources = options.source_table
    ? ORDER_SOURCES.filter(s => s.table === options.source_table)
    : ORDER_SOURCES;
  
  for (const source of sources) {
    console.log(`Processing orders from: ${source.channel}`);
    
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const columns = Object.values(source.mapping).join(', ');
      let query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\``;
      
      const conditions: string[] = [];
      if (options.date_from) {
        conditions.push(`DATE(${source.mapping.order_at}) >= '${options.date_from}'`);
      }
      if (options.date_to) {
        conditions.push(`DATE(${source.mapping.order_at}) <= '${options.date_to}'`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY ${source.mapping.order_at} LIMIT ${batchSize} OFFSET ${offset}`;
      
      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);
        
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        
        // Transform and upsert
        const orders = rows.map(row => ({
          tenant_id: tenantId,
          integration_id: integrationId,
          order_key: String(row[source.mapping.order_key]),
          channel: source.channel,
          order_at: row[source.mapping.order_at],
          status: row[source.mapping.status],
          customer_name: row[source.mapping.customer_name],
          customer_phone: row[source.mapping.customer_phone],
          gross_revenue: parseFloat(row[source.mapping.gross_revenue] || '0'),
          net_revenue: parseFloat(row[source.mapping.net_revenue] || row[source.mapping.gross_revenue] || '0'),
          currency: 'VND',
          payment_method: row[source.mapping.payment_method],
        }));
        
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
        
        totalProcessed += rows.length;
        offset += rows.length;
        
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error processing ${source.channel} orders:`, error);
        hasMore = false;
      }
    }
  }
  
  return { processed: totalProcessed, inserted };
}

// ============= Order Items Sync =============

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
      quantity: 'quantity',
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
      item_id: 'id',
      sku: 'seller_sku',
      name: 'product_name',
      quantity: 'quantity',
      unit_price: 'original_price',
      discount: 'platform_discount',
      total: 'sale_price',
    }
  },
  {
    channel: 'kiotviet',
    dataset: 'olvboutique_kiotviet',
    table: 'raw_kiotviet_OrderDetails',
    mapping: {
      order_key: 'OrderId',
      item_id: 'ProductId',
      sku: 'ProductCode',
      name: 'ProductName',
      quantity: 'Quantity',
      unit_price: 'Price',
      discount: 'Discount',
      total: 'SubTotal',
    }
  }
];

async function syncOrderItems(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  options: { batch_size?: number; date_from?: string; date_to?: string; source_table?: string }
): Promise<{ processed: number; inserted: number }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  
  // Filter to specific source if provided, otherwise all
  const sources = options.source_table
    ? ORDER_ITEM_SOURCES.filter(s => s.table === options.source_table)
    : ORDER_ITEM_SOURCES;
  
  for (const source of sources) {
    console.log(`Processing order items from: ${source.channel}`);
    
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const columns = Object.values(source.mapping).join(', ');
      const query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\` ORDER BY ${source.mapping.order_key} LIMIT ${batchSize} OFFSET ${offset}`;
      
      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);
        
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        
        // Transform and insert (no unique constraint on this table)
        const orderItems = rows.map(row => ({
          tenant_id: tenantId,
          integration_id: integrationId,
          product_id: String(row[source.mapping.item_id] || ''),
          sku: row[source.mapping.sku],
          product_name: row[source.mapping.name],
          qty: parseInt(row[source.mapping.quantity] || '1', 10),
          unit_price: parseFloat(row[source.mapping.unit_price] || '0'),
          original_price: parseFloat(row[source.mapping.unit_price] || '0'),
          discount_amount: parseFloat(row[source.mapping.discount] || '0'),
          line_revenue: parseFloat(row[source.mapping.total] || '0'),
          raw_data: {
            source_channel: source.channel,
            source_order_key: String(row[source.mapping.order_key]),
          },
        }));
        
        const { error, count } = await supabase
          .from('cdp_order_items')
          .insert(orderItems)
          .select('id');
        
        if (error) {
          console.error('Order item upsert error:', error);
        } else {
          inserted += count || orderItems.length;
        }
        
        totalProcessed += rows.length;
        offset += rows.length;
        
        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error processing ${source.channel} order items:`, error);
        hasMore = false;
      }
    }
  }
  
  return { processed: totalProcessed, inserted };
}

// ============= Products Sync =============

async function syncProducts(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  options: { batch_size?: number }
): Promise<{ processed: number; inserted: number }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0;
  let inserted = 0;
  
  const query = `
    SELECT 
      ItemId, Barcode, ItemCode, ItemName, 
      CategoryName, TradeMark, Unit, 
      AvgCostPrice, BasePrice, SellPrice,
      CreatedDate, ModifiedDate
    FROM \`${projectId}.olvboutique_kiotviet.bdm_master_data_products\`
    ORDER BY ItemId
    LIMIT ${batchSize}
  `;
  
  try {
    const { rows } = await queryBigQuery(accessToken, projectId, query);
    
    const products = rows.map(row => ({
      tenant_id: tenantId,
      sku: row.ItemCode || row.Barcode,
      barcode: row.Barcode,
      name: row.ItemName,
      category: row.CategoryName,
      brand: row.TradeMark,
      unit: row.Unit,
      cost_price: parseFloat(row.AvgCostPrice || '0'),
      base_price: parseFloat(row.BasePrice || '0'),
      sell_price: parseFloat(row.SellPrice || '0'),
      metadata: { kiotviet_id: row.ItemId },
    }));
    
    const { error, count } = await supabase
      .from('products')
      .upsert(products, { 
        onConflict: 'tenant_id,sku',
        count: 'exact'
      });
    
    if (error) {
      console.error('Product upsert error:', error);
    } else {
      inserted = count || products.length;
    }
    
    totalProcessed = rows.length;
  } catch (error) {
    console.error('Error syncing products:', error);
  }
  
  return { processed: totalProcessed, inserted };
}

// ============= Job Management =============

async function getOrCreateJob(
  supabase: any,
  tenantId: string,
  modelType: ModelType,
  sourceTable: string
): Promise<any> {
  // Check for existing pending/running job
  const { data: existingJob } = await supabase
    .from('bigquery_backfill_jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('model_type', modelType)
    .in('status', ['pending', 'running'])
    .single();
  
  if (existingJob) {
    return existingJob;
  }
  
  // Create new job
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

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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
    if (!params.model_type) {
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
      
      return new Response(JSON.stringify({
        success: true,
        jobs,
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
            params.tenant_id, integrationId,
            params.options || {}
          );
          break;
          
        case 'orders':
          result = await syncOrders(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId,
            params.options || {}
          );
          break;
          
        case 'products':
          result = await syncProducts(
            supabase, accessToken, projectId,
            params.tenant_id,
            params.options || {}
          );
          break;
          
        case 'order_items':
          result = await syncOrderItems(
            supabase, accessToken, projectId,
            params.tenant_id, integrationId,
            params.options || {}
          );
          break;
          
        default:
          throw new Error(`Model type not yet implemented: ${params.model_type}`);
      }
      
      // Update job to completed
      await updateJobStatus(supabase, job.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_records: result.processed || 0,
        metadata: result,
      });
      
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
