/**
 * bigquery-query - Query raw data from BigQuery with filters, pagination, and caching
 * 
 * @architecture Layer 10 - BigQuery Integration
 * Supports raw_select, filtered, aggregated, and custom_sql queries
 * with tenant isolation and SQL injection prevention.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Types =============

interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null';
  value: any;
}

interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

interface Aggregation {
  field: string;
  func: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  alias?: string;
}

interface BigQueryQueryRequest {
  tenant_id: string;
  dataset: string;
  table: string;
  query_type: 'raw_select' | 'filtered' | 'aggregated' | 'custom_sql';
  
  // For raw_select / filtered
  columns?: string[];
  filters?: Filter[];
  order_by?: OrderBy[];
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Date filtering shorthand
  date_field?: string;
  start_date?: string;
  end_date?: string;
  
  // For aggregated
  group_by?: string[];
  aggregations?: Aggregation[];
  
  // For custom_sql
  custom_sql?: string;
  
  // Caching
  use_cache?: boolean;
  cache_ttl_minutes?: number;
}

interface SchemaField {
  name: string;
  type: string;
  mode: string;
}

interface BigQueryQueryResponse {
  success: boolean;
  rows: Record<string, any>[];
  row_count: number;
  total_count?: number;
  schema: SchemaField[];
  query_time_ms: number;
  bytes_processed?: number;
  cached: boolean;
  cached_at?: string;
  expires_at?: string;
  error?: string;
  warnings?: string[];
}

// ============= Security Constants =============

const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE', 
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'CALL'
];

const OPERATOR_MAP: Record<string, string> = {
  'eq': '=',
  'neq': '!=',
  'gt': '>',
  'gte': '>=',
  'lt': '<',
  'lte': '<=',
  'like': 'LIKE',
  'in': 'IN',
  'between': 'BETWEEN',
  'is_null': 'IS NULL',
  'is_not_null': 'IS NOT NULL',
};

const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 100;
const DEFAULT_CACHE_TTL = 15; // minutes

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
    console.error('Token response:', tokenData);
    throw new Error('Failed to get access token');
  }
  return tokenData.access_token;
}

// ============= Security Functions =============

function validateIdentifier(identifier: string): boolean {
  // Allow alphanumeric, underscore, and backticks for BigQuery
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

function escapeValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  // Escape single quotes for strings
  return `'${String(value).replace(/'/g, "''")}'`;
}

function validateCustomSql(sql: string): { valid: boolean; error?: string } {
  const upperSql = sql.toUpperCase().trim();
  
  // Must start with SELECT
  if (!upperSql.startsWith('SELECT')) {
    return { valid: false, error: 'Custom SQL must be a SELECT statement' };
  }
  
  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    // Match word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return { valid: false, error: `Forbidden keyword detected: ${keyword}` };
    }
  }
  
  // Check for multiple statements
  if (sql.includes(';')) {
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    if (statements.length > 1) {
      return { valid: false, error: 'Multiple SQL statements not allowed' };
    }
  }
  
  return { valid: true };
}

// ============= Query Builder =============

function buildFilterClause(filters: Filter[]): string {
  if (!filters || filters.length === 0) return '';
  
  const clauses: string[] = [];
  
  for (const filter of filters) {
    if (!validateIdentifier(filter.field)) {
      throw new Error(`Invalid field name: ${filter.field}`);
    }
    
    const operator = OPERATOR_MAP[filter.operator];
    if (!operator) {
      throw new Error(`Invalid operator: ${filter.operator}`);
    }
    
    let clause: string;
    
    switch (filter.operator) {
      case 'is_null':
        clause = `${filter.field} IS NULL`;
        break;
      case 'is_not_null':
        clause = `${filter.field} IS NOT NULL`;
        break;
      case 'in':
        if (!Array.isArray(filter.value)) {
          throw new Error('IN operator requires an array value');
        }
        const inValues = filter.value.map(v => escapeValue(v)).join(', ');
        clause = `${filter.field} IN (${inValues})`;
        break;
      case 'between':
        if (!Array.isArray(filter.value) || filter.value.length !== 2) {
          throw new Error('BETWEEN operator requires an array with exactly 2 values');
        }
        clause = `${filter.field} BETWEEN ${escapeValue(filter.value[0])} AND ${escapeValue(filter.value[1])}`;
        break;
      case 'like':
        clause = `${filter.field} LIKE ${escapeValue(filter.value)}`;
        break;
      default:
        clause = `${filter.field} ${operator} ${escapeValue(filter.value)}`;
    }
    
    clauses.push(clause);
  }
  
  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

function buildOrderByClause(orderBy?: OrderBy[]): string {
  if (!orderBy || orderBy.length === 0) return '';
  
  const clauses = orderBy.map(o => {
    if (!validateIdentifier(o.field)) {
      throw new Error(`Invalid order field: ${o.field}`);
    }
    const dir = o.direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return `${o.field} ${dir}`;
  });
  
  return `ORDER BY ${clauses.join(', ')}`;
}

function buildSafeQuery(params: BigQueryQueryRequest, projectId: string): string {
  const { dataset, table, columns, filters, order_by, limit, offset, date_field, start_date, end_date, query_type, group_by, aggregations } = params;
  
  // Validate dataset and table names
  if (!validateIdentifier(dataset)) {
    throw new Error(`Invalid dataset name: ${dataset}`);
  }
  if (!validateIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  
  const fullTable = `\`${projectId}.${dataset}.${table}\``;
  
  // Build SELECT columns
  let selectClause: string;
  if (query_type === 'aggregated' && aggregations && aggregations.length > 0) {
    const aggClauses = aggregations.map(a => {
      if (!validateIdentifier(a.field) && a.field !== '*') {
        throw new Error(`Invalid aggregation field: ${a.field}`);
      }
      const alias = a.alias || `${a.func.toLowerCase()}_${a.field}`;
      return `${a.func}(${a.field === '*' ? '*' : a.field}) AS ${alias}`;
    });
    
    // Add group by columns to select
    const groupByColumns = group_by?.filter(g => validateIdentifier(g)).map(g => g) || [];
    selectClause = [...groupByColumns, ...aggClauses].join(', ');
  } else if (columns && columns.length > 0) {
    // Validate all column names
    for (const col of columns) {
      if (col !== '*' && !validateIdentifier(col)) {
        throw new Error(`Invalid column name: ${col}`);
      }
    }
    selectClause = columns.join(', ');
  } else {
    selectClause = '*';
  }
  
  // Build filters including date range
  const allFilters: Filter[] = [...(filters || [])];
  
  if (date_field && (start_date || end_date)) {
    if (!validateIdentifier(date_field)) {
      throw new Error(`Invalid date field: ${date_field}`);
    }
    if (start_date) {
      allFilters.push({ field: `DATE(${date_field})`, operator: 'gte', value: start_date });
    }
    if (end_date) {
      allFilters.push({ field: `DATE(${date_field})`, operator: 'lte', value: end_date });
    }
  }
  
  // Patch: allow DATE(...) in filter clause for date range
  const filterClause = allFilters.length > 0 
    ? `WHERE ${allFilters.map(f => {
        if (f.field.startsWith('DATE(')) {
          // Special case for date functions
          const op = OPERATOR_MAP[f.operator];
          return `${f.field} ${op} ${escapeValue(f.value)}`;
        }
        if (!validateIdentifier(f.field)) {
          throw new Error(`Invalid field: ${f.field}`);
        }
        const op = OPERATOR_MAP[f.operator];
        if (f.operator === 'in') {
          const inValues = (f.value as any[]).map(v => escapeValue(v)).join(', ');
          return `${f.field} IN (${inValues})`;
        }
        if (f.operator === 'between') {
          return `${f.field} BETWEEN ${escapeValue(f.value[0])} AND ${escapeValue(f.value[1])}`;
        }
        return `${f.field} ${op} ${escapeValue(f.value)}`;
      }).join(' AND ')}`
    : '';
  
  // Group by clause for aggregated queries
  let groupByClause = '';
  if (query_type === 'aggregated' && group_by && group_by.length > 0) {
    for (const g of group_by) {
      if (!validateIdentifier(g)) {
        throw new Error(`Invalid group by field: ${g}`);
      }
    }
    groupByClause = `GROUP BY ${group_by.join(', ')}`;
  }
  
  const orderByClause = buildOrderByClause(order_by);
  
  // Apply limits
  const safeLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
  const safeOffset = offset || 0;
  const limitClause = `LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  
  return `SELECT ${selectClause} FROM ${fullTable} ${filterClause} ${groupByClause} ${orderByClause} ${limitClause}`.trim().replace(/\s+/g, ' ');
}

// ============= Query Execution =============

async function executeQuery(
  accessToken: string, 
  projectId: string, 
  query: string
): Promise<{ rows: Record<string, any>[]; schema: SchemaField[]; totalBytesProcessed?: number }> {
  console.log('Executing query:', query.substring(0, 500));
  
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
      maxResults: MAX_LIMIT,
      timeoutMs: 30000, // 30 second timeout
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('BigQuery error:', data.error);
    throw new Error(`BigQuery error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const schema: SchemaField[] = (data.schema?.fields || []).map((f: any) => ({
    name: f.name,
    type: f.type,
    mode: f.mode || 'NULLABLE',
  }));

  if (!data.rows) {
    return { rows: [], schema, totalBytesProcessed: data.totalBytesProcessed };
  }

  const rows = data.rows.map((row: any) => {
    const obj: Record<string, any> = {};
    row.f.forEach((field: any, index: number) => {
      const fieldName = schema[index]?.name || `col_${index}`;
      obj[fieldName] = field.v;
    });
    return obj;
  });

  return { rows, schema, totalBytesProcessed: data.totalBytesProcessed };
}

// ============= Cache Functions =============

async function hashQuery(params: any): Promise<string> {
  const str = JSON.stringify(params);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    const params: BigQueryQueryRequest = await req.json();
    
    console.log('BigQuery Query request:', {
      tenant_id: params.tenant_id,
      dataset: params.dataset,
      table: params.table,
      query_type: params.query_type,
      filters_count: params.filters?.length || 0,
    });

    // Validate required params
    if (!params.tenant_id) {
      throw new Error('tenant_id is required');
    }
    if (!params.dataset) {
      throw new Error('dataset is required');
    }
    if (!params.table) {
      throw new Error('table is required');
    }
    if (!params.query_type) {
      params.query_type = 'raw_select';
    }

    // Get service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant's BigQuery config
    const { data: tenantConfig } = await supabase
      .from('bigquery_configs')
      .select('project_id')
      .eq('tenant_id', params.tenant_id)
      .eq('is_active', true)
      .single();

    const projectId = tenantConfig?.project_id || serviceAccount.project_id || 'bluecore-dcp';
    
    // Check cache
    const useCache = params.use_cache !== false;
    const cacheTtl = params.cache_ttl_minutes || DEFAULT_CACHE_TTL;
    const queryHash = await hashQuery({
      tenant_id: params.tenant_id,
      dataset: params.dataset,
      table: params.table,
      query_type: params.query_type,
      columns: params.columns,
      filters: params.filters,
      order_by: params.order_by,
      limit: params.limit,
      offset: params.offset,
      date_field: params.date_field,
      start_date: params.start_date,
      end_date: params.end_date,
      group_by: params.group_by,
      aggregations: params.aggregations,
      custom_sql: params.custom_sql,
    });

    if (useCache && params.query_type !== 'custom_sql') {
      const { data: cached } = await supabase
        .from('bigquery_query_cache')
        .select('result_data, cached_at, expires_at')
        .eq('tenant_id', params.tenant_id)
        .eq('query_hash', queryHash)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log('Returning cached result');
        const response: BigQueryQueryResponse = {
          success: true,
          rows: cached.result_data.rows || cached.result_data,
          row_count: Array.isArray(cached.result_data) ? cached.result_data.length : (cached.result_data.rows?.length || 0),
          schema: cached.result_data.schema || [],
          query_time_ms: Date.now() - startTime,
          cached: true,
          cached_at: cached.cached_at,
          expires_at: cached.expires_at,
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build query
    let query: string;
    
    if (params.query_type === 'custom_sql') {
      if (!params.custom_sql) {
        throw new Error('custom_sql is required for query_type: custom_sql');
      }
      const validation = validateCustomSql(params.custom_sql);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      query = params.custom_sql;
      warnings.push('Custom SQL queries are not cached');
    } else {
      query = buildSafeQuery(params, projectId);
    }

    // Execute query
    console.log('Getting access token...');
    const accessToken = await getAccessToken(serviceAccount);
    
    const result = await executeQuery(accessToken, projectId, query);
    const queryTime = Date.now() - startTime;

    // Cache results (not for custom_sql)
    if (useCache && params.query_type !== 'custom_sql' && result.rows.length > 0) {
      const expiresAt = new Date(Date.now() + cacheTtl * 60 * 1000);
      
      await supabase
        .from('bigquery_query_cache')
        .upsert({
          tenant_id: params.tenant_id,
          query_hash: queryHash,
          query_type: params.query_type,
          date_range_start: params.start_date,
          date_range_end: params.end_date,
          result_data: { rows: result.rows, schema: result.schema },
          cached_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_valid: true,
        }, {
          onConflict: 'tenant_id,query_hash',
        });
    }

    const response: BigQueryQueryResponse = {
      success: true,
      rows: result.rows,
      row_count: result.rows.length,
      schema: result.schema,
      query_time_ms: queryTime,
      bytes_processed: result.totalBytesProcessed,
      cached: false,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    console.log(`Query completed: ${result.rows.length} rows in ${queryTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('BigQuery Query error:', errorMessage);

    const response: Partial<BigQueryQueryResponse> = {
      success: false,
      rows: [],
      row_count: 0,
      schema: [],
      query_time_ms: Date.now() - startTime,
      cached: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
