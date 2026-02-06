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
      status: 'Status',
      customer_id: 'CusId',
      customer_name: 'CustomerName',
      gross_revenue: 'Total',
      discount: 'discount',
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
      paid_at: 'paid_time',
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
      payment_method: 'PaymentMethod',
      payment_status: 'Status',
      amount: 'Total',
      paid_at: 'PurchaseDate',
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
      tracking_number: 'tracking_no',
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
      tracking_number: 'tracking_code',
      shipping_carrier: 'shipping_provider',
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
      shipped_at: 'shipping_due_time',
    }
  },
];

const PRODUCT_SOURCE = {
  name: 'kiotviet_master',
  dataset: 'olvboutique',
  table: 'bdm_master_data_products',
};

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
    }));
    
    const { error } = await supabase
      .from('cdp_customers')
      .upsert(batch, { onConflict: 'tenant_id,canonical_key' });
    
    if (error) {
      console.error('Upsert error:', error);
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
    
    // Count total records
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
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      const query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\` ORDER BY \`${source.mapping.order_key}\` LIMIT ${batchSize} OFFSET ${offset}`;
      
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
          qty: source.mapping.quantity ? parseInt(row[source.mapping.quantity] || '1', 10) : 1,
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
  
  return { processed: totalProcessed, inserted, sources: sourceResults, paused: paused || undefined };
}

// ============= Refunds Sync =============

async function syncRefunds(
  supabase: any,
  accessToken: string,
  projectId: string,
  tenantId: string,
  integrationId: string,
  jobId: string,
  options: { batch_size?: number; source_table?: string },
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
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      const query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\` ORDER BY \`${source.mapping.refund_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

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

        // Upsert to avoid duplicates (unique on tenant_id + refund_key)
        const { error, count } = await supabase
          .from('cdp_refunds')
          .upsert(refunds, { onConflict: 'tenant_id,refund_key', ignoreDuplicates: true })
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
  options: { batch_size?: number; source_table?: string },
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
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      const query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\` ORDER BY \`${source.mapping.payment_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const payments = rows.map(row => ({
          tenant_id: tenantId,
          payment_key: `${source.channel}:${String(row[source.mapping.payment_key] || '')}`,
          order_key: `${source.channel}:${String(row[source.mapping.order_key] || '')}`,
          channel: source.channel,
          payment_method: row[source.mapping.payment_method] || null,
          payment_status: row[source.mapping.payment_status] || null,
          amount: parseFloat(row[source.mapping.amount] || '0'),
          paid_at: row[source.mapping.paid_at] || null,
        }));

        const { error, count } = await supabase
          .from('cdp_payments')
          .upsert(payments, { onConflict: 'tenant_id,payment_key', ignoreDuplicates: true })
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
  options: { batch_size?: number; source_table?: string },
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
      const columns = Object.values(source.mapping).map(c => `\`${c}\``).join(', ');
      const query = `SELECT ${columns} FROM \`${projectId}.${source.dataset}.${source.table}\` ORDER BY \`${source.mapping.fulfillment_key}\` LIMIT ${batchSize} OFFSET ${offset}`;

      try {
        const { rows } = await queryBigQuery(accessToken, projectId, query);

        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        const fulfillments = rows.map(row => ({
          tenant_id: tenantId,
          fulfillment_key: `${source.channel}:${String(row[source.mapping.fulfillment_key] || '')}`,
          order_key: `${source.channel}:${String(row[source.mapping.order_key] || '')}`,
          channel: source.channel,
          tracking_number: row[source.mapping.tracking_number] || null,
          shipping_carrier: row[source.mapping.shipping_carrier] || null,
          fulfillment_status: row[source.mapping.fulfillment_status] || null,
          shipped_at: row[source.mapping.shipped_at] || null,
        }));

        const { error, count } = await supabase
          .from('cdp_fulfillments')
          .upsert(fulfillments, { onConflict: 'tenant_id,fulfillment_key', ignoreDuplicates: true })
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
  options: { batch_size?: number },
  startTimeMs: number,
): Promise<{ processed: number; inserted: number; sources: SourceProgress[]; paused?: boolean }> {
  const batchSize = options.batch_size || DEFAULT_BATCH_SIZE;
  let totalProcessed = 0; // Will be set after reading saved progress
  let inserted = 0;
  
  const source = PRODUCT_SOURCE;
  
  // Initialize source progress
  await initSourceProgress(supabase, jobId, [{
    name: source.name,
    dataset: source.dataset,
    table: source.table,
  }]);
  
  // Read saved progress to resume
  const savedProgress = await getSourceProgress(supabase, jobId, source.name);
  if (savedProgress?.status === 'completed') {
    console.log(`Skipping completed source: ${source.name}`);
    return { processed: savedProgress.processed_records, inserted: 0, sources: [], paused: false };
  }

  // Count total records first
  const totalRecords = await countSourceRecords(
    accessToken, projectId, source.dataset, source.table
  );
  
  console.log(`Products source has ${totalRecords} total records (resuming from offset ${savedProgress?.last_offset || 0})`);
  
  await updateSourceProgress(supabase, jobId, source.name, {
    status: 'running',
    total_records: totalRecords,
    started_at: savedProgress?.started_at || new Date().toISOString(),
  });
  
  let offset = savedProgress?.last_offset || 0;
  totalProcessed = savedProgress?.processed_records || 0;
  let hasMore = true;
  let sourceFailed = false;
  let errorMessage = '';
  let paused = false;
  while (hasMore) {
    if (shouldPause(startTimeMs)) {
      paused = true;
      break;
    }
    const query = `
      SELECT 
        productid, Ma_hang, Ten_hang, 
        Nhom_hang, Thuong_hieu, 
        Gia_goc, Gia_ban, Ton_kho,
        Date, family_code
      FROM \`${projectId}.${source.dataset}.${source.table}\`
      ORDER BY productid
      LIMIT ${batchSize} OFFSET ${offset}
    `;
    
    try {
      const { rows } = await queryBigQuery(accessToken, projectId, query);
      
      if (rows.length === 0) {
        hasMore = false;
        break;
      }
      
      const products = rows.map(row => ({
        tenant_id: tenantId,
        sku: row.Ma_hang,
        name: row.Ten_hang,
        category: row.Nhom_hang,
        brand: row.Thuong_hieu,
        unit: null,
        cost_price: parseFloat(row.Gia_goc || '0'),
        selling_price: parseFloat(row.Gia_ban || '0'),
        current_stock: parseFloat(row.Ton_kho || '0'),
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
        inserted += count || products.length;
      }
      
      totalProcessed += rows.length;
      offset += rows.length;
      
      // Update source and job progress
      await updateSourceProgress(supabase, jobId, source.name, {
        processed_records: totalProcessed,
        last_offset: offset,
      });
      
      await updateJobStatus(supabase, jobId, {
        processed_records: totalProcessed,
        total_records: totalRecords,
        last_watermark: String(offset),
      });
      
      console.log(`Products progress: ${totalProcessed}/${totalRecords}`);
      
      if (rows.length < batchSize) {
        hasMore = false;
      }
    } catch (error: any) {
      console.error('Error syncing products:', error);
      errorMessage = error?.message || String(error);
      sourceFailed = true;
      hasMore = false;
      
      await updateSourceProgress(supabase, jobId, source.name, {
        status: 'failed',
        error_message: errorMessage,
      });
      
      throw error; // Re-throw to mark job as failed
    }
  }
  
  if (!sourceFailed && !paused) {
    await updateSourceProgress(supabase, jobId, source.name, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }
  
  return { 
    processed: totalProcessed, 
    inserted,
    sources: [{
      source_name: source.name,
      dataset: source.dataset,
      table_name: source.table,
      status: sourceFailed ? 'failed' : paused ? 'running' : 'completed',
      total_records: totalRecords,
      processed_records: totalProcessed,
      last_offset: offset,
      error_message: errorMessage || undefined,
    }],
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
          
        default:
          throw new Error(`Model type not yet implemented: ${params.model_type}`);
      }
      
      const totalRecords = result.sources?.reduce((sum: number, s: SourceProgress) => sum + (s.total_records || 0), 0) || result.processed;

      if (result?.paused) {
        // Pause before timeout: leave job in pending so it can be resumed safely.
        await updateJobStatus(supabase, job.id, {
          status: 'pending',
          processed_records: result.processed || 0,
          total_records: totalRecords,
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
          processed_records: result.processed || 0,
          total_records: totalRecords,
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
