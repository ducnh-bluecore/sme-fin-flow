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

// Execute BigQuery query with pagination
async function queryBigQuery(accessToken: string, projectId: string, query: string, maxResults = 10000): Promise<any[]> {
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
      maxResults,
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

// Data model sync configurations
interface DataModelSyncConfig {
  model_name: string;
  bigquery_dataset: string;
  bigquery_table: string;
  primary_key_field: string;
  timestamp_field?: string;
  target_table: string;
  field_mapping: Record<string, string>;
  transform?: (row: any) => any;
}

// Pre-configured sync mappings for common data models
const DATA_MODEL_CONFIGS: Record<string, DataModelSyncConfig> = {
  orders: {
    model_name: 'orders',
    bigquery_dataset: 'menstaysimplicity_shopee',
    bigquery_table: 'shopee_Orders',
    primary_key_field: 'order_sn',
    timestamp_field: 'create_time',
    target_table: 'external_orders',
    field_mapping: {
      order_sn: 'external_order_id',
      create_time: 'order_date',
      total_amount: 'total_amount',
      order_status: 'order_status',
      buyer_username: 'customer_name',
    },
  },
  settlements: {
    model_name: 'settlements',
    bigquery_dataset: 'menstaysimplicity_shopee',
    bigquery_table: 'shopee_Settlements',
    primary_key_field: 'settlement_id',
    timestamp_field: 'settlement_date',
    target_table: 'channel_settlements',
    field_mapping: {
      settlement_id: 'settlement_id',
      settlement_date: 'period_start',
      total_amount: 'net_amount',
      total_orders: 'total_orders',
    },
  },
  marketing_spend: {
    model_name: 'marketing_spend',
    bigquery_dataset: 'marketing_data',
    bigquery_table: 'daily_ad_spend',
    primary_key_field: 'id',
    timestamp_field: 'spend_date',
    target_table: 'marketing_expenses',
    field_mapping: {
      id: 'id',
      spend_date: 'expense_date',
      channel: 'channel',
      campaign_name: 'campaign_name',
      cost: 'amount',
      impressions: 'impressions',
      clicks: 'clicks',
      conversions: 'conversions',
    },
  },
  customers: {
    model_name: 'customers',
    bigquery_dataset: 'customer_data',
    bigquery_table: 'customer_profiles',
    primary_key_field: 'customer_id',
    timestamp_field: 'updated_at',
    target_table: 'customers',
    field_mapping: {
      customer_id: 'id',
      name: 'name',
      email: 'email',
      phone: 'phone',
      total_orders: 'order_count',
      lifetime_value: 'lifetime_value',
      first_order_date: 'first_order_date',
      last_order_date: 'last_order_date',
    },
  },
  inventory: {
    model_name: 'inventory',
    bigquery_dataset: 'warehouse_data',
    bigquery_table: 'stock_levels',
    primary_key_field: 'sku',
    timestamp_field: 'updated_at',
    target_table: 'inventory_levels',
    field_mapping: {
      sku: 'sku',
      product_name: 'product_name',
      quantity: 'quantity_on_hand',
      warehouse_location: 'location',
      updated_at: 'last_updated',
    },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id || 'bluecore-dcp';

    // Parse request body (optional - for manual triggers)
    let specificTenantId: string | null = null;
    let specificModelName: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        specificTenantId = body.tenant_id || null;
        specificModelName = body.model_name || null;
      } catch {
        // No body or invalid JSON, continue with scheduled behavior
      }
    }

    console.log('Starting scheduled BigQuery sync...', { specificTenantId, specificModelName });

    // Get enabled data models that need syncing
    const now = new Date();
    let modelsQuery = supabase
      .from('bigquery_data_models')
      .select('*')
      .eq('is_enabled', true);

    if (specificTenantId) {
      modelsQuery = modelsQuery.eq('tenant_id', specificTenantId);
    }
    if (specificModelName) {
      modelsQuery = modelsQuery.eq('model_name', specificModelName);
    }

    const { data: dataModels, error: modelsError } = await modelsQuery;

    if (modelsError) {
      throw new Error(`Failed to fetch data models: ${modelsError.message}`);
    }

    console.log(`Found ${dataModels?.length || 0} enabled data models`);

    const results: Array<{
      tenant_id: string;
      model_name: string;
      status: string;
      records_synced?: number;
      error?: string;
    }> = [];

    // Get access token once for all syncs
    const accessToken = await getAccessToken(serviceAccount);

    for (const model of dataModels || []) {
      try {
        console.log(`Syncing ${model.model_name} for tenant ${model.tenant_id}...`);

        // Get last sync watermark
        const { data: watermark } = await supabase
          .from('bigquery_sync_watermarks')
          .select('*')
          .eq('tenant_id', model.tenant_id)
          .eq('data_model', model.model_name)
          .eq('dataset_id', model.bigquery_dataset)
          .eq('table_id', model.bigquery_table)
          .single();

        // Check if sync is needed based on frequency
        if (watermark?.last_sync_at) {
          const lastSync = new Date(watermark.last_sync_at);
          const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastSync < (model.sync_frequency_hours || 24)) {
            console.log(`Skipping ${model.model_name} - synced ${hoursSinceLastSync.toFixed(1)}h ago (threshold: ${model.sync_frequency_hours}h)`);
            continue;
          }
        }

        // Update watermark to 'syncing' status
        await supabase
          .from('bigquery_sync_watermarks')
          .upsert({
            tenant_id: model.tenant_id,
            data_model: model.model_name,
            dataset_id: model.bigquery_dataset,
            table_id: model.bigquery_table,
            sync_status: 'syncing',
            updated_at: now.toISOString(),
          }, {
            onConflict: 'tenant_id,data_model,dataset_id,table_id',
          });

        // Build incremental query
        let query = `SELECT * FROM \`${projectId}.${model.bigquery_dataset}.${model.bigquery_table}\``;
        
        if (model.timestamp_field && watermark?.last_record_timestamp) {
          query += ` WHERE ${model.timestamp_field} > TIMESTAMP('${watermark.last_record_timestamp}')`;
        }
        
        query += ` ORDER BY ${model.timestamp_field || model.primary_key_field} ASC LIMIT 5000`;

        console.log(`Executing query for ${model.model_name}...`);
        const rows = await queryBigQuery(accessToken, projectId, query, 5000);
        console.log(`Fetched ${rows.length} rows for ${model.model_name}`);

        let recordsSynced = 0;
        let lastTimestamp: string | null = null;

        if (rows.length > 0 && model.target_table) {
          // Get model config for field mapping
          const modelConfig = DATA_MODEL_CONFIGS[model.model_name] || model.mapping_config;
          
          // Transform and insert data
          const transformedRows = rows.map(row => {
            const mapped: any = { tenant_id: model.tenant_id };
            
            // Apply field mapping if available
            if (modelConfig?.field_mapping) {
              for (const [srcField, dstField] of Object.entries(modelConfig.field_mapping)) {
                if (row[srcField] !== undefined) {
                  mapped[dstField] = row[srcField];
                }
              }
            } else {
              // Direct mapping
              Object.assign(mapped, row);
            }

            // Track last timestamp for watermark
            if (model.timestamp_field && row[model.timestamp_field]) {
              lastTimestamp = row[model.timestamp_field];
            }

            return mapped;
          });

          // Upsert to target table
          const { error: insertError, count } = await supabase
            .from(model.target_table)
            .upsert(transformedRows, {
              onConflict: model.primary_key_field,
              count: 'exact',
            });

          if (insertError) {
            throw new Error(`Insert error: ${insertError.message}`);
          }

          recordsSynced = count || transformedRows.length;
        }

        // Update watermark with success
        await supabase
          .from('bigquery_sync_watermarks')
          .upsert({
            tenant_id: model.tenant_id,
            data_model: model.model_name,
            dataset_id: model.bigquery_dataset,
            table_id: model.bigquery_table,
            sync_status: 'completed',
            last_sync_at: now.toISOString(),
            last_record_timestamp: lastTimestamp || watermark?.last_record_timestamp,
            total_records_synced: (watermark?.total_records_synced || 0) + recordsSynced,
            updated_at: now.toISOString(),
          }, {
            onConflict: 'tenant_id,data_model,dataset_id,table_id',
          });

        // Update data model last_sync_at
        await supabase
          .from('bigquery_data_models')
          .update({ last_sync_at: now.toISOString() })
          .eq('id', model.id);

        results.push({
          tenant_id: model.tenant_id,
          model_name: model.model_name,
          status: 'success',
          records_synced: recordsSynced,
        });

        console.log(`Successfully synced ${model.model_name}: ${recordsSynced} records`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to sync ${model.model_name}:`, errorMsg);

        // Update watermark with failure
        await supabase
          .from('bigquery_sync_watermarks')
          .upsert({
            tenant_id: model.tenant_id,
            data_model: model.model_name,
            dataset_id: model.bigquery_dataset,
            table_id: model.bigquery_table,
            sync_status: 'failed',
            error_message: errorMsg,
            updated_at: now.toISOString(),
          }, {
            onConflict: 'tenant_id,data_model,dataset_id,table_id',
          });

        results.push({
          tenant_id: model.tenant_id,
          model_name: model.model_name,
          status: 'failed',
          error: errorMsg,
        });
      }
    }

    console.log('Scheduled BigQuery sync completed:', {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
    });

    return new Response(JSON.stringify({
      success: true,
      synced_count: results.filter(r => r.status === 'success').length,
      failed_count: results.filter(r => r.status === 'failed').length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled BigQuery sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
