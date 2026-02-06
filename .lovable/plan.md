
# PLAN: Tạo Edge Function `bigquery-query` để Query Raw Data từ BigQuery

## 1. MỤC ĐÍCH

Tạo Edge Function mới `bigquery-query` với khả năng:
- Query raw data trực tiếp từ BigQuery tables
- Hỗ trợ cả predefined queries và custom SQL
- Tích hợp authentication + tenant isolation
- Caching kết quả để optimize performance
- Response format chuẩn hóa cho UI consumption

## 2. SỰ KHÁC BIỆT VỚI EXISTING FUNCTIONS

| Function | Mục đích | Use Case |
|----------|----------|----------|
| `bigquery-list` | List datasets, tables, preview schema | Admin/Config UI |
| `bigquery-realtime` | Aggregated metrics (daily_revenue, channel_summary) | Dashboard widgets |
| `sync-bigquery` | Sync data từ BQ → Supabase (SSOT Layer 2) | Background jobs |
| **`bigquery-query` (MỚI)** | Query raw data với filters, pagination | Data exploration, reports |

## 3. KIẾN TRÚC

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         bigquery-query                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUT                          PROCESSING                      OUTPUT   │
│  ─────                          ──────────                      ──────   │
│  • tenant_id                    1. Validate auth               • rows[]  │
│  • dataset                      2. Load tenant config          • schema  │
│  • table                        3. Build safe query            • stats   │
│  • query_type:                  4. Execute via BQ API          • cached  │
│    - raw_select                 5. Transform response                    │
│    - filtered                   6. Cache results                         │
│    - custom_sql                 7. Return JSON                           │
│  • filters[]                                                             │
│  • columns[]                                                             │
│  • order_by                                                              │
│  • limit/offset                                                          │
│  • date_range                                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. API SPECIFICATION

### 4.1 Request Body

```typescript
interface BigQueryQueryRequest {
  // Required
  tenant_id: string;
  dataset: string;           // e.g., "bluecoredcp_shopee"
  table: string;             // e.g., "shopee_Orders"
  
  // Query type
  query_type: 'raw_select' | 'filtered' | 'aggregated' | 'custom_sql';
  
  // For raw_select / filtered
  columns?: string[];        // Default: ['*']
  filters?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
    value: any;
  }[];
  order_by?: { field: string; direction: 'asc' | 'desc' }[];
  
  // Pagination
  limit?: number;            // Default: 100, Max: 10000
  offset?: number;           // Default: 0
  
  // Date filtering (common case)
  date_field?: string;       // e.g., "create_time"
  start_date?: string;       // ISO format
  end_date?: string;
  
  // For aggregated
  group_by?: string[];
  aggregations?: { field: string; func: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' }[];
  
  // For custom_sql (restricted)
  custom_sql?: string;       // Must pass validation
  
  // Caching
  use_cache?: boolean;       // Default: true
  cache_ttl_minutes?: number; // Default: 15
}
```

### 4.2 Response Body

```typescript
interface BigQueryQueryResponse {
  success: boolean;
  
  // Data
  rows: Record<string, any>[];
  row_count: number;
  total_count?: number;      // For pagination awareness
  
  // Schema info
  schema: {
    name: string;
    type: string;
    mode: string;
  }[];
  
  // Performance
  query_time_ms: number;
  bytes_processed?: number;
  
  // Cache info
  cached: boolean;
  cached_at?: string;
  expires_at?: string;
  
  // Errors
  error?: string;
  warnings?: string[];
}
```

## 5. SECURITY CONSIDERATIONS

### 5.1 SQL Injection Prevention
- Sử dụng parameterized query building
- Whitelist allowed operators
- Validate column/table names against schema
- Block dangerous keywords: `DROP`, `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`, `ALTER`

### 5.2 Tenant Isolation
- Load tenant's BigQuery config từ `bigquery_configs` table
- Validate dataset access permissions
- Log all queries với tenant context

### 5.3 Rate Limiting
- Max 100 requests/minute per tenant
- Max 10000 rows per query
- Max query timeout: 30 seconds

## 6. IMPLEMENTATION STEPS

### Step 1: Create Edge Function Structure
```text
supabase/functions/bigquery-query/
└── index.ts
```

### Step 2: Core Components

```typescript
// 1. Safe Query Builder
function buildSafeQuery(params: BigQueryQueryRequest): string {
  // Validate table/column names
  // Build WHERE clause from filters
  // Add ORDER BY, LIMIT, OFFSET
  // Return parameterized query
}

// 2. SQL Validator (for custom_sql)
function validateCustomSql(sql: string): { valid: boolean; error?: string } {
  // Check for dangerous keywords
  // Validate syntax structure
  // Ensure SELECT only
}

// 3. Cache Manager
async function getCachedResult(queryHash: string, tenantId: string): Promise<any | null>
async function setCacheResult(queryHash: string, tenantId: string, data: any, ttl: number): Promise<void>
```

### Step 3: Main Handler Flow

```typescript
serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') return corsResponse();
  
  // 2. Parse request
  const params = await req.json();
  
  // 3. Validate tenant
  if (!params.tenant_id) throw Error('tenant_id required');
  
  // 4. Check cache
  const queryHash = await hashQuery(params);
  if (params.use_cache) {
    const cached = await getCachedResult(queryHash, params.tenant_id);
    if (cached) return jsonResponse({ ...cached, cached: true });
  }
  
  // 5. Load tenant config
  const config = await getTenantConfig(params.tenant_id);
  
  // 6. Build query
  let query: string;
  if (params.query_type === 'custom_sql') {
    const validation = validateCustomSql(params.custom_sql);
    if (!validation.valid) throw Error(validation.error);
    query = params.custom_sql;
  } else {
    query = buildSafeQuery(params, config);
  }
  
  // 7. Execute query
  const startTime = Date.now();
  const accessToken = await getAccessToken(serviceAccount);
  const result = await executeQuery(accessToken, config.project_id, query);
  const queryTime = Date.now() - startTime;
  
  // 8. Cache result
  if (params.use_cache && result.rows.length > 0) {
    await setCacheResult(queryHash, params.tenant_id, result, params.cache_ttl_minutes);
  }
  
  // 9. Return response
  return jsonResponse({
    success: true,
    rows: result.rows,
    row_count: result.rows.length,
    schema: result.schema,
    query_time_ms: queryTime,
    cached: false,
  });
});
```

## 7. FILTER OPERATORS MAPPING

```typescript
const OPERATOR_MAP = {
  'eq': '=',
  'neq': '!=',
  'gt': '>',
  'gte': '>=',
  'lt': '<',
  'lte': '<=',
  'like': 'LIKE',
  'in': 'IN',
  'between': 'BETWEEN',
};

// Example filter building
// { field: 'order_status', operator: 'eq', value: 'COMPLETED' }
// → WHERE order_status = 'COMPLETED'

// { field: 'total_amount', operator: 'between', value: [100000, 500000] }
// → WHERE total_amount BETWEEN 100000 AND 500000
```

## 8. ERROR HANDLING

```typescript
const ERROR_CODES = {
  INVALID_PARAMS: { status: 400, message: 'Invalid request parameters' },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  FORBIDDEN: { status: 403, message: 'Access denied to this dataset' },
  NOT_FOUND: { status: 404, message: 'Table or dataset not found' },
  QUERY_ERROR: { status: 422, message: 'Query execution failed' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  TIMEOUT: { status: 504, message: 'Query timeout exceeded' },
};
```

## 9. FILES TO CREATE/MODIFY

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/bigquery-query/index.ts` | CREATE | Main function implementation |
| `src/hooks/useBigQueryQuery.ts` | CREATE | React hook để gọi function |
| `supabase/config.toml` | MODIFY | Add function config (verify_jwt = false) |

## 10. TECHNICAL DETAILS

### 10.1 Edge Function Code Structure

```typescript
// supabase/functions/bigquery-query/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { /* ... */ };

// Reuse getAccessToken from bigquery-list
async function getAccessToken(serviceAccount: any): Promise<string> { /* ... */ }

// Safe query builder
function buildSafeQuery(params: BigQueryQueryRequest, projectId: string): string { /* ... */ }

// SQL validator
function validateCustomSql(sql: string): ValidationResult { /* ... */ }

// Main handler
serve(async (req) => { /* ... */ });
```

### 10.2 React Hook

```typescript
// src/hooks/useBigQueryQuery.ts

export function useBigQueryQuery(params: BigQueryQueryParams) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  
  return useQuery({
    queryKey: ['bigquery-query', tenantId, params],
    queryFn: async () => {
      const { data, error } = await client.functions.invoke('bigquery-query', {
        body: { tenant_id: tenantId, ...params }
      });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && isReady && !!params.dataset && !!params.table,
  });
}
```

## 11. TESTING PLAN

### 11.1 Unit Tests
- Filter builder với các operators
- SQL validator với dangerous inputs
- Cache hash generation

### 11.2 Integration Tests
```typescript
// Test raw_select
await invoke('bigquery-query', {
  tenant_id: 'test-tenant',
  dataset: 'bluecoredcp_shopee',
  table: 'shopee_Orders',
  query_type: 'raw_select',
  limit: 10,
});

// Test filtered
await invoke('bigquery-query', {
  tenant_id: 'test-tenant',
  dataset: 'bluecoredcp_shopee',
  table: 'shopee_Orders',
  query_type: 'filtered',
  filters: [
    { field: 'order_status', operator: 'eq', value: 'COMPLETED' },
    { field: 'create_time', operator: 'gte', value: '2024-01-01' },
  ],
  order_by: [{ field: 'create_time', direction: 'desc' }],
  limit: 100,
});
```

## 12. ESTIMATED EFFORT

| Task | Time |
|------|------|
| Create Edge Function | 1h |
| Implement safe query builder | 0.5h |
| Implement SQL validator | 0.5h |
| Create React hook | 0.5h |
| Testing & deployment | 0.5h |
| **Total** | **3h** |

## 13. DEPENDENCIES

- Secret `GOOGLE_SERVICE_ACCOUNT_JSON` đã được cấu hình
- Tenant có config trong `bigquery_configs` table
- BigQuery project có quyền access với Service Account
