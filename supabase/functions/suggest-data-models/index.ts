import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google OAuth2 JWT for Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${signatureInput}.${signatureB64}`;
  
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

// Data model definitions with multi-source support
interface DataModelDefinition {
  target_table: string;
  label: string;
  description: string;
  keywords: string[];
  required_fields: string[];
  channel_patterns: string[]; // patterns to detect channel/source
}

const DATA_MODELS: DataModelDefinition[] = [
  {
    target_table: 'external_orders',
    label: 'Đơn hàng (Orders)',
    description: 'Đơn hàng từ các kênh e-commerce',
    keywords: ['order', 'orders', 'đơn hàng', 'sales'],
    required_fields: ['order_id', 'order_sn', 'status', 'total', 'amount', 'create_time', 'created'],
    channel_patterns: ['shopee', 'lazada', 'tiktok', 'sendo', 'sapo', 'shopify', 'woocommerce', 'haravan']
  },
  {
    target_table: 'external_order_items',
    label: 'Chi tiết đơn hàng (Order Items)',
    description: 'Chi tiết sản phẩm trong đơn hàng',
    keywords: ['order_item', 'orderitem', 'line_item', 'item', 'chi tiết'],
    required_fields: ['order_id', 'sku', 'product', 'quantity', 'price'],
    channel_patterns: ['shopee', 'lazada', 'tiktok', 'sendo', 'sapo', 'shopify']
  },
  {
    target_table: 'external_products',
    label: 'Sản phẩm (Products)',
    description: 'Thông tin sản phẩm từ các nguồn',
    keywords: ['product', 'products', 'sản phẩm', 'item', 'sku'],
    required_fields: ['product_id', 'sku', 'name', 'price'],
    channel_patterns: ['shopee', 'lazada', 'tiktok', 'sapo', 'shopify', 'haravan', 'woocommerce']
  },
  {
    target_table: 'customers',
    label: 'Khách hàng (Customers)',
    description: 'Thông tin khách hàng từ các nguồn',
    keywords: ['customer', 'customers', 'buyer', 'khách hàng', 'user'],
    required_fields: ['name', 'phone', 'email', 'address'],
    channel_patterns: ['shopee', 'lazada', 'sapo', 'shopify', 'crm', 'cdp']
  },
  {
    target_table: 'channel_settlements',
    label: 'Thanh toán (Settlements)',
    description: 'Đối soát thanh toán từ marketplace',
    keywords: ['settlement', 'settlements', 'payout', 'thanh toán', 'đối soát'],
    required_fields: ['settlement_id', 'amount', 'net_amount', 'period'],
    channel_patterns: ['shopee', 'lazada', 'tiktok']
  },
  {
    target_table: 'channel_fees',
    label: 'Phí kênh (Channel Fees)',
    description: 'Các loại phí từ marketplace',
    keywords: ['fee', 'fees', 'commission', 'phí', 'charge'],
    required_fields: ['fee_type', 'amount'],
    channel_patterns: ['shopee', 'lazada', 'tiktok']
  },
  {
    target_table: 'inventory_items',
    label: 'Tồn kho (Inventory)',
    description: 'Số lượng tồn kho từ các nguồn',
    keywords: ['inventory', 'stock', 'warehouse', 'tồn kho', 'kho'],
    required_fields: ['sku', 'quantity', 'stock'],
    channel_patterns: ['sapo', 'shopify', 'haravan', 'wms']
  },
  {
    target_table: 'promotions',
    label: 'Khuyến mãi (Promotions)',
    description: 'Chương trình khuyến mãi và voucher',
    keywords: ['promotion', 'voucher', 'discount', 'khuyến mãi', 'giảm giá'],
    required_fields: ['promotion', 'discount', 'voucher'],
    channel_patterns: ['shopee', 'lazada', 'tiktok']
  },
  {
    target_table: 'invoices',
    label: 'Hóa đơn (Invoices)',
    description: 'Hóa đơn bán hàng',
    keywords: ['invoice', 'invoices', 'hóa đơn', 'bill'],
    required_fields: ['invoice_number', 'amount', 'customer'],
    channel_patterns: ['accounting', 'erp', 'einvoice', 'misa', 'fast']
  },
  {
    target_table: 'bank_transactions',
    label: 'Giao dịch ngân hàng (Bank Transactions)',
    description: 'Giao dịch từ tài khoản ngân hàng',
    keywords: ['bank', 'transaction', 'ngân hàng', 'giao dịch', 'payment'],
    required_fields: ['transaction_date', 'amount', 'balance'],
    channel_patterns: ['bank', 'vcb', 'tcb', 'acb', 'bidv', 'vietinbank']
  }
];

interface TableInfo {
  dataset: string;
  table: string;
  schema: any[];
  rowCount: number;
}

interface SourceTable {
  dataset: string;
  table: string;
  channel: string;
  row_count: number;
  schema_fields: Array<{ name: string; type: string; mode: string }>;
  primary_key_field: string | null;
  timestamp_field: string | null;
  match_score: number;
  match_reason: string;
}

interface GroupedSuggestion {
  model_name: string;
  model_label: string;
  description: string;
  target_table: string;
  sources: SourceTable[];
  total_rows: number;
  confidence: number;
  channels: string[];
  recommended_sync_query: string;
}

// Detect channel from dataset/table name
function detectChannel(dataset: string, table: string): string {
  const combined = `${dataset}_${table}`.toLowerCase();
  
  const channelMap: Record<string, string[]> = {
    'shopee': ['shopee'],
    'lazada': ['lazada', 'lzd'],
    'tiktok': ['tiktok', 'tiktokshop'],
    'sendo': ['sendo'],
    'sapo': ['sapo'],
    'shopify': ['shopify'],
    'haravan': ['haravan'],
    'woocommerce': ['woocommerce', 'woo'],
    'facebook': ['facebook', 'fb'],
    'google_ads': ['google_ads', 'googleads', 'gads'],
    'bank': ['bank', 'vcb', 'tcb', 'acb', 'bidv', 'vietinbank'],
    'erp': ['erp', 'sap', 'oracle', 'misa', 'fast'],
  };
  
  for (const [channel, patterns] of Object.entries(channelMap)) {
    if (patterns.some(p => combined.includes(p))) {
      return channel;
    }
  }
  
  // Try to extract from dataset name pattern like "menstaysimplicity_shopee"
  const datasetParts = dataset.split('_');
  for (const part of datasetParts) {
    for (const [channel, patterns] of Object.entries(channelMap)) {
      if (patterns.includes(part.toLowerCase())) {
        return channel;
      }
    }
  }
  
  return 'other';
}

// Analyze if a table matches a data model
function analyzeTableForModel(
  table: TableInfo, 
  model: DataModelDefinition
): { score: number; reason: string; primaryKey: string | null; timestampField: string | null } {
  const tableLower = table.table.toLowerCase();
  const fieldNames = table.schema.map(f => f.name.toLowerCase());
  
  let score = 0;
  const reasons: string[] = [];
  
  // Check table name keywords
  for (const keyword of model.keywords) {
    if (tableLower.includes(keyword.toLowerCase())) {
      score += 25;
      reasons.push(`Tên bảng chứa "${keyword}"`);
      break;
    }
  }
  
  // Check required fields
  let matchedFields = 0;
  for (const reqField of model.required_fields) {
    const hasField = fieldNames.some(f => 
      f.includes(reqField.toLowerCase()) || 
      reqField.toLowerCase().includes(f)
    );
    if (hasField) matchedFields++;
  }
  
  const fieldScore = (matchedFields / model.required_fields.length) * 50;
  score += fieldScore;
  if (matchedFields > 0) {
    reasons.push(`${matchedFields}/${model.required_fields.length} trường khớp`);
  }
  
  // Check channel pattern in dataset/table
  const channel = detectChannel(table.dataset, table.table);
  if (model.channel_patterns.some(p => channel.includes(p) || p.includes(channel))) {
    score += 15;
    reasons.push(`Nguồn từ ${channel}`);
  }
  
  // Find primary key
  let primaryKey: string | null = null;
  for (const field of table.schema) {
    const name = field.name.toLowerCase();
    if (name.includes('_id') || name.includes('_sn') || name === 'id' || name.endsWith('id')) {
      primaryKey = field.name;
      break;
    }
  }
  
  // Find timestamp field
  let timestampField: string | null = null;
  for (const field of table.schema) {
    const name = field.name.toLowerCase();
    const type = field.type?.toLowerCase() || '';
    if (type.includes('timestamp') || type.includes('datetime') || 
        name.includes('created') || name.includes('updated') || 
        name.includes('_time') || name.includes('_at') || name.includes('_date')) {
      timestampField = field.name;
      break;
    }
  }
  
  return {
    score: Math.min(score, 100),
    reason: reasons.join('; ') || 'Cấu trúc dữ liệu tương tự',
    primaryKey,
    timestampField
  };
}

// Group tables into data models
function groupTablesIntoModels(tables: TableInfo[]): GroupedSuggestion[] {
  const modelGroups: Map<string, SourceTable[]> = new Map();
  
  for (const table of tables) {
    let bestModel: DataModelDefinition | null = null;
    let bestScore = 0;
    let bestAnalysis: any = null;
    
    for (const model of DATA_MODELS) {
      const analysis = analyzeTableForModel(table, model);
      if (analysis.score > bestScore && analysis.score >= 30) {
        bestScore = analysis.score;
        bestModel = model;
        bestAnalysis = analysis;
      }
    }
    
    if (bestModel && bestAnalysis) {
      const channel = detectChannel(table.dataset, table.table);
      
      const source: SourceTable = {
        dataset: table.dataset,
        table: table.table,
        channel,
        row_count: table.rowCount,
        schema_fields: table.schema.map(f => ({
          name: f.name,
          type: f.type,
          mode: f.mode || 'NULLABLE'
        })),
        primary_key_field: bestAnalysis.primaryKey,
        timestamp_field: bestAnalysis.timestampField,
        match_score: bestScore,
        match_reason: bestAnalysis.reason
      };
      
      const existing = modelGroups.get(bestModel.target_table) || [];
      existing.push(source);
      modelGroups.set(bestModel.target_table, existing);
    }
  }
  
  // Convert to suggestions
  const suggestions: GroupedSuggestion[] = [];
  
  for (const [targetTable, sources] of modelGroups.entries()) {
    const modelDef = DATA_MODELS.find(m => m.target_table === targetTable);
    if (!modelDef) continue;
    
    // Sort sources by score
    sources.sort((a, b) => b.match_score - a.match_score);
    
    const totalRows = sources.reduce((sum, s) => sum + s.row_count, 0);
    const avgScore = sources.reduce((sum, s) => sum + s.match_score, 0) / sources.length;
    const channels = [...new Set(sources.map(s => s.channel))];
    
    // Generate recommended sync query (UNION ALL from multiple sources)
    const syncQueryParts = sources.slice(0, 5).map(s => 
      `SELECT * FROM \`${s.dataset}.${s.table}\``
    );
    const recommendedQuery = sources.length > 1 
      ? syncQueryParts.join('\nUNION ALL\n')
      : syncQueryParts[0] || '';
    
    suggestions.push({
      model_name: targetTable,
      model_label: modelDef.label,
      description: `${modelDef.description} (${channels.join(', ')})`,
      target_table: targetTable,
      sources,
      total_rows: totalRows,
      confidence: Math.round(avgScore),
      channels,
      recommended_sync_query: recommendedQuery
    });
  }
  
  // Sort by confidence and total rows
  suggestions.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.total_rows - a.total_rows;
  });
  
  return suggestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = project_id || serviceAccount.project_id || 'bluecore-dcp';
    
    console.log(`Analyzing BigQuery project: ${projectId}`);
    
    const accessToken = await getAccessToken(serviceAccount);
    
    // Step 1: List all datasets
    const datasetsResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!datasetsResponse.ok) {
      const errorText = await datasetsResponse.text();
      throw new Error(`Failed to list datasets: ${errorText}`);
    }
    
    const datasetsData = await datasetsResponse.json();
    const datasets = datasetsData.datasets || [];
    
    console.log(`Found ${datasets.length} datasets`);
    
    const allTables: TableInfo[] = [];
    
    // Step 2: For each dataset, list tables and get schema
    for (const dataset of datasets.slice(0, 15)) {
      const datasetId = dataset.datasetReference.datasetId;
      
      try {
        const tablesResponse = await fetch(
          `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!tablesResponse.ok) continue;
        
        const tablesData = await tablesResponse.json();
        const tables = tablesData.tables || [];
        
        console.log(`Dataset ${datasetId}: ${tables.length} tables`);
        
        for (const table of tables.slice(0, 30)) {
          const tableId = table.tableReference.tableId;
          
          try {
            const schemaResponse = await fetch(
              `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (!schemaResponse.ok) continue;
            
            const schemaData = await schemaResponse.json();
            const schema = schemaData.schema?.fields || [];
            const numRows = parseInt(schemaData.numRows || '0');
            
            if (schema.length === 0) continue;
            
            allTables.push({
              dataset: datasetId,
              table: tableId,
              schema,
              rowCount: numRows
            });
          } catch (e) {
            console.error(`Error getting schema for ${datasetId}.${tableId}:`, e);
          }
        }
      } catch (e) {
        console.error(`Error listing tables in ${datasetId}:`, e);
      }
    }
    
    console.log(`Total tables analyzed: ${allTables.length}`);
    
    // Step 3: Group tables into data models
    const suggestions = groupTablesIntoModels(allTables);
    
    console.log(`Generated ${suggestions.length} model suggestions`);

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions,
      total_tables_analyzed: allTables.length,
      summary: {
        total_models: suggestions.length,
        total_sources: suggestions.reduce((sum, s) => sum + s.sources.length, 0),
        total_rows: suggestions.reduce((sum, s) => sum + s.total_rows, 0),
        channels_found: [...new Set(suggestions.flatMap(s => s.channels))]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Suggest data models error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
