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

// Target tables in the system
const TARGET_TABLES = {
  'external_orders': {
    label: 'Đơn hàng',
    description: 'Bảng lưu đơn hàng từ các kênh e-commerce',
    required_fields: ['order_id', 'order_sn', 'channel', 'status'],
    keywords: ['order', 'đơn hàng', 'sales', 'bán hàng']
  },
  'external_order_items': {
    label: 'Chi tiết đơn hàng',
    description: 'Bảng lưu chi tiết từng sản phẩm trong đơn hàng',
    required_fields: ['order_id', 'sku', 'quantity', 'price'],
    keywords: ['order_item', 'line_item', 'chi tiết', 'item']
  },
  'external_products': {
    label: 'Sản phẩm',
    description: 'Bảng lưu thông tin sản phẩm',
    required_fields: ['product_id', 'sku', 'name'],
    keywords: ['product', 'sản phẩm', 'item', 'sku']
  },
  'customers': {
    label: 'Khách hàng',
    description: 'Bảng lưu thông tin khách hàng',
    required_fields: ['name', 'email', 'phone'],
    keywords: ['customer', 'khách hàng', 'buyer', 'user']
  },
  'channel_settlements': {
    label: 'Thanh toán',
    description: 'Bảng lưu thông tin đối soát thanh toán',
    required_fields: ['settlement_id', 'amount'],
    keywords: ['settlement', 'thanh toán', 'payment', 'payout']
  },
  'channel_fees': {
    label: 'Phí kênh',
    description: 'Bảng lưu các loại phí từ marketplace',
    required_fields: ['fee_type', 'amount'],
    keywords: ['fee', 'phí', 'commission', 'charge']
  },
  'invoices': {
    label: 'Hóa đơn',
    description: 'Bảng lưu hóa đơn bán hàng',
    required_fields: ['invoice_number', 'amount', 'customer'],
    keywords: ['invoice', 'hóa đơn', 'bill']
  },
  'bills': {
    label: 'Chi phí',
    description: 'Bảng lưu hóa đơn mua hàng/chi phí',
    required_fields: ['bill_number', 'vendor', 'amount'],
    keywords: ['bill', 'expense', 'chi phí', 'vendor']
  },
  'bank_transactions': {
    label: 'Giao dịch ngân hàng',
    description: 'Bảng lưu giao dịch ngân hàng',
    required_fields: ['transaction_date', 'amount'],
    keywords: ['transaction', 'bank', 'ngân hàng', 'giao dịch']
  },
  'promotions': {
    label: 'Khuyến mãi',
    description: 'Bảng lưu thông tin chương trình khuyến mãi',
    required_fields: ['promotion_name', 'discount'],
    keywords: ['promotion', 'voucher', 'discount', 'khuyến mãi']
  },
  'inventory_items': {
    label: 'Tồn kho',
    description: 'Bảng lưu số lượng tồn kho',
    required_fields: ['sku', 'quantity'],
    keywords: ['inventory', 'stock', 'tồn kho', 'warehouse']
  }
};

// Analyze schema and suggest mapping
function analyzeSchema(tableName: string, schema: any[]): {
  target_table: string | null;
  confidence: number;
  reason: string;
  field_mapping: Record<string, string>;
  primary_key_field: string | null;
  timestamp_field: string | null;
} {
  const fieldNames = schema.map(f => f.name.toLowerCase());
  const tableNameLower = tableName.toLowerCase();
  
  let bestMatch: {
    target: string;
    score: number;
    reason: string;
    mapping: Record<string, string>;
  } | null = null;

  for (const [targetTable, config] of Object.entries(TARGET_TABLES)) {
    let score = 0;
    const mapping: Record<string, string> = {};
    const reasons: string[] = [];

    // Check table name keywords
    for (const keyword of config.keywords) {
      if (tableNameLower.includes(keyword)) {
        score += 20;
        reasons.push(`Tên bảng chứa "${keyword}"`);
        break;
      }
    }

    // Check required fields
    let matchedFields = 0;
    for (const reqField of config.required_fields) {
      const matchedField = fieldNames.find(f => 
        f.includes(reqField) || reqField.includes(f) ||
        f.replace(/_/g, '').includes(reqField.replace(/_/g, ''))
      );
      if (matchedField) {
        matchedFields++;
        mapping[reqField] = schema.find(s => s.name.toLowerCase() === matchedField)?.name || matchedField;
      }
    }

    const fieldMatchPercent = (matchedFields / config.required_fields.length) * 100;
    score += fieldMatchPercent * 0.5;
    if (matchedFields > 0) {
      reasons.push(`${matchedFields}/${config.required_fields.length} trường khớp`);
    }

    // Bonus for specific patterns
    if (fieldNames.some(f => f.includes('order') && f.includes('sn'))) {
      if (targetTable === 'external_orders') score += 15;
    }
    if (fieldNames.some(f => f.includes('settlement'))) {
      if (targetTable === 'channel_settlements') score += 15;
    }
    if (fieldNames.some(f => f.includes('customer') || f.includes('buyer'))) {
      if (targetTable === 'customers') score += 10;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        target: targetTable,
        score,
        reason: reasons.join('; ') || 'Khớp theo cấu trúc dữ liệu',
        mapping
      };
    }
  }

  // Find primary key and timestamp fields
  let primaryKeyField: string | null = null;
  let timestampField: string | null = null;

  for (const field of schema) {
    const name = field.name.toLowerCase();
    const type = field.type?.toLowerCase() || '';

    if (!primaryKeyField) {
      if (name.includes('_id') || name.includes('_sn') || name === 'id') {
        primaryKeyField = field.name;
      }
    }

    if (!timestampField) {
      if (type.includes('timestamp') || type.includes('datetime') || 
          name.includes('created') || name.includes('updated') || 
          name.includes('_time') || name.includes('_at') || name.includes('_date')) {
        timestampField = field.name;
      }
    }
  }

  const confidence = bestMatch ? Math.min(bestMatch.score, 100) : 0;

  return {
    target_table: confidence >= 30 ? bestMatch?.target || null : null,
    confidence,
    reason: bestMatch?.reason || 'Không tìm thấy mapping phù hợp',
    field_mapping: bestMatch?.mapping || {},
    primary_key_field: primaryKeyField,
    timestamp_field: timestampField
  };
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
    
    const suggestions: any[] = [];
    
    // Step 2: For each dataset, list tables and analyze
    for (const dataset of datasets.slice(0, 10)) { // Limit to 10 datasets
      const datasetId = dataset.datasetReference.datasetId;
      
      try {
        const tablesResponse = await fetch(
          `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!tablesResponse.ok) continue;
        
        const tablesData = await tablesResponse.json();
        const tables = tablesData.tables || [];
        
        for (const table of tables.slice(0, 20)) { // Limit to 20 tables per dataset
          const tableId = table.tableReference.tableId;
          
          try {
            // Get table schema
            const schemaResponse = await fetch(
              `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (!schemaResponse.ok) continue;
            
            const schemaData = await schemaResponse.json();
            const schema = schemaData.schema?.fields || [];
            const numRows = parseInt(schemaData.numRows || '0');
            
            if (schema.length === 0 || numRows === 0) continue;
            
            // Analyze and suggest
            const analysis = analyzeSchema(tableId, schema);
            
            if (analysis.confidence >= 25) {
              suggestions.push({
                bigquery_dataset: datasetId,
                bigquery_table: tableId,
                schema_fields: schema.map((f: any) => ({
                  name: f.name,
                  type: f.type,
                  mode: f.mode
                })),
                row_count: numRows,
                ...analysis,
                model_name: `${datasetId}_${tableId}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
                model_label: TARGET_TABLES[analysis.target_table as keyof typeof TARGET_TABLES]?.label || tableId,
                description: `Dữ liệu từ ${datasetId}.${tableId} (${numRows.toLocaleString()} records)`
              });
            }
          } catch (e) {
            console.error(`Error analyzing table ${datasetId}.${tableId}:`, e);
          }
        }
      } catch (e) {
        console.error(`Error listing tables in ${datasetId}:`, e);
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions,
      total_analyzed: suggestions.length,
      summary: {
        high_confidence: suggestions.filter(s => s.confidence >= 70).length,
        medium_confidence: suggestions.filter(s => s.confidence >= 40 && s.confidence < 70).length,
        low_confidence: suggestions.filter(s => s.confidence < 40).length
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
